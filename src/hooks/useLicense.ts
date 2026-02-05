import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { LicenseFeatures } from '@/types/features';

// Flag to prevent re-validation loops
let isRevalidating = false;

export type PlanType = 'start' | 'pro' | 'enterprise';

function inferPlanTypeFromCustomFeatures(features?: Partial<LicenseFeatures> | null): PlanType | null {
  if (!features) return null;

  // ENTERPRISE signals
  const enterpriseSignals: (keyof LicenseFeatures)[] = [
    'ai_optimization',
    'ai_pdf_analysis',
    'multi_agency',
    'tms_erp_integration',
    'multi_users',
    'unlimited_vehicles',
    'client_analysis',
    'smart_quotes',
  ];
  if (enterpriseSignals.some((k) => features[k] === true)) return 'enterprise';

  // PRO signals
  const proSignals: (keyof LicenseFeatures)[] = [
    'itinerary_planning',
    'saved_tours',
    'trip_history',
    'forecast',
    'dashboard_analytics',
    'excel_export',
    'pdf_export_pro',
    'auto_pricing_basic',
    'monthly_tracking',
    'client_analysis_basic',
  ];
  if (proSignals.some((k) => features[k] === true)) return 'pro';

  return null;
}

// User-specific feature override
interface UserFeatureOverride {
  feature_key: string;
  enabled: boolean;
}

interface LicenseData {
  code: string;
  email: string;
  activatedAt: string;
  planType: PlanType;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  siren?: string;
  companyStatus?: string;
  employeeCount?: number;
  address?: string;
  city?: string;
  postalCode?: string;
  // Admin-defined limits
  maxDrivers?: number | null;
  maxClients?: number | null;
  maxDailyCharges?: number | null;
  maxMonthlyCharges?: number | null;
  maxYearlyCharges?: number | null;
  // Custom features from admin
  customFeatures?: Partial<LicenseFeatures> | null;
  // User-specific feature overrides
  userFeatureOverrides?: UserFeatureOverride[] | null;
  // Visibility settings
  showUserInfo?: boolean;
  showCompanyInfo?: boolean;
  showAddressInfo?: boolean;
  showLicenseInfo?: boolean;
  // Company user info
  companyUserId?: string | null;
  // User role in the company
  userRole?: string | null;
}
// Cached license with offline support
interface CachedLicense {
  data: LicenseData;
  lastValidated: string;
  expiresAt: string; // Allow offline usage for 30 days
}

interface UseLicenseReturn {
  isLicensed: boolean;
  isLoading: boolean;
  licenseData: LicenseData | null;
  planType: PlanType;
  validateLicense: (code: string, email: string) => Promise<{ success: boolean; error?: string }>;
  clearLicense: () => void;
  refreshLicense: () => Promise<{ success: boolean; error?: string }>;
  hasFeature: (feature: FeatureKey) => boolean;
  getFeatureValue: <K extends keyof LicenseFeatures>(key: K) => LicenseFeatures[K] | undefined;
  isOffline: boolean;
}

// Define which features are available for each plan
// Synchronized with src/types/pricing.ts PRICING_PLANS
export type FeatureKey = 
  | 'basic_calculator'
  | 'itinerary_planning'
  | 'dashboard_basic'
  | 'dashboard_analytics'
  | 'forecast'
  | 'trip_history'
  | 'multi_drivers'
  | 'cost_analysis'
  | 'cost_analysis_basic'
  | 'margin_alerts'
  | 'dynamic_charts'
  | 'pdf_export_basic'
  | 'pdf_export_pro'
  | 'excel_export'
  | 'monthly_tracking'
  | 'auto_pricing'
  | 'auto_pricing_basic'
  | 'saved_tours'
  | 'ai_optimization'
  | 'ai_pdf_analysis'
  | 'multi_agency'
  | 'tms_erp_integration'
  | 'multi_users'
  | 'unlimited_vehicles'
  | 'client_analysis'
  | 'client_analysis_basic'
  | 'smart_quotes'
  | 'fleet_management'
  | 'fleet_basic'
  // Company/User management features
  | 'company_invite_members'
  | 'company_remove_members'
  | 'company_change_roles'
  | 'company_view_activity'
  | 'company_manage_settings'
  | 'company_data_sharing'
  | 'realtime_notifications'
  // Navigation/Pages features
  | 'page_dashboard'
  | 'page_calculator'
  | 'page_itinerary'
  | 'page_tours'
  | 'page_clients'
  | 'page_vehicles'
  | 'page_drivers'
  | 'page_charges'
  | 'page_forecast'
  | 'page_trip_history'
  | 'page_ai_analysis'
  | 'page_toxic_clients'
  | 'page_vehicle_reports'
  | 'page_team'
  | 'page_settings'
  // UI Component features - Buttons
  | 'btn_export_pdf'
  | 'btn_export_excel'
  | 'btn_save_tour'
  | 'btn_load_tour'
  | 'btn_ai_optimize'
  | 'btn_map_preview'
  | 'btn_contact_support'
  // UI Component features - Add/Create buttons
  | 'btn_add_client'
  | 'btn_add_vehicle'
  | 'btn_add_driver'
  | 'btn_add_charge'
  | 'btn_add_trailer'
  | 'btn_add_trip'
  | 'btn_add_quote'
  // UI Component features - Edit/Delete buttons
  | 'btn_edit_client'
  | 'btn_delete_client'
  | 'btn_edit_vehicle'
  | 'btn_delete_vehicle'
  | 'btn_edit_driver'
  | 'btn_delete_driver'
  | 'btn_edit_charge'
  | 'btn_delete_charge'
  // UI Component features - Sections
  | 'section_cost_breakdown'
  | 'section_margin_alerts'
  | 'section_charts'
  | 'section_client_stats'
  | 'section_vehicle_stats'
  | 'section_driver_stats';

