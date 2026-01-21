import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Get admin emails from environment variable
const getAdminEmails = (): string[] => {
  const envEmails = Deno.env.get('ADMIN_EMAILS') || '';
  return envEmails.split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
};

interface ValidateLicenseRequest {
  licenseCode: string;
  email: string;
}

interface CheckLicenseRequest {
  licenseCode: string;
  email: string;
}

// Verify admin JWT token
const verifyAdminToken = async (token: string): Promise<{ valid: boolean; payload?: any }> => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.log('[validate-license] JWT: invalid format (not 3 parts)');
      return { valid: false };
    }
    
    const [headerB64, payloadB64, signatureB64] = parts;
    const data = `${headerB64}.${payloadB64}`;
    
    const encoder = new TextEncoder();
    // Keep secret handling consistent across admin functions (trim to avoid newline/space mismatches)
    const secret = (Deno.env.get('ADMIN_SECRET_CODE') ?? '').trim();
    
    if (!secret) {
      console.error('[validate-license] ADMIN_SECRET_CODE not configured');
      return { valid: false };
    }
    
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
    
    if (!isValid) {
      console.log('[validate-license] JWT: signature verification failed');
      return { valid: false };
    }
    
    // Decode payload
    const payloadStr = payloadB64.replace(/-/g, '+').replace(/_/g, '/');
    const payloadPadded = payloadStr + '='.repeat((4 - payloadStr.length % 4) % 4);
    const payload = JSON.parse(atob(payloadPadded));
    
    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      console.log('[validate-license] JWT: token expired', { exp: payload.exp, now });
      return { valid: false };
    }
    
    // Check role
    if (payload.role !== 'admin') {
      console.log('[validate-license] JWT: invalid role', payload.role);
      return { valid: false };
    }
    
    console.log('[validate-license] JWT: verification successful for', payload.email);
    return { valid: true, payload };
  } catch (error) {
    console.error('[validate-license] JWT verification error:', error);
    return { valid: false };
  }
};

// Verify admin authorization - either by token or legacy email check
const verifyAdminAuth = async (body: any, authHeader?: string | null): Promise<{ authorized: boolean; email?: string }> => {
  // First, try JWT token from Authorization header
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const result = await verifyAdminToken(token);
    if (result.valid && result.payload) {
      return { authorized: true, email: result.payload.email };
    }
  }

  // Second, try adminToken in body
  if (body.adminToken) {
    const result = await verifyAdminToken(body.adminToken);
    if (result.valid && result.payload) {
      return { authorized: true, email: result.payload.email };
    }
  }

  // Legacy fallback: check adminEmail against ADMIN_EMAILS
  // This is for backward compatibility during transition
  const adminEmails = getAdminEmails();
  if (body.adminEmail && adminEmails.includes(body.adminEmail.toLowerCase())) {
    console.log('[validate-license] Warning: Using legacy email auth - should migrate to JWT');
    return { authorized: true, email: body.adminEmail };
  }

  return { authorized: false };
};

