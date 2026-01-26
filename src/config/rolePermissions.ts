/**
 * Role-based permissions configuration for OptiFlow
 * 
 * This file centralizes all role-based access control settings.
 * 
 * ROLES:
 * - direction: Full access to everything, can manage team and see all financial data
 * - exploitation: Operational access, can see margins/pricing, hidden cost details (configurable)
 * - membre: Basic access, can see suggested price only, no financial details
 */

export type UserRole = 'direction' | 'exploitation' | 'membre';

// Pages configuration per role
export interface RolePageAccess {
  calculator: boolean;
  itinerary: boolean;
  tours: boolean;
  dashboard: boolean;
  forecast: boolean;
  vehicles: boolean;
  drivers: boolean;
  charges: boolean;
  clients: boolean;
  settings: boolean;
  team: boolean;
  pricing: boolean;
  aiAnalysis: boolean;
  vehicleReports: boolean;
}

// Financial data visibility per role
export interface RoleFinancialAccess {
  // Cost breakdown visibility
  canViewFuelCost: boolean;
  canViewTollCost: boolean;
  canViewDriverCost: boolean;
  canViewStructureCost: boolean;
  canViewTotalCost: boolean;
  // Pricing visibility
  canViewMargin: boolean;
  canViewProfit: boolean;
  canViewRevenue: boolean;
  canViewPricePerKm: boolean;
  canViewSuggestedPrice: boolean; // All roles can see this
  // Dashboard visibility
  canViewDashboardFinancials: boolean;
  canViewForecast: boolean;
}

// Team management per role
export interface RoleTeamAccess {
  canViewTeam: boolean;
  canInviteMembers: boolean;
  canRemoveMembers: boolean;
  canChangeRoles: boolean;
  canConfigureMetrics: boolean;
  canManagePermissions: boolean;
}

// CRUD operations per role
export interface RoleCrudAccess {
  vehicles: { create: boolean; read: boolean; update: boolean; delete: boolean };
  drivers: { create: boolean; read: boolean; update: boolean; delete: boolean };
  clients: { create: boolean; read: boolean; update: boolean; delete: boolean };
  charges: { create: boolean; read: boolean; update: boolean; delete: boolean };
  tours: { create: boolean; read: boolean; update: boolean; delete: boolean };
  trips: { create: boolean; read: boolean; update: boolean; delete: boolean };
  quotes: { create: boolean; read: boolean; update: boolean; delete: boolean };
}

export interface RoleConfig {
  pages: RolePageAccess;
  financial: RoleFinancialAccess;
  team: RoleTeamAccess;
  crud: RoleCrudAccess;
}

