/**
 * Prestations facturables d'un client sur une période : tournées du planning
 * (une ligne par jour réalisé) et trajets enregistrés. Le prix proposé vient de
 * la grille tarifaire du client, sinon de la tournée enregistrée (forfait ou
 * chiffre d'affaires), sinon du trajet.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLicenseContext } from '@/context/LicenseContext';
import { priceFromRateCard, type RateCard } from '@/lib/rateCard';

export interface BillableItem {
  /** « planning:<id> » ou « trip:<id> » — repère anti double facturation. */
  key: string;
  date: string;
  label: string;
  status: string;
  km: number | null;
  price: number;
  priceSource: 'grille' | 'tournée' | 'trajet' | 'à saisir';
}

type Res<T> = { data: T | null; error: { message: string } | null };
type Q<T> = {
  select: (c: string) => Q<T>;
  eq: (k: string, v: string) => Q<T>;
  neq: (k: string, v: string) => Q<T>;
  gte: (k: string, v: string) => Q<T>;
  lte: (k: string, v: string) => Q<T>;
  in: (k: string, v: string[]) => Q<T>;
  order: (k: string, o: { ascending: boolean }) => Promise<Res<T>>;
} & Promise<Res<T>>;
const from = <T,>(t: string) => (supabase as unknown as { from: (t: string) => Q<T> }).from(t);

interface PlanningRow { id: string; planning_date: string; tour_name: string | null; status: string; start_time: string | null; end_time: string | null; stops: unknown[] | null; saved_tour_id: string | null; origin_address: string | null; destination_address: string | null; line_reference: string | null }
interface TourRow { id: string; name: string; distance_km: number | null; fixed_price: number | null; revenue: number | null; pricing_mode: string | null }
interface TripRow { id: string; trip_date: string; origin_address: string; destination_address: string; distance_km: number | null; revenue: number | null; status: string | null; stops: unknown[] | null }

const hours = (a?: string | null, b?: string | null) => {
  if (!a || !b) return null;
  const [h1, m1] = a.split(':').map(Number);
  const [h2, m2] = b.split(':').map(Number);
  const d = h2 * 60 + m2 - (h1 * 60 + m1);
  return d > 0 ? Math.round((d / 60) * 100) / 100 : null;
};

export function useBillableWork(clientId: string | null, start: string | null, end: string | null, card?: RateCard) {
  const { licenseId } = useLicenseContext();
  return useQuery({
    queryKey: ['billable-work', licenseId, clientId, start, end, card ? JSON.stringify(card) : null],
    enabled: !!licenseId && !!clientId && !!start && !!end,
    queryFn: async (): Promise<BillableItem[]> => {
      const [plan, trips] = await Promise.all([
        from<PlanningRow[]>('planning_entries')
          .select('id, planning_date, tour_name, status, start_time, end_time, stops, saved_tour_id, origin_address, destination_address, line_reference')
          .eq('license_id', licenseId as string).eq('client_id', clientId as string).neq('status', 'cancelled')
          .gte('planning_date', start as string).lte('planning_date', end as string)
          .order('planning_date', { ascending: true }),
        from<TripRow[]>('trips')
          .select('id, trip_date, origin_address, destination_address, distance_km, revenue, status, stops')
          .eq('license_id', licenseId as string).eq('client_id', clientId as string)
          .gte('trip_date', start as string).lte('trip_date', end as string)
          .order('trip_date', { ascending: true }),
      ]);
      const planRows = plan.data ?? [];
      const tourIds = [...new Set(planRows.map((p) => p.saved_tour_id).filter(Boolean))] as string[];
      const tours = tourIds.length
        ? ((await from<TourRow[]>('saved_tours').select('id, name, distance_km, fixed_price, revenue, pricing_mode').in('id', tourIds).order('name', { ascending: true })).data ?? [])
        : [];
      const tourById = new Map(tours.map((t) => [t.id, t]));

      const priced = (base: number | null, q: Parameters<typeof priceFromRateCard>[1]) => {
        if (card) {
          const r = priceFromRateCard(card, q);
          if (r.ok) return { price: r.amount, priceSource: 'grille' as const };
        }
        return base && base > 0 ? null : { price: 0, priceSource: 'à saisir' as const };
      };

      const items: BillableItem[] = planRows.map((p) => {
        const tour = p.saved_tour_id ? tourById.get(p.saved_tour_id) : undefined;
        const km = tour?.distance_km != null ? Number(tour.distance_km) : null;
        const base = tour ? Number(tour.fixed_price || tour.revenue || 0) : 0;
        const fromCard = priced(base, { km, stops: Array.isArray(p.stops) ? p.stops.length : null, tours: 1, hours: hours(p.start_time, p.end_time), destination: p.destination_address, date: p.planning_date });
        const name = p.tour_name || tour?.name || p.line_reference || [p.origin_address, p.destination_address].filter(Boolean).join(' → ') || 'Tournée';
        return {
          key: `planning:${p.id}`,
          date: p.planning_date,
          label: `${name} — ${new Date(`${p.planning_date}T00:00:00`).toLocaleDateString('fr-FR')}`,
          status: p.status,
          km,
          ...(fromCard ?? { price: Math.round(base * 100) / 100, priceSource: 'tournée' as const }),
        };
      });
      for (const t of trips.data ?? []) {
        if (t.status === 'cancelled') continue;
        const km = t.distance_km != null ? Number(t.distance_km) : null;
        const base = Number(t.revenue || 0);
        const fromCard = priced(base, { km, stops: Array.isArray(t.stops) ? t.stops.length : null, tours: 1, destination: t.destination_address, date: t.trip_date });
        items.push({
          key: `trip:${t.id}`,
          date: t.trip_date,
          label: `${t.origin_address} → ${t.destination_address} — ${new Date(`${t.trip_date}T00:00:00`).toLocaleDateString('fr-FR')}`,
          status: t.status || 'completed',
          km,
          ...(fromCard ?? { price: Math.round(base * 100) / 100, priceSource: 'trajet' as const }),
        });
      }
      return items.sort((a, b) => a.date.localeCompare(b.date));
    },
  });
}
