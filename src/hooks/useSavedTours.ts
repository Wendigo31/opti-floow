import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { SavedTour, SaveTourInput, TourStop } from '@/types/savedTour';
import type { Json } from '@/integrations/supabase/types';
import type { RealtimeChannel } from '@supabase/supabase-js';

// Helper to convert database row to SavedTour
function mapDbToSavedTour(row: any): SavedTour {
  return {
    ...row,
    stops: (row.stops as TourStop[]) || [],
    driver_ids: row.driver_ids || [],
    drivers_data: row.drivers_data || [],
    tags: row.tags || [],
  };
}

// Get user's license_id for company-level sync
async function getUserLicenseId(userId?: string): Promise<string | null> {
  const uid = userId || (await supabase.auth.getUser()).data.user?.id;
  if (!uid) return null;

  const { data, error } = await supabase
    .from('company_users')
    .select('license_id')
    .eq('user_id', uid)
    .eq('is_active', true)
    .maybeSingle();

  if (error) {
    // Don't throw: company membership is optional and RLS/network hiccups shouldn't break tours loading.
    console.warn('[useSavedTours] Failed to fetch license_id from company_users:', error);
    return null;
  }

  return data?.license_id || null;
}

export function useSavedTours() {
  const [tours, setTours] = useState<SavedTour[]>([]);
  const [loading, setLoading] = useState(false);
  const [licenseId, setLicenseId] = useState<string | null>(null);
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const inFlightRef = useRef<Promise<void> | null>(null);
  const lastToastAtRef = useRef<number>(0);

  // Track auth state (prevents "anonymous" calls that trigger RLS errors)
  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!isMounted) return;
      setAuthUserId(user?.id || null);

      if (user) {
        const lid = await getUserLicenseId(user.id);
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
        const lid = await getUserLicenseId(user.id);
        setLicenseId(lid);
      } else {
        setLicenseId(null);
        setTours([]);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const fetchToursCore = useCallback(async (): Promise<void> => {
    setLoading(true);

    // Not authenticated yet → don't spam error toast
    if (!authUserId) {
      console.log('[useSavedTours] No authUserId yet, skipping fetch');
      setLoading(false);
      return;
    }

    try {
      // Check if user is part of a company for company-level access
      const fetchedLicenseId = await getUserLicenseId(authUserId);
      console.log('[useSavedTours] Fetching tours for user:', authUserId, 'licenseId:', fetchedLicenseId);
      setLicenseId(fetchedLicenseId);

      // Scope query to company when possible (keeps fast + avoids loading noise)
      let query = supabase
        .from('saved_tours')
        .select('*');

      if (fetchedLicenseId) {
        // Company tours + personal tours
        query = query.or(`license_id.eq.${fetchedLicenseId},user_id.eq.${authUserId}`);
      } else {
        // Personal only
        query = query.eq('user_id', authUserId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      console.log('[useSavedTours] Fetched', data?.length || 0, 'tours');
      setTours((data || []).map(mapDbToSavedTour));
    } catch (error) {
      console.error('Error fetching tours:', error);

      // Prevent toast spam during navigation: max 1 toast / 10s.
      const now = Date.now();
      if (now - lastToastAtRef.current > 10_000) {
        lastToastAtRef.current = now;
        toast.error('Erreur lors du chargement des tournées', {
          action: {
            label: 'Réessayer',
            onClick: () => {
              inFlightRef.current = null; // Reset to allow retry
              void fetchToursCore();
            },
          },
        });
      }
    } finally {
      setLoading(false);
    }
  }, [authUserId]);

  const fetchTours = useCallback(async (): Promise<void> => {
    // De-duplicate calls across pages/components to avoid spam during navigation.
    if (inFlightRef.current) return inFlightRef.current;

    const run = fetchToursCore();
    inFlightRef.current = run;
    try {
      await run;
    } finally {
      inFlightRef.current = null;
    }
  }, [fetchToursCore]);

  // Auto-fetch tours when user is authenticated
  useEffect(() => {
    if (authUserId) {
      console.log('[useSavedTours] Auth user changed, fetching tours...');
      fetchTours();
    }
  }, [authUserId, fetchTours]);

  // Setup realtime subscription for company-level sync
  useEffect(() => {
    if (!authUserId) return;

    // Create channel for realtime sync
    const filter = licenseId ? `license_id=eq.${licenseId}` : `user_id=eq.${authUserId}`;
    channelRef.current = supabase
      .channel(`saved_tours_${licenseId || authUserId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'saved_tours',
          filter,
        },
        (payload) => {
          console.log('[Realtime] saved_tours change:', payload.eventType);
          
          if (payload.eventType === 'INSERT') {
            const newTour = mapDbToSavedTour(payload.new);
            setTours(prev => {
              // Avoid duplicates
              if (prev.find(t => t.id === newTour.id)) return prev;
              return [newTour, ...prev];
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedTour = mapDbToSavedTour(payload.new);
            setTours(prev => prev.map(t => t.id === updatedTour.id ? updatedTour : t));
          } else if (payload.eventType === 'DELETE') {
            const deletedId = (payload.old as any).id;
            setTours(prev => prev.filter(t => t.id !== deletedId));
          }
        }
      )
      .subscribe((status) => {
        console.log('[Realtime] saved_tours subscription:', status);
        // After (re-)subscribe, reconcile any missed events
        if (status === 'SUBSCRIBED') {
          void fetchTours();
        }
      });

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [licenseId, authUserId, fetchTours]);

  const saveTour = useCallback(async (input: SaveTourInput): Promise<SavedTour | null> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error('Vous devez être connecté');
      return null;
    }

    try {
      // Get the user's license_id for company-level sync
      const licenseId = await getUserLicenseId();
      setLicenseId(licenseId);

      const tourData = {
        user_id: user.id,
        license_id: licenseId,
        client_id: input.client_id || null,
        name: input.name,
        origin_address: input.origin_address,
        destination_address: input.destination_address,
        stops: (input.stops || []) as unknown as Json,
        distance_km: input.distance_km,
        duration_minutes: input.duration_minutes || 0,
        toll_cost: input.toll_cost,
        fuel_cost: input.fuel_cost,
        adblue_cost: input.adblue_cost,
        driver_cost: input.driver_cost,
        structure_cost: input.structure_cost,
        vehicle_cost: input.vehicle_cost,
        total_cost: input.total_cost,
        pricing_mode: input.pricing_mode,
        price_per_km: input.price_per_km || 0,
        fixed_price: input.fixed_price || 0,
        target_margin: input.target_margin || 15,
        revenue: input.revenue,
        profit: input.profit,
        profit_margin: input.profit_margin,
        vehicle_id: input.vehicle_id || null,
        vehicle_data: (input.vehicle_data || null) as Json,
        trailer_id: input.trailer_id || null,
        trailer_data: (input.trailer_data || null) as Json,
        driver_ids: input.driver_ids || [],
        drivers_data: (input.drivers_data || []) as unknown as Json,
        notes: input.notes || null,
        tags: input.tags || [],
      };

      const { data, error } = await supabase
        .from('saved_tours')
        .insert(tourData)
        .select()
        .single();

      if (error) throw error;

      const newTour = mapDbToSavedTour(data);
      setTours(prev => [newTour, ...prev]);
      toast.success('Tournée sauvegardée avec succès');
      return newTour;
    } catch (error) {
      console.error('Error saving tour:', error);
      toast.error('Erreur lors de la sauvegarde');
      return null;
    }
  }, []);

  const updateTour = useCallback(async (id: string, updates: Partial<SaveTourInput>): Promise<boolean> => {
    try {
      // Convert to DB-compatible format
      const dbUpdates: Record<string, any> = { ...updates };
      if (updates.stops) {
        dbUpdates.stops = updates.stops as unknown as Json;
      }
      if (updates.vehicle_data) {
        dbUpdates.vehicle_data = updates.vehicle_data as Json;
      }
      if (updates.drivers_data) {
        dbUpdates.drivers_data = updates.drivers_data as unknown as Json;
      }
      if (updates.trailer_data) {
        dbUpdates.trailer_data = updates.trailer_data as Json;
      }

      // RLS will check if user can update (own or company)
      const { error } = await supabase
        .from('saved_tours')
        .update(dbUpdates)
        .eq('id', id);

      if (error) throw error;

      setTours(prev => prev.map(t => t.id === id ? { ...t, ...updates } as SavedTour : t));
      toast.success('Tournée mise à jour');
      return true;
    } catch (error) {
      console.error('Error updating tour:', error);
      toast.error('Erreur lors de la mise à jour');
      return false;
    }
  }, []);

  const deleteTour = useCallback(async (id: string): Promise<boolean> => {
    try {
      // RLS will check if user can delete (own or company)
      const { error } = await supabase
        .from('saved_tours')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setTours(prev => prev.filter(t => t.id !== id));
      toast.success('Tournée supprimée');
      return true;
    } catch (error) {
      console.error('Error deleting tour:', error);
      toast.error('Erreur lors de la suppression');
      return false;
    }
  }, []);

  const toggleFavorite = useCallback(async (id: string): Promise<boolean> => {
    const tour = tours.find(t => t.id === id);
    if (!tour) return false;

    try {
      // RLS will check if user can update (own or company)
      const { error } = await supabase
        .from('saved_tours')
        .update({ is_favorite: !tour.is_favorite })
        .eq('id', id);

      if (error) throw error;

      setTours(prev => prev.map(t => 
        t.id === id ? { ...t, is_favorite: !t.is_favorite } : t
      ));
      return true;
    } catch (error) {
      console.error('Error toggling favorite:', error);
      return false;
    }
  }, [tours]);

  const getToursByClient = useCallback((clientId: string) => {
    return tours.filter(t => t.client_id === clientId);
  }, [tours]);

  const getFavorites = useCallback(() => {
    return tours.filter(t => t.is_favorite);
  }, [tours]);

  return {
    tours,
    loading,
    fetchTours,
    saveTour,
    updateTour,
    deleteTour,
    toggleFavorite,
    getToursByClient,
    getFavorites,
  };
}