// SYNCHRONIZED WITH src/types/pricing.ts PRICING_PLANS.features
// Update both files when changing features!
const PLAN_FEATURES: Record<PlanType, FeatureKey[]> = {
  start: [
    // Core START features - restricted set
    'basic_calculator',
    'dashboard_basic',
    'cost_analysis_basic',
    'pdf_export_basic',
    'fleet_basic',
    // Navigation/Pages - START
    'page_dashboard',
    'page_calculator',
    'page_clients',
    'page_vehicles',
    'page_drivers',
    'page_charges',
    'page_settings',
    // UI Components - START
    'btn_map_preview',
    'btn_contact_support',
    'section_cost_breakdown',
    // UI Components - CRUD buttons (START)
    'btn_add_client',
    'btn_add_vehicle',
    'btn_add_driver',
    'btn_add_charge',
    'btn_add_trailer',
    'btn_edit_client',
    'btn_delete_client',
    'btn_edit_vehicle',
    'btn_delete_vehicle',
    'btn_edit_driver',
    'btn_delete_driver',
    'btn_edit_charge',
    'btn_delete_charge',
    // UI Components - Stats sections (START)
    'section_client_stats',
    'section_vehicle_stats',
    'section_driver_stats',
  ],
  pro: [
    // START features included
    'basic_calculator',
    'dashboard_basic',
    'cost_analysis_basic',
    'pdf_export_basic',
    'fleet_basic',
    // UI Components - CRUD buttons (START)
    'btn_add_client',
    'btn_add_vehicle',
    'btn_add_driver',
    'btn_add_charge',
    'btn_add_trailer',
    'btn_edit_client',
    'btn_delete_client',
    'btn_edit_vehicle',
    'btn_delete_vehicle',
    'btn_edit_driver',
    'btn_delete_driver',
    'btn_edit_charge',
    'btn_delete_charge',
    // UI Components - Stats sections (START)
    'section_client_stats',
    'section_vehicle_stats',
    'section_driver_stats',
    // PRO features unlocked
    'itinerary_planning',
    'saved_tours',
    'trip_history',
    'auto_pricing_basic',
    'fleet_management',
    'dashboard_analytics',
    'forecast',
    'multi_drivers',
    'cost_analysis',
    'margin_alerts',
    'dynamic_charts',
    'pdf_export_pro',
    'excel_export',
    'monthly_tracking',
    'auto_pricing',
    'client_analysis_basic',
    // Company management features - PRO
    'company_invite_members',
    'company_remove_members',
    'company_change_roles',
    'company_view_activity',
    'company_manage_settings',
    'company_data_sharing',
    'realtime_notifications',
    // Navigation/Pages - PRO
    'page_dashboard',
    'page_calculator',
    'page_itinerary',
    'page_tours',
    'page_clients',
    'page_vehicles',
    'page_drivers',
    'page_charges',
    'page_forecast',
    'page_trip_history',
    'page_vehicle_reports',
    'page_team',
    'page_settings',
    // UI Components - PRO
    'btn_export_pdf',
    'btn_export_excel',
    'btn_save_tour',
    'btn_load_tour',
    'btn_map_preview',
    'btn_contact_support',
    'section_cost_breakdown',
    'section_margin_alerts',
    'section_charts',
    // UI Components - Add/Create buttons (PRO)
    'btn_add_trip',
    'btn_add_quote',
  ],
  enterprise: [
    // All PRO features
    'basic_calculator',
    'dashboard_basic',
    'cost_analysis_basic',
    'pdf_export_basic',
    'fleet_basic',
    // UI Components - CRUD buttons (START)
    'btn_add_client',
    'btn_add_vehicle',
    'btn_add_driver',
    'btn_add_charge',
    'btn_add_trailer',
    'btn_edit_client',
    'btn_delete_client',
    'btn_edit_vehicle',
    'btn_delete_vehicle',
    'btn_edit_driver',
    'btn_delete_driver',
    'btn_edit_charge',
    'btn_delete_charge',
    // UI Components - Stats sections (START)
    'section_client_stats',
    'section_vehicle_stats',
    'section_driver_stats',
    'itinerary_planning',
    'saved_tours',
    'trip_history',
    'auto_pricing_basic',
    'fleet_management',
    'dashboard_analytics',
    'forecast',
    'multi_drivers',
    'cost_analysis',
    'margin_alerts',
    'dynamic_charts',
    'pdf_export_pro',
    'excel_export',
    'monthly_tracking',
    'auto_pricing',
    'client_analysis_basic',
    // Company management features
    'company_invite_members',
    'company_remove_members',
    'company_change_roles',
    'company_view_activity',
    'company_manage_settings',
    'company_data_sharing',
    'realtime_notifications',
    // ENTERPRISE exclusive
    'ai_optimization',
    'ai_pdf_analysis',
    'multi_agency',
    'tms_erp_integration',
    'multi_users',
    'unlimited_vehicles',
    'client_analysis',
    'smart_quotes',
    // Navigation/Pages - ENTERPRISE (all)
    'page_dashboard',
    'page_calculator',
    'page_itinerary',
    'page_tours',
    'page_clients',
    'page_vehicles',
    'page_drivers',
    'page_charges',
    'page_forecast',
    'page_trip_history',
    'page_ai_analysis',
    'page_toxic_clients',
    'page_vehicle_reports',
    'page_team',
    'page_settings',
    // UI Components - ENTERPRISE (all)
    'btn_export_pdf',
    'btn_export_excel',
    'btn_save_tour',
    'btn_load_tour',
    'btn_ai_optimize',
    'btn_map_preview',
    'btn_contact_support',
    'section_cost_breakdown',
    'section_margin_alerts',
    'section_charts',
    // UI Components - Add/Create buttons (PRO)
    'btn_add_trip',
    'btn_add_quote',
  ],
};

