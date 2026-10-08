import { Calculator as CalculatorIcon, AlertTriangle, Lock, EyeOff, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useApp } from '@/context/AppContext';
import { useRolePermissions } from '@/hooks/useRolePermissions';
import { useExploitationMetrics } from '@/hooks/useExploitationMetrics';
import { useMarginAlerts } from '@/hooks/useMarginAlerts';
import { MarginAlertIndicator } from '@/components/alerts/MarginAlertIndicator';
import { cn } from '@/lib/utils';
import type { useCalculations } from '@/hooks/useCalculations';
import type { VehicleCostBreakdown, TrailerCostBreakdown } from '@/hooks/useVehicleCost';
import type { Vehicle } from '@/types/vehicle';
import type { Trailer } from '@/types/trailer';

interface CalculatorResultsSummaryProps {
  costs: ReturnType<typeof useCalculations>;
  selectedVehicle: Vehicle | null;
  vehicleCostBreakdown: VehicleCostBreakdown | null;
  selectedTrailer: Trailer | null;
  trailerCostBreakdown: TrailerCostBreakdown | null;
  trailerCostForTrip: number;
  totalCostWithVehicle: number;
  totalCostPerKmWithVehicle: number;
  suggestedPriceWithVehicle: number;
  revenueWithVehicle: number;
  profitWithVehicle: number;
  profitMarginWithVehicle: number;
  formatCurrency: (value: number) => string;
  setSaveDialogOpen: (open: boolean) => void;
}

/**
 * Récapitulatif (détail des coûts, prix suggéré, marge, alerte de marge,
 * bouton de sauvegarde) de la page Calculateur. Extrait de
 * src/pages/Calculator.tsx pour alléger ce fichier — comportement
 * identique, y compris le masquage des données financières par rôle.
 */
