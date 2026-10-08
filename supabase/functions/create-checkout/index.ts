import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Single all-inclusive plan. Only these two billing keys are accepted.
const SINGLE_PLAN = "optiflow";
const ALLOWED_PLAN_KEYS = new Set(["optiflow_monthly", "optiflow_annual"]);

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const planKey = typeof body?.planKey === "string" ? body.planKey : "optiflow_monthly";

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 255) {
      return json({ error: "Email valide requis" }, 400);
    }
    if (!ALLOWED_PLAN_KEYS.has(planKey)) {
      return json({ error: "Forfait invalide : utilisez optiflow_monthly ou optiflow_annual" }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );
    const { data } = await supabase
      .from("pricing_config")
      .select("config_data")
      .eq("config_key", "stripe_prices")
      .maybeSingle();
    const priceId = (data?.config_data as Record<string, string> | undefined)?.[planKey];
    if (!priceId) return json({ error: "Prix Stripe non configuré" }, 500);

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const customers = await stripe.customers.list({ email, limit: 1 });
    const customerId = customers.data[0]?.id;

    const origin = req.headers.get("origin") || "https://opti-floow.lovable.app";

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : email,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      success_url: `${origin}/?onboarding=success&session_id={CHECKOUT_SESSION_ID}&plan=${SINGLE_PLAN}`,
      cancel_url: `${origin}/?onboarding=cancelled`,
      metadata: { plan_type: SINGLE_PLAN, billing: planKey, source: "self-register" },
    });

    return json({ url: session.url });
  } catch (error) {
    console.error("[create-checkout] Error:", error);
    return json({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