// Default configurations per role
export const ROLE_CONFIGS: Record<UserRole, RoleConfig> = {
  direction: {
    pages: {
      calculator: true,
      itinerary: true,
      tours: true,
      dashboard: true,
      forecast: true,
      vehicles: true,
      drivers: true,
      charges: true,
      clients: true,
      settings: true,
      team: true,
      pricing: true,
      aiAnalysis: true,
      vehicleReports: true,
    },
    financial: {
      canViewFuelCost: true,
      canViewTollCost: true,
      canViewDriverCost: true,
      canViewStructureCost: true,
      canViewTotalCost: true,
      canViewMargin: true,
      canViewProfit: true,
      canViewRevenue: true,
      canViewPricePerKm: true,
      canViewSuggestedPrice: true,
      canViewDashboardFinancials: true,
      canViewForecast: true,
    },
    team: {
      canViewTeam: true,
      canInviteMembers: true,
      canRemoveMembers: true,
      canChangeRoles: true,
      canConfigureMetrics: true,
      canManagePermissions: true,
    },
    crud: {
      vehicles: { create: true, read: true, update: true, delete: true },
      drivers: { create: true, read: true, update: true, delete: true },
      clients: { create: true, read: true, update: true, delete: true },
      charges: { create: true, read: true, update: true, delete: true },
      tours: { create: true, read: true, update: true, delete: true },
      trips: { create: true, read: true, update: true, delete: true },
      quotes: { create: true, read: true, update: true, delete: true },
    },
  },
  exploitation: {
    pages: {
      calculator: true,
      itinerary: true,
      tours: true,
      dashboard: true,
      forecast: false, // Restricted by default, configurable
      vehicles: true,
      drivers: true,
      charges: false, // Cannot access charges page
      clients: true,
      settings: true,
      team: true, // Can view team, but not manage
      pricing: false, // Cannot access pricing page
      aiAnalysis: true,
      vehicleReports: true,
    },
    financial: {
      // Cost breakdown hidden by default (can be enabled via exploitation_metric_settings)
      canViewFuelCost: false,
      canViewTollCost: true, // Usually visible
      canViewDriverCost: false,
      canViewStructureCost: false,
      canViewTotalCost: false,
      // Pricing visible to help with client negotiations
      canViewMargin: true,
      canViewProfit: true,
      canViewRevenue: true,
      canViewPricePerKm: true,
      canViewSuggestedPrice: true,
      canViewDashboardFinancials: true,
      canViewForecast: false,
    },
    team: {
      canViewTeam: true,
      canInviteMembers: false,
      canRemoveMembers: false,
      canChangeRoles: false,
      canConfigureMetrics: false,
      canManagePermissions: false,
    },
    crud: {
      vehicles: { create: true, read: true, update: true, delete: true },
      drivers: { create: true, read: true, update: true, delete: true },
      clients: { create: true, read: true, update: true, delete: true },
      charges: { create: false, read: false, update: false, delete: false },
      tours: { create: true, read: true, update: true, delete: true },
      trips: { create: true, read: true, update: true, delete: true },
      quotes: { create: true, read: true, update: true, delete: true },
    },
  },
  membre: {
    pages: {
      calculator: true,
      itinerary: true,
      tours: true,
      dashboard: true, // Operational view only
      forecast: false,
      vehicles: true,
      drivers: true,
      charges: false,
      clients: true,
      settings: true,
      team: true, // Can view team members only
      pricing: false,
      aiAnalysis: false,
      vehicleReports: false,
    },
    financial: {
      // All cost details hidden
      canViewFuelCost: false,
      canViewTollCost: false,
      canViewDriverCost: false,
      canViewStructureCost: false,
      canViewTotalCost: false,
      // Only suggested price visible
      canViewMargin: false,
      canViewProfit: false,
      canViewRevenue: false,
      canViewPricePerKm: false,
      canViewSuggestedPrice: true, // Only this is visible
      canViewDashboardFinancials: false,
      canViewForecast: false,
    },
    team: {
      canViewTeam: true,
      canInviteMembers: false,
      canRemoveMembers: false,
      canChangeRoles: false,
      canConfigureMetrics: false,
      canManagePermissions: false,
    },
    crud: {
      vehicles: { create: true, read: true, update: true, delete: true },
      drivers: { create: true, read: true, update: true, delete: true },
      clients: { create: true, read: true, update: true, delete: true },
      charges: { create: false, read: false, update: false, delete: false },
      tours: { create: true, read: true, update: true, delete: false }, // Can create/edit but not delete
      trips: { create: true, read: true, update: true, delete: false },
      quotes: { create: true, read: true, update: true, delete: false },
    },
  },
};

/**
 * Get role configuration, with defaults for unknown roles
 */
export function getRoleConfig(role: string | null): RoleConfig {
  const normalizedRole = normalizeRole(role);
  return ROLE_CONFIGS[normalizedRole];
}

/**
 * Normalize role names to handle legacy formats
 */
export function normalizeRole(role: string | null): UserRole {
  if (!role) return 'membre';
  
  switch (role.toLowerCase()) {
    case 'direction':
    case 'owner':
      return 'direction';
    case 'exploitation':
    case 'admin':
      return 'exploitation';
    case 'membre':
    case 'member':
    default:
      return 'membre';
  }
}
