import {
  corsHeaders, verifyAdminAuth, logAdminAction, mapToValidRole,
  getDefaultMaxUsersForPlan, jsonResponse, errorResponse,
} from "./shared.ts";

// Admin action handler - routes all admin-prefixed actions
export async function handleAdminAction(
  action: string, body: any, supabase: any,
  authHeader: string | null, clientIp: string
): Promise<Response> {
  switch (action) {
    case "list-all": return handleListAll(body, supabase, authHeader, clientIp);
    case "detect-duplicates": return handleDetectDuplicates(body, supabase, authHeader, clientIp);
    case "merge-companies": return handleMergeCompanies(body, supabase, authHeader, clientIp);
    case "toggle-status": return handleToggleStatus(body, supabase, authHeader, clientIp);
    case "update-plan": return handleUpdatePlan(body, supabase, authHeader, clientIp);
    case "create-license": return handleCreateLicense(body, supabase, authHeader, clientIp);
    case "delete-license": return handleDeleteLicense(body, supabase, authHeader, clientIp);
    case "update-license": return handleUpdateLicense(body, supabase, authHeader, clientIp);
    case "get-company-data": return handleGetCompanyData(body, supabase, authHeader, clientIp);
    case "update-limits": return handleUpdateLimits(body, supabase, authHeader, clientIp);
    case "update-features": return handleUpdateFeatures(body, supabase, authHeader, clientIp);
    case "update-visibility": return handleUpdateVisibility(body, supabase, authHeader, clientIp);
    case "get-login-history": return handleGetLoginHistory(body, supabase, authHeader, clientIp);
    case "get-user-stats": return handleGetUserStats(body, supabase, authHeader, clientIp);
    case "get-user-details": return handleGetUserDetails(body, supabase, authHeader, clientIp);
    case "get-addons": return handleGetAddons(body, supabase);
    case "update-addons": return handleUpdateAddons(body, supabase);
    case "admin-update-addons": return handleAdminUpdateAddons(body, supabase, authHeader, clientIp);
    case "admin-get-addons": return handleAdminGetAddons(body, supabase, authHeader);
    case "get-audit-logs": return handleGetAuditLogs(body, supabase, authHeader);
    case "sync-company": return handleSyncCompany(body, supabase);
    default: return errorResponse("Action non reconnue", 400);
  }
}

// Helper: require admin auth
async function requireAdmin(body: any, authHeader: string | null): Promise<{ authorized: boolean; email?: string }> {
  return verifyAdminAuth(body, authHeader);
}

async function handleListAll(body: any, supabase: any, authHeader: string | null, clientIp: string) {
  const auth = await requireAdmin(body, authHeader);
  if (!auth.authorized) return errorResponse("Accès non autorisé", 403);

  const { data: licenses, error } = await supabase
    .from("licenses").select("*").order("created_at", { ascending: false });
  if (error) return errorResponse("Erreur base de données", 500);

  const licensesWithDetails = await Promise.all(
    (licenses || []).map(async (license: any) => {
      const [{ data: features }, { count: userCount }] = await Promise.all([
        supabase.from("license_features").select("*").eq("license_id", license.id).maybeSingle(),
        supabase.from("company_users").select("*", { count: "exact", head: true }).eq("license_id", license.id),
      ]);
      return { ...license, features: features || null, user_count: userCount || 0 };
    })
  );

  await logAdminAction(supabase, auth.email || 'admin', 'list_licenses', null, { count: licenses?.length || 0 }, clientIp);
  return jsonResponse({ success: true, licenses: licensesWithDetails });
}

