import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Plan defaults - features enabled by default based on plan type
// SYNCHRONIZED WITH: src/types/features.ts PLAN_DEFAULTS, src/hooks/useLicense.ts PLAN_FEATURES,
// src/hooks/usePlanLimits.ts PLAN_LIMITS, src/components/activation/PricingSection.tsx
// UPDATE ALL FILES WHEN CHANGING!
// Single all-inclusive plan 'optiflow'. Legacy plan_type values map here.
export const PLAN_DEFAULTS: Record<string, Record<string, boolean | number | null>> = {
  optiflow: {
    // All features ON
    basic_calculator: true,
    itinerary_planning: true,
    dashboard_basic: true,
    dashboard_analytics: true,
    forecast: true,
    trip_history: true,
    multi_drivers: true,
    cost_analysis: true,
    cost_analysis_basic: true,
    margin_alerts: true,
    dynamic_charts: true,
    pdf_export_pro: true,
    excel_export: true,
    monthly_tracking: true,
    auto_pricing: true,
    auto_pricing_basic: true,
    saved_tours: true,
    client_analysis_basic: true,
    ai_optimization: true,
    ai_pdf_analysis: true,
    multi_agency: true,
    tms_erp_integration: true,
    multi_users: true,
    unlimited_vehicles: true,
    client_analysis: true,
    smart_quotes: true,
    // Tout illimité
    max_drivers: null,
    max_clients: null,
    max_vehicles: null,
    max_daily_charges: null,
    max_monthly_charges: null,
    max_yearly_charges: null,
    max_saved_tours: null,
    max_company_users: null,
  },
};

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Get effective features: merge plan defaults with custom features from DB
export function getEffectiveFeatures(planType: string, customFeatures: Record<string, any> | null): Record<string, any> {
  const defaults = PLAN_DEFAULTS.optiflow;
  if (!customFeatures) return { ...defaults };
  const merged: Record<string, any> = { ...defaults };
  for (const [key, value] of Object.entries(customFeatures)) {
    if (value !== null && value !== undefined) {
      merged[key] = value;
    }
  }
  return merged;
}

// Rate limiting helper
export const checkRateLimit = async (
  supabase: any,
  identifier: string,
  actionType: string,
  maxAttempts: number,
  windowMinutes: number
): Promise<{ allowed: boolean; retryAfter?: number }> => {
  const now = new Date();
  const windowStart = new Date(now.getTime() - windowMinutes * 60 * 1000);
  const { data: existing } = await supabase
    .from('rate_limits')
    .select('*')
    .eq('identifier', identifier)
    .eq('action_type', actionType)
    .maybeSingle();
  if (!existing) {
    await supabase.from('rate_limits').insert({
      identifier, action_type: actionType, attempts: 1,
      first_attempt_at: now.toISOString(), last_attempt_at: now.toISOString(),
    });
    return { allowed: true };
  }
  if (existing.locked_until && new Date(existing.locked_until) > now) {
    const retryAfter = Math.ceil((new Date(existing.locked_until).getTime() - now.getTime()) / 1000);
    return { allowed: false, retryAfter };
  }
  if (new Date(existing.first_attempt_at) < windowStart) {
    await supabase.from('rate_limits').update({
      attempts: 1, first_attempt_at: now.toISOString(), last_attempt_at: now.toISOString(), locked_until: null,
    }).eq('id', existing.id);
    return { allowed: true };
  }
  if (existing.attempts >= maxAttempts) {
    const lockedUntil = new Date(new Date(existing.first_attempt_at).getTime() + windowMinutes * 60 * 1000);
    await supabase.from('rate_limits').update({ locked_until: lockedUntil.toISOString() }).eq('id', existing.id);
    const retryAfter = Math.ceil((lockedUntil.getTime() - now.getTime()) / 1000);
    return { allowed: false, retryAfter };
  }
  await supabase.from('rate_limits').update({
    attempts: existing.attempts + 1, last_attempt_at: now.toISOString(),
  }).eq('id', existing.id);
  return { allowed: true };
};

// Create service role supabase client
export function createServiceClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// Extract client IP from request
export function getClientIp(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
         req.headers.get('x-real-ip') || 'unknown';
}

// Standard JSON response helper
export function jsonResponse(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

// Standard error response helper
export function errorResponse(error: string, status = 400): Response {
  return jsonResponse({ success: false, error }, status);
}

// License select fields (shared between check and validate)
export const LICENSE_SELECT_FIELDS = "id, email, is_active, first_name, last_name, company_name, siren, company_status, employee_count, address, city, postal_code, activated_at, plan_type, max_drivers, max_clients, max_daily_charges, max_monthly_charges, max_yearly_charges, show_user_info, show_company_info, show_address_info, show_license_info";

export const LICENSE_SELECT_FIELDS_EXTENDED = LICENSE_SELECT_FIELDS + ", license_code, company_identifier";

// Find license by company_identifier (case-insensitive) or license_code
export async function findLicense(supabase: any, normalizedCode: string, selectFields: string) {
  // Try company_identifier first (case-insensitive)
  const { data: licenseById } = await supabase
    .from("licenses")
    .select(selectFields)
    .ilike("company_identifier", normalizedCode)
    .maybeSingle();
  
  if (licenseById) {
    console.log("[validate-license] Found license by company_identifier (case-insensitive)");
    return { license: licenseById, error: null };
  }

  // Fall back to license_code
  const { data: licenseByCode, error } = await supabase
    .from("licenses")
    .select(selectFields)
    .eq("license_code", normalizedCode)
    .maybeSingle();
  
  if (licenseByCode) {
    console.log("[validate-license] Found license by license_code");
  }
  return { license: licenseByCode, error };
}
