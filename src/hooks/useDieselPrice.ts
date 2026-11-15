import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const API =
  'https://data.economie.gouv.fr/api/explore/v2.1/catalog/datasets/prix-des-carburants-en-france-flux-instantane-v2/records';

/** Prix moyen national du gazole HT (moyenne TTC des stations, TVA 20 % retirée). */
export async function fetchOfficialDieselHT(): Promise<number | null> {
  const r = await fetch(`${API}?select=avg(gazole_prix)%20as%20avg_gazole&where=gazole_prix%20is%20not%20null&limit=1`);
  if (!r.ok) return null;
  const j = await r.json();
  const ttc = Number(j?.results?.[0]?.avg_gazole);
  if (!ttc || ttc <= 0) return null;
  return Math.round((ttc / 1.2) * 1000) / 1000;
}

/**
 * Prix du gazole utilisé dans les calculs (même règle dans les 3 logiciels) :
 * prix HT officiel relevé en direct + ajustement propre à la société en €/L (+ ou −),
 * réglé dans Factures › Indexation gazole.
 */
export function useDieselPrice() {
  const official = useQuery({
    queryKey: ['official-diesel-ht'],
    queryFn: fetchOfficialDieselHT,
    staleTime: 6 * 60 * 60 * 1000,
    retry: 1,
  });
  const adjustQ = useQuery({
    queryKey: ['diesel-adjust'],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data } = await (supabase as any).from('invoice_settings').select('fuel').limit(1).maybeSingle();
      return Number(data?.fuel?.priceAdjust) || 0;
    },
  });
  const officialHT = official.data ?? null;
  const adjust = adjustQ.data ?? 0;
  const effectiveHT = officialHT == null ? null : Math.max(0, Math.round((officialHT + adjust) * 1000) / 1000);
  return { officialHT, adjust, effectiveHT, loading: official.isLoading, refetch: official.refetch };
}
