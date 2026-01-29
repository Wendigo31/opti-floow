import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Position {
  lat: number;
  lon: number;
}

interface Waypoint {
  id: string;
  address: string;
  position: Position | null;
}

interface RouteResult {
  distance: number;
  duration: number;
  tollCost: number;
  fuelCost: number;
  coordinates: [number, number][];
  type: 'highway' | 'national';
}

interface ItineraryState {
  originAddress: string;
  originPosition: Position | null;
  destinationAddress: string;
  destinationPosition: Position | null;
  stops: Waypoint[];
  selectedVehicleId: string | null;
  selectedClientId: string | null;
  avoidLowBridges: boolean;
  avoidWeightRestrictions: boolean;
  avoidTruckForbidden: boolean;
  highwayRoute: RouteResult | null;
  nationalRoute: RouteResult | null;
  selectedRouteType: 'highway' | 'national';
  isPanelOpen: boolean;
}

export interface TeamMemberSession {
  id: string;
  userId: string;
  displayName: string | null;
  originAddress: string;
  destinationAddress: string;
  stops: Waypoint[];
  lastActivityAt: string;
  isCurrentUser: boolean;
}

interface DbSession {
  id: string;
  user_id: string;
  license_id: string | null;
  display_name: string | null;
  origin_address: string;
  origin_lat: number | null;
  origin_lon: number | null;
  destination_address: string;
  destination_lat: number | null;
  destination_lon: number | null;
  stops: Waypoint[];
  selected_vehicle_id: string | null;
  selected_client_id: string | null;
  avoid_low_bridges: boolean;
  avoid_weight_restrictions: boolean;
  avoid_truck_forbidden: boolean;
  highway_route: RouteResult | null;
  national_route: RouteResult | null;
  selected_route_type: string;
  is_panel_open: boolean;
  last_activity_at: string;
  created_at: string;
  updated_at: string;
}

const defaultState: ItineraryState = {
  originAddress: '',
  originPosition: null,
  destinationAddress: '',
  destinationPosition: null,
  stops: [],
  selectedVehicleId: null,
  selectedClientId: null,
  avoidLowBridges: true,
  avoidWeightRestrictions: true,
  avoidTruckForbidden: true,
  highwayRoute: null,
  nationalRoute: null,
  selectedRouteType: 'highway',
  isPanelOpen: true,
};

function dbToState(db: DbSession): ItineraryState {
  return {
    originAddress: db.origin_address || '',
    originPosition: db.origin_lat && db.origin_lon ? { lat: db.origin_lat, lon: db.origin_lon } : null,
    destinationAddress: db.destination_address || '',
    destinationPosition: db.destination_lat && db.destination_lon ? { lat: db.destination_lat, lon: db.destination_lon } : null,
    stops: Array.isArray(db.stops) ? db.stops : [],
    selectedVehicleId: db.selected_vehicle_id,
    selectedClientId: db.selected_client_id,
    avoidLowBridges: db.avoid_low_bridges ?? true,
    avoidWeightRestrictions: db.avoid_weight_restrictions ?? true,
    avoidTruckForbidden: db.avoid_truck_forbidden ?? true,
    highwayRoute: db.highway_route,
    nationalRoute: db.national_route,
    selectedRouteType: (db.selected_route_type as 'highway' | 'national') || 'highway',
    isPanelOpen: db.is_panel_open ?? true,
  };
}

async function getUserLicenseId(userId: string): Promise<string | null> {
  try {
    const { data } = await supabase
      .from('company_users')
      .select('license_id')
      .eq('user_id', userId)
      .eq('is_active', true)
      .limit(1)
      .single();
    return data?.license_id || null;
  } catch {
    return null;
  }
}

async function getUserDisplayName(userId: string): Promise<string | null> {
  try {
    const { data } = await supabase
      .from('company_users')
      .select('display_name, email')
      .eq('user_id', userId)
      .eq('is_active', true)
      .limit(1)
      .single();
    return data?.display_name || data?.email || null;
  } catch {
    return null;
  }
}

/**
 * Hook to persist itinerary search state in cloud for team collaboration
 * All team members can see each other's current work in real-time
 */
