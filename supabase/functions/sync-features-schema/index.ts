import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Complete list of feature columns that should exist in license_features table
// This is the single source of truth for the schema
const FEATURE_SCHEMA = {
  // Boolean features
  boolean_columns: [
    // Core features (Start)
    'basic_calculator',
    'itinerary_planning',
    'dashboard_basic',
    'cost_analysis_basic',
    'auto_pricing_basic',
    
    // Pro features
    'dashboard_analytics',
    'forecast',
    'trip_history',
    'multi_drivers',
    'cost_analysis',
    'margin_alerts',
    'dynamic_charts',
    'pdf_export_pro',
    'excel_export',
    'monthly_tracking',
    'auto_pricing',
    'saved_tours',
    'client_analysis_basic',
    
    // Enterprise features
    'ai_optimization',
    'ai_pdf_analysis',
    'multi_agency',
    'tms_erp_integration',
    'multi_users',
    'unlimited_vehicles',
    'client_analysis',
    'smart_quotes',
  ],
  
  // Integer limit columns
  integer_columns: [
    'max_drivers',
    'max_clients',
    'max_vehicles',
    'max_daily_charges',
    'max_monthly_charges',
    'max_yearly_charges',
    'max_saved_tours',
  ],
  
  // Default values for new boolean columns (based on plan type)
  default_boolean: false,
  default_integer: null,
};

// Verify admin JWT token
const verifyAdminToken = async (token: string): Promise<{ valid: boolean; payload?: any }> => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return { valid: false };
    
    const [headerB64, payloadB64, signatureB64] = parts;
    const data = `${headerB64}.${payloadB64}`;
    
    const encoder = new TextEncoder();
    const secret = Deno.env.get('ADMIN_SECRET_CODE') || '';
    
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );
    
    const signatureStr = signatureB64.replace(/-/g, '+').replace(/_/g, '/');
    const signaturePadded = signatureStr + '='.repeat((4 - signatureStr.length % 4) % 4);
    const signature = Uint8Array.from(atob(signaturePadded), c => c.charCodeAt(0));
    
    const isValid = await crypto.subtle.verify('HMAC', key, signature, encoder.encode(data));
    
    if (!isValid) return { valid: false };
    
    const payloadStr = payloadB64.replace(/-/g, '+').replace(/_/g, '/');
    const payloadPadded = payloadStr + '='.repeat((4 - payloadStr.length % 4) % 4);
    const payload = JSON.parse(atob(payloadPadded));
    
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return { valid: false };
    }
    
    if (payload.role !== 'admin') {
      return { valid: false };
    }
    
    return { valid: true, payload };
  } catch (error) {
    console.error('[sync-features-schema] JWT verification error:', error);
    return { valid: false };
  }
};

