import type { ReactNode } from 'react';
import {
  Truck,
  Edit2,
  Trash2,
  AlertTriangle,
  Calculator,
  Gauge,
  Fuel,
  TrendingUp,
  TrendingDown,
  Settings2,
  ChevronDown,
  ChevronUp,
  Wrench,
  Calendar,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TooltipProvider } from '@/components/ui/tooltip';
import { SharedDataBadge } from '@/components/shared/SharedDataBadge';
import { cn } from '@/lib/utils';
import type { Vehicle, VehicleMaintenance, VehicleTire } from '@/types/vehicle';
import { maintenanceTypes } from '@/types/vehicle';
import { formatCostPerKm, getCostPerKmColor, type VehicleCostBreakdown } from '@/hooks/useVehicleCost';

interface SharedVehicleInfo {
  licenseId?: string;
  userId?: string;
  isFormerMember?: boolean;
  displayName?: string;
  userEmail?: string;
}

interface VehicleCardProps {
  vehicle: Vehicle;
  index: number;
  isEditing: boolean;
  /** Formulaire d'édition (VehicleForm) à afficher à la place de la carte quand isEditing est vrai. */
  editForm: ReactNode;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onEdit: (vehicle: Vehicle) => void;
  onDelete: (id: string) => void;
  costBreakdown: VehicleCostBreakdown;
  formatCurrency: (value: number) => string;
  formatNumber: (value: number) => string;
  getMaintenanceProgress: (maintenance: VehicleMaintenance, currentKm: number) => number;
  getMaintenanceStatus: (maintenance: VehicleMaintenance, currentKm: number) => 'ok' | 'warning' | 'danger';
  getTireProgress: (tire: VehicleTire, currentKm: number) => number;
  isCompanyMember: boolean;
  vehicleInfo: SharedVehicleInfo | undefined;
  isOwn: boolean;
}

/**
 * Carte d'un véhicule (vue repliée + détails entretiens/pneus dépliables).
 * Extraite de src/pages/Vehicles.tsx pour alléger ce fichier — comportement
 * identique, aucune logique modifiée.
 */
