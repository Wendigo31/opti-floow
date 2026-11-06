import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Anciennes actions d'administration (fermées)
const ADMIN_REQUIRED_ACTIONS = ['create', 'update', 'toggle-active', 'delete'];

// Actions that are public (no auth required)
const PUBLIC_ACTIONS = ['list', 'increment-download'];

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const { action, updateId } = body;

    console.log(`[manage-updates] Action: ${action}`);

    // Publication des mises à jour : l'ancien panneau d'administration est supprimé
    // (administration dans OptiCentral). Seules la lecture et le compteur restent ouverts.
    if (ADMIN_REQUIRED_ACTIONS.includes(action)) {
      return new Response(
        JSON.stringify({ success: false, error: "L'administration se fait depuis OptiCentral" }),
        { status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    switch (action) {
      case 'list': {
        const { data, error } = await supabase
          .from('app_updates')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('[manage-updates] Error listing updates:', error);
          throw error;
        }

        // Calculate stats
        const stats = {
          total: data?.length || 0,
          active: data?.filter((u: any) => u.is_active).length || 0,
          totalDownloads: data?.reduce((sum: number, u: any) => sum + (u.download_count || 0), 0) || 0,
          byPlatform: {} as Record<string, { count: number; active: number; downloads: number }>,
        };

        // Group by platform
        data?.forEach((update: any) => {
          if (!stats.byPlatform[update.platform]) {
            stats.byPlatform[update.platform] = { count: 0, active: 0, downloads: 0 };
          }
          stats.byPlatform[update.platform].count++;
          if (update.is_active) stats.byPlatform[update.platform].active++;
          stats.byPlatform[update.platform].downloads += update.download_count || 0;
        });

        return new Response(
          JSON.stringify({ updates: data, stats }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'increment-download': {
        if (!updateId) {
          return new Response(
            JSON.stringify({ success: false, error: 'updateId required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Get current download count and increment it
        const { data: currentUpdate, error: fetchError } = await supabase
          .from('app_updates')
          .select('download_count')
          .eq('id', updateId)
          .maybeSingle();

        if (fetchError) {
          console.error('[manage-updates] Error fetching update:', fetchError);
          return new Response(
            JSON.stringify({ success: false, error: fetchError.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (!currentUpdate) {
          return new Response(
            JSON.stringify({ success: false, error: 'Update not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const currentCount = currentUpdate.download_count || 0;

        const { error: updateError } = await supabase
          .from('app_updates')
          .update({ download_count: currentCount + 1 })
          .eq('id', updateId);

        if (updateError) {
          console.error('[manage-updates] Error updating download count:', updateError);
          return new Response(
            JSON.stringify({ success: false, error: updateError.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log(`[manage-updates] Download count incremented for ${updateId}: ${currentCount} -> ${currentCount + 1}`);

        return new Response(
          JSON.stringify({ success: true, newCount: currentCount + 1 }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[manage-updates] Error:', message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