const handler = async (req: Request): Promise<Response> => {
  console.log("[sync-features-schema] Function called");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify admin authorization
    const authHeader = req.headers.get('authorization');
    let body: any = {};
    
    try {
      body = await req.json();
    } catch {
      // Empty body is ok for GET-like behavior
    }

    const action = body.action || "check";

    // Check authorization from token
    let isAuthorized = false;
    let adminEmail = 'system';

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const result = await verifyAdminToken(token);
      if (result.valid && result.payload) {
        isAuthorized = true;
        adminEmail = result.payload.email || 'admin';
      }
    }

    if (body.adminToken) {
      const result = await verifyAdminToken(body.adminToken);
      if (result.valid && result.payload) {
        isAuthorized = true;
        adminEmail = result.payload.email || 'admin';
      }
    }

    // For 'check' action, allow without auth (read-only)
    // For 'sync' action, require admin auth
    if (action === "sync" && !isAuthorized) {
      return new Response(
        JSON.stringify({ success: false, error: "Accès non autorisé" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get current columns in license_features table
    const { data: columns, error: columnsError } = await supabase.rpc('get_table_columns', {
      table_name: 'license_features'
    });

    // If RPC doesn't exist, use direct SQL query
    let existingColumns: string[] = [];
    
    if (columnsError) {
      console.log("[sync-features-schema] RPC not available, using direct query");
      
      // Use raw SQL to get column info
      const { data: rawColumns, error: rawError } = await supabase
        .from('license_features')
        .select('*')
        .limit(0);
      
      if (rawError) {
        // Try to infer from error message or use known columns
        console.error("[sync-features-schema] Cannot get columns:", rawError);
        
        // Fallback: query information_schema via edge function workaround
        // For now, we'll return the expected schema
        return new Response(
          JSON.stringify({ 
            success: true, 
            action: 'check',
            message: "Impossible de vérifier le schéma actuel. Utilisez une migration SQL pour synchroniser.",
            expected_schema: FEATURE_SCHEMA,
          }),
          { headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // If we got here, we can check the response headers or empty object keys
      // This approach won't work well, so let's use a different method
    } else {
      existingColumns = columns?.map((c: any) => c.column_name) || [];
    }

    // Calculate missing columns
    const allExpectedColumns = [
      ...FEATURE_SCHEMA.boolean_columns,
      ...FEATURE_SCHEMA.integer_columns,
    ];

    const missingBooleanColumns = FEATURE_SCHEMA.boolean_columns.filter(
      col => !existingColumns.includes(col)
    );
    
    const missingIntegerColumns = FEATURE_SCHEMA.integer_columns.filter(
      col => !existingColumns.includes(col)
    );

    const missingColumns = [...missingBooleanColumns, ...missingIntegerColumns];

    if (action === "check") {
      return new Response(
        JSON.stringify({ 
          success: true, 
          action: 'check',
          existing_columns: existingColumns.length,
          expected_columns: allExpectedColumns.length,
          missing_columns: missingColumns,
          missing_boolean: missingBooleanColumns,
          missing_integer: missingIntegerColumns,
          is_synchronized: missingColumns.length === 0,
        }),
        { headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (action === "sync") {
      if (missingColumns.length === 0) {
        return new Response(
          JSON.stringify({ 
            success: true, 
            action: 'sync',
            message: "Le schéma est déjà synchronisé",
            changes: [],
          }),
          { headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Build ALTER TABLE statements
      const alterStatements: string[] = [];
      
      for (const col of missingBooleanColumns) {
        // Determine default based on column name (core features = true, others = false)
        const isCore = ['basic_calculator', 'itinerary_planning', 'dashboard_basic'].includes(col);
        const defaultValue = isCore ? 'true' : 'false';
        alterStatements.push(`ADD COLUMN IF NOT EXISTS ${col} BOOLEAN DEFAULT ${defaultValue}`);
      }
      
      for (const col of missingIntegerColumns) {
        alterStatements.push(`ADD COLUMN IF NOT EXISTS ${col} INTEGER DEFAULT NULL`);
      }

      // Execute the ALTER TABLE
      const alterSql = `ALTER TABLE public.license_features ${alterStatements.join(', ')};`;
      
      console.log("[sync-features-schema] Executing SQL:", alterSql);

      const { error: alterError } = await supabase.rpc('exec_sql', { sql: alterSql });

      if (alterError) {
        console.error("[sync-features-schema] ALTER error:", alterError);
        
        // Return SQL for manual execution if RPC fails
        return new Response(
          JSON.stringify({ 
            success: false, 
            action: 'sync',
            error: "Impossible d'exécuter la synchronisation automatique",
            manual_sql: alterSql,
            missing_columns: missingColumns,
          }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Log the admin action
      try {
        await supabase.from('admin_audit_log').insert({
          admin_email: adminEmail,
          action: 'sync_schema',
          target_id: null,
          details: {
            added_columns: missingColumns,
            boolean_columns: missingBooleanColumns,
            integer_columns: missingIntegerColumns,
          },
          ip_address: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown',
        });
      } catch (logError) {
        console.error("[sync-features-schema] Failed to log action:", logError);
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          action: 'sync',
          message: `${missingColumns.length} colonnes ajoutées avec succès`,
          added_columns: missingColumns,
          changes: alterStatements,
        }),
        { headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get expected schema (for reference)
    if (action === "schema") {
      return new Response(
        JSON.stringify({ 
          success: true, 
          action: 'schema',
          schema: FEATURE_SCHEMA,
        }),
        { headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: false, 
        error: "Action non reconnue. Utilisez 'check', 'sync', ou 'schema'",
      }),
      { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: unknown) {
    console.error("[sync-features-schema] Error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
