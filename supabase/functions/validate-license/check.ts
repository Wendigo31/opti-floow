import {
  getEffectiveFeatures, findLicense, LICENSE_SELECT_FIELDS,
  jsonResponse, errorResponse,
} from "./shared.ts";

// Handle "check" action - verify stored license is still valid (used on app load)
export async function handleCheck(body: any, supabase: any, req: Request): Promise<Response> {
  const { licenseCode, email } = body;

  if (!licenseCode || !email) {
    return jsonResponse({ valid: false, error: "Missing license code or email" }, 400);
  }

  const normalizedEmail = email.trim().toLowerCase();
  const normalizedCode = licenseCode.trim().toUpperCase();

  const { license: licenseByCode, error: codeError } = await findLicense(supabase, normalizedCode, LICENSE_SELECT_FIELDS);

  if (codeError) {
    console.error("License check error:", codeError);
    return jsonResponse({ valid: false, error: "Database error" }, 500);
  }

  if (!licenseByCode) {
    console.log("[check] License not found for code:", normalizedCode.substring(0, 4) + '...');
    return jsonResponse({ valid: false });
  }

  let license = licenseByCode;

  // Check if this is the license owner OR a member of the company
  if (licenseByCode.email !== normalizedEmail) {
    const { data: memberRecord } = await supabase
      .from("company_users")
      .select("id, role, email, is_active")
      .eq("license_id", licenseByCode.id)
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (!memberRecord || !memberRecord.is_active) {
      console.log("[check] Email not a valid company member:", normalizedEmail);
      return jsonResponse({ valid: false });
    }
    console.log("[check] Valid company member found:", normalizedEmail, "role:", memberRecord.role);
  }

  if (!license.is_active) {
    console.log("[check] License is inactive");
    return jsonResponse({ valid: false });
  }

  // Fetch custom features
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
      const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
      if (user) {
        const { data: companyUser } = await supabase
          .from("company_users")
          .select("id")
          .eq("license_id", license.id)
          .eq("user_id", user.id)
          .maybeSingle();

        if (companyUser) {
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

  const planType = license.plan_type || 'start';
  const effectiveFeatures = getEffectiveFeatures(planType, features);

  return jsonResponse({
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
      planType,
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
    customFeatures: effectiveFeatures,
    userFeatureOverrides: userFeatureOverrides.length > 0 ? userFeatureOverrides : null,
  });
}
