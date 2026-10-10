/**
 * Role-based permissions configuration for OptiFlow
 *
 * This file centralizes all role-based access control settings.
 *
 * ROLES (voir src/types/team.ts, seule source du type — réexporté ici sous
 * le nom historique UserRole pour ne pas casser les imports existants) :
 * - direction: accès complet, gère l'équipe, voit toutes les données financières
 * - exploitation: le quotidien opérationnel ; marge/prix visibles par défaut
 *   (ajustable par société via exploitation_metric_settings), détail des
 *   coûts masqué par défaut
 * - comptabilite: Charges + Prévisionnel/Rentabilité, visibilité financière
 *   complète (comme Direction) mais aucun accès aux espaces opérationnels ni
 *   à la gestion d'équipe
 * - rh: espace RH uniquement (conducteurs, équipe) ; peut créer de nouveaux
 *   accès pour l'entreprise, aucune visibilité financière
 *
 * L'ancien rôle générique 'membre' a été retiré (migré vers 'exploitation'
 * par la migration SQL 20261010150000_role_model_comptabilite_rh — ses
 * droits financiers étaient plus restreints qu'exploitation ; ajustez
 * Paramètres > Métriques exploitation si besoin pour un membre migré).
 */

export type { TeamRole as UserRole } from '@/types/team';
import type { TeamRole as UserRole } from '@/types/team';

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
  comptabilite: {
    pages: {
      calculator: true,
      itinerary: false,
      tours: false,
      dashboard: true,
      forecast: true,
      vehicles: false,
      drivers: false,
      charges: true, // Leur espace principal
      clients: true, // Facturation / suivi client
      settings: true,
      team: false, // Ne gère pas l'équipe
      pricing: true,
      aiAnalysis: false,
      vehicleReports: false,
    },
    financial: {
      // Comptabilité a besoin de la visibilité financière complète, comme Direction
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
      canViewTeam: false,
      canInviteMembers: false,
      canRemoveMembers: false,
      canChangeRoles: false,
      canConfigureMetrics: false,
      canManagePermissions: false,
    },
    crud: {
      vehicles: { create: false, read: false, update: false, delete: false },
      drivers: { create: false, read: false, update: false, delete: false },
      clients: { create: true, read: true, update: true, delete: false },
      charges: { create: true, read: true, update: true, delete: true },
      tours: { create: false, read: true, update: false, delete: false },
      trips: { create: false, read: true, update: true, delete: false },
      quotes: { create: false, read: true, update: true, delete: false },
    },
  },
  rh: {
    pages: {
      calculator: false,
      itinerary: false,
      tours: false,
      dashboard: false,
      forecast: false,
      vehicles: false,
      drivers: true, // Leur espace principal (conducteurs = personnel)
      charges: false,
      clients: false,
      settings: true,
      team: true, // Peut créer de nouveaux accès pour l'entreprise
      pricing: false,
      aiAnalysis: false,
      vehicleReports: false,
    },
    financial: {
      // Pas de visibilité sur les coûts/marges des tournées (hors de leur périmètre)
      canViewFuelCost: false,
      canViewTollCost: false,
      canViewDriverCost: false,
      canViewStructureCost: false,
      canViewTotalCost: false,
      canViewMargin: false,
      canViewProfit: false,
      canViewRevenue: false,
      canViewPricePerKm: false,
      canViewSuggestedPrice: true,
      canViewDashboardFinancials: false,
      canViewForecast: false,
    },
    team: {
      canViewTeam: true,
      canInviteMembers: true, // Demande explicite : la RH peut aussi créer de nouveaux accès
      canRemoveMembers: false, // Seule la Direction retire un accès
      canChangeRoles: false, // Seule la Direction change le rôle d'un membre
      canConfigureMetrics: false,
      canManagePermissions: false,
    },
    crud: {
      vehicles: { create: false, read: false, update: false, delete: false },
      drivers: { create: true, read: true, update: true, delete: false },
      clients: { create: false, read: false, update: false, delete: false },
      charges: { create: false, read: false, update: false, delete: false },
      tours: { create: false, read: false, update: false, delete: false },
      trips: { create: false, read: false, update: false, delete: false },
      quotes: { create: false, read: false, update: false, delete: false },
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
  if (!role) return 'exploitation';

  switch (role.toLowerCase()) {
    case 'direction':
    case 'owner':
      return 'direction';
    case 'comptabilite':
      return 'comptabilite';
    case 'rh':
      return 'rh';
    case 'exploitation':
    case 'admin':
      return 'exploitation';
    // 'membre'/'member' : anciennes valeurs (avant comptabilite/rh), déjà
    // migrées côté base par 20261010150000_role_model_comptabilite_rh —
    // ce repli ne sert qu'à un cache client obsolète ou une valeur orpheline.
    case 'membre':
    case 'member':
    default:
      return 'exploitation';
  }
}
