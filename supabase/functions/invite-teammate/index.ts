// Invite un nouveau membre de l'équipe par email, avec un vrai lien
// d'activation (l'utilisateur choisit lui-même son mot de passe) au lieu de
// l'ancien système où la personne devait connaître à la main le code de
// licence partagé de la société pour s'auto-activer.
//
// Remplace l'ancienne insertion directe (sans compte) côté front
// (src/hooks/useTeam.ts, addMember) : désormais le compte Supabase Auth est
// créé ici, côté serveur, avant que la ligne company_users ne soit écrite —
// company_users.user_id n'est donc plus jamais laissé vide pour un nouveau
// membre invité par ce chemin.
//
// Conventions reprises de supabase/functions/validate-license/shared.ts
// (createServiceClient, corsHeaders) et de send-license-email/index.ts
// (envoi via Resend, gabarit HTML).
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

// Les 4 rôles métier réels (src/types/team.ts est la source de vérité côté
// front ; dupliqué ici car les fonctions edge ne partagent pas le graphe de
// modules Vite — même convention que PLAN_DEFAULTS dans shared.ts).
const VALID_ROLES = ["direction", "exploitation", "comptabilite", "rh"] as const;
type TeamRole = (typeof VALID_ROLES)[number];

const ROLE_LABELS: Record<TeamRole, string> = {
  direction: "Direction",
  exploitation: "Exploitation",
  comptabilite: "Comptabilité",
  rh: "RH",
};

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

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const licenseId: string | undefined = body?.licenseId;
    const emailRaw: string | undefined = body?.email;
    const role: string | undefined = body?.role;
    const displayName: string | undefined = body?.displayName;
    const origin: string | undefined = body?.origin;

    if (!licenseId || !emailRaw || !role) {
      return jsonResponse({ success: false, error: "licenseId, email et role sont requis" }, 400);
    }

    const email = emailRaw.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return jsonResponse({ success: false, error: "Adresse email invalide" }, 400);
    }

    if (!VALID_ROLES.includes(role as TeamRole)) {
      return jsonResponse({ success: false, error: "Rôle invalide" }, 400);
    }

    // 1. Identifier l'appelant à partir de son propre jeton de session (pas le
    // jeton admin de Yanis — c'est une action interne à la société).
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

    // 2. Vérifier que l'appelant est bien Direction ou RH pour CETTE société —
    // seules ces deux fonctions peuvent créer de nouveaux accès.
    const { data: callerMembership, error: callerMembershipError } = await supabase
      .from("company_users")
      .select("role, is_active")
      .eq("license_id", licenseId)
      .eq("user_id", caller.id)
      .eq("is_active", true)
      .maybeSingle();

    if (callerMembershipError) {
      console.error("[invite-teammate] Error checking caller membership:", callerMembershipError);
      return jsonResponse({ success: false, error: "Erreur serveur" }, 500);
    }

    const callerRole = callerMembership?.role as TeamRole | undefined;
    const callerIsDirection = callerRole === "direction";
    const callerIsTeamManager = callerIsDirection || callerRole === "rh";

    if (!callerIsTeamManager) {
      return jsonResponse({ success: false, error: "Vous n'avez pas les permissions pour inviter des membres" }, 403);
    }

    // 3. Direction et RH peuvent inviter Exploitation/Comptabilité/RH, mais
    // jamais un nouveau compte Direction (seul un compte Direction existant,
    // ou le panneau admin, peut créer un compte Direction).
    if (role === "direction" && !callerIsDirection) {
      return jsonResponse({ success: false, error: "Seule la Direction peut créer un compte Direction" }, 403);
    }

    // 4. Limite d'utilisateurs de la licence (+ code, nécessaire plus bas pour
    // que la personne invitée puisse finaliser son activation).
    const { data: license } = await supabase
      .from("licenses")
      .select("max_users, license_code")
      .eq("id", licenseId)
      .maybeSingle();
    const maxUsers = license?.max_users ?? 999;

    if (!license?.license_code) {
      console.error("[invite-teammate] License not found or missing license_code:", licenseId);
      return jsonResponse({ success: false, error: "Licence introuvable" }, 404);
    }

    const { count: currentUserCount } = await supabase
      .from("company_users")
      .select("id", { count: "exact", head: true })
      .eq("license_id", licenseId)
      .eq("is_active", true);

    if (typeof currentUserCount === "number" && currentUserCount >= maxUsers) {
      return jsonResponse({ success: false, error: `Limite de ${maxUsers} utilisateur(s) atteinte pour votre forfait` }, 400);
    }

    // 5. Déjà membre ?
    const { data: existingMember } = await supabase
      .from("company_users")
      .select("id, is_active")
      .eq("license_id", licenseId)
      .eq("email", email)
      .maybeSingle();

    if (existingMember?.is_active) {
      return jsonResponse({ success: false, error: "Cet utilisateur est déjà membre de l'équipe" }, 400);
    }

    // 6. Créer (ou réutiliser) le compte Supabase Auth et générer un lien
    // d'activation à usage unique — pas d'envoi automatique via le système
    // d'email intégré de Supabase (non configuré sur ce projet), l'email est
    // envoyé explicitement ci-dessous via Resend, comme pour les autres
    // emails transactionnels d'OptiFlow. Le code de licence est passé en
    // paramètre de l'URL de redirection (préservé par Supabase après la
    // vérification du lien) pour que src/pages/AcceptInvite.tsx puisse
    // finaliser l'activation via le même chemin (validateLicense) que les
    // membres déjà présents, sans que la personne invitée ait à le ressaisir.
    const redirectTo = `${origin || "https://opti-flow.app"}/accept-invite?lc=${encodeURIComponent(license.license_code)}`;
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: "invite",
      email,
      options: { redirectTo },
    });

    if (linkError || !linkData?.user) {
      // L'utilisateur a peut-être déjà un compte Auth (ex. invité par une autre
      // société, ou compte créé puis retiré) — generateLink échoue alors avec
      // "email already registered". On récupère son id existant pour le relier.
      if (linkError?.message?.toLowerCase().includes("already") ) {
        const { data: existingUsers } = await supabase.auth.admin.listUsers();
        const existingAuthUser = existingUsers?.users?.find(
          (u: { email?: string }) => u.email?.toLowerCase() === email,
        );
        if (!existingAuthUser) {
          console.error("[invite-teammate] generateLink failed and no matching existing user:", linkError);
          return jsonResponse({ success: false, error: "Impossible de créer l'invitation" }, 500);
        }
        const { data: resetLinkData, error: resetLinkError } = await supabase.auth.admin.generateLink({
          type: "magiclink",
          email,
          options: { redirectTo },
        });
        if (resetLinkError || !resetLinkData) {
          console.error("[invite-teammate] magiclink fallback failed:", resetLinkError);
          return jsonResponse({ success: false, error: "Impossible de créer l'invitation" }, 500);
        }
        return await finalizeInvite(supabase, {
          licenseId, email, role: role as TeamRole, displayName, callerId: caller.id,
          authUserId: existingAuthUser.id,
          actionLink: resetLinkData.properties?.action_link,
        });
      }
      console.error("[invite-teammate] generateLink failed:", linkError);
      return jsonResponse({ success: false, error: "Impossible de créer l'invitation" }, 500);
    }

    return await finalizeInvite(supabase, {
      licenseId, email, role: role as TeamRole, displayName, callerId: caller.id,
      authUserId: linkData.user.id,
      actionLink: linkData.properties?.action_link,
    });
  } catch (error) {
    console.error("[invite-teammate] Unexpected error:", error);
    return jsonResponse({ success: false, error: "Erreur inattendue" }, 500);
  }
});

