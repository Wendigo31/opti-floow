/**
 * Réglages de la société décidés depuis OptiCentral — identique dans OptiFlow,
 * OptiFret et OptiXpress :
 * - hidden_pages : onglets désactivés par l'administrateur pour cette société
 *   (chemins, ex. « /planning ») ; ils disparaissent du menu et leur adresse
 *   renvoie à l'accueil ;
 * - contact_complete : la Direction a saisi le téléphone et l'email de la
 *   société. Tant que ce n'est pas fait, l'application est bloquée pour toute
 *   la société (voir CompanyContactGate).
 * Fonctions SQL : company_access / complete_company_contact
 * (migration 20261025140000_company_access.sql).
 */
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CompanyAccess {
  hidden_pages: string[];
  contact_complete: boolean;
  company_name?: string | null;
}

const OPEN: CompanyAccess = { hidden_pages: [], contact_complete: true };

// Les deux fonctions ne sont pas dans les types générés : appel non typé.
const rpc = (fn: string, args: Record<string, unknown>) =>
  (supabase as unknown as { rpc: (f: string, a: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }> }).rpc(fn, args);

export function useCompanyAccess(licenseId: string | null | undefined) {
  const q = useQuery({
    queryKey: ['company-access', licenseId],
    enabled: !!licenseId,
    staleTime: 60_000,
    refetchOnWindowFocus: true,
    retry: 1,
    queryFn: async (): Promise<CompanyAccess> => {
      const { data, error } = await rpc('company_access', { p_license_id: licenseId });
      // Fonction indisponible (base pas encore à jour) ou réseau : on ne bloque personne.
      if (error || !data) return OPEN;
      const d = data as Partial<CompanyAccess>;
      return { hidden_pages: Array.isArray(d.hidden_pages) ? d.hidden_pages : [], contact_complete: d.contact_complete !== false, company_name: d.company_name ?? null };
    },
  });
  return { access: q.data ?? OPEN, loading: !!licenseId && q.isLoading };
}

/** Vrai si l'administrateur a désactivé cet onglet (chemin) pour la société. */
export function isPathHidden(hidden: string[], path: string): boolean {
  return hidden.some((h) => path === h || path.startsWith(h + '/'));
}

export async function completeCompanyContact(args: {
  licenseId: string;
  phone: string;
  email: string;
  code?: string | null;
  userEmail?: string | null;
}): Promise<void> {
  const { error } = await rpc('complete_company_contact', {
    p_license_id: args.licenseId,
    p_phone: args.phone,
    p_email: args.email,
    p_code: args.code ?? null,
    p_user_email: args.userEmail ?? null,
  });
  if (error) throw new Error(error.message);
}

export function useRefreshCompanyAccess() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ['company-access'] });
}

// ---------- Bandeaux OptiCentral et suivi des onglets ouverts ----------
// Fonctions SQL : active_announcements / track_page_view
// (migration 20261025160000_central_bridge_v2.sql).

export interface CentralAnnouncement {
  id: string;
  message: string;
  level: 'info' | 'warning' | 'maintenance';
  ends_at: string | null;
}

/** Messages diffusés depuis OptiCentral à toutes les sociétés ou à celle-ci. */
export function useCentralAnnouncements(licenseId: string | null | undefined) {
  const q = useQuery({
    queryKey: ['central-announcements', licenseId ?? 'none'],
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
    refetchOnWindowFocus: true,
    retry: 1,
    queryFn: async (): Promise<CentralAnnouncement[]> => {
      const { data, error } = await rpc('active_announcements', { p_license_id: licenseId ?? null });
      if (error || !Array.isArray(data)) return [];
      return data as CentralAnnouncement[];
    },
  });
  return q.data ?? [];
}

/**
 * Chemin enregistré pour une page : identifiants retirés et 2 niveaux au plus,
 * pour que OptiCentral sache quels onglets la société ouvre réellement.
 */
export function trackedPath(pathname: string): string | null {
  const parts = pathname
    .split('/')
    .filter(Boolean)
    .filter((s) => !/\d/.test(s) || s.length < 8)
    .slice(0, 2);
  const p = '/' + parts.join('/');
  return /^\/[A-Za-z0-9/_-]{0,80}$/.test(p) ? p : null;
}

const lastTracked = { key: '' };

/** Enregistre l'ouverture d'un onglet (une fois par chemin et par minute). */
export function trackPageView(licenseId: string | null | undefined, pathname: string): void {
  if (!licenseId) return;
  const path = trackedPath(pathname);
  if (!path) return;
  const key = `${licenseId}|${path}|${Math.floor(Date.now() / 60_000)}`;
  if (lastTracked.key === key) return;
  lastTracked.key = key;
  // Le constructeur de requête n'a pas de .catch : on passe par une vraie promesse.
  void Promise.resolve(rpc('track_page_view', { p_license_id: licenseId, p_path: path })).catch(() => undefined);
}
