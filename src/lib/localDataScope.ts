/**
 * Données gardées sur l'appareil (cache, brouillons) — identique dans OptiFlow, OptiFret et
 * OptiXpress. Elles appartiennent à une société : quand une autre société se connecte sur le
 * même navigateur (nouveau compte, changement de compte), elles sont mises de côté pour ne
 * jamais afficher les données de la société précédente. Les réglages de l'appareil sont gardés.
 *
 * Correctif 08/11/2026 :
 * - à la première ouverture après la mise à jour (aucun propriétaire enregistré), les données
 *   déjà présentes sont rattachées à la société connectée au lieu d'être effacées ;
 * - au changement de société, les données de la société précédente sont rangées dans une
 *   réserve (`opti-stash::<société>`) et restaurées quand elle se reconnecte, au lieu d'être
 *   supprimées (certaines n'existent que sur l'appareil : trajets, rapports, codes FEC…).
 */
const OWNER_KEY = 'opti-data-owner';
const STASH_PREFIX = 'opti-stash::';

/** Réglages de l'appareil, session et réserves : jamais effacés ni déplacés. */
const KEEP =
  /^(sb-|opti-theme$|opti-data-owner$|opti-session|opti-stash::)|theme$|sidebar|tutorial|download|licen[cs]e|impersonation|density|cache_version|cache_cleared|notification_prefs|category_tabs_collapsed|central_announcement/i;

const keysOf = (s: Storage): string[] => {
  const out: string[] = [];
  for (let i = 0; i < s.length; i++) {
    const k = s.key(i);
    if (k != null) out.push(k);
  }
  return out;
};

/** Clés appartenant à la société affichée (hors réglages et données déjà rangées sous keepLicenseId). */
function companyKeys(keepLicenseId?: string): string[] {
  return keysOf(localStorage).filter(
    (k) => !KEEP.test(k) && !(keepLicenseId && k.includes(keepLicenseId)),
  );
}

export function clearCompanyLocalData(keepLicenseId?: string): number {
  let n = 0;
  try {
    for (const k of companyKeys(keepLicenseId)) {
      localStorage.removeItem(k);
      n++;
    }
    for (const k of keysOf(sessionStorage)) {
      if (KEEP.test(k) || k === 'opti-session-restored') continue;
      sessionStorage.removeItem(k);
    }
  } catch {
    /* stockage indisponible */
  }
  return n;
}

/** Range les données de `owner` dans sa réserve, puis les retire de l'affichage. */
function stashCompanyData(owner: string, keepLicenseId: string): number {
  const keys = companyKeys(keepLicenseId);
  if (keys.length === 0) return 0;
  const stash: Record<string, string> = {};
  try {
    const existing = localStorage.getItem(STASH_PREFIX + owner);
    if (existing) Object.assign(stash, JSON.parse(existing));
  } catch {
    /* réserve illisible : on la reconstruit */
  }
  for (const k of keys) {
    const v = localStorage.getItem(k);
    if (v != null) stash[k] = v;
  }
  try {
    localStorage.setItem(STASH_PREFIX + owner, JSON.stringify(stash));
  } catch {
    // Plus de place : on garde les données en place plutôt que de les perdre.
    // La société connectée ne les verra pas mélangées aux siennes grâce au rechargement
    // suivant, mais rien n'est supprimé.
    return 0;
  }
  return clearCompanyLocalData(keepLicenseId);
}

/** Remet en place les données mises de côté pour cette société, s'il y en a. */
function restoreCompanyData(licenseId: string): number {
  let n = 0;
  try {
    const raw = localStorage.getItem(STASH_PREFIX + licenseId);
    if (!raw) return 0;
    const stash = JSON.parse(raw) as Record<string, string>;
    for (const [k, v] of Object.entries(stash)) {
      if (localStorage.getItem(k) == null) {
        localStorage.setItem(k, v);
        n++;
      }
    }
    localStorage.removeItem(STASH_PREFIX + licenseId);
  } catch {
    /* réserve illisible : on la laisse en place */
  }
  return n;
}

/**
 * À appeler dès que la société connectée est connue. Renvoie true si les données affichées
 * ont changé de société (la page est alors rechargée pour repartir propre).
 */
export function bindLocalDataToCompany(licenseId: string | null | undefined, reload = true): boolean {
  if (!licenseId) return false;
  let previous: string | null = null;
  try {
    previous = localStorage.getItem(OWNER_KEY);
    localStorage.setItem(OWNER_KEY, licenseId);
  } catch {
    return false;
  }
  if (previous === licenseId) return false;
  // Première ouverture après la mise à jour : les données présentes sont celles de
  // l'utilisateur qui se connecte — on les rattache à sa société, sans rien effacer.
  if (previous === null) return false;
  const moved = stashCompanyData(previous, licenseId);
  const restored = restoreCompanyData(licenseId);
  const changed = moved > 0 || restored > 0;
  if (changed && reload && typeof window !== 'undefined') {
    window.location.reload();
    return true;
  }
  return changed;
}