async function handleDetectDuplicates(body: any, supabase: any, authHeader: string | null, _clientIp: string) {
  const auth = await requireAdmin(body, authHeader);
  if (!auth.authorized) return errorResponse("Accès non autorisé", 403);

  const { data: licenses, error } = await supabase
    .from("licenses")
    .select("id, license_code, email, company_name, siren, address, city, postal_code, plan_type, is_active, created_at")
    .not("siren", "is", null).neq("siren", "").order("siren").order("created_at");
  if (error) return errorResponse("Erreur base de données", 500);

  const sirenGroups: Record<string, any[]> = {};
  for (const license of (licenses || [])) {
    const siren = license.siren?.replace(/\s/g, '');
    if (siren) {
      if (!sirenGroups[siren]) sirenGroups[siren] = [];
      sirenGroups[siren].push(license);
    }
  }

  const duplicates: { siren: string; licenses: any[] }[] = [];
  for (const [siren, group] of Object.entries(sirenGroups)) {
    if (group.length > 1) {
      const licensesWithCounts = await Promise.all(
        group.map(async (license) => {
          const { count } = await supabase.from("company_users").select("*", { count: "exact", head: true }).eq("license_id", license.id);
          return { ...license, user_count: count || 0 };
        })
      );
      duplicates.push({ siren, licenses: licensesWithCounts });
    }
  }
  return jsonResponse({ success: true, duplicates });
}

async function handleMergeCompanies(body: any, supabase: any, authHeader: string | null, clientIp: string) {
  const { targetLicenseId, sourceLicenseIds } = body;
  const auth = await requireAdmin(body, authHeader);
  if (!auth.authorized) return errorResponse("Accès non autorisé", 403);
  if (!targetLicenseId || !sourceLicenseIds || !Array.isArray(sourceLicenseIds))
    return errorResponse("Paramètres manquants", 400);

  try {
    for (const sourceId of sourceLicenseIds) {
      await supabase.from("company_users").update({ license_id: targetLicenseId }).eq("license_id", sourceId);
      const dataTables = ['saved_tours', 'trips', 'clients', 'quotes', 'user_vehicles', 'user_drivers', 'user_charges', 'user_trailers'];
      for (const table of dataTables) {
        await supabase.from(table).update({ license_id: targetLicenseId }).eq("license_id", sourceId);
      }
      await supabase.from("licenses").update({
        is_active: false, notes: `Fusionnée vers ${targetLicenseId} le ${new Date().toISOString()}`
      }).eq("id", sourceId);
    }
    await logAdminAction(supabase, auth.email || 'admin', 'merge_companies', targetLicenseId, { sourceLicenseIds }, clientIp);
    return jsonResponse({ success: true });
  } catch (err: any) {
    return errorResponse("Erreur lors de la fusion: " + (err.message || 'Erreur inconnue'), 500);
  }
}

async function handleToggleStatus(body: any, supabase: any, authHeader: string | null, clientIp: string) {
  const { licenseId, isActive } = body;
  const auth = await requireAdmin(body, authHeader);
  if (!auth.authorized) return errorResponse("Accès non autorisé", 403);

  const { error } = await supabase.from("licenses").update({ is_active: isActive }).eq("id", licenseId);
  if (error) return errorResponse("Erreur mise à jour", 500);
  await logAdminAction(supabase, auth.email || 'admin', 'toggle_license_status', licenseId, { isActive }, clientIp);
  return jsonResponse({ success: true });
}

async function handleUpdatePlan(body: any, supabase: any, authHeader: string | null, clientIp: string) {
  const { licenseId, planType } = body;
  const auth = await requireAdmin(body, authHeader);
  if (!auth.authorized) return errorResponse("Accès non autorisé", 403);
  if (!['start', 'pro', 'enterprise'].includes(planType)) return errorResponse("Type de forfait invalide", 400);

  const { error } = await supabase.from("licenses").update({
    plan_type: planType, max_users: getDefaultMaxUsersForPlan(planType),
  }).eq("id", licenseId);
  if (error) return errorResponse("Erreur mise à jour", 500);
  await logAdminAction(supabase, auth.email || 'admin', 'update_plan', licenseId, { planType }, clientIp);
  return jsonResponse({ success: true });
}

