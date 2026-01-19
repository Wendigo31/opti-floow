import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// JWT verification for admin authentication
async function verifyAdminToken(token: string): Promise<{ valid: boolean; payload?: any }> {
  try {
    const adminSecret = Deno.env.get('ADMIN_SECRET_CODE');
    if (!adminSecret) {
      console.error('[manage-updates] ADMIN_SECRET_CODE not configured');
      return { valid: false };
    }

    // Decode JWT parts
    const parts = token.split('.');
    if (parts.length !== 3) {
      return { valid: false };
    }

    const headerB64 = parts[0];
    const payloadB64 = parts[1];
    const signatureB64 = parts[2];

    // Decode payload
    const payloadJson = atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/'));
    const payload = JSON.parse(payloadJson);

    // Check expiration
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      console.log('[manage-updates] Token expired');
      return { valid: false };
    }

    // Verify signature
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(adminSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign', 'verify']
    );

    const signatureInput = `${headerB64}.${payloadB64}`;
    const signatureToVerify = Uint8Array.from(
      atob(signatureB64.replace(/-/g, '+').replace(/_/g, '/')),
      c => c.charCodeAt(0)
    );

    const isValid = await crypto.subtle.verify(
      'HMAC',
      key,
      signatureToVerify,
      encoder.encode(signatureInput)
    );

    return { valid: isValid, payload: isValid ? payload : undefined };
  } catch (error) {
    console.error('[manage-updates] Token verification error:', error);
    return { valid: false };
  }
}

// Extract admin token from request
function extractAdminToken(req: Request, body: any): string | null {
  // Check Authorization header first
  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  // Check body for adminToken
  if (body?.adminToken) {
    return body.adminToken;
  }
  
  return null;
}

// Actions that require admin authentication
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
    const { action, updateId, version, releaseNotes, downloadUrl, signature, platform, isActive } = body;

    console.log(`[manage-updates] Action: ${action}`);

    // Check if admin authentication is required
    if (ADMIN_REQUIRED_ACTIONS.includes(action)) {
      const adminToken = extractAdminToken(req, body);
      
      if (!adminToken) {
        console.log('[manage-updates] Admin action attempted without token');
        return new Response(
          JSON.stringify({ success: false, error: 'Admin authentication required' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { valid, payload } = await verifyAdminToken(adminToken);
      
      if (!valid) {
        console.log('[manage-updates] Invalid admin token');
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid or expired admin token' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`[manage-updates] Admin authenticated for action: ${action}`);
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

      case 'create': {
        const { data, error } = await supabase
          .from('app_updates')
          .insert({
            version,
            release_notes: releaseNotes,
            download_url: downloadUrl,
            signature,
            platform: platform || 'windows-x86_64',
            is_active: false,
          })
          .select()
          .single();

        if (error) {
          console.error('[manage-updates] Error creating update:', error);
          throw error;
        }

        console.log(`[manage-updates] Created update: ${version}`);
        return new Response(
          JSON.stringify({ success: true, update: data }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'update': {
        const { data, error } = await supabase
          .from('app_updates')
          .update({
            version,
            release_notes: releaseNotes,
            download_url: downloadUrl,
            signature,
            platform,
          })
          .eq('id', updateId)
          .select()
          .single();

        if (error) {
          console.error('[manage-updates] Error updating:', error);
          throw error;
        }

        console.log(`[manage-updates] Updated: ${version}`);
        return new Response(
          JSON.stringify({ success: true, update: data }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'toggle-active': {
        const { error } = await supabase
          .from('app_updates')
          .update({ is_active: isActive })
          .eq('id', updateId);

        if (error) {
          console.error('[manage-updates] Error toggling active:', error);
          throw error;
        }

        console.log(`[manage-updates] Toggled active: ${updateId} -> ${isActive}`);
        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'delete': {
        const { error } = await supabase
          .from('app_updates')
          .delete()
          .eq('id', updateId);

        if (error) {
          console.error('[manage-updates] Error deleting:', error);
          throw error;
        }

        console.log(`[manage-updates] Deleted: ${updateId}`);
        return new Response(
          JSON.stringify({ success: true }),
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
