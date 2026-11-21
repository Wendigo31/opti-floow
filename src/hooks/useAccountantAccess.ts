/**
 * Accès expert-comptable : liens personnels (lecture seule, révocables) et
 * dossiers comptables mensuels déposés dans le stockage « accounting ».
 * Fichier partagé (bridge/shared/accounting) : copie identique dans les 3 logiciels.
 */
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as unknown as { from: (t: string) => any };
export const ACCOUNTING_BUCKET = 'accounting';

export interface AccountantLink {
  id: string;
  label: string;
  email: string | null;
  created_at: string;
  expires_at: string | null;
  revoked_at: string | null;
  last_access_at: string | null;
}
export interface AccountingExport {
  id: string;
  period: string;
  path: string;
  size: number;
  contents: { label: string; count: number }[] | null;
  created_at: string;
}

const b64url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
export async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function useAccountantAccess(licenseId: string | null | undefined) {
  const qc = useQueryClient();
  const linksKey = ['accountant-links', licenseId];
  const exportsKey = ['accounting-exports', licenseId];
  const links = useQuery({
    queryKey: linksKey,
    enabled: !!licenseId,
    queryFn: async (): Promise<AccountantLink[]> => {
      const { data, error } = await db.from('accountant_links').select('id, label, email, created_at, expires_at, revoked_at, last_access_at').eq('license_id', licenseId).order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });
  const exports = useQuery({
    queryKey: exportsKey,
    enabled: !!licenseId,
    queryFn: async (): Promise<AccountingExport[]> => {
      const { data, error } = await db.from('accounting_exports').select('id, period, path, size, contents, created_at').eq('license_id', licenseId).order('period', { ascending: false }).order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

  /** Crée un lien et renvoie le jeton en clair (affiché une seule fois). */
  const createLink = async (label: string, email: string | null, company: string, months = 12): Promise<string> => {
    const token = b64url(crypto.getRandomValues(new Uint8Array(32)));
    const expires = new Date();
    expires.setMonth(expires.getMonth() + months);
    const { error } = await db.from('accountant_links').insert({ license_id: licenseId, label, email, company, token_hash: await sha256Hex(token), expires_at: expires.toISOString() });
    if (error) throw new Error(error.message);
    await qc.invalidateQueries({ queryKey: linksKey });
    return token;
  };
  const revokeLink = async (id: string) => {
    const { error } = await db.from('accountant_links').update({ revoked_at: new Date().toISOString() }).eq('id', id);
    if (error) throw new Error(error.message);
    await qc.invalidateQueries({ queryKey: linksKey });
  };

  /** Dépose le dossier du mois (remplace l'ancien dossier du même mois). */
  const uploadExport = async (period: string, zip: Uint8Array, contents: { label: string; count: number }[]) => {
    const path = `${licenseId}/${period}/dossier-comptable-${period}-${Date.now()}.zip`;
    const { error: upErr } = await supabase.storage.from(ACCOUNTING_BUCKET).upload(path, new Blob([zip as BlobPart], { type: 'application/zip' }), { contentType: 'application/zip', upsert: false });
    if (upErr) throw new Error(upErr.message);
    const old = (exports.data ?? []).filter((e) => e.period === period);
    const { error } = await db.from('accounting_exports').insert({ license_id: licenseId, period, path, size: zip.length, contents });
    if (error) throw new Error(error.message);
    if (old.length) {
      await supabase.storage.from(ACCOUNTING_BUCKET).remove(old.map((o) => o.path));
      await db.from('accounting_exports').delete().in('id', old.map((o) => o.id));
    }
    await qc.invalidateQueries({ queryKey: exportsKey });
  };
  const downloadUrl = async (path: string) => {
    const { data, error } = await supabase.storage.from(ACCOUNTING_BUCKET).createSignedUrl(path, 300);
    if (error || !data) throw new Error(error?.message || 'Lien indisponible');
    return data.signedUrl;
  };

  return {
    links: links.data ?? [],
    exports: exports.data ?? [],
    loading: links.isLoading || exports.isLoading,
    error: (links.error || exports.error) as Error | null,
    createLink,
    revokeLink,
    uploadExport,
    downloadUrl,
  };
}
