import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Plan defaults
const PLAN_MAX_USERS: Record<string, number> = {
  start: 1,
  pro: 3,
  enterprise: 999,
};

// Plan feature defaults - what gets inserted into license_features at creation
const PLAN_FEATURE_DEFAULTS: Record<string, Record<string, any>> = {
  start: {
    basic_calculator: true,
    itinerary_planning: false,
    dashboard_basic: true,
    dashboard_analytics: false,
    forecast: false,
    trip_history: false,
    multi_drivers: false,
    cost_analysis: false,
    cost_analysis_basic: false,
    margin_alerts: false,
    dynamic_charts: false,
    pdf_export_pro: false,
    excel_export: false,
    monthly_tracking: false,
    auto_pricing: false,
    auto_pricing_basic: false,
    saved_tours: false,
    client_analysis_basic: false,
    ai_optimization: false,
    ai_pdf_analysis: false,
    multi_agency: false,
    tms_erp_integration: false,
    multi_users: false,
    unlimited_vehicles: false,
    client_analysis: false,
    smart_quotes: false,
    max_drivers: 2,
    max_clients: 2,
    max_vehicles: 2,
    max_daily_charges: 10,
    max_monthly_charges: 10,
    max_yearly_charges: 5,
    max_saved_tours: 0,
  },
  pro: {
    basic_calculator: true,
    itinerary_planning: false,
    dashboard_basic: true,
    dashboard_analytics: true,
    forecast: false,
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
    ai_optimization: false,
    ai_pdf_analysis: false,
    multi_agency: false,
    tms_erp_integration: false,
    multi_users: false,
    unlimited_vehicles: false,
    client_analysis: false,
    smart_quotes: false,
    max_drivers: 5,
    max_clients: 5,
    max_vehicles: 5,
    max_daily_charges: 50,
    max_monthly_charges: 50,
    max_yearly_charges: 25,
    max_saved_tours: 5,
  },
  enterprise: {
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
    max_drivers: null,
    max_clients: null,
    max_vehicles: null,
    max_daily_charges: null,
    max_monthly_charges: null,
    max_yearly_charges: null,
    max_saved_tours: null,
  },
};

