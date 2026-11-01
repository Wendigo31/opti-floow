/**
 * Grilles tarifaires des clients de la société (table client_rate_cards, une
 * grille par client). Fichier partagé (bridge/shared/pricing).
 */
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { RateCard } from '@/lib/rateCard';

type Res = { data: unknown; error: { message: string } | null };
// La table n'est pas dans les types générés : accès non typé.
const table = () =>
  (supabase as unknown as { from: (t: string) => Record<string, (...a: unknown[]) => unknown> }).from('client_rate_cards') as unknown as {
    select: (c: string) => { eq: (k: string, v: string) => Promise<Res> };
    upsert: (v: Record<string, unknown>, o: { onConflict: string }) => Promise<Res>;
    delete: () => { eq: (k: string, v: string) => { eq: (k: string, v: string) => Promise<Res> } };
  };

export function useRateCards(licenseId: string | null | undefined) {
  const qc = useQueryClient();
  const key = ['client-rate-cards', licenseId];
  const q = useQuery({
    queryKey: key,
    enabled: !!licenseId,
    staleTime: 60_000,
    queryFn: async (): Promise<Map<string, RateCard>> => {
      const { data, error } = await table().select('client_id, card').eq('license_id', licenseId as string);
      // Table pas encore créée (base pas à jour) : aucune grille.
      if (error || !Array.isArray(data)) return new Map();
      return new Map((data as { client_id: string; card: RateCard }[]).map((r) => [r.client_id, r.card]));
    },
  });

  const save = async (clientId: string, card: RateCard) => {
    const { error } = await table().upsert({ license_id: licenseId, client_id: clientId, card, updated_at: new Date().toISOString() }, { onConflict: 'license_id,client_id' });
    if (error) throw new Error(error.message);
    await qc.invalidateQueries({ queryKey: key });
  };
  const remove = async (clientId: string) => {
    const { error } = await table().delete().eq('license_id', licenseId as string).eq('client_id', clientId);
    if (error) throw new Error(error.message);
    await qc.invalidateQueries({ queryKey: key });
  };

  return { cards: q.data ?? new Map<string, RateCard>(), loading: q.isLoading, save, remove };
}
