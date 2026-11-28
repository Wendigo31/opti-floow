import { useEffect, useState } from 'react';
import { setVisibleInterval } from '@/lib/visibleInterval';

const URL_BASE = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

/** true = serveur joignable ; false = en pause ou injoignable (réseau coupé compris). */
async function backendUp(): Promise<boolean> {
  if (!URL_BASE || !KEY) return true;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return false;
  try {
    const r = await fetch(`${URL_BASE}/auth/v1/health`, { headers: { apikey: KEY }, cache: 'no-store' });
    return r.status < 500;
  } catch {
    return false;
  }
}

/**
 * Bandeau affiché quand le serveur (base, connexion) ne répond pas — par exemple quand
 * l'hébergement est en pause. Un seul contrôle au démarrage ; ensuite, seulement pendant
 * la panne, un nouvel essai toutes les 2 minutes (onglet visible) pour retirer le bandeau.
 */
export function BackendDownBanner() {
  const [down, setDown] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void backendUp().then((up) => { if (!cancelled) setDown(!up); });
    const onOffline = () => setDown(true);
    const onOnline = () => void backendUp().then((up) => { if (!cancelled) setDown(!up); });
    window.addEventListener('offline', onOffline);
    window.addEventListener('online', onOnline);
    return () => {
      cancelled = true;
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('online', onOnline);
    };
  }, []);

  useEffect(() => {
    if (!down) return;
    return setVisibleInterval(() => {
      void backendUp().then((up) => { if (up) setDown(false); });
    }, 2 * 60_000);
  }, [down]);

  if (!down) return null;
  return (
    <div
      role="alert"
      className="fixed inset-x-0 top-0 z-[100] bg-amber-500 px-4 py-2 text-center text-sm font-medium text-black shadow"
    >
      Service momentanément indisponible : vos données ne peuvent pas être chargées pour le moment. Réessayez un peu plus tard.
    </div>
  );
}
