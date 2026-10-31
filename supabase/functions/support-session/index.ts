// Session support ouverte depuis OptiCentral : échange un jeton à usage unique (créé par
// central_support_session, valable 3 minutes) contre un lien de connexion de l'utilisateur.
// Le navigateur valide ce lien (verifyOtp) et obtient la vraie session de l'utilisateur.
// Fichier partagé (bridge/shared/support-session) — le même dans les trois logiciels.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "Méthode non autorisée" }, 405);
  try {
    const { token } = await req.json().catch(() => ({}));
    if (typeof token !== "string" || !/^[0-9a-f]{64}$/.test(token)) {
      return json({ error: "Lien de session invalide." }, 400);
    }
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: claim, error } = await admin.rpc("support_session_claim", { p_token: token });
    if (error || !claim?.email) {
      return json({ error: "Lien expiré ou déjà utilisé." }, 403);
    }
    const { data: link, error: linkError } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email: claim.email,
    });
    const hashed = link?.properties?.hashed_token;
    if (linkError || !hashed) {
      return json({ error: "Impossible d'ouvrir la session de cet utilisateur." }, 500);
    }
    return json({ token_hash: hashed, email: claim.email, admin_email: claim.admin_email ?? null });
  } catch (_e) {
    return json({ error: "Erreur serveur." }, 500);
  }
});
