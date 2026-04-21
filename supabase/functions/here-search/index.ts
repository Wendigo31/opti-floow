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

    // HERE Autosuggest – best for company/POI + city queries (e.g. "MTA Rumilly")
    // Returns addresses, places (businesses, companies), categories and chains.
    const baseParams = {
      q: query,
      apiKey: HERE_API_KEY,
      lang: 'fr-FR',
      limit: '15',
      in: 'countryCode:FRA,ESP,NLD,GBR,DEU,CHE',
      at: at || '46.603354,1.888334',
      // Bias toward places/POI but still return addresses
      show: 'details',
    } as Record<string, string>;

    const autosuggestUrl = `https://autosuggest.search.hereapi.com/v1/autosuggest?${new URLSearchParams(baseParams)}`;
    const discoverUrl = `https://discover.search.hereapi.com/v1/discover?${new URLSearchParams(baseParams)}`;

    // Detect freight/logistics carrier names → use Browse with category "transport-service"
    // to surface depot/agency locations across the country.
    const carriers = ['geodis','france express','dhl','gls','chronopost','mta','db schenker','schenker','dsv','dpd','laposte','la poste','pfc','pic','heppner','ceva','gefco','xpo','kuehne','tnt','ups','fedex','stef','dachser'];
    const lowerQ = query.toLowerCase();
    const matchedCarrier = carriers.find(c => lowerQ.includes(c));

    const browseUrls: string[] = [];
    if (matchedCarrier) {
      // HERE Browse: filter by transport categories + name to find ALL depots/agencies of a carrier
      const browseParams = new URLSearchParams({
        apiKey: HERE_API_KEY,
        lang: 'fr-FR',
        limit: '20',
        in: 'countryCode:FRA,ESP,NLD,GBR,DEU,CHE',
        at: at || '46.603354,1.888334',
        // Categories: 700-7600 (Business Services), 800-8600 (Transport)
        categories: '700-7600-0322,700-7600-0323,700-7600-0324,800-8600,400-4100',
        name: query,
      });
      browseUrls.push(`https://browse.search.hereapi.com/v1/browse?${browseParams}`);
    }

    const [autoRes, discRes, browseRes] = await Promise.all([
      fetch(autosuggestUrl).catch(() => null),
      fetch(discoverUrl).catch(() => null),
      browseUrls[0] ? fetch(browseUrls[0]).catch(() => null) : Promise.resolve(null),
    ]);

    const autoData = autoRes && autoRes.ok ? await autoRes.json() : { items: [] };
    const discData = discRes && discRes.ok ? await discRes.json() : { items: [] };
    const browseData = browseRes && browseRes.ok ? await browseRes.json() : { items: [] };

    if ((!autoRes || !autoRes.ok) && (!discRes || !discRes.ok)) {
      const txt = autoRes ? await autoRes.text() : 'no response';
      console.error('HERE search error:', txt);
      return new Response(JSON.stringify({ error: 'HERE search failed', items: [] }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Merge & dedupe by id, prioritizing places (businesses) first
    const seen = new Set<string>();
    const merged: any[] = [];
    // Browse results first (carrier depots), then places, then addresses
    const all = [...(browseData.items || []), ...(autoData.items || []), ...(discData.items || [])];
    // Sort: places/POI first, then addresses
    all.sort((a, b) => {
      const aPlace = a.resultType === 'place' || !!a.categories?.length ? 0 : 1;
      const bPlace = b.resultType === 'place' || !!b.categories?.length ? 0 : 1;
      return aPlace - bPlace;
    });
    for (const item of all) {
      if (!item.id || seen.has(item.id)) continue;
      // Skip pure category suggestions (no position)
      if (item.resultType === 'categoryQuery' || item.resultType === 'chainQuery') continue;
      seen.add(item.id);
      merged.push(item);
      if (merged.length >= 15) break;
    }

    return new Response(JSON.stringify({ items: merged }), {
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