import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLicenseContext } from '@/context/LicenseContext';
import { toast } from 'sonner';

export interface DriverAbsence {
  id: string;
  driver_id: string;
  license_id: string;
  user_id: string;
  absence_type: string;
  start_date: string;
  end_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function useDriverAbsences() {
  const { licenseId, authUserId } = useLicenseContext();
  const [absences, setAbsences] = useState<DriverAbsence[]>([]);
  const [loading, setLoading] = useState(true);
  const fetchRef = useRef<(() => Promise<void>) | null>(null);

  const fetchAbsences = useCallback(async () => {
    if (!licenseId) return;
    try {
      const { data, error } = await supabase
        .from('driver_absences')
        .select('*')
        .eq('license_id', licenseId)
        .order('start_date', { ascending: false });

      if (error) throw error;
      setAbsences((data as any[]) || []);
    } catch (err) {
      console.error('[DriverAbsences] fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [licenseId]);

  fetchRef.current = fetchAbsences;

  useEffect(() => {
    fetchAbsences();
  }, [fetchAbsences]);

  // Realtime subscription
  useEffect(() => {
    if (!licenseId) return;

    const channel = supabase
      .channel(`driver_absences_${licenseId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'driver_absences',
          filter: `license_id=eq.${licenseId}`,
        },
        () => {
          fetchRef.current?.();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [licenseId]);

  const createAbsence = useCallback(async (input: {
    driver_id: string;
    absence_type: DriverAbsence['absence_type'];
    start_date: string;
    end_date?: string | null;
    notes?: string | null;
  }) => {
    if (!licenseId || !authUserId) return false;
    try {
      const { error } = await supabase
        .from('driver_absences')
        .insert({
          driver_id: input.driver_id,
          license_id: licenseId,
          user_id: authUserId,
          absence_type: input.absence_type,
          start_date: input.start_date,
          end_date: input.end_date || null,
          notes: input.notes || null,
        } as any);

      if (error) throw error;
      toast.success('Absence enregistrée');
      return true;
    } catch (err) {
      console.error('[DriverAbsences] create error:', err);
      toast.error("Erreur lors de l'enregistrement");
      return false;
    }
  }, [licenseId, authUserId]);

  const updateAbsence = useCallback(async (id: string, updates: Partial<Pick<DriverAbsence, 'absence_type' | 'start_date' | 'end_date' | 'notes'>>) => {
    try {
      const { error } = await supabase
        .from('driver_absences')
        .update(updates as any)
        .eq('id', id);

      if (error) throw error;
      toast.success('Absence mise à jour');
      return true;
    } catch (err) {
      console.error('[DriverAbsences] update error:', err);
      toast.error('Erreur lors de la mise à jour');
      return false;
    }
  }, []);

  const deleteAbsence = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('driver_absences')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Absence supprimée');
      return true;
    } catch (err) {
      console.error('[DriverAbsences] delete error:', err);
      toast.error('Erreur lors de la suppression');
      return false;
    }
  }, []);

  return { absences, loading, createAbsence, updateAbsence, deleteAbsence, refetch: fetchAbsences };
}
