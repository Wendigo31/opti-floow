import { lazy, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Layers, Loader2, Navigation } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLicense } from '@/hooks/useLicense';
import { useLicenseContext } from '@/context/LicenseContext';
import { isPathHidden, useCompanyAccess } from '@/lib/companyAccess';

const Itinerary = lazy(() => import('./Itinerary'));
const LineMontage = lazy(() => import('./LineMontage'));

/**
 * Itinéraire et Création de ligne réunis dans un seul onglet (demande nov. 2026 :
 * « ce sont en soi la même chose »). La création de ligne reste soumise au forfait
 * (fonction ai_optimization) et au masquage d'onglet décidé dans OptiCentral.
 */
export default function ItineraryAndLines() {
  const [params, setParams] = useSearchParams();
  const { hasFeature } = useLicense();
  const { licenseId } = useLicenseContext();
  const { access } = useCompanyAccess(licenseId);
  const linesOpen = hasFeature('ai_optimization') && !isPathHidden(access.hidden_pages, '/line-montage');
  const view = linesOpen && params.get('vue') === 'ligne' ? 'ligne' : 'itineraire';
  const setView = (v: string) => {
    const next = new URLSearchParams(params);
    if (v === 'ligne') next.set('vue', 'ligne');
    else next.delete('vue');
    setParams(next, { replace: true });
  };
  const fallback = (
    <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
  );

  if (!linesOpen) {
    return <Suspense fallback={fallback}><Itinerary /></Suspense>;
  }
  return (
    <Tabs value={view} onValueChange={setView} className="space-y-4">
      <TabsList>
        <TabsTrigger value="itineraire" className="gap-1.5"><Navigation className="h-4 w-4" /> Itinéraire</TabsTrigger>
        <TabsTrigger value="ligne" className="gap-1.5"><Layers className="h-4 w-4" /> Création de ligne</TabsTrigger>
      </TabsList>
      <TabsContent value="itineraire" className="mt-0">
        <Suspense fallback={fallback}><Itinerary /></Suspense>
      </TabsContent>
      <TabsContent value="ligne" className="mt-0">
        <Suspense fallback={fallback}><LineMontage /></Suspense>
      </TabsContent>
    </Tabs>
  );
}
