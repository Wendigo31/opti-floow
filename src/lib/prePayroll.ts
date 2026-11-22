/**
 * Pré-paie d'un conducteur à partir des activités de sa carte de chronotachygraphe.
 * Fichier identique dans OptiFret et OptiFlow.
 *
 * - Temps de service = conduite + autres tâches + disponibilité (attente, double
 *   équipage). Le repos et les pauses n'en font pas partie.
 * - Les activités de la carte sont en heure UTC : tout est remis à l'heure de Paris.
 * - Une « journée de service » va d'une prise de service à la suivante séparée par
 *   un repos d'au moins 7 h. Elle est rattachée au jour (heure de Paris) où elle commence.
 * - Repas (protocole du 30 avril 1974, art. 3) : un repas par période 11 h 45 – 14 h 15
 *   et 18 h 45 – 21 h 15 entièrement couverte par l'amplitude de la journée.
 * - Repas unique « nuit » (art. 12) : au moins 4 h de service entre 22 h et 7 h, sans repas.
 * - Casse-croûte (art. 5) : prise de service avant 5 h.
 * - Heures de nuit : temps de service entre 21 h et 6 h.
 * Les indemnités ne sont dues que si le conducteur est en déplacement : ce sont des
 * propositions, que l'exploitation confirme. Les découchers ne se lisent pas sur la
 * carte (pas de lieu) : ils sont saisis à la main.
 */
import type { Activity, TachoDay } from './tachograph';
import { splitServiceHours, type DriverCategory } from './driverContract';

const TZ = 'Europe/Paris';
const MIN = 60_000;
const SERVICE: Activity[] = ['driving', 'work', 'availability'];

const fmt = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', weekday: 'short', hourCycle: 'h23' });

interface LocalTime { date: string; minute: number; sunday: boolean }
function local(ts: number): LocalTime {
  const p: Record<string, string> = {};
  for (const x of fmt.formatToParts(new Date(ts))) p[x.type] = x.value;
  return { date: `${p.year}-${p.month}-${p.day}`, minute: Number(p.hour) * 60 + Number(p.minute), sunday: p.weekday === 'Sun' };
}

interface Segment { start: number; end: number; activity: Activity }

/** Segments d'activité continus (horodatage en ms), jours de la carte bout à bout. */
export function toSegments(days: TachoDay[]): Segment[] {
  const out: Segment[] = [];
  for (const d of [...days].sort((a, b) => a.date.localeCompare(b.date))) {
    const base = Date.parse(`${d.date}T00:00:00Z`);
    d.changes.forEach((c, i) => {
      const end = i + 1 < d.changes.length ? d.changes[i + 1].minute : 1440;
      if (end <= c.minute) return;
      const seg = { start: base + c.minute * MIN, end: base + end * MIN, activity: c.activity };
      const last = out[out.length - 1];
      if (last && last.activity === seg.activity && last.end === seg.start) last.end = seg.end;
      else out.push(seg);
    });
  }
  return out;
}

export interface ServiceDay {
  /** Jour de prise de service (heure de Paris). */
  date: string;
  start: string;
  end: string;
  serviceMin: number;
  drivingMin: number;
  nightMin: number;
  sundayMin: number;
  meals: number;
  nightMeal: boolean;
  casseCroute: boolean;
}

export interface PrePayroll {
  month: string;
  category: DriverCategory;
  days: ServiceDay[];
  serviceHours: number;
  drivingHours: number;
  normal: number;
  equivalence25: number;
  overtime25: number;
  overtime50: number;
  nightHours: number;
  sundayHours: number;
  meals: number;
  nightMeals: number;
  casseCroutes: number;
}

const hhmm = (m: number) => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
const r2 = (n: number) => Math.round(n * 100) / 100;

/** Découpe les segments en journées de service (repos d'au moins 7 h entre deux). */
function shifts(segments: Segment[]): Segment[][] {
  const groups: Segment[][] = [];
  let cur: Segment[] = [];
  let lastServiceEnd = -Infinity;
  for (const s of segments) {
    if (!SERVICE.includes(s.activity)) continue;
    if (cur.length && s.start - lastServiceEnd >= 7 * 60 * MIN) { groups.push(cur); cur = []; }
    cur.push(s);
    lastServiceEnd = s.end;
  }
  if (cur.length) groups.push(cur);
  return groups;
}

/** Minutes de [a, b[ (minutes locales depuis le début de la journée de service) dans la plage horaire [from, to[ répétée chaque jour. */
function minutesInWindow(a: number, b: number, from: number, to: number): number {
  let total = 0;
  for (let day = Math.floor(a / 1440) * 1440; day < b; day += 1440) {
    const ranges = from < to ? [[day + from, day + to]] : [[day, day + to], [day + from, day + 1440]];
    for (const [x, y] of ranges) total += Math.max(0, Math.min(b, y) - Math.max(a, x));
  }
  return total;
}

export function computePrePayroll(days: TachoDay[], month: string, category: DriverCategory): PrePayroll {
  const result: ServiceDay[] = [];
  for (const group of shifts(toSegments(days))) {
    const first = local(group[0].start);
    if (!first.date.startsWith(month)) continue;
    // Minutes locales comptées depuis le minuit (heure de Paris) du jour de prise de service.
    const dayStartTs = group[0].start - first.minute * MIN;
    const rel = (ts: number) => Math.round((ts - dayStartTs) / MIN);
    let serviceMin = 0, drivingMin = 0, nightMin = 0, sundayMin = 0, lateNight = 0;
    for (const s of group) {
      const a = rel(s.start), b = rel(s.end);
      serviceMin += b - a;
      if (s.activity === 'driving') drivingMin += b - a;
      nightMin += minutesInWindow(a, b, 21 * 60, 6 * 60);
      lateNight += minutesInWindow(a, b, 22 * 60, 7 * 60);
      // Dimanche : on suit l'heure de Paris minute par tranche d'une heure (assez précis pour la paie).
      for (let t = s.start; t < s.end; t += 60 * MIN) {
        const slice = Math.min(60 * MIN, s.end - t) / MIN;
        if (local(t).sunday) sundayMin += slice;
      }
    }
    const startMin = rel(group[0].start);
    const endMin = rel(group[group.length - 1].end);
    const covers = (from: number, to: number) => [0, 1440, 2880].some((d) => startMin <= d + from && endMin >= d + to);
    const meals = (covers(11 * 60 + 45, 14 * 60 + 15) ? 1 : 0) + (covers(18 * 60 + 45, 21 * 60 + 15) ? 1 : 0);
    const nightMeal = meals === 0 && lateNight >= 4 * 60;
    result.push({
      date: first.date,
      start: hhmm(startMin),
      end: hhmm(endMin),
      serviceMin,
      drivingMin,
      nightMin,
      sundayMin: Math.round(sundayMin),
      meals,
      nightMeal,
      casseCroute: startMin < 5 * 60,
    });
  }
  const sum = (f: (d: ServiceDay) => number) => result.reduce((a, d) => a + f(d), 0);
  const serviceHours = r2(sum((d) => d.serviceMin) / 60);
  return {
    month,
    category,
    days: result,
    serviceHours,
    drivingHours: r2(sum((d) => d.drivingMin) / 60),
    ...splitServiceHours(serviceHours, category),
    nightHours: r2(sum((d) => d.nightMin) / 60),
    sundayHours: r2(sum((d) => d.sundayMin) / 60),
    meals: sum((d) => d.meals),
    nightMeals: sum((d) => (d.nightMeal ? 1 : 0)),
    casseCroutes: sum((d) => (d.casseCroute ? 1 : 0)),
  };
}
