import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface LicenseEmailRequest {
  email: string;
  licenseCode: string;
  firstName?: string;
  lastName?: string;
  companyName?: string;
}

// HTML sanitization to prevent XSS
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m] || m);
}

const handler = async (req: Request): Promise<Response> => {
  console.log("send-license-email function called");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, licenseCode, firstName, lastName, companyName }: LicenseEmailRequest = await req.json();

    if (!email || !licenseCode) {
      return new Response(
        JSON.stringify({ success: false, error: "Email et code de licence requis" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Sanitize all user inputs
    const safeEmail = escapeHtml(email);
    const safeLicenseCode = escapeHtml(licenseCode);
    const safeFirstName = firstName ? escapeHtml(firstName) : null;
    const safeLastName = lastName ? escapeHtml(lastName) : null;
    const safeCompanyName = companyName ? escapeHtml(companyName) : null;

    const userName = safeFirstName && safeLastName 
      ? `${safeFirstName} ${safeLastName}` 
      : safeFirstName || safeLastName || "Client";

    const companyInfo = safeCompanyName ? `<p style="margin: 0 0 20px 0; color: #666;">Entreprise : <strong>${safeCompanyName}</strong></p>` : "";

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirmation de licence OptiFlow</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7fa;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; max-width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px 40px; text-align: center; background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); border-radius: 12px 12px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">OptiFlow</h1>
              <p style="margin: 10px 0 0 0; color: #dbeafe; font-size: 14px;">Le coût réel de chaque tournée, pour les PME du transport routier</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 16px 0; color: #1e40af; font-size: 22px;">Bienvenue ${userName}, votre accès OptiFlow est actif</h2>

              <p style="margin: 0 0 16px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                Vous dirigez une entreprise de transport : chaque tournée doit être rentable, et vous n'avez pas le temps de refaire vos calculs dans un tableur.
                OptiFlow vous donne, en quelques secondes, le <strong>coût réel de chaque tournée</strong> et la marge qu'elle dégage vraiment.
              </p>

              ${companyInfo}

              <!-- Benefits -->
              <div style="margin: 24px 0; padding: 20px 24px; background-color: #f0fdf4; border-left: 4px solid #16a34a; border-radius: 0 8px 8px 0;">
                <p style="margin: 0 0 10px 0; color: #14532d; font-weight: 600;">Ce que vous gagnez concrètement :</p>
                <ul style="margin: 0; padding-left: 20px; color: #166534; line-height: 1.8; font-size: 15px;">
                  <li><strong>Un prix juste à chaque devis</strong> : carburant, péages poids lourds, salaire chargé du conducteur, amortissement du camion et de la remorque, frais de structure — les 9 postes de coût sont intégrés automatiquement.</li>
                  <li><strong>Zéro tournée à perte</strong> : une alerte vous prévient dès qu'une marge passe sous votre seuil.</li>
                  <li><strong>Des itinéraires adaptés aux poids lourds</strong> : ponts bas, restrictions de tonnage et péages classe 4 pris en compte.</li>
                  <li><strong>Une équipe alignée</strong> : votre exploitation planifie les tournées et les conducteurs, sans jamais voir les salaires ni les marges.</li>
                  <li><strong>Un pilotage clair</strong> : tableau de bord par client, par véhicule et par conducteur, avec prévisions sur 6 mois.</li>
                </ul>
              </div>

              <!-- License Box -->
              <div style="background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border: 2px solid #3b82f6; border-radius: 8px; padding: 24px; margin: 30px 0; text-align: center;">
                <p style="margin: 0 0 10px 0; color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Votre code de licence</p>
                <p style="margin: 0; color: #1e40af; font-size: 24px; font-weight: 700; font-family: 'Courier New', monospace; letter-spacing: 2px;">${safeLicenseCode}</p>
              </div>

              <!-- Email Box -->
              <div style="background-color: #f8fafc; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <p style="margin: 0 0 8px 0; color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Email associé à la licence</p>
                <p style="margin: 0; color: #1e40af; font-size: 16px; font-weight: 600;">${safeEmail}</p>
              </div>

              <!-- Instructions -->
              <div style="margin: 30px 0; padding: 20px; background-color: #fefce8; border-left: 4px solid #eab308; border-radius: 0 8px 8px 0;">
                <p style="margin: 0 0 10px 0; color: #854d0e; font-weight: 600;">Vos 15 premières minutes, pour un résultat immédiat :</p>
                <ol style="margin: 0; padding-left: 20px; color: #713f12; line-height: 1.8;">
                  <li>Ouvrez OptiFlow et activez votre licence avec le code ci-dessus et l'email <strong>${safeEmail}</strong></li>
                  <li>Renseignez un véhicule (consommation, loyer ou amortissement) et un conducteur (salaire, charges)</li>
                  <li>Saisissez votre tournée la plus fréquente : vous obtenez son coût réel et sa marge</li>
                  <li>Invitez votre exploitant depuis l'onglet Équipe pour partager le planning</li>
                </ol>
              </div>

              <p style="margin: 0 0 12px 0; color: #374151; font-size: 15px; line-height: 1.6;">
                Besoin d'aide pour importer votre flotte ou vos conducteurs ? Répondez simplement à cet email, nous vous accompagnons.
              </p>

              <p style="margin: 20px 0 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                Conservez précieusement cet email : il contient votre code de licence.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #f8fafc; border-radius: 0 0 12px 12px; text-align: center;">
              <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px;">L'équipe OptiFlow</p>
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

    console.log(`Sending license email to: ${email}`);

    const emailResponse = await resend.emails.send({
      from: "OptiFlow <support@opti-group.fr>",
      to: [email],
      subject: "Votre accès OptiFlow est actif : le coût réel de vos tournées en quelques secondes",
      html: emailHtml,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, data: emailResponse }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-license-email function:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
