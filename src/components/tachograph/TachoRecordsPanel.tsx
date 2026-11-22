import { useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, ChevronLeft, ChevronRight, Download, FileUp, Gauge, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { checkRules, hm, parseDriverCard, type TachoAlert, type TachoCard } from '@/lib/tachograph';
import { computePrePayroll, type PrePayroll } from '@/lib/prePayroll';
import { CATEGORY_INFO, type DriverCategory } from '@/lib/driverContract';
import { driverKey, loadTachoMonth, matchDriver, rowToDay, saveTachoCard, type TachoRow } from '@/lib/tachoRecords';

export interface TachoDriver { id: string; name: string; category: DriverCategory }

interface Pending { file: string; card: TachoCard; driverId: string }

const fr = (d: string) => d.split('-').reverse().join('/');
const n = (v: number) => v.toLocaleString('fr-FR', { maximumFractionDigits: 2 });
const monthLabel = (m: string) => new Date(`${m}-01T12:00:00`).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
const addMonth = (m: string, k: number) => { const d = new Date(Date.UTC(Number(m.slice(0, 4)), Number(m.slice(5, 7)) - 1 + k, 1)); return d.toISOString().slice(0, 7); };

interface DriverMonth { key: string; name: string; category: DriverCategory; linked: boolean; pre: PrePayroll; alerts: TachoAlert[]; km: number }

/**
 * RH › Relevés tachy : fichiers de carte conducteur importés et enregistrés, vus par mois
 * (synthèse pour la paie) et par jour (contrôle), avec les infractions au règlement 561/2006.
 * Composant identique dans OptiFret et OptiFlow.
 */
export function TachoRecordsPanel({ licenseId, drivers }: { licenseId: string | null | undefined; drivers: TachoDriver[] }) {
  const qc = useQueryClient();
  const input = useRef<HTMLInputElement>(null);
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [selected, setSelected] = useState<string>('');
  const [pending, setPending] = useState<Pending[]>([]);
  const [saving, setSaving] = useState(false);

  const { data: rows = [], isLoading, error } = useQuery({
    queryKey: ['tacho-days', licenseId, month],
    enabled: !!licenseId,
    queryFn: () => loadTachoMonth(licenseId!, month),
  });

  const byId = useMemo(() => new Map(drivers.map((d) => [d.id, d])), [drivers]);

  const months: DriverMonth[] = useMemo(() => {
    const groups = new Map<string, TachoRow[]>();
    for (const r of rows) groups.set(driverKey(r), [...(groups.get(driverKey(r)) ?? []), r]);
    return [...groups.entries()].map(([key, list]) => {
      const d = list[0].driver_id ? byId.get(list[0].driver_id) : undefined;
      const days = list.map(rowToDay);
      const category = d?.category ?? 'courte_distance';
      const inMonth = days.filter((x) => x.date.startsWith(month));
      return {
        key,
        name: d?.name ?? list[0].driver_name ?? `Carte ${list[0].card_number}`,
        category,
        linked: !!d,
        pre: computePrePayroll(days, month, category),
        alerts: checkRules(inMonth),
        km: inMonth.reduce((s, x) => s + x.distanceKm, 0),
      };
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [rows, byId, month]);

  const current = months.find((m) => m.key === selected) ?? months[0];

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const next: Pending[] = [];
    for (const f of Array.from(files)) {
      try {
        const card = parseDriverCard(await f.arrayBuffer());
        next.push({ file: f.name, card, driverId: matchDriver(card, drivers)?.id ?? '' });
      } catch (e) {
        toast.error(`${f.name} : ${(e as Error).message}`);
      }
    }
    setPending((p) => [...p, ...next]);
  };

  const saveAll = async () => {
    if (!licenseId) return;
    setSaving(true);
    try {
      let total = 0;
      for (const p of pending) {
        const d = p.driverId ? byId.get(p.driverId) : undefined;
        total += await saveTachoCard(licenseId, p.card, d ? { id: d.id, name: d.name } : null, p.file);
      }
      toast.success(`${total} journée(s) enregistrée(s)`);
      setPending([]);
      qc.invalidateQueries({ queryKey: ['tacho-days'] });
    } catch (e) {
      toast.error(`Enregistrement impossible : ${(e as Error).message}`);
    } finally {
      setSaving(false);
    }
  };

  const exportCsv = () => {
    const head = ['Conducteur', 'Catégorie', 'Journées', 'Temps de service (h)', 'Conduite (h)', 'Équivalences +25 % (h)', 'Heures sup. +25 % (h)', 'Heures sup. +50 % (h)', 'Nuit (h)', 'Dimanche / férié (h)', 'Repas', 'Repas de nuit', 'Casse-croûte', 'Découchers estimés', 'Km', 'Infractions'];
    const lines = months.map((m) => [m.name, CATEGORY_INFO[m.category].label, m.pre.days.length, m.pre.serviceHours, m.pre.drivingHours, m.pre.equivalence25, m.pre.overtime25, m.pre.overtime50, m.pre.nightHours, m.pre.sundayHours, m.pre.meals, m.pre.nightMeals, m.pre.casseCroutes, m.pre.overnights, m.km, m.alerts.filter((a) => a.level === 'infraction').length]);
    const csv = [head, ...lines].map((l) => l.map((v) => (typeof v === 'number' ? String(v).replace('.', ',') : `"${String(v).replace(/"/g, '""')}"`)).join(';')).join('\r\n');
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `releves-tachy-${month}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold"><Gauge className="h-6 w-6 text-primary" /> Relevés tachy</h1>
          <p className="text-sm text-muted-foreground">Cartes conducteur importées : synthèse du mois pour la paie, détail jour par jour et infractions au règlement 561/2006.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input ref={input} type="file" accept=".ddd,.DDD,.c1b,.C1B,.tgd,.TGD,.esm,.ESM,.v1b,.V1B" multiple className="sr-only"
            onChange={(e) => { void onFiles(e.target.files); e.target.value = ''; }} />
          <Button variant="outline" className="gap-2" onClick={exportCsv} disabled={!months.length}><Download className="h-4 w-4" /> Export CSV du mois</Button>
          <Button className="gap-2" onClick={() => input.current?.click()}><FileUp className="h-4 w-4" /> Importer des cartes (.ddd)</Button>
        </div>
      </div>

      {pending.length > 0 && (
        <Card className="border-primary/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{pending.length} carte(s) à enregistrer</CardTitle>
            <CardDescription>Vérifiez le conducteur de chaque carte. Les journées déjà enregistrées sont mises à jour, pas dupliquées.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {pending.map((p, i) => (
              <div key={`${p.file}-${i}`} className="flex flex-wrap items-center gap-3 rounded border p-2 text-sm">
                <span className="min-w-48 font-medium">{[p.card.firstNames, p.card.surname].filter(Boolean).join(' ') || p.file}</span>
                <span className="text-muted-foreground">{p.card.days.length} jour(s) · carte {p.card.cardNumber || '—'}</span>
                <Select value={p.driverId || 'none'} onValueChange={(v) => setPending((all) => all.map((x, j) => (j === i ? { ...x, driverId: v === 'none' ? '' : v } : x)))}>
                  <SelectTrigger className="h-8 w-56"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Conducteur non rattaché</SelectItem>
                    {drivers.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            ))}
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setPending([])}>Annuler</Button>
              <Button onClick={saveAll} disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Enregistrer</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center gap-2">
        <Button size="icon" variant="outline" onClick={() => setMonth(addMonth(month, -1))} aria-label="Mois précédent"><ChevronLeft className="h-4 w-4" /></Button>
        <span className="min-w-40 text-center font-semibold capitalize">{monthLabel(month)}</span>
        <Button size="icon" variant="outline" onClick={() => setMonth(addMonth(month, 1))} aria-label="Mois suivant"><ChevronRight className="h-4 w-4" /></Button>
      </div>

      {error ? (
        <p className="text-sm text-destructive">Relevés indisponibles (mise à jour de la base nécessaire).</p>
      ) : isLoading ? (
        <p className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Chargement…</p>
      ) : months.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">Aucun relevé ce mois-ci. Téléchargez les cartes de vos conducteurs (lecteur de carte, au moins tous les 28 jours) et importez les fichiers .ddd.</CardContent></Card>
      ) : (
        <Tabs defaultValue="month">
          <TabsList>
            <TabsTrigger value="month">Mensuel</TabsTrigger>
            <TabsTrigger value="day">Journalier</TabsTrigger>
            <TabsTrigger value="alerts">Infractions ({months.reduce((s, m) => s + m.alerts.filter((a) => a.level === 'infraction').length, 0)})</TabsTrigger>
          </TabsList>

          <TabsContent value="month">
            <Card>
              <CardContent className="overflow-x-auto p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Conducteur</TableHead>
                      <TableHead className="text-right">Jours</TableHead>
                      <TableHead className="text-right">Service</TableHead>
                      <TableHead className="text-right">Conduite</TableHead>
                      <TableHead className="text-right">Équiv. 25 %</TableHead>
                      <TableHead className="text-right">Sup. 25 %</TableHead>
                      <TableHead className="text-right">Sup. 50 %</TableHead>
                      <TableHead className="text-right">Nuit</TableHead>
                      <TableHead className="text-right">Dim./férié</TableHead>
                      <TableHead className="text-right">Repas</TableHead>
                      <TableHead className="text-right">Casse-croûte</TableHead>
                      <TableHead className="text-right">Découchers</TableHead>
                      <TableHead className="text-right">Km</TableHead>
                      <TableHead className="text-right">Infractions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {months.map((m) => {
                      const inf = m.alerts.filter((a) => a.level === 'infraction').length;
                      return (
                        <TableRow key={m.key} className="cursor-pointer" onClick={() => setSelected(m.key)}>
                          <TableCell>
                            <p className="font-medium">{m.name}</p>
                            <p className="text-xs text-muted-foreground">{CATEGORY_INFO[m.category].label}{!m.linked && ' · carte non rattachée'}</p>
                          </TableCell>
                          <TableCell className="text-right">{m.pre.days.length}</TableCell>
                          <TableCell className="text-right font-medium">{n(m.pre.serviceHours)} h</TableCell>
                          <TableCell className="text-right">{n(m.pre.drivingHours)} h</TableCell>
                          <TableCell className="text-right">{n(m.pre.equivalence25)}</TableCell>
                          <TableCell className="text-right">{n(m.pre.overtime25)}</TableCell>
                          <TableCell className="text-right">{n(m.pre.overtime50)}</TableCell>
                          <TableCell className="text-right">{n(m.pre.nightHours)}</TableCell>
                          <TableCell className="text-right">{n(m.pre.sundayHours)}</TableCell>
                          <TableCell className="text-right">{m.pre.meals + m.pre.nightMeals}</TableCell>
                          <TableCell className="text-right">{m.pre.casseCroutes}</TableCell>
                          <TableCell className="text-right">{m.category === 'longue_distance' ? m.pre.overnights : '—'}</TableCell>
                          <TableCell className="text-right">{m.km.toLocaleString('fr-FR')}</TableCell>
                          <TableCell className="text-right">{inf ? <Badge variant="destructive">{inf}</Badge> : <span className="text-muted-foreground">0</span>}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            <p className="mt-2 text-xs text-muted-foreground">Décompte mensuel selon la convention collective : équivalences jusqu'à 186,33 h (grand routier) ou 169 h (courte distance), puis heures sup. La pré-paie de chaque bulletin reprend ces chiffres (Fiches de paie › Préparer). Cliquez sur une ligne pour voir le détail du conducteur.</p>
          </TabsContent>

          <TabsContent value="day" className="space-y-3">
            <Select value={current?.key} onValueChange={setSelected}>
              <SelectTrigger className="w-72"><SelectValue /></SelectTrigger>
              <SelectContent>{months.map((m) => <SelectItem key={m.key} value={m.key}>{m.name}</SelectItem>)}</SelectContent>
            </Select>
            {current && (
              <Card>
                <CardContent className="overflow-x-auto p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Jour</TableHead>
                        <TableHead>Prise / fin</TableHead>
                        <TableHead className="text-right">Conduite</TableHead>
                        <TableHead className="text-right">Travail</TableHead>
                        <TableHead className="text-right">Dispo.</TableHead>
                        <TableHead className="text-right">Service</TableHead>
                        <TableHead className="text-right">Nuit</TableHead>
                        <TableHead>Frais</TableHead>
                        <TableHead>Contrôle</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {current.pre.days.map((d) => {
                        const al = current.alerts.filter((a) => a.date === d.date);
                        return (
                          <TableRow key={`${d.date}-${d.start}`}>
                            <TableCell className="whitespace-nowrap">{new Date(`${d.date}T12:00:00`).toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: '2-digit' })}</TableCell>
                            <TableCell className="whitespace-nowrap">{d.start} – {d.end}</TableCell>
                            <TableCell className="text-right">{hm(d.drivingMin)}</TableCell>
                            <TableCell className="text-right">{hm(d.workMin)}</TableCell>
                            <TableCell className="text-right">{hm(d.availabilityMin)}</TableCell>
                            <TableCell className="text-right font-medium">{hm(d.serviceMin)}</TableCell>
                            <TableCell className="text-right">{d.nightMin ? hm(d.nightMin) : '—'}</TableCell>
                            <TableCell className="text-xs">{[d.meals ? `${d.meals} repas` : '', d.nightMeal ? 'repas de nuit' : '', d.casseCroute ? 'casse-croûte' : '', current.category === 'longue_distance' && d.shortRestAfter ? 'découcher ?' : ''].filter(Boolean).join(' · ') || '—'}</TableCell>
                            <TableCell className="text-xs">
                              {al.length === 0 ? <span className="text-muted-foreground">OK</span> : al.map((a, i) => (
                                <p key={i} className={a.level === 'infraction' ? 'text-destructive' : 'text-warning'}>{a.message}</p>
                              ))}
                              {d.serviceMin > 12 * 60 && <p className="text-destructive">Plus de 12 h de service</p>}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="alerts">
            <Card>
              <CardContent className="space-y-2 p-4">
                {months.every((m) => m.alerts.length === 0) ? (
                  <p className="text-sm text-muted-foreground">Aucune infraction détectée ce mois-ci.</p>
                ) : months.flatMap((m) => m.alerts.map((a, i) => (
                  <div key={`${m.key}-${i}`} className="flex items-start gap-2 text-sm">
                    <AlertTriangle className={`mt-0.5 h-4 w-4 shrink-0 ${a.level === 'infraction' ? 'text-destructive' : 'text-warning'}`} />
                    <span><b>{m.name}</b> · {fr(a.date)} — {a.message}</span>
                  </div>
                )))}
                <p className="pt-2 text-xs text-muted-foreground">Contrôles du règlement (CE) 561/2006 : conduite journalière, continue, hebdomadaire et sur deux semaines, repos journalier. À vérifier sur le relevé officiel avant toute sanction.</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
