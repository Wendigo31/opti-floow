/**
 * Échanges de palettes de la société (table pallet_movements).
 * Fichier partagé (bridge/shared/pallets).
 */
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { PalletMovement } from '@/lib/pallets';

export type NewPalletMovement = Pick<PalletMovement, 'client_id' | 'movement_date' | 'pallet_type' | 'given' | 'returned'> &
  Partial<Pick<PalletMovement, 'site' | 'reference' | 'note' | 'source'>>;

type Res<T = unknown> = { data: T | null; error: { message: string } | null };
const table = () =>
  (supabase as unknown as { from: (t: string) => unknown }).from('pallet_movements') as {
    select: (c: string) => { eq: (k: string, v: string) => { order: (c: string, o: { ascending: boolean }) => Promise<Res<PalletMovement[]>> } };
    insert: (v: Record<string, unknown>) => Promise<Res>;
    delete: () => { eq: (k: string, v: string) => Promise<Res> };
  };

export function usePallets(licenseId: string | null | undefined) {
  const qc = useQueryClient();
  const key = ['pallet-movements', licenseId];
  const q = useQuery({
    queryKey: key,
    enabled: !!licenseId,
    queryFn: async (): Promise<{ rows: PalletMovement[]; available: boolean }> => {
      const { data, error } = await table().select('*').eq('license_id', licenseId as string).order('movement_date', { ascending: false });
      // Table pas encore créée sur cette base : l'écran s'affiche, la saisie attend la mise à jour.
      if (error) return { rows: [], available: false };
      return { rows: data ?? [], available: true };
    },
  });
  return {
    moves: q.data?.rows ?? [],
    available: q.data?.available ?? true,
    loading: q.isLoading,
    async add(m: NewPalletMovement) {
      const { error } = await table().insert({ source: 'bureau', ...m, license_id: licenseId });
      if (error) throw new Error(error.message);
      await qc.invalidateQueries({ queryKey: key });
    },
    async remove(id: string) {
      const { error } = await table().delete().eq('id', id);
      if (error) throw new Error(error.message);
      await qc.invalidateQueries({ queryKey: key });
    },
  };
}

/**
 * Stock de palettes possédées par la société, par type (table pallet_stock).
 * Ajouté nov. 2026 : savoir ce qui est au dépôt, chez les clients (dues) ou à rendre.
 */
export function usePalletStock(licenseId: string | null | undefined) {
  const qc = useQueryClient();
  const key = ['pallet-stock', licenseId];
  const db = supabase as unknown as {
    from: (t: string) => {
      select: (c: string) => { eq: (k: string, v: string) => Promise<Res<{ pallet_type: string; quantity: number }[]>> };
      upsert: (v: Record<string, unknown>) => Promise<Res>;
    };
  };
  const q = useQuery({
    queryKey: key,
    enabled: !!licenseId,
    queryFn: async (): Promise<{ stock: Record<string, number>; available: boolean }> => {
      const { data, error } = await db.from('pallet_stock').select('pallet_type, quantity').eq('license_id', licenseId as string);
      if (error) return { stock: {}, available: false };
      return { stock: Object.fromEntries((data ?? []).map((r) => [r.pallet_type, r.quantity])), available: true };
    },
  });
  return {
    stock: q.data?.stock ?? {},
    available: q.data?.available ?? true,
    async set(palletType: string, quantity: number) {
      const { error } = await db.from('pallet_stock').upsert({
        license_id: licenseId,
        pallet_type: palletType,
        quantity: Math.max(0, Math.floor(quantity) || 0),
        updated_at: new Date().toISOString(),
      });
      if (error) throw new Error(error.message);
      await qc.invalidateQueries({ queryKey: key });
    },
  };
}
