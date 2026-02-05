import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Driver } from '@/types';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { useLicenseContext, getLicenseId } from '@/context/LicenseContext';

const CACHE_KEY_CDI = 'optiflow_drivers_cache';
const CACHE_KEY_INTERIM = 'optiflow_interim_drivers_cache';

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

function setCachedDrivers(cdi: Driver[], interim: Driver[]) {
  try {
    localStorage.setItem(CACHE_KEY_CDI, JSON.stringify(cdi));
    localStorage.setItem(CACHE_KEY_INTERIM, JSON.stringify(interim));
  } catch (e) {
    console.error('Failed to cache drivers:', e);
  }
}

export function useCloudDrivers() {
  const { licenseId, authUserId } = useLicenseContext();
  const [cdiDrivers, setCdiDrivers] = useState<Driver[]>(() => getCachedCdiDrivers());
  const [interimDrivers, setInterimDrivers] = useState<Driver[]>(() => getCachedInterimDrivers());
  const [loading, setLoading] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const fetchInProgressRef = useRef(false);

  const fetchDrivers = useCallback(async (): Promise<void> => {
    if (fetchInProgressRef.current) return;
    
    if (!authUserId || !licenseId) {
      setCdiDrivers(getCachedCdiDrivers());
      setInterimDrivers(getCachedInterimDrivers());
      return;
    }

    fetchInProgressRef.current = true;
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('user_drivers')
        .select('driver_data, driver_type')
        .eq('license_id', licenseId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const cdi: Driver[] = [];
      const interim: Driver[] = [];
      
      (data || []).forEach(row => {
        const driverData = row.driver_data as unknown as Driver;
        if (driverData) {
          if (row.driver_type === 'interim') {
            interim.push(driverData);
          } else {
            cdi.push(driverData);
          }
        }
      });

      setCdiDrivers(cdi);
      setInterimDrivers(interim);
      setCachedDrivers(cdi, interim);
    } catch (error) {
      console.error('Error fetching drivers:', error);
      const cachedCdi = getCachedCdiDrivers();
      const cachedInterim = getCachedInterimDrivers();
      if (cachedCdi.length > 0 || cachedInterim.length > 0) {
        setCdiDrivers(cachedCdi);
        setInterimDrivers(cachedInterim);
        toast.warning('Mode hors-ligne : données du cache');
      }
    } finally {
      setLoading(false);
      fetchInProgressRef.current = false;
    }
  }, [authUserId, licenseId]);

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
                  setCachedDrivers(cdiDrivers, updated);
                  return updated;
                });
              } else {
                setCdiDrivers(prev => {
                  const exists = prev.find(d => d.id === data.id);
                  const updated = exists ? prev.map(d => d.id === data.id ? data : d) : [data, ...prev];
                  setCachedDrivers(updated, interimDrivers);
                  return updated;
                });
              }
            }
          } else if (payload.eventType === 'DELETE') {
            const localId = (payload.old as any).local_id;
            setCdiDrivers(prev => {
              const updated = prev.filter(d => d.id !== localId);
              setCachedDrivers(updated, interimDrivers);
              return updated;
            });
            setInterimDrivers(prev => {
              const updated = prev.filter(d => d.id !== localId);
              setCachedDrivers(cdiDrivers, updated);
              return updated;
            });
          }
        }
      )
      .subscribe();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [licenseId, cdiDrivers, interimDrivers]);

  // Auto-fetch when licenseId becomes available
  useEffect(() => {
    if (licenseId && authUserId) {
      fetchDrivers();
    }
  }, [licenseId, authUserId, fetchDrivers]);

  const createDriver = useCallback(async (driver: Driver, isInterim: boolean = false): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Vous devez être connecté');
        return false;
      }

      const currentLicenseId = await getLicenseId();

      const { error } = await supabase
        .from('user_drivers')
        .insert([{
          user_id: user.id,
          license_id: currentLicenseId,
          local_id: driver.id,
          name: driver.name,
          driver_type: isInterim ? 'interim' : 'cdi',
          base_salary: driver.baseSalary,
          hourly_rate: driver.hourlyRate,
          driver_data: JSON.parse(JSON.stringify(driver)),
        }]);

      if (error) throw error;

      if (isInterim) {
        setInterimDrivers(prev => {
          const updated = [driver, ...prev];
          setCachedDrivers(cdiDrivers, updated);
          return updated;
        });
      } else {
        setCdiDrivers(prev => {
          const updated = [driver, ...prev];
          setCachedDrivers(updated, interimDrivers);
          return updated;
        });
      }
      toast.success('Conducteur ajouté');
      return true;
    } catch (error) {
      console.error('Error creating driver:', error);
      toast.error('Erreur lors de la création');
      return false;
    }
  }, [cdiDrivers, interimDrivers]);

  const updateDriver = useCallback(async (driver: Driver, isInterim: boolean = false): Promise<boolean> => {
    try {
      const currentLicenseId = await getLicenseId();

      const { error } = await supabase
        .from('user_drivers')
        .update({
          name: driver.name,
          driver_type: isInterim ? 'interim' : 'cdi',
          base_salary: driver.baseSalary,
          hourly_rate: driver.hourlyRate,
          driver_data: JSON.parse(JSON.stringify(driver)),
          synced_at: new Date().toISOString(),
        })
        .eq('license_id', currentLicenseId)
        .eq('local_id', driver.id);

      if (error) throw error;

      if (isInterim) {
        setInterimDrivers(prev => {
          const updated = prev.map(d => d.id === driver.id ? driver : d);
          setCachedDrivers(cdiDrivers, updated);
          return updated;
        });
      } else {
        setCdiDrivers(prev => {
          const updated = prev.map(d => d.id === driver.id ? driver : d);
          setCachedDrivers(updated, interimDrivers);
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
  }, [cdiDrivers, interimDrivers]);

  const deleteDriver = useCallback(async (id: string, isInterim: boolean = false): Promise<boolean> => {
    try {
      const currentLicenseId = await getLicenseId();

      const { error } = await supabase
        .from('user_drivers')
        .delete()
        .eq('license_id', currentLicenseId)
        .eq('local_id', id);

      if (error) throw error;

      if (isInterim) {
        setInterimDrivers(prev => {
          const updated = prev.filter(d => d.id !== id);
          setCachedDrivers(cdiDrivers, updated);
          return updated;
        });
      } else {
        setCdiDrivers(prev => {
          const updated = prev.filter(d => d.id !== id);
          setCachedDrivers(updated, interimDrivers);
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
  }, [cdiDrivers, interimDrivers]);

  return {
    cdiDrivers,
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
