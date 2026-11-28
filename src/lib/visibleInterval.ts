/**
 * Comme setInterval, mais sans rien lancer quand l'onglet est caché (onglet en arrière-plan,
 * écran verrouillé, appli réduite) : chaque appel réveille la base et coûte des crédits Lovable.
 * Au retour sur l'onglet, un passage est fait tout de suite si le dernier date de plus d'un intervalle.
 * Renvoie la fonction d'arrêt.
 */
export function setVisibleInterval(fn: () => void, ms: number): () => void {
  let last = Date.now();
  const visible = () => typeof document === 'undefined' || document.visibilityState === 'visible';
  const run = () => {
    last = Date.now();
    fn();
  };
  const id = setInterval(() => {
    if (visible()) run();
  }, ms);
  const onVisible = () => {
    if (visible() && Date.now() - last >= ms) run();
  };
  if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onVisible);
  return () => {
    clearInterval(id);
    if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onVisible);
  };
}
