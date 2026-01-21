import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLicense } from '@/hooks/useLicense';
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

// Check if demo mode is active
function isDemoModeActive(): boolean {
  try {
    const demoState = JSON.parse(localStorage.getItem('optiflow_demo_mode') || '{}');
    return demoState.isActive === true;
  } catch {
    return false;
  }
}

// Get demo tours from localStorage
function getDemoTours(): SavedTour[] {
  try {
    const tours = JSON.parse(localStorage.getItem('optiflow_saved_tours') || '[]');
    return tours;
  } catch {
    return [];
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

export function useSavedTours() {
  const { licenseData } = useLicense();
  const [tours, setTours] = useState<SavedTour[]>([]);
  const [loading, setLoading] = useState(false);
  const [licenseId, setLicenseId] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const userId = licenseData?.code || 'anonymous';
  const isDemo = isDemoModeActive();

  const fetchTours = useCallback(async () => {
    setLoading(true);
    
    // In demo mode, use localStorage data
    if (isDemo) {
      const demoTours = getDemoTours();
      setTours(demoTours);
      setLoading(false);
      return;
    }
    
    if (!userId) {
      setLoading(false);
      return;
    }
    
    try {
      // Check if user is part of a company for company-level access
      const fetchedLicenseId = await getUserLicenseId();
      setLicenseId(fetchedLicenseId);
      
      // The RLS policies will handle company-level access
      // We just need to query without user_id filter if we have license_id
      const { data, error } = await supabase
        .from('saved_tours')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setTours((data || []).map(mapDbToSavedTour));
    } catch (error) {
      console.error('Error fetching tours:', error);
      toast.error('Erreur lors du chargement des tournées');
    } finally {
      setLoading(false);
    }
  }, [userId, isDemo]);

  // Setup realtime subscription for company-level sync
  useEffect(() => {
    if (isDemo || !licenseId) return;

    // Create channel for realtime sync
    channelRef.current = supabase
      .channel(`saved_tours_${licenseId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'saved_tours',
          filter: `license_id=eq.${licenseId}`,
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
      });

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [licenseId, isDemo]);

  const saveTour = useCallback(async (input: SaveTourInput): Promise<SavedTour | null> => {
    // In demo mode, save to localStorage
    if (isDemo) {
      const newTour: SavedTour = {
        id: `demo-tour-${Date.now()}`,
        user_id: 'demo',
        client_id: input.client_id || null,
        name: input.name,
        origin_address: input.origin_address,
        destination_address: input.destination_address,
        stops: input.stops || [],
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
        vehicle_data: input.vehicle_data || null,
        trailer_id: input.trailer_id || null,
        trailer_data: input.trailer_data || null,
        driver_ids: input.driver_ids || [],
        drivers_data: input.drivers_data || [],
        notes: input.notes || null,
        tags: input.tags || [],
        is_favorite: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      const demoTours = getDemoTours();
      const updatedTours = [newTour, ...demoTours];
      localStorage.setItem('optiflow_saved_tours', JSON.stringify(updatedTours));
      setTours(updatedTours);
      toast.success('Tournée sauvegardée (mode démo)');
      return newTour;
    }

    if (!userId) {
      toast.error('Licence non trouvée');
      return null;
    }

    try {
      // Get the user's license_id for company-level sync
      const licenseId = await getUserLicenseId();

      const tourData = {
        user_id: userId,
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
  }, [userId, isDemo]);

  const updateTour = useCallback(async (id: string, updates: Partial<SaveTourInput>): Promise<boolean> => {
    // In demo mode, update localStorage
    if (isDemo) {
      const demoTours = getDemoTours();
      const updatedTours = demoTours.map(t => 
        t.id === id ? { ...t, ...updates, updated_at: new Date().toISOString() } as SavedTour : t
      );
      localStorage.setItem('optiflow_saved_tours', JSON.stringify(updatedTours));
      setTours(updatedTours);
      toast.success('Tournée mise à jour (mode démo)');
      return true;
    }

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
  }, [isDemo]);

  const deleteTour = useCallback(async (id: string): Promise<boolean> => {
    // In demo mode, delete from localStorage
    if (isDemo) {
      const demoTours = getDemoTours();
      const updatedTours = demoTours.filter(t => t.id !== id);
      localStorage.setItem('optiflow_saved_tours', JSON.stringify(updatedTours));
      setTours(updatedTours);
      toast.success('Tournée supprimée (mode démo)');
      return true;
    }

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
  }, [isDemo]);

  const toggleFavorite = useCallback(async (id: string): Promise<boolean> => {
    const tour = tours.find(t => t.id === id);
    if (!tour) return false;

    // In demo mode, toggle in localStorage
    if (isDemo) {
      const demoTours = getDemoTours();
      const updatedTours = demoTours.map(t => 
        t.id === id ? { ...t, is_favorite: !t.is_favorite } : t
      );
      localStorage.setItem('optiflow_saved_tours', JSON.stringify(updatedTours));
      setTours(updatedTours);
      return true;
    }

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
  }, [tours, isDemo]);

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
