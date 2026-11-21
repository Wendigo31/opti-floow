import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, CalendarDays, Camera, CheckCircle2, ChevronLeft, ChevronRight, ClipboardCheck, Clock, Coffee, FileText, Fuel,
  Loader2, MapPin, Moon, Navigation, Play, Receipt, RefreshCw, Square, Sun, Truck, Utensils, Wrench, XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { call, clockTime, forgetToken, hm, isoDay, position, readToken, rpc, uploadFile, type Day, type Tour, type WeekDay } from '@/driver/api';
import { SignaturePad } from '@/driver/SignaturePad';
import { computeDayHours, fmtMinutes } from '@/lib/driverHours';

/**
 * Appli conducteur OptiFlow (/conducteur) — installable sur le téléphone, sans compte :
 * lignes du jour et de la semaine, pointage et heures, documents et preuves (CMR,
 * bons, photos, signature), véhicule et frais (check-list, pleins, péages, pannes).
 * Différente d'OptiFret Driver et d'OptiXpress Driver : pensée pour les lots
 * complets et les lignes régulières.
 */
type Tab = 'today' | 'week' | 'vehicle' | 'day';
const STATUS: Record<Tour['status'], { label: string; cls: string }> = {
  planned: { label: 'À faire', cls: 'bg-muted text-muted-foreground' },
  in_progress: { label: 'En cours', cls: 'bg-sky-500/15 text-sky-700' },
  completed: { label: 'Terminée', cls: 'bg-emerald-500/15 text-emerald-700' },
};
const DOC_KINDS: { value: string; label: string; mode: 'file' | 'signature' | 'note' }[] = [
  { value: 'cmr', label: 'CMR / lettre de voiture signée', mode: 'file' },
  { value: 'delivery_note', label: 'Bon de livraison', mode: 'file' },
  { value: 'signature', label: 'Signature du destinataire', mode: 'signature' },
  { value: 'photo', label: 'Photo (chargement, marchandise…)', mode: 'file' },
  { value: 'reserve', label: 'Réserve / litige', mode: 'note' },
  { value: 'weighing', label: 'Ticket de pesée', mode: 'file' },
  { value: 'site_note', label: 'Bon de chantier', mode: 'file' },
];
const CHECKS = ['Pneus et roues', 'Feux et clignotants', 'Freins', 'Niveaux (huile, AdBlue, lave-glace)', 'Rétroviseurs et pare-brise', 'Attelage / sellette', 'Arrimage (sangles, barres)', 'Documents de bord', 'Propreté de la cabine'];
const LOG_LABEL: Record<string, string> = { fuel: 'Plein gazole', adblue: 'AdBlue', toll: 'Péage', expense: 'Frais', checklist: 'Check-list départ', breakdown: 'Panne signalée' };
const ABSENCE: Record<string, string> = { conges: 'Congés', maladie: 'Maladie', formation: 'Formation', repos: 'Repos' };
const num = (v: string) => (v.trim() === '' ? null : Number(v.replace(',', '.')));
const mondayOf = (d: Date) => { const m = new Date(d); m.setDate(m.getDate() - ((m.getDay() + 6) % 7)); return m; };

