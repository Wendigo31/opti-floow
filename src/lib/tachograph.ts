/**
 * Lecture des fichiers de carte conducteur de chronotachygraphe (.ddd, .C1B, .tgd, .esm),
 * format européen (règlement UE 2016/799, annexe IC). Fichier identique dans OptiFret et OptiFlow.
 *
 * Un téléchargement de carte est une suite de blocs : identifiant du fichier (2 octets),
 * genre (1 octet : 0 = données 1re génération, 1 = signature, 2 = données 2e génération,
 * 3 = signature 2e génération), longueur (2 octets), puis les données. On lit :
 *  - 0x0520 Identification : numéro de carte, nom et prénom du titulaire ;
 *  - 0x0504 Activités du conducteur : tampon circulaire d'enregistrements journaliers.
 */

export type Activity = 'rest' | 'availability' | 'work' | 'driving';

export interface ActivityChange {
  /** Minute de la journée (UTC) à laquelle l'activité commence. */
  minute: number;
  activity: Activity;
  /** Carte retirée du lecteur (activité saisie à la main ou inconnue). */
  cardOut: boolean;
  crew: boolean;
}

export interface TachoDay {
  /** Date du jour (AAAA-MM-JJ, UTC comme dans la carte). */
  date: string;
  distanceKm: number;
  /** Minutes par activité sur la journée. */
  minutes: Record<Activity, number>;
  /** Plus longue conduite sans pause de 45 min (ou 15 + 30). */
  longestContinuousDriving: number;
  changes: ActivityChange[];
}

export interface TachoCard {
  cardNumber: string | null;
  surname: string | null;
  firstNames: string | null;
  generation: 1 | 2;
  days: TachoDay[];
}

export interface TachoAlert {
  date: string;
  level: 'infraction' | 'warning';
  message: string;
}

const ACT: Activity[] = ['rest', 'availability', 'work', 'driving'];

function readBlocks(buf: Uint8Array): Map<string, Uint8Array> {
  const blocks = new Map<string, Uint8Array>();
  let i = 0;
  while (i + 5 <= buf.length) {
    const fid = (buf[i] << 8) | buf[i + 1];
    const kind = buf[i + 2];
    const len = (buf[i + 3] << 8) | buf[i + 4];
    if (i + 5 + len > buf.length) break;
    // On garde la 1re génération si elle existe, sinon la 2e (même structure pour ces fichiers).
    const key = `${fid.toString(16).padStart(4, '0')}:${kind}`;
    blocks.set(key, buf.subarray(i + 5, i + 5 + len));
    i += 5 + len;
  }
  return blocks;
}

function text(bytes: Uint8Array): string {
  // Le premier octet d'un « Name » est la page de codes ; le texte est en Latin-1.
  let s = '';
  for (const b of bytes) s += b >= 0x20 && b !== 0xff ? String.fromCharCode(b) : ' ';
  return s.replace(/\s+/g, ' ').trim();
}

function parseIdentification(data: Uint8Array) {
  // CardIdentification : nation (1), numéro de carte (16), autorité (1 + 35), dates (3 × 4),
  // puis DriverCardHolderIdentification : nom (1 + 35), prénoms (1 + 35), naissance, langue.
  const cardNumber = text(data.subarray(1, 17)) || null;
  const holder = 1 + 16 + 36 + 12;
  const surname = text(data.subarray(holder + 1, holder + 36)) || null;
  const firstNames = text(data.subarray(holder + 37, holder + 72)) || null;
  return { cardNumber, surname, firstNames };
}

function isoDate(seconds: number): string {
  return new Date(seconds * 1000).toISOString().slice(0, 10);
}

