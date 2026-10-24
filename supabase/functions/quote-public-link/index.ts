// Lien public d'acceptation de devis : remplace le changement de statut
// manuel actuel (src/pages/Tenders.tsx, qui reste disponible en secours) par
// un vrai lien envoyé par email au client, qu'il peut accepter ou refuser
// sans compte, en signant d'un nom tapé (pas de signature électronique
// certifiée par un tiers — scope validé explicitement le 24/10).
//
// 3 actions, toutes dans cette même fonction (comme validate-license) :
// - "generate" : appelée par un utilisateur connecté (Tenders.tsx) pour
//   créer le lien et envoyer l'email. Requiert un jeton de session valide
//   et l'appartenance à la société du devis (même niveau de permission que
//   le changement de statut manuel existant — pas réservé à Direction).
// - "get"      : appelée par la page publique (AcceptQuote.tsx) sans
//   authentification, pour afficher le résumé du devis à partir du jeton.
// - "respond"  : appelée par la page publique sans authentification, pour
//   enregistrer Accepter/Refuser et mettre à jour le statut du devis.
//
// La table quote_acceptance_links n'a aucune policy RLS (deny-all pour
// anon/authenticated) : tout accès passe par le client service-role créé
// ici, qui applique lui-même ses propres vérifications.
//
// Conventions reprises de supabase/functions/invite-teammate/index.ts
// (createServiceClient, corsHeaders, escapeHtml, gabarit HTML Resend).
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const DEFAULT_LINK_VALIDITY_DAYS = 30;

function createServiceClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (m) => map[m] || m);
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

function formatEur(n: number): string {
  return n.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
}

function formatDateFr(iso: string): string {
  return new Date(iso + (iso.length === 10 ? "T00:00" : "")).toLocaleDateString("fr-FR");
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const action: string | undefined = body?.action;

    if (action === "generate") return await handleGenerate(req, body);
    if (action === "get") return await handleGet(body);
    if (action === "respond") return await handleRespond(req, body);

    return jsonResponse({ success: false, error: "Action inconnue" }, 400);
  } catch (error) {
    console.error("[quote-public-link] Unexpected error:", error);
    return jsonResponse({ success: false, error: "Erreur inattendue" }, 500);
  }
});

// ---------------------------------------------------------------------------
// generate : utilisateur connecté → crée le lien, envoie l'email au client.
// ---------------------------------------------------------------------------
async function handleGenerate(req: Request, body: Record<string, unknown>): Promise<Response> {
  const quoteId: string | undefined = body?.quoteId as string | undefined;
  const origin: string | undefined = body?.origin as string | undefined;

  if (!quoteId) {
    return jsonResponse({ success: false, error: "quoteId requis" }, 400);
  }

  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!authHeader) {
    return jsonResponse({ success: false, error: "Authentification requise" }, 401);
  }

  const supabase = createServiceClient();
  const { data: { user: caller }, error: callerError } = await supabase.auth.getUser(
    authHeader.replace(/^Bearer\s+/i, ""),
  );
  if (callerError || !caller) {
    return jsonResponse({ success: false, error: "Session invalide" }, 401);
  }

  const { data: quote, error: quoteError } = await supabase
    .from("quotes")
    .select("id, license_id, user_id, client_id, quote_number, origin_address, destination_address, distance_km, price_ttc, valid_until, status, notes")
    .eq("id", quoteId)
    .maybeSingle();

  if (quoteError) {
    console.error("[quote-public-link] Error fetching quote:", quoteError);
    return jsonResponse({ success: false, error: "Erreur serveur" }, 500);
  }
  if (!quote) {
    return jsonResponse({ success: false, error: "Devis introuvable" }, 404);
  }

  // Autorisation : même niveau que le changement de statut manuel existant
  // (toute la société, pas réservé à Direction) — même repli
  // propriétaire/société que les policies RLS "own_or_company" sur quotes.
  let authorized = false;
  if (quote.license_id) {
    const { data: membership } = await supabase
      .from("company_users")
      .select("id")
      .eq("license_id", quote.license_id)
      .eq("user_id", caller.id)
      .eq("is_active", true)
      .maybeSingle();
    authorized = !!membership;
  }
  if (!authorized && quote.user_id === caller.id) {
    authorized = true;
  }
  if (!authorized) {
    return jsonResponse({ success: false, error: "Vous n'avez pas accès à ce devis" }, 403);
  }

  if (quote.status === "accepted" || quote.status === "rejected") {
    return jsonResponse({ success: false, error: "Ce devis a déjà été accepté ou refusé" }, 400);
  }

  if (!quote.client_id) {
    return jsonResponse({ success: false, error: "Ce devis n'a pas de client associé" }, 400);
  }

  const { data: client } = await supabase
    .from("clients")
    .select("name, email")
    .eq("id", quote.client_id)
    .maybeSingle();

  if (!client?.email) {
    return jsonResponse({ success: false, error: "Ce client n'a pas d'adresse email renseignée" }, 400);
  }

  let companyName = "OptiFlow";
  if (quote.license_id) {
    const { data: license } = await supabase
      .from("licenses")
      .select("company_name")
      .eq("id", quote.license_id)
      .maybeSingle();
    if (license?.company_name) companyName = license.company_name;
  }

  const expiresAt = quote.valid_until
    ? new Date(`${quote.valid_until}T23:59:59`)
    : new Date(Date.now() + DEFAULT_LINK_VALIDITY_DAYS * 24 * 60 * 60 * 1000);

  const { data: link, error: linkError } = await supabase
    .from("quote_acceptance_links")
    .insert({
      quote_id: quote.id,
      license_id: quote.license_id,
      sent_to_email: client.email,
      created_by: caller.id,
      expires_at: expiresAt.toISOString(),
    })
    .select("token")
    .single();

  if (linkError || !link) {
    console.error("[quote-public-link] Error creating link:", linkError);
    return jsonResponse({ success: false, error: "Impossible de créer le lien" }, 500);
  }

  const acceptUrl = `${origin || "https://opti-flow.app"}/accepter-devis?token=${link.token}`;

  try {
    await sendQuoteEmail({
      clientEmail: client.email,
      clientName: client.name,
      companyName,
      quoteNumber: quote.quote_number,
      originAddress: quote.origin_address,
      destinationAddress: quote.destination_address,
      priceTtc: quote.price_ttc,
      validUntil: quote.valid_until,
      acceptUrl,
    });
  } catch (emailError) {
    console.error("[quote-public-link] Error sending quote email:", emailError);
    return jsonResponse({ success: true, warning: "Lien créé mais l'email n'a pas pu être envoyé" });
  }

  // Si le devis était encore en brouillon, l'envoi du lien le fait passer à
  // "Envoyé" — cohérent avec le sélecteur de statut manuel existant. On ne
  // touche jamais un statut déjà plus avancé.
  if (quote.status === "draft") {
    await supabase.from("quotes").update({ status: "sent", updated_at: new Date().toISOString() }).eq("id", quote.id);
  }

  return jsonResponse({ success: true, expiresAt: expiresAt.toISOString() });
}