export default function DriverApp() {
  const [token] = useState(readToken);
  const [tab, setTab] = useState<Tab>('today');
  const [date, setDate] = useState(() => isoDay(new Date()));
  const [day, setDay] = useState<Day | null>(null);
  const [state, setState] = useState<'loading' | 'ok' | 'invalid'>('loading');
  const [busy, setBusy] = useState(false);
  const today = isoDay(new Date());

  // Manifeste propre à l'appli conducteur : installée, elle s'ouvre directement sur /conducteur.
  useEffect(() => {
    let link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    if (!link) { link = document.createElement('link'); link.rel = 'manifest'; document.head.appendChild(link); }
    link.href = '/conducteur.webmanifest';
    document.title = 'OptiFlow Conducteur';
    if (window.location.search.includes('token=')) window.history.replaceState(null, '', '/conducteur');
  }, []);

  const load = useCallback(async () => {
    if (!token) { setState('invalid'); return; }
    const { data, error } = await rpc('driver_app_day', { p_token: token, p_date: date });
    if (error || !data) { setState('invalid'); return; }
    setDay(data as Day);
    setState('ok');
  }, [token, date]);

  useEffect(() => {
    void load();
    const t = setInterval(load, 120_000);
    return () => clearInterval(t);
  }, [load]);

  const run = async (fn: () => Promise<unknown>, ok?: string) => {
    setBusy(true);
    try {
      await fn();
      if (ok) toast.success(ok);
      await load();
      return true;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
      return false;
    } finally {
      setBusy(false);
    }
  };

  if (state === 'loading') return <div className="flex min-h-dvh items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (state === 'invalid' || !day) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-muted/30 p-4">
        <div className="max-w-sm rounded-2xl border bg-card p-6 text-center">
          <XCircle className="mx-auto h-8 w-8 text-muted-foreground" />
          <h1 className="mt-3 font-semibold">Lien conducteur invalide</h1>
          <p className="mt-1 text-sm text-muted-foreground">Ouvrez le lien personnel envoyé par votre exploitation. S'il a été remplacé, demandez-en un nouveau.</p>
          {token && <Button variant="ghost" className="mt-3" onClick={() => { forgetToken(); window.location.reload(); }}>Oublier ce téléphone</Button>}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-muted/30 pb-24">
      <header className="sticky top-0 z-10 border-b bg-card/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-md items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate font-semibold">{day.driver || 'Conducteur'}</p>
            <p className="truncate text-xs text-muted-foreground">{day.company} · OptiFlow Conducteur</p>
          </div>
          <Button size="icon" variant="ghost" onClick={() => void load()} aria-label="Actualiser"><RefreshCw className="h-4 w-4" /></Button>
        </div>
      </header>

      <main className="mx-auto max-w-md space-y-4 px-4 pt-4">
        {tab === 'today' && <TodayTab token={token} day={day} date={date} setDate={setDate} today={today} busy={busy} run={run} />}
        {tab === 'week' && <WeekTab token={token} onPick={(d) => { setDate(d); setTab('today'); }} />}
        {tab === 'vehicle' && <VehicleTab token={token} day={day} busy={busy} run={run} isToday={date === today} />}
        {tab === 'day' && <DayTab token={token} day={day} date={date} busy={busy} run={run} />}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-10 border-t bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <div className="mx-auto grid max-w-md grid-cols-4">
          {([
            ['today', 'Aujourd\'hui', Truck],
            ['week', 'Semaine', CalendarDays],
            ['vehicle', 'Véhicule', Wrench],
            ['day', 'Ma journée', Clock],
          ] as const).map(([k, label, Icon]) => (
            <button key={k} type="button" onClick={() => setTab(k)} className={`flex flex-col items-center gap-0.5 py-2.5 text-[11px] ${tab === k ? 'text-primary' : 'text-muted-foreground'}`}>
              <Icon className="h-5 w-5" /> {label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}

type Run = (fn: () => Promise<unknown>, ok?: string) => Promise<boolean>;

/* ───────────── Aujourd'hui : pointage + lignes + documents ───────────── */
function TodayTab({ token, day, date, setDate, today, busy, run }: { token: string; day: Day; date: string; setDate: (d: string) => void; today: string; busy: boolean; run: Run }) {
  const [odo, setOdo] = useState<{ kind: 'start' | 'end' } | null>(null);
  const [odoValue, setOdoValue] = useState('');
  const [finishing, setFinishing] = useState<Tour | null>(null);
  const [docFor, setDocFor] = useState<Tour | null>(null);
  const [note, setNote] = useState('');
  const [given, setGiven] = useState('');
  const [returned, setReturned] = useState('');
  const hours = useMemo(() => computeDayHours(day.time), [day.time]);
  const isToday = date === today;
  const label = new Date(`${date}T00:00:00`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  const shift = (n: number) => { const d = new Date(`${date}T12:00:00`); d.setDate(d.getDate() + n); setDate(isoDay(d)); };

  const clock = (kind: 'start' | 'break_start' | 'break_end' | 'end', odometer: number | null = null) =>
    run(async () => {
      const p = await position();
      await call('driver_clock', { p_token: token, p_kind: kind, p_odometer: odometer, p_lat: p?.lat ?? null, p_lng: p?.lng ?? null });
    }, { start: 'Service commencé', break_start: 'Bonne coupure', break_end: 'Reprise enregistrée', end: 'Fin de service enregistrée' }[kind]);

  const updateTour = (t: Tour, status: 'in_progress' | 'completed', extra: { note?: string; given?: number; returned?: number } = {}) =>
    run(() => call('driver_update_tour', { p_token: token, p_entry: t.id, p_status: status, p_note: extra.note ?? null, p_pallets_given: extra.given ?? 0, p_pallets_returned: extra.returned ?? 0 }),
      status === 'completed' ? 'Ligne terminée, merci !' : 'Ligne démarrée');

  return (
    <>
      <div className="flex items-center justify-between rounded-xl border bg-card p-2">
        <Button size="icon" variant="ghost" onClick={() => shift(-1)} aria-label="Jour précédent"><ChevronLeft className="h-5 w-5" /></Button>
        <div className="text-center">
          <p className="font-medium capitalize">{label}</p>
          {!isToday && <button type="button" className="text-xs text-primary" onClick={() => setDate(today)}>Revenir à aujourd'hui</button>}
        </div>
        <Button size="icon" variant="ghost" onClick={() => shift(1)} aria-label="Jour suivant"><ChevronRight className="h-5 w-5" /></Button>
      </div>

      {isToday && (
        <section className="space-y-3 rounded-2xl border bg-card p-4">
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-2 font-semibold"><Clock className="h-4 w-4" /> Pointage</p>
            <span className={`rounded-full px-2 py-0.5 text-xs ${hours.open ? (hours.onBreak ? 'bg-amber-500/15 text-amber-700' : 'bg-emerald-500/15 text-emerald-700') : 'bg-muted text-muted-foreground'}`}>
              {hours.open ? (hours.onBreak ? 'En coupure' : 'En service') : day.time.length ? 'Service terminé' : 'Pas commencé'}
            </span>
          </div>
          {day.time.length > 0 && (
            <p className="text-sm text-muted-foreground">
              Travail {fmtMinutes(hours.work)} · coupures {fmtMinutes(hours.breaks)}{hours.night ? ` · nuit ${fmtMinutes(hours.night)}` : ''}
              <br />{day.time.map((t) => `${{ start: 'Début', break_start: 'Coupure', break_end: 'Reprise', end: 'Fin' }[t.kind]} ${clockTime(t.at)}`).join(' · ')}
            </p>
          )}
          <div className="grid grid-cols-2 gap-2">
            {!hours.open && <Button className="col-span-2 gap-2" disabled={busy} onClick={() => { setOdo({ kind: 'start' }); setOdoValue(''); }}><Play className="h-4 w-4" /> Prendre mon service</Button>}
            {hours.open && !hours.onBreak && <Button variant="outline" className="gap-2" disabled={busy} onClick={() => void clock('break_start')}><Coffee className="h-4 w-4" /> Coupure</Button>}
            {hours.onBreak && <Button variant="outline" className="gap-2" disabled={busy} onClick={() => void clock('break_end')}><Play className="h-4 w-4" /> Reprendre</Button>}
            {hours.open && <Button className="gap-2 bg-slate-800 hover:bg-slate-900" disabled={busy} onClick={() => { setOdo({ kind: 'end' }); setOdoValue(''); }}><Square className="h-4 w-4" /> Fin de service</Button>}
          </div>
        </section>
      )}

      {!day.tours.length && <p className="rounded-xl border bg-card p-6 text-center text-sm text-muted-foreground">Aucune ligne prévue ce jour-là.</p>}

      {day.tours.map((t) => {
        const route = [t.origin, ...t.stops.map((s) => s.address), t.destination].filter(Boolean) as string[];
        const maps = route.length >= 2
          ? `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(route[0])}&destination=${encodeURIComponent(route[route.length - 1])}${route.length > 2 ? `&waypoints=${encodeURIComponent(route.slice(1, -1).join('|'))}` : ''}&travelmode=driving`
          : null;
        const waze = route.length ? `https://waze.com/ul?q=${encodeURIComponent(route[route.length - 1])}&navigate=yes` : null;
        const docs = day.documents.filter((d) => d.entry_id === t.id);
        return (
          <article key={t.id} className="space-y-3 rounded-2xl border bg-card p-4 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h2 className="font-semibold">{t.name}</h2>
                {t.client && <p className="text-sm text-muted-foreground">{t.client}</p>}
              </div>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS[t.status]?.cls ?? ''}`}>{STATUS[t.status]?.label ?? t.status}</span>
            </div>
            {(t.start || t.end) && <p className="flex items-center gap-2 text-sm"><Clock className="h-4 w-4 text-muted-foreground" /> {hm(t.start)}{t.end ? ` – ${hm(t.end)}` : ''}</p>}
            {t.relay && <p className="rounded-lg bg-amber-500/10 p-2 text-sm">Relais{t.relay_location ? ` à ${t.relay_location}` : ''}{t.relay_time ? ` vers ${hm(t.relay_time)}` : ''}</p>}
            {route.length > 0 && (
              <ol className="space-y-1 text-sm">
                {route.map((a, i) => (
                  <li key={i} className="flex items-start gap-2"><MapPin className={`mt-0.5 h-4 w-4 shrink-0 ${i === 0 ? 'text-emerald-600' : i === route.length - 1 ? 'text-destructive' : 'text-muted-foreground'}`} /> {a}</li>
                ))}
              </ol>
            )}
            {t.mission_order && <p className="rounded-lg bg-muted/60 p-2 text-sm"><span className="font-medium">Ordre de mission : </span>{t.mission_order}</p>}
            {t.notes && <p className="text-sm text-muted-foreground">{t.notes}</p>}
            <div className="flex flex-wrap gap-2">
              {maps && <Button asChild variant="outline" size="sm" className="gap-1.5"><a href={maps} target="_blank" rel="noreferrer"><Navigation className="h-4 w-4" /> Maps</a></Button>}
              {waze && <Button asChild variant="outline" size="sm" className="gap-1.5"><a href={waze} target="_blank" rel="noreferrer"><Navigation className="h-4 w-4" /> Waze</a></Button>}
              {isToday && <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setDocFor(t)}><FileText className="h-4 w-4" /> Documents{docs.length ? ` (${docs.length})` : ''}</Button>}
              {isToday && t.status === 'planned' && <Button size="sm" className="gap-1.5" onClick={() => void updateTour(t, 'in_progress')} disabled={busy}><Play className="h-4 w-4" /> Démarrer</Button>}
              {isToday && t.status !== 'completed' && (
                <Button size="sm" className="gap-1.5 bg-emerald-600 hover:bg-emerald-700" onClick={() => { setFinishing(t); setNote(''); setGiven(''); setReturned(''); }} disabled={busy}>
                  <CheckCircle2 className="h-4 w-4" /> Terminer
                </Button>
              )}
            </div>
            {finishing?.id === t.id && (
              <div className="space-y-3 rounded-xl border p-3">
                {t.client_id && (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1"><Label className="text-xs">Palettes laissées</Label><Input inputMode="numeric" value={given} onChange={(e) => setGiven(e.target.value.replace(/\D/g, ''))} placeholder="0" /></div>
                    <div className="space-y-1"><Label className="text-xs">Palettes récupérées</Label><Input inputMode="numeric" value={returned} onChange={(e) => setReturned(e.target.value.replace(/\D/g, ''))} placeholder="0" /></div>
                  </div>
                )}
                <div className="space-y-1"><Label className="text-xs">Remarque (retard, incident…)</Label><Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} /></div>
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" onClick={() => setFinishing(null)}>Annuler</Button>
                  <Button className="bg-emerald-600 hover:bg-emerald-700" disabled={busy} onClick={() => void updateTour(t, 'completed', { note, given: Number(given) || 0, returned: Number(returned) || 0 }).then((ok) => ok && setFinishing(null))}>
                    Valider la fin
                  </Button>
                </div>
              </div>
            )}
          </article>
        );
      })}

      <Dialog open={!!odo} onOpenChange={(o) => !o && setOdo(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{odo?.kind === 'start' ? 'Prise de service' : 'Fin de service'}</DialogTitle>
            <DialogDescription>Kilométrage au compteur{day.vehicle ? ` de ${day.vehicle.name ?? ''} ${day.vehicle.plate ?? ''}` : ''} (facultatif).</DialogDescription>
          </DialogHeader>
          <Input inputMode="numeric" value={odoValue} onChange={(e) => setOdoValue(e.target.value.replace(/\D/g, ''))} placeholder="Ex. 245318" />
          <DialogFooter>
            <Button disabled={busy} onClick={() => { const k = odo!.kind; setOdo(null); void clock(k, odoValue ? Number(odoValue) : null); }}>Valider</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DocDialog token={token} tour={docFor} onClose={() => setDocFor(null)} run={run} />
    </>
  );
}

function DocDialog({ token, tour, onClose, run }: { token: string; tour: Tour | null; onClose: () => void; run: Run }) {
  const [kind, setKind] = useState('cmr');
  const [file, setFile] = useState<File | null>(null);
  const [sig, setSig] = useState<Blob | null>(null);
  const [text, setText] = useState('');
  const mode = DOC_KINDS.find((k) => k.value === kind)?.mode ?? 'file';
  useEffect(() => { if (tour) { setKind('cmr'); setFile(null); setSig(null); setText(''); } }, [tour]);
  const ready = mode === 'file' ? !!file : mode === 'signature' ? !!sig : !!text.trim();
  const save = () => run(async () => {
    const blob = mode === 'file' ? file : mode === 'signature' ? sig : null;
    const path = blob ? await uploadFile(token, blob) : null;
    await call('driver_add_document', { p_token: token, p_entry: tour?.id ?? null, p_kind: kind, p_path: path, p_note: text.trim() || null });
  }, 'Document envoyé au bureau').then((ok) => ok && onClose());
  return (
    <Dialog open={!!tour} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90dvh] max-w-sm overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Documents — {tour?.name}</DialogTitle>
          <DialogDescription>Envoyés tout de suite au bureau, rattachés à cette ligne.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Select value={kind} onValueChange={(v) => { setKind(v); setFile(null); setSig(null); }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{DOC_KINDS.map((k) => <SelectItem key={k.value} value={k.value}>{k.label}</SelectItem>)}</SelectContent>
          </Select>
          {mode === 'file' && (
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed p-4 text-sm">
              <Camera className="h-5 w-5" /> {file ? file.name : 'Prendre une photo ou choisir un fichier'}
              <input type="file" accept="image/*,application/pdf" capture="environment" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </label>
          )}
          {mode === 'signature' && <SignaturePad onChange={setSig} />}
          <div className="space-y-1">
            <Label className="text-xs">{mode === 'note' ? 'Réserve (dommage, manquant, retard…)' : 'Remarque (facultatif)'}</Label>
            <Textarea rows={2} value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} />
          </div>
        </div>
        <DialogFooter><Button disabled={!ready} onClick={() => void save()}>Envoyer</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ───────────── Semaine ───────────── */
function WeekTab({ token, onPick }: { token: string; onPick: (d: string) => void }) {
  const [from, setFrom] = useState(() => isoDay(mondayOf(new Date())));
  const [days, setDays] = useState<WeekDay[] | null>(null);
  useEffect(() => {
    setDays(null);
    void call<WeekDay[]>('driver_app_week', { p_token: token, p_from: from }).then(setDays).catch((e) => toast.error(String(e.message ?? e)));
  }, [token, from]);
  const move = (n: number) => { const d = new Date(`${from}T12:00:00`); d.setDate(d.getDate() + 7 * n); setFrom(isoDay(d)); };
  const today = isoDay(new Date());
  return (
    <>
      <div className="flex items-center justify-between rounded-xl border bg-card p-2">
        <Button size="icon" variant="ghost" onClick={() => move(-1)} aria-label="Semaine précédente"><ChevronLeft className="h-5 w-5" /></Button>
        <p className="font-medium">Semaine du {new Date(`${from}T12:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}</p>
        <Button size="icon" variant="ghost" onClick={() => move(1)} aria-label="Semaine suivante"><ChevronRight className="h-5 w-5" /></Button>
      </div>
      {!days ? <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" /> : (
        <ul className="divide-y rounded-2xl border bg-card">
          {days.map((d) => (
            <li key={d.date}>
              <button type="button" onClick={() => onPick(d.date)} className={`flex w-full items-center gap-3 p-3 text-left ${d.date === today ? 'bg-primary/5' : ''}`}>
                <span className="w-24 shrink-0 text-sm font-medium capitalize">{new Date(`${d.date}T12:00:00`).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                <span className="flex-1 text-sm text-muted-foreground">
                  {d.absence ? ABSENCE[d.absence] ?? d.absence : d.tours ? `${d.tours} ligne${d.tours > 1 ? 's' : ''}${d.first ? ` · ${hm(d.first)}` : ''}${d.last ? ` – ${hm(d.last)}` : ''}` : 'Rien de prévu'}
                </span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

/* ───────────── Véhicule et frais ───────────── */
function VehicleTab({ token, day, busy, run, isToday }: { token: string; day: Day; busy: boolean; run: Run; isToday: boolean }) {
  const [form, setForm] = useState<null | 'fuel' | 'adblue' | 'toll' | 'checklist' | 'breakdown'>(null);
  const [amount, setAmount] = useState('');
  const [liters, setLiters] = useState('');
  const [odo, setOdo] = useState('');
  const [expense, setExpense] = useState('péage');
  const [desc, setDesc] = useState('');
  const [immobilized, setImmobilized] = useState(false);
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [file, setFile] = useState<File | null>(null);
  const open = (f: NonNullable<typeof form>) => { setForm(f); setAmount(''); setLiters(''); setOdo(''); setDesc(''); setFile(null); setImmobilized(false); setChecks(Object.fromEntries(CHECKS.map((c) => [c, true]))); setExpense('péage'); };
  const vid = day.vehicle?.id ?? null;
  const save = () => run(async () => {
    const path = file ? await uploadFile(token, file) : null;
    const kind = form === 'toll' ? (expense === 'péage' ? 'toll' : 'expense') : form;
    const data = form === 'checklist'
      ? { defects: CHECKS.filter((c) => !checks[c]), comment: desc.trim() || null }
      : form === 'breakdown' ? { description: desc.trim(), immobilized }
      : form === 'toll' ? { type: expense, comment: desc.trim() || null } : { comment: desc.trim() || null };
    await call('driver_add_log', { p_token: token, p_kind: kind, p_amount: num(amount), p_liters: num(liters), p_odometer: odo ? Number(odo) : null, p_vehicle_id: vid, p_entry: null, p_data: data, p_path: path });
  }, form === 'breakdown' ? 'Panne signalée au bureau' : 'Enregistré').then((ok) => ok && setForm(null));
  const defects = (form === 'checklist') ? CHECKS.filter((c) => !checks[c]).length : 0;
  const valid = form === 'breakdown' ? !!desc.trim() : form === 'checklist' ? (defects === 0 || !!desc.trim()) : form === 'toll' ? !!num(amount) : !!num(liters) || !!num(amount);

  return (
    <>
      <section className="rounded-2xl border bg-card p-4">
        <p className="flex items-center gap-2 font-semibold"><Truck className="h-4 w-4" /> {day.vehicle ? `${day.vehicle.name ?? 'Véhicule'} ${day.vehicle.plate ?? ''}` : 'Aucun véhicule prévu aujourd\'hui'}</p>
        {!day.vehicle && <p className="mt-1 text-sm text-muted-foreground">Les saisies restent enregistrées à votre nom.</p>}
      </section>
      {isToday ? (
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" className="h-16 flex-col gap-1" onClick={() => open('checklist')}><ClipboardCheck className="h-5 w-5" /> Check-list départ</Button>
          <Button variant="outline" className="h-16 flex-col gap-1" onClick={() => open('fuel')}><Fuel className="h-5 w-5" /> Plein gazole</Button>
          <Button variant="outline" className="h-16 flex-col gap-1" onClick={() => open('adblue')}><Fuel className="h-5 w-5" /> AdBlue</Button>
          <Button variant="outline" className="h-16 flex-col gap-1" onClick={() => open('toll')}><Receipt className="h-5 w-5" /> Péage / frais</Button>
          <Button variant="outline" className="col-span-2 h-14 gap-2 border-destructive/40 text-destructive" onClick={() => open('breakdown')}><AlertTriangle className="h-5 w-5" /> Signaler une panne</Button>
        </div>
      ) : <p className="text-sm text-muted-foreground">Les saisies se font le jour même : revenez sur aujourd'hui.</p>}

      {day.logs.length > 0 && (
        <ul className="divide-y rounded-2xl border bg-card text-sm">
          {day.logs.map((l) => (
            <li key={l.id} className="flex items-center justify-between gap-2 p-3">
              <span>{LOG_LABEL[l.kind] ?? l.kind}{l.liters ? ` · ${l.liters} L` : ''}{l.odometer ? ` · ${l.odometer} km` : ''}{l.kind === 'checklist' && Array.isArray((l.data as { defects?: string[] }).defects) ? ` · ${((l.data as { defects: string[] }).defects.length || 'aucun')} défaut(s)` : ''}</span>
              <span className="text-muted-foreground">{l.amount ? `${Number(l.amount).toFixed(2)} €` : ''} {clockTime(l.at)}</span>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent className="max-h-[90dvh] max-w-sm overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form === 'toll' ? 'Péage ou frais' : form ? LOG_LABEL[form] : ''}</DialogTitle>
            <DialogDescription>{form === 'checklist' ? 'Décochez ce qui ne va pas.' : form === 'breakdown' ? 'Le bureau est prévenu tout de suite.' : 'Joignez la photo du ticket si possible.'}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {form === 'checklist' && CHECKS.map((c) => (
              <label key={c} className="flex items-center justify-between gap-3 text-sm">
                <span className={checks[c] ? '' : 'text-destructive'}>{c}</span>
                <Switch checked={!!checks[c]} onCheckedChange={(v) => setChecks((p) => ({ ...p, [c]: v }))} aria-label={c} />
              </label>
            ))}
            {form === 'toll' && (
              <Select value={expense} onValueChange={setExpense}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{['péage', 'parking', 'repas', 'lavage', 'autre'].map((x) => <SelectItem key={x} value={x}>{x[0].toUpperCase() + x.slice(1)}</SelectItem>)}</SelectContent>
              </Select>
            )}
            {(form === 'fuel' || form === 'adblue') && (
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1"><Label className="text-xs">Litres</Label><Input inputMode="decimal" value={liters} onChange={(e) => setLiters(e.target.value)} /></div>
                <div className="space-y-1"><Label className="text-xs">Montant (€ TTC)</Label><Input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
              </div>
            )}
            {form === 'toll' && <div className="space-y-1"><Label className="text-xs">Montant (€ TTC)</Label><Input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>}
            {form !== 'toll' && <div className="space-y-1"><Label className="text-xs">Kilométrage (facultatif)</Label><Input inputMode="numeric" value={odo} onChange={(e) => setOdo(e.target.value.replace(/\D/g, ''))} /></div>}
            {form === 'breakdown' && (
              <label className="flex items-center justify-between text-sm">Véhicule immobilisé<Switch checked={immobilized} onCheckedChange={setImmobilized} aria-label="Véhicule immobilisé" /></label>
            )}
            <div className="space-y-1">
              <Label className="text-xs">{form === 'breakdown' ? 'Que se passe-t-il ?' : form === 'checklist' ? (defects ? 'Précisez les défauts' : 'Commentaire (facultatif)') : 'Commentaire (facultatif)'}</Label>
              <Textarea rows={2} value={desc} onChange={(e) => setDesc(e.target.value)} maxLength={1000} />
            </div>
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed p-3 text-sm">
              <Camera className="h-5 w-5" /> {file ? file.name : form === 'breakdown' ? 'Photo de la panne' : 'Photo du ticket (facultatif)'}
              <input type="file" accept="image/*,application/pdf" capture="environment" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </label>
          </div>
          <DialogFooter><Button disabled={busy || !valid} onClick={() => void save()}>Enregistrer</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ───────────── Ma journée : heures, repas, découcher ───────────── */
function DayTab({ token, day, date, busy, run }: { token: string; day: Day; date: string; busy: boolean; run: Run }) {
  const [meals, setMeals] = useState(day.report?.meals ?? 0);
  const [overnight, setOvernight] = useState(day.report?.overnight ?? false);
  const [notes, setNotes] = useState(day.report?.notes ?? '');
  useEffect(() => { setMeals(day.report?.meals ?? 0); setOvernight(day.report?.overnight ?? false); setNotes(day.report?.notes ?? ''); }, [day.report, date]);
  const h = useMemo(() => computeDayHours(day.time), [day.time]);
  const rows: [string, string, typeof Sun][] = [
    ['Début', h.firstStart ? clockTime(h.firstStart) : '—', Sun],
    ['Fin', h.lastEnd ? clockTime(h.lastEnd) : h.open ? 'en service' : '—', Square],
    ['Amplitude', fmtMinutes(h.amplitude), Clock],
    ['Temps de travail', fmtMinutes(h.work), Truck],
    ['Coupures', fmtMinutes(h.breaks), Coffee],
    ['Heures de nuit (21 h – 6 h)', fmtMinutes(h.night), Moon],
  ];
  return (
    <>
      <section className="rounded-2xl border bg-card">
        <p className="border-b p-3 font-semibold capitalize">{new Date(`${date}T12:00:00`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        <ul className="divide-y text-sm">
          {rows.map(([label, value, Icon]) => (
            <li key={label} className="flex items-center justify-between p-3"><span className="flex items-center gap-2 text-muted-foreground"><Icon className="h-4 w-4" /> {label}</span><span className="font-medium">{value}</span></li>
          ))}
        </ul>
      </section>
      <section className="space-y-3 rounded-2xl border bg-card p-4">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-sm"><Utensils className="h-4 w-4" /> Repas pris en déplacement</span>
          <div className="flex items-center gap-2">
            <Button size="icon" variant="outline" onClick={() => setMeals((m) => Math.max(0, m - 1))} aria-label="Un repas de moins">−</Button>
            <span className="w-4 text-center font-semibold">{meals}</span>
            <Button size="icon" variant="outline" onClick={() => setMeals((m) => Math.min(3, m + 1))} aria-label="Un repas de plus">+</Button>
          </div>
        </div>
        <label className="flex items-center justify-between text-sm"><span className="flex items-center gap-2"><Moon className="h-4 w-4" /> Découcher (nuit hors domicile)</span><Switch checked={overnight} onCheckedChange={setOvernight} aria-label="Découcher" /></label>
        <div className="space-y-1"><Label className="text-xs">Remarque pour le bureau</Label><Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000} /></div>
        <Button className="w-full" disabled={busy} onClick={() => void run(() => call('driver_save_day', { p_token: token, p_date: date, p_meals: meals, p_overnight: overnight, p_notes: notes }), 'Journée enregistrée')}>Enregistrer ma journée</Button>
        <p className="text-xs text-muted-foreground">Ces informations servent à préparer votre fiche de paie. Vous pouvez corriger les 7 derniers jours.</p>
      </section>
    </>
  );
}
