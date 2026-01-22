import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Vehicle } from '@/types/vehicle';
import type { RealtimeChannel } from '@supabase/supabase-js';

// Local storage key for offline cache
const CACHE_KEY = 'optiflow_vehicles_cache';
const CACHE_TIMESTAMP_KEY = 'optiflow_vehicles_cache_ts';

// Check if demo mode is active
function isDemoModeActive(): boolean {
  try {
    const demoState = JSON.parse(localStorage.getItem('optiflow_demo_mode') || '{}');
    return demoState.isActive === true;
  } catch {
    return false;
  }
}

// Get demo vehicles from localStorage
function getDemoVehicles(): Vehicle[] {
  try {
    return JSON.parse(localStorage.getItem('optiflow_vehicles') || '[]');
  } catch {
    return [];
  }
}

// Get cached vehicles for offline support
function getCachedVehicles(): Vehicle[] {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) || '[]');
  } catch {
    return [];
  }
}

// Save vehicles to cache
function setCachedVehicles(vehicles: Vehicle[]) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(vehicles));
    localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
  } catch (e) {
    console.error('Failed to cache vehicles:', e);
  }
}

// Get user's license_id for company-level sync
async function getUserLicenseId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  
  const { data } = await supabase
    .from('company_users')
    .select('license_id')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .maybeSingle();
  
  return data?.license_id || null;
}

