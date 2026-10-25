/**
 * État du cloud — identique dans OptiFlow, OptiFret et OptiXpress.
 * Une seule source pour l'indicateur de la barre du haut, le bandeau hors ligne
 * et les messages (session restaurée, connexion rétablie, session expirée).
 *
 * Alimenté automatiquement par React Query (lectures / enregistrements), par
 * l'état du réseau et par la session Supabase ; les synchronisations propres à
 * un logiciel s'y déclarent avec cloudActivity.
 */
import { useSyncExternalStore } from 'react';
import type { QueryClient } from '@tanstack/react-query';
import type { SupabaseClient } from '@supabase/supabase-js';
import { toast } from 'sonner';

export type CloudState = {
  online: boolean;
  /** Envois / lectures en cours. */
  pending: number;
  /** Enregistrements en attente (mis en pause hors ligne, envoyés au retour du réseau). */
  waiting: number;
  lastSyncAt: number | null;
  error: string | null;
  sessionLost: boolean;
};

let state: CloudState = {
  online: typeof navigator === 'undefined' ? true : navigator.onLine,
  pending: 0,
  waiting: 0,
  lastSyncAt: null,
  error: null,
  sessionLost: false,
};
const listeners = new Set<() => void>();
const set = (patch: Partial<CloudState>) => {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
};
let custom = 0;
let rqPending = 0;

/** Synchronisations propres à un logiciel (envoi local → cloud, sauvegarde de session…). */
export const cloudActivity = {
  /** Début d'un échange avec le cloud ; appeler la fonction renvoyée à la fin. */
  begin(): () => void {
    custom++;
    set({ pending: rqPending + custom });
    let done = false;
    return () => {
      if (done) return;
      done = true;
      custom = Math.max(0, custom - 1);
      set({ pending: rqPending + custom });
    };
  },
  synced(at: number = Date.now()) {
    set({ lastSyncAt: at, error: null });
  },
  failed(message: string) {
    set({ error: message });
  },
  sessionLost(lost = true) {
    set({ sessionLost: lost });
  },
};

export const getCloudState = () => state;

export function useCloudState(): CloudState {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
    () => state,
  );
}

const RESTORED_KEY = 'opti-session-restored';
let installed = false;

/** À appeler une fois au démarrage (App), avec le client React Query et le client Supabase. */
export function installCloudStatus(queryClient: QueryClient, supabase: SupabaseClient): void {
  if (installed || typeof window === 'undefined') return;
  installed = true;

  window.addEventListener('offline', () => set({ online: false }));
  window.addEventListener('online', () => {
    set({ online: true });
    const waiting = queryClient.getMutationCache().getAll().filter((m) => m.state.isPaused).length;
    toast.success('Connexion rétablie', {
      id: 'opti-cloud-online',
      description: waiting
        ? `Envoi de ${waiting} modification${waiting > 1 ? 's' : ''} restée${waiting > 1 ? 's' : ''} en attente…`
        : 'Les données sont de nouveau synchronisées.',
    });
    void queryClient.resumePausedMutations();
    void queryClient.invalidateQueries();
  });

  const recount = () => {
    const muts = queryClient.getMutationCache().getAll();
    const fetching = queryClient.isFetching();
    const running = muts.filter((m) => m.state.status === 'pending' && !m.state.isPaused).length;
    rqPending = fetching + running;
    set({ pending: rqPending + custom, waiting: muts.filter((m) => m.state.isPaused).length });
  };
  queryClient.getMutationCache().subscribe((e) => {
    recount();
    if (e.type !== 'updated') return;
    if (e.action.type === 'success') cloudActivity.synced();
    if (e.action.type === 'error') set({ error: 'Une modification n’a pas pu être enregistrée.' });
  });
  queryClient.getQueryCache().subscribe((e) => {
    recount();
    if (e.type === 'updated' && e.action.type === 'success') set({ lastSyncAt: Date.now() });
  });

  let hadSession = false;
  supabase.auth.onAuthStateChange((event, session) => {
    if (session) {
      if (state.sessionLost) set({ sessionLost: false });
      if (event === 'INITIAL_SESSION' && !hadSession) {
        // Une seule fois par onglet : ouverture du logiciel avec une session déjà ouverte.
        let shown = false;
        try {
          shown = sessionStorage.getItem(RESTORED_KEY) === '1';
          sessionStorage.setItem(RESTORED_KEY, '1');
        } catch {
          /* stockage indisponible */
        }
        if (!shown) {
          const who = session.user.email ? session.user.email.split('@')[0] : '';
          toast.success('Session restaurée', {
            id: 'opti-session-restored',
            description: `Reconnecté automatiquement${who ? ` (${who})` : ''} : vos données arrivent depuis le cloud.`,
            duration: 3500,
          });
        }
      }
      hadSession = true;
      cloudActivity.synced();
    } else if (event === 'SIGNED_OUT' && hadSession) {
      hadSession = false;
      cloudActivity.sessionLost(true);
      try {
        sessionStorage.removeItem(RESTORED_KEY);
      } catch {
        /* stockage indisponible */
      }
    }
  });
}

/** « il y a 2 min » */
export function sinceText(at: number | null, now = Date.now()): string {
  if (!at) return 'pas encore';
  const s = Math.max(0, Math.round((now - at) / 1000));
  if (s < 10) return "à l'instant";
  if (s < 60) return `il y a ${s} s`;
  const m = Math.round(s / 60);
  if (m < 60) return `il y a ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `il y a ${h} h`;
  return new Date(at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}
