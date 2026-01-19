import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
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

    const { waypoints, params } = await req.json();
    
    if (!waypoints) {
      return new Response(
        JSON.stringify({ error: 'Waypoints required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const routeUrl = new URL(`https://api.tomtom.com/routing/1/calculateRoute/${waypoints}/json`);
    routeUrl.searchParams.set('key', TOMTOM_API_KEY);
    
    // Apply all provided params
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null) {
          routeUrl.searchParams.set(key, String(value));
        }
      }
    }

    const response = await fetch(routeUrl.toString());

    if (!response.ok) {
      const errorText = await response.text();
      console.error('TomTom Route API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: 'Route calculation failed', status: response.status }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    
    return new Response(
      JSON.stringify(data),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in tomtom-route function:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
