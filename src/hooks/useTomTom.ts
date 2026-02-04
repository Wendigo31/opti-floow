import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

// French toll rates per km for trucks (Class 4 - 40T semi-trailer, 5+ axles)
// Based on 2024 rates from major French toll operators
const FRENCH_TOLL_RATES = {
  // Major highway operators with Class 4 rates
  SANEF: 0.285,      // A1, A4, A26 etc.
  APRR: 0.275,       // A6, A31, A36 etc.
  ASF: 0.295,        // A7, A9, A61 etc.
  COFIROUTE: 0.265,  // A10, A11, A85 etc.
  VINCI: 0.280,      // A10 (sections), A87 etc.
  // Average for calculation when specific operator unknown
  AVERAGE: 0.28,
  // Reduced rate for national roads with occasional tolls
  NATIONAL: 0.03,
};

// Semi-trailer (tracteur + semi-remorque) specifications for France
const SEMI_TRAILER_SPECS = {
  length: 16.5,      // Max legal length in meters
  width: 2.55,       // Max legal width in meters  
  height: 4.0,       // Max legal height in meters
  weight: 44000,     // Max 44T for 5-axle in France
  axleWeight: 11500, // Max 11.5T per axle
  axles: 5,          // Typical 5-axle semi-trailer
};

// Decode Google polyline encoding
function decodePolyline(encoded: string): [number, number][] {
  const points: [number, number][] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const dlat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const dlng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    points.push([lat / 1e5, lng / 1e5]);
  }

  return points;
}

interface RouteResult {
  distance: number;
  duration: number;
  tollCost: number;
  coordinates: [number, number][];
  summary: {
    departureTime: string;
    arrivalTime: string;
    trafficDelayInSeconds: number;
  };
  tollSections?: TollSection[];
}

interface TollSection {
  name: string;
  distance: number;
  cost: number;
}

interface GeocodingResult {
  position: {
    lat: number;
    lon: number;
  };
  address: {
    freeformAddress: string;
    country?: string;
    countryCode?: string;
  };
}

// Helper function to get current session token
async function getAuthToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
}

