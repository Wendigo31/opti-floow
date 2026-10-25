/**
 * Comptes utilisateurs — identique dans OptiFlow, OptiFret et OptiXpress.
 * Connexion par email (ou identifiant personnel) + mot de passe personnel.
 * La Direction / les RH (ou OptiCentral) donnent un mot de passe PROVISOIRE,
 * que la personne remplace à sa première connexion.
 * Fonctions SQL : migrations *_user_accounts.sql et *_team_usage.sql.
 */
import { supabase } from '@/integrations/supabase/client';

type RpcResult = { data: unknown; error: { message: string } | null };
// Fonctions absentes des types générés : appel non typé.
const rpc = (fn: string, args: Record<string, unknown> = {}) =>
  (supabase as unknown as { rpc: (f: string, a: Record<string, unknown>) => Promise<RpcResult> }).rpc(fn, args);

const unwrap = async <T>(p: Promise<RpcResult>): Promise<T> => {
  const { data, error } = await p;
  if (error) throw new Error(error.message);
  return data as T;
};

export const ROLE_NAMES: Record<string, string> = {
  direction: 'Direction',
  exploitation: 'Exploitation',
  comptabilite: 'Comptabilité',
  rh: 'RH',
};

export interface MyCompany {
  license_id: string;
  company_user_id: string;
  company_name: string;
  code: string;
  company_identifier: string | null;
  license_email: string;
  email: string;
  role: string;
  display_name: string | null;
  must_change_password: boolean;
  license_active: boolean;
}

export interface TeamUser {
  id: string;
  email: string;
  display_name: string | null;
  role: string;
  is_active: boolean;
  login_id: string | null;
  must_change_password: boolean;
  last_activity_at: string | null;
  created_at: string;
  created_via: string | null;
  created_by: string | null;
}

/** Email de connexion : tel quel s'il contient « @ », sinon retrouvé depuis l'identifiant personnel. */
export async function loginEmail(input: string): Promise<string | null> {
  const v = input.trim();
  if (v.includes('@')) return v.toLowerCase();
  const email = await unwrap<string | null>(rpc('resolve_login', { p_login: v })).catch(() => null);
  return email ? email.toLowerCase() : null;
}

/** Connexion email/identifiant + mot de passe ; renvoie les sociétés accessibles. */
export async function signInWithPassword(login: string, password: string): Promise<MyCompany[]> {
  const email = await loginEmail(login);
  if (!email) throw new Error('Identifiant inconnu');
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error('Email / identifiant ou mot de passe incorrect');
  const companies = await myCompanies();
  if (!companies.length) {
    await supabase.auth.signOut();
    throw new Error("Ce compte n'a accès à aucune société. Contactez votre direction.");
  }
  return companies;
}

export const myCompanies = () => unwrap<MyCompany[]>(rpc('my_companies'));

export const companyTeam = (licenseId: string) =>
  unwrap<{ users: TeamUser[]; max_users: number | null; my_role: string | null }>(
    rpc('company_team', { p_license_id: licenseId }),
  );

export const createCompanyUser = (args: {
  licenseId: string;
  email: string;
  displayName: string;
  role: string;
  loginId?: string;
}) =>
  unwrap<{ id: string; password: string }>(
    rpc('company_create_user', {
      p_license_id: args.licenseId,
      p_email: args.email,
      p_display_name: args.displayName,
      p_role: args.role,
      p_login_id: args.loginId || null,
    }),
  );

export const resetUserPassword = (companyUserId: string) =>
  unwrap<string>(rpc('company_reset_user_password', { p_company_user_id: companyUserId }));

export const setUserActive = (companyUserId: string, active: boolean) =>
  unwrap<null>(rpc('company_set_user_active', { p_company_user_id: companyUserId, p_active: active }));

/** Remplace le mot de passe provisoire par le mot de passe personnel. */
export async function changeOwnPassword(password: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw new Error(error.message);
  await unwrap(rpc('company_password_changed'));
}

export const PASSWORD_MIN = 8;
export function passwordProblem(p: string, confirm: string): string | null {
  if (p.length < PASSWORD_MIN) return `Au moins ${PASSWORD_MIN} caractères.`;
  if (!/[A-Za-z]/.test(p) || !/\d/.test(p)) return 'Mélangez lettres et chiffres.';
  if (p !== confirm) return 'Les deux mots de passe ne correspondent pas.';
  return null;
}
