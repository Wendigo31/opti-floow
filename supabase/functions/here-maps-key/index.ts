import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve((req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const HERE_API_KEY = Deno.env.get('HERE_API_KEY');

  if (!HERE_API_KEY) {
    console.error('HERE_API_KEY not configured');
    return new Response(
      JSON.stringify({ error: 'HERE Maps API key not configured' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({ apiKey: HERE_API_KEY }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
});