// ---------------------------------------------------------------------------
// get : page publique → résumé du devis à partir du jeton, sans auth.
// ---------------------------------------------------------------------------
async function handleGet(body: Record<string, unknown>): Promise<Response> {
  const token: string | undefined = body?.token as string | undefined;
  if (!token) {
    return jsonResponse({ success: false, error: "invalid" }, 400);
  }

  const supabase = createServiceClient();
  const { data: link, error: linkError } = await supabase
    .from("quote_acceptance_links")
    .select("quote_id, license_id, expires_at, responded_at, response, signed_name, refusal_comment")
    .eq("token", token)
    .maybeSingle();

  if (linkError) {
    console.error("[quote-public-link] Error fetching link:", linkError);
    return jsonResponse({ success: false, error: "server" }, 500);
  }
  if (!link) {
    return jsonResponse({ success: false, error: "invalid" }, 404);
  }

  const { data: quote } = await supabase
    .from("quotes")
    .select("quote_number, origin_address, destination_address, distance_km, price_ttc, valid_until, notes, client_id")
    .eq("id", link.quote_id)
    .maybeSingle();

  if (!quote) {
    return jsonResponse({ success: false, error: "invalid" }, 404);
  }

  let companyName = "OptiFlow";
  if (link.license_id) {
    const { data: license } = await supabase
      .from("licenses")
      .select("company_name")
      .eq("id", link.license_id)
      .maybeSingle();
    if (license?.company_name) companyName = license.company_name;
  }

  let clientName: string | null = null;
  if (quote.client_id) {
    const { data: client } = await supabase.from("clients").select("name").eq("id", quote.client_id).maybeSingle();
    clientName = client?.name ?? null;
  }

  const isExpired = !link.responded_at && new Date(link.expires_at).getTime() < Date.now();

  return jsonResponse({
    success: true,
    companyName,
    clientName,
    quote: {
      quoteNumber: quote.quote_number,
      originAddress: quote.origin_address,
      destinationAddress: quote.destination_address,
      distanceKm: quote.distance_km,
      priceTtc: quote.price_ttc,
      validUntil: quote.valid_until,
      notes: quote.notes,
    },
    expired: isExpired,
    alreadyResponded: !!link.responded_at,
    response: link.responded_at
      ? {
          type: link.response,
          signedName: link.signed_name,
          respondedAt: link.responded_at,
          comment: link.refusal_comment,
        }
      : null,
  });
}

