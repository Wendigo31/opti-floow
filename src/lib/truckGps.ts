/**
 * GPS poids lourd intégré (nov. 2026) : calculs purs utilisés par TruckGpsDialog.
 * Tracé et manœuvres viennent du calcul d'itinéraire camion (fonction here-route,
 * gabarit du véhicule) ; ici : distances, position sur le tracé, sortie de route,
 * prochaine manœuvre, liens vers les applications GPS poids lourd.
 */
export type LatLng = [number, number];

export interface GpsStep {
  instruction: string;
  action: string;
  direction?: string;
  lengthM: number;
  durationS: number;
  /** Indice du point du tracé où se fait la manœuvre. */
  index: number;
}

export interface GpsStop {
  label: string;
  address: string;
  lat?: number | null;
  lon?: number | null;
}

const R = 6371000;
const rad = (d: number) => (d * Math.PI) / 180;

/** Distance à vol d'oiseau en mètres. */
export function haversine(a: LatLng, b: LatLng): number {
  const dLat = rad(b[0] - a[0]);
  const dLon = rad(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Distance cumulée depuis le départ pour chaque point du tracé. */
export function cumulative(line: LatLng[]): number[] {
  const out = new Array<number>(line.length).fill(0);
  for (let i = 1; i < line.length; i++) out[i] = out[i - 1] + haversine(line[i - 1], line[i]);
  return out;
}

/** Distance (m) d'un point à un segment, en projection locale (suffisant à l'échelle d'une rue). */
function pointToSegment(p: LatLng, a: LatLng, b: LatLng): { d: number; t: number } {
  const k = Math.cos(rad(p[0]));
  const ax = a[1] * k, ay = a[0], bx = b[1] * k, by = b[0], px = p[1] * k, py = p[0];
  const dx = bx - ax, dy = by - ay;
  const len2 = dx * dx + dy * dy;
  const t = len2 > 0 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2)) : 0;
  const q: LatLng = [ay + t * dy, (ax + t * dx) / k];
  return { d: haversine(p, q), t };
}

/**
 * Position sur le tracé : segment le plus proche (cherché autour de la dernière position
 * connue pour rester rapide et ne pas « sauter » sur une autre portion du trajet).
 */
export function snapToRoute(line: LatLng[], p: LatLng, hint = 0, window = 400): { index: number; t: number; offRouteM: number } {
  if (line.length < 2) return { index: 0, t: 0, offRouteM: line.length ? haversine(p, line[0]) : Infinity };
  const from = Math.max(0, hint - 20);
  const to = Math.min(line.length - 1, hint + window);
  let best = { index: from, t: 0, offRouteM: Infinity };
  const scan = (lo: number, hi: number) => {
    for (let i = lo; i < hi; i++) {
      const { d, t } = pointToSegment(p, line[i], line[i + 1]);
      if (d < best.offRouteM) best = { index: i, t, offRouteM: d };
    }
  };
  scan(from, to);
  if (best.offRouteM > 150) scan(0, line.length - 1); // perdu : on cherche sur tout le tracé
  return best;
}

/** Distance restante (m) jusqu'à la fin du tracé depuis une position projetée. */
export function remainingFrom(cum: number[], index: number, t: number): number {
  if (!cum.length) return 0;
  const i = Math.min(index, cum.length - 1);
  const seg = i + 1 < cum.length ? cum[i + 1] - cum[i] : 0;
  return Math.max(0, cum[cum.length - 1] - (cum[i] + seg * t));
}

/** Prochaine manœuvre après la position, et distance pour l'atteindre. */
export function nextStep(steps: GpsStep[], cum: number[], index: number, t: number): { step: GpsStep | null; distanceM: number; following: GpsStep | null } {
  const pos = cum.length ? cum[Math.min(index, cum.length - 1)] + (index + 1 < cum.length ? (cum[index + 1] - cum[index]) * t : 0) : 0;
  const i = steps.findIndex((s) => s.index > index || (s.index === index && t < 0.5));
  if (i < 0) return { step: null, distanceM: 0, following: null };
  const s = steps[i];
  return { step: s, distanceM: Math.max(0, (cum[Math.min(s.index, cum.length - 1)] ?? 0) - pos), following: steps[i + 1] ?? null };
}

export function formatDistance(m: number): string {
  if (m >= 10000) return `${Math.round(m / 1000)} km`;
  if (m >= 1000) return `${(Math.round(m / 100) / 10).toLocaleString('fr-FR')} km`;
  if (m >= 100) return `${Math.round(m / 50) * 50} m`;
  return `${Math.max(0, Math.round(m / 10) * 10)} m`;
}

export function formatDuration(s: number): string {
  const min = Math.round(s / 60);
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  return `${h} h ${String(min % 60).padStart(2, '0')}`;
}

/** Liens pour continuer dans une application GPS poids lourd installée sur le téléphone. */
export function externalGpsLinks(dest: LatLng): { label: string; href: string; truck: boolean }[] {
  const [lat, lon] = dest;
  return [
    { label: 'Sygic Truck', href: `com.sygic.aura://coordinate|${lon}|${lat}|drive`, truck: true },
    { label: 'HERE WeGo (profil camion)', href: `https://share.here.com/r/${lat},${lon}`, truck: true },
    { label: 'Google Maps (sans profil camion)', href: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}&travelmode=driving`, truck: false },
  ];
}
