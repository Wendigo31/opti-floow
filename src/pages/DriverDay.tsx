import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, ChevronLeft, ChevronRight, Clock, Loader2, MapPin, Navigation, Play, RefreshCw, Truck, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';

interface Tour {
  id: string;
  name: string;
  status: 'planned' | 'in_progress' | 'completed';
  start: string | null;
  end: string | null;
  origin: string | null;
  destination: string | null;
  stops: { address: string; label?: string }[];
  mission_order: string | null;
  notes: string | null;
  relay: boolean;
  relay_location: string | null;
  relay_time: string | null;
  client: string | null;
  client_id: string | null;
}
interface Day { driver: string | null; company: string | null; date: string; tours: Tour[] }

const rpc = (fn: string, args: Record<string, unknown>) =>
  (supabase as unknown as { rpc: (f: string, a: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }> }).rpc(fn, args);
const iso = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const hm = (t?: string | null) => (t ? t.slice(0, 5).replace(':', 'h') : '');
const STATUS: Record<Tour['status'], { label: string; cls: string }> = {
  planned: { label: 'À faire', cls: 'bg-muted text-muted-foreground' },
  in_progress: { label: 'En cours', cls: 'bg-sky-500/15 text-sky-700' },
  completed: { label: 'Terminée', cls: 'bg-emerald-500/15 text-emerald-700' },
};

/**
 * Application conducteur OptiFlow (/conducteur?token=…) : page mobile ouverte
 * par le lien personnel du conducteur. Tournées du jour, démarrer / terminer,
 * remarque et palettes échangées. Aucune connexion requise.
 */