// ---------------------------------------------------------------------------
// respond : page publique → enregistre Accepter/Refuser, sans auth.
// ---------------------------------------------------------------------------
async function handleRespond(req: Request, body: Record<string, unknown>): Promise<Response> {
  const token: string | undefined = body?.token as string | undefined;
  const responseAction: string | undefined = body?.responseAction as string | undefined;
  const signedNameRaw: string | undefined = body?.signedName as string | undefined;
  const comment: string | undefined = body?.comment as string | undefined;

  if (!token || !responseAction || !["accept", "refuse"].includes(responseAction)) {
    return jsonResponse({ success: false, error: "Requête invalide" }, 400);
  }

  const signedName = (signedNameRaw || "").trim();
  if (signedName.length < 2) {
    return jsonResponse({ success: false, error: "Merci de taper votre nom pour signer" }, 400);
  }

  const supabase = createServiceClient();
  const { data: link, error: linkError } = await supabase
    .from("quote_acceptance_links")
    .select("id, quote_id, expires_at, responded_at, response, signed_name, refusal_comment")
    .eq("token", token)
    .maybeSingle();

  if (linkError) {
    console.error("[quote-public-link] Error fetching link for respond:", linkError);
    return jsonResponse({ success: false, error: "server" }, 500);
  }
  if (!link) {
    return jsonResponse({ success: false, error: "invalid" }, 404);
  }

  if (link.responded_at) {
    return jsonResponse({
      success: false,
      error: "already_responded",
      response: { type: link.response, signedName: link.signed_name, comment: link.refusal_comment },
    }, 409);
  }

  if (new Date(link.expires_at).getTime() < Date.now()) {
    return jsonResponse({ success: false, error: "expired" }, 410);
  }

  const forwardedFor = req.headers.get("x-forwarded-for");
  const responseIp = forwardedFor ? forwardedFor.split(",")[0].trim() : null;
  const responseUserAgent = req.headers.get("user-agent") || null;
  const respondedAt = new Date().toISOString();
  const response = responseAction === "accept" ? "accepted" : "refused";

  const { error: updateLinkError } = await supabase
    .from("quote_acceptance_links")
    .update({
      responded_at: respondedAt,
      response,
      signed_name: signedName,
      refusal_comment: responseAction === "refuse" ? (comment?.trim() || null) : null,
      response_ip: responseIp,
      response_user_agent: responseUserAgent,
    })
    .eq("id", link.id);

  if (updateLinkError) {
    console.error("[quote-public-link] Error updating link:", updateLinkError);
    return jsonResponse({ success: false, error: "Erreur lors de l'enregistrement" }, 500);
  }

  const { error: updateQuoteError } = await supabase
    .from("quotes")
    .update({
      status: responseAction === "accept" ? "accepted" : "rejected",
      updated_at: respondedAt,
    })
    .eq("id", link.quote_id);

  if (updateQuoteError) {
    console.error("[quote-public-link] Error updating quote status:", updateQuoteError);
    // Le lien est déjà enregistré comme répondu : ne pas faire échouer la
    // requête côté client pour autant, le statut pourra être corrigé à la
    // main depuis Tenders.tsx si besoin.
  }

  return jsonResponse({ success: true });
}

// ---------------------------------------------------------------------------
// Email envoyé au client (gabarit repris de invite-teammate/index.ts).
// ---------------------------------------------------------------------------
async function sendQuoteEmail(params: {
  clientEmail: string;
  clientName: string | null;
  companyName: string;
  quoteNumber: string;
  originAddress: string;
  destinationAddress: string;
  priceTtc: number;
  validUntil: string | null;
  acceptUrl: string;
}) {
  const { clientEmail, clientName, companyName, quoteNumber, originAddress, destinationAddress, priceTtc, validUntil, acceptUrl } = params;
  const safeCompany = escapeHtml(companyName);
  const safeClientName = clientName ? escapeHtml(clientName) : null;
  const greeting = safeClientName ? `Bonjour ${safeClientName}` : "Bonjour";
  const validityLine = validUntil
    ? `<p style="margin: 0 0 16px 0; color: #6b7280; font-size: 14px;">Devis valable jusqu'au ${formatDateFr(validUntil)}.</p>`
    : "";

  const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Devis ${escapeHtml(quoteNumber)}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7fa;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; max-width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <tr>
            <td style="padding: 40px 40px 20px 40px; text-align: center; background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); border-radius: 12px 12px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">${safeCompany}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 16px 0; color: #1e40af; font-size: 22px;">${greeting}, votre devis ${escapeHtml(quoteNumber)} est prêt</h2>
              <p style="margin: 0 0 8px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                ${escapeHtml(originAddress)} → ${escapeHtml(destinationAddress)}
              </p>
              <p style="margin: 0 0 16px 0; color: #111827; font-size: 24px; font-weight: 700;">
                ${formatEur(priceTtc)} TTC
              </p>
              ${validityLine}
              <div style="text-align: center; margin: 32px 0;">
                <a href="${acceptUrl}" style="display: inline-block; background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                  Consulter et répondre au devis
                </a>
              </div>
              <p style="margin: 0; color: #9ca3af; font-size: 13px; line-height: 1.6;">
                Vous pourrez accepter ou refuser ce devis directement depuis cette page, en indiquant votre nom.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px 40px; background-color: #f8fafc; border-radius: 0 0 12px 12px; text-align: center;">
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">© ${new Date().getFullYear()} ${safeCompany}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  await resend.emails.send({
    from: "OptiFlow <support@opti-group.fr>",
    to: [clientEmail],
    subject: `Devis ${quoteNumber} - ${companyName}`,
    html: emailHtml,
  });
}
