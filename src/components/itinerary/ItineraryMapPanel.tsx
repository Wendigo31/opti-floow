import { AlertCircle, Zap, TreePine } from 'lucide-react';
import { MapPreview } from '@/components/map/MapPreview';
import { cn } from '@/lib/utils';
import type { RouteResult } from '@/types/itinerary';

interface MapMarker {
  position: [number, number];
  label: string;
  type: 'start' | 'end' | 'stop';
}

interface RestrictionMarker {
  lat: number;
  lng: number;
  type: string;
  value: number;
  unit: string;
  description: string;
}

interface ItineraryMapPanelProps {
  markers: MapMarker[];
  routeCoordinates: [number, number][];
  restrictionMarkers: RestrictionMarker[];
  truckRestrictionsCount: number;
  selectedRoute: 'highway' | 'national';
  displayedRoute: RouteResult | null;
  formatDuration: (hours: number) => string;
  formatCurrency: (value: number) => string;
}

/**
 * Panneau de droite (carte) + aperçu mobile de la page Itinéraire. Extrait
 * de src/pages/Itinerary.tsx pour alléger ce fichier — comportement
 * identique.
 */
export function ItineraryMapPanel({
  markers,
  routeCoordinates,
  restrictionMarkers,
  truckRestrictionsCount,
  selectedRoute,
  displayedRoute,
  formatDuration,
  formatCurrency,
}: ItineraryMapPanelProps) {
  return (
    <>
      {/* Right Panel - Map */}
      <div data-itinerary-map className="hidden lg:flex flex-1 relative bg-muted/20">
        <MapPreview
          className="h-full w-full"
          center={[46.603354, 1.888334]}
          zoom={6}
          markers={markers}
          routeCoordinates={routeCoordinates}
          restrictions={restrictionMarkers}
          showRestrictionsLegend={true}
        />

        {/* Route summary overlay */}
        {selectedRoute && displayedRoute && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-card/95 backdrop-blur-md border border-border/50 rounded-2xl px-5 py-3 shadow-xl animate-scale-in">
            <div className="flex items-center gap-4 text-sm">
              <div className={cn(
                "w-8 h-8 rounded-xl flex items-center justify-center",
                selectedRoute === 'highway' ? "bg-primary/20" : "bg-success/20"
              )}>
                {selectedRoute === 'highway' ? (
                  <Zap className="w-4 h-4 text-primary" />
                ) : (
                  <TreePine className="w-4 h-4 text-success" />
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className="font-semibold">
                  {selectedRoute === 'highway' ? 'Autoroute' : 'Nationale'}
                </span>
                <div className="w-px h-4 bg-border" />
                <span className="font-medium">{displayedRoute.distance} km</span>
                <div className="w-px h-4 bg-border" />
                <span className="text-muted-foreground">{formatDuration(displayedRoute.duration)}</span>
                {truckRestrictionsCount > 0 && (
                  <>
                    <div className="w-px h-4 bg-border" />
                    <span className="text-warning font-medium flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {truckRestrictionsCount} restrictions
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Map placeholder removed — instructions are now in the page header */}
      </div>

      {/* Mobile Map Preview */}
      {displayedRoute && (
        <div className="lg:hidden fixed bottom-20 left-4 right-4 z-40">
          <div className="bg-card/95 backdrop-blur-md border border-border/50 rounded-2xl p-4 shadow-xl animate-slide-up">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center",
                  selectedRoute === 'highway' ? "bg-primary/20" : "bg-success/20"
                )}>
                  {selectedRoute === 'highway' ? (
                    <Zap className="w-5 h-5 text-primary" />
                  ) : (
                    <TreePine className="w-5 h-5 text-success" />
                  )}
                </div>
                <div>
                  <p className="font-semibold">{selectedRoute === 'highway' ? 'Autoroute' : 'Nationale'}</p>
                  <p className="text-xs text-muted-foreground">{displayedRoute.distance} km • {formatDuration(displayedRoute.duration)}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold">{formatCurrency(displayedRoute.tollCost + displayedRoute.fuelCost)}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
