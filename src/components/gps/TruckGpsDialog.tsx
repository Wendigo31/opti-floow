/**
 * GPS poids lourd intégré (nov. 2026).
 * Un clic depuis une ligne du planning, une tournée ou un itinéraire : le trajet camion
 * (gabarit du véhicule, ponts bas et routes interdites évités) est calculé depuis la position
 * du téléphone vers le chargement puis la livraison, avec guidage vocal, suivi de position,
 * recalcul en cas de sortie de route, et passage possible vers Sygic Truck ou HERE WeGo.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import {
  ArrowUp, ArrowUpLeft, ArrowUpRight, CornerUpLeft, CornerUpRight, Flag, Loader2, LocateFixed,
  Navigation, RotateCw, Truck, Volume2, VolumeX, X, ExternalLink, MapPin,
} from 'lucide-react';
import {
  cumulative, externalGpsLinks, formatDistance, formatDuration, haversine, nextStep, remainingFrom, snapToRoute,
  type GpsStep, type GpsStop, type LatLng,
} from '@/lib/truckGps';
import { cn } from '@/lib/utils';

export interface TruckSpecs {
  weight: number;
  height: number;
  length: number;
  width: number;
  axles: number;
}

const SEMI: TruckSpecs = { weight: 44000, height: 4, length: 16.5, width: 2.55, axles: 5 };

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Chargement, étapes, livraison — dans l'ordre. */
  stops: GpsStop[];
  title?: string;
  truck?: Partial<TruckSpecs> | null;
}

type Phase = 'idle' | 'locating' | 'routing' | 'guiding' | 'error' | 'arrived';

interface Route {
  line: LatLng[];
  cum: number[];
  steps: GpsStep[];
  durationS: number;
  /** Indice du point du tracé le plus proche de chaque arrêt restant. */
  stopIdx: number[];
}

async function geocode(address: string): Promise<LatLng | null> {
  const { data, error } = await supabase.functions.invoke('here-geocode', { body: { query: address } });
  if (error) return null;
  const pos = (data as { items?: { position?: { lat: number; lng: number } }[] })?.items?.[0]?.position;
  return pos ? [pos.lat, pos.lng] : null;
}

function speak(text: string) {
  try {
    if (!('speechSynthesis' in window) || !text) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'fr-FR';
    u.rate = 1;
    window.speechSynthesis.speak(u);
  } catch {
    /* synthèse vocale indisponible */
  }
}

function StepIcon({ step, className }: { step: GpsStep | null; className?: string }) {
  if (!step) return <Navigation className={className} />;
  if (step.action === 'arrive') return <Flag className={className} />;
  const d = step.direction ?? '';
  if (step.action === 'turn' && d === 'left') return <CornerUpLeft className={className} />;
  if (step.action === 'turn' && d === 'right') return <CornerUpRight className={className} />;
  if (d === 'left') return <ArrowUpLeft className={className} />;
  if (d === 'right') return <ArrowUpRight className={className} />;
  if (step.action.includes('roundabout')) return <RotateCw className={className} />;
  return <ArrowUp className={className} />;
}