export function useCloudVehicles() {
  const [vehicles, setVehicles] = useState<Vehicle[]>(() => getCachedVehicles());
  const [loading, setLoading] = useState(false);
  const [licenseId, setLicenseId] = useState<string | null>(null);
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const isDemo = isDemoModeActive();

  // Track auth state
  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!isMounted) return;
      setAuthUserId(user?.id || null);

      if (user) {
        const lid = await getUserLicenseId();
        if (!isMounted) return;
        setLicenseId(lid);
      } else {
        setLicenseId(null);
      }
    };

    void init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const user = session?.user || null;
      setAuthUserId(user?.id || null);
      if (user) {
        const lid = await getUserLicenseId();
        setLicenseId(lid);
      } else {
        setLicenseId(null);
        setVehicles([]);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const fetchVehicles = useCallback(async (): Promise<void> => {
    setLoading(true);

    if (isDemo) {
      setVehicles(getDemoVehicles());
      setLoading(false);
      return;
    }

    if (!authUserId) {
      setLoading(false);
      return;
    }

    try {
      const fetchedLicenseId = await getUserLicenseId();
      setLicenseId(fetchedLicenseId);

      const { data, error } = await supabase
        .from('user_vehicles')
        .select('*')
        .eq('license_id', fetchedLicenseId || '')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mappedVehicles: Vehicle[] = (data || []).map(row => row.vehicle_data as unknown as Vehicle).filter(Boolean);
      
      setVehicles(mappedVehicles);
      setCachedVehicles(mappedVehicles);
    } catch (error) {
      console.error('Error fetching vehicles:', error);
      // Use cache as fallback
      const cached = getCachedVehicles();
      if (cached.length > 0) {
        setVehicles(cached);
        toast.warning('Mode hors-ligne : données du cache utilisées');
      }
    } finally {
      setLoading(false);
    }
  }, [isDemo, authUserId]);

  // Auto-fetch when authenticated
  useEffect(() => {
    if (authUserId && !isDemo) {
      fetchVehicles();
    }
  }, [authUserId, isDemo, fetchVehicles]);

  // Realtime subscription
  useEffect(() => {
    if (isDemo || !licenseId) return;

    channelRef.current = supabase
      .channel(`vehicles_${licenseId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_vehicles',
          filter: `license_id=eq.${licenseId}`,
        },
        (payload) => {
          console.log('[Realtime] user_vehicles change:', payload.eventType);
          
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const vehicleData = (payload.new as any).vehicle_data as Vehicle;
            if (vehicleData) {
              setVehicles(prev => {
                const exists = prev.find(v => v.id === vehicleData.id);
                const updated = exists 
                  ? prev.map(v => v.id === vehicleData.id ? vehicleData : v)
                  : [vehicleData, ...prev];
                setCachedVehicles(updated);
                return updated;
              });
            }
          } else if (payload.eventType === 'DELETE') {
            const localId = (payload.old as any).local_id;
            setVehicles(prev => {
              const updated = prev.filter(v => v.id !== localId);
              setCachedVehicles(updated);
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
  }, [licenseId, isDemo]);

  const createVehicle = useCallback(async (vehicle: Vehicle): Promise<boolean> => {
    if (isDemo) {
      const demoVehicles = getDemoVehicles();
      localStorage.setItem('optiflow_vehicles', JSON.stringify([vehicle, ...demoVehicles]));
      setVehicles([vehicle, ...demoVehicles]);
      toast.success('Véhicule ajouté (mode démo)');
      return true;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Vous devez être connecté');
        return false;
      }

      const currentLicenseId = await getUserLicenseId();

      const { error } = await supabase
        .from('user_vehicles')
        .insert([{
          user_id: user.id,
          license_id: currentLicenseId,
          local_id: vehicle.id,
          name: vehicle.name,
          license_plate: vehicle.licensePlate,
          brand: vehicle.brand,
          model: vehicle.model,
          year: vehicle.year,
          vehicle_type: vehicle.type,
          fuel_consumption: vehicle.fuelConsumption,
          fuel_type: vehicle.fuelType,
          current_km: vehicle.currentKm,
          is_active: vehicle.isActive,
          vehicle_data: JSON.parse(JSON.stringify(vehicle)),
        }]);

      if (error) throw error;

      // Optimistic update (realtime will confirm)
      setVehicles(prev => [vehicle, ...prev]);
      setCachedVehicles([vehicle, ...vehicles]);
      toast.success('Véhicule ajouté');
      return true;
    } catch (error) {
      console.error('Error creating vehicle:', error);
      toast.error('Erreur lors de la création');
      return false;
    }
  }, [isDemo, vehicles]);

  const updateVehicle = useCallback(async (vehicle: Vehicle): Promise<boolean> => {
    if (isDemo) {
      const demoVehicles = getDemoVehicles();
      const updated = demoVehicles.map(v => v.id === vehicle.id ? vehicle : v);
      localStorage.setItem('optiflow_vehicles', JSON.stringify(updated));
      setVehicles(updated);
      toast.success('Véhicule mis à jour (mode démo)');
      return true;
    }

    try {
      const currentLicenseId = await getUserLicenseId();

      const { error } = await supabase
        .from('user_vehicles')
        .update({
          name: vehicle.name,
          license_plate: vehicle.licensePlate,
          brand: vehicle.brand,
          model: vehicle.model,
          year: vehicle.year,
          vehicle_type: vehicle.type,
          fuel_consumption: vehicle.fuelConsumption,
          fuel_type: vehicle.fuelType,
          current_km: vehicle.currentKm,
          is_active: vehicle.isActive,
          vehicle_data: JSON.parse(JSON.stringify(vehicle)),
          synced_at: new Date().toISOString(),
        })
        .eq('license_id', currentLicenseId)
        .eq('local_id', vehicle.id);

      if (error) throw error;

      setVehicles(prev => {
        const updated = prev.map(v => v.id === vehicle.id ? vehicle : v);
        setCachedVehicles(updated);
        return updated;
      });
      toast.success('Véhicule mis à jour');
      return true;
    } catch (error) {
      console.error('Error updating vehicle:', error);
      toast.error('Erreur lors de la mise à jour');
      return false;
    }
  }, [isDemo]);

  const deleteVehicle = useCallback(async (id: string): Promise<boolean> => {
    if (isDemo) {
      const demoVehicles = getDemoVehicles();
      const updated = demoVehicles.filter(v => v.id !== id);
      localStorage.setItem('optiflow_vehicles', JSON.stringify(updated));
      setVehicles(updated);
      toast.success('Véhicule supprimé (mode démo)');
      return true;
    }

    try {
      const currentLicenseId = await getUserLicenseId();

      const { error } = await supabase
        .from('user_vehicles')
        .delete()
        .eq('license_id', currentLicenseId)
        .eq('local_id', id);

      if (error) throw error;

      setVehicles(prev => {
        const updated = prev.filter(v => v.id !== id);
        setCachedVehicles(updated);
        return updated;
      });
      toast.success('Véhicule supprimé');
      return true;
    } catch (error) {
      console.error('Error deleting vehicle:', error);
      toast.error('Erreur lors de la suppression');
      return false;
    }
  }, [isDemo]);

  return {
    vehicles,
    loading,
    fetchVehicles,
    createVehicle,
    updateVehicle,
    deleteVehicle,
    setVehicles, // For direct state manipulation if needed
  };
}
