/**
 * Relevés de chronotachygraphe enregistrés (table tacho_days). Fichier identique dans OptiFret et OptiFlow.
 */
import { supabase } from '@/integrations/supabase/client';
import type { Activity, TachoCard, TachoDay } from './tachograph';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = () => supabase as any;

export interface TachoRow {
  id: string;
  driver_id: string | null;
  driver_name: string | null;
  card_number: string;
  day: string;
  distance_km: number;
  minutes: Record<Activity, number>;
  changes: TachoDay['changes'];
  longest_continuous: number;
  source: string | null;
}

export const rowToDay = (r: TachoRow): TachoDay => ({
  date: r.day,
  distanceKm: r.distance_km,
  minutes: r.minutes,
  longestContinuousDriving: r.longest_continuous,
  changes: r.changes,
});

/** Clé d'un conducteur : sa fiche si elle est rattachée, sinon sa carte. */
export const driverKey = (r: Pick<TachoRow, 'driver_id' | 'card_number'>) => r.driver_id || `card:${r.card_number}`;

const shift = (iso: string, days: number) => new Date(Date.parse(`${iso}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);

/** Journées d'un mois (AAAA-MM), avec un jour de marge de chaque côté pour les services de nuit. */
export async function loadTachoMonth(licenseId: string, month: string, driverId?: string | null): Promise<TachoRow[]> {
  const first = `${month}-01`;
  const next = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 1)).toISOString().slice(0, 10);
  const query = () => {
    const q = db().from('tacho_days').select('*').eq('license_id', licenseId).gte('day', shift(first, -1)).lte('day', next).order('day').order('card_number');
    return driverId ? q.eq('driver_id', driverId) : q;
  };
  const rows: TachoRow[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await query().range(from, from + 999);
    if (error) throw new Error(error.message);
    rows.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  return rows;
}

/** Enregistre (ou remplace) les journées d'une carte, rattachées à un conducteur. */
export async function saveTachoCard(licenseId: string, card: TachoCard, driver: { id: string; name: string } | null, source: string): Promise<number> {
  const cardNumber = card.cardNumber || `SANS-NUMERO-${(card.surname || 'X').toUpperCase()}`;
  const rows = card.days.map((d) => ({
    license_id: licenseId,
    driver_id: driver?.id ?? null,
    driver_name: driver?.name ?? ([card.firstNames, card.surname].filter(Boolean).join(' ') || null),
    card_number: cardNumber,
    day: d.date,
    distance_km: Math.round(d.distanceKm || 0),
    minutes: d.minutes,
    changes: d.changes,
    longest_continuous: d.longestContinuousDriving,
    source,
  }));
  for (let i = 0; i < rows.length; i += 200) {
    const { error } = await db().from('tacho_days').upsert(rows.slice(i, i + 200), { onConflict: 'license_id,card_number,day' });
    if (error) throw new Error(error.message);
  }
  return rows.length;
}

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z ]/g, ' ').split(/\s+/).filter(Boolean);

/** Retrouve la fiche du conducteur à partir du nom inscrit sur la carte. */
export function matchDriver<T extends { id: string; name: string }>(card: Pick<TachoCard, 'surname' | 'firstNames'>, drivers: T[]): T | null {
  const surname = norm(card.surname || '');
  if (!surname.length) return null;
  const first = norm(card.firstNames || '')[0];
  const hits = drivers.filter((d) => { const n = norm(d.name); return surname.every((w) => n.includes(w)); });
  if (hits.length <= 1) return hits[0] ?? null;
  return hits.find((d) => first && norm(d.name).includes(first)) ?? null;
}
