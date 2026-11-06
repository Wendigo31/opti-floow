/**
 * Accès aux réglages communs des logiciels Opti (fichier partagé : bridge/shared/settings).
 * Fonctions SQL : migration *_opti_settings.sql.
 */
import { supabase } from '@/integrations/supabase/client';

type Rpc = (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;
// Appel lié au client (une méthode extraite de son objet perd son contexte).
const rpc: Rpc = (fn, args) => (supabase.rpc as unknown as Rpc).call(supabase, fn, args);

async function call<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await rpc(fn, args);
  if (error) throw new Error(error.message);
  return data as T;
}

export interface OptiSettings {
  vat_rate: number;
  vat_updated_by: string | null;
  vat_updated_at: string | null;
  me: { id: string; name: string; email: string; role: string };
  can_edit_company: boolean;
  member: { notify_team_changes: boolean };
}

export interface TeamActivity {
  id: number;
  member_id: string | null;
  actor_name: string;
  action: 'create' | 'update' | 'delete';
  entity: string;
  entity_label: string | null;
  fields: string[];
  created_at: string;
  updated_at: string;
}

export interface TeamMember {
  member_id: string;
  name: string;
  role: string;
  is_me: boolean;
}

export const getSettings = () => call<OptiSettings>('opti_get_settings');
export const setVatRate = (rate: number) => call<number>('opti_set_vat_rate', { p_rate: rate });
export const setMemberPreferences = (prefs: Partial<OptiSettings['member']>) =>
  call<OptiSettings['member']>('opti_set_member_preferences', { p_prefs: prefs });
export const teamActivity = (opts: { member?: string | null; since?: string | null; limit?: number } = {}) =>
  call<TeamActivity[]>('opti_team_activity', { p_member: opts.member ?? null, p_since: opts.since ?? null, p_limit: opts.limit ?? 200 });
export const teamMembers = () => call<TeamMember[]>('opti_team_members');
export const exportCompany = () => call<Record<string, unknown>>('opti_export_company');

// ---------------------------------------------------------------------------
// Libellés lisibles
// ---------------------------------------------------------------------------
export const ROLE_LABEL: Record<string, string> = {
  direction: 'Direction',
  exploitation: 'Exploitation',
  comptabilite: 'Comptabilité',
  rh: 'RH',
};

export const ACTION_VERB: Record<TeamActivity['action'], string> = {
  create: 'a créé',
  update: 'a modifié',
  delete: 'a supprimé',
};

// Réglages enregistrés sous une clé technique.
const KEY_LABEL: Record<string, string> = {
  optixpress_settings: 'paramètres de calcul', optixpress_fixed_charges: 'charges fixes',
  optixpress_invoice_issuer: 'émetteur des factures', optixpress_fuel_index: 'indexation gazole',
  optixpress_reminders: 'relances',
};

const FIELD_LABEL: Record<string, string> = {
  name: 'nom', company_name: 'raison sociale', email: 'e-mail', phone: 'téléphone', address: 'adresse', city: 'ville',
  postal_code: 'code postal', siren: 'SIREN', siret: 'SIRET', notes: 'notes', status: 'statut', price: 'prix',
  amount: 'montant', total_amount: 'total', tax_amount: 'TVA', due_date: 'échéance', paid_at: 'date de paiement',
  sent_at: "date d'envoi", role: 'rôle', is_active: 'activation', display_name: 'nom affiché', card: 'grille',
  frequency: 'périodicité', periodicity: 'périodicité', category: 'catégorie', tax_mode: 'HT / TTC', isHT: 'HT / TTC',
  driver_id: 'conducteur', vehicle_id: 'véhicule', client_id: 'client', planning_date: 'date', start_time: 'heure de début',
  end_time: 'heure de fin', origin: 'départ', destination: 'arrivée', origin_address: 'départ', destination_address: 'arrivée',
  pickup_date: 'date de chargement', delivery_date: 'date de livraison', weight: 'poids', license_plate: 'immatriculation',
  licensePlate: 'immatriculation', mileage: 'kilométrage', baseSalary: 'salaire', hourlyRate: 'taux horaire',
  contractType: 'contrat', lines: 'lignes', given: 'palettes laissées', returned: 'palettes reprises', vat_rate: 'TVA',
  page_visibility: 'onglets', feature_overrides: 'accès', must_change_password: 'mot de passe',
};

export function fieldLabel(f: string): string {
  if (FIELD_LABEL[f]) return FIELD_LABEL[f];
  return f
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .toLowerCase();
}

/** « Marc Dupont a modifié Client « Transports X » (téléphone, adresse) » */
export function describeActivity(a: TeamActivity): string {
  const label = a.entity_label && KEY_LABEL[a.entity_label] ? KEY_LABEL[a.entity_label] : a.entity_label;
  a = { ...a, entity_label: label?.replace(/^opti(fret|flow|xpress)_/, '').replace(/_/g, ' ') ?? null };
  if (a.entity === 'Export des données') return `${a.actor_name} a exporté les données de la société (.opp)`;
  const what = a.entity_label ? `${a.entity.toLowerCase()} « ${a.entity_label} »` : a.entity.toLowerCase();
  const fields = a.action === 'update' && a.fields.length ? ` (${a.fields.slice(0, 4).map(fieldLabel).join(', ')}${a.fields.length > 4 ? '…' : ''})` : '';
  return `${a.actor_name} ${ACTION_VERB[a.action]} ${what}${fields}`;
}
