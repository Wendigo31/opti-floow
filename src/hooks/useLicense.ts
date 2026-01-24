import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { LicenseFeatures } from '@/types/features';

export type PlanType = 'start' | 'pro' | 'enterprise';

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
  ],
  pro: [
    // START features included
    'basic_calculator',
    'dashboard_basic',
    'cost_analysis_basic',
    'pdf_export_basic',
    'fleet_basic',
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
  ],
  enterprise: [
    // All PRO features
    'basic_calculator',
    'dashboard_basic',
    'cost_analysis_basic',
    'pdf_export_basic',
    'fleet_basic',
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
  ],
};

const LICENSE_STORAGE_KEY = 'optiflow-license';
const LICENSE_CACHE_KEY = 'optiflow-license-cache';
const DEMO_MODE_KEY = 'optiflow_demo_mode';
const OFFLINE_VALIDITY_DAYS = 30;

// Check if we're online
const checkOnline = (): boolean => {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
};

// Check if demo mode is active
const isDemoModeActive = (): boolean => {
  try {
    const demoState = JSON.parse(localStorage.getItem(DEMO_MODE_KEY) || '{}');
    return demoState.isActive === true;
  } catch {
    return false;
  }
};

// Get demo plan type
const getDemoPlanType = (): PlanType => {
  try {
    const demoState = JSON.parse(localStorage.getItem(DEMO_MODE_KEY) || '{}');
    if (demoState.currentSession) {
      if (demoState.currentSession.includes('start')) return 'start';
      if (demoState.currentSession.includes('pro')) return 'pro';
      if (demoState.currentSession.includes('enterprise')) return 'enterprise';
    }
    return 'start';
  } catch {
    return 'start';
  }
};

export function useLicense(): UseLicenseReturn {
  const [isLicensed, setIsLicensed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [licenseData, setLicenseData] = useState<LicenseData | null>(null);
  const [isOffline, setIsOffline] = useState(!checkOnline());

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
        // Check if demo mode is active first
        if (isDemoModeActive()) {
          const demoPlan = getDemoPlanType();
          const demoLicenseData: LicenseData = {
            code: 'DEMO-MODE',
            email: 'demo@optiflow.app',
            activatedAt: new Date().toISOString(),
            planType: demoPlan,
            firstName: 'Mode',
            lastName: 'Démo',
            companyName: `Démo ${demoPlan.toUpperCase()}`,
          };
          setLicenseData(demoLicenseData);
          setIsLicensed(true);
          setIsLoading(false);
          return;
        }

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
          }
          setIsLoading(false);
          return;
        }

        // Online: verify with server
        if (data) {
          try {
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
                  setIsLoading(false);
                  return;
                }
              }
              setIsLicensed(false);
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
            } else {
              // License deactivated or not found
              localStorage.removeItem(LICENSE_STORAGE_KEY);
              localStorage.removeItem(LICENSE_CACHE_KEY);
              setIsLicensed(false);
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
        
        console.log('[refreshLicense] License refreshed successfully, planType:', updatedData.planType);
        return { success: true };
      } else {
        // License deactivated
        console.log('[refreshLicense] License invalid or deactivated');
        localStorage.removeItem(LICENSE_STORAGE_KEY);
        localStorage.removeItem(LICENSE_CACHE_KEY);
        setIsLicensed(false);
        return { success: false, error: 'Licence désactivée ou invalide' };
      }
    } catch (e) {
      console.error('[refreshLicense] Error refreshing license:', e);
      return { success: false, error: 'Erreur lors de la synchronisation' };
    }
  }, []);

  const planType: PlanType = licenseData?.planType || 'start';

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