export function useTomTom() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Geocode an address using Google Places API
  const geocodeAddress = async (address: string): Promise<GeocodingResult | null> => {
    try {
      // First search for the address
      const { data: searchData, error: searchError } = await supabase.functions.invoke('google-places-search', {
        body: { query: address }
      });

      if (searchError || !searchData.predictions?.length) {
        console.error('Geocoding search error:', searchError);
        return null;
      }

      // Get details for the first result
      const placeId = searchData.predictions[0].place_id;
      const { data: detailsData, error: detailsError } = await supabase.functions.invoke('google-place-details', {
        body: { placeId }
      });

      if (detailsError || !detailsData.result) {
        console.error('Geocoding details error:', detailsError);
        return null;
      }

      const result = detailsData.result;
      return {
        position: {
          lat: result.geometry.location.lat,
          lon: result.geometry.location.lng,
        },
        address: {
          freeformAddress: result.formatted_address,
        },
      };
    } catch (err) {
      console.error('Geocoding error:', err);
      return null;
    }
  };

  // Calculate toll cost based on highway sections
  const calculateTollCost = (
    distanceKm: number,
    isHighway: boolean,
    tollSections?: TollSection[]
  ): number => {
    if (!isHighway) {
      // National roads: minimal tolls (occasional bridges/tunnels)
      return Math.round(distanceKm * FRENCH_TOLL_RATES.NATIONAL * 100) / 100;
    }

    if (tollSections && tollSections.length > 0) {
      // Sum up individual section costs
      return tollSections.reduce((total, section) => total + section.cost, 0);
    }

    // Estimate based on average toll rate for Class 4 trucks
    // Apply a highway ratio (not all route is tolled highway)
    const estimatedHighwayRatio = 0.85; // ~85% of "fastest" route is typically highway
    const tollableDistance = distanceKm * estimatedHighwayRatio;
    
    return Math.round(tollableDistance * FRENCH_TOLL_RATES.AVERAGE * 100) / 100;
  };

  // Calculate route between waypoints using Google Directions API
  const calculateRoute = async (
    waypoints: { lat: number; lon: number }[],
    options: {
      avoidHighways?: boolean;
      vehicleWeight?: number;
      vehicleHeight?: number;
      vehicleLength?: number;
      vehicleWidth?: number;
      vehicleAxleWeight?: number;
      vehicleCommercial?: boolean;
    } = {}
  ): Promise<RouteResult | null> => {
    if (waypoints.length < 2) {
      setError('Au moins 2 points sont nécessaires');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const origin = `${waypoints[0].lat},${waypoints[0].lon}`;
      const destination = `${waypoints[waypoints.length - 1].lat},${waypoints[waypoints.length - 1].lon}`;
      
      // Build intermediate waypoints if any
      const intermediateWaypoints = waypoints.slice(1, -1).map(wp => `${wp.lat},${wp.lon}`);

      const { data, error: apiError } = await supabase.functions.invoke('google-directions', {
        body: {
          origin,
          destination,
          waypoints: intermediateWaypoints.length > 0 ? intermediateWaypoints : undefined,
          avoidHighways: options.avoidHighways,
        }
      });

      if (apiError) {
        throw new Error('Erreur de calcul d\'itinéraire');
      }

      if (!data.routes || data.routes.length === 0) {
        throw new Error('Aucun itinéraire trouvé pour ce trajet');
      }

      const route = data.routes[0];
      const leg = route.legs[0]; // For now, use first leg

      // Calculate total distance and duration from all legs
      let totalDistanceMeters = 0;
      let totalDurationSeconds = 0;
      
      for (const l of route.legs) {
        totalDistanceMeters += l.distance.value;
        totalDurationSeconds += l.duration.value;
      }

      const distanceKm = totalDistanceMeters / 1000;

      // Decode the polyline to get coordinates
      const coordinates = decodePolyline(route.overview_polyline.points);

      // Calculate toll cost using TomTom API for accurate truck toll estimation
      let tollCost = 0;
      
      if (!options.avoidHighways) {
        try {
          const { data: tollData } = await supabase.functions.invoke('tomtom-tolls', {
            body: {
              waypoints: waypoints,
              distanceKm: distanceKm, // Pass distance for direct estimation
              vehicleWeight: options.vehicleWeight || SEMI_TRAILER_SPECS.weight,
              vehicleAxleWeight: options.vehicleAxleWeight || SEMI_TRAILER_SPECS.axleWeight,
              avoidHighways: options.avoidHighways,
            }
          });
          
          if (tollData?.tollCost) {
            tollCost = tollData.tollCost;
            console.log('TomTom toll cost:', tollCost, 'source:', tollData.source);
          } else {
            // Fallback to estimation
            tollCost = calculateTollCost(distanceKm, true);
          }
        } catch (tollError) {
          console.warn('TomTom toll calculation failed, using estimation:', tollError);
          tollCost = calculateTollCost(distanceKm, true);
        }
      }

      return {
        distance: Math.round(distanceKm * 10) / 10,
        duration: Math.round((totalDurationSeconds / 3600) * 100) / 100,
        tollCost: Math.round(tollCost * 100) / 100,
        coordinates,
        summary: {
          departureTime: new Date().toISOString(),
          arrivalTime: new Date(Date.now() + totalDurationSeconds * 1000).toISOString(),
          trafficDelayInSeconds: 0,
        },
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(message);
      console.error('Route calculation error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Full route calculation from addresses
  const calculateRouteFromAddresses = async (
    addresses: string[],
    options: {
      avoidHighways?: boolean;
      vehicleWeight?: number;
      vehicleHeight?: number;
      vehicleLength?: number;
      vehicleWidth?: number;
      vehicleAxleWeight?: number;
      vehicleCommercial?: boolean;
    } = {}
  ): Promise<{
    route: RouteResult;
    waypoints: GeocodingResult[];
  } | null> => {
    if (addresses.length < 2) {
      setError('Au moins 2 adresses sont nécessaires');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      // Geocode all addresses in parallel
      const geocodePromises = addresses.map(addr => geocodeAddress(addr));
      const geocodeResults = await Promise.all(geocodePromises);

      // Check for failed geocoding
      const failedIndex = geocodeResults.findIndex(r => r === null);
      if (failedIndex !== -1) {
        throw new Error(`Adresse introuvable: ${addresses[failedIndex]}`);
      }

      const waypoints = geocodeResults.map(r => r!.position);

      // Calculate route
      const route = await calculateRoute(waypoints, options);

      if (!route) {
        throw new Error('Impossible de calculer l\'itinéraire');
      }

      return {
        route,
        waypoints: geocodeResults as GeocodingResult[],
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    calculateRoute,
    calculateRouteFromAddresses,
    geocodeAddress,
    loading,
    error,
    SEMI_TRAILER_SPECS,
    FRENCH_TOLL_RATES,
  };
}

export { SEMI_TRAILER_SPECS, FRENCH_TOLL_RATES };
