import { useMemo, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLicenseContext } from '@/context/LicenseContext';
import { 
  getRoleConfig, 
  normalizeRole, 
  type UserRole, 
  type RoleConfig,
  type RoleFinancialAccess,
  ROLE_CONFIGS,
} from '@/config/rolePermissions';

/**
 * Role-based permission system for OptiFlow
 * 
 * DIRECTION:
 * - Full access to everything
 * - Can enter and view fixed charges
 * - Can see all financial data (costs, margins, profits)
 * - Can manage team members
 * 
 * EXPLOITATION:
 * - Calculator uses charges data for calculations but cannot VIEW the charges
 * - Full access to operational data
 * - Can see margin and suggested price (for client negotiations)
 * - Cost breakdown hidden by default (configurable via exploitation_metric_settings)
 * 
 * MEMBRE:
 * - Can manage vehicles, drivers, clients (CRUD)
 * - Can manage saved addresses and tours (without pricing info)
 * - Can only see the suggested price
 * - Cannot see any cost details, margins, or profits
 */

export type { UserRole } from '@/config/rolePermissions';

export interface RolePermissions {
  // Core role
  role: UserRole;
  isLoading: boolean;
  
  // Role config
  config: RoleConfig;
  
  // Page access
  canAccessCharges: boolean;
  canAccessFullDashboard: boolean;
  canAccessCalculator: boolean;
  canAccessForecast: boolean;
  canAccessTeam: boolean;
  canAccessPricing: boolean;
  
  // Financial data visibility (merged with exploitation_metric_settings)
  financial: RoleFinancialAccess;
  
  // Legacy compatibility
  canViewCharges: boolean;
  canViewFinancialData: boolean;
  canViewPricing: boolean;
  canViewCostBreakdown: boolean;
  
  // Data modification
  canModifyCharges: boolean;
  canModifyVehicles: boolean;
  canModifyDrivers: boolean;
  canModifyClients: boolean;
  canModifyTours: boolean;
  canModifyAddresses: boolean;
  
  // Team management
  canInviteMembers: boolean;
  canRemoveMembers: boolean;
  canChangeRoles: boolean;
  canConfigureMetrics: boolean;
  canManagePermissions: boolean;
  
  // Export capabilities
  canExportFinancialReports: boolean;
  canExportOperationalReports: boolean;
}

// Interface for exploitation_metric_settings from database
interface ExploitationMetricSettings {
  can_view_fuel_cost: boolean;
  can_view_toll_cost: boolean;
  can_view_driver_cost: boolean;
  can_view_structure_cost: boolean;
  can_view_total_cost: boolean;
  can_view_margin: boolean;
  can_view_profit: boolean;
  can_view_revenue: boolean;
  can_view_price_per_km: boolean;
  can_view_dashboard_financials: boolean;
  can_view_forecast: boolean;
}

export function useRolePermissions(): RolePermissions {
  const { userRole, licenseId, isLoading: contextLoading } = useLicenseContext();
  const [metricSettings, setMetricSettings] = useState<ExploitationMetricSettings | null>(null);
  const [isMetricLoading, setIsMetricLoading] = useState(false);
  
  // Fetch exploitation metric settings if user is exploitation role
  useEffect(() => {
    const fetchMetricSettings = async () => {
      if (!licenseId) return;
      
      try {
        setIsMetricLoading(true);
        const { data, error } = await supabase
          .from('exploitation_metric_settings')
          .select('*')
          .eq('license_id', licenseId)
          .maybeSingle();
          
        if (error) {
          console.error('Error fetching metric settings:', error);
          return;
        }
        
        if (data) {
          setMetricSettings(data as unknown as ExploitationMetricSettings);
        }
      } catch (err) {
        console.error('Error in fetchMetricSettings:', err);
      } finally {
        setIsMetricLoading(false);
      }
    };
    
    fetchMetricSettings();
  }, [licenseId]);

  const isLoading = contextLoading || isMetricLoading;
  
  const permissions = useMemo<RolePermissions>(() => {
    // During loading, default to 'direction' to avoid flash of restricted content
    // Once loaded, the actual role will be applied
    const normalizedRole = contextLoading ? 'direction' : normalizeRole(userRole);
    const config = getRoleConfig(normalizedRole);
    
    const isDirection = normalizedRole === 'direction';
    const isExploitation = normalizedRole === 'exploitation';
    
    // Merge exploitation_metric_settings with role defaults for exploitation users
    let financial = { ...config.financial };
    if (isExploitation && metricSettings) {
      financial = {
        canViewFuelCost: metricSettings.can_view_fuel_cost,
        canViewTollCost: metricSettings.can_view_toll_cost,
        canViewDriverCost: metricSettings.can_view_driver_cost,
        canViewStructureCost: metricSettings.can_view_structure_cost,
        canViewTotalCost: metricSettings.can_view_total_cost,
        canViewMargin: metricSettings.can_view_margin,
        canViewProfit: metricSettings.can_view_profit,
        canViewRevenue: metricSettings.can_view_revenue,
        canViewPricePerKm: metricSettings.can_view_price_per_km,
        canViewSuggestedPrice: true, // Always true
        canViewDashboardFinancials: metricSettings.can_view_dashboard_financials,
        canViewForecast: metricSettings.can_view_forecast,
      };
    }
    
    // Direction & Exploitation can see detailed financial data
    const canSeeFinancials = isDirection || isExploitation;
    
    return {
      role: normalizedRole,
      isLoading,
      config,
      
      // Page access
      canAccessCharges: config.pages.charges,
      canAccessFullDashboard: config.pages.dashboard && financial.canViewDashboardFinancials,
      canAccessCalculator: config.pages.calculator,
      canAccessForecast: config.pages.forecast && financial.canViewForecast,
      canAccessTeam: config.pages.team,
      canAccessPricing: config.pages.pricing,
      
      // Financial data with metric settings applied
      financial,
      
      // Legacy compatibility
      canViewCharges: isDirection,
      canViewFinancialData: canSeeFinancials,
      canViewPricing: true, // All can see suggested price
      canViewCostBreakdown: isDirection,
      
      // Data modification
      canModifyCharges: config.crud.charges.create,
      canModifyVehicles: config.crud.vehicles.create,
      canModifyDrivers: config.crud.drivers.create,
      canModifyClients: config.crud.clients.create,
      canModifyTours: config.crud.tours.create,
      canModifyAddresses: true,
      
      // Team management
      canInviteMembers: config.team.canInviteMembers,
      canRemoveMembers: config.team.canRemoveMembers,
      canChangeRoles: config.team.canChangeRoles,
      canConfigureMetrics: config.team.canConfigureMetrics,
      canManagePermissions: config.team.canManagePermissions,
      
      // Export capabilities
      canExportFinancialReports: canSeeFinancials,
      canExportOperationalReports: true,
    };
  }, [userRole, isLoading, metricSettings]);
  
  return permissions;
}

/**
 * Helper hook to check if current user can perform a specific action
 */
export function useCanPerform(action: keyof Omit<RolePermissions, 'role' | 'isLoading' | 'config' | 'financial'>): boolean {
  const permissions = useRolePermissions();
  return permissions[action] as boolean;
}
