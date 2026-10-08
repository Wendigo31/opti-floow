import { CategoryLauncher } from '@/components/navigation/CategoryLauncher';
import { useVisibleNavigation } from '@/hooks/useVisibleNavigation';
import { useLicense } from '@/hooks/useLicense';

export default function Home() {
  const categories = useVisibleNavigation();
  const { licenseData } = useLicense();

  return (
    <div className="mx-auto max-w-6xl space-y-9 py-2 lg:py-6">
      <header className="max-w-3xl">
        <p className="mb-3 text-sm font-medium text-primary">{licenseData?.companyName || 'OptiFlow'}</p>
        <h1 className="text-3xl font-bold text-foreground md:text-4xl">Votre espace de travail</h1>
        <p className="mt-3 text-muted-foreground">Choisissez une catégorie pour accéder aux outils déjà disponibles.</p>
      </header>
      <CategoryLauncher categories={categories} />
    </div>
  );
}