async function handleCreateLicense(body: any, supabase: any, authHeader: string | null, clientIp: string) {
  const { email, planType, firstName, lastName, companyName, assignToCompanyId, userRole, siren, address, city, postalCode, employeeCount, companyStatus, companyIdentifier } = body;
  const auth = await requireAdmin(body, authHeader);
  if (!auth.authorized) return errorResponse("Accès non autorisé", 403);
  if (!email) return errorResponse("Email requis", 400);

  // Assign to existing company
  if (assignToCompanyId) {
    const { data: existingUser } = await supabase.from("company_users").select("id")
      .eq("license_id", assignToCompanyId).eq("email", email.trim().toLowerCase()).maybeSingle();
    if (existingUser) return errorResponse("Cet email est déjà dans cette société", 400);

    const displayName = [firstName, lastName].filter(Boolean).join(' ') || null;
    const { data: newCompanyUser, error: cuError } = await supabase.from("company_users").insert({
      license_id: assignToCompanyId, email: email.trim().toLowerCase(), role: mapToValidRole(userRole),
      display_name: displayName, is_active: true, invited_at: new Date().toISOString(),
    }).select().single();
    if (cuError) return errorResponse("Erreur lors de l'ajout de l'utilisateur: " + cuError.message, 500);
    await logAdminAction(supabase, auth.email || 'admin', 'add_user_to_company', assignToCompanyId, { email, userRole }, clientIp);
    return jsonResponse({ success: true, companyUser: newCompanyUser, assignedToCompany: true });
  }

  // Generate unique license code
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const generateCode = () => {
    const segments = [];
    for (let s = 0; s < 4; s++) {
      let segment = '';
      for (let i = 0; i < 4; i++) segment += chars.charAt(Math.floor(Math.random() * chars.length));
      segments.push(segment);
    }
    return segments.join('-');
  };

  let licenseCode = generateCode();
  let attempts = 0;
  while (attempts < 10) {
    const { data: existing } = await supabase.from("licenses").select("id").eq("license_code", licenseCode).maybeSingle();
    if (!existing) break;
    licenseCode = generateCode();
    attempts++;
  }

  if (companyIdentifier) {
    const { data: existingId } = await supabase.from("licenses").select("id").eq("company_identifier", companyIdentifier.trim()).maybeSingle();
    if (existingId) return errorResponse("Cet identifiant société existe déjà", 400);
  }

  const { data: newLicense, error } = await supabase.from("licenses").insert({
    license_code: licenseCode, company_identifier: companyIdentifier?.trim() || null,
    email: email.trim().toLowerCase(), plan_type: planType || 'start',
    max_users: getDefaultMaxUsersForPlan(planType || 'start'),
    first_name: firstName || null, last_name: lastName || null, company_name: companyName || null,
    siren: siren || null, address: address || null, city: city || null, postal_code: postalCode || null,
    employee_count: employeeCount || null, company_status: companyStatus || null, is_active: true,
  }).select().single();
  if (error) return errorResponse("Erreur lors de la création: " + error.message, 500);
  await logAdminAction(supabase, auth.email || 'admin', 'create_license', newLicense.id, { email, planType }, clientIp);
  return jsonResponse({ success: true, licenseCode, license_code: licenseCode, license: newLicense });
}

async function handleDeleteLicense(body: any, supabase: any, authHeader: string | null, clientIp: string) {
  const { licenseId } = body;
  const auth = await requireAdmin(body, authHeader);
  if (!auth.authorized) return errorResponse("Accès non autorisé", 403);
  if (!licenseId) return errorResponse("ID licence requis", 400);

  const { error } = await supabase.from("licenses").delete().eq("id", licenseId);
  if (error) return errorResponse("Erreur lors de la suppression: " + error.message, 500);
  await logAdminAction(supabase, auth.email || 'admin', 'delete_license', licenseId, {}, clientIp);
  return jsonResponse({ success: true });
}

