export const ITINERARY_STORAGE_KEY = 'optiflow_itinerary_state';

export function getItinerarySessionState(): unknown {
  try {
    const stored = sessionStorage.getItem(ITINERARY_STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}