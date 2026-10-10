import type { NavCategoryId } from '@/config/appNavigation';

/**
 * Palette par catégorie : chaque espace reçoit une couleur d'accent propre pour être
 * reconnaissable d'un coup d'œil. Teintes alignées sur le système de couleurs de marque
 * (mêmes couples saturation/luminosité que --chart-1..5 et --warning dans src/index.css),
 * sauf "rentabilite" qui introduit un vert émeraude distinct du vert RH pour rester lisible.
 *
 * Source unique partagée entre l'accueil (Index.tsx) et le tutoriel de premier lancement
 * (TutorialDialog.tsx), pour que les deux restent visuellement cohérents.
 */
export const CATEGORY_ACCENT: Record<NavCategoryId, { from: string; to: string }> = {
  exploitation: { from: 'hsl(175 85% 42%)', to: 'hsl(175 85% 30%)' },
  geoloc: { from: 'hsl(200 80% 55%)', to: 'hsl(200 80% 40%)' },
  comptabilite: { from: 'hsl(24 95% 58%)', to: 'hsl(24 90% 45%)' },
  rh: { from: 'hsl(158 70% 48%)', to: 'hsl(158 70% 35%)' },
  parc: { from: 'hsl(210 45% 55%)', to: 'hsl(210 45% 38%)' },
  'appels-offres': { from: 'hsl(38 92% 55%)', to: 'hsl(32 92% 45%)' },
  rentabilite: { from: 'hsl(142 65% 46%)', to: 'hsl(142 65% 32%)' },
};
