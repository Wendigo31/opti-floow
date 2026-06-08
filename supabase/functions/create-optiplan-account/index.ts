import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PLAN_MAX_USERS: Record<string, number> = {
  start: 1,
  pro: 3,
  enterprise: 999,
};

type AllowedRole = "exploitation" | "membre";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // 1. Authenticate the caller via their JWT
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return jsonResponse({ success: false, error: "Non authentifié" }, 401);
    }

    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: { user: caller }, error: callerError } = await authClient.auth.getUser();
    if (callerError || !caller) {
      return jsonResponse({ success: false, error: "Session invalide" }, 401);
    }

    // 2. Parse and validate input
    const body = await req.json().catch(() => ({}));
    const email: string = (body.email || "").trim().toLowerCase();
    const password: string = body.password || "";
    const displayName: string = (body.displayName || "").trim();
    const role: AllowedRole = body.role === "exploitation" ? "exploitation" : "membre";

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return jsonResponse({ success: false, error: "Email invalide" }, 400);
    }
    if (!password || password.length < 8) {
      return jsonResponse({ success: false, error: "Le mot de passe doit contenir au moins 8 caractères" }, 400);
    }
    if (!displayName) {
      return jsonResponse({ success: false, error: "Le nom est requis" }, 400);
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 3. Verify caller is "direction" and get their license
    const { data: callerRow, error: callerRowError } = await admin
      .from("company_users")
      .select("license_id, role")
      .eq("user_id", caller.id)
      .eq("is_active", true)
      .maybeSingle();

    if (callerRowError || !callerRow?.license_id) {
      return jsonResponse({ success: false, error: "Compte introuvable" }, 403);
    }
    if (callerRow.role !== "direction") {
      return jsonResponse({ success: false, error: "Seule la direction peut créer des comptes OptiPlan" }, 403);
    }

    const licenseId: string = callerRow.license_id;

    // 4. Check plan + seat limits
    const { data: license } = await admin
      .from("licenses")
      .select("plan_type, max_users")
      .eq("id", licenseId)
      .maybeSingle();

    const planType = license?.plan_type || "start";
    if (planType !== "pro" && planType !== "enterprise") {
      return jsonResponse({ success: false, error: "La gestion multi-utilisateurs nécessite un forfait Pro ou Enterprise" }, 403);
    }

    const maxUsers = license?.max_users || PLAN_MAX_USERS[planType] || 1;
    const { count: activeCount } = await admin
      .from("company_users")
      .select("id", { count: "exact", head: true })
      .eq("license_id", licenseId)
      .eq("is_active", true);

    if (typeof activeCount === "number" && activeCount >= maxUsers) {
      return jsonResponse({ success: false, error: `Limite de ${maxUsers} utilisateur(s) atteinte pour votre forfait` }, 403);
    }

    // 5. Prevent duplicates within the company
    const { data: existingMember } = await admin
      .from("company_users")
      .select("id")
      .eq("license_id", licenseId)
      .eq("email", email)
      .maybeSingle();

    if (existingMember) {
      return jsonResponse({ success: false, error: "Cet utilisateur est déjà membre de l'équipe" }, 409);
    }

    // 6. Create (or find) the auth user with the chosen password
    let authUserId: string | null = null;
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { license_id: licenseId, display_name: displayName },
    });

    if (createErr) {
      // User may already exist in auth — try to locate and update the password
      const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const found = list?.users?.find((u) => (u.email || "").toLowerCase() === email);
      if (!found) {
        console.error("[create-optiplan-account] createUser error:", createErr.message);
        return jsonResponse({ success: false, error: "Impossible de créer le compte (email déjà utilisé sur un autre compte)" }, 400);
      }
      authUserId = found.id;
      await admin.auth.admin.updateUserById(found.id, {
        password,
        user_metadata: { license_id: licenseId, display_name: displayName },
      });
    } else {
      authUserId = created.user?.id ?? null;
    }

    // 7. Create the company_users row (linked to the auth account)
    const { error: cuError } = await admin.from("company_users").insert({
      license_id: licenseId,
      user_id: authUserId,
      email,
      role,
      display_name: displayName,
      invited_by: caller.id,
      invited_at: new Date().toISOString(),
      accepted_at: new Date().toISOString(),
      is_active: true,
    });

    if (cuError) {
      console.error("[create-optiplan-account] company_users insert error:", cuError.message);
      return jsonResponse({ success: false, error: "Erreur lors de l'enregistrement du membre" }, 500);
    }

    return jsonResponse({ success: true, user_id: authUserId, email, role });
  } catch (error) {
    console.error("[create-optiplan-account] Unexpected error:", error);
    return jsonResponse({ success: false, error: (error as Error).message || "Erreur inattendue" }, 500);
  }
});