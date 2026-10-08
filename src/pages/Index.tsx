import { useNavigate } from 'react-router-dom';
import { useVisibleNavigation } from '@/hooks/useVisibleNavigation';

/** Accueil post-connexion : les icônes des catégories, centrées à l'écran. */
const Index = () => {
  const navigate = useNavigate();
  const categories = useVisibleNavigation();

  return (
    <div className="flex min-h-[calc(100dvh-7rem)] flex-col items-center justify-center">
      <div className="flex -translate-y-16 flex-col items-center gap-8">
        <h1 className="text-center text-2xl font-semibold text-foreground">Choisissez votre espace</h1>
        <div className="flex w-full max-w-5xl flex-wrap items-stretch justify-center gap-6">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => navigate(`/espace/${category.id}`)}
              className="group flex w-full max-w-[220px] flex-col items-center gap-4 rounded-2xl border border-border bg-card p-8 transition-all hover:-translate-y-1 hover:border-primary hover:shadow-lg sm:w-52"
            >
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/15 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <category.icon className="h-10 w-10" />
              </div>
              <span className="text-center font-medium text-foreground">{category.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Index;