const LICENSE_STORAGE_KEY = 'optiflow-license';
const LICENSE_CACHE_KEY = 'optiflow-license-cache';
const OFFLINE_VALIDITY_DAYS = 30;
const CHECK_THROTTLE_MS = 2 * 60 * 1000; // Skip server check if validated < 2 minutes ago

// Custom event to keep multiple useLicense() instances in sync (same tab)
const LICENSE_EVENT = 'optiflow:license-updated';

declare global {
  interface WindowEventMap {
    'optiflow:license-updated': CustomEvent<LicenseData | null>;
  }
}

// Check if we're online
const checkOnline = (): boolean => {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
};

const safeReadStoredLicense = (): LicenseData | null => {
  try {
    if (typeof window === 'undefined') return null;
    const stored = localStorage.getItem(LICENSE_STORAGE_KEY);
    return stored ? (JSON.parse(stored) as LicenseData) : null;
  } catch {
    return null;
  }
};

const broadcastLicenseUpdate = (data: LicenseData | null) => {
  try {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent<LicenseData | null>(LICENSE_EVENT, { detail: data }));
  } catch {
    // noop
  }
};

export function useLicense(): UseLicenseReturn {
  // Initialize from localStorage to avoid "Start" flicker and ensure consistency on first render
  const [licenseData, setLicenseData] = useState<LicenseData | null>(() => safeReadStoredLicense());
  const [isLicensed, setIsLicensed] = useState(() => !!safeReadStoredLicense());
  const [isLoading, setIsLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(!checkOnline());

  // Keep all hook instances in sync (same tab)
  useEffect(() => {
    const handler = (evt: CustomEvent<LicenseData | null>) => {
      setLicenseData(evt.detail);
      setIsLicensed(!!evt.detail);
    };

    window.addEventListener(LICENSE_EVENT, handler);
    return () => window.removeEventListener(LICENSE_EVENT, handler);
  }, []);

  // Note: We no longer use a storage event listener here to avoid sync loops.
  // Cross-tab sync is now handled via Supabase Realtime on company_config table.

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Check stored license on mount with offline support
  useEffect(() => {
    const checkStoredLicense = async () => {
      try {
        const stored = localStorage.getItem(LICENSE_STORAGE_KEY);
        const cached = localStorage.getItem(LICENSE_CACHE_KEY);
        
        if (!stored && !cached) {
          setIsLoading(false);
          return;
        }

        const data: LicenseData | null = stored ? JSON.parse(stored) : null;
        const cachedLicense: CachedLicense | null = cached ? JSON.parse(cached) : null;

        // If offline, use cached license if valid
        if (!checkOnline()) {
          console.log('Offline mode detected, checking cached license...');
          if (cachedLicense) {
            const expiresAt = new Date(cachedLicense.expiresAt);
            if (expiresAt > new Date()) {
              console.log('Using cached license (offline mode)');
              setLicenseData(cachedLicense.data);
              setIsLicensed(true);
              broadcastLicenseUpdate(cachedLicense.data);
              setIsLoading(false);
              return;
            } else {
              console.log('Cached license expired');
            }
          }
          // No valid cache, but offline - keep whatever we have
          if (data) {
            setLicenseData(data);
            setIsLicensed(true);
            broadcastLicenseUpdate(data);
          }
          setIsLoading(false);
          return;
        }

        // Online: verify with server
        if (data) {
          try {
            // Ensure the authenticated user (if any) matches the stored license email.
            // This fixes cases where an admin "connexion en tant que" only updates localStorage
            // but the in-memory/auth session still points to a previous user.
            const { data: authData, error: authUserError } = await supabase.auth.getUser();
            if (authUserError) {
              console.warn('[useLicense] Unable to read current auth user:', authUserError);
            }

            const authEmail = authData?.user?.email?.toLowerCase() ?? null;
            const storedEmail = data.email?.toLowerCase() ?? null;

            // If there is no auth user or it doesn't match, we must re-validate to obtain the right session.
            // BUT skip if we're already in a re-validation cycle to prevent infinite loops
            if ((!authEmail || !storedEmail || authEmail !== storedEmail) && !isRevalidating) {
              console.log('[useLicense] Auth user missing/mismatch, re-validating to set correct session', {
                authEmail,
                storedEmail,
              });

              // Set the flag to prevent re-entry
              isRevalidating = true;

              // Make sure we start from a clean auth state
              try {
                await supabase.auth.signOut();
              } catch (e) {
                console.warn('[useLicense] signOut before re-validation failed (continuing):', e);
              }

              try {
                const { data: validateResponse, error: validateError } = await supabase.functions.invoke('validate-license', {
                  body: { licenseCode: data.code, email: data.email, action: 'validate' },
                });

                if (validateError) {
                  console.error('[useLicense] Re-validation error:', validateError);
                  // We can't safely continue with a mismatched user; force a fresh login.
                  localStorage.removeItem(LICENSE_STORAGE_KEY);
                  localStorage.removeItem(LICENSE_CACHE_KEY);
                  setIsLicensed(false);
                  setIsLoading(false);
                  isRevalidating = false;
                  return;
                }

                if (!validateResponse?.success) {
                  console.error('[useLicense] Re-validation failed:', validateResponse?.error);
                  localStorage.removeItem(LICENSE_STORAGE_KEY);
                  localStorage.removeItem(LICENSE_CACHE_KEY);
                  setIsLicensed(false);
                  setIsLoading(false);
                  isRevalidating = false;
                  return;
                }

                // If we received an auth session, set it in the client
                if (validateResponse.session) {
                  console.log('[useLicense] Setting Supabase auth session');
                  const { error: sessionError } = await supabase.auth.setSession({
                    access_token: validateResponse.session.access_token,
                    refresh_token: validateResponse.session.refresh_token,
                  });
                  if (sessionError) {
                    console.error('[useLicense] Failed to set auth session after re-validation:', sessionError);
                  } else {
                    console.log('[useLicense] Auth session set successfully');
                  }
                }

                // Persist the fresh license payload (same logic as validateLicense())
                const licenseDataToStore: LicenseData = {
                  code: validateResponse.licenseData.code || data.code,
                  email: validateResponse.licenseData.email || data.email,
                  activatedAt: validateResponse.licenseData.activatedAt,
                  planType: validateResponse.licenseData.planType,
                  firstName: validateResponse.licenseData.firstName || undefined,
                  lastName: validateResponse.licenseData.lastName || undefined,
                  companyName: validateResponse.licenseData.companyName || undefined,
                  siren: validateResponse.licenseData.siren || undefined,
                  companyStatus: validateResponse.licenseData.companyStatus || undefined,
                  employeeCount: validateResponse.licenseData.employeeCount || undefined,
                  address: validateResponse.licenseData.address || undefined,
                  city: validateResponse.licenseData.city || undefined,
                  postalCode: validateResponse.licenseData.postalCode || undefined,
                  maxDrivers: validateResponse.licenseData.maxDrivers ?? null,
                  maxClients: validateResponse.licenseData.maxClients ?? null,
                  maxDailyCharges: validateResponse.licenseData.maxDailyCharges ?? null,
                  maxMonthlyCharges: validateResponse.licenseData.maxMonthlyCharges ?? null,
                  maxYearlyCharges: validateResponse.licenseData.maxYearlyCharges ?? null,
                  customFeatures: validateResponse.customFeatures || null,
                  userFeatureOverrides: validateResponse.userFeatureOverrides || null,
                  showUserInfo: validateResponse.licenseData.showUserInfo ?? true,
                  showCompanyInfo: validateResponse.licenseData.showCompanyInfo ?? true,
                  showAddressInfo: validateResponse.licenseData.showAddressInfo ?? true,
                  showLicenseInfo: validateResponse.licenseData.showLicenseInfo ?? true,
                  companyUserId: validateResponse.companyUserId || null,
                  userRole: validateResponse.userRole || null,
                };

                localStorage.setItem(LICENSE_STORAGE_KEY, JSON.stringify(licenseDataToStore));

                const now = new Date();
                const expiresAt = new Date(now.getTime() + OFFLINE_VALIDITY_DAYS * 24 * 60 * 60 * 1000);
                const newCache: CachedLicense = {
                  data: licenseDataToStore,
                  lastValidated: now.toISOString(),
                  expiresAt: expiresAt.toISOString(),
                };
                localStorage.setItem(LICENSE_CACHE_KEY, JSON.stringify(newCache));

                setLicenseData(licenseDataToStore);
                setIsLicensed(true);
                broadcastLicenseUpdate(licenseDataToStore);
                setIsLoading(false);
                
                // Clear the flag after a delay to allow auth state to propagate
                setTimeout(() => {
                  isRevalidating = false;
                }, 2000);
                
                return;
              } catch (err) {
                console.error('[useLicense] Re-validation exception:', err);
                isRevalidating = false;
                setIsLoading(false);
                return;
              }
            } else if (isRevalidating) {
              // Skip re-validation, just use stored data
              console.log('[useLicense] Skipping re-validation (already in progress)');
              setLicenseData(data);
              setIsLicensed(true);
              broadcastLicenseUpdate(data);
            }

            // Only proceed with check if not in re-validation
            if (!isRevalidating) {
              // Skip server check if we validated recently (< 2 minutes ago) — rely on cache
              if (cachedLicense) {
                const lastValidatedDate = new Date(cachedLicense.lastValidated);
                if (Date.now() - lastValidatedDate.getTime() < CHECK_THROTTLE_MS) {
                  console.log('[useLicense] Using cached license (validated recently)');
                  setLicenseData(cachedLicense.data);
                  setIsLicensed(true);
                  broadcastLicenseUpdate(cachedLicense.data);
                  setIsLoading(false);
                  return;
                }
              }

              const { data: checkResponse, error: checkError } = await supabase.functions.invoke('validate-license', {
                body: { licenseCode: data.code, email: data.email, action: 'check' },
              });

              if (checkError) {
                console.error('License check error:', checkError);
                // Network error - fall back to cache
                if (cachedLicense) {
                  const expiresAt = new Date(cachedLicense.expiresAt);
                  if (expiresAt > new Date()) {
                    console.log('Server error, using cached license');
                    setLicenseData(cachedLicense.data);
                    setIsLicensed(true);
                    broadcastLicenseUpdate(cachedLicense.data);
                  }
                }
                // Keep the stored license as the source of truth if the server is temporarily unreachable
                setLicenseData(data);
                setIsLicensed(true);
                broadcastLicenseUpdate(data);
              } else if (checkResponse?.valid) {
                // Update license data with fresh info from edge function
                // IMPORTANT: Keep existing planType if server doesn't return one
                const updatedData: LicenseData = {
                  ...data,
                  planType: checkResponse.licenseData?.planType || data.planType || 'start',
                  firstName: checkResponse.licenseData?.firstName || undefined,
                  lastName: checkResponse.licenseData?.lastName || undefined,
                  companyName: checkResponse.licenseData?.companyName || undefined,
                  siren: checkResponse.licenseData?.siren || undefined,
                  companyStatus: checkResponse.licenseData?.companyStatus || undefined,
                  employeeCount: checkResponse.licenseData?.employeeCount || undefined,
                  address: checkResponse.licenseData?.address || undefined,
                  city: checkResponse.licenseData?.city || undefined,
                  postalCode: checkResponse.licenseData?.postalCode || undefined,
                  // Admin-defined limits
                  maxDrivers: checkResponse.licenseData?.maxDrivers ?? null,
                  maxClients: checkResponse.licenseData?.maxClients ?? null,
                  maxDailyCharges: checkResponse.licenseData?.maxDailyCharges ?? null,
                  maxMonthlyCharges: checkResponse.licenseData?.maxMonthlyCharges ?? null,
                  maxYearlyCharges: checkResponse.licenseData?.maxYearlyCharges ?? null,
                  // Custom features from admin
                  customFeatures: checkResponse.customFeatures || null,
                  // User-specific feature overrides
                  userFeatureOverrides: checkResponse.userFeatureOverrides || null,
                  // Visibility settings
                  showUserInfo: checkResponse.licenseData?.showUserInfo ?? true,
                  showCompanyInfo: checkResponse.licenseData?.showCompanyInfo ?? true,
                  showAddressInfo: checkResponse.licenseData?.showAddressInfo ?? true,
                  showLicenseInfo: checkResponse.licenseData?.showLicenseInfo ?? true,
                };
                
                // Update storage and cache
                localStorage.setItem(LICENSE_STORAGE_KEY, JSON.stringify(updatedData));
                
                // Update cache with new expiry
                const now = new Date();
                const expiresAt = new Date(now.getTime() + OFFLINE_VALIDITY_DAYS * 24 * 60 * 60 * 1000);
                const newCache: CachedLicense = {
                  data: updatedData,
                  lastValidated: now.toISOString(),
                  expiresAt: expiresAt.toISOString(),
                };
                localStorage.setItem(LICENSE_CACHE_KEY, JSON.stringify(newCache));
                
                setLicenseData(updatedData);
                setIsLicensed(true);
                broadcastLicenseUpdate(updatedData);
              } else {
                // License deactivated or not found
                localStorage.removeItem(LICENSE_STORAGE_KEY);
                localStorage.removeItem(LICENSE_CACHE_KEY);
                setIsLicensed(false);
                setLicenseData(null);
                broadcastLicenseUpdate(null);
              }
            } else {
              // isRevalidating path - we already set state above, nothing more to do
              setLicenseData(data);
              setIsLicensed(true);
              broadcastLicenseUpdate(data);
            }
          } catch (networkError) {
            console.error('Network error during license check:', networkError);
            // Fall back to cache on network error
            if (cachedLicense) {
              const expiresAt = new Date(cachedLicense.expiresAt);
              if (expiresAt > new Date()) {
                console.log('Network error, using cached license');
                setLicenseData(cachedLicense.data);
                setIsLicensed(true);
                broadcastLicenseUpdate(cachedLicense.data);
              }
            }
          }
        }
      } catch (e) {
        console.error('Error checking license:', e);
      } finally {
        setIsLoading(false);
      }
    };

    checkStoredLicense();
  }, []);

  const validateLicense = useCallback(async (code: string, email: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { data: response, error } = await supabase.functions.invoke('validate-license', {
        body: { licenseCode: code, email, action: 'validate' },
      });

      if (error) {
        console.error('License validation error:', error);
        // Try to extract error message from the response body
        // The edge function returns JSON with error field even on non-2xx responses
        try {
          const errorBody = error.context ? await error.context.json() : null;
          if (errorBody?.error) {
            return { success: false, error: errorBody.error };
          }
        } catch {
          // Ignore parsing errors
        }
        return { success: false, error: 'Erreur de connexion au serveur' };
      }

      if (!response?.success) {
        return { success: false, error: response?.error || 'Erreur de validation' };
      }

      // If we received an auth session, set it in Supabase client
      if (response.session) {
        console.log('[useLicense] Setting Supabase auth session');
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: response.session.access_token,
          refresh_token: response.session.refresh_token,
        });

        if (sessionError) {
          console.error('[useLicense] Failed to set auth session:', sessionError);
          // Continue anyway - license validation succeeded
        } else {
          console.log('[useLicense] Auth session set successfully');
        }
      }

      // Store in localStorage
      // Server MUST return planType - no fallback to 'start' here to avoid overwriting
      const licenseDataToStore: LicenseData = {
        code: response.licenseData.code || code.trim().toUpperCase(),
        email: response.licenseData.email || email.trim().toLowerCase(),
        activatedAt: response.licenseData.activatedAt,
        planType: response.licenseData.planType,
        firstName: response.licenseData.firstName || undefined,
        lastName: response.licenseData.lastName || undefined,
        companyName: response.licenseData.companyName || undefined,
        siren: response.licenseData.siren || undefined,
        companyStatus: response.licenseData.companyStatus || undefined,
        employeeCount: response.licenseData.employeeCount || undefined,
        address: response.licenseData.address || undefined,
        city: response.licenseData.city || undefined,
        postalCode: response.licenseData.postalCode || undefined,
        // Admin-defined limits
        maxDrivers: response.licenseData.maxDrivers ?? null,
        maxClients: response.licenseData.maxClients ?? null,
        maxDailyCharges: response.licenseData.maxDailyCharges ?? null,
        maxMonthlyCharges: response.licenseData.maxMonthlyCharges ?? null,
        maxYearlyCharges: response.licenseData.maxYearlyCharges ?? null,
        // Custom features from admin
        customFeatures: response.customFeatures || null,
        // User-specific feature overrides
        userFeatureOverrides: response.userFeatureOverrides || null,
        // Visibility settings
        showUserInfo: response.licenseData.showUserInfo ?? true,
        showCompanyInfo: response.licenseData.showCompanyInfo ?? true,
        showAddressInfo: response.licenseData.showAddressInfo ?? true,
        showLicenseInfo: response.licenseData.showLicenseInfo ?? true,
      };
      
      localStorage.setItem(LICENSE_STORAGE_KEY, JSON.stringify(licenseDataToStore));

      // Cache for offline support
      const now = new Date();
      const expiresAt = new Date(now.getTime() + OFFLINE_VALIDITY_DAYS * 24 * 60 * 60 * 1000);
      const newCache: CachedLicense = {
        data: licenseDataToStore,
        lastValidated: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
      };
      localStorage.setItem(LICENSE_CACHE_KEY, JSON.stringify(newCache));

      setLicenseData(licenseDataToStore);
      setIsLicensed(true);
      broadcastLicenseUpdate(licenseDataToStore);

      return { success: true };
    } catch (e) {
      console.error('License validation error:', e);
      return { success: false, error: 'Erreur lors de la validation' };
    }
  }, []);

  const clearLicense = useCallback(async () => {
    localStorage.removeItem(LICENSE_STORAGE_KEY);
    localStorage.removeItem(LICENSE_CACHE_KEY);
    
    // Also sign out from Supabase Auth
    try {
      await supabase.auth.signOut();
      console.log('[useLicense] Signed out from Supabase Auth');
    } catch (e) {
      console.error('[useLicense] Error signing out:', e);
    }
    
    setLicenseData(null);
    setIsLicensed(false);
    broadcastLicenseUpdate(null);
  }, []);

  // Force refresh license data from server
  const refreshLicense = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    const stored = localStorage.getItem(LICENSE_STORAGE_KEY);
    if (!stored) {
      return { success: false, error: 'Aucune licence stockée' };
    }

    try {
      const data: LicenseData = JSON.parse(stored);
      
      console.log('[refreshLicense] Calling validate-license with:', { code: data.code, email: data.email });
      
      const { data: checkResponse, error: checkError } = await supabase.functions.invoke('validate-license', {
        body: { licenseCode: data.code, email: data.email, action: 'check' },
      });

      if (checkError) {
        console.error('[refreshLicense] License refresh error:', checkError);
        return { success: false, error: checkError.message || 'Erreur de connexion au serveur' };
      }

      console.log('[refreshLicense] Response:', checkResponse);

      if (checkResponse?.valid) {
        // IMPORTANT: Keep existing planType if server doesn't return one
        const updatedData: LicenseData = {
          ...data,
          planType: checkResponse.licenseData?.planType || data.planType || 'start',
          firstName: checkResponse.licenseData?.firstName || undefined,
          lastName: checkResponse.licenseData?.lastName || undefined,
          companyName: checkResponse.licenseData?.companyName || undefined,
          siren: checkResponse.licenseData?.siren || undefined,
          companyStatus: checkResponse.licenseData?.companyStatus || undefined,
          employeeCount: checkResponse.licenseData?.employeeCount || undefined,
          address: checkResponse.licenseData?.address || undefined,
          city: checkResponse.licenseData?.city || undefined,
          postalCode: checkResponse.licenseData?.postalCode || undefined,
          maxDrivers: checkResponse.licenseData?.maxDrivers ?? null,
          maxClients: checkResponse.licenseData?.maxClients ?? null,
          maxDailyCharges: checkResponse.licenseData?.maxDailyCharges ?? null,
          maxMonthlyCharges: checkResponse.licenseData?.maxMonthlyCharges ?? null,
          maxYearlyCharges: checkResponse.licenseData?.maxYearlyCharges ?? null,
          customFeatures: checkResponse.customFeatures || null,
          userFeatureOverrides: checkResponse.userFeatureOverrides || null,
          showUserInfo: checkResponse.licenseData?.showUserInfo ?? true,
          showCompanyInfo: checkResponse.licenseData?.showCompanyInfo ?? true,
          showAddressInfo: checkResponse.licenseData?.showAddressInfo ?? true,
          showLicenseInfo: checkResponse.licenseData?.showLicenseInfo ?? true,
          companyUserId: checkResponse.companyUserId || null,
        };
        
        localStorage.setItem(LICENSE_STORAGE_KEY, JSON.stringify(updatedData));
        
        const now = new Date();
        const expiresAt = new Date(now.getTime() + OFFLINE_VALIDITY_DAYS * 24 * 60 * 60 * 1000);
        const newCache: CachedLicense = {
          data: updatedData,
          lastValidated: now.toISOString(),
          expiresAt: expiresAt.toISOString(),
        };
        localStorage.setItem(LICENSE_CACHE_KEY, JSON.stringify(newCache));
        
        setLicenseData(updatedData);
        setIsLicensed(true);
        broadcastLicenseUpdate(updatedData);
        
        console.log('[refreshLicense] License refreshed successfully, planType:', updatedData.planType);
        return { success: true };
      } else {
        // License deactivated
        console.log('[refreshLicense] License invalid or deactivated');
        localStorage.removeItem(LICENSE_STORAGE_KEY);
        localStorage.removeItem(LICENSE_CACHE_KEY);
        setIsLicensed(false);
        setLicenseData(null);
        broadcastLicenseUpdate(null);
        return { success: false, error: 'Licence désactivée ou invalide' };
      }
    } catch (e) {
      console.error('[refreshLicense] Error refreshing license:', e);
      return { success: false, error: 'Erreur lors de la synchronisation' };
    }
  }, []);

  const planType: PlanType =
    licenseData?.planType || inferPlanTypeFromCustomFeatures(licenseData?.customFeatures) || 'start';

  // Check if a feature is enabled (user overrides > custom features > plan defaults)
  const hasFeature = useCallback((feature: FeatureKey): boolean => {
    // First check user-specific overrides (highest priority)
    const userOverrides = licenseData?.userFeatureOverrides;
    if (userOverrides) {
      const override = userOverrides.find(o => o.feature_key === feature);
      if (override !== undefined) {
        return override.enabled;
      }
    }
    
    // Then check custom features from admin (company-level)
    const customFeatures = licenseData?.customFeatures;
    if (customFeatures) {
      // Map FeatureKey to LicenseFeatures key
      const featureKey = feature as keyof LicenseFeatures;
      if (featureKey in customFeatures && typeof customFeatures[featureKey] === 'boolean') {
        return customFeatures[featureKey] as boolean;
      }
    }
    // Fall back to plan defaults
    return PLAN_FEATURES[planType].includes(feature);
  }, [planType, licenseData?.customFeatures, licenseData?.userFeatureOverrides]);

  // Get a specific feature value (for limits and other non-boolean values)
  const getFeatureValue = useCallback(<K extends keyof LicenseFeatures>(key: K): LicenseFeatures[K] | undefined => {
    const customFeatures = licenseData?.customFeatures;
    if (customFeatures && key in customFeatures) {
      return customFeatures[key] as LicenseFeatures[K];
    }
    return undefined;
  }, [licenseData?.customFeatures]);

  return {
    isLicensed,
    isLoading,
    licenseData,
    planType,
    validateLicense,
    clearLicense,
    refreshLicense,
    hasFeature,
    getFeatureValue,
    isOffline,
  };
}
