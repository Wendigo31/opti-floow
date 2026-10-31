import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Info, AlertTriangle, Wrench, X } from 'lucide-react';
import { trackPageView, useCentralAnnouncements } from '@/lib/companyAccess';

/**
 * Bandeau des messages envoyés depuis OptiCentral (ex. « Mise à jour ce soir
 * à 22 h ») + enregistrement des onglets ouverts par la société.
 * Identique dans OptiFlow, OptiFret et OptiXpress.
 * Chaque message s'affiche à chaque ouverture du logiciel (y compris sur la page de
 * connexion), 60 secondes, puis disparaît seul (il peut aussi être fermé avant).
 */
const STYLES = {
  info: { cls: 'bg-sky-600 text-white', Icon: Info },
  warning: { cls: 'bg-amber-500 text-black', Icon: AlertTriangle },
  maintenance: { cls: 'bg-red-600 text-white', Icon: Wrench },
} as const;

export const ANNOUNCEMENT_SECONDS = 60;
const SEEN_KEY = 'opti-session-announcements-seen';

type Seen = Record<string, number>;
function readSeen(): Seen {
  try {
    return JSON.parse(sessionStorage.getItem(SEEN_KEY) || '{}') as Seen;
  } catch {
    return {};
  }
}
function writeSeen(s: Seen) {
  try {
    // On ne garde que les 50 derniers messages vus.
    const recent = Object.entries(s).sort((a, b) => b[1] - a[1]).slice(0, 50);
    sessionStorage.setItem(SEEN_KEY, JSON.stringify(Object.fromEntries(recent)));
  } catch {
    /* stockage indisponible : le message reviendra au prochain chargement */
  }
}

export function CentralBanner({ licenseId }: { licenseId: string | null | undefined }) {
  const location = useLocation();
  const announcements = useCentralAnnouncements(licenseId);
  const [seen, setSeen] = useState<Seen>(readSeen);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    trackPageView(licenseId, location.pathname);
  }, [licenseId, location.pathname]);

  // Première apparition de chaque message sur l'appareil : début des 60 secondes.
  useEffect(() => {
    const fresh = announcements.filter((a) => !(a.id in seen));
    if (!fresh.length) return;
    const t = Date.now();
    const next = { ...seen, ...Object.fromEntries(fresh.map((a) => [a.id, t])) };
    setSeen(next);
    writeSeen(next);
  }, [announcements, seen]);

  const visible = announcements.filter((a) => {
    const at = seen[a.id];
    return at == null || now - at < ANNOUNCEMENT_SECONDS * 1000;
  });

  useEffect(() => {
    if (!visible.length) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [visible.length]);

  if (visible.length === 0) return null;

  const dismiss = (id: string) => {
    const next = { ...seen, [id]: 0 };
    setSeen(next);
    writeSeen(next);
  };

  return (
    <div className="sticky top-0 z-[60]" role="status">
      {visible.map((a) => {
        const s = STYLES[a.level] ?? STYLES.info;
        const left = Math.max(0, ANNOUNCEMENT_SECONDS - Math.floor((now - (seen[a.id] ?? now)) / 1000));
        return (
          <div key={a.id} className={`${s.cls} relative flex items-center gap-2 px-4 py-2 text-sm`}>
            <s.Icon className="h-4 w-4 shrink-0" />
            <span className="flex-1">{a.message}</span>
            <span className="text-xs opacity-75 tabular-nums" aria-hidden>
              {left} s
            </span>
            <button type="button" onClick={() => dismiss(a.id)} aria-label="Masquer ce message" className="rounded p-1 opacity-80 hover:opacity-100">
              <X className="h-4 w-4" />
            </button>
            <span
              className="absolute bottom-0 left-0 h-0.5 bg-current opacity-40 transition-[width] duration-1000 ease-linear"
              style={{ width: `${(left / ANNOUNCEMENT_SECONDS) * 100}%` }}
            />
          </div>
        );
      })}
    </div>
  );
}
