// Team/Company Users Types
export type TeamRole = 'owner' | 'admin' | 'member';

export interface CompanyUser {
  id: string;
  license_id: string;
  user_id: string;
  email: string;
  role: TeamRole;
  display_name?: string;
  invited_by?: string;
  invited_at: string;
  accepted_at?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CompanyInvitation {
  id: string;
  license_id: string;
  email: string;
  role: TeamRole;
  token: string;
  invited_by: string;
  expires_at: string;
  accepted_at?: string;
  created_at: string;
}

export interface TeamMember extends CompanyUser {
  isCurrentUser?: boolean;
}

export const ROLE_LABELS: Record<TeamRole, string> = {
  owner: 'Propriétaire',
  admin: 'Administrateur',
  member: 'Membre',
};

export const ROLE_DESCRIPTIONS: Record<TeamRole, string> = {
  owner: 'Accès complet, gestion de l\'équipe et de la licence',
  admin: 'Peut inviter des membres et gérer les données',
  member: 'Accès aux données partagées de l\'entreprise',
};

// Maximum users per plan
export const MAX_USERS_PER_PLAN = {
  start: 1,
  pro: 3,
  enterprise: 999,
} as const;
