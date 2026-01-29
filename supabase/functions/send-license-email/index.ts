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
              <p style="margin: 10px 0 0 0; color: #dbeafe; font-size: 14px;">Optimisation des coûts de transport</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px 0; color: #1e40af; font-size: 22px;">🎉 Félicitations ${userName} !</h2>
              
              <p style="margin: 0 0 20px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                Votre licence OptiFlow a été activée avec succès. Nous vous remercions pour votre confiance.
              </p>
              
              ${companyInfo}
              
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
                <p style="margin: 0 0 10px 0; color: #854d0e; font-weight: 600;">📋 Comment activer votre licence :</p>
                <ol style="margin: 0; padding-left: 20px; color: #713f12; line-height: 1.8;">
                  <li>Ouvrez l'application OptiFlow</li>
                  <li>Rendez-vous sur la page d'activation</li>
                  <li>Entrez votre code de licence ci-dessus</li>
                  <li>Utilisez l'email : <strong>${safeEmail}</strong></li>
                </ol>
              </div>
              
              <p style="margin: 30px 0 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                Conservez précieusement cet email. Si vous avez des questions, n'hésitez pas à nous contacter.
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
      subject: "🎉 Votre licence OptiFlow est prête !",
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