export function TruckGpsDialog({ open, onOpenChange, stops, title, truck }: Props) {
  const specs = useMemo<TruckSpecs>(() => ({ ...SEMI, ...Object.fromEntries(Object.entries(truck ?? {}).filter(([, v]) => typeof v === 'number' && v > 0)) }), [truck]);
  const mapEl = useRef<HTMLDivElement | null>(null);
  const map = useRef<L.Map | null>(null);
  const layers = useRef<{ route?: L.Polyline; me?: L.CircleMarker; stops: L.Layer[] }>({ stops: [] });
  const watchId = useRef<number | null>(null);
  const wakeLock = useRef<{ release: () => Promise<void> } | null>(null);
  const hint = useRef(0);
  const offCount = useRef(0);
  const lastReroute = useRef(0);
  const announced = useRef<Set<string>>(new Set());

  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState('');
  const [route, setRoute] = useState<Route | null>(null);
  const [points, setPoints] = useState<{ label: string; pos: LatLng }[]>([]);
  const [target, setTarget] = useState(0); // arrêt visé (indice dans points)
  const [me, setMe] = useState<LatLng | null>(null);
  const [snap, setSnap] = useState<{ index: number; t: number; offRouteM: number } | null>(null);
  const [voice, setVoice] = useState(true);
  const [follow, setFollow] = useState(true);

  const destination = points[points.length - 1]?.pos ?? null;

  /** Calcule le trajet camion depuis `from` vers les arrêts restants. */
  const computeRoute = useCallback(async (from: LatLng | null, pts: { label: string; pos: LatLng }[], fromStop: number) => {
    const remaining = pts.slice(fromStop);
    const waypoints = [...(from ? [from] : []), ...remaining.map((p) => p.pos)].map(([lat, lon]) => ({ lat, lon }));
    if (waypoints.length < 2) throw new Error('Il faut au moins un départ et une arrivée.');
    const { data, error: err } = await supabase.functions.invoke('here-route', {
      body: {
        waypoints,
        transportMode: 'truck',
        withInstructions: true,
        vehicleWeight: specs.weight,
        vehicleHeight: specs.height,
        vehicleLength: specs.length,
        vehicleWidth: specs.width,
        vehicleAxles: specs.axles,
        vehicleAxleWeight: Math.min(11500, Math.round(specs.weight / specs.axles) + 1500),
      },
    });
    if (err || !data || (data as { error?: string }).error) throw new Error("Trajet camion introuvable pour ces adresses.");
    const d = data as { coordinates: LatLng[]; steps?: GpsStep[]; durationHours: number };
    if (!d.coordinates?.length) throw new Error('Trajet camion introuvable pour ces adresses.');
    const line = d.coordinates;
    const stopIdx = remaining.map((p) => snapToRoute(line, p.pos, 0, line.length).index);
    const r: Route = { line, cum: cumulative(line), steps: d.steps ?? [], durationS: (d.durationHours ?? 0) * 3600, stopIdx };
    hint.current = 0;
    announced.current = new Set();
    setRoute(r);
    return r;
  }, [specs]);

  // Démarrage : adresses → coordonnées, position du camion, trajet.
  const start = useCallback(async () => {
    setError('');
    setPhase('locating');
    try {
      const pts: { label: string; pos: LatLng }[] = [];
      for (const s of stops) {
        if (!s.address?.trim() && (s.lat == null || s.lon == null)) continue;
        const pos = s.lat != null && s.lon != null ? ([s.lat, s.lon] as LatLng) : await geocode(s.address);
        if (!pos) throw new Error(`Adresse introuvable : ${s.address}`);
        pts.push({ label: s.label, pos });
      }
      if (!pts.length) throw new Error('Aucune adresse de chargement ou de livraison sur cette ligne.');
      setPoints(pts);
      setTarget(0);
      const here = await new Promise<LatLng | null>((resolve) => {
        if (!('geolocation' in navigator)) return resolve(null);
        navigator.geolocation.getCurrentPosition(
          (p) => resolve([p.coords.latitude, p.coords.longitude]),
          () => resolve(null),
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 15000 },
        );
      });
      setMe(here);
      setPhase('routing');
      // Sans position (ordinateur, refus) : trajet du chargement à la livraison.
      const r = await computeRoute(here, pts, here ? 0 : 0);
      setPhase('guiding');
      if (voice && r.steps[0]) speak(r.steps[0].instruction);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Guidage impossible');
      setPhase('error');
    }
  }, [stops, computeRoute, voice]);

  // Ouverture / fermeture.
  useEffect(() => {
    if (!open) return;
    void start();
    if ('wakeLock' in navigator) {
      (navigator as unknown as { wakeLock: { request: (t: string) => Promise<{ release: () => Promise<void> }> } }).wakeLock
        .request('screen').then((w) => { wakeLock.current = w; }).catch(() => {});
    }
    return () => {
      if (watchId.current != null) navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
      void wakeLock.current?.release().catch(() => {});
      wakeLock.current = null;
      try { window.speechSynthesis?.cancel(); } catch { /* rien */ }
      map.current?.remove();
      map.current = null;
      layers.current = { stops: [] };
      setRoute(null);
      setPoints([]);
      setPhase('idle');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Carte.
  useEffect(() => {
    if (!open || !mapEl.current || map.current) return;
    const m = L.map(mapEl.current, { zoomControl: false, attributionControl: true }).setView([46.6, 2.4], 6);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(m);
    m.on('dragstart', () => setFollow(false));
    map.current = m;
    setTimeout(() => m.invalidateSize(), 200);
  });

  // Tracé et arrêts.
  useEffect(() => {
    const m = map.current;
    if (!m || !route) return;
    layers.current.route?.remove();
    layers.current.stops.forEach((l) => l.remove());
    layers.current.route = L.polyline(route.line, { color: '#2563eb', weight: 7, opacity: 0.85 }).addTo(m);
    layers.current.stops = points.map((p, i) =>
      L.circleMarker(p.pos, { radius: 9, color: '#fff', weight: 3, fillColor: i === points.length - 1 ? '#dc2626' : '#f59e0b', fillOpacity: 1 })
        .bindTooltip(p.label, { permanent: false })
        .addTo(m),
    );
    m.fitBounds(layers.current.route.getBounds(), { padding: [40, 40] });
  }, [route, points]);

  // Suivi de position.
  useEffect(() => {
    if (phase !== 'guiding' || !('geolocation' in navigator) || watchId.current != null) return;
    watchId.current = navigator.geolocation.watchPosition(
      (p) => setMe([p.coords.latitude, p.coords.longitude]),
      () => { /* signal perdu : on garde la dernière position */ },
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 20000 },
    );
  }, [phase]);

  // Chaque nouvelle position : place sur le tracé, annonces, arrivée, recalcul si sortie de route.
  useEffect(() => {
    if (!me || !route || phase !== 'guiding') return;
    const m = map.current;
    if (m) {
      if (!layers.current.me) {
        layers.current.me = L.circleMarker(me, { radius: 10, color: '#fff', weight: 3, fillColor: '#16a34a', fillOpacity: 1 }).addTo(m);
      } else layers.current.me.setLatLng(me);
      if (follow) m.setView(me, Math.max(m.getZoom(), 16), { animate: true });
    }
    const s = snapToRoute(route.line, me, hint.current);
    hint.current = s.index;
    setSnap(s);

    // Arrivée à un arrêt (chargement, étape, livraison).
    const stop = points[target];
    if (stop && haversine(me, stop.pos) < 60) {
      const last = target === points.length - 1;
      if (voice) speak(last ? `Vous êtes arrivé : ${stop.label}` : `Arrivé : ${stop.label}`);
      if (last) setPhase('arrived');
      else setTarget(target + 1);
      return;
    }

    // Sortie de route : 3 positions de suite à plus de 60 m → nouveau trajet (au plus toutes les 20 s).
    offCount.current = s.offRouteM > 60 ? offCount.current + 1 : 0;
    if (offCount.current >= 3 && Date.now() - lastReroute.current > 20000) {
      offCount.current = 0;
      lastReroute.current = Date.now();
      if (voice) speak('Recalcul de l’itinéraire');
      void computeRoute(me, points, target).catch(() => {});
      return;
    }

    // Annonces vocales à 500 m et 100 m de la manœuvre.
    const n = nextStep(route.steps, route.cum, s.index, s.t);
    if (voice && n.step) {
      const key = `${n.step.index}`;
      if (n.distanceM < 120 && !announced.current.has(key + 'n')) {
        announced.current.add(key + 'n');
        speak(n.step.instruction);
      } else if (n.distanceM < 520 && n.distanceM > 300 && !announced.current.has(key + 'f')) {
        announced.current.add(key + 'f');
        speak(`Dans ${formatDistance(n.distanceM)}, ${n.step.instruction.charAt(0).toLowerCase()}${n.step.instruction.slice(1)}`);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me]);

  const guidance = route && snap ? nextStep(route.steps, route.cum, snap.index, snap.t) : null;
  const remaining = route ? (snap ? remainingFrom(route.cum, snap.index, snap.t) : route.cum[route.cum.length - 1] ?? 0) : 0;
  const total = route?.cum[route.cum.length - 1] ?? 0;
  const remainingS = route && total > 0 ? route.durationS * (remaining / total) : 0;
  const eta = remainingS ? new Date(Date.now() + remainingS * 1000).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : null;
  const currentStep = guidance?.step ?? route?.steps[0] ?? null;
  const links = destination ? externalGpsLinks(points[target]?.pos ?? destination) : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="z-[200] max-w-none w-screen h-[100dvh] sm:h-[100dvh] p-0 gap-0 border-0 rounded-none sm:rounded-none flex flex-col overflow-hidden [&>button]:hidden">
        <DialogTitle className="sr-only">GPS poids lourd{title ? ` — ${title}` : ''}</DialogTitle>
        <DialogDescription className="sr-only">Guidage camion vers le chargement et la livraison</DialogDescription>

        {/* Bandeau de guidage */}
        <div className="bg-primary text-primary-foreground px-4 py-3 flex items-center gap-3 shrink-0">
          <StepIcon step={currentStep} className="w-10 h-10 shrink-0" />
          <div className="min-w-0 flex-1">
            {phase === 'guiding' && currentStep ? (
              <>
                <p className="text-2xl font-bold leading-tight">{guidance ? formatDistance(guidance.distanceM) : ''}</p>
                <p className="text-base leading-snug line-clamp-2">{currentStep.instruction}</p>
              </>
            ) : phase === 'arrived' ? (
              <p className="text-xl font-bold">Arrivé : {points[points.length - 1]?.label}</p>
            ) : phase === 'error' ? (
              <p className="text-base font-medium">{error}</p>
            ) : (
              <p className="text-base font-medium flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                {phase === 'locating' ? 'Localisation du camion…' : 'Calcul du trajet poids lourd…'}
              </p>
            )}
          </div>
          <Button size="icon" variant="ghost" className="text-primary-foreground hover:bg-white/15 shrink-0" onClick={() => onOpenChange(false)} aria-label="Quitter le guidage">
            <X className="w-6 h-6" />
          </Button>
        </div>

        {/* Carte */}
        <div className="relative flex-1 min-h-0">
          <div ref={mapEl} className="absolute inset-0 z-0" />
          <div className="absolute right-3 top-3 z-[400] flex flex-col gap-2">
            <Button size="icon" variant="secondary" className="shadow-lg" onClick={() => setVoice((v) => !v)} aria-label={voice ? 'Couper la voix' : 'Activer la voix'}>
              {voice ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </Button>
            <Button size="icon" variant="secondary" className={cn('shadow-lg', follow && 'ring-2 ring-primary')} onClick={() => { setFollow(true); if (me) map.current?.setView(me, 17); }} aria-label="Recentrer sur le camion">
              <LocateFixed className="w-5 h-5" />
            </Button>
          </div>
          {phase === 'error' && (
            <div className="absolute inset-x-3 bottom-3 z-[400] rounded-xl bg-card p-4 shadow-xl space-y-3">
              <p className="text-sm">{error}</p>
              <Button onClick={() => void start()} className="gap-2"><RotateCw className="w-4 h-4" /> Réessayer</Button>
            </div>
          )}
        </div>

        {/* Pied : arrêts, temps restant, autres GPS */}
        <div className="shrink-0 border-t bg-card px-4 py-3 space-y-2">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            <span className="flex items-center gap-1.5 font-medium"><Truck className="w-4 h-4 text-primary" /> {Math.round(specs.weight / 1000)} t · h {specs.height.toLocaleString('fr-FR')} m</span>
            {route && <span><strong>{formatDistance(remaining)}</strong> restants</span>}
            {remainingS > 0 && <span><strong>{formatDuration(remainingS)}</strong>{eta ? ` · arrivée ${eta}` : ''}</span>}
            {points[target] && phase === 'guiding' && (
              <span className="flex items-center gap-1 text-muted-foreground"><MapPin className="w-4 h-4" /> Vers : {points[target].label}</span>
            )}
            {!me && phase === 'guiding' && <span className="text-amber-600">Position du téléphone indisponible : trajet affiché du premier arrêt au dernier.</span>}
          </div>
          {links.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {links.map((l) => (
                <Button key={l.label} asChild size="sm" variant={l.truck ? 'outline' : 'ghost'} className="gap-1.5">
                  <a href={l.href} target="_blank" rel="noreferrer"><ExternalLink className="w-3.5 h-3.5" /> {l.label}</a>
                </Button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
