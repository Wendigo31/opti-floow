import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, ClipboardCheck, Clock, Download, FileText, Fuel, Loader2, Receipt, Smartphone } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLicenseContext } from '@/context/LicenseContext';
import { useCloudDrivers } from '@/hooks/useCloudDrivers';
import { supabase } from '@/integrations/supabase/client';
import { toCsv } from '@/lib/accountingDossier';
import { computeDayHours, fmtMinutes, type ClockEntry } from '@/lib/driverHours';
import { downloadBytes } from '@/lib/facturx';

/**
 * RH › Remontées conducteurs : ce que les conducteurs saisissent dans l'appli
 * OptiFlow Conducteur — heures (pointages, coupures, nuit, repas, découchers),
 * pleins et frais, check-lists et pannes, documents et preuves.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as unknown as { from: (t: string) => any };
interface TimeRow extends ClockEntry { driver_id: string; work_date: string; odometer: number | null }
interface ReportRow { driver_id: string; work_date: string; meals: number; overnight: boolean; notes: string | null }
interface LogRow { id: string; driver_id: string; work_date: string; vehicle_id: string | null; kind: string; amount: number | null; liters: number | null; odometer: number | null; data: Record<string, unknown>; doc_path: string | null; status: string; created_at: string }
interface DocRow { id: string; driver_id: string; work_date: string; entry_id: string | null; kind: string; path: string | null; note: string | null; created_at: string }

const ALL = '__all__';
const fr = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: '2-digit' });
const hhmm = (iso: string | null) => (iso ? new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '—');
const eur = (n: number | null) => (n == null ? '' : Number(n).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' }));
const LOG: Record<string, string> = { fuel: 'Plein gazole', adblue: 'AdBlue', toll: 'Péage', expense: 'Frais', checklist: 'Check-list', breakdown: 'Panne' };
const DOC: Record<string, string> = { cmr: 'CMR signée', delivery_note: 'Bon de livraison', photo: 'Photo', reserve: 'Réserve', weighing: 'Ticket de pesée', site_note: 'Bon de chantier', signature: 'Signature', other: 'Autre' };

export default function DriverActivity() {
  const { licenseId } = useLicenseContext();
  const { cdiDrivers, cddDrivers, interimDrivers, autreDrivers, jokerDrivers } = useCloudDrivers();
  const drivers = useMemo(() => {
    const all = [...cdiDrivers, ...cddDrivers, ...interimDrivers, ...autreDrivers, ...jokerDrivers];
    return all.filter((d, i) => all.findIndex((x) => x.id === d.id) === i);
  }, [cdiDrivers, cddDrivers, interimDrivers, autreDrivers, jokerDrivers]);
  const name = useCallback((id: string) => drivers.find((d) => d.id === id)?.name ?? 'Conducteur', [drivers]);
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [driver, setDriver] = useState(ALL);
  const [loading, setLoading] = useState(true);
  const [times, setTimes] = useState<TimeRow[]>([]);
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [lines, setLines] = useState<Map<string, string>>(new Map());

  const load = useCallback(async () => {
    if (!licenseId) return;
    setLoading(true);
    const [y, m] = month.split('-').map(Number);
    const from = `${month}-01`;
    const to = `${month}-${String(new Date(y, m, 0).getDate()).padStart(2, '0')}`;
    const q = (t: string, cols: string, dateCol = 'work_date') => db.from(t).select(cols).eq('license_id', licenseId).gte(dateCol, from).lte(dateCol, to);
    const [a, b, c, d, e] = await Promise.all([
      q('driver_time_entries', 'driver_id, work_date, kind, at, odometer').order('at'),
      q('driver_day_reports', 'driver_id, work_date, meals, overnight, notes'),
      q('driver_logs', '*').order('created_at', { ascending: false }),
      q('driver_documents', '*').order('created_at', { ascending: false }),
      q('planning_entries', 'id, tour_name, line_reference', 'planning_date'),
    ]);
    setTimes(a.data ?? []);
    setReports(b.data ?? []);
    setLogs(c.data ?? []);
    setDocs(d.data ?? []);
    setLines(new Map(((e.data ?? []) as { id: string; tour_name: string | null; line_reference: string | null }[]).map((r) => [r.id, r.tour_name || r.line_reference || 'Ligne'])));
    setLoading(false);
  }, [licenseId, month]);
  useEffect(() => { void load(); }, [load]);

  const keep = <T extends { driver_id: string }>(rows: T[]) => (driver === ALL ? rows : rows.filter((r) => r.driver_id === driver));

  // Une ligne par conducteur et par jour (pointages + journée déclarée).
  const days = useMemo(() => {
    const keys = new Set([...keep(times), ...keep(reports)].map((r) => `${r.driver_id}|${r.work_date}`));
    return [...keys].map((k) => {
      const [driverId, date] = k.split('|');
      const entries = times.filter((t) => t.driver_id === driverId && t.work_date === date);
      const odos = entries.map((t) => t.odometer).filter((x): x is number => x != null);
      return {
        driverId, date,
        h: computeDayHours(entries),
        report: reports.find((r) => r.driver_id === driverId && r.work_date === date),
        km: odos.length >= 2 ? Math.max(...odos) - Math.min(...odos) : null,
      };
    }).sort((x, y) => y.date.localeCompare(x.date) || name(x.driverId).localeCompare(name(y.driverId)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [times, reports, driver, name]);

  const totals = useMemo(() => days.reduce((s, d) => ({ work: s.work + d.h.work, night: s.night + d.h.night, meals: s.meals + (d.report?.meals ?? 0), overnight: s.overnight + (d.report?.overnight ? 1 : 0) }), { work: 0, night: 0, meals: 0, overnight: 0 }), [days]);
  const money = keep(logs).filter((l) => ['fuel', 'adblue', 'toll', 'expense'].includes(l.kind));
  const checks = keep(logs).filter((l) => ['checklist', 'breakdown'].includes(l.kind));
  const openIssues = checks.filter((l) => l.status !== 'done' && (l.kind === 'breakdown' || ((l.data.defects as string[] | undefined)?.length ?? 0) > 0)).length;

  const openFile = async (path: string) => {
    const { data, error } = await supabase.storage.from('driver-docs').createSignedUrl(path, 300);
    if (error || !data) toast.error('Fichier indisponible');
    else window.open(data.signedUrl, '_blank');
  };
  const setStatus = async (id: string, status: string) => {
    const { error } = await db.from('driver_logs').update({ status }).eq('id', id);
    if (error) toast.error(error.message); else void load();
  };
  const exportHours = () => downloadBytes(
    toCsv(['Date', 'Conducteur', 'Début', 'Fin', 'Amplitude', 'Travail', 'Coupures', 'Nuit (21h-6h)', 'Repas', 'Découcher', 'Km', 'Remarque'],
      days.map((d) => [d.date, name(d.driverId), hhmm(d.h.firstStart), hhmm(d.h.lastEnd), fmtMinutes(d.h.amplitude), fmtMinutes(d.h.work), fmtMinutes(d.h.breaks), fmtMinutes(d.h.night), d.report?.meals ?? 0, d.report?.overnight ? 'oui' : 'non', d.km ?? '', d.report?.notes ?? ''])),
    `heures-conducteurs-${month}.csv`, 'text/csv;charset=utf-8');
  const move = (n: number) => { const [y, m] = month.split('-').map(Number); const d = new Date(y, m - 1 + n, 1); setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`); };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Remontées conducteurs</h1>
          <p className="text-sm text-muted-foreground">Ce que vos conducteurs saisissent dans l'appli OptiFlow Conducteur <Smartphone className="inline h-4 w-4" /></p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-lg border">
            <Button variant="ghost" size="icon" onClick={() => move(-1)} aria-label="Mois précédent"><ChevronLeft className="h-4 w-4" /></Button>
            <span className="min-w-32 text-center text-sm font-medium capitalize">{new Date(`${month}-15`).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</span>
            <Button variant="ghost" size="icon" onClick={() => move(1)} aria-label="Mois suivant"><ChevronRight className="h-4 w-4" /></Button>
          </div>
          <Select value={driver} onValueChange={setDriver}>
            <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Tous les conducteurs</SelectItem>
              {drivers.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        {[
          ['Heures de travail', fmtMinutes(totals.work), Clock],
          ['Heures de nuit', fmtMinutes(totals.night), Clock],
          ['Repas · découchers', `${totals.meals} · ${totals.overnight}`, Receipt],
          ['Pannes et défauts à traiter', String(openIssues), AlertTriangle],
        ].map(([label, value, Icon]) => {
          const I = Icon as typeof Clock;
          return <Card key={label as string}><CardContent className="flex items-center gap-3 p-4"><I className="h-5 w-5 text-primary" /><div><p className="text-xs text-muted-foreground">{label as string}</p><p className="text-xl font-semibold">{value as string}</p></div></CardContent></Card>;
        })}
      </div>

      {loading ? <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Chargement…</p> : (
        <Tabs defaultValue="hours">
          <TabsList className="flex h-auto flex-wrap">
            <TabsTrigger value="hours" className="gap-1.5"><Clock className="h-4 w-4" /> Heures</TabsTrigger>
            <TabsTrigger value="money" className="gap-1.5"><Fuel className="h-4 w-4" /> Pleins et frais</TabsTrigger>
            <TabsTrigger value="checks" className="gap-1.5"><ClipboardCheck className="h-4 w-4" /> Contrôles et pannes{openIssues ? ` (${openIssues})` : ''}</TabsTrigger>
            <TabsTrigger value="docs" className="gap-1.5"><FileText className="h-4 w-4" /> Documents</TabsTrigger>
          </TabsList>

          <TabsContent value="hours" className="space-y-3">
            <div className="flex justify-end"><Button size="sm" variant="outline" className="gap-1.5" onClick={exportHours} disabled={!days.length}><Download className="h-4 w-4" /> Exporter (tableur)</Button></div>
            {!days.length ? <Empty /> : (
              <div className="overflow-x-auto rounded-lg border">
                <Table>
                  <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Conducteur</TableHead><TableHead>Début</TableHead><TableHead>Fin</TableHead><TableHead>Travail</TableHead><TableHead>Coupures</TableHead><TableHead>Nuit</TableHead><TableHead>Repas</TableHead><TableHead>Découcher</TableHead><TableHead>Km</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {days.map((d) => (
                      <TableRow key={`${d.driverId}|${d.date}`}>
                        <TableCell className="capitalize">{fr(d.date)}</TableCell>
                        <TableCell>{name(d.driverId)}{d.report?.notes ? <p className="text-xs text-muted-foreground">{d.report.notes}</p> : null}</TableCell>
                        <TableCell>{hhmm(d.h.firstStart)}</TableCell>
                        <TableCell>{d.h.open ? <Badge variant="outline">en service</Badge> : hhmm(d.h.lastEnd)}</TableCell>
                        <TableCell className="font-medium">{fmtMinutes(d.h.work)}</TableCell>
                        <TableCell>{fmtMinutes(d.h.breaks)}</TableCell>
                        <TableCell>{d.h.night ? fmtMinutes(d.h.night) : '—'}</TableCell>
                        <TableCell>{d.report?.meals ?? 0}</TableCell>
                        <TableCell>{d.report?.overnight ? 'Oui' : '—'}</TableCell>
                        <TableCell>{d.km ?? '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          <TabsContent value="money">
            {!money.length ? <Empty /> : (
              <ul className="divide-y rounded-lg border">
                {money.map((l) => (
                  <li key={l.id} className="flex flex-wrap items-center gap-3 p-3 text-sm">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{fr(l.work_date)} · {name(l.driver_id)} · {LOG[l.kind]}{l.kind === 'expense' && l.data.type ? ` (${String(l.data.type)})` : ''}</p>
                      <p className="text-xs text-muted-foreground">{[l.liters ? `${l.liters} L` : '', l.odometer ? `${l.odometer} km` : '', l.data.comment ? String(l.data.comment) : ''].filter(Boolean).join(' · ')}</p>
                    </div>
                    <span className="font-semibold">{eur(l.amount)}</span>
                    {l.doc_path && <Button size="sm" variant="ghost" onClick={() => void openFile(l.doc_path!)}>Ticket</Button>}
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>

          <TabsContent value="checks">
            {!checks.length ? <Empty /> : (
              <ul className="divide-y rounded-lg border">
                {checks.map((l) => {
                  const defects = (l.data.defects as string[] | undefined) ?? [];
                  const issue = l.kind === 'breakdown' || defects.length > 0;
                  return (
                    <li key={l.id} className="flex flex-wrap items-center gap-3 p-3 text-sm">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{fr(l.work_date)} · {name(l.driver_id)} · {LOG[l.kind]}{l.kind === 'breakdown' && l.data.immobilized ? ' · véhicule immobilisé' : ''}</p>
                        <p className={`text-xs ${issue ? 'text-destructive' : 'text-muted-foreground'}`}>
                          {l.kind === 'breakdown' ? String(l.data.description ?? '') : defects.length ? `Défauts : ${defects.join(', ')}` : 'Tout est conforme'}
                          {l.kind === 'checklist' && l.data.comment ? ` — ${String(l.data.comment)}` : ''}
                        </p>
                      </div>
                      {l.doc_path && <Button size="sm" variant="ghost" onClick={() => void openFile(l.doc_path!)}>Photo</Button>}
                      {issue && (l.status === 'done'
                        ? <Badge variant="outline" className="gap-1"><CheckCircle2 className="h-3 w-3" /> Traité</Badge>
                        : <Button size="sm" variant="outline" onClick={() => void setStatus(l.id, 'done')}>Marquer traité</Button>)}
                    </li>
                  );
                })}
              </ul>
            )}
          </TabsContent>

          <TabsContent value="docs">
            {!keep(docs).length ? <Empty /> : (
              <ul className="divide-y rounded-lg border">
                {keep(docs).map((d) => (
                  <li key={d.id} className="flex flex-wrap items-center gap-3 p-3 text-sm">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{fr(d.work_date)} · {name(d.driver_id)} · {DOC[d.kind] ?? d.kind}</p>
                      <p className="text-xs text-muted-foreground">{[d.entry_id ? lines.get(d.entry_id) ?? 'Ligne' : '', d.note ?? ''].filter(Boolean).join(' · ')}</p>
                    </div>
                    {d.path && <Button size="sm" variant="outline" onClick={() => void openFile(d.path!)}>Ouvrir</Button>}
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

function Empty() {
  return <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">Rien pour ce mois. Envoyez à vos conducteurs le lien de l'appli (fiche conducteur › Application).</p>;
}
