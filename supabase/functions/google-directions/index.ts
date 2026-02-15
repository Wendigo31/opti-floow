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
    const GOOGLE_MAPS_API_KEY = Deno.env.get('GOOGLE_MAPS_API_KEY');
    
    if (!GOOGLE_MAPS_API_KEY) {
      console.error('Google Maps API key not configured');
      return new Response(
        JSON.stringify({ error: 'Google Maps API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { origin, destination, waypoints, avoidHighways } = await req.json();
    
    // Input validation
    if (!origin || typeof origin !== 'string' || origin.length > 500) {
      return new Response(
        JSON.stringify({ error: 'Invalid or missing origin' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (!destination || typeof destination !== 'string' || destination.length > 500) {
      return new Response(
        JSON.stringify({ error: 'Invalid or missing destination' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (waypoints !== undefined && waypoints !== null) {
      if (!Array.isArray(waypoints) || waypoints.length > 25 || !waypoints.every((w: unknown) => typeof w === 'string' && w.length <= 500)) {
        return new Response(
          JSON.stringify({ error: 'Invalid waypoints (max 25, each max 500 chars)' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Try new Routes API first, fallback to legacy Directions API
    let data;
    let usedRoutesApi = false;

    try {
      // Parse location for Routes API
      const parseLocation = (loc: string) => {
        const coordMatch = loc.match(/^(-?\d+\.?\d*),\s*(-?\d+\.?\d*)$/);
        if (coordMatch) {
          return {
            location: {
              latLng: {
                latitude: parseFloat(coordMatch[1]),
                longitude: parseFloat(coordMatch[2])
              }
            }
          };
        }
        return { address: loc };
      };

      const requestBody: Record<string, unknown> = {
        origin: parseLocation(origin),
        destination: parseLocation(destination),
        travelMode: "DRIVE",
        routingPreference: "TRAFFIC_AWARE",
        languageCode: "fr",
        units: "METRIC",
      };

      if (avoidHighways) {
        requestBody.routeModifiers = { avoidHighways: true };
      }

      if (waypoints && waypoints.length > 0) {
        requestBody.intermediates = waypoints.map((wp: string) => parseLocation(wp));
      }

      const routesResponse = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY,
          'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.legs.duration,routes.legs.distanceMeters'
        },
        body: JSON.stringify(requestBody)
      });

      const routesData = await routesResponse.json();

      // Check for API not enabled errors
      if (routesData.error?.code === 403 || routesData.error?.status === 'PERMISSION_DENIED') {
        throw new Error('Routes API not enabled');
      }

      if (routesResponse.ok && routesData.routes?.length > 0) {
        usedRoutesApi = true;
        // Transform Routes API response to legacy format
        const route = routesData.routes[0];
        data = {
          routes: [{
            legs: route.legs.map((leg: { distanceMeters: number; duration: string }) => ({
              distance: { value: leg.distanceMeters },
              duration: { value: parseInt(leg.duration?.replace('s', '') || '0') }
            })),
            overview_polyline: {
              points: route.polyline?.encodedPolyline || ''
            }
          }],
          status: 'OK'
        };
        console.log('Used Routes API successfully');
      } else {
        throw new Error('Routes API failed, trying legacy');
      }
    } catch (routesError) {
      console.log('Routes API not available, using legacy Directions API');
      
      // Fallback to legacy Directions API
      const url = new URL('https://maps.googleapis.com/maps/api/directions/json');
      url.searchParams.set('key', GOOGLE_MAPS_API_KEY);
      url.searchParams.set('origin', origin);
      url.searchParams.set('destination', destination);
      url.searchParams.set('language', 'fr');
      url.searchParams.set('units', 'metric');
      
      if (waypoints && waypoints.length > 0) {
        url.searchParams.set('waypoints', waypoints.join('|'));
      }
      
      if (avoidHighways) {
        url.searchParams.set('avoid', 'highways');
      }

      const response = await fetch(url.toString());
      data = await response.json();
      
      if (!response.ok || data.status !== 'OK') {
        console.error('Legacy Directions API error:', data.status, data.error_message);
        return new Response(
          JSON.stringify({ error: data.error_message || data.status || 'Route calculation failed' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    return new Response(
      JSON.stringify(data),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in google-directions function:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
