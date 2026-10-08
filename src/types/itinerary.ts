/**
 * Types partagés par la page Itinéraire (src/pages/Itinerary.tsx) et ses
 * composants extraits (src/components/itinerary/*). Déplacés verbatim hors
 * de Itinerary.tsx pour alléger ce fichier — comportement identique.
 */

export interface RouteResult {
  distance: number;
  duration: number;
  tollCost: number;
  fuelCost: number;
  coordinates: [number, number][];
  type: 'highway' | 'national';
}

export interface Position {
  lat: number;
  lon: number;
}

export interface Waypoint {
  id: string;
  address: string;
  position: Position | null;
}
