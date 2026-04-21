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

    const body = await req.json();
    const { id, query } = body;

    let url: string;
    if (id) {
      // Lookup by HERE place id
      const params = new URLSearchParams({ id, apiKey: HERE_API_KEY, lang: 'fr-FR' });
      url = `https://lookup.search.hereapi.com/v1/lookup?${params}`;
    } else if (query && typeof query === 'string') {
      const params = new URLSearchParams({
        q: query, apiKey: HERE_API_KEY, lang: 'fr-FR', limit: '1',
      });
      url = `https://geocode.search.hereapi.com/v1/geocode?${params}`;
    } else {
      return new Response(JSON.stringify({ error: 'id or query required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const response = await fetch(url);
    if (!response.ok) {
      const txt = await response.text();
      console.error('HERE geocode error:', response.status, txt);
      return new Response(JSON.stringify({ error: 'HERE geocode failed' }), {
        status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown';
    console.error('here-geocode error:', msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});