async function handleUpdateLicense(body: any, supabase: any, authHeader: string | null, clientIp: string) {
  const { licenseId, email, planType, firstName, lastName, companyName, siren, address, city, postalCode, employeeCount, companyStatus, companyIdentifier } = body;
  const auth = await requireAdmin(body, authHeader);
  if (!auth.authorized) return errorResponse("Accès non autorisé", 403);
  if (!licenseId) return errorResponse("ID licence requis", 400);

  if (companyIdentifier !== undefined && companyIdentifier) {
    const { data: existingId } = await supabase.from("licenses").select("id")
      .eq("company_identifier", companyIdentifier.trim()).neq("id", licenseId).maybeSingle();
    if (existingId) return errorResponse("Cet identifiant société existe déjà", 400);
  }

  const updateData: Record<string, any> = {};
  if (email !== undefined) updateData.email = email.trim().toLowerCase();
  if (planType !== undefined && ['start', 'pro', 'enterprise'].includes(planType)) updateData.plan_type = planType;
  if (firstName !== undefined) updateData.first_name = firstName || null;
  if (lastName !== undefined) updateData.last_name = lastName || null;
  if (companyName !== undefined) updateData.company_name = companyName || null;
  if (companyIdentifier !== undefined) updateData.company_identifier = companyIdentifier?.trim() || null;
  if (siren !== undefined) updateData.siren = siren || null;
  if (address !== undefined) updateData.address = address || null;
  if (city !== undefined) updateData.city = city || null;
  if (postalCode !== undefined) updateData.postal_code = postalCode || null;
  if (employeeCount !== undefined) updateData.employee_count = employeeCount || null;
  if (companyStatus !== undefined) updateData.company_status = companyStatus || null;

  const { error } = await supabase.from("licenses").update(updateData).eq("id", licenseId);
  if (error) return errorResponse("Erreur lors de la mise à jour: " + error.message, 500);
  await logAdminAction(supabase, auth.email || 'admin', 'update_license', licenseId, updateData, clientIp);
  return jsonResponse({ success: true });
}