export default function DriverDay() {
  const token = new URLSearchParams(window.location.search).get('token') ?? '';
  const [date, setDate] = useState(() => iso(new Date()));
  const [day, setDay] = useState<Day | null>(null);
  const [state, setState] = useState<'loading' | 'ok' | 'invalid'>('loading');
  const [finishing, setFinishing] = useState<Tour | null>(null);
  const [note, setNote] = useState('');
  const [given, setGiven] = useState('');
  const [returned, setReturned] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await rpc('driver_day', { p_token: token, p_date: date });
    if (error || !data) {
      setState('invalid');
      return;
    }
    setDay(data as Day);
    setState('ok');
  }, [token, date]);

  useEffect(() => {
    void load();
    const t = setInterval(load, 120_000);
    return () => clearInterval(t);
  }, [load]);

  const update = async (tour: Tour, status: 'in_progress' | 'completed', extra: { note?: string; given?: number; returned?: number } = {}) => {
    setBusy(true);
    const { error } = await rpc('driver_update_tour', {
      p_token: token, p_entry: tour.id, p_status: status, p_note: extra.note ?? null,
      p_pallets_given: extra.given ?? 0, p_pallets_returned: extra.returned ?? 0,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return false;
    }
    toast.success(status === 'completed' ? 'Tournée terminée, merci !' : 'Tournée démarrée');
    await load();
    return true;
  };

  const shift = (n: number) => {
    const d = new Date(`${date}T12:00:00`);
    d.setDate(d.getDate() + n);
    setDate(iso(d));
  };

  if (state === 'loading') return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (state === 'invalid' || !day) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
        <div className="max-w-sm rounded-2xl border bg-card p-6 text-center">
          <XCircle className="mx-auto h-8 w-8 text-muted-foreground" />
          <h1 className="mt-3 font-semibold">Lien conducteur invalide</h1>
          <p className="mt-1 text-sm text-muted-foreground">Ce lien a été remplacé ou n'existe pas. Demandez un nouveau lien à votre exploitation.</p>
        </div>
      </div>
    );
  }

  const isToday = date === iso(new Date());
  const label = new Date(`${date}T00:00:00`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="min-h-screen bg-muted/30 pb-10">
      <header className="sticky top-0 z-10 border-b bg-card/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-md items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate font-semibold">{day.driver || 'Conducteur'}</p>
            <p className="truncate text-xs text-muted-foreground">{day.company}</p>
          </div>
          <Button size="icon" variant="ghost" onClick={() => void load()} aria-label="Actualiser"><RefreshCw className="h-4 w-4" /></Button>
        </div>
      </header>

      <main className="mx-auto max-w-md space-y-4 px-4 pt-4">
        <div className="flex items-center justify-between rounded-xl border bg-card p-2">
          <Button size="icon" variant="ghost" onClick={() => shift(-1)} aria-label="Jour précédent"><ChevronLeft className="h-5 w-5" /></Button>
          <div className="text-center">
            <p className="font-medium capitalize">{label}</p>
            {!isToday && <button type="button" className="text-xs text-primary" onClick={() => setDate(iso(new Date()))}>Revenir à aujourd'hui</button>}
          </div>
          <Button size="icon" variant="ghost" onClick={() => shift(1)} aria-label="Jour suivant"><ChevronRight className="h-5 w-5" /></Button>
        </div>

        {!day.tours.length && <p className="rounded-xl border bg-card p-6 text-center text-sm text-muted-foreground">Aucune tournée prévue ce jour-là.</p>}

        {day.tours.map((t) => {
          const route = [t.origin, ...t.stops.map((s) => s.address), t.destination].filter(Boolean) as string[];
          const maps = route.length >= 2
            ? `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(route[0])}&destination=${encodeURIComponent(route[route.length - 1])}${route.length > 2 ? `&waypoints=${encodeURIComponent(route.slice(1, -1).join('|'))}` : ''}&travelmode=driving`
            : null;
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
              <div className="flex flex-wrap gap-2">
                {maps && <Button asChild variant="outline" className="gap-2"><a href={maps} target="_blank" rel="noreferrer"><Navigation className="h-4 w-4" /> Itinéraire</a></Button>}
                {t.status === 'planned' && <Button className="gap-2" onClick={() => void update(t, 'in_progress')} disabled={busy}><Play className="h-4 w-4" /> Démarrer</Button>}
                {t.status !== 'completed' && (
                  <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700" onClick={() => { setFinishing(t); setNote(''); setGiven(''); setReturned(''); }} disabled={busy}>
                    <CheckCircle2 className="h-4 w-4" /> Terminer
                  </Button>
                )}
              </div>

              {finishing?.id === t.id && (
                <div className="space-y-3 rounded-xl border p-3">
                  <p className="flex items-center gap-2 text-sm font-medium"><Truck className="h-4 w-4" /> Fin de tournée</p>
                  {t.client_id && (
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1"><Label htmlFor={`g-${t.id}`} className="text-xs">Palettes laissées</Label><Input id={`g-${t.id}`} inputMode="numeric" value={given} onChange={(e) => setGiven(e.target.value.replace(/\D/g, ''))} placeholder="0" /></div>
                      <div className="space-y-1"><Label htmlFor={`r-${t.id}`} className="text-xs">Palettes récupérées</Label><Input id={`r-${t.id}`} inputMode="numeric" value={returned} onChange={(e) => setReturned(e.target.value.replace(/\D/g, ''))} placeholder="0" /></div>
                    </div>
                  )}
                  <div className="space-y-1"><Label htmlFor={`n-${t.id}`} className="text-xs">Remarque (retard, incident, réserve…)</Label><Textarea id={`n-${t.id}`} rows={2} value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} /></div>
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" onClick={() => setFinishing(null)}>Annuler</Button>
                    <Button
                      className="bg-emerald-600 hover:bg-emerald-700"
                      disabled={busy}
                      onClick={() => void update(t, 'completed', { note, given: Number(given) || 0, returned: Number(returned) || 0 }).then((ok) => ok && setFinishing(null))}
                    >
                      {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Valider la fin
                    </Button>
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </main>
    </div>
  );
}
