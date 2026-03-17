import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Plan defaults - features enabled by default based on plan type
// SYNCHRONIZED WITH: src/types/features.ts PLAN_DEFAULTS, src/hooks/useLicense.ts PLAN_FEATURES,
// src/hooks/usePlanLimits.ts PLAN_LIMITS, src/components/activation/PricingSection.tsx
// UPDATE ALL FILES WHEN CHANGING!
export const PLAN_DEFAULTS: Record<string, Record<string, boolean | number | null>> = {
  start: {
    // Core features
    basic_calculator: true,
    itinerary_planning: true,    // Itinéraire PL inclus dans Start
    dashboard_basic: true,
    cost_analysis_basic: true,
    auto_pricing_basic: true,    // Calcul prix/km basique
    saved_tours: true,           // 5 tournées max
    // Pro/Enterprise features OFF
    dashboard_analytics: false,
    forecast: false,
    trip_history: false,         // Pro uniquement
    multi_drivers: false,
    cost_analysis: false,
    margin_alerts: false,
    dynamic_charts: false,
    pdf_export_pro: false,
    excel_export: false,
    monthly_tracking: false,
    auto_pricing: false,
    client_analysis_basic: false,
    ai_optimization: false,
    ai_pdf_analysis: false,
    multi_agency: false,
    tms_erp_integration: false,
    multi_users: false,
    unlimited_vehicles: false,
    client_analysis: false,
    smart_quotes: false,
    // Limites START - synchronized with PricingSection
    max_drivers: 5,
    max_clients: 10,
    max_vehicles: 5,
    max_daily_charges: 20,
    max_monthly_charges: 20,
    max_yearly_charges: 10,
    max_saved_tours: 5,
    max_company_users: 1,
    max_daily_calculations: 5,
    max_daily_analyses: 0,
  },
  pro: {
    // All Start features
    basic_calculator: true,
    itinerary_planning: true,
    dashboard_basic: true,
    cost_analysis_basic: true,
    auto_pricing_basic: true,
    saved_tours: true,
    // Pro features ON
    dashboard_analytics: true,
    trip_history: true,
    multi_drivers: true,
    cost_analysis: true,
    margin_alerts: true,
    dynamic_charts: true,
    pdf_export_pro: true,
    excel_export: true,
    monthly_tracking: true,
    auto_pricing: true,
    client_analysis_basic: true,
    ai_optimization: true,       // 5 analyses IA/jour
    ai_pdf_analysis: true,
    client_analysis: true,
    // Enterprise features OFF
    forecast: false,             // Enterprise uniquement
    smart_quotes: false,         // Enterprise uniquement
    multi_agency: false,
    tms_erp_integration: false,
    multi_users: false,
    unlimited_vehicles: false,
    // Limites PRO - synchronized with PricingSection
    max_drivers: 15,
    max_clients: 30,
    max_vehicles: 15,
    max_daily_charges: 50,
    max_monthly_charges: 50,
    max_yearly_charges: 25,
    max_saved_tours: 20,
    max_company_users: 3,
    max_daily_calculations: 25,
    max_daily_analyses: 5,
  },
  enterprise: {
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
  const defaults = PLAN_DEFAULTS[planType] || PLAN_DEFAULTS['start'];
  if (!customFeatures) return { ...defaults };
  const merged: Record<string, any> = { ...defaults };
  for (const [key, value] of Object.entries(customFeatures)) {
    if (value !== null && value !== undefined) {
      merged[key] = value;
    }
  }
  return merged;
}

// Get admin emails from environment variable
export const getAdminEmails = (): string[] => {
  const envEmails = Deno.env.get('ADMIN_EMAILS') || '';
  return envEmails.split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
};

// Verify admin JWT token
export const verifyAdminToken = async (token: string): Promise<{ valid: boolean; payload?: any }> => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.log('[validate-license] JWT: invalid format (not 3 parts)');
      return { valid: false };
    }
    const [headerB64, payloadB64, signatureB64] = parts;
    const data = `${headerB64}.${payloadB64}`;
    const encoder = new TextEncoder();
    const secret = (Deno.env.get('ADMIN_SECRET_CODE') ?? '').trim();
    if (!secret) {
      console.error('[validate-license] ADMIN_SECRET_CODE not configured');
      return { valid: false };
    }
    const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
    const signatureStr = signatureB64.replace(/-/g, '+').replace(/_/g, '/');
    const signaturePadded = signatureStr + '='.repeat((4 - signatureStr.length % 4) % 4);
    const signature = Uint8Array.from(atob(signaturePadded), c => c.charCodeAt(0));
    const isValid = await crypto.subtle.verify('HMAC', key, signature, encoder.encode(data));
    if (!isValid) {
      console.log('[validate-license] JWT: signature verification failed');
      return { valid: false };
    }
    const payloadStr = payloadB64.replace(/-/g, '+').replace(/_/g, '/');
    const payloadPadded = payloadStr + '='.repeat((4 - payloadStr.length % 4) % 4);
    const payload = JSON.parse(atob(payloadPadded));
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      console.log('[validate-license] JWT: token expired', { exp: payload.exp, now });
      return { valid: false };
    }
    if (payload.role !== 'admin') {
      console.log('[validate-license] JWT: invalid role', payload.role);
      return { valid: false };
    }
    console.log('[validate-license] JWT: verification successful for', payload.email);
    return { valid: true, payload };
  } catch (error) {
    console.error('[validate-license] JWT verification error:', error);
    return { valid: false };
  }
};

// Verify admin authorization - either by token or legacy email check
export const verifyAdminAuth = async (body: any, authHeader?: string | null): Promise<{ authorized: boolean; email?: string }> => {
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const result = await verifyAdminToken(token);
    if (result.valid && result.payload) {
      return { authorized: true, email: result.payload.email };
    }
  }
  if (body.adminToken) {
    const result = await verifyAdminToken(body.adminToken);
    if (result.valid && result.payload) {
      return { authorized: true, email: result.payload.email };
    }
  }
  const adminEmails = getAdminEmails();
  if (body.adminEmail && adminEmails.includes(body.adminEmail.toLowerCase())) {
    console.log('[validate-license] Warning: Using legacy email auth - should migrate to JWT');
    return { authorized: true, email: body.adminEmail };
  }
  return { authorized: false };
};

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

// Log admin action
export const logAdminAction = async (
  supabase: any, adminEmail: string, action: string,
  targetId: string | null, details: object, ipAddress: string
): Promise<void> => {
  try {
    await supabase.from('admin_audit_log').insert({
      admin_email: adminEmail, action, target_id: targetId, details, ip_address: ipAddress,
    });
  } catch (error) {
    console.error('[validate-license] Failed to log admin action:', error);
  }
};

// Map legacy roles to new simplified roles
export const mapToValidRole = (role: string | null | undefined): 'direction' | 'exploitation' | 'membre' => {
  const normalizedRole = (role || '').toLowerCase().trim();
  switch (normalizedRole) {
    case 'owner': case 'direction': return 'direction';
    case 'admin': case 'exploitation': return 'exploitation';
    case 'member': case 'membre': default: return 'membre';
  }
};

// Default max_users for plan
export const getDefaultMaxUsersForPlan = (planType: string): number => {
  const normalized = (planType || 'start').toLowerCase().trim();
  switch (normalized) {
    case 'enterprise': return 999;
    case 'pro': return 3;
    case 'start': default: return 1;
  }
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
