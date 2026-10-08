import {
  Route,
  Zap,
  TreePine,
  Clock,
  Euro,
  CheckCircle2,
  Save,
  History,
  TrendingUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { RouteItineraryListing } from '@/components/itinerary/RouteItineraryListing';
import type { RouteResult, Waypoint } from '@/types/itinerary';

interface ItineraryRouteResultsProps {
  hasResults: boolean;
  highwayRoute: RouteResult | null;
  nationalRoute: RouteResult | null;
  selectedRoute: 'highway' | 'national';
  displayedRoute: RouteResult | null;
  handleApplyRoute: (route: RouteResult) => void;
  handleOpenSaveItinerary: (route: RouteResult) => void;
  handleSaveToHistory: (route: RouteResult) => void;
  formatCurrency: (value: number) => string;
  formatDuration: (hours: number) => string;

  // Props forwarded verbatim to <RouteItineraryListing />
  originAddress: string;
  destinationAddress: string;
  stops: Waypoint[];
  transportMode: 'truck' | 'car';
  vehicleName: string | null;
  clientName: string | null;
}

/**
 * Section "Résultats de l'itinéraire" (cartes Autoroute/Nationale,
 * comparaison, et détail de la ligne sélectionnée) de la page Itinéraire.
 * Extraite de src/pages/Itinerary.tsx pour alléger ce fichier —
 * comportement identique.
 */
export function ItineraryRouteResults({
  hasResults,
  highwayRoute,
  nationalRoute,
  selectedRoute,
  displayedRoute,
  handleApplyRoute,
  handleOpenSaveItinerary,
  handleSaveToHistory,
  formatCurrency,
  formatDuration,
  originAddress,
  destinationAddress,
  stops,
  transportMode,
  vehicleName,
  clientName,
}: ItineraryRouteResultsProps) {
  if (!hasResults) return null;

  return (
    <div className="space-y-4 pt-3">
      <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
        <Route className="w-4 h-4 text-primary" />
        Résultats de l'itinéraire
      </h3>

      {/* Highway */}
      {highwayRoute && (
        <div
          className={cn(
            "p-5 rounded-2xl border-2 cursor-pointer transition-all duration-300 animate-scale-in group",
            selectedRoute === 'highway'
              ? "border-primary bg-gradient-to-br from-primary/10 to-primary/5 shadow-lg shadow-primary/10"
              : "border-border/50 hover:border-primary/40 hover:shadow-md bg-card/80 hover:bg-card"
          )}
          onClick={() => handleApplyRoute(highwayRoute)}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300",
                selectedRoute === 'highway'
                  ? "bg-gradient-to-br from-primary to-primary/70 shadow-md"
                  : "bg-primary/15 group-hover:bg-primary/25"
              )}>
                <Zap className={cn("w-5 h-5 transition-colors", selectedRoute === 'highway' ? "text-primary-foreground" : "text-primary")} />
              </div>
              <div>
                <h4 className="font-bold text-base">Autoroute</h4>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Plus rapide
                </p>
              </div>
            </div>
            {selectedRoute === 'highway' && (
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-primary/20 text-primary text-xs font-medium">
                <CheckCircle2 className="w-4 h-4" />
                Sélectionné
              </div>
            )}
          </div>
          <div className="grid grid-cols-4 gap-3 text-center">
            <div className="p-2 rounded-xl bg-muted/30">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Distance</p>
              <p className="font-bold text-lg">{highwayRoute.distance} <span className="text-xs font-normal">km</span></p>
            </div>
            <div className="p-2 rounded-xl bg-muted/30">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Durée</p>
              <p className="font-bold text-lg">{formatDuration(highwayRoute.duration)}</p>
            </div>
            <div className="p-2 rounded-xl bg-warning/10">
              <p className="text-[10px] uppercase tracking-wide text-warning mb-1">Péages</p>
              <p className="font-bold text-lg text-warning">{formatCurrency(highwayRoute.tollCost)}</p>
            </div>
            <div className="p-2 rounded-xl bg-primary/10">
              <p className="text-[10px] uppercase tracking-wide text-primary mb-1">Gazole</p>
              <p className="font-bold text-lg text-primary">{formatCurrency(highwayRoute.fuelCost)}</p>
            </div>
          </div>
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/50">
            <span className="text-sm font-medium text-muted-foreground">Total énergie</span>
            <span className="text-xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">{formatCurrency(highwayRoute.tollCost + highwayRoute.fuelCost)}</span>
          </div>
          <div className="flex gap-2 mt-4">
            <Button size="sm" className="flex-1 h-10" variant="gradient" onClick={(e) => { e.stopPropagation(); handleOpenSaveItinerary(highwayRoute); }}>
              <Save className="w-4 h-4 mr-1.5" /> Sauvegarder
            </Button>
            <Button size="sm" variant="outline" className="h-10 w-10" onClick={(e) => { e.stopPropagation(); handleSaveToHistory(highwayRoute); }}>
              <History className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* National */}
      {nationalRoute && (
        <div
          className={cn(
            "p-5 rounded-2xl border-2 cursor-pointer transition-all duration-300 animate-scale-in group",
            selectedRoute === 'national'
              ? "border-success bg-gradient-to-br from-success/10 to-success/5 shadow-lg shadow-success/10"
              : "border-border/50 hover:border-success/40 hover:shadow-md bg-card/80 hover:bg-card"
          )}
          style={{ animationDelay: '0.1s' }}
          onClick={() => handleApplyRoute(nationalRoute)}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300",
                selectedRoute === 'national'
                  ? "bg-gradient-to-br from-success to-success/70 shadow-md"
                  : "bg-success/15 group-hover:bg-success/25"
              )}>
                <TreePine className={cn("w-5 h-5 transition-colors", selectedRoute === 'national' ? "text-success-foreground" : "text-success")} />
              </div>
              <div>
                <h4 className="font-bold text-base">Nationale</h4>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Euro className="w-3 h-3" /> Plus économique
                </p>
              </div>
            </div>
            {selectedRoute === 'national' && (
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-success/20 text-success text-xs font-medium">
                <CheckCircle2 className="w-4 h-4" />
                Sélectionné
              </div>
            )}
          </div>
          <div className="grid grid-cols-4 gap-3 text-center">
            <div className="p-2 rounded-xl bg-muted/30">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Distance</p>
              <p className="font-bold text-lg">{nationalRoute.distance} <span className="text-xs font-normal">km</span></p>
            </div>
            <div className="p-2 rounded-xl bg-muted/30">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Durée</p>
              <p className="font-bold text-lg">{formatDuration(nationalRoute.duration)}</p>
            </div>
            <div className="p-2 rounded-xl bg-success/10">
              <p className="text-[10px] uppercase tracking-wide text-success mb-1">Péages</p>
              <p className="font-bold text-lg text-success">{formatCurrency(nationalRoute.tollCost)}</p>
            </div>
            <div className="p-2 rounded-xl bg-primary/10">
              <p className="text-[10px] uppercase tracking-wide text-primary mb-1">Gazole</p>
              <p className="font-bold text-lg text-primary">{formatCurrency(nationalRoute.fuelCost)}</p>
            </div>
          </div>
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/50">
            <span className="text-sm font-medium text-muted-foreground">Total énergie</span>
            <span className="text-xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">{formatCurrency(nationalRoute.tollCost + nationalRoute.fuelCost)}</span>
          </div>
          <div className="flex gap-2 mt-4">
            <Button size="sm" className="flex-1 h-10 bg-success hover:bg-success/90" onClick={(e) => { e.stopPropagation(); handleOpenSaveItinerary(nationalRoute); }}>
              <Save className="w-4 h-4 mr-1.5" /> Sauvegarder
            </Button>
            <Button size="sm" variant="outline" className="h-10 w-10" onClick={(e) => { e.stopPropagation(); handleSaveToHistory(nationalRoute); }}>
              <History className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Comparison */}
      {highwayRoute && nationalRoute && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-muted/50 to-muted/30 border border-border/30 text-center animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <div className="flex items-center justify-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Comparaison</span>
          </div>
          {highwayRoute.tollCost + highwayRoute.fuelCost < nationalRoute.tollCost + nationalRoute.fuelCost ? (
            <p className="text-sm">
              <span className="text-primary font-semibold">Autoroute</span> économise{' '}
              <span className="text-success font-bold">{formatCurrency((nationalRoute.tollCost + nationalRoute.fuelCost) - (highwayRoute.tollCost + highwayRoute.fuelCost))}</span>
              {' '}et{' '}
              <span className="font-semibold">{formatDuration(nationalRoute.duration - highwayRoute.duration)}</span>
            </p>
          ) : (
            <p className="text-sm">
              <span className="text-success font-semibold">Nationale</span> économise{' '}
              <span className="text-success font-bold">{formatCurrency((highwayRoute.tollCost + highwayRoute.fuelCost) - (nationalRoute.tollCost + nationalRoute.fuelCost))}</span>
              {' '}mais{' '}
              <span className="text-warning font-semibold">+{formatDuration(nationalRoute.duration - highwayRoute.duration)}</span>
            </p>
          )}
        </div>
      )}

      {/* Detailed listing + line proposal for the currently selected route */}
      {displayedRoute && (
        <RouteItineraryListing
          originAddress={originAddress}
          destinationAddress={destinationAddress}
          stops={stops}
          route={displayedRoute}
          onSaveAsLine={handleOpenSaveItinerary}
          transportMode={transportMode}
          vehicleName={vehicleName}
          clientName={clientName}
        />
      )}
    </div>
  );
}
