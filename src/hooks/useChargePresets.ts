import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { FixedCharge } from '@/types';
import { toast } from 'sonner';
import { useLicenseContext } from '@/context/LicenseContext';

export interface ChargePreset {
  id: string;
  name: string;
  description?: string;
  charges: FixedCharge[];
  created_at: string;
  updated_at: string;
  created_by: string;
  license_id?: string;
}

export function useChargePresets() {
  const { licenseId, authUserId } = useLicenseContext();
  const [presets, setPresets] = useState<ChargePreset[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPresets = useCallback(async () => {
    if (!authUserId) {
      setPresets([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('charge_presets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Map database format to our interface
      const mappedPresets: ChargePreset[] = (data || []).map(p => ({
        id: p.id,
        name: p.name,
        description: p.description || undefined,
        charges: Array.isArray(p.charges) ? p.charges as unknown as FixedCharge[] : [],
        created_at: p.created_at,
        updated_at: p.updated_at,
        created_by: p.created_by,
        license_id: p.license_id || undefined,
      }));

      setPresets(mappedPresets);
    } catch (error) {
      console.error('Error fetching charge presets:', error);
    } finally {
      setLoading(false);
    }
  }, [authUserId]);

  useEffect(() => {
    if (authUserId) {
      fetchPresets();
    }
  }, [authUserId, fetchPresets]);

  // Subscribe to realtime changes
  useEffect(() => {
    const channel = supabase
      .channel('charge_presets_realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'charge_presets',
        },
        () => {
          fetchPresets();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchPresets]);

  const createPreset = useCallback(async (name: string, charges: FixedCharge[], description?: string): Promise<boolean> => {
    try {
      if (!authUserId || !licenseId) {
        toast.error('Session en cours de chargement...');
        return false;
      }

      const insertData = {
        name,
        description: description || null,
        charges: charges as unknown as Record<string, unknown>[],
        created_by: authUserId,
        license_id: licenseId,
      };

      const { error } = await supabase
        .from('charge_presets')
        .insert(insertData as any);

      if (error) throw error;

      toast.success('Preset créé avec succès');
      await fetchPresets();
      return true;
    } catch (error) {
      console.error('Error creating preset:', error);
      toast.error('Erreur lors de la création du preset');
      return false;
    }
  }, [authUserId, licenseId, fetchPresets]);

  const updatePreset = useCallback(async (id: string, updates: Partial<Pick<ChargePreset, 'name' | 'description' | 'charges'>>): Promise<boolean> => {
    try {
      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };

      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.charges !== undefined) updateData.charges = updates.charges as unknown as Record<string, unknown>[];

      const { error } = await supabase
        .from('charge_presets')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      toast.success('Preset mis à jour');
      await fetchPresets();
      return true;
    } catch (error) {
      console.error('Error updating preset:', error);
      toast.error('Erreur lors de la mise à jour');
      return false;
    }
  }, [fetchPresets]);

  const deletePreset = useCallback(async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('charge_presets')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Preset supprimé');
      await fetchPresets();
      return true;
    } catch (error) {
      console.error('Error deleting preset:', error);
      toast.error('Erreur lors de la suppression');
      return false;
    }
  }, [fetchPresets]);

  const duplicatePreset = useCallback(async (preset: ChargePreset): Promise<boolean> => {
    return createPreset(
      `${preset.name} (copie)`,
      preset.charges,
      preset.description
    );
  }, [createPreset]);

  return {
    presets,
    loading,
    createPreset,
    updatePreset,
    deletePreset,
    duplicatePreset,
    refreshPresets: fetchPresets,
  };
}
