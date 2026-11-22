import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { estimateHours, type CnrOperation } from '@/lib/cnr';
import { CnrComparisonCard } from './CnrComparisonCard';

/** Trajets réalisés des 30 derniers jours face au coût de revient CNR (Pilotage › Analyse). */
export function CnrTripsCard({ licenseId }: { licenseId: string | null }) {
  const since = useMemo(() => new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10), []);
  const { data = [] } = useQuery({
    queryKey: ['cnr-trips', licenseId, since],
    enabled: !!licenseId,
    queryFn: async () => {
      // get_trips_masked : le chiffre d'affaires reste masqué pour les rôles qui n'y ont pas droit.
      const { data, error } = await supabase.rpc('get_trips_masked')
        .select('id, trip_date, notes, destination_address, distance_km, duration_minutes, revenue')
        .gte('trip_date', since).order('trip_date', { ascending: false }).limit(2000);
      if (error) throw error;
      return data ?? [];
    },
  });
  const ops: CnrOperation[] = useMemo(() => data.map((t) => {
    const km = Number(t.distance_km) || 0;
    const hours = t.duration_minutes ? Number(t.duration_minutes) / 60 + 1 : estimateHours(km);
    return { id: t.id, date: t.trip_date ?? '', label: t.notes || t.destination_address || 'Trajet', km, hours, revenue: Number(t.revenue) || 0 };
  }), [data]);
  return <CnrComparisonCard operations={ops} licenseId={licenseId} periodLabel="30 derniers jours" />;
}
