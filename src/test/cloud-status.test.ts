// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { QueryClient } from '@tanstack/react-query';

const toasts: string[] = [];
vi.mock('sonner', () => ({ toast: { success: (m: string) => toasts.push(m), error: (m: string) => toasts.push(m) } }));

import { cloudActivity, getCloudState, installCloudStatus, sinceText } from '@/lib/cloudStatus';

describe('cloud commun aux 3 logiciels', () => {
  it('suit les échanges, la session et le réseau', async () => {
    const qc = new QueryClient();
    let auth: (e: string, s: unknown) => void = () => undefined;
    const supabase = { auth: { onAuthStateChange: (cb: typeof auth) => ((auth = cb), { data: { subscription: { unsubscribe() {} } } }) } };
    installCloudStatus(qc, supabase as never);

    // Session déjà ouverte à l'ouverture : message « Session restaurée » une seule fois.
    auth('INITIAL_SESSION', { user: { email: 'marie@transports.fr' } });
    expect(toasts).toContain('Session restaurée');
    auth('TOKEN_REFRESHED', { user: { email: 'marie@transports.fr' } });
    expect(toasts.filter((t) => t === 'Session restaurée')).toHaveLength(1);

    // Activité propre au logiciel.
    const end = cloudActivity.begin();
    expect(getCloudState().pending).toBe(1);
    end();
    end();
    expect(getCloudState().pending).toBe(0);

    // Lecture React Query réussie : dernière synchro mise à jour.
    await qc.fetchQuery({ queryKey: ['x'], queryFn: async () => 1 });
    expect(getCloudState().lastSyncAt).not.toBeNull();

    // Échec d'enregistrement puis succès.
    await qc.getMutationCache().build(qc, { mutationFn: async () => { throw new Error('rls'); }, retry: false }).execute(undefined).catch(() => undefined);
    expect(getCloudState().error).toMatch(/pas pu être enregistrée/);
    await qc.getMutationCache().build(qc, { mutationFn: async () => 1 }).execute(undefined);
    expect(getCloudState().error).toBeNull();

    // Hors ligne puis retour du réseau.
    window.dispatchEvent(new Event('offline'));
    expect(getCloudState().online).toBe(false);
    window.dispatchEvent(new Event('online'));
    expect(getCloudState().online).toBe(true);
    expect(toasts).toContain('Connexion rétablie');

    // Session perdue (jeton expiré), puis reconnexion.
    auth('SIGNED_OUT', null);
    expect(getCloudState().sessionLost).toBe(true);
    auth('SIGNED_IN', { user: { email: 'marie@transports.fr' } });
    expect(getCloudState().sessionLost).toBe(false);
  });

  it('« il y a… »', () => {
    const now = 1_800_000_000_000;
    expect(sinceText(null, now)).toBe('pas encore');
    expect(sinceText(now - 3_000, now)).toBe("à l'instant");
    expect(sinceText(now - 125_000, now)).toBe('il y a 2 min');
    expect(sinceText(now - 3 * 3_600_000, now)).toBe('il y a 3 h');
  });
});