export function VehicleCard({
  vehicle,
  index,
  isEditing,
  editForm,
  isExpanded,
  onToggleExpand,
  onEdit,
  onDelete,
  costBreakdown,
  formatCurrency,
  formatNumber,
  getMaintenanceProgress,
  getMaintenanceStatus,
  getTireProgress,
  isCompanyMember,
  vehicleInfo,
  isOwn,
}: VehicleCardProps) {
  const urgentMaintenances = vehicle.maintenances.filter(
    (m) => getMaintenanceStatus(m, vehicle.currentKm) !== 'ok'
  );
  const costColor = getCostPerKmColor(costBreakdown.totalCostPerKm);
  const isShared = !!vehicleInfo?.licenseId;

  return (
    <div
      key={vehicle.id}
      className="glass-card p-6 opacity-0 animate-slide-up"
      style={{ animationDelay: `${index * 100}ms`, animationFillMode: 'forwards' }}
    >
      {isEditing ? (
        editForm
      ) : (
        <>
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                <Truck className="w-6 h-6 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold text-foreground">{vehicle.name}</h3>
                  {isCompanyMember && (
                    <TooltipProvider>
                      <SharedDataBadge
                        isShared={isShared}
                        isOwn={isOwn}
                        isFormerMember={vehicleInfo?.isFormerMember}
                        createdBy={vehicleInfo?.displayName}
                        createdByEmail={vehicleInfo?.userEmail}
                        compact
                      />
                    </TooltipProvider>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary" className="font-mono text-sm font-semibold bg-primary/10 text-primary border-primary/20">
                    {vehicle.licensePlate}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {vehicle.brand} {vehicle.model} • {vehicle.year}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {urgentMaintenances.length > 0 && (
                <Badge variant="destructive" className="gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  {urgentMaintenances.length} entretien(s)
                </Badge>
              )}
              <Button size="icon" variant="ghost" onClick={() => onEdit(vehicle)}>
                <Edit2 className="w-4 h-4" />
              </Button>
              <Button size="icon" variant="ghost" onClick={() => onDelete(vehicle.id)}>
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </div>
          </div>

          {/* Cost per KM highlight */}
          <div className="mb-4 p-3 rounded-lg bg-secondary/50 border border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calculator className="w-5 h-5 text-primary" />
                <span className="font-medium">Coût kilométrique total</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={cn(
                  "text-xl font-bold",
                  costColor === 'success' && "text-success",
                  costColor === 'warning' && "text-warning",
                  costColor === 'destructive' && "text-destructive"
                )}>
                  {formatCostPerKm(costBreakdown.totalCostPerKm)}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mt-3 text-xs">
              <div className="text-center p-2 rounded bg-background/50">
                <p className="text-muted-foreground">Carburant</p>
                <p className="font-medium">{formatCostPerKm(costBreakdown.fuelCostPerKm)}</p>
              </div>
              <div className="text-center p-2 rounded bg-background/50">
                <p className="text-muted-foreground">AdBlue</p>
                <p className="font-medium">{formatCostPerKm(costBreakdown.adBlueCostPerKm)}</p>
              </div>
              <div className="text-center p-2 rounded bg-background/50">
                <p className="text-muted-foreground">Entretien</p>
                <p className="font-medium">{formatCostPerKm(costBreakdown.maintenanceCostPerKm)}</p>
              </div>
              <div className="text-center p-2 rounded bg-background/50">
                <p className="text-muted-foreground">Pneus</p>
                <p className="font-medium">{formatCostPerKm(costBreakdown.tireCostPerKm)}</p>
              </div>
              <div className="text-center p-2 rounded bg-background/50">
                <p className="text-muted-foreground">Fixes</p>
                <p className="font-medium">{formatCostPerKm(costBreakdown.fixedCostPerKm)}</p>
              </div>
            </div>
            {/* Depreciation per km */}
            {costBreakdown.depreciation && (
              <div className="text-center p-2 rounded bg-background/50">
                <p className="text-muted-foreground">Amort.</p>
                <p className="font-medium">{formatCostPerKm(costBreakdown.depreciationCostPerKm)}</p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
            <div className="flex items-center gap-2">
              <Gauge className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-muted-foreground">Kilométrage</p>
                <p className="font-medium">{formatNumber(vehicle.currentKm)} km</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Fuel className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-muted-foreground">Consommation</p>
                <p className="font-medium">{vehicle.fuelConsumption} L/100km</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-muted-foreground">Coûts annuels</p>
                <p className="font-medium">{formatCurrency(costBreakdown.totalAnnualFixedCost)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-muted-foreground">Type</p>
                <p className="font-medium capitalize">{vehicle.type}</p>
              </div>
            </div>
          </div>

          {/* Depreciation Details */}
          {costBreakdown.depreciation && (
            <div className="mb-4 p-3 rounded-lg bg-primary/5 border border-primary/20">
              <div className="flex items-center gap-2 mb-3">
                <TrendingDown className="w-4 h-4 text-primary" />
                <span className="font-medium text-sm">Amortissement</span>
                {costBreakdown.depreciation.isFullyDepreciated && (
                  <Badge variant="outline" className="text-xs">Amorti</Badge>
                )}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Valeur comptable</p>
                  <p className="font-semibold text-primary">
                    {formatCurrency(costBreakdown.depreciation.currentBookValue)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Amort. annuel</p>
                  <p className="font-medium">
                    {formatCurrency(costBreakdown.depreciation.annualDepreciation)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Amort. mensuel</p>
                  <p className="font-medium">
                    {formatCurrency(costBreakdown.depreciation.monthlyDepreciation)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Années restantes</p>
                    <p className="font-medium">
                      {costBreakdown.depreciation.remainingYears} an(s)
                    </p>
                  </div>
                </div>
              </div>
              {/* Progress bar */}
              <div className="mt-3">
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>Progression</span>
                  <span>
                    {Math.round((costBreakdown.depreciation.totalDepreciated / (vehicle.purchasePrice - (vehicle.residualValue || 0))) * 100)}%
                  </span>
                </div>
                <Progress
                  value={(costBreakdown.depreciation.totalDepreciated / (vehicle.purchasePrice - (vehicle.residualValue || 0))) * 100}
                  className="h-2"
                />
              </div>
            </div>
          )}

          <Button
            variant="ghost"
            className="w-full justify-between"
            onClick={onToggleExpand}
          >
            <span className="text-sm text-muted-foreground">
              {vehicle.maintenances.length} entretien(s) • {vehicle.tires.length} groupe(s) de pneus
            </span>
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>

          {isExpanded && (
            <div className="mt-4 pt-4 border-t border-border space-y-4 animate-fade-in">
              {/* Maintenances */}
              <div>
                <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <Wrench className="w-4 h-4" />
                  Entretiens
                </h4>
                <div className="space-y-3">
                  {vehicle.maintenances.map((m) => {
                    const progress = getMaintenanceProgress(m, vehicle.currentKm);
                    const status = getMaintenanceStatus(m, vehicle.currentKm);
                    const kmRemaining = m.intervalKm - (vehicle.currentKm - m.lastKm);

                    return (
                      <div key={m.id} className="flex items-center gap-3">
                        <div className="flex-1">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-sm font-medium">{m.name || maintenanceTypes.find(t => t.value === m.type)?.label}</span>
                            <span className={cn(
                              "text-xs",
                              status === 'ok' && "text-success",
                              status === 'warning' && "text-warning",
                              status === 'danger' && "text-destructive"
                            )}>
                              {kmRemaining > 0 ? `${formatNumber(kmRemaining)} km restants` : 'À effectuer'}
                            </span>
                          </div>
                          <Progress
                            value={progress}
                            className={cn(
                              "h-2",
                              status === 'warning' && "[&>div]:bg-warning",
                              status === 'danger' && "[&>div]:bg-destructive"
                            )}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Pneus */}
              {vehicle.tires.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Pneumatiques
                  </h4>
                  <div className="space-y-3">
                    {vehicle.tires.map((tire, idx) => {
                      const progress = getTireProgress(tire, vehicle.currentKm);
                      const kmRemaining = tire.durabilityKm - (vehicle.currentKm - tire.lastChangeKm);

                      return (
                        <div key={idx} className="flex items-center gap-3">
                          <div className="flex-1">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-sm">
                                {tire.brand} {tire.model} ({tire.position}) - {tire.quantity}x
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {kmRemaining > 0 ? `${formatNumber(kmRemaining)} km restants` : 'À changer'}
                              </span>
                            </div>
                            <Progress
                              value={progress}
                              className={cn(
                                "h-2",
                                progress >= 80 && progress < 100 && "[&>div]:bg-warning",
                                progress >= 100 && "[&>div]:bg-destructive"
                              )}
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                              Coût: {formatCurrency(tire.pricePerUnit * tire.quantity)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
