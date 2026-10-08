export const ITINERARY_STORAGE_KEY = 'optiflow_itinerary_state';

export interface ItinerarySessionState {
  originAddress?: string;
  originPosition?: { lat: number; lon: number } | null;
  destinationAddress?: string;
  destinationPosition?: { lat: number; lon: number } | null;
  stops?: Array<{ id?: string; address?: string; position?: { lat: number; lon: number } | null }>;
  selectedVehicleId?: string;
  avoidLowBridges?: boolean;
  avoidWeightRestrictions?: boolean;
}

export function getItinerarySessionState(): ItinerarySessionState | null {
  try {
    const stored = sessionStorage.getItem(ITINERARY_STORAGE_KEY);
    return stored ? JSON.parse(stored) as ItinerarySessionState : null;
  } catch {
    return null;
  }
}