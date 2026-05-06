import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

const PLAN_BY_AMOUNT: Record<number, string> = {
  7900: "start", 19900: "pro", 49900: "enterprise",
  71100: "start", 179100: "pro", 449100: "enterprise",
};

function planFromPrice(price: Stripe.Price | null | undefined): string | null {
  if (!price) return null;
  const meta = (price.metadata?.plan_type || price.product && (price.product as any)?.metadata?.plan_type) as string | undefined;
  if (meta && ["start", "pro", "enterprise"].includes(meta)) return meta;
  if (typeof price.unit_amount === "number" && PLAN_BY_AMOUNT[price.unit_amount]) return PLAN_BY_AMOUNT[price.unit_amount];
  return null;
}

async function syncSubscriptionToLicense(
  stripe: Stripe,
  supabase: ReturnType<typeof createClient>,
  subscriptionId: string,
  fallbackEmail?: string | null,
) {
  const sub = await stripe.subscriptions.retrieve(subscriptionId, { expand: ["items.data.price.product", "customer"] });
  const customer = sub.customer as Stripe.Customer;
  const email = (customer && !("deleted" in customer) ? customer.email : null) || fallbackEmail || null;
  if (!email) {
    console.warn("[stripe-webhook] No email for subscription", subscriptionId);
    return;
  }
  const item = sub.items.data[0];
  const planType = planFromPrice(item?.price);
  const periodEnd = (item as any)?.current_period_end || (sub as any).current_period_end;
  const isActive = ["active", "trialing", "past_due"].includes(sub.status);

  const update: Record<string, unknown> = {
    stripe_customer_id: typeof sub.customer === "string" ? sub.customer : sub.customer.id,
    stripe_subscription_id: sub.id,
    subscription_status: sub.status,
    current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    last_stripe_sync_at: new Date().toISOString(),
    is_active: isActive,
  };
  if (planType) update.plan_type = planType;

  const { data: existing } = await supabase
    .from("licenses")
    .select("id")
    .eq("email", email.toLowerCase())
    .maybeSingle();

  if (existing) {
    await supabase.from("licenses").update(update).eq("id", existing.id);
    console.log("[stripe-webhook] Updated license", existing.id, "->", sub.status, planType);
  } else {
    console.log("[stripe-webhook] No license found for email", email);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!stripeKey || !webhookSecret) {
    return new Response(JSON.stringify({ error: "Stripe not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  const signature = req.headers.get("stripe-signature");
  if (!signature) return new Response("Missing signature", { status: 400, headers: corsHeaders });

  const rawBody = await req.text();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(rawBody, signature, webhookSecret);
  } catch (err) {
    console.error("[stripe-webhook] Signature verification failed:", (err as Error).message);
    return new Response(`Webhook Error: ${(err as Error).message}`, { status: 400, headers: corsHeaders });
  }

  console.log("[stripe-webhook] Event:", event.type, event.id);

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode === "subscription" && session.subscription) {
          await syncSubscriptionToLicense(stripe, supabase, session.subscription as string, session.customer_email);
        }
        break;
      }
      case "invoice.paid":
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subId = (invoice as any).subscription as string | null;
        if (subId) await syncSubscriptionToLicense(stripe, supabase, subId, invoice.customer_email);
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await syncSubscriptionToLicense(stripe, supabase, sub.id);
        break;
      }
      default:
        console.log("[stripe-webhook] Unhandled:", event.type);
    }
  } catch (err) {
    console.error("[stripe-webhook] Handler error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  return new Response(JSON.stringify({ received: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
});