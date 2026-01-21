import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RestrictionPoint {
  lat: number;
  lng: number;
  type: 'lowBridge' | 'weightLimit' | 'truckForbidden' | 'tunnel' | 'narrowRoad';
  value?: number;
  unit?: string;
  description: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const TOMTOM_API_KEY = Deno.env.get('VITE_TOMTOM_API_KEY');
    
    if (!TOMTOM_API_KEY) {
      console.error('TomTom API key not configured');
      return new Response(
        JSON.stringify({ error: 'TomTom API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { routeCoordinates, vehicleHeight, vehicleWeight, vehicleWidth, vehicleLength } = await req.json();
    
    if (!routeCoordinates || routeCoordinates.length < 2) {
      return new Response(
        JSON.stringify({ error: 'Route coordinates required (at least 2 points)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build waypoints string for TomTom (sample points along the route)
    // Reduce to ~20 points max to avoid API limits
    const samplePoints = sampleRoutePoints(routeCoordinates, 20);
    const waypoints = samplePoints.map(([lat, lng]: [number, number]) => `${lat},${lng}`).join(':');

    // Call TomTom Routing API with truck parameters to get sections with restrictions
    const routeUrl = new URL(`https://api.tomtom.com/routing/1/calculateRoute/${waypoints}/json`);
    routeUrl.searchParams.set('key', TOMTOM_API_KEY);
    routeUrl.searchParams.set('travelMode', 'truck');
    routeUrl.searchParams.set('sectionType', 'travelMode');
    routeUrl.searchParams.set('report', 'effectiveSettings');
    
    // Add vehicle dimensions if provided
    if (vehicleHeight) routeUrl.searchParams.set('vehicleHeight', String(vehicleHeight));
    if (vehicleWeight) routeUrl.searchParams.set('vehicleWeight', String(vehicleWeight));
    if (vehicleWidth) routeUrl.searchParams.set('vehicleWidth', String(vehicleWidth));
    if (vehicleLength) routeUrl.searchParams.set('vehicleLength', String(vehicleLength));

    console.log('Calling TomTom for truck restrictions:', routeUrl.toString().replace(TOMTOM_API_KEY, '***'));

    const response = await fetch(routeUrl.toString());

    if (!response.ok) {
      const errorText = await response.text();
      console.error('TomTom API error:', response.status, errorText);
      
      // Return empty restrictions rather than failing
      return new Response(
        JSON.stringify({ restrictions: [], error: 'Could not fetch restrictions' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const restrictions: RestrictionPoint[] = [];

    // Parse route sections for restrictions
    if (data.routes && data.routes[0]) {
      const route = data.routes[0];
      
      // Check sections for travel mode changes (indicates restrictions)
      if (route.sections) {
        for (const section of route.sections) {
          if (section.sectionType === 'TUNNEL') {
            const point = getPointFromRoute(route, section.startPointIndex);
            if (point) {
              restrictions.push({
                ...point,
                type: 'tunnel',
                description: 'Tunnel - Vérifier restrictions PL'
              });
            }
          }
        }
      }

      // Check guidance for specific instructions about restrictions
      if (route.guidance && route.guidance.instructions) {
        for (const instruction of route.guidance.instructions) {
          if (instruction.message) {
            const msg = instruction.message.toLowerCase();
            const point = instruction.point;
            
            if (msg.includes('height') || msg.includes('hauteur') || msg.includes('pont bas')) {
              restrictions.push({
                lat: point.latitude,
                lng: point.longitude,
                type: 'lowBridge',
                description: 'Pont bas - Hauteur limitée'
              });
            } else if (msg.includes('weight') || msg.includes('poids') || msg.includes('tonnage')) {
              restrictions.push({
                lat: point.latitude,
                lng: point.longitude,
                type: 'weightLimit',
                description: 'Limitation de poids'
              });
            } else if (msg.includes('forbidden') || msg.includes('interdit') || msg.includes('no trucks')) {
              restrictions.push({
                lat: point.latitude,
                lng: point.longitude,
                type: 'truckForbidden',
                description: 'Zone interdite aux poids lourds'
              });
            }
          }
        }
      }
    }

    // Also query OpenStreetMap Overpass API for additional restriction data
    // This provides more granular data on actual restrictions
    const osmRestrictions = await fetchOSMRestrictions(routeCoordinates, TOMTOM_API_KEY);
    restrictions.push(...osmRestrictions);

    // Deduplicate restrictions that are very close to each other
    const deduplicatedRestrictions = deduplicateRestrictions(restrictions);

    console.log(`Found ${deduplicatedRestrictions.length} truck restrictions along route`);

    return new Response(
      JSON.stringify({ restrictions: deduplicatedRestrictions }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in truck-restrictions function:', error);
    return new Response(
      JSON.stringify({ restrictions: [], error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function sampleRoutePoints(coordinates: [number, number][], maxPoints: number): [number, number][] {
  if (coordinates.length <= maxPoints) return coordinates;
  
  const step = Math.floor(coordinates.length / maxPoints);
  const sampled: [number, number][] = [];
  
  for (let i = 0; i < coordinates.length; i += step) {
    sampled.push(coordinates[i]);
  }
  
  // Always include the last point
  if (sampled[sampled.length - 1] !== coordinates[coordinates.length - 1]) {
    sampled.push(coordinates[coordinates.length - 1]);
  }
  
  return sampled;
}

function getPointFromRoute(route: { legs?: Array<{ points?: Array<{ latitude: number; longitude: number }> }> }, pointIndex: number): { lat: number; lng: number } | null {
  if (!route.legs) return null;
  
  let currentIndex = 0;
  for (const leg of route.legs) {
    if (leg.points) {
      for (const point of leg.points) {
        if (currentIndex === pointIndex) {
          return { lat: point.latitude, lng: point.longitude };
        }
        currentIndex++;
      }
    }
  }
  return null;
}

async function fetchOSMRestrictions(routeCoordinates: [number, number][], _apiKey: string): Promise<RestrictionPoint[]> {
  try {
    // Calculate bounding box from route
    let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;
    
    for (const [lat, lng] of routeCoordinates) {
      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
      minLng = Math.min(minLng, lng);
      maxLng = Math.max(maxLng, lng);
    }
    
    // Add small buffer
    const buffer = 0.01;
    minLat -= buffer;
    maxLat += buffer;
    minLng -= buffer;
    maxLng += buffer;

    // Query Overpass API for truck restrictions
    const overpassQuery = `
      [out:json][timeout:10];
      (
        node["maxheight"](${minLat},${minLng},${maxLat},${maxLng});
        node["maxweight"](${minLat},${minLng},${maxLat},${maxLng});
        node["hgv"]["hgv"!="yes"](${minLat},${minLng},${maxLat},${maxLng});
        way["maxheight"](${minLat},${minLng},${maxLat},${maxLng});
        way["maxweight"](${minLat},${minLng},${maxLat},${maxLng});
        way["hgv"]["hgv"!="yes"](${minLat},${minLng},${maxLat},${maxLng});
      );
      out center;
    `;

    const overpassUrl = 'https://overpass-api.de/api/interpreter';
    const response = await fetch(overpassUrl, {
      method: 'POST',
      body: `data=${encodeURIComponent(overpassQuery)}`,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    if (!response.ok) {
      console.log('Overpass API unavailable, skipping OSM data');
      return [];
    }

    const data = await response.json();
    const restrictions: RestrictionPoint[] = [];

    for (const element of data.elements || []) {
      const lat = element.lat || element.center?.lat;
      const lng = element.lon || element.center?.lon;
      
      if (!lat || !lng) continue;
      
      // Check if this point is close to our route
      if (!isPointNearRoute(lat, lng, routeCoordinates, 0.005)) continue;

      const tags = element.tags || {};
      
      if (tags.maxheight) {
        const height = parseFloat(tags.maxheight);
        restrictions.push({
          lat,
          lng,
          type: 'lowBridge',
          value: height,
          unit: 'm',
          description: `Hauteur max: ${tags.maxheight}`
        });
      }
      
      if (tags.maxweight) {
        const weight = parseFloat(tags.maxweight);
        restrictions.push({
          lat,
          lng,
          type: 'weightLimit',
          value: weight,
          unit: 't',
          description: `Poids max: ${tags.maxweight}`
        });
      }
      
      if (tags.hgv && tags.hgv !== 'yes' && tags.hgv !== 'designated') {
        restrictions.push({
          lat,
          lng,
          type: 'truckForbidden',
          description: tags.hgv === 'no' ? 'Interdit aux PL' : `PL: ${tags.hgv}`
        });
      }
    }

    return restrictions;
  } catch (error) {
    console.log('Error fetching OSM restrictions:', error);
    return [];
  }
}

function isPointNearRoute(lat: number, lng: number, route: [number, number][], threshold: number): boolean {
  for (const [rlat, rlng] of route) {
    const distance = Math.sqrt(Math.pow(lat - rlat, 2) + Math.pow(lng - rlng, 2));
    if (distance < threshold) return true;
  }
  return false;
}

function deduplicateRestrictions(restrictions: RestrictionPoint[]): RestrictionPoint[] {
  const result: RestrictionPoint[] = [];
  const threshold = 0.001; // ~100m
  
  for (const restriction of restrictions) {
    const isDuplicate = result.some(r => 
      r.type === restriction.type &&
      Math.abs(r.lat - restriction.lat) < threshold &&
      Math.abs(r.lng - restriction.lng) < threshold
    );
    
    if (!isDuplicate) {
      result.push(restriction);
    }
  }
  
  return result;
}
