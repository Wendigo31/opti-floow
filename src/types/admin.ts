import { Users, Building2, Settings2, FileText } from 'lucide-react';
import type { PlanType } from '@/hooks/useLicense';
import type { LicenseFeatures } from '@/types/features';

/**
 * Types et constantes partagés par la page src/pages/Admin.tsx et ses
 * sous-composants (src/components/admin/Admin*.tsx). Extrait de
 * src/pages/Admin.tsx pour alléger ce fichier — aucun changement de
 * comportement.
 */

export interface License {
  id: string;
  license_code: string;
  company_identifier?: string;
  max_drivers: number | null;
  max_clients: number | null;
  max_daily_charges: number | null;
  max_monthly_charges: number | null;
  max_yearly_charges: number | null;
  max_users: number | null;
  email: string;
  is_active: boolean;
  plan_type: string | null;
  activated_at: string | null;
  last_used_at: string | null;
  created_at: string;
  first_name: string | null;
  last_name: string | null;
  company_name: string | null;
  siren: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  features?: Partial<LicenseFeatures> | null;
  show_user_info?: boolean;
  show_company_info?: boolean;
  show_address_info?: boolean;
  show_license_info?: boolean;
}

export interface LicenseFormData {
  email: string;
  planType: PlanType;
  firstName: string;
  lastName: string;
  companyName: string;
  siren: string;
  address: string;
  city: string;
  postalCode: string;
  assignToCompanyId: string | null;
  userRole: 'owner' | 'admin' | 'member';
}

export const emptyFormData: LicenseFormData = {
  email: '',
  planType: 'optiflow',
  firstName: '',
  lastName: '',
  companyName: '',
  siren: '',
  address: '',
  city: '',
  postalCode: '',
  assignToCompanyId: null,
  userRole: 'member',
};

// Sidebar navigation items - Simplified (pricing removed)
export const ADMIN_NAV = [
  { id: 'licenses', label: 'Licences', icon: Users, description: 'Gérer toutes les licences' },
  { id: 'companies', label: 'Sociétés', icon: Building2, description: 'Utilisateurs & données' },
  { id: 'features', label: 'Fonctionnalités', icon: Settings2, description: 'Configurer les accès' },
  { id: 'pricing', label: 'Tarification', icon: FileText, description: 'Forfaits, remises, add-ons' },
] as const;

export type AdminTab = typeof ADMIN_NAV[number]['id'];
