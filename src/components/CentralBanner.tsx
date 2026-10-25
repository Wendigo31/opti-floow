import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Info, AlertTriangle, Wrench, X } from 'lucide-react';
import { trackPageView, useCentralAnnouncements } from '@/lib/companyAccess';

/**
 * Bandeau des messages envoyés depuis OptiCentral (ex. « Mise à jour ce soir
 * à 22 h ») + enregistrement des onglets ouverts par la société.
 * Identique dans OptiFlow, OptiFret et OptiXpress.
 */
const STYLES = {
  info: { cls: 'bg-sky-600 text-white', Icon: Info },
  warning: { cls: 'bg-amber-500 text-black', Icon: AlertTriangle },
  maintenance: { cls: 'bg-red-600 text-white', Icon: Wrench },
} as const;

const DISMISS_KEY = 'central-banner-dismissed';

function readDismissed(): string[] {
  try {
    return JSON.parse(sessionStorage.getItem(DISMISS_KEY) || '[]');
  } catch {
    return [];
  }
}

export function CentralBanner({ licenseId }: { licenseId: string | null | undefined }) {
  const location = useLocation();
  const announcements = useCentralAnnouncements(licenseId);
  const [dismissed, setDismissed] = useState<string[]>(readDismissed);

  useEffect(() => {
    trackPageView(licenseId, location.pathname);
  }, [licenseId, location.pathname]);

  const visible = announcements.filter((a) => a.level === 'maintenance' || !dismissed.includes(a.id));
  if (visible.length === 0) return null;

  const dismiss = (id: string) => {
    const next = [...dismissed, id];
    setDismissed(next);
    try {
      sessionStorage.setItem(DISMISS_KEY, JSON.stringify(next));
    } catch {
      /* stockage indisponible : le bandeau reviendra au prochain chargement */
    }
  };

  return (
    <div className="sticky top-0 z-[60]" role="status">
      {visible.map((a) => {
        const s = STYLES[a.level] ?? STYLES.info;
        return (
          <div key={a.id} className={`${s.cls} flex items-center gap-2 px-4 py-2 text-sm`}>
            <s.Icon className="h-4 w-4 shrink-0" />
            <span className="flex-1">{a.message}</span>
            {a.level !== 'maintenance' && (
              <button type="button" onClick={() => dismiss(a.id)} aria-label="Masquer ce message" className="rounded p-1 opacity-80 hover:opacity-100">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
