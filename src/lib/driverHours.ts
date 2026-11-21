/**
 * Heures d'un conducteur à partir de ses pointages (appli conducteur OptiFlow) :
 * amplitude, temps de travail (coupures déduites), coupures, heures de nuit
 * (entre 21 h et 6 h, heure de Paris).
 */
export type ClockKind = 'start' | 'break_start' | 'break_end' | 'end';
export interface ClockEntry { kind: ClockKind; at: string }

export interface DayHours {
  firstStart: string | null;
  lastEnd: string | null;
  /** Minutes entre la première prise et la dernière fin (ou maintenant si en cours). */
  amplitude: number;
  work: number;
  breaks: number;
  night: number;
  open: boolean;
  onBreak: boolean;
}

const NIGHT_START = 21 * 60;
const NIGHT_END = 6 * 60;

/** Minute de la journée (0–1439) à Paris. */
function parisMinute(d: Date): number {
  const p = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(d);
  const h = Number(p.find((x) => x.type === 'hour')?.value ?? 0);
  const m = Number(p.find((x) => x.type === 'minute')?.value ?? 0);
  return h * 60 + m;
}

/** Minutes de nuit (21 h – 6 h) dans un intervalle, minute par minute groupée. */
export function nightMinutes(from: Date, to: Date): number {
  let n = 0;
  for (let t = from.getTime(); t < to.getTime(); t += 60_000) {
    const m = parisMinute(new Date(t));
    if (m >= NIGHT_START || m < NIGHT_END) n++;
  }
  return n;
}

export function computeDayHours(entries: ClockEntry[], now: Date = new Date()): DayHours {
  const list = [...entries].sort((a, b) => a.at.localeCompare(b.at));
  let work = 0, breaks = 0, night = 0;
  let workFrom: Date | null = null;
  let breakFrom: Date | null = null;
  let firstStart: string | null = null;
  let lastEnd: string | null = null;
  const closeWork = (to: Date) => {
    if (workFrom) {
      work += Math.max(0, Math.round((to.getTime() - workFrom.getTime()) / 60_000));
      night += nightMinutes(workFrom, to);
      workFrom = null;
    }
  };
  for (const e of list) {
    const at = new Date(e.at);
    if (e.kind === 'start') { firstStart ??= e.at; workFrom = at; breakFrom = null; }
    else if (e.kind === 'break_start') { closeWork(at); breakFrom = at; }
    else if (e.kind === 'break_end') {
      if (breakFrom) breaks += Math.max(0, Math.round((at.getTime() - breakFrom.getTime()) / 60_000));
      breakFrom = null; workFrom = at;
    } else if (e.kind === 'end') {
      if (breakFrom) { breaks += Math.max(0, Math.round((at.getTime() - breakFrom.getTime()) / 60_000)); breakFrom = null; }
      closeWork(at); lastEnd = e.at;
    }
  }
  const last = list[list.length - 1]?.kind;
  const open = !!last && last !== 'end';
  const onBreak = last === 'break_start';
  if (open) {
    if (workFrom) closeWork(now);
    if (breakFrom) breaks += Math.max(0, Math.round((now.getTime() - (breakFrom as Date).getTime()) / 60_000));
  }
  const ampEnd = open ? now : lastEnd ? new Date(lastEnd) : null;
  const amplitude = firstStart && ampEnd ? Math.max(0, Math.round((ampEnd.getTime() - new Date(firstStart).getTime()) / 60_000)) : 0;
  return { firstStart, lastEnd, amplitude, work, breaks, night, open, onBreak };
}

export const fmtMinutes = (m: number) => `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')}`;
