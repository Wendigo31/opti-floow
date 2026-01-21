import { useState, useEffect, useCallback } from 'react';

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

const STORAGE_KEY = 'optiflow_itinerary_state';

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

function loadState(): ItineraryState {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...defaultState, ...JSON.parse(stored) };
    }
  } catch (e) {
    console.error('Error loading itinerary state:', e);
  }
  return defaultState;
}

function saveState(state: Partial<ItineraryState>) {
  try {
    const current = loadState();
    const newState = { ...current, ...state };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
  } catch (e) {
    console.error('Error saving itinerary state:', e);
  }
}

/**
 * Hook to persist itinerary search state across tab changes
 * Uses sessionStorage so state persists during the session but clears on browser close
 */
export function useItineraryState() {
  const [state, setState] = useState<ItineraryState>(loadState);

  // Save to sessionStorage whenever state changes
  useEffect(() => {
    saveState(state);
  }, [state]);

  const updateState = useCallback((updates: Partial<ItineraryState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  const clearState = useCallback(() => {
    setState(defaultState);
    sessionStorage.removeItem(STORAGE_KEY);
  }, []);

  return {
    ...state,
    updateState,
    clearState,
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
