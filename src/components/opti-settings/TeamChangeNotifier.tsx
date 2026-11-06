/**
 * Notifications des modifications faites par les autres membres de l'équipe
 * (fichier partagé : bridge/shared/settings). Monté une fois dans le logiciel :
 * toutes les minutes, si la personne l'a activé dans Paramètres › Mon App,
 * affiche « Marc Dupont a modifié le client « Transports X » ».
 */
import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { describeActivity, getSettings, teamActivity } from '@/components/opti-settings/optiSettingsApi';

const EVERY_MS = 60_000;
const KEY = 'opti-team-activity-since';

// Le point de départ survit au changement de page (la mise en page est remontée à chaque écran).
function readSince(): string {
  try {
    const v = sessionStorage.getItem(KEY);
    if (v && Date.now() - new Date(v).getTime() < 3_600_000) return v;
  } catch { /* stockage indisponible */ }
  return new Date().toISOString();
}
function writeSince(v: string) {
  try { sessionStorage.setItem(KEY, v); } catch { /* stockage indisponible */ }
}

export function TeamChangeNotifier({ enabled }: { enabled: boolean }) {
  const since = useRef<string>(readSince());
  useEffect(() => {
    if (!enabled) return;
    since.current = readSince();
    writeSince(since.current);
    let stop = false;
    let myId = '';
    let on = true;
    const tick = async () => {
      if (stop || document.visibilityState === 'hidden') return;
      try {
        const s = await getSettings();
        myId = s.me.id;
        on = s.member.notify_team_changes;
        if (!on) return;
        const rows = await teamActivity({ since: since.current, limit: 20 });
        if (rows.length) {
          since.current = rows[0].updated_at;
          writeSince(since.current);
        }
        const others = rows.filter((r) => r.member_id !== myId).reverse();
        others.slice(-5).forEach((r) => toast.info(describeActivity(r)));
        if (others.length > 5) toast.info(`… et ${others.length - 5} autre(s) modification(s) de l'équipe (Paramètres › Mon App).`);
      } catch {
        /* hors ligne ou session expirée : on réessaie à la minute suivante */
      }
    };
    const id = window.setInterval(() => void tick(), EVERY_MS);
    return () => {
      stop = true;
      window.clearInterval(id);
    };
  }, [enabled]);
  return null;
}
