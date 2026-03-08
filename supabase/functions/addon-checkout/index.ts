import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Add-on definitions mapping addon_id to feature keys and limits to apply
const ADDON_FEATURES: Record<string, { feature_keys?: Record<string, boolean>; limit_increases?: Record<string, number> }> = {
  extra_tours: {
    limit_increases: { max_saved_tours: 10 },
  },
  extra_vehicles: {
    limit_increases: { max_vehicles: 10 },
  },
  extra_drivers: {
    limit_increases: { max_drivers: 10 },
  },
  extra_clients: {
    limit_increases: { max_clients: 10 },
  },
  ai_analysis: {
    feature_keys: { ai_optimization: true, ai_pdf_analysis: true, cost_analysis: true },
  },
  team: {
    feature_keys: { multi_users: true },
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const body = await req.json();
    const { action } = body;

    // Action: create checkout session for add-ons
    if (action === "checkout") {
      const { license_id, email, items, origin_url } = body;

      if (!license_id || !email || !items?.length) {
        return new Response(
          JSON.stringify({ success: false, error: "Paramètres manquants" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
      if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not set");

      const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

      // Check existing customer
      const customers = await stripe.customers.list({ email, limit: 1 });
      const customerId = customers.data.length > 0 ? customers.data[0].id : undefined;

      // Build line items
      const lineItems = items.map((item: { price_id: string; quantity?: number }) => ({
        price: item.price_id,
        quantity: item.quantity || 1,
      }));

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        customer_email: customerId ? undefined : email,
        line_items: lineItems,
        mode: "subscription",
        success_url: `${origin_url || "https://opti-floow.lovable.app"}/settings?addon_success=true&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin_url || "https://opti-floow.lovable.app"}/settings?addon_cancelled=true`,
        metadata: {
          license_id,
          addon_ids: items.map((i: any) => i.addon_id).join(","),
        },
      });

      console.log("[addon-checkout] Session created:", session.id);

      return new Response(
        JSON.stringify({ success: true, url: session.url }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Action: activate add-ons after successful payment
    if (action === "activate") {
      const { license_id, session_id } = body;

      if (!license_id || !session_id) {
        return new Response(
          JSON.stringify({ success: false, error: "Paramètres manquants" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
      if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not set");

      const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

      // Verify the session
      const session = await stripe.checkout.sessions.retrieve(session_id);
      if (session.payment_status !== "paid") {
        return new Response(
          JSON.stringify({ success: false, error: "Paiement non complété" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check anti-replay
      const { data: existingAddon } = await supabase
        .from("license_addons")
        .select("id")
        .eq("addon_id", `stripe_session:${session_id}`)
        .maybeSingle();

      if (existingAddon) {
        return new Response(
          JSON.stringify({ success: true, already_activated: true }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const addonIds = (session.metadata?.addon_ids || "").split(",").filter(Boolean);
      const metaLicenseId = session.metadata?.license_id;

      if (metaLicenseId && metaLicenseId !== license_id) {
        return new Response(
          JSON.stringify({ success: false, error: "License mismatch" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get current features
      const { data: currentFeatures } = await supabase
        .from("license_features")
        .select("*")
        .eq("license_id", license_id)
        .maybeSingle();

      const featureUpdates: Record<string, any> = {};

      for (const addonId of addonIds) {
        const addonDef = ADDON_FEATURES[addonId];
        if (!addonDef) continue;

        // Apply feature keys
        if (addonDef.feature_keys) {
          for (const [key, value] of Object.entries(addonDef.feature_keys)) {
            featureUpdates[key] = value;
          }
        }

        // Apply limit increases
        if (addonDef.limit_increases) {
          for (const [key, increase] of Object.entries(addonDef.limit_increases)) {
            const currentVal = currentFeatures?.[key] ?? 0;
            // If current is null (unlimited), keep unlimited
            if (currentVal === null) continue;
            featureUpdates[key] = (currentVal as number) + increase;
          }
        }

        // Record in license_addons
        // Get price from line items
        const lineItems = await stripe.checkout.sessions.listLineItems(session_id, { limit: 10 });
        const lineItem = lineItems.data.find((li: any) => {
          // Match by metadata or just record all
          return true;
        });

        const monthlyPrice = lineItem?.amount_total ? lineItem.amount_total / 100 : 0;

        await supabase.from("license_addons").insert({
          license_id,
          addon_id: addonId,
          addon_name: getAddonName(addonId),
          monthly_price: monthlyPrice / addonIds.length, // Split evenly
          yearly_price: (monthlyPrice / addonIds.length) * 12,
          is_active: true,
          activated_at: new Date().toISOString(),
        });
      }

      // Update license_features
      if (Object.keys(featureUpdates).length > 0) {
        if (currentFeatures) {
          await supabase
            .from("license_features")
            .update(featureUpdates)
            .eq("license_id", license_id);
        } else {
          await supabase
            .from("license_features")
            .insert({ license_id, ...featureUpdates });
        }
      }

      // Mark session as processed (anti-replay)
      await supabase.from("license_addons").insert({
        license_id,
        addon_id: `stripe_session:${session_id}`,
        addon_name: "Session marker",
        monthly_price: 0,
        yearly_price: 0,
        is_active: false,
      });

      console.log("[addon-checkout] Activated addons:", addonIds, "for license:", license_id);

      return new Response(
        JSON.stringify({ success: true, activated: addonIds }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: "Action inconnue" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[addon-checkout] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || "Erreur inattendue" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function getAddonName(addonId: string): string {
  const names: Record<string, string> = {
    extra_tours: "+10 Tournées",
    extra_vehicles: "+10 Véhicules",
    extra_drivers: "+10 Conducteurs",
    extra_clients: "+10 Clients",
    ai_analysis: "Analyse IA",
    team: "Équipe & Confidentialité",
  };
  return names[addonId] || addonId;
}