const generateCompanyIdentifier = (companyName: string): string => {
  // Clean company name: uppercase, remove accents, keep only alphanumeric and spaces
  const cleaned = companyName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .substring(0, 20);

  // Add 4-char random suffix
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let suffix = "";
  for (let i = 0; i < 4; i++) {
    suffix += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return `${cleaned}-${suffix}`;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      stripe_session_id,
      siren,
      companyName,
      firstName,
      lastName,
      email,
      planType,
      address,
      city,
      postalCode,
      employeeCount,
      companyStatus,
    } = await req.json();

    console.log("[self-register] Starting registration for:", email);

    // Validate required fields
    if (!stripe_session_id || !email || !firstName || !lastName) {
      return new Response(
        JSON.stringify({ success: false, error: "Champs requis manquants" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Verify Stripe session
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      return new Response(
        JSON.stringify({ success: false, error: "Configuration Stripe manquante" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    let session;
    try {
      session = await stripe.checkout.sessions.retrieve(stripe_session_id);
    } catch (e) {
      console.error("[self-register] Invalid Stripe session:", e.message);
      return new Response(
        JSON.stringify({ success: false, error: "Session de paiement invalide" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (session.payment_status !== "paid") {
      return new Response(
        JSON.stringify({ success: false, error: "Paiement non complété" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[self-register] Stripe session verified, payment_status:", session.payment_status);

    // 2. Setup Supabase with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 3. Check anti-replay: ensure this session hasn't already been used
    const { data: existingLicense } = await supabase
      .from("licenses")
      .select("id, company_identifier")
      .eq("notes", `stripe_session:${stripe_session_id}`)
      .maybeSingle();

    if (existingLicense) {
      console.log("[self-register] Session already used, returning existing");
      return new Response(
        JSON.stringify({
          success: true,
          company_identifier: existingLicense.company_identifier,
          license_id: existingLicense.id,
          already_exists: true,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Rate limiting
    const clientIp =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "unknown";

    const { data: rateCheck } = await supabase
      .from("rate_limits")
      .select("*")
      .eq("identifier", clientIp)
      .eq("action_type", "self_register")
      .maybeSingle();

    if (rateCheck) {
      const windowStart = new Date(Date.now() - 60 * 60 * 1000); // 1 hour
      if (
        new Date(rateCheck.first_attempt_at) > windowStart &&
        rateCheck.attempts >= 5
      ) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Trop de tentatives. Réessayez dans 1 heure.",
          }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (new Date(rateCheck.first_attempt_at) < windowStart) {
        await supabase
          .from("rate_limits")
          .update({
            attempts: 1,
            first_attempt_at: new Date().toISOString(),
            last_attempt_at: new Date().toISOString(),
          })
          .eq("id", rateCheck.id);
      } else {
        await supabase
          .from("rate_limits")
          .update({
            attempts: rateCheck.attempts + 1,
            last_attempt_at: new Date().toISOString(),
          })
          .eq("id", rateCheck.id);
      }
    } else {
      await supabase.from("rate_limits").insert({
        identifier: clientIp,
        action_type: "self_register",
        attempts: 1,
      });
    }

    // 5. Determine plan from metadata or parameter
    const effectivePlan = session.metadata?.plan_type || planType || "start";

    // 6. Generate company identifier
    const effectiveCompanyName = companyName || `${firstName} ${lastName}`;
    let companyIdentifier = generateCompanyIdentifier(effectiveCompanyName);

    // Ensure uniqueness
    let attempts = 0;
    while (attempts < 10) {
      const { data: existing } = await supabase
        .from("licenses")
        .select("id")
        .eq("company_identifier", companyIdentifier)
        .maybeSingle();

      if (!existing) break;
      companyIdentifier = generateCompanyIdentifier(effectiveCompanyName);
      attempts++;
    }

    // 7. Generate unique license code
    const generateCode = () => {
      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
      const segments = [];
      for (let s = 0; s < 4; s++) {
        let segment = "";
        for (let i = 0; i < 4; i++) {
          segment += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        segments.push(segment);
      }
      return segments.join("-");
    };

    let licenseCode = generateCode();
    attempts = 0;
    while (attempts < 10) {
      const { data: existing } = await supabase
        .from("licenses")
        .select("id")
        .eq("license_code", licenseCode)
        .maybeSingle();
      if (!existing) break;
      licenseCode = generateCode();
      attempts++;
    }

    // 8. Create the license
    const { data: newLicense, error: licenseError } = await supabase
      .from("licenses")
      .insert({
        license_code: licenseCode,
        company_identifier: companyIdentifier,
        email: email.trim().toLowerCase(),
        plan_type: effectivePlan,
        max_users: PLAN_MAX_USERS[effectivePlan] || 1,
        first_name: firstName,
        last_name: lastName,
        company_name: effectiveCompanyName,
        siren: siren || null,
        address: address || null,
        city: city || null,
        postal_code: postalCode || null,
        employee_count: employeeCount || null,
        company_status: companyStatus || null,
        is_active: true,
        activated_at: new Date().toISOString(),
        notes: `stripe_session:${stripe_session_id}`,
      })
      .select()
      .single();

    if (licenseError) {
      console.error("[self-register] License creation error:", licenseError);
      return new Response(
        JSON.stringify({ success: false, error: "Erreur lors de la création de la licence" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[self-register] License created:", newLicense.id);

    // 9. Create company_users entry with direction role
    const displayName = `${firstName} ${lastName}`.trim();
    const { error: cuError } = await supabase.from("company_users").insert({
      license_id: newLicense.id,
      email: email.trim().toLowerCase(),
      role: "direction",
      display_name: displayName,
      is_active: true,
      invited_at: new Date().toISOString(),
    });

    if (cuError) {
      console.error("[self-register] Company user creation error:", cuError);
      // Don't fail - license was created
    }

    // 10. Create default features for the plan
    const planFeatures = PLAN_FEATURE_DEFAULTS[effectivePlan] || PLAN_FEATURE_DEFAULTS['start'];
    const { error: featError } = await supabase.from("license_features").insert({
      license_id: newLicense.id,
      ...planFeatures,
    });

    if (featError) {
      console.error("[self-register] Features creation error:", featError);
    }

    console.log("[self-register] Plan features created for plan:", effectivePlan);

    // 11. Log the action
    await supabase.from("admin_audit_log").insert({
      admin_email: "self-register",
      action: "self_register",
      target_id: newLicense.id,
      details: {
        email,
        plan_type: effectivePlan,
        stripe_session_id,
        company_name: effectiveCompanyName,
        siren,
      },
      ip_address: clientIp,
    });

    console.log("[self-register] Registration complete:", companyIdentifier);

    return new Response(
      JSON.stringify({
        success: true,
        company_identifier: companyIdentifier,
        license_id: newLicense.id,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[self-register] Unexpected error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || "Erreur inattendue" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
