import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: authError } = await supabase.auth.getClaims(token);

    if (authError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const TOMTOM_API_KEY = Deno.env.get('VITE_TOMTOM_API_KEY');
    
    if (!TOMTOM_API_KEY) {
      console.error('TomTom API key not configured');
      return new Response(
        JSON.stringify({ error: 'TomTom API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { waypoints, params } = await req.json();
    
    // Input validation
    if (!waypoints || typeof waypoints !== 'string' || waypoints.length > 2000) {
      return new Response(
        JSON.stringify({ error: 'Invalid or missing waypoints (string, max 2000 chars)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    // Validate waypoints format: lat,lon:lat,lon (only digits, dots, commas, colons, minus)
    if (!/^[-\d.,: ]+$/.test(waypoints)) {
      return new Response(
        JSON.stringify({ error: 'Invalid waypoints format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const routeUrl = new URL(`https://api.tomtom.com/routing/1/calculateRoute/${encodeURIComponent(waypoints)}/json`);
    routeUrl.searchParams.set('key', TOMTOM_API_KEY);
    
    // Apply validated params - only allow known TomTom parameters
    const ALLOWED_PARAMS = new Set([
      'routeType', 'traffic', 'travelMode', 'vehicleWeight', 'vehicleAxleWeight',
      'vehicleHeight', 'vehicleWidth', 'vehicleLength', 'vehicleMaxSpeed',
      'vehicleCommercial', 'vehicleLoadType', 'avoid', 'sectionType', 'report',
      'departAt', 'arriveAt', 'computeTravelTimeFor', 'routeRepresentation',
    ]);
    if (params && typeof params === 'object') {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null && ALLOWED_PARAMS.has(key)) {
          const strValue = String(value);
          if (strValue.length <= 200) {
            routeUrl.searchParams.set(key, strValue);
          }
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
