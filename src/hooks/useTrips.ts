import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLicenseContext, getLicenseId as getContextLicenseId } from '@/context/LicenseContext';
import { toast } from 'sonner';
import type { LocalTrip } from '@/types/local';
import { generateId } from '@/types/local';
import type { Json } from '@/integrations/supabase/types';
import type { RealtimeChannel } from '@supabase/supabase-js';

export function useTrips() {
  const { licenseId, authUserId } = useLicenseContext();
  const [trips, setTrips] = useState<LocalTrip[]>([]);
  const [loading, setLoading] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const fetchInProgressRef = useRef(false);

  // Keep latest state in ref for realtime handlers
  const tripsRef = useRef<LocalTrip[]>(trips);
  useEffect(() => { tripsRef.current = trips; }, [trips]);

  const fetchTrips = useCallback(async () => {
    if (fetchInProgressRef.current) return;
    
    fetchInProgressRef.current = true;
    setLoading(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        fetchInProgressRef.current = false;
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
      tripsRef.current = mappedTrips;
    } catch (error) {
      console.error('Error fetching trips:', error);
      toast.error('Erreur lors du chargement des trajets');
    } finally {
      setLoading(false);
      fetchInProgressRef.current = false;
    }
  }, []);

  // Store fetchTrips in ref to avoid subscription churn
  const fetchTripsRef = useRef<() => Promise<void>>();
  useEffect(() => { fetchTripsRef.current = fetchTrips; }, [fetchTrips]);

  const createTrip = useCallback(async (input: Omit<LocalTrip, 'id' | 'created_at' | 'updated_at'>): Promise<LocalTrip | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Vous devez être connecté');
        return null;
      }

      const currentLicenseId = await getContextLicenseId();

      const { data, error } = await supabase
        .from('trips')
        .insert({
          user_id: user.id,
          license_id: currentLicenseId,
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
      tripsRef.current = [newTrip, ...tripsRef.current];
      toast.success('Trajet enregistré');
      return newTrip;
    } catch (error) {
      console.error('Error creating trip:', error);
      toast.error('Erreur lors de l\'enregistrement');
      return null;
    }
  }, []);

  const updateTrip = useCallback(async (id: string, updates: Partial<LocalTrip>): Promise<boolean> => {
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
  }, []);

  const deleteTrip = useCallback(async (id: string): Promise<boolean> => {
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
  }, []);

  const getTripsByClient = useCallback((clientId: string): LocalTrip[] => {
    return trips.filter(t => t.client_id === clientId);
  }, [trips]);

  // Setup realtime subscription for company-level sync
  useEffect(() => {
    if (!licenseId) return;

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
              const updated = [newTrip, ...prev];
              tripsRef.current = updated;
              return updated;
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
            setTrips(prev => {
              const updated = prev.map(trip => trip.id === updatedTrip.id ? updatedTrip : trip);
              tripsRef.current = updated;
              return updated;
            });
          } else if (payload.eventType === 'DELETE') {
            const deletedId = (payload.old as any).id;
            setTrips(prev => {
              const updated = prev.filter(trip => trip.id !== deletedId);
              tripsRef.current = updated;
              return updated;
            });
          }
        }
      )
      .subscribe((status) => {
        console.log('[Realtime] trips subscription:', status);
        // Reconcile on subscribe
        if (status === 'SUBSCRIBED') {
          void fetchTripsRef.current?.();
        }
      });

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [licenseId]); // Only depend on licenseId to prevent subscription churn

  // Initial fetch
  useEffect(() => {
    if (authUserId) {
      fetchTrips();
    }
  }, [authUserId, fetchTrips]);

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
