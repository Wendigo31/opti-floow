import { errorResponse, jsonResponse } from "./shared.ts";

// Synchronisation de la société depuis les Paramètres (action « sync-company »).
// Seule action restante de l'ancien module admin : tout le reste se gère depuis OptiCentral.
// deno-lint-ignore no-explicit-any
export async function handleSyncCompany(body: any, supabase: any) {
  const { licenseCode, email } = body;
  if (!licenseCode || !email) return errorResponse("Missing license code or email", 400);

  const { data: license, error: licenseError } = await supabase.from("licenses")
    .select("id, company_name, plan_type").eq("license_code", licenseCode.trim().toUpperCase()).maybeSingle();
  if (licenseError || !license) return errorResponse("License not found", 404);

  const { data: companyUsers, error: usersError } = await supabase.from("company_users")
    .select("id, email, display_name, is_active").eq("license_id", license.id).eq("is_active", true);
  if (usersError) return errorResponse("Database error", 500);

  await supabase.from("licenses").update({ last_used_at: new Date().toISOString() }).eq("id", license.id);
  console.log(`[sync-company] Synced ${companyUsers?.length || 0} users for company ${license.company_name}`);
  return jsonResponse({ success: true, syncedCount: companyUsers?.length || 0, companyName: license.company_name, planType: license.plan_type });
}