// Rate limiting helper for license validation
const checkRateLimit = async (
  supabase: any,
  identifier: string,
  actionType: string,
  maxAttempts: number,
  windowMinutes: number
): Promise<{ allowed: boolean; retryAfter?: number }> => {
  const now = new Date();
  const windowStart = new Date(now.getTime() - windowMinutes * 60 * 1000);

  const { data: existing } = await supabase
    .from('rate_limits')
    .select('*')
    .eq('identifier', identifier)
    .eq('action_type', actionType)
    .maybeSingle();

  if (!existing) {
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

// Log admin action
const logAdminAction = async (
  supabase: any,
  adminEmail: string,
  action: string,
  targetId: string | null,
  details: object,
  ipAddress: string
): Promise<void> => {
  try {
    await supabase.from('admin_audit_log').insert({
      admin_email: adminEmail,
      action,
      target_id: targetId,
      details,
      ip_address: ipAddress,
    });
  } catch (error) {
    console.error('[validate-license] Failed to log admin action:', error);
  }
};

const handler = async (req: Request): Promise<Response> => {
  console.log("validate-license function called");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Create client with service role key - this should bypass RLS
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Get client IP
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                     req.headers.get('x-real-ip') || 
                     'unknown';

    const authHeader = req.headers.get('authorization');
    const body = await req.json();
    const action = body.action || "validate";

    // Admin: List all licenses with features and user counts
    if (action === "list-all") {
      const auth = await verifyAdminAuth(body, authHeader);
      
      if (!auth.authorized) {
        return new Response(
          JSON.stringify({ success: false, error: "Accès non autorisé" }),
          { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      const { data: licenses, error } = await supabase
        .from("licenses")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("List licenses error:", error);
        return new Response(
          JSON.stringify({ success: false, error: "Erreur base de données" }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Fetch features and user counts for each license
      const licensesWithDetails = await Promise.all(
        (licenses || []).map(async (license: any) => {
          const [{ data: features }, { count: userCount }] = await Promise.all([
            supabase
              .from("license_features")
              .select("*")
              .eq("license_id", license.id)
              .maybeSingle(),
            supabase
              .from("company_users")
              .select("*", { count: "exact", head: true })
              .eq("license_id", license.id),
          ]);
          
          return { ...license, features: features || null, user_count: userCount || 0 };
        })
      );

      await logAdminAction(supabase, auth.email || 'admin', 'list_licenses', null, { count: licenses?.length || 0 }, clientIp);

      return new Response(
        JSON.stringify({ success: true, licenses: licensesWithDetails }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Admin: Detect duplicate companies (same SIREN)
    if (action === "detect-duplicates") {
      const auth = await verifyAdminAuth(body, authHeader);
      
      if (!auth.authorized) {
        return new Response(
          JSON.stringify({ success: false, error: "Accès non autorisé" }),
          { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Get all licenses with SIREN
      const { data: licenses, error } = await supabase
        .from("licenses")
        .select("id, license_code, email, company_name, siren, address, city, postal_code, plan_type, is_active, created_at")
        .not("siren", "is", null)
        .neq("siren", "")
        .order("siren")
        .order("created_at");

      if (error) {
        console.error("Detect duplicates error:", error);
        return new Response(
          JSON.stringify({ success: false, error: "Erreur base de données" }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Group by SIREN and find duplicates
      const sirenGroups: Record<string, any[]> = {};
      for (const license of (licenses || [])) {
        const siren = license.siren?.replace(/\s/g, '');
        if (siren) {
          if (!sirenGroups[siren]) sirenGroups[siren] = [];
          sirenGroups[siren].push(license);
        }
      }

      // Only keep groups with more than one license
      const duplicates: { siren: string; licenses: any[] }[] = [];
      for (const [siren, group] of Object.entries(sirenGroups)) {
        if (group.length > 1) {
          // Get user counts for each license
          const licensesWithCounts = await Promise.all(
            group.map(async (license) => {
              const { count } = await supabase
                .from("company_users")
                .select("*", { count: "exact", head: true })
                .eq("license_id", license.id);
              return { ...license, user_count: count || 0 };
            })
          );
          duplicates.push({ siren, licenses: licensesWithCounts });
        }
      }

      return new Response(
        JSON.stringify({ success: true, duplicates }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Admin: Merge companies (move users and data to target, keep old codes as alias)
    if (action === "merge-companies") {
      const { targetLicenseId, sourceLicenseIds } = body;
      const auth = await verifyAdminAuth(body, authHeader);
      
      console.log("Merging companies:", sourceLicenseIds, "into:", targetLicenseId);
      
      if (!auth.authorized) {
        return new Response(
          JSON.stringify({ success: false, error: "Accès non autorisé" }),
          { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      if (!targetLicenseId || !sourceLicenseIds || !Array.isArray(sourceLicenseIds)) {
        return new Response(
          JSON.stringify({ success: false, error: "Paramètres manquants" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      try {
        // For each source license, move users and data to target
        for (const sourceId of sourceLicenseIds) {
          // 1. Move company_users to target (change license_id)
          await supabase
            .from("company_users")
            .update({ license_id: targetLicenseId })
            .eq("license_id", sourceId);

          // 2. Move data tables to target license
          const dataTables = ['saved_tours', 'trips', 'clients', 'quotes', 'user_vehicles', 'user_drivers', 'user_charges', 'user_trailers'];
          for (const table of dataTables) {
            await supabase
              .from(table)
              .update({ license_id: targetLicenseId })
              .eq("license_id", sourceId);
          }

          // 3. Mark source license as inactive (but keep it for alias/redirect purposes)
          await supabase
            .from("licenses")
            .update({ 
              is_active: false, 
              notes: `Fusionnée vers ${targetLicenseId} le ${new Date().toISOString()}` 
            })
            .eq("id", sourceId);
        }

        console.log("Merge completed successfully");

        await logAdminAction(supabase, auth.email || 'admin', 'merge_companies', targetLicenseId, { sourceLicenseIds }, clientIp);

        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      } catch (err: any) {
        console.error("Merge companies error:", err);
        return new Response(
          JSON.stringify({ success: false, error: "Erreur lors de la fusion: " + (err.message || 'Erreur inconnue') }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
    }

    // Admin: Toggle license status
    if (action === "toggle-status") {
      const { licenseId, isActive } = body;
      const auth = await verifyAdminAuth(body, authHeader);
      
      if (!auth.authorized) {
        return new Response(
          JSON.stringify({ success: false, error: "Accès non autorisé" }),
          { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      const { error } = await supabase
        .from("licenses")
        .update({ is_active: isActive })
        .eq("id", licenseId);

      if (error) {
        console.error("Toggle status error:", error);
        return new Response(
          JSON.stringify({ success: false, error: "Erreur mise à jour" }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      await logAdminAction(supabase, auth.email || 'admin', 'toggle_license_status', licenseId, { isActive }, clientIp);

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Admin: Update plan type
    if (action === "update-plan") {
      const { licenseId, planType } = body;
      const auth = await verifyAdminAuth(body, authHeader);
      
      if (!auth.authorized) {
        return new Response(
          JSON.stringify({ success: false, error: "Accès non autorisé" }),
          { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      if (!['start', 'pro', 'enterprise'].includes(planType)) {
        return new Response(
          JSON.stringify({ success: false, error: "Type de forfait invalide" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      const { error } = await supabase
        .from("licenses")
        .update({ plan_type: planType })
        .eq("id", licenseId);

      if (error) {
        console.error("Update plan error:", error);
        return new Response(
          JSON.stringify({ success: false, error: "Erreur mise à jour" }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      await logAdminAction(supabase, auth.email || 'admin', 'update_plan', licenseId, { planType }, clientIp);

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Admin: Create new license OR add user to existing company
    if (action === "create-license") {
      const { email, planType, firstName, lastName, companyName, assignToCompanyId, userRole, siren, address, city, postalCode, employeeCount, companyStatus } = body;
      const auth = await verifyAdminAuth(body, authHeader);
      
      console.log("Creating license for:", email, "by admin:", auth.email, "assignToCompanyId:", assignToCompanyId);
      
      if (!auth.authorized) {
        return new Response(
          JSON.stringify({ success: false, error: "Accès non autorisé" }),
          { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      if (!email) {
        return new Response(
          JSON.stringify({ success: false, error: "Email requis" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // If assigning to existing company, just add user to company_users
      if (assignToCompanyId) {
        console.log("Assigning user to existing company:", assignToCompanyId);
        
        // Check if user already exists in this company
        const { data: existingUser } = await supabase
          .from("company_users")
          .select("id")
          .eq("license_id", assignToCompanyId)
          .eq("email", email.trim().toLowerCase())
          .maybeSingle();

        if (existingUser) {
          return new Response(
            JSON.stringify({ success: false, error: "Cet email est déjà dans cette société" }),
            { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }

        // Add user to company_users
        const displayName = [firstName, lastName].filter(Boolean).join(' ') || null;
        const { data: newCompanyUser, error: cuError } = await supabase
          .from("company_users")
          .insert({
            license_id: assignToCompanyId,
            email: email.trim().toLowerCase(),
            role: userRole || 'member',
            display_name: displayName,
            is_active: true,
            invited_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (cuError) {
          console.error("Add company user error:", cuError);
          return new Response(
            JSON.stringify({ success: false, error: "Erreur lors de l'ajout de l'utilisateur: " + cuError.message }),
            { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }

        console.log("User added to company successfully:", email);

        await logAdminAction(supabase, auth.email || 'admin', 'add_user_to_company', assignToCompanyId, { email, userRole }, clientIp);

        return new Response(
          JSON.stringify({ success: true, companyUser: newCompanyUser, assignedToCompany: true }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Generate unique license code: XXXX-XXXX-XXXX-XXXX
      const generateCode = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        const segments = [];
        for (let s = 0; s < 4; s++) {
          let segment = '';
          for (let i = 0; i < 4; i++) {
            segment += chars.charAt(Math.floor(Math.random() * chars.length));
          }
          segments.push(segment);
        }
        return segments.join('-');
      };

      let licenseCode = generateCode();
      
      // Ensure uniqueness
      let attempts = 0;
      while (attempts < 10) {
        const { data: existing } = await supabase
          .from("licenses")
          .select("id")
          .eq("license_code", licenseCode)
          .maybeSingle();
        
        if (!existing) break;
        licenseCode = generateCode();
        attempts++;
      }

      const { data: newLicense, error } = await supabase
        .from("licenses")
        .insert({
          license_code: licenseCode,
          email: email.trim().toLowerCase(),
          plan_type: planType || 'start',
          first_name: firstName || null,
          last_name: lastName || null,
          company_name: companyName || null,
          siren: siren || null,
          address: address || null,
          city: city || null,
          postal_code: postalCode || null,
          employee_count: employeeCount || null,
          company_status: companyStatus || null,
          is_active: true,
        })
        .select()
        .single();

      if (error) {
        console.error("Create license error:", error);
        return new Response(
          JSON.stringify({ success: false, error: "Erreur lors de la création: " + error.message }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      console.log("License created successfully:", licenseCode);

      await logAdminAction(supabase, auth.email || 'admin', 'create_license', newLicense.id, { email, planType }, clientIp);

      return new Response(
        JSON.stringify({ success: true, licenseCode, license_code: licenseCode, license: newLicense }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Admin: Delete license permanently
    if (action === "delete-license") {
      const { licenseId } = body;
      const auth = await verifyAdminAuth(body, authHeader);
      
      console.log("Deleting license:", licenseId, "by admin:", auth.email);
      
      if (!auth.authorized) {
        return new Response(
          JSON.stringify({ success: false, error: "Accès non autorisé" }),
          { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      if (!licenseId) {
        return new Response(
          JSON.stringify({ success: false, error: "ID licence requis" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      const { error } = await supabase
        .from("licenses")
        .delete()
        .eq("id", licenseId);

      if (error) {
        console.error("Delete license error:", error);
        return new Response(
          JSON.stringify({ success: false, error: "Erreur lors de la suppression: " + error.message }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      console.log("License deleted successfully:", licenseId);

      await logAdminAction(supabase, auth.email || 'admin', 'delete_license', licenseId, {}, clientIp);

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Admin: Update existing license (full edit) - includes SIREN sync
    if (action === "update-license") {
      const { licenseId, email, planType, firstName, lastName, companyName, siren, address, city, postalCode, employeeCount, companyStatus } = body;
      const auth = await verifyAdminAuth(body, authHeader);
      
      console.log("Updating license:", licenseId, "by admin:", auth.email);
      
      if (!auth.authorized) {
        return new Response(
          JSON.stringify({ success: false, error: "Accès non autorisé" }),
          { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      if (!licenseId) {
        return new Response(
          JSON.stringify({ success: false, error: "ID licence requis" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      const updateData: Record<string, any> = {};
      if (email !== undefined) updateData.email = email.trim().toLowerCase();
      if (planType !== undefined && ['start', 'pro', 'enterprise'].includes(planType)) updateData.plan_type = planType;
      if (firstName !== undefined) updateData.first_name = firstName || null;
      if (lastName !== undefined) updateData.last_name = lastName || null;
      if (companyName !== undefined) updateData.company_name = companyName || null;
      if (siren !== undefined) updateData.siren = siren || null;
      if (address !== undefined) updateData.address = address || null;
      if (city !== undefined) updateData.city = city || null;
      if (postalCode !== undefined) updateData.postal_code = postalCode || null;
      if (employeeCount !== undefined) updateData.employee_count = employeeCount || null;
      if (companyStatus !== undefined) updateData.company_status = companyStatus || null;

      const { error } = await supabase
        .from("licenses")
        .update(updateData)
        .eq("id", licenseId);

      if (error) {
        console.error("Update license error:", error);
        return new Response(
          JSON.stringify({ success: false, error: "Erreur lors de la mise à jour: " + error.message }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      console.log("License updated successfully:", licenseId);

      await logAdminAction(supabase, auth.email || 'admin', 'update_license', licenseId, updateData, clientIp);

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Admin: Get company data (users, stats, login history)
    if (action === "get-company-data") {
      const { licenseId } = body;
      const auth = await verifyAdminAuth(body, authHeader);
      
      console.log("Getting company data for license:", licenseId);
      
      if (!auth.authorized) {
        return new Response(
          JSON.stringify({ success: false, error: "Accès non autorisé" }),
          { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      if (!licenseId) {
        return new Response(
          JSON.stringify({ success: false, error: "ID licence requis" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      try {
        // Fetch license info with SIREN data
        const { data: licenseInfo, error: licenseError } = await supabase
          .from('licenses')
          .select('id, email, company_name, siren, address, city, postal_code, company_status, employee_count, plan_type, max_users, is_active')
          .eq('id', licenseId)
          .maybeSingle();

        if (licenseError) {
          console.error("Error fetching license info:", licenseError);
        }

        // Fetch company users
        const { data: companyUsers, error: usersError } = await supabase
          .from('company_users')
          .select('*')
          .eq('license_id', licenseId)
          .order('role', { ascending: true })
          .order('created_at', { ascending: true });

        if (usersError) {
          console.error("Error fetching company users:", usersError);
          throw usersError;
        }

        // Fetch user stats for each user with a user_id
        const userStats = await Promise.all(
          (companyUsers || []).map(async (user: any) => {
            if (!user.user_id) {
              return {
                company_user_id: user.id,
                user_id: null,
                email: user.email,
                display_name: user.display_name,
                role: user.role,
                tours_count: 0,
                trips_count: 0,
                clients_count: 0,
                quotes_count: 0,
                vehicles_count: 0,
                drivers_count: 0,
                charges_count: 0,
                total_revenue: 0,
                total_distance: 0,
                last_activity_at: user.last_activity_at,
                accepted_at: user.accepted_at,
              };
            }

            const userId = user.user_id;

            const [
              { count: toursCount },
              { count: tripsCount },
              { count: clientsCount },
              { count: quotesCount },
              { count: vehiclesCount },
              { count: driversCount },
              { count: chargesCount },
              { data: tripsData },
            ] = await Promise.all([
              supabase.from('saved_tours').select('*', { count: 'exact', head: true }).eq('user_id', userId),
              supabase.from('trips').select('*', { count: 'exact', head: true }).eq('user_id', userId),
              supabase.from('clients').select('*', { count: 'exact', head: true }).eq('user_id', userId),
              supabase.from('quotes').select('*', { count: 'exact', head: true }).eq('user_id', userId),
              supabase.from('user_vehicles').select('*', { count: 'exact', head: true }).eq('user_id', userId),
              supabase.from('user_drivers').select('*', { count: 'exact', head: true }).eq('user_id', userId),
              supabase.from('user_charges').select('*', { count: 'exact', head: true }).eq('user_id', userId),
              supabase.from('trips').select('revenue, distance_km').eq('user_id', userId),
            ]);

            const totalRevenue = (tripsData || []).reduce((sum: number, t: any) => sum + (t.revenue || 0), 0);
            const totalDistance = (tripsData || []).reduce((sum: number, t: any) => sum + (t.distance_km || 0), 0);

            return {
              company_user_id: user.id,
              user_id: userId,
              email: user.email,
              display_name: user.display_name,
              role: user.role,
              tours_count: toursCount || 0,
              trips_count: tripsCount || 0,
              clients_count: clientsCount || 0,
              quotes_count: quotesCount || 0,
              vehicles_count: vehiclesCount || 0,
              drivers_count: driversCount || 0,
              charges_count: chargesCount || 0,
              total_revenue: totalRevenue,
              total_distance: totalDistance,
              last_activity_at: user.last_activity_at,
              accepted_at: user.accepted_at,
            };
          })
        );

        // Fetch company totals
        const [
          { count: toursCount },
          { count: tripsCount },
          { count: clientsCount },
          { count: quotesCount },
          { count: vehiclesCount },
          { count: driversCount },
          { count: chargesCount },
          { data: toursRevenue },
          { data: tripsRevenue },
        ] = await Promise.all([
          supabase.from('saved_tours').select('*', { count: 'exact', head: true }).eq('license_id', licenseId),
          supabase.from('trips').select('*', { count: 'exact', head: true }).eq('license_id', licenseId),
          supabase.from('clients').select('*', { count: 'exact', head: true }).eq('license_id', licenseId),
          supabase.from('quotes').select('*', { count: 'exact', head: true }).eq('license_id', licenseId),
          supabase.from('user_vehicles').select('*', { count: 'exact', head: true }).eq('license_id', licenseId),
          supabase.from('user_drivers').select('*', { count: 'exact', head: true }).eq('license_id', licenseId),
          supabase.from('user_charges').select('*', { count: 'exact', head: true }).eq('license_id', licenseId),
          supabase.from('saved_tours').select('revenue, distance_km').eq('license_id', licenseId),
          supabase.from('trips').select('revenue, distance_km').eq('license_id', licenseId),
        ]);

        const tourRevenue = (toursRevenue || []).reduce((sum: number, t: any) => sum + (t.revenue || 0), 0);
        const tourDistance = (toursRevenue || []).reduce((sum: number, t: any) => sum + (t.distance_km || 0), 0);
        const tripRevenue = (tripsRevenue || []).reduce((sum: number, t: any) => sum + (t.revenue || 0), 0);
        const tripDistance = (tripsRevenue || []).reduce((sum: number, t: any) => sum + (t.distance_km || 0), 0);

        const companyTotals = {
          tours: toursCount || 0,
          trips: tripsCount || 0,
          clients: clientsCount || 0,
          quotes: quotesCount || 0,
          vehicles: vehiclesCount || 0,
          drivers: driversCount || 0,
          charges: chargesCount || 0,
          revenue: tourRevenue + tripRevenue,
          distance: tourDistance + tripDistance,
        };

        // Fetch login history
        const { data: loginHistory, error: loginError } = await supabase
          .from('login_history')
          .select('*')
          .eq('license_id', licenseId)
          .order('login_at', { ascending: false })
          .limit(50);

        if (loginError) {
          console.error("Error fetching login history:", loginError);
        }

        console.log("Company data fetched successfully:", {
          usersCount: companyUsers?.length || 0,
          totals: companyTotals,
          loginsCount: loginHistory?.length || 0,
        });

        return new Response(
          JSON.stringify({
            success: true,
            licenseInfo: licenseInfo || null,
            companyUsers: companyUsers || [],
            userStats,
            companyTotals,
            loginHistory: loginHistory || [],
          }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      } catch (error) {
        console.error("Get company data error:", error);
        return new Response(
          JSON.stringify({ success: false, error: "Erreur lors de la récupération des données" }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
    }

    // Admin: Update limits for a license
    if (action === "update-limits") {
      const { licenseId, maxDrivers, maxClients, maxDailyCharges, maxMonthlyCharges, maxYearlyCharges, maxUsers } = body;
      const auth = await verifyAdminAuth(body, authHeader);
      
      console.log("Updating limits for license:", licenseId, "by admin:", auth.email);
      
      if (!auth.authorized) {
        return new Response(
          JSON.stringify({ success: false, error: "Accès non autorisé" }),
          { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      if (!licenseId) {
        return new Response(
          JSON.stringify({ success: false, error: "ID licence requis" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      const { error } = await supabase
        .from("licenses")
        .update({
          max_drivers: maxDrivers,
          max_clients: maxClients,
          max_daily_charges: maxDailyCharges,
          max_monthly_charges: maxMonthlyCharges,
          max_yearly_charges: maxYearlyCharges,
          max_users: maxUsers,
        })
        .eq("id", licenseId);

      if (error) {
        console.error("Update limits error:", error);
        return new Response(
          JSON.stringify({ success: false, error: "Erreur lors de la mise à jour des limites: " + error.message }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      console.log("Limits updated successfully:", licenseId);

      await logAdminAction(supabase, auth.email || 'admin', 'update_limits', licenseId, { maxDrivers, maxClients, maxDailyCharges, maxMonthlyCharges, maxYearlyCharges, maxUsers }, clientIp);

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Admin: Update features for a license
    if (action === "update-features") {
      const { licenseId, features } = body;
      const auth = await verifyAdminAuth(body, authHeader);
      
      console.log("Updating features for license:", licenseId, "by admin:", auth.email);
      
      if (!auth.authorized) {
        return new Response(
          JSON.stringify({ success: false, error: "Accès non autorisé" }),
          { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      if (!licenseId) {
        return new Response(
          JSON.stringify({ success: false, error: "ID licence requis" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Check if features already exist for this license
      const { data: existingFeatures } = await supabase
        .from("license_features")
        .select("id")
        .eq("license_id", licenseId)
        .maybeSingle();

      let error;
      if (existingFeatures) {
        // Update existing features
        const { error: updateError } = await supabase
          .from("license_features")
          .update({
            ...features,
            updated_at: new Date().toISOString(),
          })
          .eq("license_id", licenseId);
        error = updateError;
      } else {
        // Insert new features
        const { error: insertError } = await supabase
          .from("license_features")
          .insert({
            license_id: licenseId,
            ...features,
          });
        error = insertError;
      }

      if (error) {
        console.error("Update features error:", error);
        return new Response(
          JSON.stringify({ success: false, error: "Erreur lors de la mise à jour des fonctionnalités: " + error.message }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      console.log("Features updated successfully:", licenseId);

      await logAdminAction(supabase, auth.email || 'admin', 'update_features', licenseId, { features }, clientIp);

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Admin: Update visibility settings for a license
    if (action === "update-visibility") {
      const { licenseId, showUserInfo, showCompanyInfo, showAddressInfo, showLicenseInfo } = body;
      const auth = await verifyAdminAuth(body, authHeader);
      
      console.log("Updating visibility for license:", licenseId, "by admin:", auth.email);
      
      if (!auth.authorized) {
        return new Response(
          JSON.stringify({ success: false, error: "Accès non autorisé" }),
          { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      if (!licenseId) {
        return new Response(
          JSON.stringify({ success: false, error: "ID licence requis" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      const { error } = await supabase
        .from("licenses")
        .update({
          show_user_info: showUserInfo,
          show_company_info: showCompanyInfo,
          show_address_info: showAddressInfo,
          show_license_info: showLicenseInfo,
        })
        .eq("id", licenseId);

      if (error) {
        console.error("Update visibility error:", error);
        return new Response(
          JSON.stringify({ success: false, error: "Erreur lors de la mise à jour de la visibilité: " + error.message }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      console.log("Visibility updated successfully:", licenseId);

      await logAdminAction(supabase, auth.email || 'admin', 'update_visibility', licenseId, { showUserInfo, showCompanyInfo, showAddressInfo, showLicenseInfo }, clientIp);

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Admin: Get login history for a license
    if (action === "get-login-history") {
      const { licenseId } = body;
      const auth = await verifyAdminAuth(body, authHeader);
      
      if (!auth.authorized) {
        return new Response(
          JSON.stringify({ success: false, error: "Accès non autorisé" }),
          { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      if (!licenseId) {
        return new Response(
          JSON.stringify({ success: false, error: "ID licence requis" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      const { data: history, error } = await supabase
        .from("login_history")
        .select("*")
        .eq("license_id", licenseId)
        .order("login_at", { ascending: false })
        .limit(50);

      if (error) {
        console.error("Get login history error:", error);
        return new Response(
          JSON.stringify({ success: false, error: "Erreur lors de la récupération de l'historique" }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, history: history || [] }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Admin: Get user statistics (tours, vehicles, drivers, charges counts)
    if (action === "get-user-stats") {
      const { licenseId, userId } = body;
      const auth = await verifyAdminAuth(body, authHeader);
      
      if (!auth.authorized) {
        return new Response(
          JSON.stringify({ success: false, error: "Accès non autorisé" }),
          { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      if (!licenseId && !userId) {
        return new Response(
          JSON.stringify({ success: false, error: "ID licence ou utilisateur requis" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Get license email to find auth user
      let userIdToQuery = userId;
      if (licenseId && !userId) {
        const { data: license } = await supabase
          .from("licenses")
          .select("email")
          .eq("id", licenseId)
          .maybeSingle();
        
        if (license?.email) {
          // Find auth user by email
          const { data: authUsers } = await supabase.auth.admin.listUsers();
          const authUser = authUsers?.users?.find(u => u.email?.toLowerCase() === license.email.toLowerCase());
          userIdToQuery = authUser?.id;
        }
      }

      // Initialize stats
      const stats = {
        savedTours: 0,
        trips: 0,
        clients: 0,
        quotes: 0,
        vehicles: 0,
        drivers: 0,
        charges: 0,
      };

      if (userIdToQuery) {
        // Count saved tours
        const { count: toursCount } = await supabase
          .from("saved_tours")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userIdToQuery);
        stats.savedTours = toursCount || 0;

        // Count trips
        const { count: tripsCount } = await supabase
          .from("trips")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userIdToQuery);
        stats.trips = tripsCount || 0;

        // Count clients
        const { count: clientsCount } = await supabase
          .from("clients")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userIdToQuery);
        stats.clients = clientsCount || 0;

        // Count quotes
        const { count: quotesCount } = await supabase
          .from("quotes")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userIdToQuery);
        stats.quotes = quotesCount || 0;

        // Count synced vehicles
        const { count: vehiclesCount } = await supabase
          .from("user_vehicles")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userIdToQuery);
        stats.vehicles = vehiclesCount || 0;

        // Count synced drivers
        const { count: driversCount } = await supabase
          .from("user_drivers")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userIdToQuery);
        stats.drivers = driversCount || 0;

        // Count synced charges
        const { count: chargesCount } = await supabase
          .from("user_charges")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userIdToQuery);
        stats.charges = chargesCount || 0;
      }

      return new Response(
        JSON.stringify({ success: true, stats, userId: userIdToQuery || null }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Admin: Get detailed user data (vehicles, drivers, charges)
    if (action === "get-user-details") {
      const { licenseId, userId, type } = body; // type: 'vehicles' | 'drivers' | 'charges'
      const auth = await verifyAdminAuth(body, authHeader);
      
      if (!auth.authorized) {
        return new Response(
          JSON.stringify({ success: false, error: "Accès non autorisé" }),
          { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      if (!licenseId && !userId) {
        return new Response(
          JSON.stringify({ success: false, error: "ID licence ou utilisateur requis" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Get license email to find auth user
      let userIdToQuery = userId;
      if (licenseId && !userId) {
        const { data: license } = await supabase
          .from("licenses")
          .select("email")
          .eq("id", licenseId)
          .maybeSingle();
        
        if (license?.email) {
          // Find auth user by email
          const { data: authUsers } = await supabase.auth.admin.listUsers();
          const authUser = authUsers?.users?.find(u => u.email?.toLowerCase() === license.email.toLowerCase());
          userIdToQuery = authUser?.id;
        }
      }

      if (!userIdToQuery) {
        return new Response(
          JSON.stringify({ success: true, data: [], message: "Utilisateur non authentifié" }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      let data: any[] = [];
      
      if (type === 'vehicles') {
        const { data: vehicles } = await supabase
          .from("user_vehicles")
          .select("*")
          .eq("user_id", userIdToQuery)
          .order("name");
        data = vehicles || [];
      } else if (type === 'drivers') {
        const { data: drivers } = await supabase
          .from("user_drivers")
          .select("*")
          .eq("user_id", userIdToQuery)
          .order("name");
        data = drivers || [];
      } else if (type === 'charges') {
        const { data: charges } = await supabase
          .from("user_charges")
          .select("*")
          .eq("user_id", userIdToQuery)
          .order("name");
        data = charges || [];
      }

      return new Response(
        JSON.stringify({ success: true, data, userId: userIdToQuery }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // User: Get their active add-ons
    if (action === "get-addons") {
      const { licenseCode, email } = body;

      if (!licenseCode || !email) {
        return new Response(
          JSON.stringify({ success: false, error: "License code and email required" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Get license
      const { data: license } = await supabase
        .from("licenses")
        .select("id")
        .eq("license_code", licenseCode.trim().toUpperCase())
        .eq("email", email.trim().toLowerCase())
        .maybeSingle();

      if (!license) {
        return new Response(
          JSON.stringify({ success: false, error: "License not found" }),
          { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Get active add-ons
      const { data: addons } = await supabase
        .from("license_addons")
        .select("*")
        .eq("license_id", license.id)
        .eq("is_active", true);

      return new Response(
        JSON.stringify({ success: true, addons: addons || [] }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // User: Update their add-ons
    if (action === "update-addons") {
      const { licenseCode, email, addOns } = body;

      if (!licenseCode || !email) {
        return new Response(
          JSON.stringify({ success: false, error: "License code and email required" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Get license
      const { data: license } = await supabase
        .from("licenses")
        .select("id, plan_type")
        .eq("license_code", licenseCode.trim().toUpperCase())
        .eq("email", email.trim().toLowerCase())
        .eq("is_active", true)
        .maybeSingle();

      if (!license) {
        return new Response(
          JSON.stringify({ success: false, error: "License not found or inactive" }),
          { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Deactivate all current add-ons
      await supabase
        .from("license_addons")
        .update({ is_active: false, deactivated_at: new Date().toISOString() })
        .eq("license_id", license.id);

      // Activate selected add-ons
      if (addOns && addOns.length > 0) {
        const now = new Date().toISOString();
        
        for (const addonId of addOns) {
          // Upsert each add-on
          await supabase
            .from("license_addons")
            .upsert({
              license_id: license.id,
              addon_id: addonId,
              addon_name: addonId, // Will be updated with proper name
              is_active: true,
              activated_at: now,
              deactivated_at: null,
            }, {
              onConflict: 'license_id,addon_id',
            });
        }

        // Calculate total add-on price
        let totalMonthly = 0;
        // This would need the ADD_ONS definition, but for now we'll set it to 0
        // and rely on the frontend to display correct pricing
        
        await supabase
          .from("licenses")
          .update({ addons_monthly_total: totalMonthly })
          .eq("id", license.id);
      }

      console.log(`[validate-license] Add-ons updated for license ${license.id}: ${addOns?.join(', ') || 'none'}`);

      return new Response(
        JSON.stringify({ success: true, message: "Add-ons updated successfully" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Admin: Manage add-ons for any license
    if (action === "admin-update-addons") {
      const { licenseId, addOns } = body;
      const auth = await verifyAdminAuth(body, authHeader);
      
      if (!auth.authorized) {
        return new Response(
          JSON.stringify({ success: false, error: "Accès non autorisé" }),
          { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      if (!licenseId) {
        return new Response(
          JSON.stringify({ success: false, error: "License ID required" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Deactivate all current add-ons
      await supabase
        .from("license_addons")
        .update({ is_active: false, deactivated_at: new Date().toISOString() })
        .eq("license_id", licenseId);

      // Activate selected add-ons
      if (addOns && addOns.length > 0) {
        const now = new Date().toISOString();
        
        for (const addonId of addOns) {
          await supabase
            .from("license_addons")
            .upsert({
              license_id: licenseId,
              addon_id: addonId,
              addon_name: addonId,
              is_active: true,
              activated_at: now,
              deactivated_at: null,
            }, {
              onConflict: 'license_id,addon_id',
            });
        }
      }

      await logAdminAction(supabase, auth.email || 'admin', 'update_addons', licenseId, { addOns }, clientIp);

      return new Response(
        JSON.stringify({ success: true, message: "Add-ons updated successfully" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Admin: Get add-ons for a license
    if (action === "admin-get-addons") {
      const { licenseId } = body;
      const auth = await verifyAdminAuth(body, authHeader);
      
      if (!auth.authorized) {
        return new Response(
          JSON.stringify({ success: false, error: "Accès non autorisé" }),
          { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      const { data: addons } = await supabase
        .from("license_addons")
        .select("*")
        .eq("license_id", licenseId)
        .eq("is_active", true);

      return new Response(
        JSON.stringify({ success: true, addons: addons || [] }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get audit logs for a specific license
    if (action === "get-audit-logs") {
      const { licenseId, limit = 50 } = body;
      const auth = await verifyAdminAuth(body, authHeader);
      
      if (!auth.authorized) {
        return new Response(
          JSON.stringify({ success: false, error: "Accès non autorisé" }),
          { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      if (!licenseId) {
        return new Response(
          JSON.stringify({ success: false, error: "License ID required" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      const { data: logs, error } = await supabase
        .from("admin_audit_log")
        .select("*")
        .eq("target_id", licenseId)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) {
        console.error("Error fetching audit logs:", error);
        return new Response(
          JSON.stringify({ success: false, error: "Failed to fetch audit logs" }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, logs: logs || [] }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Sync company - notify all company users to refresh their license
    if (action === "sync-company") {
      const { licenseCode, email } = body;

      if (!licenseCode || !email) {
        return new Response(
          JSON.stringify({ success: false, error: "Missing license code or email" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Find the license
      const { data: license, error: licenseError } = await supabase
        .from("licenses")
        .select("id, company_name, plan_type")
        .eq("license_code", licenseCode.trim().toUpperCase())
        .maybeSingle();

      if (licenseError || !license) {
        return new Response(
          JSON.stringify({ success: false, error: "License not found" }),
          { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Get all company users
      const { data: companyUsers, error: usersError } = await supabase
        .from("company_users")
        .select("id, email, display_name, is_active")
        .eq("license_id", license.id)
        .eq("is_active", true);

      if (usersError) {
        console.error("Error fetching company users:", usersError);
        return new Response(
          JSON.stringify({ success: false, error: "Database error" }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Update license last_used_at to trigger cache invalidation
      await supabase
        .from("licenses")
        .update({ last_used_at: new Date().toISOString() })
        .eq("id", license.id);

      console.log(`[sync-company] Synced ${companyUsers?.length || 0} users for company ${license.company_name}`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          syncedCount: companyUsers?.length || 0,
          companyName: license.company_name,
          planType: license.plan_type,
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (action === "check") {
      // Check if stored license is still valid (used on app load)
      // Supports both license owners and company members
      const { licenseCode, email }: CheckLicenseRequest = body;

      if (!licenseCode || !email) {
        return new Response(
          JSON.stringify({ valid: false, error: "Missing license code or email" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      const normalizedEmail = email.trim().toLowerCase();
      const normalizedCode = licenseCode.trim().toUpperCase();

      // First, find license by code only (to support company members)
      const { data: licenseByCode, error: codeError } = await supabase
        .from("licenses")
        .select("id, email, is_active, first_name, last_name, company_name, siren, company_status, employee_count, address, city, postal_code, activated_at, plan_type, max_drivers, max_clients, max_daily_charges, max_monthly_charges, max_yearly_charges, show_user_info, show_company_info, show_address_info, show_license_info")
        .eq("license_code", normalizedCode)
        .maybeSingle();

      if (codeError) {
        console.error("License check error:", codeError);
        return new Response(
          JSON.stringify({ valid: false, error: "Database error" }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      if (!licenseByCode) {
        console.log("[check] License not found for code:", normalizedCode.substring(0, 4) + '...');
        return new Response(
          JSON.stringify({ valid: false }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Check if this is the license owner OR a member of the company
      let license = licenseByCode;
      
      if (licenseByCode.email !== normalizedEmail) {
        // Check if user is a registered member of this company
        const { data: memberRecord } = await supabase
          .from("company_users")
          .select("id, role, email, is_active")
          .eq("license_id", licenseByCode.id)
          .eq("email", normalizedEmail)
          .maybeSingle();
          
        if (!memberRecord || !memberRecord.is_active) {
          console.log("[check] Email not a valid company member:", normalizedEmail);
          return new Response(
            JSON.stringify({ valid: false }),
            { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }
        
        console.log("[check] Valid company member found:", normalizedEmail, "role:", memberRecord.role);
      }

      if (!license.is_active) {
        console.log("[check] License is inactive");
        return new Response(
          JSON.stringify({ valid: false }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Fetch custom features for this license
      const { data: features } = await supabase
        .from("license_features")
        .select("*")
        .eq("license_id", license.id)
        .maybeSingle();

      // Fetch user-specific feature overrides if user is logged in
      let userFeatureOverrides: { feature_key: string; enabled: boolean }[] = [];
      const authHeader = req.headers.get("authorization");
      if (authHeader) {
        try {
          // Get current user from JWT
          const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
          if (user) {
            // Find the company_user record for this user
            const { data: companyUser } = await supabase
              .from("company_users")
              .select("id")
              .eq("license_id", license.id)
              .eq("user_id", user.id)
              .maybeSingle();

            if (companyUser) {
              // Fetch user-specific overrides
              const { data: overrides } = await supabase
                .from("user_feature_overrides")
                .select("feature_key, enabled")
                .eq("company_user_id", companyUser.id);
              
              userFeatureOverrides = overrides || [];
            }
          }
        } catch (e) {
          console.error("[validate-license] Error fetching user overrides:", e);
        }
      }

      // Update last_used_at
      await supabase
        .from("licenses")
        .update({ last_used_at: new Date().toISOString() })
        .eq("license_code", licenseCode.trim().toUpperCase());

      return new Response(
        JSON.stringify({
          valid: true,
          licenseData: {
            firstName: license.first_name,
            lastName: license.last_name,
            companyName: license.company_name,
            siren: license.siren,
            companyStatus: license.company_status,
            employeeCount: license.employee_count,
            address: license.address,
            city: license.city,
            postalCode: license.postal_code,
            activatedAt: license.activated_at,
            planType: license.plan_type || 'start',
            maxDrivers: license.max_drivers,
            maxClients: license.max_clients,
            maxDailyCharges: license.max_daily_charges,
            maxMonthlyCharges: license.max_monthly_charges,
            maxYearlyCharges: license.max_yearly_charges,
            showUserInfo: license.show_user_info ?? true,
            showCompanyInfo: license.show_company_info ?? true,
            showAddressInfo: license.show_address_info ?? true,
            showLicenseInfo: license.show_license_info ?? true,
          },
          customFeatures: features || null,
          userFeatureOverrides: userFeatureOverrides.length > 0 ? userFeatureOverrides : null,
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Default action: validate license (initial activation) with Supabase Auth
    const { licenseCode, email }: ValidateLicenseRequest = body;

    if (!licenseCode || !email) {
      return new Response(
        JSON.stringify({ success: false, error: "Code de licence et email requis" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedCode = licenseCode.trim().toUpperCase();

    // Check if this is a demo license (bypass rate limiting for demo sessions)
    const isDemoLicense = normalizedCode.startsWith('DEMO') || 
                          normalizedEmail.includes('demo');
    
    // Rate limit license validation: 5 attempts per 15 minutes per IP (skip for demo)
    if (!isDemoLicense) {
      const rateCheck = await checkRateLimit(supabase, clientIp, 'license_validate', 5, 15);
      if (!rateCheck.allowed) {
        console.log(`[validate-license] Rate limit exceeded for IP: ${clientIp}`);
        return new Response(
          JSON.stringify({ success: false, error: "Trop de tentatives. Réessayez plus tard." }),
          { 
            status: 429, 
            headers: { 
              ...corsHeaders, 
              "Content-Type": "application/json",
              "Retry-After": String(rateCheck.retryAfter || 900)
            } 
          }
        );
      }
    } else {
      console.log(`[validate-license] Demo license detected, skipping rate limit`);
    }

    console.log("[validate-license] Validating license:", normalizedCode.substring(0, 4) + '...', "for email:", normalizedEmail);

    // First, try to find license by code only (to support company members)
    const { data: licenseByCode, error: codeError } = await supabase
      .from("licenses")
      .select("id, email, is_active, first_name, last_name, company_name, siren, company_status, employee_count, address, city, postal_code, activated_at, plan_type, max_drivers, max_clients, max_daily_charges, max_monthly_charges, max_yearly_charges, show_user_info, show_company_info, show_address_info, show_license_info")
      .eq("license_code", normalizedCode)
      .maybeSingle();

    if (codeError) {
      console.error("[validate-license] License lookup error:", codeError);
      return new Response(
        JSON.stringify({ success: false, error: "Erreur base de données" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!licenseByCode) {
      console.log("[validate-license] License not found");
      return new Response(
        JSON.stringify({ success: false, error: "Licence non trouvée" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check if this is the license owner OR a member of the company
    let license = licenseByCode;
    let isMemberLogin = false;
    
    if (licenseByCode.email !== normalizedEmail) {
      // Check if user is a registered member of this company
      const { data: memberRecord } = await supabase
        .from("company_users")
        .select("id, role, email, is_active")
        .eq("license_id", licenseByCode.id)
        .eq("email", normalizedEmail)
        .maybeSingle();
        
      if (!memberRecord) {
        console.log("[validate-license] Email not registered as company member");
        return new Response(
          JSON.stringify({ success: false, error: "Email non autorisé pour cette licence. Contactez votre administrateur." }),
          { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
      
      if (!memberRecord.is_active) {
        console.log("[validate-license] Member account is inactive");
        return new Response(
          JSON.stringify({ success: false, error: "Compte désactivé. Contactez votre administrateur." }),
          { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
      
      isMemberLogin = true;
      console.log("[validate-license] Member login detected for:", normalizedEmail, "role:", memberRecord.role);
    }

    if (!license.is_active) {
      console.log("[validate-license] License is inactive");
      return new Response(
        JSON.stringify({ success: false, error: "Licence désactivée" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Fetch custom features for this license
    const { data: features } = await supabase
      .from("license_features")
      .select("*")
      .eq("license_id", license.id)
      .maybeSingle();

    // --- Supabase Auth Integration ---
    // Try to sign in or create a user using the license code as password
    let authSession = null;
    let authUserId = null;

    try {
      // First, try to sign in with existing credentials
      console.log("[validate-license] Attempting to sign in user:", normalizedEmail);
      
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password: normalizedCode,
      });

      if (signInError) {
        console.log("[validate-license] Sign-in failed, attempting to create user:", signInError.message);
        
        // User doesn't exist or wrong password - try creating new user
        const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
          email: normalizedEmail,
          password: normalizedCode,
          email_confirm: true, // Auto-confirm since we validate via license
          user_metadata: {
            license_id: license.id,
            first_name: license.first_name,
            last_name: license.last_name,
            company_name: license.company_name,
            plan_type: license.plan_type,
          },
        });

        if (createError) {
          // User might already exist with different password - update it
          if (createError.message.includes('already been registered') || createError.message.includes('already exists')) {
            console.log("[validate-license] User exists, attempting password update");
            
            // Get user by email
            const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
            const existingUser = users?.find(u => u.email === normalizedEmail);
            
            if (existingUser) {
              // Update password to match license code
              const { error: updateError } = await supabase.auth.admin.updateUserById(existingUser.id, {
                password: normalizedCode,
                user_metadata: {
                  license_id: license.id,
                  first_name: license.first_name,
                  last_name: license.last_name,
                  company_name: license.company_name,
                  plan_type: license.plan_type,
                },
              });

              if (updateError) {
                console.error("[validate-license] Failed to update user password:", updateError);
              } else {
                // Try signing in again with updated password
                const { data: retrySignIn, error: retryError } = await supabase.auth.signInWithPassword({
                  email: normalizedEmail,
                  password: normalizedCode,
                });

                if (!retryError && retrySignIn.session) {
                  authSession = retrySignIn.session;
                  authUserId = retrySignIn.user?.id;
                  console.log("[validate-license] User signed in after password update");
                }
              }
            }
          } else {
            console.error("[validate-license] Failed to create user:", createError);
          }
        } else if (newUser?.user) {
          console.log("[validate-license] User created, signing in");
          // User created, now sign them in
          const { data: newSignIn, error: newSignInError } = await supabase.auth.signInWithPassword({
            email: normalizedEmail,
            password: normalizedCode,
          });

          if (!newSignInError && newSignIn.session) {
            authSession = newSignIn.session;
            authUserId = newSignIn.user?.id;
          }
        }
      } else if (signInData.session) {
        authSession = signInData.session;
        authUserId = signInData.user?.id;
        console.log("[validate-license] User signed in successfully");

        // Update user metadata if needed
        await supabase.auth.admin.updateUserById(authUserId, {
          user_metadata: {
            license_id: license.id,
            first_name: license.first_name,
            last_name: license.last_name,
            company_name: license.company_name,
            plan_type: license.plan_type,
          },
        });
      }
    } catch (authError) {
      console.error("[validate-license] Auth error (non-blocking):", authError);
      // Continue without auth - license validation still works
    }

    // Update activation info
    const now = new Date().toISOString();
    await supabase
      .from("licenses")
      .update({ 
        activated_at: license.activated_at || now,
        last_used_at: now 
      })
      .eq("id", license.id);

    // --- Ensure user is in company_users ---
    if (authUserId) {
      try {
        // Check if user is already in company_users for this license by user_id
        const { data: existingMemberById } = await supabase
          .from("company_users")
          .select("id, role, email")
          .eq("license_id", license.id)
          .eq("user_id", authUserId)
          .maybeSingle();

        if (!existingMemberById) {
          // Check if there's an entry by email that needs updating (member was pre-added by admin)
          const { data: existingMemberByEmail } = await supabase
            .from("company_users")
            .select("id, role, user_id")
            .eq("license_id", license.id)
            .eq("email", normalizedEmail)
            .maybeSingle();
          
          if (existingMemberByEmail) {
            // Update the existing record with the real Supabase user_id using RPC to bypass RLS
            const { data: linked, error: linkError } = await supabase
              .rpc("link_user_to_company", {
                p_company_user_id: existingMemberByEmail.id,
                p_user_id: authUserId
              });
              
            if (linkError) {
              console.error("[validate-license] Failed to link user to company:", linkError);
            } else if (linked) {
              console.log(`[validate-license] Linked user to company_users for ${normalizedEmail}`);
            } else {
              console.log(`[validate-license] User already linked or not eligible for ${normalizedEmail}`);
            }
          } else {
            // No existing entry - check if there's already an owner for this license
            const { data: existingOwner } = await supabase
              .from("company_users")
              .select("id")
              .eq("license_id", license.id)
              .eq("role", "owner")
              .maybeSingle();

            // If no owner exists and this is the license owner email, add as owner; otherwise as member
            const isLicenseOwnerEmail = license.email === normalizedEmail;
            const role = (!existingOwner && isLicenseOwnerEmail) ? 'owner' : 'member';
            
            const { error: insertError } = await supabase
              .from("company_users")
              .insert({
                license_id: license.id,
                user_id: authUserId,
                email: normalizedEmail,
                role: role,
                display_name: isLicenseOwnerEmail 
                  ? ([license.first_name, license.last_name].filter(Boolean).join(' ') || null)
                  : null,
                accepted_at: now,
                is_active: true,
              });

            if (insertError) {
              console.error("[validate-license] Failed to add user to company_users:", insertError);
            } else {
              console.log(`[validate-license] User added to company_users as ${role}`);
            }
          }
        } else {
          console.log("[validate-license] User already in company_users with role:", existingMemberById.role);
        }
      } catch (cuError) {
        console.error("[validate-license] company_users error (non-blocking):", cuError);
      }
    }

    // Log login to history
    const userAgent = req.headers.get('user-agent') || 'unknown';
    const deviceType = userAgent.includes('Mobile') ? 'mobile' : 
                       userAgent.includes('Tablet') ? 'tablet' : 'desktop';
    
    await supabase
      .from("login_history")
      .insert({
        license_id: license.id,
        ip_address: clientIp,
        user_agent: userAgent.substring(0, 500),
        device_type: deviceType,
        success: true,
      });

    console.log("[validate-license] License validated successfully for:", normalizedEmail, "with auth:", !!authSession);

    // Fetch user-specific feature overrides if we have an auth session
    let userFeatureOverrides: { feature_key: string; enabled: boolean }[] = [];
    console.log("[validate-license] Checking for user overrides. authSession.user.id:", authSession?.user?.id);
    
    if (authSession?.user?.id) {
      try {
        // Find the company_user record for this user
        console.log("[validate-license] Looking for company_user with license_id:", license.id, "and user_id:", authSession.user.id);
        const { data: companyUser, error: cuError } = await supabase
          .from("company_users")
          .select("id")
          .eq("license_id", license.id)
          .eq("user_id", authSession.user.id)
          .maybeSingle();

        console.log("[validate-license] company_user lookup result:", companyUser, "error:", cuError);

        if (companyUser) {
          // Fetch user-specific overrides
          const { data: overrides, error: ovError } = await supabase
            .from("user_feature_overrides")
            .select("feature_key, enabled")
            .eq("company_user_id", companyUser.id);
          
          console.log("[validate-license] overrides lookup result:", overrides, "error:", ovError);
          userFeatureOverrides = overrides || [];
          console.log("[validate-license] User feature overrides count:", userFeatureOverrides.length);
        } else {
          console.log("[validate-license] No company_user found for this user");
        }
      } catch (e) {
        console.error("[validate-license] Error fetching user overrides:", e);
      }
    } else {
      console.log("[validate-license] No auth session user id, skipping overrides");
    }

    // Build response with optional auth session
    const responsePayload: Record<string, any> = {
      success: true,
      licenseData: {
        code: normalizedCode,
        email: normalizedEmail,
        firstName: license.first_name,
        lastName: license.last_name,
        companyName: license.company_name,
        siren: license.siren,
        companyStatus: license.company_status,
        employeeCount: license.employee_count,
        address: license.address,
        city: license.city,
        postalCode: license.postal_code,
        activatedAt: license.activated_at || now,
        planType: license.plan_type || 'start',
        maxDrivers: license.max_drivers,
        maxClients: license.max_clients,
        maxDailyCharges: license.max_daily_charges,
        maxMonthlyCharges: license.max_monthly_charges,
        maxYearlyCharges: license.max_yearly_charges,
        showUserInfo: license.show_user_info ?? true,
        showCompanyInfo: license.show_company_info ?? true,
        showAddressInfo: license.show_address_info ?? true,
        showLicenseInfo: license.show_license_info ?? true,
      },
      customFeatures: features || null,
      userFeatureOverrides: userFeatureOverrides.length > 0 ? userFeatureOverrides : null,
    };

    // Include auth session if available
    if (authSession) {
      responsePayload.session = {
        access_token: authSession.access_token,
        refresh_token: authSession.refresh_token,
        expires_in: authSession.expires_in,
        expires_at: authSession.expires_at,
        user: {
          id: authSession.user?.id,
          email: authSession.user?.email,
        },
      };
    }

    return new Response(
      JSON.stringify(responsePayload),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error) {
    console.error("Error in validate-license function:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Erreur serveur" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
