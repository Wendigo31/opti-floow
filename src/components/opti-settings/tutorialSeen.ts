/**
 * Tutoriel de premier lancement : « déjà vu » gardé dans le navigateur ET sur le
 * compte de la personne (Paramètres communs), pour qu'il n'apparaisse qu'une fois,
 * même après une déconnexion, un autre navigateur ou un nettoyage du cache.
 * Fichier partagé : bridge/shared/settings.
 */
import { getSettings, setMemberPreferences } from '@/components/opti-settings/optiSettingsApi';

const read = (key: string) => {
  try {
    return localStorage.getItem(key) === 'true';
  } catch {
    return false;
  }
};
const write = (key: string) => {
  try {
    localStorage.setItem(key, 'true');
  } catch {
    /* stockage indisponible */
  }
};

/** Vrai seulement si ni ce navigateur ni le compte n'ont déjà vu cette version du tutoriel. */
export async function shouldShowTutorial(localKey: string, version = 'v2'): Promise<boolean> {
  if (read(localKey)) return false;
  try {
    const s = await getSettings();
    if (s.member?.tutorial_seen === version) {
      write(localKey);
      return false;
    }
  } catch {
    /* hors ligne ou compte sans société : on s'en tient au navigateur */
  }
  return true;
}

export function markTutorialSeen(localKey: string, version = 'v2'): void {
  write(localKey);
  setMemberPreferences({ tutorial_seen: version }).catch(() => {
    /* sera retenté à la prochaine fermeture */
  });
}
