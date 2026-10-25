import { supabase } from '@/integrations/supabase/client';

/**
 * Lien de connexion propre à chaque société.
 *
 * Chaque société a un identifiant (colonne licenses.slug), créé par la base
 * à la création de la société (migration 20261025100000_company_link_slug.sql). Le lien privé :
 *  - aujourd'hui : <adresse de l'app>/?societe=transports-dupont
 *  - plus tard : transports-dupont.opti-flow.app (domaine générique à brancher)
 * Le site OptiGroup (page « Se connecter ») envoie sur ce lien.
 */
export const COMPANY_APP_DOMAIN = (import.meta.env.VITE_COMPANY_APP_DOMAIN as string | undefined) || 'opti-flow.app';

const STORAGE_KEY = 'company_link_slug';
export const isValidSlug = (s: string) => /^[a-z0-9]([a-z0-9-]{0,46}[a-z0-9])?$/.test(s);

/** Société désignée par l'adresse ouverte (?societe=… ou sous-domaine). */
export function slugFromLocation(loc: Pick<Location, 'hostname' | 'search'> = window.location): string | null {
  const param = new URLSearchParams(loc.search).get('societe');
  if (param && isValidSlug(param.toLowerCase())) return param.toLowerCase();
  const host = (loc.hostname || '').toLowerCase();
  const suffix = `.${COMPANY_APP_DOMAIN}`;
  if (host.endsWith(suffix)) {
    const sub = host.slice(0, -suffix.length);
    if (sub && !sub.includes('.') && !['www', 'app', 'admin'].includes(sub) && isValidSlug(sub)) return sub;
  }
  return null;
}

/**
 * À appeler au démarrage : la redirection vers la page de connexion perd
 * l'adresse d'origine, la société est donc gardée pour la session.
 */
export function captureCompanySlug(): void {
  try {
    const slug = slugFromLocation();
    if (slug) sessionStorage.setItem(STORAGE_KEY, slug);
  } catch {
    /* stockage indisponible */
  }
}

export function currentCompanySlug(): string | null {
  const fromUrl = typeof window !== 'undefined' ? slugFromLocation() : null;
  if (fromUrl) return fromUrl;
  try {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    return saved && isValidSlug(saved) ? saved : null;
  } catch {
    return null;
  }
}

export function forgetCompanySlug(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export interface LinkedCompany {
  name: string;
  slug: string;
}

/** Nom de la société à partir de son identifiant (ou code société). null si inconnue. */
export async function resolveCompanyLink(query: string): Promise<LinkedCompany | null> {
  // Fonction SQL publique resolve_company_link : renvoie seulement le nom et l'identifiant.
  const { data, error } = await (supabase.rpc as unknown as (
    fn: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: LinkedCompany[] | null; error: unknown }>)('resolve_company_link', { p_query: query });
  if (error || !data || data.length === 0) return null;
  return data[0];
}

/** Lien à envoyer à la société. */
export function companyLoginUrl(slug: string, origin = typeof window !== 'undefined' ? window.location.origin : ''): string {
  return `${origin}/?societe=${slug}`;
}
