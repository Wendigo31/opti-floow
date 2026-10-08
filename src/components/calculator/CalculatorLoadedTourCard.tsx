import { Folder, Check, TrendingUp, TrendingDown, RefreshCw, Save, Calculator as CalculatorIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useExploitationMetrics } from '@/hooks/useExploitationMetrics';
import { cn } from '@/lib/utils';
import type { useCalculations } from '@/hooks/useCalculations';
import type { SavedTour } from '@/types/savedTour';

interface CalculatorLoadedTourCardProps {
  loadedTour: SavedTour;
  handleUpdateTour: () => void | Promise<void>;
  updating: boolean;
  handleClearTour: () => void;
  formatCurrency: (value: number) => string;
  costs: ReturnType<typeof useCalculations>;
  vehicleCostForTrip: number;
  totalCostWithVehicle: number;
  revenueWithVehicle: number;
  profitWithVehicle: number;
  profitMarginWithVehicle: number;
}

/**
 * Bandeau "Tournée chargée" (adresses, indicateur global, comparaison
 * ancien/nouveau calcul) de la page Calculateur. Extrait de
 * src/pages/Calculator.tsx pour alléger ce fichier — comportement
 * identique, y compris le masquage de la comparaison par rôle.
 */
export function CalculatorLoadedTourCard({
  loadedTour,
  handleUpdateTour,
  updating,
  handleClearTour,
  formatCurrency,
  costs,
  vehicleCostForTrip,
  totalCostWithVehicle,
  revenueWithVehicle,
  profitWithVehicle,
  profitMarginWithVehicle,
}: CalculatorLoadedTourCardProps) {
  const { canExploitationView, isDirection } = useExploitationMetrics();

  return (
    <div className="glass-card p-4 space-y-4">
      {/* Header with global indicator */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Folder className="w-5 h-5 text-primary" />
          <span className="font-medium">{loadedTour.name}</span>
        </div>

        {/* Global improvement/degradation indicator */}
        {(() => {
          const profitDiff = profitWithVehicle - loadedTour.profit;
          const isImproved = profitDiff > 0;
          const isUnchanged = Math.abs(profitDiff) < 0.01;

          if (isUnchanged) {
            return (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted text-muted-foreground text-sm">
                <Check className="w-4 h-4" />
                <span>Aucun changement</span>
              </div>
            );
          }

          return (
            <div className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium",
              isImproved ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive"
            )}>
              {isImproved ? (
                <TrendingUp className="w-4 h-4" />
              ) : (
                <TrendingDown className="w-4 h-4" />
              )}
              <span>
                {isImproved ? '+' : ''}{formatCurrency(profitDiff)} de bénéfice
              </span>
            </div>
          );
        })()}

        <div className="flex items-center gap-2">
          <Button
            variant="default"
            size="sm"
            onClick={handleUpdateTour}
            disabled={updating}
            className="h-7 text-xs gap-1"
          >
            {updating ? (
              <RefreshCw className="w-3 h-3 animate-spin" />
            ) : (
              <Save className="w-3 h-3" />
            )}
            Mettre à jour la tournée
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearTour}
            className="h-7 text-xs"
          >
            Effacer
          </Button>
        </div>
      </div>

      {/* Addresses */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
        <div className="flex items-start gap-2 p-2 bg-secondary/50 rounded-lg">
          <div className="w-6 h-6 rounded-full bg-success/20 flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-xs font-bold text-success">A</span>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Départ</p>
            <p className="font-medium text-foreground">{loadedTour.origin_address}</p>
          </div>
        </div>
        <div className="flex items-start gap-2 p-2 bg-secondary/50 rounded-lg">
          <div className="w-6 h-6 rounded-full bg-destructive/20 flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-xs font-bold text-destructive">B</span>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Arrivée</p>
            <p className="font-medium text-foreground">{loadedTour.destination_address}</p>
          </div>
        </div>
      </div>

      {/* Stops if any */}
      {loadedTour.stops.length > 0 && (
        <div className="text-sm">
          <p className="text-xs text-muted-foreground mb-1">Étapes intermédiaires</p>
          <div className="flex flex-wrap gap-1">
            {loadedTour.stops.map((stop, idx) => (
              <span key={idx} className="px-2 py-1 bg-secondary rounded text-xs">
                {stop.address.split(',')[0]}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Comparison table - only for roles with financial access */}
      {(isDirection || canExploitationView('can_view_total_cost')) && (
      <div className="border-t pt-4">
        <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
          <CalculatorIcon className="w-4 h-4" />
          Comparaison: Ancien vs Nouveau calcul
        </h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 font-medium">Élément</th>
                <th className="text-right py-2 font-medium text-muted-foreground">Ancien</th>
                <th className="text-right py-2 font-medium text-primary">Nouveau</th>
                <th className="text-right py-2 font-medium">Écart</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {(isDirection || canExploitationView('can_view_fuel_cost')) && (
              <>
              <tr>
                <td className="py-2">Coût carburant</td>
                <td className="text-right text-muted-foreground">{formatCurrency(loadedTour.fuel_cost)}</td>
                <td className="text-right font-medium">{formatCurrency(costs.fuel)}</td>
                <td className={cn("text-right", costs.fuel - loadedTour.fuel_cost > 0 ? "text-destructive" : "text-success")}>
                  {costs.fuel - loadedTour.fuel_cost >= 0 ? '+' : ''}{formatCurrency(costs.fuel - loadedTour.fuel_cost)}
                </td>
              </tr>
              <tr>
                <td className="py-2">Coût AdBlue</td>
                <td className="text-right text-muted-foreground">{formatCurrency(loadedTour.adblue_cost)}</td>
                <td className="text-right font-medium">{formatCurrency(costs.adBlue)}</td>
                <td className={cn("text-right", costs.adBlue - loadedTour.adblue_cost > 0 ? "text-destructive" : "text-success")}>
                  {costs.adBlue - loadedTour.adblue_cost >= 0 ? '+' : ''}{formatCurrency(costs.adBlue - loadedTour.adblue_cost)}
                </td>
              </tr>
              </>
              )}
              {(isDirection || canExploitationView('can_view_toll_cost')) && (
              <tr>
                <td className="py-2">Péages</td>
                <td className="text-right text-muted-foreground">{formatCurrency(loadedTour.toll_cost)}</td>
                <td className="text-right font-medium">{formatCurrency(costs.tolls)}</td>
                <td className={cn("text-right", costs.tolls - loadedTour.toll_cost > 0 ? "text-destructive" : "text-success")}>
                  {costs.tolls - loadedTour.toll_cost >= 0 ? '+' : ''}{formatCurrency(costs.tolls - loadedTour.toll_cost)}
                </td>
              </tr>
              )}
              {(isDirection || canExploitationView('can_view_driver_cost')) && (
              <tr>
                <td className="py-2">Coût chauffeur</td>
                <td className="text-right text-muted-foreground">{formatCurrency(loadedTour.driver_cost)}</td>
                <td className="text-right font-medium">{formatCurrency(costs.driverCost)}</td>
                <td className={cn("text-right", costs.driverCost - loadedTour.driver_cost > 0 ? "text-destructive" : "text-success")}>
                  {costs.driverCost - loadedTour.driver_cost >= 0 ? '+' : ''}{formatCurrency(costs.driverCost - loadedTour.driver_cost)}
                </td>
              </tr>
              )}
              {(isDirection || canExploitationView('can_view_structure_cost')) && (
              <tr>
                <td className="py-2">Charges structure</td>
                <td className="text-right text-muted-foreground">{formatCurrency(loadedTour.structure_cost)}</td>
                <td className="text-right font-medium">{formatCurrency(costs.structureCost)}</td>
                <td className={cn("text-right", costs.structureCost - loadedTour.structure_cost > 0 ? "text-destructive" : "text-success")}>
                  {costs.structureCost - loadedTour.structure_cost >= 0 ? '+' : ''}{formatCurrency(costs.structureCost - loadedTour.structure_cost)}
                </td>
              </tr>
              )}
              <tr>
                <td className="py-2">Coût véhicule</td>
                <td className="text-right text-muted-foreground">{formatCurrency(loadedTour.vehicle_cost)}</td>
                <td className="text-right font-medium">{formatCurrency(vehicleCostForTrip)}</td>
                <td className={cn("text-right", vehicleCostForTrip - loadedTour.vehicle_cost > 0 ? "text-destructive" : "text-success")}>
                  {vehicleCostForTrip - loadedTour.vehicle_cost >= 0 ? '+' : ''}{formatCurrency(vehicleCostForTrip - loadedTour.vehicle_cost)}
                </td>
              </tr>
              <tr className="font-bold border-t-2">
                <td className="py-2">Coût total</td>
                <td className="text-right text-muted-foreground">{formatCurrency(loadedTour.total_cost)}</td>
                <td className="text-right text-primary">{formatCurrency(totalCostWithVehicle)}</td>
                <td className={cn("text-right", totalCostWithVehicle - loadedTour.total_cost > 0 ? "text-destructive" : "text-success")}>
                  {totalCostWithVehicle - loadedTour.total_cost >= 0 ? '+' : ''}{formatCurrency(totalCostWithVehicle - loadedTour.total_cost)}
                </td>
              </tr>
              {(isDirection || canExploitationView('can_view_revenue')) && (
              <tr className="font-bold">
                <td className="py-2">Chiffre d'affaires</td>
                <td className="text-right text-muted-foreground">{formatCurrency(loadedTour.revenue)}</td>
                <td className="text-right text-primary">{formatCurrency(revenueWithVehicle)}</td>
                <td className={cn("text-right", revenueWithVehicle - loadedTour.revenue > 0 ? "text-success" : "text-destructive")}>
                  {revenueWithVehicle - loadedTour.revenue >= 0 ? '+' : ''}{formatCurrency(revenueWithVehicle - loadedTour.revenue)}
                </td>
              </tr>
              )}
              {(isDirection || canExploitationView('can_view_profit')) && (
              <tr className="font-bold">
                <td className="py-2">Bénéfice</td>
                <td className="text-right text-muted-foreground">{formatCurrency(loadedTour.profit)}</td>
                <td className="text-right text-primary">{formatCurrency(profitWithVehicle)}</td>
                <td className={cn("text-right", profitWithVehicle - loadedTour.profit > 0 ? "text-success" : "text-destructive")}>
                  {profitWithVehicle - loadedTour.profit >= 0 ? '+' : ''}{formatCurrency(profitWithVehicle - loadedTour.profit)}
                </td>
              </tr>
              )}
              {(isDirection || canExploitationView('can_view_margin')) && (
              <tr className="font-bold">
                <td className="py-2">Marge</td>
                <td className="text-right text-muted-foreground">{loadedTour.profit_margin.toFixed(1)}%</td>
                <td className="text-right text-primary">{profitMarginWithVehicle.toFixed(1)}%</td>
                <td className={cn("text-right", profitMarginWithVehicle - loadedTour.profit_margin > 0 ? "text-success" : "text-destructive")}>
                  {profitMarginWithVehicle - loadedTour.profit_margin >= 0 ? '+' : ''}{(profitMarginWithVehicle - loadedTour.profit_margin).toFixed(1)}%
                </td>
              </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}
    </div>
  );
}
