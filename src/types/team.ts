// Team/Company Users Types
// 4 rôles métier : direction, exploitation, comptabilite, rh.
// (L'ancien rôle générique 'membre' a été retiré — migré vers 'exploitation'
// par la migration SQL 20261010150000_role_model_comptabilite_rh.)
export type TeamRole = 'direction' | 'exploitation' | 'comptabilite' | 'rh';

export interface CompanyUser {
  id: string;
  license_id: string;
  user_id: string | null;
  email: string;
  role: TeamRole;
  display_name?: string;
  invited_by?: string;
  invited_at?: string;
  accepted_at?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TeamMember extends CompanyUser {
  isCurrentUser?: boolean;
}

export const ROLE_LABELS: Record<TeamRole, string> = {
  direction: 'Direction',
  exploitation: 'Exploitation',
  comptabilite: 'Comptabilité',
  rh: 'RH',
};

export const ROLE_DESCRIPTIONS: Record<TeamRole, string> = {
  direction: 'Accès complet : gestion de l\'équipe, des charges et de la licence',
  exploitation: 'Le quotidien opérationnel (tournées, itinéraires, calculs) — pas d\'accès à la Comptabilité ni à la RH',
  comptabilite: 'Charges fixes, prévisionnel et rentabilité — pas d\'accès aux espaces opérationnels ni à la RH',
  rh: 'Équipe, accès et conducteurs — peut créer de nouveaux accès pour l\'entreprise',
};

// Maximum users per plan - SYNCHRONIZED WITH PricingSection.tsx and shared.ts
export const MAX_USERS_PER_PLAN = {
  optiflow: 999, // Forfait unique : utilisateurs illimités
} as const;

// Price per additional user beyond plan's included count
export const EXTRA_USER_PRICE = 2.50;
