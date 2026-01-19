import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ContactEmailRequest {
  subject: string;
  message: string;
  userEmail: string;
  userName: string;
  companyName: string;
  licenseCode: string;
}

// HTML escape function to prevent XSS
const escapeHtml = (str: string): string => {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

// Rate limiting helper
const checkRateLimit = async (
  supabase: any,
  identifier: string,
  actionType: string,
  maxAttempts: number,
  windowMinutes: number
): Promise<{ allowed: boolean; retryAfter?: number }> => {
  const now = new Date();
  const windowStart = new Date(now.getTime() - windowMinutes * 60 * 1000);

  // Check existing rate limit
  const { data: existing } = await supabase
    .from('rate_limits')
    .select('*')
    .eq('identifier', identifier)
    .eq('action_type', actionType)
    .maybeSingle();

  if (!existing) {
    // First attempt
    await supabase.from('rate_limits').insert({
      identifier,
      action_type: actionType,
      attempts: 1,
      first_attempt_at: now.toISOString(),
      last_attempt_at: now.toISOString(),
    });
    return { allowed: true };
  }

  // Check if locked
  if (existing.locked_until && new Date(existing.locked_until) > now) {
    const retryAfter = Math.ceil((new Date(existing.locked_until).getTime() - now.getTime()) / 1000);
    return { allowed: false, retryAfter };
  }

  // Check if window has expired
  if (new Date(existing.first_attempt_at) < windowStart) {
    // Reset counter
    await supabase
      .from('rate_limits')
      .update({
        attempts: 1,
        first_attempt_at: now.toISOString(),
        last_attempt_at: now.toISOString(),
        locked_until: null,
      })
      .eq('id', existing.id);
    return { allowed: true };
  }

  // Check if max attempts exceeded
  if (existing.attempts >= maxAttempts) {
    // Lock for the remaining window time
    const lockedUntil = new Date(new Date(existing.first_attempt_at).getTime() + windowMinutes * 60 * 1000);
    await supabase
      .from('rate_limits')
      .update({ locked_until: lockedUntil.toISOString() })
      .eq('id', existing.id);
    const retryAfter = Math.ceil((lockedUntil.getTime() - now.getTime()) / 1000);
    return { allowed: false, retryAfter };
  }

  // Increment counter
  await supabase
    .from('rate_limits')
    .update({
      attempts: existing.attempts + 1,
      last_attempt_at: now.toISOString(),
    })
    .eq('id', existing.id);

  return { allowed: true };
};

const handler = async (req: Request): Promise<Response> => {
  console.log("send-contact-email function called");

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase for rate limiting
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get client IP for rate limiting
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                     req.headers.get('x-real-ip') || 
                     'unknown';

    // Rate limit: 3 emails per hour per IP
    const rateCheck = await checkRateLimit(supabase, clientIp, 'contact_email', 3, 60);
    if (!rateCheck.allowed) {
      console.log(`[send-contact-email] Rate limit exceeded for IP: ${clientIp}`);
      return new Response(
        JSON.stringify({ success: false, error: "Trop de messages envoyés. Réessayez plus tard." }),
        { 
          status: 429, 
          headers: { 
            ...corsHeaders, 
            "Content-Type": "application/json",
            "Retry-After": String(rateCheck.retryAfter || 3600)
          } 
        }
      );
    }

    const { subject, message, userEmail, userName, companyName, licenseCode }: ContactEmailRequest = await req.json();

    // Input validation
    if (!subject || subject.length > 200) {
      return new Response(
        JSON.stringify({ success: false, error: "Sujet invalide (max 200 caractères)" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!message || message.length > 5000) {
      return new Response(
        JSON.stringify({ success: false, error: "Message invalide (max 5000 caractères)" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Email validation (basic)
    if (userEmail && userEmail.length > 255) {
      return new Response(
        JSON.stringify({ success: false, error: "Email trop long" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Sending contact email with subject:", escapeHtml(subject));

    // Escape all user inputs before inserting into HTML
    const safeSubject = escapeHtml(subject);
    const safeUserName = escapeHtml(userName || 'Non renseigné');
    const safeUserEmail = escapeHtml(userEmail || 'Non renseigné');
    const safeCompanyName = escapeHtml(companyName || 'Non renseignée');
    const safeLicenseCode = escapeHtml(licenseCode || 'Non renseigné');
    const safeMessage = escapeHtml(message).replace(/\n/g, '<br>');

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Drive Profit <onboarding@resend.dev>",
        to: ["pro.fessionnal31@gmail.com"],
        subject: `[Drive Profit] ${safeSubject}`,
        html: `
          <h2>Nouveau message de contact - Drive Profit</h2>
          <hr />
          <p><strong>Type de demande:</strong> ${safeSubject}</p>
          <p><strong>Utilisateur:</strong> ${safeUserName}</p>
          <p><strong>Email:</strong> ${safeUserEmail}</p>
          <p><strong>Entreprise:</strong> ${safeCompanyName}</p>
          <p><strong>Code licence:</strong> ${safeLicenseCode}</p>
          <hr />
          <h3>Message:</h3>
          <p>${safeMessage}</p>
          <hr />
          <p style="color: #888; font-size: 12px;">Email envoyé depuis l'application Drive Profit</p>
        `,
      }),
    });

    if (!res.ok) {
      const errorData = await res.text();
      console.error("Resend API error:", errorData);
      throw new Error(`Failed to send email: ${errorData}`);
    }

    const emailResponse = await res.json();

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-contact-email function:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
