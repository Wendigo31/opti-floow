import { useMemo } from 'react';
import { useTeam } from '@/hooks/useTeam';

/**
 * Role-based permission system for OptiFlow
 * 
 * DIRECTION:
 * - Full access to everything
 * - Can enter and view fixed charges
 * - Can see all financial data (costs, margins, profits)
 * 
 * EXPLOITATION:
 * - Calculator uses charges data for calculations but cannot VIEW the charges
 * - Full access to operational data
 * - Can see calculated results but charges page is hidden
 * - Can see financial results in dashboard
 * 
 * MEMBRE:
 * - Can manage vehicles, drivers, clients (CRUD)
 * - Can manage saved addresses and tours (without pricing info)
 * - Cannot see any financial data (costs, margins, profits, pricing)
 * - Tours are visible but pricing/revenue/costs are hidden
 */

export type UserRole = 'direction' | 'exploitation' | 'membre' | null;

export interface RolePermissions {
  // Core role
  role: UserRole;
  isLoading: boolean;
  
  // Page access
  canAccessCharges: boolean;        // Only Direction
  canAccessFullDashboard: boolean;  // Direction & Exploitation
  canAccessCalculator: boolean;     // All roles, but data visibility varies
  
  // Data visibility
  canViewCharges: boolean;          // Only Direction
  canViewFinancialData: boolean;    // Direction & Exploitation (costs, margins, profits)
  canViewPricing: boolean;          // Direction & Exploitation (pricing in tours/quotes)
  canViewCostBreakdown: boolean;    // Direction only (detailed charge breakdown)
  
  // Data modification
  canModifyCharges: boolean;        // Only Direction
  canModifyVehicles: boolean;       // All roles
  canModifyDrivers: boolean;        // All roles
  canModifyClients: boolean;        // All roles
  canModifyTours: boolean;          // All roles (but pricing fields hidden for Membre)
  canModifyAddresses: boolean;      // All roles
  
  // Export capabilities
  canExportFinancialReports: boolean; // Direction & Exploitation
  canExportOperationalReports: boolean; // All roles
}

export function useRolePermissions(): RolePermissions {
  const { currentUserRole, isLoading } = useTeam();
  
  const permissions = useMemo<RolePermissions>(() => {
    // Map legacy roles to new role system
    const normalizedRole = normalizeRole(currentUserRole);
    
    const isDirection = normalizedRole === 'direction';
    const isExploitation = normalizedRole === 'exploitation';
    const isMembre = normalizedRole === 'membre';
    
    // Direction OR Exploitation can see detailed financial data
    const canSeeFinancials = isDirection || isExploitation;
    
    // All roles can see the calculated pricing (prix suggéré)
    // But only Direction can see the detailed charge breakdown
    
    return {
      role: normalizedRole,
      isLoading,
      
      // Page access
      canAccessCharges: isDirection,
      canAccessFullDashboard: canSeeFinancials,
      canAccessCalculator: true, // All can access, but view varies
      
      // Data visibility
      canViewCharges: isDirection,
      // Direction & Exploitation see full details (costs, margins, profits)
      // Membres can see the suggested price but not cost breakdown
      canViewFinancialData: canSeeFinancials,
      // All roles can see the calculated/suggested price in calculator
      canViewPricing: true,
      // Only Direction sees individual charge line items
      canViewCostBreakdown: isDirection,
      
      // Data modification
      canModifyCharges: isDirection,
      canModifyVehicles: true,  // All roles
      canModifyDrivers: true,   // All roles
      canModifyClients: true,   // All roles
      canModifyTours: true,     // All roles (pricing hidden for Membre)
      canModifyAddresses: true, // All roles
      
      // Export capabilities
      canExportFinancialReports: canSeeFinancials,
      canExportOperationalReports: true, // All roles
    };
  }, [currentUserRole, isLoading]);
  
  return permissions;
}

/**
 * Normalize role names to handle legacy and new role formats
 */
function normalizeRole(role: string | null): UserRole {
  if (!role) return null;
  
  switch (role.toLowerCase()) {
    case 'direction':
    case 'owner':
      return 'direction';
    case 'exploitation':
    case 'responsable':
    case 'admin':
      return 'exploitation';
    case 'membre':
    case 'member':
      return 'membre';
    default:
      return 'membre'; // Default to lowest permission level
  }
}

/**
 * Helper hook to check if current user can perform a specific action
 */
export function useCanPerform(action: keyof Omit<RolePermissions, 'role' | 'isLoading'>): boolean {
  const permissions = useRolePermissions();
  return permissions[action] as boolean;
}