/** Lit le tampon circulaire des activités, du plus récent au plus ancien jour. */
function parseActivities(data: Uint8Array): TachoDay[] {
  if (data.length < 4) return [];
  const oldest = (data[0] << 8) | data[1];
  const newest = (data[2] << 8) | data[3];
  const ring = data.subarray(4);
  const size = ring.length;
  if (!size) return [];
  const at = (pos: number) => ring[((pos % size) + size) % size];
  const u16 = (pos: number) => (at(pos) << 8) | at(pos + 1);
  const u32 = (pos: number) => ((at(pos) << 24) >>> 0) + (at(pos + 1) << 16) + (at(pos + 2) << 8) + at(pos + 3);

  const days: TachoDay[] = [];
  let pos = newest;
  const seen = new Set<number>();
  for (let guard = 0; guard < 400 && !seen.has(pos); guard++) {
    seen.add(pos);
    const prevLen = u16(pos);
    const len = u16(pos + 2);
    if (len < 12 || len > size) break;
    const date = u32(pos + 4);
    const distance = u16(pos + 10);
    const changes: ActivityChange[] = [];
    for (let c = pos + 12; c + 1 < pos + len; c += 2) {
      const v = u16(c);
      changes.push({
        crew: ((v >> 14) & 1) === 1,
        cardOut: ((v >> 13) & 1) === 1,
        activity: ACT[(v >> 11) & 3],
        minute: v & 0x7ff,
      });
    }
    if (date > 0) days.push(summarizeDay(isoDate(date), distance, changes));
    if (pos === oldest || prevLen === 0) break;
    pos = pos - prevLen;
  }
  return days.sort((a, b) => a.date.localeCompare(b.date));
}

function summarizeDay(date: string, distanceKm: number, changes: ActivityChange[]): TachoDay {
  const minutes: Record<Activity, number> = { rest: 0, availability: 0, work: 0, driving: 0 };
  const sorted = [...changes].sort((a, b) => a.minute - b.minute);
  let continuous = 0;
  let longest = 0;
  let pendingBreak15 = false;
  for (let i = 0; i < sorted.length; i++) {
    const start = Math.min(sorted[i].minute, 1440);
    const end = Math.min(i + 1 < sorted.length ? sorted[i + 1].minute : 1440, 1440);
    const dur = Math.max(0, end - start);
    const a = sorted[i].activity;
    minutes[a] += dur;
    if (a === 'driving') {
      continuous += dur;
      longest = Math.max(longest, continuous);
    } else if (a === 'rest') {
      // Pause réglementaire : 45 min d'un coup, ou 15 min puis 30 min.
      if (dur >= 45 || (pendingBreak15 && dur >= 30)) {
        continuous = 0;
        pendingBreak15 = false;
      } else if (dur >= 15) {
        pendingBreak15 = true;
      }
    }
  }
  return { date, distanceKm, minutes, longestContinuousDriving: longest, changes: sorted };
}

/** Lit un fichier de carte conducteur. Lève une erreur si ce n'en est pas un. */
export function parseDriverCard(buffer: ArrayBuffer): TachoCard {
  const blocks = readBlocks(new Uint8Array(buffer));
  const ident = blocks.get('0520:0') ?? blocks.get('0520:2');
  const act1 = blocks.get('0504:0');
  const act2 = blocks.get('0504:2');
  const act = act1 ?? act2;
  if (!act) throw new Error("Ce fichier ne contient pas d'activités de carte conducteur (attendu : fichier .ddd de carte)");
  const id = ident ? parseIdentification(ident) : { cardNumber: null, surname: null, firstNames: null };
  return { ...id, generation: act1 ? 1 : 2, days: parseActivities(act) };
}

export const hm = (min: number) => `${Math.floor(min / 60)} h ${String(Math.round(min % 60)).padStart(2, '0')}`;

/**
 * Contrôles principaux du règlement (CE) 561/2006 :
 *  - conduite journalière ≤ 9 h (10 h deux fois par semaine) ;
 *  - conduite continue ≤ 4 h 30 sans pause de 45 min ;
 *  - conduite hebdomadaire ≤ 56 h, et ≤ 90 h sur deux semaines consécutives ;
 *  - repos journalier ≥ 11 h (9 h réduit, 3 fois entre deux repos hebdomadaires).
 * Les journées de la carte étant découpées à minuit, le repos journalier est estimé
 * sur la plus longue période de repos à cheval sur deux jours consécutifs.
 */
