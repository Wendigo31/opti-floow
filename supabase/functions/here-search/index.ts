import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const HERE_API_KEY = Deno.env.get('HERE_API_KEY');
    if (!HERE_API_KEY) {
      return new Response(JSON.stringify({ error: 'HERE_API_KEY not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { query, at } = await req.json();
    if (!query || typeof query !== 'string' || query.length < 3) {
      return new Response(JSON.stringify({ items: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (query.length > 300) {
      return new Response(JSON.stringify({ error: 'Query too long' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // HERE Autosuggest - precise PL-friendly geocoding
    const params = new URLSearchParams({
      q: query,
      apiKey: HERE_API_KEY,
      lang: 'fr-FR',
      limit: '8',
      in: 'countryCode:FRA,BEL,CHE,LUX,DEU,ESP,ITA',
      at: at || '46.603354,1.888334', // France center default
    });

    const response = await fetch(`https://autosuggest.search.hereapi.com/v1/autosuggest?${params}`);
    if (!response.ok) {
      const txt = await response.text();
      console.error('HERE Autosuggest error:', response.status, txt);
      return new Response(JSON.stringify({ error: 'HERE search failed', items: [] }), {
        status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown';
    console.error('here-search error:', msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});