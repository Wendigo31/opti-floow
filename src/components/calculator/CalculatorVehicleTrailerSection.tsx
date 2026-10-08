import { Link } from 'react-router-dom';
import { Truck, AlertTriangle, Container } from 'lucide-react';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { useCloudVehicles } from '@/hooks/useCloudVehicles';
import { useCloudTrailers } from '@/hooks/useCloudTrailers';
import { formatCostPerKm, type VehicleCostBreakdown, type TrailerCostBreakdown } from '@/hooks/useVehicleCost';
import type { Vehicle } from '@/types/vehicle';
import type { Trailer } from '@/types/trailer';

interface CalculatorVehicleTrailerSectionProps {
  selectedVehicleId: string | null;
  handleVehicleSelect: (vehicleId: string) => void;
  selectedVehicle: Vehicle | null;
  vehicleCostBreakdown: VehicleCostBreakdown | null;
  selectedTrailerId: string | null;
  setSelectedTrailerId: (id: string | null) => void;
  selectedTrailer: Trailer | null;
  trailerCostBreakdown: TrailerCostBreakdown | null;
}

/**
 * Sélection du véhicule et, s'il s'agit d'un tracteur, de la semi-remorque
 * associée, avec le détail du coût au km. Extrait de
 * src/pages/Calculator.tsx pour alléger ce fichier — comportement
 * identique.
 */
export function CalculatorVehicleTrailerSection({
  selectedVehicleId,
  handleVehicleSelect,
  selectedVehicle,
  vehicleCostBreakdown,
  selectedTrailerId,
  setSelectedTrailerId,
  selectedTrailer,
  trailerCostBreakdown,
}: CalculatorVehicleTrailerSectionProps) {
  const { vehicles } = useCloudVehicles();
  const { trailers } = useCloudTrailers();

  return (
    <>
      {/* Vehicle Selection - REQUIRED */}
      <div className="glass-card p-5 opacity-0 animate-slide-up" style={{ animationDelay: '50ms', animationFillMode: 'forwards' }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
            <Truck className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Véhicule</h2>
            <p className="text-xs text-muted-foreground">Sélectionnez le véhicule pour ce calcul</p>
          </div>
        </div>

        {vehicles.length === 0 ? (
          <div className="p-4 bg-warning/10 border border-warning/30 rounded-lg">
            <div className="flex items-center gap-2 text-warning mb-2">
              <AlertTriangle className="w-5 h-5" />
              <span className="font-medium">Aucun véhicule configuré</span>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              Vous devez créer au moins un véhicule pour utiliser le calculateur avec tous les coûts.
            </p>
            <Link
              to="/vehicles"
              className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
            >
              <Truck className="w-4 h-4" />
              Ajouter un véhicule
            </Link>
          </div>
        ) : (
          <SearchableSelect
            value={selectedVehicleId || ''}
            onValueChange={(v) => handleVehicleSelect(v || 'none')}
            options={vehicles.map((v) => ({
              value: v.id,
              label: `${v.name} (${v.licensePlate})`,
              sublabel: `${v.fuelConsumption}L/100km`,
            }))}
            placeholder="Sélectionnez un véhicule..."
            emptyLabel="-- Aucun véhicule --"
            searchPlaceholder="Rechercher un véhicule..."
          />
        )}

        {/* Show vehicle cost breakdown if selected */}
        {selectedVehicle && vehicleCostBreakdown && (
          <div className="mt-4 p-3 bg-secondary/50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">{selectedVehicle.name}</span>
              <span className="text-sm font-bold text-primary">
                {formatCostPerKm(vehicleCostBreakdown.totalCostPerKm)}
              </span>
            </div>
            <div className="grid grid-cols-5 gap-1 text-xs">
              <div className="text-center">
                <p className="text-muted-foreground">Carburant</p>
                <p>{formatCostPerKm(vehicleCostBreakdown.fuelCostPerKm)}</p>
              </div>
              <div className="text-center">
                <p className="text-muted-foreground">AdBlue</p>
                <p>{formatCostPerKm(vehicleCostBreakdown.adBlueCostPerKm)}</p>
              </div>
              <div className="text-center">
                <p className="text-muted-foreground">Entretien</p>
                <p>{formatCostPerKm(vehicleCostBreakdown.maintenanceCostPerKm)}</p>
              </div>
              <div className="text-center">
                <p className="text-muted-foreground">Pneus</p>
                <p>{formatCostPerKm(vehicleCostBreakdown.tireCostPerKm)}</p>
              </div>
              <div className="text-center">
                <p className="text-muted-foreground">Fixes</p>
                <p>{formatCostPerKm(vehicleCostBreakdown.fixedCostPerKm)}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Trailer Selection */}
      {selectedVehicle && selectedVehicle.type === 'tracteur' && (
        <div className="glass-card p-5 opacity-0 animate-slide-up" style={{ animationDelay: '75ms', animationFillMode: 'forwards' }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <Container className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Semi-remorque</h2>
              <p className="text-xs text-muted-foreground">Sélectionnez la remorque associée</p>
            </div>
          </div>

          {trailers.length === 0 ? (
            <div className="p-4 bg-muted/50 border border-border rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">Aucune semi-remorque configurée</p>
              <Link
                to="/vehicles"
                className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <Container className="w-4 h-4" />
                Ajouter une remorque
              </Link>
            </div>
          ) : (
            <SearchableSelect
              value={selectedTrailerId || ''}
              onValueChange={(v) => setSelectedTrailerId(v || null)}
              options={trailers.map((t) => ({
                value: t.id,
                label: `${t.name} (${t.licensePlate})`,
                sublabel: t.type,
              }))}
              placeholder="Sélectionnez une remorque..."
              emptyLabel="-- Sans remorque --"
              searchPlaceholder="Rechercher une remorque..."
            />
          )}

          {/* Show trailer cost breakdown if selected */}
          {selectedTrailer && trailerCostBreakdown && (
            <div className="mt-4 p-3 bg-purple-500/10 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">{selectedTrailer.name}</span>
                <span className="text-sm font-bold text-purple-400">
                  {formatCostPerKm(trailerCostBreakdown.totalCostPerKm)}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1 text-xs">
                <div className="text-center">
                  <p className="text-muted-foreground">Entretien</p>
                  <p>{formatCostPerKm(trailerCostBreakdown.maintenanceCostPerKm)}</p>
                </div>
                <div className="text-center">
                  <p className="text-muted-foreground">Pneus</p>
                  <p>{formatCostPerKm(trailerCostBreakdown.tireCostPerKm)}</p>
                </div>
                <div className="text-center">
                  <p className="text-muted-foreground">Fixes</p>
                  <p>{formatCostPerKm(trailerCostBreakdown.fixedCostPerKm)}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
