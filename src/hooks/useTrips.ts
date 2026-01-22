import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLicense } from '@/hooks/useLicense';
import { toast } from 'sonner';
import type { LocalTrip } from '@/types/local';
import { generateId } from '@/types/local';
import type { Json } from '@/integrations/supabase/types';
import type { RealtimeChannel } from '@supabase/supabase-js';

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

// Check if demo mode is active
function isDemoModeActive(): boolean {
  try {
    const demoState = JSON.parse(localStorage.getItem('optiflow_demo_mode') || '{}');
    return demoState.isActive === true;
  } catch {
    return false;
  }
}

// Get demo trips from localStorage
function getDemoTrips(): LocalTrip[] {
  try {
    return JSON.parse(localStorage.getItem('optiflow_trips') || '[]');
  } catch {
    return [];
  }
}

export function useTrips() {
  useLicense(); // Hook must be called for licensing context
  const [trips, setTrips] = useState<LocalTrip[]>([]);
  const [loading, setLoading] = useState(false);
  const [licenseId, setLicenseId] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  
  const isDemo = isDemoModeActive();

  const fetchTrips = useCallback(async () => {
    setLoading(true);
    
    if (isDemo) {
      setTrips(getDemoTrips());
      setLoading(false);
      return;
    }
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Fetch trips (RLS handles company-level access)
      const { data, error } = await supabase
        .from('trips')
        .select('*')
        .order('trip_date', { ascending: false });

      if (error) throw error;

      const mappedTrips: LocalTrip[] = (data || []).map(t => ({
        id: t.id,
        client_id: t.client_id,
        origin_address: t.origin_address,
        destination_address: t.destination_address,
        origin_lat: t.origin_lat,
        origin_lng: t.origin_lng,
        destination_lat: t.destination_lat,
        destination_lng: t.destination_lng,
        distance_km: t.distance_km,
        duration_minutes: t.duration_minutes,
        fuel_cost: t.fuel_cost,
        toll_cost: t.toll_cost,
        driver_cost: t.driver_cost,
        adblue_cost: t.adblue_cost,
        structure_cost: t.structure_cost,
        total_cost: t.total_cost,
        revenue: t.revenue,
        profit: t.profit,
        profit_margin: t.profit_margin,
        trip_date: t.trip_date,
        status: t.status,
        notes: t.notes,
        stops: t.stops,
        vehicle_data: t.vehicle_data,
        driver_ids: t.driver_ids,
        created_at: t.created_at,
        updated_at: t.updated_at,
      }));

      setTrips(mappedTrips);
    } catch (error) {
      console.error('Error fetching trips:', error);
      toast.error('Erreur lors du chargement des trajets');
    } finally {
      setLoading(false);
    }
  }, [isDemo]);

  const createTrip = useCallback(async (input: Omit<LocalTrip, 'id' | 'created_at' | 'updated_at'>): Promise<LocalTrip | null> => {
    if (isDemo) {
      const newTrip: LocalTrip = {
        id: generateId(),
        ...input,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      const demoTrips = getDemoTrips();
      const updated = [newTrip, ...demoTrips];
      localStorage.setItem('optiflow_trips', JSON.stringify(updated));
      setTrips(updated);
      toast.success('Trajet ajouté (mode démo)');
      return newTrip;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Vous devez être connecté');
        return null;
      }

      const licenseId = await getUserLicenseId();

      const { data, error } = await supabase
        .from('trips')
        .insert({
          user_id: user.id,
          license_id: licenseId,
          client_id: input.client_id,
          origin_address: input.origin_address,
          destination_address: input.destination_address,
          origin_lat: input.origin_lat,
          origin_lng: input.origin_lng,
          destination_lat: input.destination_lat,
          destination_lng: input.destination_lng,
          distance_km: input.distance_km,
          duration_minutes: input.duration_minutes,
          fuel_cost: input.fuel_cost,
          toll_cost: input.toll_cost,
          driver_cost: input.driver_cost,
          adblue_cost: input.adblue_cost,
          structure_cost: input.structure_cost,
          total_cost: input.total_cost,
          revenue: input.revenue,
          profit: input.profit,
          profit_margin: input.profit_margin,
          trip_date: input.trip_date,
          status: input.status,
          notes: input.notes,
          stops: input.stops as Json,
          vehicle_data: input.vehicle_data as Json,
          driver_ids: input.driver_ids,
        })
        .select()
        .single();

      if (error) throw error;

      const newTrip: LocalTrip = {
        id: data.id,
        client_id: data.client_id,
        origin_address: data.origin_address,
        destination_address: data.destination_address,
        origin_lat: data.origin_lat,
        origin_lng: data.origin_lng,
        destination_lat: data.destination_lat,
        destination_lng: data.destination_lng,
        distance_km: data.distance_km,
        duration_minutes: data.duration_minutes,
        fuel_cost: data.fuel_cost,
        toll_cost: data.toll_cost,
        driver_cost: data.driver_cost,
        adblue_cost: data.adblue_cost,
        structure_cost: data.structure_cost,
        total_cost: data.total_cost,
        revenue: data.revenue,
        profit: data.profit,
        profit_margin: data.profit_margin,
        trip_date: data.trip_date,
        status: data.status,
        notes: data.notes,
        stops: data.stops,
        vehicle_data: data.vehicle_data,
        driver_ids: data.driver_ids,
        created_at: data.created_at,
        updated_at: data.updated_at,
      };

      setTrips(prev => [newTrip, ...prev]);
      toast.success('Trajet enregistré');
      return newTrip;
    } catch (error) {
      console.error('Error creating trip:', error);
      toast.error('Erreur lors de l\'enregistrement');
      return null;
    }
  }, [isDemo]);

  const updateTrip = useCallback(async (id: string, updates: Partial<LocalTrip>): Promise<boolean> => {
    if (isDemo) {
      const demoTrips = getDemoTrips();
      const updated = demoTrips.map(t => 
        t.id === id ? { ...t, ...updates, updated_at: new Date().toISOString() } : t
      );
      localStorage.setItem('optiflow_trips', JSON.stringify(updated));
      setTrips(updated);
      toast.success('Trajet mis à jour (mode démo)');
      return true;
    }

    try {
      const dbUpdates: Record<string, any> = { ...updates, updated_at: new Date().toISOString() };
      if (updates.stops) dbUpdates.stops = updates.stops as Json;
      if (updates.vehicle_data) dbUpdates.vehicle_data = updates.vehicle_data as Json;

      const { error } = await supabase
        .from('trips')
        .update(dbUpdates)
        .eq('id', id);

      if (error) throw error;

      setTrips(prev => prev.map(t => 
        t.id === id ? { ...t, ...updates, updated_at: new Date().toISOString() } : t
      ));
      toast.success('Trajet mis à jour');
      return true;
    } catch (error) {
      console.error('Error updating trip:', error);
      toast.error('Erreur lors de la mise à jour');
      return false;
    }
  }, [isDemo]);

  const deleteTrip = useCallback(async (id: string): Promise<boolean> => {
    if (isDemo) {
      const demoTrips = getDemoTrips();
      localStorage.setItem('optiflow_trips', JSON.stringify(demoTrips.filter(t => t.id !== id)));
      setTrips(demoTrips.filter(t => t.id !== id));
      toast.success('Trajet supprimé (mode démo)');
      return true;
    }

    try {
      const { error } = await supabase.from('trips').delete().eq('id', id);

      if (error) throw error;

      setTrips(prev => prev.filter(t => t.id !== id));
      toast.success('Trajet supprimé');
      return true;
    } catch (error) {
      console.error('Error deleting trip:', error);
      toast.error('Erreur lors de la suppression');
      return false;
    }
  }, [isDemo]);

  const getTripsByClient = useCallback((clientId: string): LocalTrip[] => {
    return trips.filter(t => t.client_id === clientId);
  }, [trips]);

  // Fetch license ID on mount
  useEffect(() => {
    if (!isDemo) {
      getUserLicenseId().then(setLicenseId);
    }
  }, [isDemo]);

  // Setup realtime subscription for company-level sync
  useEffect(() => {
    if (isDemo || !licenseId) return;

    channelRef.current = supabase
      .channel(`trips_${licenseId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trips',
          filter: `license_id=eq.${licenseId}`,
        },
        (payload) => {
          console.log('[Realtime] trips change:', payload.eventType);
          
          if (payload.eventType === 'INSERT') {
            const t = payload.new as any;
            const newTrip: LocalTrip = {
              id: t.id,
              client_id: t.client_id,
              origin_address: t.origin_address,
              destination_address: t.destination_address,
              origin_lat: t.origin_lat,
              origin_lng: t.origin_lng,
              destination_lat: t.destination_lat,
              destination_lng: t.destination_lng,
              distance_km: t.distance_km,
              duration_minutes: t.duration_minutes,
              fuel_cost: t.fuel_cost,
              toll_cost: t.toll_cost,
              driver_cost: t.driver_cost,
              adblue_cost: t.adblue_cost,
              structure_cost: t.structure_cost,
              total_cost: t.total_cost,
              revenue: t.revenue,
              profit: t.profit,
              profit_margin: t.profit_margin,
              trip_date: t.trip_date,
              status: t.status,
              notes: t.notes,
              stops: t.stops,
              vehicle_data: t.vehicle_data,
              driver_ids: t.driver_ids,
              created_at: t.created_at,
              updated_at: t.updated_at,
            };
            setTrips(prev => {
              if (prev.find(trip => trip.id === newTrip.id)) return prev;
              return [newTrip, ...prev];
            });
          } else if (payload.eventType === 'UPDATE') {
            const t = payload.new as any;
            const updatedTrip: LocalTrip = {
              id: t.id,
              client_id: t.client_id,
              origin_address: t.origin_address,
              destination_address: t.destination_address,
              origin_lat: t.origin_lat,
              origin_lng: t.origin_lng,
              destination_lat: t.destination_lat,
              destination_lng: t.destination_lng,
              distance_km: t.distance_km,
              duration_minutes: t.duration_minutes,
              fuel_cost: t.fuel_cost,
              toll_cost: t.toll_cost,
              driver_cost: t.driver_cost,
              adblue_cost: t.adblue_cost,
              structure_cost: t.structure_cost,
              total_cost: t.total_cost,
              revenue: t.revenue,
              profit: t.profit,
              profit_margin: t.profit_margin,
              trip_date: t.trip_date,
              status: t.status,
              notes: t.notes,
              stops: t.stops,
              vehicle_data: t.vehicle_data,
              driver_ids: t.driver_ids,
              created_at: t.created_at,
              updated_at: t.updated_at,
            };
            setTrips(prev => prev.map(trip => trip.id === updatedTrip.id ? updatedTrip : trip));
          } else if (payload.eventType === 'DELETE') {
            const deletedId = (payload.old as any).id;
            setTrips(prev => prev.filter(trip => trip.id !== deletedId));
          }
        }
      )
      .subscribe((status) => {
        console.log('[Realtime] trips subscription:', status);
      });

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [licenseId, isDemo]);

  // Initial fetch
  useEffect(() => {
    fetchTrips();
  }, [fetchTrips]);

  return {
    trips,
    loading,
    fetchTrips,
    createTrip,
    updateTrip,
    deleteTrip,
    getTripsByClient,
  };
}