async function handleGetCompanyData(body: any, supabase: any, authHeader: string | null, clientIp: string) {
  const { licenseId } = body;
  const auth = await requireAdmin(body, authHeader);
  if (!auth.authorized) return errorResponse("Accès non autorisé", 403);
  if (!licenseId) return errorResponse("ID licence requis", 400);

  try {
    const { data: licenseInfo } = await supabase.from('licenses')
      .select('id, email, company_name, siren, address, city, postal_code, company_status, employee_count, plan_type, max_users, is_active')
      .eq('id', licenseId).maybeSingle();

    const { data: companyUsers, error: usersError } = await supabase.from('company_users')
      .select('*').eq('license_id', licenseId).order('role', { ascending: true }).order('created_at', { ascending: true });
    if (usersError) throw usersError;

    const userStats = await Promise.all(
      (companyUsers || []).map(async (user: any) => {
        if (!user.user_id) {
          return {
            company_user_id: user.id, user_id: null, email: user.email, display_name: user.display_name,
            role: user.role, tours_count: 0, trips_count: 0, clients_count: 0, quotes_count: 0,
            vehicles_count: 0, drivers_count: 0, charges_count: 0, total_revenue: 0, total_distance: 0,
            last_activity_at: user.last_activity_at, accepted_at: user.accepted_at,
          };
        }
        const userId = user.user_id;
        const [
          { count: toursCount }, { count: tripsCount }, { count: clientsCount }, { count: quotesCount },
          { count: vehiclesCount }, { count: driversCount }, { count: chargesCount }, { data: tripsData },
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
        return {
          company_user_id: user.id, user_id: userId, email: user.email, display_name: user.display_name,
          role: user.role, tours_count: toursCount || 0, trips_count: tripsCount || 0, clients_count: clientsCount || 0,
          quotes_count: quotesCount || 0, vehicles_count: vehiclesCount || 0, drivers_count: driversCount || 0,
          charges_count: chargesCount || 0,
          total_revenue: (tripsData || []).reduce((sum: number, t: any) => sum + (t.revenue || 0), 0),
          total_distance: (tripsData || []).reduce((sum: number, t: any) => sum + (t.distance_km || 0), 0),
          last_activity_at: user.last_activity_at, accepted_at: user.accepted_at,
        };
      })
    );

    const [
      { count: toursCount }, { count: tripsCount }, { count: clientsCount }, { count: quotesCount },
      { count: vehiclesCount }, { count: driversCount }, { count: chargesCount }, { count: trailersCount },
      { data: toursRevenue }, { data: tripsRevenue }, { data: vehiclesData }, { data: trailersData }, { data: toursData },
    ] = await Promise.all([
      supabase.from('saved_tours').select('*', { count: 'exact', head: true }).eq('license_id', licenseId),
      supabase.from('trips').select('*', { count: 'exact', head: true }).eq('license_id', licenseId),
      supabase.from('clients').select('*', { count: 'exact', head: true }).eq('license_id', licenseId),
      supabase.from('quotes').select('*', { count: 'exact', head: true }).eq('license_id', licenseId),
      supabase.from('user_vehicles').select('*', { count: 'exact', head: true }).eq('license_id', licenseId),
      supabase.from('user_drivers').select('*', { count: 'exact', head: true }).eq('license_id', licenseId),
      supabase.from('user_charges').select('*', { count: 'exact', head: true }).eq('license_id', licenseId),
      supabase.from('user_trailers').select('*', { count: 'exact', head: true }).eq('license_id', licenseId),
      supabase.from('saved_tours').select('revenue, distance_km').eq('license_id', licenseId),
      supabase.from('trips').select('revenue, distance_km').eq('license_id', licenseId),
      supabase.from('user_vehicles').select('*').eq('license_id', licenseId).order('created_at', { ascending: false }),
      supabase.from('user_trailers').select('*').eq('license_id', licenseId).order('created_at', { ascending: false }),
      supabase.from('saved_tours').select('*').eq('license_id', licenseId).order('created_at', { ascending: false }),
    ]);

    const tourRevenue = (toursRevenue || []).reduce((sum: number, t: any) => sum + (t.revenue || 0), 0);
    const tourDistance = (toursRevenue || []).reduce((sum: number, t: any) => sum + (t.distance_km || 0), 0);
    const tripRevenue = (tripsRevenue || []).reduce((sum: number, t: any) => sum + (t.revenue || 0), 0);
    const tripDistance = (tripsRevenue || []).reduce((sum: number, t: any) => sum + (t.distance_km || 0), 0);

    const userEmailMap = new Map((companyUsers || []).map((u: any) => [u.user_id, u.email]));
    const mapUserEmail = (item: any) => ({ ...item, user_email: userEmailMap.get(item.user_id) || null });

    const { data: loginHistory } = await supabase.from('login_history').select('*')
      .eq('license_id', licenseId).order('login_at', { ascending: false }).limit(50);

    return jsonResponse({
      success: true, licenseInfo: licenseInfo || null, companyUsers: companyUsers || [], userStats,
      companyTotals: {
        tours: toursCount || 0, trips: tripsCount || 0, clients: clientsCount || 0, quotes: quotesCount || 0,
        vehicles: vehiclesCount || 0, drivers: driversCount || 0, charges: chargesCount || 0, trailers: trailersCount || 0,
        revenue: tourRevenue + tripRevenue, distance: tourDistance + tripDistance,
      },
      loginHistory: loginHistory || [],
      vehicles: (vehiclesData || []).map(mapUserEmail),
      trailers: (trailersData || []).map(mapUserEmail),
      tours: (toursData || []).map(mapUserEmail),
    });
  } catch (error) {
    console.error("Get company data error:", error);
    return errorResponse("Erreur lors de la récupération des données", 500);
  }
}

async function handleUpdateLimits(body: any, supabase: any, authHeader: string | null, clientIp: string) {
  const { licenseId, maxDrivers, maxClients, maxDailyCharges, maxMonthlyCharges, maxYearlyCharges, maxUsers } = body;
  const auth = await requireAdmin(body, authHeader);
  if (!auth.authorized) return errorResponse("Accès non autorisé", 403);
  if (!licenseId) return errorResponse("ID licence requis", 400);

  const { error } = await supabase.from("licenses").update({
    max_drivers: maxDrivers, max_clients: maxClients, max_daily_charges: maxDailyCharges,
    max_monthly_charges: maxMonthlyCharges, max_yearly_charges: maxYearlyCharges, max_users: maxUsers,
  }).eq("id", licenseId);
  if (error) return errorResponse("Erreur lors de la mise à jour des limites: " + error.message, 500);
  await logAdminAction(supabase, auth.email || 'admin', 'update_limits', licenseId, { maxDrivers, maxClients, maxDailyCharges, maxMonthlyCharges, maxYearlyCharges, maxUsers }, clientIp);
  return jsonResponse({ success: true });
}

async function handleUpdateFeatures(body: any, supabase: any, authHeader: string | null, clientIp: string) {
  const { licenseId, features } = body;
  const auth = await requireAdmin(body, authHeader);
  if (!auth.authorized) return errorResponse("Accès non autorisé", 403);
  if (!licenseId) return errorResponse("ID licence requis", 400);

  const { data: existingFeatures } = await supabase.from("license_features").select("id").eq("license_id", licenseId).maybeSingle();
  let error;
  if (existingFeatures) {
    const { error: updateError } = await supabase.from("license_features")
      .update({ ...features, updated_at: new Date().toISOString() }).eq("license_id", licenseId);
    error = updateError;
  } else {
    const { error: insertError } = await supabase.from("license_features").insert({ license_id: licenseId, ...features });
    error = insertError;
  }
  if (error) return errorResponse("Erreur lors de la mise à jour des fonctionnalités: " + error.message, 500);
  await logAdminAction(supabase, auth.email || 'admin', 'update_features', licenseId, { features }, clientIp);
  return jsonResponse({ success: true });
}

async function handleUpdateVisibility(body: any, supabase: any, authHeader: string | null, clientIp: string) {
  const { licenseId, showUserInfo, showCompanyInfo, showAddressInfo, showLicenseInfo } = body;
  const auth = await requireAdmin(body, authHeader);
  if (!auth.authorized) return errorResponse("Accès non autorisé", 403);
  if (!licenseId) return errorResponse("ID licence requis", 400);

  const { error } = await supabase.from("licenses").update({
    show_user_info: showUserInfo, show_company_info: showCompanyInfo,
    show_address_info: showAddressInfo, show_license_info: showLicenseInfo,
  }).eq("id", licenseId);
  if (error) return errorResponse("Erreur lors de la mise à jour de la visibilité: " + error.message, 500);
  await logAdminAction(supabase, auth.email || 'admin', 'update_visibility', licenseId, { showUserInfo, showCompanyInfo, showAddressInfo, showLicenseInfo }, clientIp);
  return jsonResponse({ success: true });
}

async function handleGetLoginHistory(body: any, supabase: any, authHeader: string | null, _clientIp: string) {
  const { licenseId } = body;
  const auth = await requireAdmin(body, authHeader);
  if (!auth.authorized) return errorResponse("Accès non autorisé", 403);
  if (!licenseId) return errorResponse("ID licence requis", 400);

  const { data: history, error } = await supabase.from("login_history").select("*")
    .eq("license_id", licenseId).order("login_at", { ascending: false }).limit(50);
  if (error) return errorResponse("Erreur lors de la récupération de l'historique", 500);
  return jsonResponse({ success: true, history: history || [] });
}

async function handleGetUserStats(body: any, supabase: any, authHeader: string | null, _clientIp: string) {
  const { licenseId, userId } = body;
  const auth = await requireAdmin(body, authHeader);
  if (!auth.authorized) return errorResponse("Accès non autorisé", 403);
  if (!licenseId && !userId) return errorResponse("ID licence ou utilisateur requis", 400);

  let userIdToQuery = userId;
  if (licenseId && !userId) {
    const { data: license } = await supabase.from("licenses").select("email").eq("id", licenseId).maybeSingle();
    if (license?.email) {
      const { data: authUsers } = await supabase.auth.admin.listUsers();
      const authUser = authUsers?.users?.find((u: any) => u.email?.toLowerCase() === license.email.toLowerCase());
      userIdToQuery = authUser?.id;
    }
  }

  const stats = { savedTours: 0, trips: 0, clients: 0, quotes: 0, vehicles: 0, drivers: 0, charges: 0 };
  const filterField = licenseId ? 'license_id' : 'user_id';
  const filterValue = licenseId || userIdToQuery;

  if (filterValue) {
    const [
      { count: toursCount }, { count: tripsCount }, { count: clientsCount }, { count: quotesCount },
      { count: vehiclesCount }, { count: driversCount }, { count: chargesCount },
    ] = await Promise.all([
      supabase.from("saved_tours").select("*", { count: "exact", head: true }).eq(filterField, filterValue),
      supabase.from("trips").select("*", { count: "exact", head: true }).eq(filterField, filterValue),
      supabase.from("clients").select("*", { count: "exact", head: true }).eq(filterField, filterValue),
      supabase.from("quotes").select("*", { count: "exact", head: true }).eq(filterField, filterValue),
      supabase.from("user_vehicles").select("*", { count: "exact", head: true }).eq(filterField, filterValue),
      supabase.from("user_drivers").select("*", { count: "exact", head: true }).eq(filterField, filterValue),
      supabase.from("user_charges").select("*", { count: "exact", head: true }).eq(filterField, filterValue),
    ]);
    stats.savedTours = toursCount || 0; stats.trips = tripsCount || 0; stats.clients = clientsCount || 0;
    stats.quotes = quotesCount || 0; stats.vehicles = vehiclesCount || 0; stats.drivers = driversCount || 0;
    stats.charges = chargesCount || 0;
  }

  return jsonResponse({ success: true, stats, userId: userIdToQuery || null });
}

async function handleGetUserDetails(body: any, supabase: any, authHeader: string | null, _clientIp: string) {
  const { licenseId, userId, type } = body;
  const auth = await requireAdmin(body, authHeader);
  if (!auth.authorized) return errorResponse("Accès non autorisé", 403);
  if (!licenseId && !userId) return errorResponse("ID licence ou utilisateur requis", 400);

  let userIdToQuery = userId;
  if (licenseId && !userId) {
    const { data: license } = await supabase.from("licenses").select("email").eq("id", licenseId).maybeSingle();
    if (license?.email) {
      const { data: authUsers } = await supabase.auth.admin.listUsers();
      const authUser = authUsers?.users?.find((u: any) => u.email?.toLowerCase() === license.email.toLowerCase());
      userIdToQuery = authUser?.id;
    }
  }

  if (!userIdToQuery) return jsonResponse({ success: true, data: [], message: "Utilisateur non authentifié" });

  let data: any[] = [];
  const tableMap: Record<string, string> = { vehicles: 'user_vehicles', drivers: 'user_drivers', charges: 'user_charges' };
  const table = tableMap[type];
  if (table) {
    const { data: result } = await supabase.from(table).select("*").eq("user_id", userIdToQuery).order("name");
    data = result || [];
  }
  return jsonResponse({ success: true, data, userId: userIdToQuery });
}

// User-facing addon endpoints
async function handleGetAddons(body: any, supabase: any) {
  const { licenseCode, email } = body;
  if (!licenseCode || !email) return errorResponse("License code and email required", 400);

  const { data: license } = await supabase.from("licenses").select("id")
    .eq("license_code", licenseCode.trim().toUpperCase()).eq("email", email.trim().toLowerCase()).maybeSingle();
  if (!license) return errorResponse("License not found", 404);

  const { data: addons } = await supabase.from("license_addons").select("*").eq("license_id", license.id).eq("is_active", true);
  return jsonResponse({ success: true, addons: addons || [] });
}

async function handleUpdateAddons(body: any, supabase: any) {
  const { licenseCode, email, addOns } = body;
  if (!licenseCode || !email) return errorResponse("License code and email required", 400);

  const { data: license } = await supabase.from("licenses").select("id, plan_type")
    .eq("license_code", licenseCode.trim().toUpperCase()).eq("email", email.trim().toLowerCase())
    .eq("is_active", true).maybeSingle();
  if (!license) return errorResponse("License not found or inactive", 404);

  await supabase.from("license_addons")
    .update({ is_active: false, deactivated_at: new Date().toISOString() }).eq("license_id", license.id);

  if (addOns && addOns.length > 0) {
    const now = new Date().toISOString();
    for (const addonId of addOns) {
      await supabase.from("license_addons").upsert({
        license_id: license.id, addon_id: addonId, addon_name: addonId,
        is_active: true, activated_at: now, deactivated_at: null,
      }, { onConflict: 'license_id,addon_id' });
    }
    await supabase.from("licenses").update({ addons_monthly_total: 0 }).eq("id", license.id);
  }
  return jsonResponse({ success: true, message: "Add-ons updated successfully" });
}

async function handleAdminUpdateAddons(body: any, supabase: any, authHeader: string | null, clientIp: string) {
  const { licenseId, addOns } = body;
  const auth = await requireAdmin(body, authHeader);
  if (!auth.authorized) return errorResponse("Accès non autorisé", 403);
  if (!licenseId) return errorResponse("License ID required", 400);

  await supabase.from("license_addons")
    .update({ is_active: false, deactivated_at: new Date().toISOString() }).eq("license_id", licenseId);

  if (addOns && addOns.length > 0) {
    const now = new Date().toISOString();
    for (const addonId of addOns) {
      await supabase.from("license_addons").upsert({
        license_id: licenseId, addon_id: addonId, addon_name: addonId,
        is_active: true, activated_at: now, deactivated_at: null,
      }, { onConflict: 'license_id,addon_id' });
    }
  }
  await logAdminAction(supabase, auth.email || 'admin', 'update_addons', licenseId, { addOns }, clientIp);
  return jsonResponse({ success: true, message: "Add-ons updated successfully" });
}

async function handleAdminGetAddons(body: any, supabase: any, authHeader: string | null) {
  const { licenseId } = body;
  const auth = await requireAdmin(body, authHeader);
  if (!auth.authorized) return errorResponse("Accès non autorisé", 403);

  const { data: addons } = await supabase.from("license_addons").select("*").eq("license_id", licenseId).eq("is_active", true);
  return jsonResponse({ success: true, addons: addons || [] });
}

async function handleGetAuditLogs(body: any, supabase: any, authHeader: string | null) {
  const { licenseId, limit = 50 } = body;
  const auth = await requireAdmin(body, authHeader);
  if (!auth.authorized) return errorResponse("Accès non autorisé", 403);
  if (!licenseId) return errorResponse("License ID required", 400);

  const { data: logs, error } = await supabase.from("admin_audit_log").select("*")
    .or(`target_id.eq.${licenseId},target_id.ilike.%${licenseId}%`)
    .order("created_at", { ascending: false }).limit(limit);
  if (error) return errorResponse("Failed to fetch audit logs", 500);
  return jsonResponse({ success: true, logs: logs || [] });
}

async function handleSyncCompany(body: any, supabase: any) {
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
