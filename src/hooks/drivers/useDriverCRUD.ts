import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Driver } from '@/types';
import { getLicenseId } from '@/context/LicenseContext';

export interface DriverCRUDOptions {
  silent?: boolean;
}

export function useDriverCRUD() {
  const createDriver = useCallback(async (
    driver: Driver,
    driverType: 'cdi' | 'cdd' | 'interim',
    uid: string,
    lid: string,
    options?: DriverCRUDOptions
  ): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('user_drivers')
        .upsert([{
          user_id: uid,
          license_id: lid,
          local_id: driver.id,
          name: driver.name,
          driver_type: driverType,
          base_salary: driver.baseSalary,
          hourly_rate: driver.hourlyRate,
          driver_data: JSON.parse(JSON.stringify(driver)),
          synced_at: new Date().toISOString(),
        }], { onConflict: 'local_id,license_id' });

      if (error) throw error;

      if (!options?.silent) {
        toast.success('Conducteur ajouté');
      }
      return true;
    } catch (error) {
      console.error('[useDriverCRUD] createDriver error:', error);
      if (!options?.silent) {
        toast.error('Erreur lors de la création');
      }
      return false;
    }
  }, []);

  const createBatch = useCallback(async (
    drivers: { driver: Driver; type: 'cdi' | 'cdd' | 'interim' }[],
    uid: string,
    lid: string,
    onProgress?: (done: number, total: number) => void
  ): Promise<number> => {
    const CHUNK_SIZE = 50;
    let totalInserted = 0;

    for (let i = 0; i < drivers.length; i += CHUNK_SIZE) {
      const chunk = drivers.slice(i, i + CHUNK_SIZE);
      const rows = chunk.map(({ driver, type }) => ({
        user_id: uid,
        license_id: lid,
        local_id: driver.id,
        name: driver.name,
        driver_type: type,
        base_salary: driver.baseSalary,
        hourly_rate: driver.hourlyRate,
        driver_data: JSON.parse(JSON.stringify(driver)),
      }));

      const { error, data } = await supabase
        .from('user_drivers')
        .insert(rows)
        .select('id');

      if (error) {
        console.error(`[useDriverCRUD] Batch insert error (chunk ${Math.floor(i / CHUNK_SIZE) + 1}):`, error);
      } else {
        totalInserted += data?.length || 0;
      }

      onProgress?.(Math.min(i + CHUNK_SIZE, drivers.length), drivers.length);

      // Small delay to keep UI responsive
      if (i + CHUNK_SIZE < drivers.length) {
        await new Promise(r => setTimeout(r, 50));
      }
    }

    return totalInserted;
  }, []);

  const updateDriver = useCallback(async (
    driver: Driver,
    driverType: 'cdi' | 'cdd' | 'interim'
  ): Promise<boolean> => {
    try {
      const currentLicenseId = await getLicenseId();

      const { error } = await supabase
        .from('user_drivers')
        .update({
          name: driver.name,
          driver_type: driverType,
          base_salary: driver.baseSalary,
          hourly_rate: driver.hourlyRate,
          driver_data: JSON.parse(JSON.stringify(driver)),
          synced_at: new Date().toISOString(),
        })
        .eq('license_id', currentLicenseId)
        .eq('local_id', driver.id);

      if (error) throw error;

      toast.success('Conducteur mis à jour');
      return true;
    } catch (error) {
      console.error('[useDriverCRUD] updateDriver error:', error);
      toast.error('Erreur lors de la mise à jour');
      return false;
    }
  }, []);

  const deleteDriver = useCallback(async (
    id: string,
    uid: string,
    lid: string
  ): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase
        .from('user_drivers')
        .delete()
        .eq('license_id', lid)
        .eq('local_id', id);

      if (deleteError) {
        if (deleteError.code === '42501' || deleteError.message?.includes('policy')) {
          const { error: fnError } = await supabase
            .rpc('delete_company_driver', { p_license_id: lid, p_local_id: id });

          if (fnError) {
            console.error('[useDriverCRUD] delete_company_driver failed:', fnError);
            toast.error('Suppression refusée');
            return false;
          }
        } else {
          throw deleteError;
        }
      }

      toast.success('Conducteur supprimé');
      return true;
    } catch (error) {
      console.error('[useDriverCRUD] deleteDriver error:', error);
      toast.error('Erreur lors de la suppression');
      return false;
    }
  }, []);

  return { createDriver, createBatch, updateDriver, deleteDriver };
}
