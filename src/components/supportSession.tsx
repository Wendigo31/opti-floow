import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { LogoLoader, type LoaderApp } from '@/components/LogoLoader';

/**
 * Session support ouverte depuis OptiCentral (« Ouvrir sa session »).
 *
 * OptiCentral crée un jeton à usage unique valable 3 minutes (fonction SQL
 * central_support_session) et ouvre /support-session#t=<jeton>. Cette page échange le jeton
 * contre une vraie session de l'utilisateur (fonction support-session, côté serveur), puis
 * recharge le logiciel : on voit exactement ce que voit l'utilisateur, avec ses droits.
 * Un bandeau rappelle qu'on est dans la session de quelqu'un d'autre ; elle se ferme seule
 * au bout de 2 heures.
 *
 * Fichier partagé (bridge/shared/support-session) — le même dans les trois logiciels.
 */
export const SUPPORT_SESSION_KEY = 'opti-support-session';
const DURATION_MS = 2 * 60 * 60 * 1000;

type Marker = { email: string; admin: string | null; until: number };

export const isSupportSessionPath = () =>
  typeof window !== 'undefined' && window.location.pathname === '/support-session';

function readMarker(): Marker | null {
  try {
    const m = JSON.parse(localStorage.getItem(SUPPORT_SESSION_KEY) || 'null') as Marker | null;
    return m && typeof m.until === 'number' ? m : null;
  } catch {
    return null;
  }
}

/** Page /support-session : échange le jeton contre la session de l'utilisateur. */
export function SupportSessionStart({ app }: { app: LoaderApp }) {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = new URLSearchParams(window.location.hash.slice(1)).get('t') ?? '';
    // Le jeton ne doit pas rester dans l'historique ni dans la barre d'adresse.
    window.history.replaceState(null, '', '/support-session');
    if (!/^[0-9a-f]{64}$/.test(token)) {
      setError('Lien de session invalide. Relancez « Ouvrir sa session » depuis OptiCentral.');
      return;
    }
    (async () => {
      try {
        // On quitte d'abord une éventuelle session déjà ouverte dans ce navigateur.
        await supabase.auth.signOut().catch(() => undefined);
        const { data, error: fnError } = await supabase.functions.invoke('support-session', {
          body: { token },
        });
        if (fnError || !data?.token_hash) {
          throw new Error(data?.error || 'Lien expiré ou déjà utilisé.');
        }
        const { error: otpError } = await supabase.auth.verifyOtp({
          token_hash: data.token_hash,
          type: 'magiclink',
        });
        if (otpError) throw new Error(otpError.message);
        localStorage.setItem(
          SUPPORT_SESSION_KEY,
          JSON.stringify({
            email: data.email,
            admin: data.admin_email ?? null,
            until: Date.now() + DURATION_MS,
          } satisfies Marker),
        );
        window.location.replace('/');
      } catch (e) {
        setError(
          `${(e as Error).message || 'Ouverture impossible.'} Relancez « Ouvrir sa session » depuis OptiCentral (le lien n'est valable que 3 minutes et une seule fois).`,
        );
      }
    })();
  }, []);

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-6 text-center">
        <p className="max-w-md text-sm text-foreground">{error}</p>
        <a href="/" className="text-sm font-medium text-primary underline">
          Retour à l'accueil
        </a>
      </div>
    );
  }
  return <LogoLoader app={app} label="Ouverture de la session support…" />;
}

async function endSupportSession() {
  localStorage.removeItem(SUPPORT_SESSION_KEY);
  await supabase.auth.signOut().catch(() => undefined);
  window.location.replace('/');
}

/** Bandeau affiché tant qu'on est dans la session d'un utilisateur. */
export function SupportSessionBanner() {
  const [marker, setMarker] = useState<Marker | null>(() => readMarker());
  const [left, setLeft] = useState('');

  useEffect(() => {
    if (!marker) return;
    const tick = () => {
      const ms = marker.until - Date.now();
      if (ms <= 0) {
        void endSupportSession();
        return;
      }
      const h = Math.floor(ms / 3_600_000);
      const m = Math.floor((ms % 3_600_000) / 60_000);
      setLeft(`${h} h ${String(m).padStart(2, '0')}`);
    };
    tick();
    const id = setInterval(tick, 30_000);
    // Si l'utilisateur se déconnecte depuis le logiciel, le bandeau disparaît.
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        localStorage.removeItem(SUPPORT_SESSION_KEY);
        setMarker(null);
      }
    });
    return () => {
      clearInterval(id);
      data.subscription.unsubscribe();
    };
  }, [marker]);

  if (!marker || isSupportSessionPath()) return null;
  return (
    <div
      role="status"
      className="fixed bottom-3 left-1/2 z-[200] flex max-w-[calc(100vw-24px)] -translate-x-1/2 items-center gap-3 rounded-full border border-amber-600/40 bg-amber-400 px-4 py-2 text-xs font-medium text-amber-950 shadow-lg sm:text-sm"
    >
      <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-red-600" aria-hidden="true" />
      <span className="truncate">
        Session support — vous êtes connecté en tant que <strong>{marker.email}</strong>
        {left && <span className="opacity-75"> · {left}</span>}
      </span>
      <button
        type="button"
        onClick={() => void endSupportSession()}
        className="shrink-0 rounded-full bg-amber-950 px-3 py-1 text-xs font-semibold text-amber-50 hover:bg-amber-900"
      >
        Quitter
      </button>
    </div>
  );
}
