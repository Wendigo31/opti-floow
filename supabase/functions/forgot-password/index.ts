// Mot de passe oublié : envoie par email un code provisoire (10 caractères) qui remplace le mot
// de passe ; à la connexion avec ce code, l'utilisateur choisit un nouveau mot de passe.
// Réponse toujours identique (on ne révèle pas si un compte existe).
// Réglages : RESEND_API_KEY, MAIL_FROM (facultatif), APP_NAME, PUBLIC_APP_URL.
// Fichier partagé (bridge/shared/password) — le même dans les trois logiciels.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });
const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "Méthode non autorisée" }, 405);
  const done = json({ ok: true });
  try {
    const { login, app } = await req.json().catch(() => ({}));
    if (typeof login !== "string" || login.trim().length < 2 || login.length > 200) return done;
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await admin.rpc("forgot_password_issue", { p_login: login });
    if (error || !data || data.limited || !data.code) return done;

    const appName = Deno.env.get("APP_NAME") || (typeof app === "string" ? app.slice(0, 40) : "OptiGroup");
    const url = (Deno.env.get("PUBLIC_APP_URL") || "").replace(/\/$/, "");
    const from = Deno.env.get("MAIL_FROM") || `${appName} <support@opti-group.fr>`;
    const key = Deno.env.get("RESEND_API_KEY");
    if (!key) {
      console.error("forgot-password: RESEND_API_KEY manquant");
      return done;
    }
    const html = `<!doctype html><html lang="fr"><body style="margin:0;background:#f4f6f8;font-family:Arial,Helvetica,sans-serif;color:#1e293b">
<div style="max-width:520px;margin:0 auto;padding:24px 16px"><div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:24px">
<h1 style="font-size:20px;margin:0 0 12px">Votre code de connexion ${esc(appName)}</h1>
<p style="margin:0 0 16px;line-height:1.5">Bonjour ${esc(data.name || "")},<br>vous avez demandé à réinitialiser votre mot de passe${data.company ? ` pour <b>${esc(data.company)}</b>` : ""}. Connectez-vous avec ce code provisoire à la place de votre mot de passe :</p>
<p style="font-size:28px;font-weight:bold;letter-spacing:4px;text-align:center;background:#f1f5f9;border-radius:8px;padding:14px;margin:0 0 16px;font-family:monospace">${esc(data.code)}</p>
<p style="margin:0 0 16px;line-height:1.5">Vous choisirez ensuite un nouveau mot de passe. Votre ancien mot de passe ne fonctionne plus.</p>
${url ? `<p style="text-align:center;margin:0 0 16px"><a href="${esc(url)}" style="display:inline-block;background:#3553e9;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:bold">Ouvrir ${esc(appName)}</a></p>` : ""}
<p style="margin:0;font-size:12px;color:#64748b">Vous n'êtes pas à l'origine de cette demande ? Prévenez votre direction ou écrivez à support@opti-group.fr.</p>
</div></div></body></html>`;
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: [data.email],
        subject: `${appName} : votre code de connexion provisoire`,
        html,
        text: `Votre code de connexion provisoire ${appName} : ${data.code}\nConnectez-vous avec ce code puis choisissez un nouveau mot de passe.`,
      }),
    });
    if (!r.ok) console.error("forgot-password: envoi impossible", r.status, (await r.text()).slice(0, 200));
    return done;
  } catch (e) {
    console.error("forgot-password", e);
    return done;
  }
});
