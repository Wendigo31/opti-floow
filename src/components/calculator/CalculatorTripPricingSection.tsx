import { Route, Zap, Eye, EyeOff, RefreshCw, Loader2, Percent, CalendarDays } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useApp } from '@/context/AppContext';
import { useFuelPrice, type FuelType } from '@/hooks/useFuelPrice';
import { cn } from '@/lib/utils';

interface CalculatorTripPricingSectionProps {
  showHTPrice: boolean;
  setShowHTPrice: (value: boolean) => void;
  currentFuelType: FuelType;
  fuelUnit: string;
  displayedFuelPriceHT: number;
  displayedAdBluePriceHT: number;
  handleFetchFuelPrice: () => void | Promise<void>;
  formatCurrency: (value: number) => string;
  canUseAutoMode: boolean;
}

/**
 * Section "Trajet & Tarification" (distance, péages, prix carburant/AdBlue,
 * mode de tarification, jours travaillés) de la page Calculateur. Extraite
 * de src/pages/Calculator.tsx pour alléger ce fichier — comportement
 * identique.
 */
export function CalculatorTripPricingSection({
  showHTPrice,
  setShowHTPrice,
  currentFuelType,
  fuelUnit,
  displayedFuelPriceHT,
  displayedAdBluePriceHT,
  handleFetchFuelPrice,
  formatCurrency,
  canUseAutoMode,
}: CalculatorTripPricingSectionProps) {
  const { trip, setTrip, vehicle, setVehicle, settings, setSettings } = useApp();
  const { fetchAdBluePrice, loading: fuelLoading, fuelTypeLabels } = useFuelPrice();

  return (
    <div className="glass-card p-5 opacity-0 animate-slide-up" style={{ animationDelay: '100ms', animationFillMode: 'forwards' }}>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-success/20 flex items-center justify-center">
          <Route className="w-5 h-5 text-success" />
        </div>
        <h2 className="text-lg font-semibold text-foreground">Trajet & Tarification</h2>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="space-y-1">
          <Label htmlFor="distance" className="text-xs">Distance (km)</Label>
          <Input
            id="distance"
            type="number"
            value={trip.distance}
            onChange={e => setTrip({ ...trip, distance: parseFloat(e.target.value) || 0 })}
            className="h-9"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="tollCost" className="text-xs">Péages (€)</Label>
          <Input
            id="tollCost"
            type="number"
            step="0.01"
            value={trip.tollCost}
            onChange={e => setTrip({ ...trip, tollCost: parseFloat(e.target.value) || 0 })}
            className="h-9"
          />
        </div>
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <Label htmlFor="fuelPrice" className="text-xs flex items-center gap-1">
              {currentFuelType === 'electric' && <Zap className="w-3 h-3" />}
              Prix {fuelTypeLabels[currentFuelType]} ({fuelUnit})
            </Label>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setShowHTPrice(!showHTPrice)}
                className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-secondary hover:bg-secondary/80 transition-colors flex items-center gap-1"
                title={showHTPrice ? 'Masquer le prix HT' : 'Voir le prix HT'}
              >
                {showHTPrice ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                HT
              </button>
              <button
                type="button"
                onClick={() => setVehicle({ ...vehicle, fuelPriceIsHT: !vehicle.fuelPriceIsHT })}
                className={cn(
                  "text-[10px] font-semibold px-1.5 py-0.5 rounded transition-colors",
                  vehicle.fuelPriceIsHT
                    ? "bg-primary/20 text-primary"
                    : "bg-warning/20 text-warning"
                )}
                title="Cliquez pour basculer entre HT et TTC"
              >
                {vehicle.fuelPriceIsHT ? 'HT' : 'TTC'}
              </button>
            </div>
          </div>
          <div className="flex gap-1">
            <Input
              id="fuelPrice"
              type="number"
              step="0.01"
              value={vehicle.fuelPriceHT}
              onChange={e => setVehicle({ ...vehicle, fuelPriceHT: parseFloat(e.target.value) || 0 })}
              className="h-9 flex-1"
            />
            <Button
              size="icon"
              variant="outline"
              className="h-9 w-9"
              onClick={handleFetchFuelPrice}
              disabled={fuelLoading[currentFuelType]}
              title={`Actualiser prix ${fuelTypeLabels[currentFuelType]} (TTC)`}
            >
              {fuelLoading[currentFuelType] ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            </Button>
          </div>
          {showHTPrice && (
            <div className="flex justify-between text-xs mt-1 p-1.5 rounded bg-muted/50">
              <span className="text-muted-foreground">Montant HT:</span>
              <span className="font-medium text-primary">{displayedFuelPriceHT.toFixed(3)} {fuelUnit}</span>
            </div>
          )}
        </div>
        {/* AdBlue - only show for non-electric vehicles */}
        {currentFuelType !== 'electric' && (
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label htmlFor="adBluePrice" className="text-xs">Prix AdBlue (€/L)</Label>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setShowHTPrice(!showHTPrice)}
                  className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-secondary hover:bg-secondary/80 transition-colors flex items-center gap-1"
                  title={showHTPrice ? 'Masquer le prix HT' : 'Voir le prix HT'}
                >
                  {showHTPrice ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  HT
                </button>
                <button
                  type="button"
                  onClick={() => setVehicle({ ...vehicle, adBluePriceIsHT: !vehicle.adBluePriceIsHT })}
                  className={cn(
                    "text-[10px] font-semibold px-1.5 py-0.5 rounded transition-colors",
                    vehicle.adBluePriceIsHT
                      ? "bg-primary/20 text-primary"
                      : "bg-warning/20 text-warning"
                  )}
                  title="Cliquez pour basculer entre HT et TTC"
                >
                  {vehicle.adBluePriceIsHT ? 'HT' : 'TTC'}
                </button>
              </div>
            </div>
            <div className="flex gap-1">
              <Input
                id="adBluePrice"
                type="number"
                step="0.01"
                value={vehicle.adBluePriceHT}
                onChange={e => setVehicle({ ...vehicle, adBluePriceHT: parseFloat(e.target.value) || 0 })}
                className="h-9 flex-1"
              />
              <Button
                size="icon"
                variant="outline"
                className="h-9 w-9"
                onClick={async () => {
                  const price = await fetchAdBluePrice();
                  if (price) setVehicle({ ...vehicle, adBluePriceHT: price, adBluePriceIsHT: false });
                }}
                disabled={fuelLoading.adblue}
                title="Actualiser prix AdBlue (TTC)"
              >
                {fuelLoading.adblue ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              </Button>
            </div>
            {showHTPrice && (
              <div className="flex justify-between text-xs mt-1 p-1.5 rounded bg-muted/50">
                <span className="text-muted-foreground">Montant HT:</span>
                <span className="font-medium text-primary">{displayedAdBluePriceHT.toFixed(3)} €/L</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Pricing Mode */}
      <div className="mt-4 pt-4 border-t border-border">
        <div className="flex flex-wrap gap-2 mb-3">
          <button
            onClick={() => setTrip({ ...trip, pricingMode: 'km' })}
            className={cn(
              "flex-1 min-w-[70px] py-2 px-2 rounded-lg border transition-all text-xs font-medium",
              trip.pricingMode === 'km'
                ? "border-primary bg-primary/10 text-primary"
                : "border-border/50 bg-muted/30 text-muted-foreground hover:bg-muted/50"
            )}
          >
            €/km
          </button>
          <button
            onClick={() => setTrip({ ...trip, pricingMode: 'fixed' })}
            className={cn(
              "flex-1 min-w-[70px] py-2 px-2 rounded-lg border transition-all text-xs font-medium",
              trip.pricingMode === 'fixed'
                ? "border-primary bg-primary/10 text-primary"
                : "border-border/50 bg-muted/30 text-muted-foreground hover:bg-muted/50"
            )}
          >
            Forfait
          </button>
          <button
            onClick={() => setTrip({ ...trip, pricingMode: 'hourly' })}
            className={cn(
              "flex-1 min-w-[70px] py-2 px-2 rounded-lg border transition-all text-xs font-medium",
              trip.pricingMode === 'hourly'
                ? "border-purple-500 bg-purple-500/10 text-purple-500"
                : "border-border/50 bg-muted/30 text-muted-foreground hover:bg-muted/50"
            )}
          >
            €/h
          </button>
          <button
            onClick={() => setTrip({ ...trip, pricingMode: 'km_stops' })}
            className={cn(
              "flex-1 min-w-[70px] py-2 px-2 rounded-lg border transition-all text-xs font-medium",
              trip.pricingMode === 'km_stops'
                ? "border-orange-500 bg-orange-500/10 text-orange-500"
                : "border-border/50 bg-muted/30 text-muted-foreground hover:bg-muted/50"
            )}
          >
            km+arrêts
          </button>
          <button
            onClick={() => canUseAutoMode && setTrip({ ...trip, pricingMode: 'auto' })}
            className={cn(
              "flex-1 min-w-[70px] py-2 px-2 rounded-lg border transition-all text-xs font-medium",
              trip.pricingMode === 'auto'
                ? "border-success bg-success/10 text-success"
                : "border-border/50 bg-muted/30 text-muted-foreground hover:bg-muted/50",
              !canUseAutoMode && "opacity-50 cursor-not-allowed"
            )}
          >
            Auto
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {trip.pricingMode === 'km' && (
            <div className="space-y-1">
              <Label htmlFor="pricePerKm" className="text-xs">Prix/km (€)</Label>
              <Input
                id="pricePerKm"
                type="number"
                step="0.01"
                value={trip.pricePerKm}
                onChange={e => setTrip({ ...trip, pricePerKm: parseFloat(e.target.value) || 0 })}
                className="h-9"
              />
              <p className="text-xs text-muted-foreground">
                CA: {formatCurrency(trip.pricePerKm * trip.distance)}
              </p>
            </div>
          )}
          {trip.pricingMode === 'fixed' && (
            <div className="space-y-1">
              <Label htmlFor="fixedPrice" className="text-xs">Forfait (€)</Label>
              <Input
                id="fixedPrice"
                type="number"
                step="0.01"
                value={trip.fixedPrice}
                onChange={e => setTrip({ ...trip, fixedPrice: parseFloat(e.target.value) || 0 })}
                className="h-9"
              />
              <p className="text-xs text-muted-foreground">
                {trip.distance > 0 ? (trip.fixedPrice / trip.distance).toFixed(3) : 0} €/km
              </p>
            </div>
          )}
          {trip.pricingMode === 'hourly' && (
            <>
              <div className="space-y-1">
                <Label htmlFor="hourlyRate" className="text-xs">Taux horaire (€/h)</Label>
                <Input
                  id="hourlyRate"
                  type="number"
                  step="1"
                  value={trip.hourlyRate}
                  onChange={e => setTrip({ ...trip, hourlyRate: parseFloat(e.target.value) || 0 })}
                  className="h-9"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="estimatedHours" className="text-xs">Heures estimées</Label>
                <Input
                  id="estimatedHours"
                  type="number"
                  step="0.5"
                  value={trip.estimatedHours}
                  onChange={e => setTrip({ ...trip, estimatedHours: parseFloat(e.target.value) || 0 })}
                  className="h-9"
                />
                <p className="text-xs text-muted-foreground">
                  CA: {formatCurrency(trip.hourlyRate * trip.estimatedHours)}
                </p>
              </div>
            </>
          )}
          {trip.pricingMode === 'km_stops' && (
            <>
              <div className="space-y-1">
                <Label htmlFor="pricePerKmStops" className="text-xs">Prix/km (€)</Label>
                <Input
                  id="pricePerKmStops"
                  type="number"
                  step="0.01"
                  value={trip.pricePerKm}
                  onChange={e => setTrip({ ...trip, pricePerKm: parseFloat(e.target.value) || 0 })}
                  className="h-9"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="pricePerStop" className="text-xs">Prix/arrêt (€)</Label>
                <Input
                  id="pricePerStop"
                  type="number"
                  step="1"
                  value={trip.pricePerStop}
                  onChange={e => setTrip({ ...trip, pricePerStop: parseFloat(e.target.value) || 0 })}
                  className="h-9"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="numberOfStops" className="text-xs">Nombre d'arrêts</Label>
                <Input
                  id="numberOfStops"
                  type="number"
                  step="1"
                  value={trip.numberOfStops}
                  onChange={e => setTrip({ ...trip, numberOfStops: parseInt(e.target.value) || 0 })}
                  className="h-9"
                />
                <p className="text-xs text-muted-foreground">
                  CA: {formatCurrency((trip.pricePerKm * trip.distance) + (trip.pricePerStop * trip.numberOfStops))}
                </p>
              </div>
            </>
          )}
          {trip.pricingMode === 'auto' && (
            <div className="space-y-1">
              <Label htmlFor="targetMargin" className="text-xs flex items-center gap-1">
                <Percent className="w-3 h-3" />
                Marge cible (%)
              </Label>
              <Input
                id="targetMargin"
                type="number"
                step="1"
                value={trip.targetMargin}
                onChange={e => setTrip({ ...trip, targetMargin: parseFloat(e.target.value) || 0 })}
                className="h-9"
              />
            </div>
          )}
          <div className="space-y-1">
            <Label htmlFor="workingDays" className="text-xs text-muted-foreground flex items-center gap-1">
              <CalendarDays className="w-3 h-3" />
              Jours travaillés/mois
            </Label>
            <Input
              id="workingDays"
              type="number"
              min={1}
              max={31}
              value={settings.workingDaysPerMonth}
              onChange={(e) => setSettings({ ...settings, workingDaysPerMonth: Math.max(1, Math.min(31, parseInt(e.target.value) || 21)) })}
              className="h-9 w-24"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
