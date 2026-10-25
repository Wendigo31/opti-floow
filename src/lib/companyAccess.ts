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
