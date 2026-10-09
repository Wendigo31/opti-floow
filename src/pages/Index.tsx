import { useNavigate } from 'react-router-dom';
import { useVisibleNavigation } from '@/hooks/useVisibleNavigation';
import type { NavCategoryId } from '@/config/appNavigation';

/**
 * Palette par catégorie : chaque espace reçoit une couleur d'accent propre pour être
 * reconnaissable d'un coup d'œil. Teintes alignées sur le système de couleurs de marque
 * (mêmes couples saturation/luminosité que --chart-1..5 et --warning dans src/index.css),
 * sauf "rentabilite" qui introduit un vert émeraude distinct du vert RH pour rester lisible.
 */
const CATEGORY_ACCENT: Record<NavCategoryId, { from: string; to: string }> = {
  exploitation: { from: 'hsl(175 85% 42%)', to: 'hsl(175 85% 30%)' },
  geoloc: { from: 'hsl(200 80% 55%)', to: 'hsl(200 80% 40%)' },
  comptabilite: { from: 'hsl(24 95% 58%)', to: 'hsl(24 90% 45%)' },
  rh: { from: 'hsl(158 70% 48%)', to: 'hsl(158 70% 35%)' },
  parc: { from: 'hsl(210 45% 55%)', to: 'hsl(210 45% 38%)' },
  'appels-offres': { from: 'hsl(38 92% 55%)', to: 'hsl(32 92% 45%)' },
  rentabilite: { from: 'hsl(142 65% 46%)', to: 'hsl(142 65% 32%)' },
};

/** Accueil post-connexion : les icônes des catégories, centrées à l'écran. */
const Index = () => {
  const navigate = useNavigate();
  const categories = useVisibleNavigation();

  return (
    <div className="relative flex min-h-[calc(100dvh-7rem)] flex-col items-center justify-center overflow-hidden">
      {/* Halos de fond discrets, aux couleurs de la marque — purement décoratifs */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-1/4 top-1/3 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute right-1/4 bottom-1/3 h-80 w-80 translate-x-1/2 translate-y-1/2 rounded-full bg-secondary/10 blur-3xl" />
      </div>

      <div className="flex -translate-y-16 flex-col items-center gap-10">
        <div className="flex flex-col items-center gap-2 text-center animate-in fade-in slide-in-from-top-2 duration-500">
          <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">Choisissez votre espace</h1>
          <span className="h-1 w-14 rounded-full bg-gradient-to-r from-primary to-secondary" />
        </div>

        <div className="flex w-full max-w-5xl flex-wrap items-stretch justify-center gap-5 sm:gap-6">
          {categories.map((category, index) => {
            const accent = CATEGORY_ACCENT[category.id] ?? CATEGORY_ACCENT.exploitation;
            return (
              <button
                key={category.id}
                onClick={() => navigate(`/espace/${category.id}`)}
                style={{ animationDelay: `${index * 70}ms`, animationFillMode: 'backwards' }}
                className="group relative flex w-full max-w-[200px] animate-in fade-in slide-in-from-bottom-3 flex-col items-center gap-4 overflow-hidden rounded-2xl border border-border/70 bg-card p-7 shadow-sm duration-500 ease-out transition-[transform,box-shadow,border-color] hover:-translate-y-1.5 hover:border-transparent hover:shadow-xl focus-visible:-translate-y-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:w-[13rem]"
              >
                {/* Lueur colorée au survol, propre à la catégorie */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                  style={{ background: `radial-gradient(120px 120px at 50% 0%, ${accent.from}22, transparent 70%)` }}
                />

                <div className="relative flex h-16 w-16 items-center justify-center">
                  {/* Anneau qui se propage au survol, propre à la catégorie */}
                  <span
                    aria-hidden="true"
                    className="absolute inset-0 hidden rounded-2xl opacity-0 group-hover:block group-hover:animate-ring-pop"
                    style={{ backgroundColor: accent.from }}
                  />
                  <div
                    className="relative flex h-16 w-16 items-center justify-center rounded-2xl text-white shadow-md transition-shadow duration-300 ease-out group-hover:shadow-lg group-hover:animate-icon-pop"
                    style={{ background: `linear-gradient(135deg, ${accent.from}, ${accent.to})` }}
                  >
                    <category.icon className="h-8 w-8" strokeWidth={2} />
                  </div>
                </div>

                <span className="relative text-center text-sm font-semibold leading-tight text-foreground sm:text-base">
                  {category.label}
                </span>

                <span
                  className="relative h-0.5 w-8 rounded-full transition-all duration-300 ease-out group-hover:w-12"
                  style={{ backgroundColor: accent.from }}
                />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Index;
