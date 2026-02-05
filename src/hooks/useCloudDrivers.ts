import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Driver } from '@/types';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { useLicenseContext, getLicenseId } from '@/context/LicenseContext';

const CACHE_KEY_CDI = 'optiflow_drivers_cache';
const CACHE_KEY_INTERIM = 'optiflow_interim_drivers_cache';
const CACHE_KEY_CDD = 'optiflow_cdd_drivers_cache';

function getCachedCdiDrivers(): Driver[] {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY_CDI) || '[]');
  } catch {
    return [];
  }
}

function getCachedInterimDrivers(): Driver[] {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY_INTERIM) || '[]');
  } catch {
    return [];
  }
}

function getCachedCddDrivers(): Driver[] {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY_CDD) || '[]');
  } catch {
    return [];
  }
}

function setCachedDrivers(cdi: Driver[], cdd: Driver[], interim: Driver[]) {
  try {
    localStorage.setItem(CACHE_KEY_CDI, JSON.stringify(cdi));
    localStorage.setItem(CACHE_KEY_CDD, JSON.stringify(cdd));
    localStorage.setItem(CACHE_KEY_INTERIM, JSON.stringify(interim));
  } catch (e) {
    console.error('Failed to cache drivers:', e);
  }
}

export function useCloudDrivers() {
  const { licenseId, authUserId, isLoading: contextLoading } = useLicenseContext();
  const [cdiDrivers, setCdiDrivers] = useState<Driver[]>(() => getCachedCdiDrivers());
  const [cddDrivers, setCddDrivers] = useState<Driver[]>(() => getCachedCddDrivers());
  const [interimDrivers, setInterimDrivers] = useState<Driver[]>(() => getCachedInterimDrivers());
  const [loading, setLoading] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const fetchInProgressRef = useRef(false);
  
  // Keep latest context values in refs for async operations
  const authUserIdRef = useRef<string | null>(authUserId);
  const licenseIdRef = useRef<string | null>(licenseId);
  
  useEffect(() => {
    authUserIdRef.current = authUserId;
  }, [authUserId]);
  
  useEffect(() => {
    licenseIdRef.current = licenseId;
  }, [licenseId]);

  // Keep latest state in refs so realtime handlers don't rely on stale closures
  const cdiDriversRef = useRef<Driver[]>(cdiDrivers);
  const cddDriversRef = useRef<Driver[]>(cddDrivers);
  const interimDriversRef = useRef<Driver[]>(interimDrivers);

  useEffect(() => {
    cdiDriversRef.current = cdiDrivers;
  }, [cdiDrivers]);

  useEffect(() => {
    cddDriversRef.current = cddDrivers;
  }, [cddDrivers]);

  useEffect(() => {
    interimDriversRef.current = interimDrivers;
  }, [interimDrivers]);

  const fetchDrivers = useCallback(async (): Promise<void> => {
    if (fetchInProgressRef.current) return;

    if (!authUserId || !licenseId) {
      setCdiDrivers(getCachedCdiDrivers());
      setCddDrivers(getCachedCddDrivers());
      setInterimDrivers(getCachedInterimDrivers());
      return;
    }

    fetchInProgressRef.current = true;
    setLoading(true);

    try {
      // Single optimized query - no need for getUser() since we have authUserId
      const { data, error } = await supabase
        .from('user_drivers')
        .select('driver_data, driver_type')
        .eq('license_id', licenseId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const cdi: Driver[] = [];
      const cdd: Driver[] = [];
      const interim: Driver[] = [];

      (data || []).forEach(row => {
        const driverData = row.driver_data as unknown as Driver;
        if (driverData) {
          if (row.driver_type === 'interim') {
            interim.push(driverData);
          } else if (row.driver_type === 'cdd') {
            cdd.push(driverData);
          } else {
            cdi.push(driverData);
          }
        }
      });

      setCdiDrivers(cdi);
      setCddDrivers(cdd);
      setInterimDrivers(interim);
      setCachedDrivers(cdi, cdd, interim);
    } catch (error) {
      console.error('Error fetching drivers:', error);
      const cachedCdi = getCachedCdiDrivers();
      const cachedCdd = getCachedCddDrivers();
      const cachedInterim = getCachedInterimDrivers();
      if (cachedCdi.length > 0 || cachedCdd.length > 0 || cachedInterim.length > 0) {
        setCdiDrivers(cachedCdi);
        setCddDrivers(cachedCdd);
        setInterimDrivers(cachedInterim);
        toast.warning('Mode hors-ligne : données du cache');
      }
    } finally {
      setLoading(false);
      fetchInProgressRef.current = false;
    }
  }, [authUserId, licenseId]);

  // Store fetchDrivers in ref to avoid subscription churn
  const fetchDriversRef = useRef<() => Promise<void>>();
  useEffect(() => { fetchDriversRef.current = fetchDrivers; }, [fetchDrivers]);

  // Realtime subscription
  useEffect(() => {
    if (!licenseId) return;

    channelRef.current = supabase
      .channel(`drivers_${licenseId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_drivers',
          filter: `license_id=eq.${licenseId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const data = (payload.new as any).driver_data as Driver;
            const type = (payload.new as any).driver_type;
            if (data) {
              if (type === 'interim') {
                setInterimDrivers(prev => {
                  const exists = prev.find(d => d.id === data.id);
                  const updated = exists ? prev.map(d => d.id === data.id ? data : d) : [data, ...prev];
                  interimDriversRef.current = updated;
                  setCachedDrivers(cdiDriversRef.current, cddDriversRef.current, updated);
                  return updated;
                });
              } else if (type === 'cdd') {
                setCddDrivers(prev => {
                  const exists = prev.find(d => d.id === data.id);
                  const updated = exists ? prev.map(d => d.id === data.id ? data : d) : [data, ...prev];
                  cddDriversRef.current = updated;
                  setCachedDrivers(cdiDriversRef.current, updated, interimDriversRef.current);
                  return updated;
                });
              } else {
                setCdiDrivers(prev => {
                  const exists = prev.find(d => d.id === data.id);
                  const updated = exists ? prev.map(d => d.id === data.id ? data : d) : [data, ...prev];
                  cdiDriversRef.current = updated;
                  setCachedDrivers(updated, cddDriversRef.current, interimDriversRef.current);
                  return updated;
                });
              }
            }
          } else if (payload.eventType === 'DELETE') {
            const localId = (payload.old as any).local_id;
            setCdiDrivers(prev => {
              const updated = prev.filter(d => d.id !== localId);
              cdiDriversRef.current = updated;
              setCachedDrivers(updated, cddDriversRef.current, interimDriversRef.current);
              return updated;
            });
            setCddDrivers(prev => {
              const updated = prev.filter(d => d.id !== localId);
              cddDriversRef.current = updated;
              setCachedDrivers(cdiDriversRef.current, updated, interimDriversRef.current);
              return updated;
            });
            setInterimDrivers(prev => {
              const updated = prev.filter(d => d.id !== localId);
              interimDriversRef.current = updated;
              setCachedDrivers(cdiDriversRef.current, cddDriversRef.current, updated);
              return updated;
            });
          }
        }
      )
      .subscribe((status) => {
        console.log('[Realtime] drivers subscription:', status);
        // After (re)subscribe, refresh to reconcile any missed events
        if (status === 'SUBSCRIBED') {
          void fetchDriversRef.current?.();
        }
      });

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [licenseId]); // Only depend on licenseId to prevent subscription churn

  // Auto-fetch when licenseId becomes available
  useEffect(() => {
    if (licenseId && authUserId) {
      fetchDrivers();
    }
  }, [licenseId, authUserId, fetchDrivers]);

  const createDriver = useCallback(async (
    driver: Driver,
    driverType: 'cdi' | 'cdd' | 'interim' = 'cdi',
    options?: { silent?: boolean }
  ): Promise<boolean> => {
    try {
      // Use refs to get latest values (handles race conditions)
      const uid = authUserIdRef.current || authUserId;
      const lid = licenseIdRef.current || licenseId;
      
      if (!uid || !lid) {
        if (!options?.silent) {
          console.warn('[useCloudDrivers] createDriver: context not ready, retrying via getLicenseId');
          // Fallback: fetch license directly from DB
          const fallbackLicenseId = await getLicenseId();
          const { data: { user } } = await supabase.auth.getUser();
          if (fallbackLicenseId && user) {
            return createDriverInternal(driver, driverType, user.id, fallbackLicenseId, options);
          }
          toast.error('Veuillez vous reconnecter');
        }
        return false;
      }

      return createDriverInternal(driver, driverType, uid, lid, options);
    } catch (error) {
      console.error('Error creating driver:', error);
      if (!options?.silent) {
        toast.error('Erreur lors de la création');
      }
      return false;
    }
  }, [authUserId, licenseId]);

  const createDriverInternal = useCallback(async (
    driver: Driver,
    driverType: 'cdi' | 'cdd' | 'interim',
    uid: string,
    lid: string,
    options?: { silent?: boolean }
  ): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('user_drivers')
        .insert([{
          user_id: uid,
          license_id: lid,
          local_id: driver.id,
          name: driver.name,
          driver_type: driverType,
          base_salary: driver.baseSalary,
          hourly_rate: driver.hourlyRate,
          driver_data: JSON.parse(JSON.stringify(driver)),
        }]);

      if (error) throw error;
      
      if (options?.silent) {
        return true;
      }

      if (driverType === 'interim') {
        setInterimDrivers(prev => {
          const updated = [driver, ...prev];
          interimDriversRef.current = updated;
          setCachedDrivers(cdiDriversRef.current, cddDriversRef.current, updated);
          return updated;
        });
      } else if (driverType === 'cdd') {
        setCddDrivers(prev => {
          const updated = [driver, ...prev];
          cddDriversRef.current = updated;
          setCachedDrivers(cdiDriversRef.current, updated, interimDriversRef.current);
          return updated;
        });
      } else {
        setCdiDrivers(prev => {
          const updated = [driver, ...prev];
          cdiDriversRef.current = updated;
          setCachedDrivers(updated, cddDriversRef.current, interimDriversRef.current);
          return updated;
        });
      }
      toast.success('Conducteur ajouté');
      return true;
    } catch (error) {
      console.error('Error creating driver:', error);
      if (!options?.silent) {
        toast.error('Erreur lors de la création');
      }
      return false;
    }
  }, [authUserId, licenseId]);

  const updateDriver = useCallback(async (driver: Driver, driverType: 'cdi' | 'cdd' | 'interim' = 'cdi'): Promise<boolean> => {
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

      if (driverType === 'interim') {
        setInterimDrivers(prev => {
          const updated = prev.map(d => d.id === driver.id ? driver : d);
          interimDriversRef.current = updated;
          setCachedDrivers(cdiDriversRef.current, cddDriversRef.current, updated);
          return updated;
        });
      } else if (driverType === 'cdd') {
        setCddDrivers(prev => {
          const updated = prev.map(d => d.id === driver.id ? driver : d);
          cddDriversRef.current = updated;
          setCachedDrivers(cdiDriversRef.current, updated, interimDriversRef.current);
          return updated;
        });
      } else {
        setCdiDrivers(prev => {
          const updated = prev.map(d => d.id === driver.id ? driver : d);
          cdiDriversRef.current = updated;
          setCachedDrivers(updated, cddDriversRef.current, interimDriversRef.current);
          return updated;
        });
      }
      toast.success('Conducteur mis à jour');
      return true;
    } catch (error) {
      console.error('Error updating driver:', error);
      toast.error('Erreur lors de la mise à jour');
      return false;
    }
  }, []);

  const deleteDriver = useCallback(async (id: string, driverType: 'cdi' | 'cdd' | 'interim' = 'cdi'): Promise<boolean> => {
    try {
      // Use refs to get latest values
      let uid = authUserIdRef.current || authUserId;
      let lid = licenseIdRef.current || licenseId;
      
      if (!uid || !lid) {
        // Fallback: fetch from auth
        const { data: { user } } = await supabase.auth.getUser();
        lid = await getLicenseId();
        uid = user?.id || null;
      }

      if (!uid || !lid) {
        toast.error('Veuillez vous reconnecter');
        return false;
      }

      const { error: deleteError, count } = await supabase
        .from('user_drivers')
        .delete({ count: 'exact' })
        .eq('license_id', lid)
        .eq('local_id', id);

      if (deleteError) {
        console.error('[useCloudDrivers] deleteDriver error:', deleteError);
        throw deleteError;
      }

      if (count === 0) {
        const { data: isOwner, error: ownerError } = await supabase
          .rpc('is_company_owner', { p_license_id: lid, p_user_id: uid });

        if (ownerError) {
          console.warn('Unable to check owner role:', ownerError);
        }

        if (isOwner) {
          const { data: deletedByFn, error: fnError } = await supabase
            .rpc('delete_company_driver', { p_license_id: lid, p_local_id: id });

          if (fnError) {
            console.error('Direction delete_company_driver failed:', fnError);
            toast.error('Suppression refusée');
            return false;
          }

          if (!deletedByFn) {
            toast.error('Conducteur introuvable');
            return false;
          }
        }
      }

      const { data: stillThere, error: verifyError } = await supabase
        .from('user_drivers')
        .select('id')
        .eq('license_id', lid)
        .eq('local_id', id)
        .maybeSingle();

      if (verifyError) {
        console.warn('Unable to verify driver deletion:', verifyError);
      }

      if (stillThere) {
        toast.error('Suppression refusée (droits insuffisants)');
        return false;
      }

      if (driverType === 'interim') {
        setInterimDrivers(prev => {
          const updated = prev.filter(d => d.id !== id);
          interimDriversRef.current = updated;
          setCachedDrivers(cdiDriversRef.current, cddDriversRef.current, updated);
          return updated;
        });
      } else if (driverType === 'cdd') {
        setCddDrivers(prev => {
          const updated = prev.filter(d => d.id !== id);
          cddDriversRef.current = updated;
          setCachedDrivers(cdiDriversRef.current, updated, interimDriversRef.current);
          return updated;
        });
      } else {
        setCdiDrivers(prev => {
          const updated = prev.filter(d => d.id !== id);
          cdiDriversRef.current = updated;
          setCachedDrivers(updated, cddDriversRef.current, interimDriversRef.current);
          return updated;
        });
      }
      toast.success('Conducteur supprimé');
      return true;
    } catch (error) {
      console.error('Error deleting driver:', error);
      toast.error('Erreur lors de la suppression');
      return false;
    }
  }, [authUserId, licenseId, contextLoading]);

  return {
    cdiDrivers,
    cddDrivers,
    interimDrivers,
    loading,
    fetchDrivers,
    createDriver,
    updateDriver,
    deleteDriver,
    setCdiDrivers,
    setInterimDrivers,
  };
}
