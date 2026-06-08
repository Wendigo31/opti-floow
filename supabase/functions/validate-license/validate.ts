import {
  checkRateLimit, getEffectiveFeatures, findLicense,
  LICENSE_SELECT_FIELDS_EXTENDED, jsonResponse, errorResponse,
} from "./shared.ts";

// Handle "validate" action - initial license activation with Supabase Auth
export async function handleValidate(body: any, supabase: any, req: Request, clientIp: string): Promise<Response> {
  const { licenseCode, email } = body;

  if (!licenseCode || !email) {
    return errorResponse("Code de licence et email requis", 400);
  }

  const normalizedEmail = email.trim().toLowerCase();
  const normalizedCode = licenseCode.trim().toUpperCase();

  // Check if this is a demo license (bypass rate limiting)
  const isDemoLicense = normalizedCode.startsWith('DEMO') || normalizedEmail.includes('demo');

  if (!isDemoLicense) {
    const rateCheck = await checkRateLimit(supabase, clientIp, 'license_validate', 5, 15);
    if (!rateCheck.allowed) {
      console.log(`[validate-license] Rate limit exceeded for IP: ${clientIp}`);
      return new Response(
        JSON.stringify({ success: false, error: "Trop de tentatives. Réessayez plus tard." }),
        {
          status: 429,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
            "Content-Type": "application/json",
            "Retry-After": String(rateCheck.retryAfter || 900),
          },
        }
      );
    }
  } else {
    console.log(`[validate-license] Demo license detected, skipping rate limit`);
  }

  console.log("[validate-license] Validating license:", normalizedCode.substring(0, 4) + '...', "for email:", normalizedEmail);

  const { license: licenseByCode, error: codeError } = await findLicense(supabase, normalizedCode, LICENSE_SELECT_FIELDS_EXTENDED);

  if (codeError) {
    console.error("[validate-license] License lookup error:", codeError);
    return errorResponse("Erreur base de données", 500);
  }

  if (!licenseByCode) {
    console.log("[validate-license] License not found");
    return errorResponse("Identifiant société non trouvé", 404);
  }

  // Check if this is the license owner OR a member of the company
  let license = licenseByCode;
  let isMemberLogin = false;

  if (licenseByCode.email !== normalizedEmail) {
    const { data: memberRecord } = await supabase
      .from("company_users")
      .select("id, role, email, is_active")
      .eq("license_id", licenseByCode.id)
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (!memberRecord) {
      return errorResponse("Email non autorisé pour cette licence. Contactez votre administrateur.", 403);
    }
    if (!memberRecord.is_active) {
      return errorResponse("Compte désactivé. Contactez votre administrateur.", 403);
    }
    isMemberLogin = true;
    console.log("[validate-license] Member login detected for:", normalizedEmail, "role:", memberRecord.role);
  }

  if (!license.is_active) {
    return errorResponse("Licence désactivée", 403);
  }

  // --- Simultaneous Login Detection ---
  const { data: existingSession } = await supabase
    .from("company_users")
    .select("id, last_activity_at, user_id")
    .eq("license_id", license.id)
    .eq("email", normalizedEmail)
    .maybeSingle();

  if (existingSession?.last_activity_at) {
    const lastActivityTime = new Date(existingSession.last_activity_at);
    const now = new Date();
    const minutesSinceLastActivity = (now.getTime() - lastActivityTime.getTime()) / (1000 * 60);

    if (minutesSinceLastActivity < 2 && existingSession.user_id) {
      const { data: recentLogins } = await supabase
        .from("login_history")
        .select("ip_address, login_at")
        .eq("license_id", license.id)
        .order("login_at", { ascending: false })
        .limit(5);

      const recentDifferentIP = recentLogins?.find((login: any) => {
        const loginTime = new Date(login.login_at);
        const loginMinutesAgo = (now.getTime() - loginTime.getTime()) / (1000 * 60);
        return loginMinutesAgo < 2 && login.ip_address !== clientIp;
      });

      if (recentDifferentIP) {
        console.log("[validate-license] Simultaneous login detected for:", normalizedEmail);
        return jsonResponse({
          success: false,
          error: "Connexion simultanée détectée. Ce compte est déjà connecté depuis un autre appareil. Veuillez patienter quelques minutes ou déconnectez l'autre session.",
          errorCode: "SIMULTANEOUS_LOGIN",
        }, 409);
      }
    }
  }

  // Fetch custom features
  const { data: features } = await supabase
    .from("license_features")
    .select("*")
    .eq("license_id", license.id)
    .maybeSingle();

  // --- Supabase Auth Integration ---
  let authSession = null;
  let authUserId = null;

  try {
    console.log("[validate-license] Attempting to sign in user:", normalizedEmail);
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: normalizedEmail, password: normalizedCode,
    });

    if (signInError) {
      console.log("[validate-license] Sign-in failed, attempting to create user:", signInError.message);
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: normalizedEmail, password: normalizedCode, email_confirm: true,
        user_metadata: {
          license_id: license.id, first_name: license.first_name,
          last_name: license.last_name, company_name: license.company_name, plan_type: license.plan_type,
        },
      });

      if (createError) {
        if (createError.message.includes('already been registered') || createError.message.includes('already exists')) {
          console.log("[validate-license] User exists, attempting password update");
          const { data: { users } } = await supabase.auth.admin.listUsers();
          const existingUser = users?.find((u: any) => u.email === normalizedEmail);

          if (existingUser) {
            const { error: updateError } = await supabase.auth.admin.updateUserById(existingUser.id, {
              password: normalizedCode,
              user_metadata: {
                license_id: license.id, first_name: license.first_name,
                last_name: license.last_name, company_name: license.company_name, plan_type: license.plan_type,
              },
            });

            if (!updateError) {
              const { data: retrySignIn, error: retryError } = await supabase.auth.signInWithPassword({
                email: normalizedEmail, password: normalizedCode,
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
        const { data: newSignIn, error: newSignInError } = await supabase.auth.signInWithPassword({
          email: normalizedEmail, password: normalizedCode,
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
      await supabase.auth.admin.updateUserById(authUserId, {
        user_metadata: {
          license_id: license.id, first_name: license.first_name,
          last_name: license.last_name, company_name: license.company_name, plan_type: license.plan_type,
        },
      });
    }
  } catch (authError) {
    console.error("[validate-license] Auth error (non-blocking):", authError);
  }

  // Update activation info
  const now = new Date().toISOString();
  await supabase.from("licenses").update({
    activated_at: license.activated_at || now, last_used_at: now,
  }).eq("id", license.id);

  // --- Ensure user is in company_users ---
  if (authUserId) {
    try {
      const { data: existingMemberById } = await supabase
        .from("company_users")
        .select("id, role, email")
        .eq("license_id", license.id)
        .eq("user_id", authUserId)
        .maybeSingle();

      if (!existingMemberById) {
        const { data: existingMemberByEmail } = await supabase
          .from("company_users")
          .select("id, role, user_id")
          .eq("license_id", license.id)
          .eq("email", normalizedEmail)
          .maybeSingle();

        if (existingMemberByEmail) {
          const { data: linked, error: linkError } = await supabase
            .rpc("link_user_to_company", {
              p_company_user_id: existingMemberByEmail.id, p_user_id: authUserId,
            });
          if (linkError) console.error("[validate-license] Failed to link user:", linkError);
          else if (linked) console.log(`[validate-license] Linked user to company_users for ${normalizedEmail}`);
        } else {
          const { data: existingDirection } = await supabase
            .from("company_users").select("id").eq("license_id", license.id).eq("role", "direction").maybeSingle();

          const isLicenseOwnerEmail = license.email === normalizedEmail;
          const role = (!existingDirection && isLicenseOwnerEmail) ? 'direction' : 'exploitation';

          const { error: insertError } = await supabase.from("company_users").insert({
            license_id: license.id, user_id: authUserId, email: normalizedEmail, role,
            display_name: isLicenseOwnerEmail ? ([license.first_name, license.last_name].filter(Boolean).join(' ') || null) : null,
            accepted_at: now, is_active: true,
          });
          if (insertError) console.error("[validate-license] Failed to add user:", insertError);
          else console.log(`[validate-license] User added to company_users as ${role}`);
        }
      } else {
        console.log("[validate-license] User already in company_users with role:", existingMemberById.role);
        await supabase.from("company_users").update({ last_activity_at: now }).eq("id", existingMemberById.id);
      }
    } catch (cuError) {
      console.error("[validate-license] company_users error (non-blocking):", cuError);
    }
  }

  // Log login to history
  const userAgent = req.headers.get('user-agent') || 'unknown';
  const deviceType = userAgent.includes('Mobile') ? 'mobile' : userAgent.includes('Tablet') ? 'tablet' : 'desktop';

  await supabase.from("login_history").insert({
    license_id: license.id, ip_address: clientIp,
    user_agent: userAgent.substring(0, 500), device_type: deviceType, success: true,
  });

  console.log("[validate-license] License validated successfully for:", normalizedEmail, "with auth:", !!authSession);

  // Fetch user-specific feature overrides
  let userFeatureOverrides: { feature_key: string; enabled: boolean }[] = [];
  let userRole: string | null = null;

  if (authSession?.user?.id) {
    try {
      const { data: companyUser } = await supabase
        .from("company_users")
        .select("id, role")
        .eq("license_id", license.id)
        .eq("user_id", authSession.user.id)
        .maybeSingle();

      if (companyUser) {
        userRole = companyUser.role;
        const { data: overrides } = await supabase
          .from("user_feature_overrides")
          .select("feature_key, enabled")
          .eq("company_user_id", companyUser.id);
        userFeatureOverrides = overrides || [];
      }
    } catch (e) {
      console.error("[validate-license] Error fetching user overrides:", e);
    }
  }

  const planType = license.plan_type || 'start';
  const effectiveFeatures = getEffectiveFeatures(planType, features);

  const responsePayload: Record<string, any> = {
    success: true,
    licenseData: {
      code: normalizedCode, email: normalizedEmail,
      firstName: license.first_name, lastName: license.last_name,
      companyName: license.company_name, siren: license.siren,
      companyStatus: license.company_status, employeeCount: license.employee_count,
      address: license.address, city: license.city, postalCode: license.postal_code,
      activatedAt: license.activated_at || now, planType,
      maxDrivers: license.max_drivers, maxClients: license.max_clients,
      maxDailyCharges: license.max_daily_charges, maxMonthlyCharges: license.max_monthly_charges,
      maxYearlyCharges: license.max_yearly_charges,
      showUserInfo: license.show_user_info ?? true, showCompanyInfo: license.show_company_info ?? true,
      showAddressInfo: license.show_address_info ?? true, showLicenseInfo: license.show_license_info ?? true,
      userRole,
    },
    customFeatures: effectiveFeatures,
    userFeatureOverrides: userFeatureOverrides.length > 0 ? userFeatureOverrides : null,
  };

  if (authSession) {
    responsePayload.session = {
      access_token: authSession.access_token, refresh_token: authSession.refresh_token,
      expires_in: authSession.expires_in, expires_at: authSession.expires_at,
      user: { id: authSession.user?.id, email: authSession.user?.email },
    };
  }

  return jsonResponse(responsePayload);
}
