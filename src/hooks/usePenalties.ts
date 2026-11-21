/**
 * Pénalités de la société (table penalties) et taux de retard (penalty_settings).
 * Fichier partagé (bridge/shared/penalties) : copie identique dans les 3 logiciels.
 */
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DEFAULT_LATE_RATE, type Penalty } from '@/lib/penalties';

type Res<T = unknown> = { data: T; error: { message: string } | null };
// Tables hors des types générés : accès non typé.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as unknown as { from: (t: string) => any };

export function usePenalties(licenseId: string | null | undefined) {
  const qc = useQueryClient();
  const key = ['penalties', licenseId];
  const q = useQuery({
    queryKey: key,
    enabled: !!licenseId,
    queryFn: async (): Promise<Penalty[]> => {
      const { data, error }: Res<Penalty[] | null> = await db.from('penalties').select('*').eq('license_id', licenseId).order('occurred_on', { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []).map((p) => ({ ...p, amount: Number(p.amount) }));
    },
  });
  const rate = useQuery({
    queryKey: ['penalty-settings', licenseId],
    enabled: !!licenseId,
    queryFn: async (): Promise<number> => {
      const { data }: Res<{ late_rate: number } | null> = await db.from('penalty_settings').select('late_rate').eq('license_id', licenseId).maybeSingle();
      return data?.late_rate != null ? Number(data.late_rate) : DEFAULT_LATE_RATE;
    },
  });

  const refresh = () => qc.invalidateQueries({ queryKey: key });

  const save = async (p: Partial<Penalty> & Pick<Penalty, 'kind' | 'occurred_on' | 'amount'>) => {
    const values = { ...p, license_id: licenseId, updated_at: new Date().toISOString() };
    const { error }: Res = p.id
      ? await db.from('penalties').update(values).eq('id', p.id)
      : await db.from('penalties').insert(values);
    if (error) throw new Error(error.message);
    await refresh();
  };
  const setStatus = async (id: string, status: string) => {
    const { error }: Res = await db.from('penalties').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) throw new Error(error.message);
    await refresh();
  };
  const remove = async (id: string) => {
    const { error }: Res = await db.from('penalties').delete().eq('id', id);
    if (error) throw new Error(error.message);
    await refresh();
  };
  const saveRate = async (late_rate: number) => {
    const { error }: Res = await db.from('penalty_settings').upsert({ license_id: licenseId, late_rate, updated_at: new Date().toISOString() }, { onConflict: 'license_id' });
    if (error) throw new Error(error.message);
    await qc.invalidateQueries({ queryKey: ['penalty-settings', licenseId] });
  };

  return { rows: q.data ?? [], loading: q.isLoading, error: q.error as Error | null, lateRate: rate.data ?? DEFAULT_LATE_RATE, save, setStatus, remove, saveRate };
}
