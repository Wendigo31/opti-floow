// Lovable Cloud Edge Function: admin-auth
// Validates an admin access code against a server-side secret and returns a signed JWT.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type AdminAuthRequest = {
  code?: string;
};

// Async JWT creation with proper crypto
const createJWTAsync = async (payload: object, secret: string, expiresInHours: number = 2): Promise<string> => {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const exp = now + (expiresInHours * 3600);
  
  const fullPayload = { ...payload, iat: now, exp };
  
  const encoder = new TextEncoder();
  const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const payloadB64 = btoa(JSON.stringify(fullPayload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  
  const data = `${headerB64}.${payloadB64}`;
  
  // Import key for HMAC
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  // Sign the data
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  const signatureArray = new Uint8Array(signature);
  let signatureB64 = '';
  for (let i = 0; i < signatureArray.length; i++) {
    signatureB64 += String.fromCharCode(signatureArray[i]);
  }
  signatureB64 = btoa(signatureB64).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  
  return `${data}.${signatureB64}`;
};

// Verify JWT
const verifyJWTAsync = async (token: string, secret: string): Promise<{ valid: boolean; payload?: any }> => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return { valid: false };
    
    const [headerB64, payloadB64, signatureB64] = parts;
    const data = `${headerB64}.${payloadB64}`;
    
    const encoder = new TextEncoder();
    
    // Import key for verification
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );
    
    // Decode signature
    const signatureStr = signatureB64.replace(/-/g, '+').replace(/_/g, '/');
    const signaturePadded = signatureStr + '='.repeat((4 - signatureStr.length % 4) % 4);
    const signature = Uint8Array.from(atob(signaturePadded), c => c.charCodeAt(0));
    
    // Verify signature
    const isValid = await crypto.subtle.verify('HMAC', key, signature, encoder.encode(data));
    
    if (!isValid) return { valid: false };
    
    // Decode payload
    const payloadStr = payloadB64.replace(/-/g, '+').replace(/_/g, '/');
    const payloadPadded = payloadStr + '='.repeat((4 - payloadStr.length % 4) % 4);
    const payload = JSON.parse(atob(payloadPadded));
    
    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return { valid: false };
    }
    
    return { valid: true, payload };
  } catch (error) {
    console.error('[admin-auth] JWT verification error:', error);
    return { valid: false };
  }
};

// Rate limiting helper
const checkRateLimit = async (
  supabase: any,
  identifier: string,
  maxAttempts: number,
  windowMinutes: number,
  lockoutMinutes: number
): Promise<{ allowed: boolean; retryAfter?: number }> => {
  const now = new Date();
  const windowStart = new Date(now.getTime() - windowMinutes * 60 * 1000);

  const { data: existing } = await supabase
    .from('rate_limits')
    .select('*')
    .eq('identifier', identifier)
    .eq('action_type', 'admin_auth')
    .maybeSingle();

  if (!existing) {
    await supabase.from('rate_limits').insert({
      identifier,
      action_type: 'admin_auth',
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
    const lockedUntil = new Date(now.getTime() + lockoutMinutes * 60 * 1000);
    await supabase
      .from('rate_limits')
      .update({ locked_until: lockedUntil.toISOString() })
      .eq('id', existing.id);
    const retryAfter = Math.ceil(lockoutMinutes * 60);
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

// Reset rate limit on successful auth
const resetRateLimit = async (
  supabase: any,
  identifier: string
): Promise<void> => {
  await supabase
    .from('rate_limits')
    .delete()
    .eq('identifier', identifier)
    .eq('action_type', 'admin_auth');
};

// Log admin action
const logAdminAction = async (
  supabase: any,
  adminEmail: string,
  action: string,
  details: object,
  ipAddress: string
): Promise<void> => {
  try {
    await supabase.from('admin_audit_log').insert({
      admin_email: adminEmail,
      action,
      details,
      ip_address: ipAddress,
    });
  } catch (error) {
    console.error('[admin-auth] Failed to log action:', error);
  }
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ ok: false, error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Initialize Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get client IP
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                     req.headers.get('x-real-ip') || 
                     'unknown';

    const body = (await req.json().catch(() => ({}))) as AdminAuthRequest & { action?: string; token?: string };
    const action = body.action || 'login';

    // Token verification action
    if (action === 'verify') {
      const token = body.token;
      if (!token) {
        return new Response(JSON.stringify({ ok: false, error: 'Token requis' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const jwtSecret = (Deno.env.get('ADMIN_SECRET_CODE') ?? '').trim();
      const result = await verifyJWTAsync(token, jwtSecret);

      if (!result.valid) {
        return new Response(JSON.stringify({ ok: false, error: 'Token invalide ou expiré' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ ok: true, payload: result.payload }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Login action - Rate limit check (10 attempts per hour, 30 min lockout)
    const rateCheck = await checkRateLimit(supabase, clientIp, 10, 60, 30);
    if (!rateCheck.allowed) {
      console.log(`[admin-auth] Rate limit exceeded for IP: ${clientIp}`);
      await logAdminAction(supabase, 'unknown', 'login_rate_limited', { ip: clientIp }, clientIp);
      return new Response(JSON.stringify({ ok: false, error: 'Trop de tentatives. Réessayez plus tard.' }), {
        status: 429,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Retry-After': String(rateCheck.retryAfter || 3600)
        },
      });
    }

    const submitted = (body.code ?? '').trim();

    if (!submitted) {
      return new Response(JSON.stringify({ ok: false, error: 'Code requis' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const expected = (Deno.env.get('ADMIN_SECRET_CODE') ?? '').trim();
    const adminEmails = (Deno.env.get('ADMIN_EMAILS') ?? '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);

    if (!expected) {
      console.error('[admin-auth] ADMIN_SECRET_CODE is not configured');
      return new Response(JSON.stringify({ ok: false, error: 'Configuration manquante' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const ok = submitted === expected;

    // Avoid logging secrets; only log result.
    console.log('[admin-auth] attempt:', { ok, ip: clientIp });

    if (!ok) {
      await logAdminAction(supabase, 'unknown', 'login_failed', { ip: clientIp }, clientIp);
      // Return 200 so the client can display a clean error message without treating it as a runtime failure.
      return new Response(JSON.stringify({ ok: false, error: 'Code secret incorrect' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Success - reset rate limit and generate JWT
    await resetRateLimit(supabase, clientIp);
    
    // Get first admin email for the token (or use a generic admin identifier)
    const adminEmail = adminEmails[0] || 'admin@optiflow.app';
    
    // Generate JWT token (2 hour expiry for better security)
    const jwtSecret = expected; // Use the admin code as JWT secret
    const token = await createJWTAsync(
      { 
        role: 'admin',
        email: adminEmail,
        ip: clientIp 
      }, 
      jwtSecret, 
      2
    );

    await logAdminAction(supabase, adminEmail, 'login_success', { ip: clientIp }, clientIp);

    return new Response(JSON.stringify({ ok: true, token, expiresIn: 2 * 3600 }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[admin-auth] unexpected error:', error);
    return new Response(JSON.stringify({ ok: false, error: 'Unexpected error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
