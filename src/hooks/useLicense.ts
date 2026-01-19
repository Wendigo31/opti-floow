import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { LicenseFeatures } from '@/types/features';

export type PlanType = 'start' | 'pro' | 'enterprise';

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
  // Visibility settings
  showUserInfo?: boolean;
  showCompanyInfo?: boolean;
  showAddressInfo?: boolean;
  showLicenseInfo?: boolean;
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
  refreshLicense: () => Promise<void>;
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
  | 'fleet_basic';

// SYNCHRONIZED WITH src/types/pricing.ts PRICING_PLANS.features
// Update both files when changing features!
const PLAN_FEATURES: Record<PlanType, FeatureKey[]> = {
  start: [
    // Core START features - restricted set
    'basic_calculator',
    'dashboard_basic',
    'cost_analysis_basic',
    'pdf_export_basic',
    'fleet_basic', // Gestion basique sans amortissement/entretien/pneus/conso
  ],
  pro: [
    // START features included
    'basic_calculator',
    'dashboard_basic',
    'cost_analysis_basic',
    'pdf_export_basic',
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
  ],
  enterprise: [
    // All PRO features
    'basic_calculator',
    'dashboard_basic',
    'cost_analysis_basic',
    'pdf_export_basic',
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
    // ENTERPRISE exclusive
    'ai_optimization',
    'ai_pdf_analysis',
    'multi_agency',
    'tms_erp_integration',
    'multi_users',
    'unlimited_vehicles',
    'client_analysis',
    'smart_quotes',
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
              const updatedData: LicenseData = {
                ...data,
                planType: checkResponse.licenseData?.planType || 'start',
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
                customFeatures: checkResponse.features || null,
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
        return { success: false, error: 'Erreur de connexion au serveur' };
      }

      if (!response.success) {
        return { success: false, error: response.error || 'Erreur de validation' };
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
      const licenseDataToStore: LicenseData = {
        code: response.licenseData.code || code.trim().toUpperCase(),
        email: response.licenseData.email || email.trim().toLowerCase(),
        activatedAt: response.licenseData.activatedAt,
        planType: response.licenseData.planType || 'start',
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
  const refreshLicense = useCallback(async () => {
    const stored = localStorage.getItem(LICENSE_STORAGE_KEY);
    if (!stored) return;

    try {
      const data: LicenseData = JSON.parse(stored);
      
      const { data: checkResponse, error: checkError } = await supabase.functions.invoke('validate-license', {
        body: { licenseCode: data.code, email: data.email, action: 'check' },
      });

      if (checkError) {
        console.error('License refresh error:', checkError);
        return;
      }

      if (checkResponse?.valid) {
        const updatedData: LicenseData = {
          ...data,
          planType: checkResponse.licenseData?.planType || 'start',
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
          customFeatures: checkResponse.features || null,
          showUserInfo: checkResponse.licenseData?.showUserInfo ?? true,
          showCompanyInfo: checkResponse.licenseData?.showCompanyInfo ?? true,
          showAddressInfo: checkResponse.licenseData?.showAddressInfo ?? true,
          showLicenseInfo: checkResponse.licenseData?.showLicenseInfo ?? true,
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
      } else {
        // License deactivated
        localStorage.removeItem(LICENSE_STORAGE_KEY);
        localStorage.removeItem(LICENSE_CACHE_KEY);
        setIsLicensed(false);
      }
    } catch (e) {
      console.error('Error refreshing license:', e);
    }
  }, []);

  const planType: PlanType = licenseData?.planType || 'start';

  // Check if a feature is enabled (custom features take priority over plan defaults)
  const hasFeature = useCallback((feature: FeatureKey): boolean => {
    // First check custom features from admin
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
  }, [planType, licenseData?.customFeatures]);

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