export function checkRules(days: TachoDay[]): TachoAlert[] {
  const alerts: TachoAlert[] = [];
  const weekKey = (d: string) => {
    const t = new Date(`${d}T00:00:00Z`);
    const day = (t.getUTCDay() + 6) % 7;
    t.setUTCDate(t.getUTCDate() - day);
    return t.toISOString().slice(0, 10);
  };
  const weeks = new Map<string, { driving: number; over9: string[] }>();
  for (const d of days) {
    const drv = d.minutes.driving;
    const w = weeks.get(weekKey(d.date)) ?? { driving: 0, over9: [] };
    w.driving += drv;
    if (drv > 9 * 60) w.over9.push(d.date);
    weeks.set(weekKey(d.date), w);
    if (drv > 10 * 60) alerts.push({ date: d.date, level: 'infraction', message: `Conduite journalière de ${hm(drv)} (maximum 10 h)` });
    if (d.longestContinuousDriving > 4.5 * 60) {
      alerts.push({ date: d.date, level: 'infraction', message: `Conduite continue de ${hm(d.longestContinuousDriving)} sans pause de 45 min (maximum 4 h 30)` });
    }
  }
  const sortedWeeks = [...weeks.entries()].sort(([a], [b]) => a.localeCompare(b));
  sortedWeeks.forEach(([week, w], i) => {
    if (w.over9.length > 2) alerts.push({ date: w.over9[2], level: 'infraction', message: `Plus de 2 journées de conduite au-delà de 9 h dans la semaine du ${week.split('-').reverse().join('/')}` });
    if (w.driving > 56 * 60) alerts.push({ date: week, level: 'infraction', message: `Conduite hebdomadaire de ${hm(w.driving)} (maximum 56 h)` });
    const prev = sortedWeeks[i - 1];
    if (prev && prev[1].driving + w.driving > 90 * 60) alerts.push({ date: week, level: 'infraction', message: `Conduite sur deux semaines de ${hm(prev[1].driving + w.driving)} (maximum 90 h)` });
  });
  for (let i = 1; i < days.length; i++) {
    const a = days[i - 1];
    const b = days[i];
    const gap = (Date.parse(b.date) - Date.parse(a.date)) / 86_400_000;
    if (gap !== 1) continue;
    const worked = (d: TachoDay) => d.minutes.driving + d.minutes.work > 0;
    if (!worked(a) || !worked(b)) continue;
    const tailRest = trailing(a, 'rest');
    const headRest = leading(b, 'rest');
    const rest = tailRest + headRest;
    if (rest < 9 * 60) alerts.push({ date: b.date, level: 'infraction', message: `Repos journalier de ${hm(rest)} entre le ${fr(a.date)} et le ${fr(b.date)} (minimum 9 h réduit, 11 h normal)` });
    else if (rest < 11 * 60) alerts.push({ date: b.date, level: 'warning', message: `Repos journalier réduit (${hm(rest)}) : 3 au maximum entre deux repos hebdomadaires` });
  }
  return alerts.sort((x, y) => x.date.localeCompare(y.date));
}

function trailing(d: TachoDay, act: Activity): number {
  let total = 0;
  for (let i = d.changes.length - 1; i >= 0; i--) {
    const end = i + 1 < d.changes.length ? d.changes[i + 1].minute : 1440;
    if (d.changes[i].activity !== act) break;
    total += end - d.changes[i].minute;
  }
  return total;
}

function leading(d: TachoDay, act: Activity): number {
  let total = 0;
  for (let i = 0; i < d.changes.length; i++) {
    const end = i + 1 < d.changes.length ? d.changes[i + 1].minute : 1440;
    if (d.changes[i].activity !== act) break;
    total += end - d.changes[i].minute;
  }
  return total;
}

const fr = (d: string) => d.split('-').reverse().join('/');
