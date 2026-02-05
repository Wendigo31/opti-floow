import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const TOMTOM_API_KEY = Deno.env.get('VITE_TOMTOM_API_KEY');
    
    if (!TOMTOM_API_KEY) {
      console.error('TomTom API key not configured');
      return new Response(
        JSON.stringify({ error: 'TomTom API key not configured', tollCost: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { waypoints, vehicleWeight, vehicleAxleWeight, avoidHighways, distanceKm } = await req.json();
    
    // If avoiding highways, toll cost is minimal
    if (avoidHighways) {
      return new Response(
        JSON.stringify({ tollCost: 0, message: 'No tolls on national roads' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If distance is provided, calculate toll estimation directly
    // This is more reliable than calling TomTom API which may fail for truck routing
    if (distanceKm && distanceKm > 0) {
      const FRENCH_TOLL_RATE_CLASS4 = 0.28; // €/km for Class 4 trucks
      const estimatedHighwayRatio = 0.85;
      const tollCost = Math.round(distanceKm * estimatedHighwayRatio * FRENCH_TOLL_RATE_CLASS4 * 100) / 100;
      
      console.log(`Direct toll estimation: ${distanceKm}km, toll: ${tollCost}€`);
      
      return new Response(
        JSON.stringify({ 
          tollCost,
          distanceKm,
          source: 'estimation',
          rate: FRENCH_TOLL_RATE_CLASS4
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (!waypoints || waypoints.length < 2) {
      return new Response(
        JSON.stringify({ error: 'At least 2 waypoints or distance required', tollCost: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build TomTom waypoints string: lat,lon:lat,lon:lat,lon
    const waypointsString = waypoints.map((wp: { lat: number; lon: number }) => 
      `${wp.lat},${wp.lon}`
    ).join(':');

    console.log('TomTom waypoints:', waypointsString);

    // TomTom Calculate Route API - use car mode for more reliable routing
    // Then apply truck toll rates to the distance
    const routeUrl = new URL(`https://api.tomtom.com/routing/1/calculateRoute/${waypointsString}/json`);
    routeUrl.searchParams.set('key', TOMTOM_API_KEY);
    routeUrl.searchParams.set('routeType', 'fastest');
    routeUrl.searchParams.set('traffic', 'false');
    routeUrl.searchParams.set('travelMode', 'car'); // Use car for reliable routing
    
    // Request toll sections
    routeUrl.searchParams.set('sectionType', 'tollRoad');

    console.log('Calling TomTom API for route/toll calculation...');
    const response = await fetch(routeUrl.toString());

    if (!response.ok) {
      const errorText = await response.text();
      console.error('TomTom API error:', response.status, errorText);
      
      // Fallback: estimate based on waypoints if we can't get route
      return new Response(
        JSON.stringify({ 
          tollCost: 0, 
          error: 'TomTom API error',
          estimated: true 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    
    if (!data.routes || data.routes.length === 0) {
      return new Response(
        JSON.stringify({ tollCost: 0, error: 'No route found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const route = data.routes[0];
    const summary = route.summary;
    
    // Calculate toll cost using French Class 4 truck rates
    const FRENCH_TOLL_RATE_CLASS4 = 0.28; // €/km average for 5-axle 40T+ trucks
    const routeDistanceKm = summary.lengthInMeters / 1000;
    
    // Count toll road sections to estimate toll percentage
    let tollRoadDistance = 0;
    if (route.sections) {
      for (const section of route.sections) {
        if (section.sectionType === 'TOLL_ROAD') {
          // TomTom provides start/end point indexes
          // For simplicity, assume toll sections make up ~85% of fastest routes
          tollRoadDistance += routeDistanceKm * 0.85;
          break; // We only need to know if there are toll roads
        }
      }
    }
    
    // If no toll sections detected but using highway, estimate
    if (tollRoadDistance === 0 && !avoidHighways) {
      tollRoadDistance = routeDistanceKm * 0.85;
    }
    
    const tollCost = Math.round(tollRoadDistance * FRENCH_TOLL_RATE_CLASS4 * 100) / 100;

    console.log(`Toll calculation: ${routeDistanceKm.toFixed(1)}km route, ${tollRoadDistance.toFixed(1)}km tolled, toll: ${tollCost}€`);

    return new Response(
      JSON.stringify({ 
        tollCost,
        distanceKm: Math.round(routeDistanceKm * 10) / 10,
        durationMinutes: Math.round(summary.travelTimeInSeconds / 60),
        tollRoadKm: Math.round(tollRoadDistance * 10) / 10,
        source: 'tomtom'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in tomtom-tolls function:', error);
    return new Response(
      JSON.stringify({ tollCost: 0, error: errorMessage }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
