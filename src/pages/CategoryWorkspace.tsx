import { lazy, Suspense, type ComponentType, type LazyExoticComponent } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useVisibleNavigation } from '@/hooks/useVisibleNavigation';

// Pages existantes, affichées en onglets dans l'espace de leur catégorie.
const PAGE_COMPONENTS: Record<string, LazyExoticComponent<ComponentType>> = {
  '/planning': lazy(() => import('./Planning')),
  '/tours': lazy(() => import('./Tours')),
  '/line-montage': lazy(() => import('./LineMontage')),
  '/clients': lazy(() => import('./Clients')),
  '/vehicles': lazy(() => import('./Vehicles')),
  '/itinerary': lazy(() => import('./Itinerary')),
  '/ai-analysis': lazy(() => import('./AIAnalysis')),
  '/charges': lazy(() => import('./Charges')),
  '/drivers': lazy(() => import('./Drivers')),
  '/team': lazy(() => import('./Team')),
  '/calculator': lazy(() => import('./CalculatorWithHistory')),
  '/dashboard': lazy(() => import('./Dashboard')),
  '/forecast': lazy(() => import('./Forecast')),
  '/vehicle-reports': lazy(() => import('./VehicleReports')),
  '/settings': lazy(() => import('./Settings')),
  '/my-restrictions': lazy(() => import('./MyRestrictions')),
  '/history': lazy(() => import('./TripHistory')),
  '/tenders': lazy(() => import('./Tenders')),
  '/install': lazy(() => import('./Install')),
};

export default function CategoryWorkspace() {
  const { categoryId } = useParams();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const categories = useVisibleNavigation();
  const category = categories.find((c) => c.id === categoryId);

  if (!category) {
    return (
      <div className="flex flex-col items-center gap-4 py-20 text-center">
        <p className="text-muted-foreground">Cette catégorie n'est pas accessible pour votre compte.</p>
        <Button variant="outline" onClick={() => navigate('/')}>Retour à l'accueil</Button>
      </div>
    );
  }

  const requested = params.get('tab');
  const active = category.pages.some((p) => p.to === requested) ? requested! : category.pages[0].to;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/')} aria-label="Retour à l'accueil">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <category.icon className="h-5 w-5" />
        </div>
        <h1 className="text-2xl font-semibold text-foreground">{category.label}</h1>
      </div>

      <Tabs value={active} onValueChange={(v) => setParams({ tab: v }, { replace: true })}>
        <TabsList className="h-auto flex-wrap justify-start">
          {category.pages.map((page) => (
            <TabsTrigger key={page.to} value={page.to} className="gap-2">
              <page.icon className="h-4 w-4" />
              {page.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {category.pages.map((page) => {
          const PageComponent = PAGE_COMPONENTS[page.to];
          return (
            <TabsContent key={page.to} value={page.to} className="mt-4">
              {page.to === active && PageComponent && (
                <Suspense fallback={<div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>}>
                  <PageComponent />
                </Suspense>
              )}
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