export function CalculatorResultsSummary({
  costs,
  selectedVehicle,
  vehicleCostBreakdown,
  selectedTrailer,
  trailerCostBreakdown,
  trailerCostForTrip,
  totalCostWithVehicle,
  totalCostPerKmWithVehicle,
  suggestedPriceWithVehicle,
  revenueWithVehicle,
  profitWithVehicle,
  profitMarginWithVehicle,
  formatCurrency,
  setSaveDialogOpen,
}: CalculatorResultsSummaryProps) {
  const { trip } = useApp();
  const { canViewCostBreakdown, canViewFinancialData, canViewPricing } = useRolePermissions();
  const { canExploitationView, isDirection } = useExploitationMetrics();
  const { settings: marginSettings } = useMarginAlerts();

  return (
    <div>
      <div className="glass-card p-5 sticky top-6 opacity-0 animate-slide-up" style={{ animationDelay: '200ms', animationFillMode: 'forwards' }}>
        <div className="flex items-center gap-2 mb-4">
          <CalculatorIcon className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Récapitulatif</h2>
        </div>

        {!selectedVehicle && (
          <div className="mb-4 p-3 bg-warning/10 border border-warning/30 rounded-lg text-center">
            <AlertTriangle className="w-5 h-5 text-warning mx-auto mb-1" />
            <p className="text-xs text-warning">Sélectionnez un véhicule pour un calcul complet</p>
          </div>
        )}

        {/* Cost Breakdown - Visible based on exploitation settings */}
        {(canViewCostBreakdown || canExploitationView('can_view_total_cost')) ? (
          <div className="space-y-2 text-sm">
            {(isDirection || canExploitationView('can_view_fuel_cost')) && (
              <>
                <div className="flex justify-between py-1 border-b border-border/30">
                  <span className="text-muted-foreground">Gazole</span>
                  <span className="font-medium">{formatCurrency(costs.fuel)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/30">
                  <span className="text-muted-foreground">AdBlue</span>
                  <span className="font-medium">{formatCurrency(costs.adBlue)}</span>
                </div>
              </>
            )}
            {(isDirection || canExploitationView('can_view_toll_cost')) && (
              <div className="flex justify-between py-1 border-b border-border/30">
                <span className="text-muted-foreground">Péages</span>
                <span className="font-medium">{formatCurrency(costs.tolls)}</span>
              </div>
            )}
            {(isDirection || canExploitationView('can_view_driver_cost')) && (
              <div className="flex justify-between py-1 border-b border-border/30">
                <span className="text-muted-foreground">Conducteur(s)</span>
                <span className="font-medium">{formatCurrency(costs.driverCost)}</span>
              </div>
            )}
            {(isDirection || canExploitationView('can_view_structure_cost')) && (
              <div className="flex justify-between py-1 border-b border-border/30">
                <span className="text-muted-foreground">Structure</span>
                <span className="font-medium">{formatCurrency(costs.structureCost)}</span>
              </div>
            )}

            {selectedVehicle && vehicleCostBreakdown && (isDirection || canExploitationView('can_view_fuel_cost')) && (
              <>
                <div className="flex justify-between py-1 border-b border-border/30">
                  <span className="text-muted-foreground">Entretien véhicule</span>
                  <span className="font-medium">{formatCurrency(vehicleCostBreakdown.maintenanceCostPerKm * trip.distance)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/30">
                  <span className="text-muted-foreground">Pneus</span>
                  <span className="font-medium">{formatCurrency(vehicleCostBreakdown.tireCostPerKm * trip.distance)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/30">
                  <span className="text-muted-foreground">Charges véhicule</span>
                  <span className="font-medium">{formatCurrency(vehicleCostBreakdown.fixedCostPerKm * trip.distance)}</span>
                </div>
              </>
            )}

            {selectedTrailer && trailerCostBreakdown && (isDirection || canExploitationView('can_view_fuel_cost')) && (
              <div className="flex justify-between py-1 border-b border-border/30">
                <span className="text-muted-foreground">Semi-remorque</span>
                <span className="font-medium">{formatCurrency(trailerCostForTrip)}</span>
              </div>
            )}

            {(isDirection || canExploitationView('can_view_total_cost')) && (
              <div className="flex justify-between py-2 bg-primary/10 rounded-lg px-3 mt-2">
                <span className="font-semibold text-foreground">Coût Total</span>
                <span className="font-bold text-primary">{formatCurrency(totalCostWithVehicle)}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="p-4 bg-muted/30 rounded-lg text-center">
            <Lock className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Détail des coûts réservé à la Direction</p>
            <p className="text-xs text-muted-foreground mt-1">Les calculs utilisent les données de structure</p>
          </div>
        )}

        {/* Suggested Price - Visible to ALL roles */}
        {canViewPricing && (
          <div className="mt-4 p-4 bg-primary/10 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-foreground">Prix suggéré</span>
              <span className="text-xl font-bold text-primary">{formatCurrency(suggestedPriceWithVehicle)}</span>
            </div>
            {trip.distance > 0 && (
              <p className="text-xs text-muted-foreground mt-1 text-right">
                {(suggestedPriceWithVehicle / trip.distance).toFixed(3)} €/km
              </p>
            )}
          </div>
        )}

        {/* Detailed Metrics - Visible based on exploitation settings */}
        {(canViewFinancialData || canExploitationView('can_view_revenue')) ? (
          <div className="mt-4 pt-3 border-t border-border space-y-2 text-sm">
            {(isDirection || canExploitationView('can_view_price_per_km')) && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Coût/km</span>
                <span className="font-medium">{totalCostPerKmWithVehicle.toFixed(3)} €</span>
              </div>
            )}
            {(isDirection || canExploitationView('can_view_revenue')) && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Chiffre d'affaires</span>
                <span className="font-medium text-success">{formatCurrency(revenueWithVehicle)}</span>
              </div>
            )}
            {(isDirection || canExploitationView('can_view_profit')) && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Bénéfice</span>
                <span className={cn("font-bold", profitWithVehicle >= 0 ? "text-success" : "text-destructive")}>
                  {formatCurrency(profitWithVehicle)}
                </span>
              </div>
            )}
          </div>
        ) : !canViewPricing ? (
          <div className="mt-4 pt-3 border-t border-border">
            <div className="p-3 bg-muted/30 rounded-lg text-center">
              <EyeOff className="w-5 h-5 text-muted-foreground mx-auto mb-1" />
              <p className="text-xs text-muted-foreground">Données financières réservées</p>
            </div>
          </div>
        ) : null}

        {/* Margin indicator - Visible based on exploitation settings */}
        {(isDirection || canExploitationView('can_view_margin')) && (
          <div className={cn(
            "mt-4 p-3 rounded-lg text-center",
            profitMarginWithVehicle >= 15 ? "bg-success/20" :
            profitMarginWithVehicle >= 0 ? "bg-warning/20" :
            "bg-destructive/20"
          )}>
            <p className="text-xs text-muted-foreground mb-1">Marge réelle</p>
            <p className={cn(
              "text-2xl font-bold",
              profitMarginWithVehicle >= 15 ? "text-success" :
              profitMarginWithVehicle >= 0 ? "text-warning" :
              "text-destructive"
            )}>
              {profitMarginWithVehicle.toFixed(1)}%
            </p>
          </div>
        )}

        {/* Margin Alert - Show when margin is below threshold */}
        {marginSettings.showInCalculator && trip.distance > 0 && (
          <div className="mt-4">
            <MarginAlertIndicator
              currentMargin={profitMarginWithVehicle}
              profit={profitWithVehicle}
              revenue={revenueWithVehicle}
              showSettings={isDirection}
              compact={false}
            />
          </div>
        )}

        {/* Save button */}
        {trip.distance > 0 && (
          <Button
            className="w-full mt-4"
            variant="gradient"
            onClick={() => setSaveDialogOpen(true)}
          >
            <Save className="w-4 h-4 mr-2" />
            Sauvegarder cette tournée
          </Button>
        )}
      </div>
    </div>
  );
}
