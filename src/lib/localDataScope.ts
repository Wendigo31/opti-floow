/**
 * Données gardées sur l'appareil (cache, brouillons) — identique dans OptiFlow, OptiFret et
 * OptiXpress. Elles appartiennent à une société : quand une autre société se connecte sur le
 * même navigateur (nouveau compte, changement de compte), elles sont effacées pour ne jamais
 * afficher les données de la société précédente. Les réglages de l'appareil sont gardés.
 */
const OWNER_KEY = 'opti-data-owner';

/** Réglages de l'appareil et session : jamais effacés. */
const KEEP =
  /^(sb-|opti-theme$|opti-data-owner$|opti-session)|theme$|sidebar|tutorial|download|licen[cs]e|impersonation|density|cache_version|cache_cleared|notification_prefs|category_tabs_collapsed|central_announcement/i;

const keysOf = (s: Storage): string[] => {
  const out: string[] = [];
  for (let i = 0; i < s.length; i++) {
    const k = s.key(i);
    if (k != null) out.push(k);
  }
  return out;
};

export function clearCompanyLocalData(keepLicenseId?: string): number {
  let n = 0;
  try {
    for (const k of keysOf(localStorage)) {
      if (KEEP.test(k)) continue;
      // Données déjà rangées sous l'identifiant de la société connectée : ce sont les siennes.
      if (keepLicenseId && k.includes(keepLicenseId)) continue;
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

/**
 * À appeler dès que la société connectée est connue. Renvoie true si des données d'une autre
 * société ont été effacées (la page est alors rechargée pour repartir de zéro).
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
  // Première fois (ancienne version sans propriétaire) ou autre société : on repart à zéro.
  const removed = clearCompanyLocalData(licenseId);
  if (removed > 0 && reload && typeof window !== 'undefined') {
    window.location.reload();
    return true;
  }
  return removed > 0;
}