export function useItineraryState() {
  const [state, setState] = useState<ItineraryState>(defaultState);
  const [teamSessions, setTeamSessions] = useState<TeamMemberSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitializedRef = useRef(false);

  // Load state from cloud
  const loadState = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsLoading(false);
        return;
      }
      
      setCurrentUserId(user.id);

      const { data, error } = await supabase
        .from('active_itinerary_sessions')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading itinerary state:', error);
      }

      if (data) {
        setState(dbToState(data as unknown as DbSession));
      }
      
      isInitializedRef.current = true;
    } catch (e) {
      console.error('Error loading itinerary state:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load team sessions
  const loadTeamSessions = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('active_itinerary_sessions')
        .select('*')
        .order('last_activity_at', { ascending: false });

      if (error) {
        console.error('Error loading team sessions:', error);
        return;
      }

      const sessions: TeamMemberSession[] = (data || []).map((row) => {
        const db = row as unknown as DbSession;
        return {
          id: db.id,
          userId: db.user_id,
          displayName: db.display_name,
          originAddress: db.origin_address || '',
          destinationAddress: db.destination_address || '',
          stops: Array.isArray(db.stops) ? db.stops : [],
          lastActivityAt: db.last_activity_at,
          isCurrentUser: db.user_id === user.id,
        };
      });

      setTeamSessions(sessions);
    } catch (e) {
      console.error('Error loading team sessions:', e);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadState();
    loadTeamSessions();
  }, [loadState, loadTeamSessions]);

  // Subscribe to realtime updates for team sessions
  useEffect(() => {
    const channel = supabase
      .channel('itinerary_sessions_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'active_itinerary_sessions',
        },
        () => {
          loadTeamSessions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadTeamSessions]);

  // Save state to cloud (debounced)
  const saveState = useCallback(async (newState: ItineraryState) => {
    if (!isInitializedRef.current) return;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const licenseId = await getUserLicenseId(user.id);
      const displayName = await getUserDisplayName(user.id);

      const upsertData = {
        user_id: user.id,
        license_id: licenseId,
        display_name: displayName,
        origin_address: newState.originAddress,
        origin_lat: newState.originPosition?.lat || null,
        origin_lon: newState.originPosition?.lon || null,
        destination_address: newState.destinationAddress,
        destination_lat: newState.destinationPosition?.lat || null,
        destination_lon: newState.destinationPosition?.lon || null,
        stops: newState.stops as unknown as Record<string, unknown>[],
        selected_vehicle_id: newState.selectedVehicleId,
        selected_client_id: newState.selectedClientId,
        avoid_low_bridges: newState.avoidLowBridges,
        avoid_weight_restrictions: newState.avoidWeightRestrictions,
        avoid_truck_forbidden: newState.avoidTruckForbidden,
        highway_route: newState.highwayRoute as unknown as Record<string, unknown> | null,
        national_route: newState.nationalRoute as unknown as Record<string, unknown> | null,
        selected_route_type: newState.selectedRouteType,
        is_panel_open: newState.isPanelOpen,
        last_activity_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await supabase
        .from('active_itinerary_sessions')
        .upsert(upsertData as never, { onConflict: 'user_id' });
    } catch (e) {
      console.error('Error saving itinerary state:', e);
    }
  }, []);

  // Debounced save
  const debouncedSave = useCallback((newState: ItineraryState) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      saveState(newState);
    }, 500);
  }, [saveState]);

  const updateState = useCallback((updates: Partial<ItineraryState>) => {
    setState(prev => {
      const newState = { ...prev, ...updates };
      debouncedSave(newState);
      return newState;
    });
  }, [debouncedSave]);

  const clearState = useCallback(async () => {
    setState(defaultState);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      await supabase
        .from('active_itinerary_sessions')
        .delete()
        .eq('user_id', user.id);
    } catch (e) {
      console.error('Error clearing itinerary state:', e);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return {
    ...state,
    isLoading,
    teamSessions,
    currentUserId,
    updateState,
    clearState,
    refetchTeamSessions: loadTeamSessions,
    // Individual setters for convenience
    setOriginAddress: (value: string) => updateState({ originAddress: value }),
    setOriginPosition: (value: Position | null) => updateState({ originPosition: value }),
    setDestinationAddress: (value: string) => updateState({ destinationAddress: value }),
    setDestinationPosition: (value: Position | null) => updateState({ destinationPosition: value }),
    setStops: (value: Waypoint[]) => updateState({ stops: value }),
    setSelectedVehicleId: (value: string | null) => updateState({ selectedVehicleId: value }),
    setSelectedClientId: (value: string | null) => updateState({ selectedClientId: value }),
    setAvoidLowBridges: (value: boolean) => updateState({ avoidLowBridges: value }),
    setAvoidWeightRestrictions: (value: boolean) => updateState({ avoidWeightRestrictions: value }),
    setAvoidTruckForbidden: (value: boolean) => updateState({ avoidTruckForbidden: value }),
    setHighwayRoute: (value: RouteResult | null) => updateState({ highwayRoute: value }),
    setNationalRoute: (value: RouteResult | null) => updateState({ nationalRoute: value }),
    setSelectedRouteType: (value: 'highway' | 'national') => updateState({ selectedRouteType: value }),
    setIsPanelOpen: (value: boolean) => updateState({ isPanelOpen: value }),
  };
}