async function finalizeInvite(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  params: {
    licenseId: string; email: string; role: TeamRole; displayName?: string;
    callerId: string; authUserId: string; actionLink?: string;
  },
): Promise<Response> {
  const { licenseId, email, role, displayName, callerId, authUserId, actionLink } = params;

  // 7. Écrire la ligne company_users avec un user_id réel dès la création
  // (contrairement à l'ancien addMember, qui la laissait vide jusqu'à une
  // éventuelle auto-activation manuelle).
  const { error: upsertError } = await supabase
    .from("company_users")
    .upsert(
      {
        license_id: licenseId,
        user_id: authUserId,
        email,
        role,
        display_name: displayName?.trim() || null,
        invited_by: callerId,
        invited_at: new Date().toISOString(),
        is_active: true,
      },
      { onConflict: "license_id,email" },
    );

  if (upsertError) {
    console.error("[invite-teammate] Error writing company_users row:", upsertError);
    return jsonResponse({ success: false, error: "Erreur lors de l'ajout du membre" }, 500);
  }

  if (!actionLink) {
    console.error("[invite-teammate] No action_link returned, invite row created but email not sent");
    return jsonResponse({ success: true, warning: "Membre ajouté mais l'email d'invitation n'a pas pu être envoyé" });
  }

  try {
    await sendInviteEmail(email, displayName, role, actionLink);
  } catch (emailError) {
    console.error("[invite-teammate] Error sending invite email:", emailError);
    return jsonResponse({ success: true, warning: "Membre ajouté mais l'email d'invitation n'a pas pu être envoyé" });
  }

  return jsonResponse({ success: true });
}

async function sendInviteEmail(email: string, displayName: string | undefined, role: TeamRole, actionLink: string) {
  const safeEmail = escapeHtml(email);
  const safeName = displayName ? escapeHtml(displayName) : null;
  const roleLabel = ROLE_LABELS[role];
  const greeting = safeName ? `Bonjour ${safeName}` : "Bonjour";

  const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invitation OptiFlow</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7fa;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; max-width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <tr>
            <td style="padding: 40px 40px 20px 40px; text-align: center; background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); border-radius: 12px 12px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">OptiFlow</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 16px 0; color: #1e40af; font-size: 22px;">${greeting}, vous êtes invité(e) à rejoindre OptiFlow</h2>
              <p style="margin: 0 0 16px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                Votre entreprise vous donne accès à OptiFlow avec le rôle <strong>${escapeHtml(roleLabel)}</strong>.
              </p>
              <div style="text-align: center; margin: 32px 0;">
                <a href="${actionLink}" style="display: inline-block; background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                  Activer mon accès
                </a>
              </div>
              <p style="margin: 0 0 12px 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                Ce lien vous permettra de choisir votre mot de passe et d'accéder directement à OptiFlow avec l'adresse <strong>${safeEmail}</strong>.
              </p>
              <p style="margin: 20px 0 0 0; color: #9ca3af; font-size: 13px; line-height: 1.6;">
                Si vous ne vous attendiez pas à cette invitation, vous pouvez ignorer cet email.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px 40px; background-color: #f8fafc; border-radius: 0 0 12px 12px; text-align: center;">
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">© ${new Date().getFullYear()} OptiFlow - Tous droits réservés</p>
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
    to: [email],
    subject: "Vous êtes invité(e) à rejoindre OptiFlow",
    html: emailHtml,
  });
}
