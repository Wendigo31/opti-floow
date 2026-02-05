import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Vehicle } from '@/types/vehicle';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { useLicenseContext } from '@/context/LicenseContext';

// Local storage key for offline cache
const CACHE_KEY = 'optiflow_vehicles_cache';

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
  } catch (e) {
    console.error('Failed to cache vehicles:', e);
  }
}

export function useCloudVehicles() {
  const { licenseId, authUserId, isLoading: contextLoading } = useLicenseContext();
  const [vehicles, setVehicles] = useState<Vehicle[]>(() => getCachedVehicles());
  const [loading, setLoading] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const fetchInProgressRef = useRef(false);

  // Keep latest state in ref to avoid stale closures in realtime handlers
  const vehiclesRef = useRef<Vehicle[]>(vehicles);
  useEffect(() => { vehiclesRef.current = vehicles; }, [vehicles]);

  const fetchVehicles = useCallback(async (): Promise<void> => {
    // Prevent concurrent fetches
    if (fetchInProgressRef.current) return;
    
    if (!authUserId || !licenseId) {
      setVehicles(getCachedVehicles());
      return;
    }

    fetchInProgressRef.current = true;
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('user_vehicles')
        .select('vehicle_data')
        .eq('license_id', licenseId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mappedVehicles: Vehicle[] = (data || [])
        .map(row => row.vehicle_data as unknown as Vehicle)
        .filter(Boolean);
      
      setVehicles(mappedVehicles);
      setCachedVehicles(mappedVehicles);
    } catch (error) {
      console.error('Error fetching vehicles:', error);
      const cached = getCachedVehicles();
      if (cached.length > 0) {
        setVehicles(cached);
        toast.warning('Mode hors-ligne : données du cache utilisées');
      }
    } finally {
      setLoading(false);
      fetchInProgressRef.current = false;
    }
  }, [authUserId, licenseId]);

  // Store fetchVehicles in ref to avoid subscription churn
  const fetchVehiclesRef = useRef<() => Promise<void>>();
  useEffect(() => { fetchVehiclesRef.current = fetchVehicles; }, [fetchVehicles]);

  // Realtime subscription - only when licenseId is available
  useEffect(() => {
    if (!licenseId) return;

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
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const vehicleData = (payload.new as any).vehicle_data as Vehicle;
            if (vehicleData) {
              setVehicles(prev => {
                const exists = prev.find(v => v.id === vehicleData.id);
                const updated = exists 
                  ? prev.map(v => v.id === vehicleData.id ? vehicleData : v)
                  : [vehicleData, ...prev];
                vehiclesRef.current = updated;
                setCachedVehicles(updated);
                return updated;
              });
            }
          } else if (payload.eventType === 'DELETE') {
            const localId = (payload.old as any).local_id;
            setVehicles(prev => {
              const updated = prev.filter(v => v.id !== localId);
              vehiclesRef.current = updated;
              setCachedVehicles(updated);
              return updated;
            });
          }
        }
      )
      .subscribe((status) => {
        console.log('[Realtime] vehicles subscription:', status);
        // After (re-)subscribe, reconcile any missed events
        if (status === 'SUBSCRIBED') {
          void fetchVehiclesRef.current?.();
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
      fetchVehicles();
    }
  }, [licenseId, authUserId, fetchVehicles]);

  const createVehicle = useCallback(async (vehicle: Vehicle): Promise<boolean> => {
    try {
      if (!authUserId || !licenseId) {
        if (!contextLoading) {
          toast.error('Session non initialisée. Veuillez recharger la page.');
        }
        return false;
      }

      const { error } = await supabase
        .from('user_vehicles')
        .insert([{
          user_id: authUserId,
          license_id: licenseId,
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

      // Optimistic update
      setVehicles(prev => {
        const updated = [vehicle, ...prev];
        setCachedVehicles(updated);
        return updated;
      });
      toast.success('Véhicule ajouté');
      return true;
    } catch (error) {
      console.error('Error creating vehicle:', error);
      toast.error('Erreur lors de la création');
      return false;
    }
  }, [authUserId, licenseId]);

  const updateVehicle = useCallback(async (vehicle: Vehicle): Promise<boolean> => {
    try {
      if (!licenseId) {
        toast.error('Session en cours de chargement...');
        return false;
      }

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
        .eq('license_id', licenseId)
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
  }, [licenseId]);

  const deleteVehicle = useCallback(async (id: string): Promise<boolean> => {
    try {
      if (!licenseId) {
        toast.error('Session en cours de chargement...');
        return false;
      }

      const { error } = await supabase
        .from('user_vehicles')
        .delete()
        .eq('license_id', licenseId)
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
  }, [licenseId]);

  return {
    vehicles,
    loading,
    fetchVehicles,
    createVehicle,
    updateVehicle,
    deleteVehicle,
    setVehicles,
  };
}
