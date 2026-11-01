/**
 * Adresse e-mail transmise par opti-group.fr (« Se connecter » → ?email=…).
 * Gardée pour la session puis retirée de l'adresse, elle pré-remplit le
 * champ « Email ou identifiant » de la page de connexion.
 */
const KEY = 'login_hint';
const valid = (v: string) => /^[^\s@]{1,64}@[^\s@]{1,190}$/.test(v) || /^[a-z0-9._-]{2,64}$/i.test(v);

export function captureLoginHint(): void {
  try {
    const url = new URL(window.location.href);
    const v = (url.searchParams.get('email') || '').trim();
    if (!v) return;
    if (valid(v)) sessionStorage.setItem(KEY, v);
    url.searchParams.delete('email');
    window.history.replaceState(window.history.state, '', url.toString());
  } catch {
    /* stockage indisponible : le champ reste vide */
  }
}

export function readLoginHint(): string {
  try {
    return sessionStorage.getItem(KEY) || '';
  } catch {
    return '';
  }
}
