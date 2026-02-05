import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLicenseContext } from '@/context/LicenseContext';

/**
 * Feature override types for granular permissions
 * These match the PERMISSION_FEATURES in UserPermissionsManager.tsx
 */
export type FeatureKey = 
  // Page access
  | 'page_calculator'
  | 'page_itinerary'
  | 'page_tours'
  | 'page_dashboard'
  | 'page_forecast'
  | 'page_vehicles'
  | 'page_drivers'
  | 'page_charges'
  | 'page_clients'
  // Financial visibility
  | 'view_costs'
  | 'view_margins'
  | 'view_profits'
  | 'view_pricing'
  // CRUD actions
  | 'crud_vehicles'
  | 'crud_drivers'
  | 'crud_clients'
  | 'crud_tours';

interface UserFeatureOverride {
  id: string;
  company_user_id: string;
  feature_key: string;
  enabled: boolean;
}

interface UseUserFeatureOverridesReturn {
  isLoading: boolean;
  overrides: Map<FeatureKey, boolean>;
  canAccess: (feature: FeatureKey) => boolean;
  canAccessPage: (pageName: string) => boolean;
  canViewFinancial: (type: 'costs' | 'margins' | 'profits' | 'pricing') => boolean;
  canCrud: (entity: 'vehicles' | 'drivers' | 'clients' | 'tours') => boolean;
  refreshOverrides: () => Promise<void>;
}

/**
 * Hook to check user-specific feature overrides
 * Direction users always have full access
 * Other users may have specific features disabled by Direction
 */
export function useUserFeatureOverrides(): UseUserFeatureOverridesReturn {
  const { userRole, authUserId, licenseId } = useLicenseContext();
  const [overrides, setOverrides] = useState<Map<FeatureKey, boolean>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [companyUserId, setCompanyUserId] = useState<string | null>(null);

  const isDirection = userRole === 'direction';

  // Fetch company_user_id for current user
  useEffect(() => {
    const fetchCompanyUserId = async () => {
      if (!authUserId || !licenseId) return;
      
      const { data } = await supabase
        .from('company_users')
        .select('id')
        .eq('user_id', authUserId)
        .eq('license_id', licenseId)
        .eq('is_active', true)
        .maybeSingle();
      
      setCompanyUserId(data?.id || null);
    };
    
    fetchCompanyUserId();
  }, [authUserId, licenseId]);

  // Fetch overrides for current user
  const fetchOverrides = useCallback(async () => {
    // Direction has full access - no need to check overrides
    if (isDirection) {
      setOverrides(new Map());
      setIsLoading(false);
      return;
    }

    if (!companyUserId) {
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_feature_overrides')
        .select('*')
        .eq('company_user_id', companyUserId);

      if (error) {
        console.error('Error fetching feature overrides:', error);
        setIsLoading(false);
        return;
      }

      const overrideMap = new Map<FeatureKey, boolean>();
      (data || []).forEach((override: UserFeatureOverride) => {
        overrideMap.set(override.feature_key as FeatureKey, override.enabled);
      });

      setOverrides(overrideMap);
    } catch (e) {
      console.error('Error in fetchOverrides:', e);
    } finally {
      setIsLoading(false);
    }
  }, [isDirection, companyUserId]);

  useEffect(() => {
    if (companyUserId || isDirection) {
      fetchOverrides();
    }
  }, [companyUserId, isDirection, fetchOverrides]);

  // Check if user can access a specific feature
  // Returns true if:
  // 1. User is Direction (full access)
  // 2. No override exists for this feature (default is enabled)
  // 3. Override exists and is enabled
  const canAccess = useCallback((feature: FeatureKey): boolean => {
    if (isDirection) return true;
    
    // If no override exists, feature is enabled by default
    if (!overrides.has(feature)) return true;
    
    return overrides.get(feature) === true;
  }, [isDirection, overrides]);

  // Helper to check page access
  const canAccessPage = useCallback((pageName: string): boolean => {
    const pageKey = `page_${pageName.toLowerCase()}` as FeatureKey;
    return canAccess(pageKey);
  }, [canAccess]);

  // Helper to check financial visibility
  const canViewFinancial = useCallback((type: 'costs' | 'margins' | 'profits' | 'pricing'): boolean => {
    const featureKey = `view_${type}` as FeatureKey;
    return canAccess(featureKey);
  }, [canAccess]);

  // Helper to check CRUD permissions
  const canCrud = useCallback((entity: 'vehicles' | 'drivers' | 'clients' | 'tours'): boolean => {
    const featureKey = `crud_${entity}` as FeatureKey;
    return canAccess(featureKey);
  }, [canAccess]);

  return {
    isLoading,
    overrides,
    canAccess,
    canAccessPage,
    canViewFinancial,
    canCrud,
    refreshOverrides: fetchOverrides,
  };
}
