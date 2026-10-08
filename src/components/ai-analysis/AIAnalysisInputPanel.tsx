import {
  Sparkles,
  Truck,
  MapPin,
  Loader2,
  Route,
  Users,
  AlertTriangle,
  Fuel,
  Moon,
  Folder,
  RotateCcw,
  Timer,
  ArrowRightLeft,
  Target,
  Shield,
  Navigation,
  Plus,
  X,
  Edit3,
  Calendar,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { AddressInput } from '@/components/route/AddressInput';
import type { Vehicle } from '@/types/vehicle';
import type { SavedTour } from '@/types/savedTour';
import type { Driver } from '@/types';
import type { AnalysisMode, Position, StopWaypoint } from '@/types/aiAnalysis';

type InputMode = 'manual' | 'itinerary' | 'tour';
type Urgency = 'standard' | 'express' | 'flexible';

interface AIAnalysisInputPanelProps {
  loadedTour: SavedTour | null;
  handleClearTour: () => void;
  formatCurrency: (value: number) => string;

  analysisMode: AnalysisMode;
  setAnalysisMode: (mode: AnalysisMode) => void;

  inputMode: InputMode;
  setInputMode: (mode: InputMode) => void;
  handleLoadFromItinerary: () => void;
  setLoadTourOpen: (open: boolean) => void;

  origin: string;
  setOrigin: (value: string) => void;
  setOriginPosition: (position: Position | null) => void;
  destination: string;
  setDestination: (value: string) => void;
  setDestinationPosition: (position: Position | null) => void;
  swapOriginDestination: () => void;

  stops: StopWaypoint[];
  updateStop: (id: string, address: string, position: Position | null) => void;
  removeStop: (id: string) => void;
  addStop: () => void;

  vehicles: Vehicle[];
  selectedVehicleId: string;
  setSelectedVehicleId: (id: string) => void;
  selectedVehicle: Vehicle | undefined;

  drivers: Driver[];
  selectedDriverIds: string[];
  toggleDriver: (driverId: string) => void;

  allowRelay: boolean;
  setAllowRelay: (value: boolean) => void;
  preferNight: boolean;
  setPreferNight: (value: boolean) => void;
  avoidWeekends: boolean;
  setAvoidWeekends: (value: boolean) => void;
  maxDrivingHours: number;
  setMaxDrivingHours: (value: number) => void;
  urgency: Urgency;
  setUrgency: (value: Urgency) => void;
  departureTime: string;
  setDepartureTime: (value: string) => void;

  respectRSE: boolean;
  setRespectRSE: (value: boolean) => void;
  includeRestBreaks: boolean;
  setIncludeRestBreaks: (value: boolean) => void;
  includeMealBreaks: boolean;
  setIncludeMealBreaks: (value: boolean) => void;
  requireOvernightRest: boolean;
  setRequireOvernightRest: (value: boolean) => void;
  avoidLowBridges: boolean;
  setAvoidLowBridges: (value: boolean) => void;
  avoidWeightRestrictions: boolean;
  setAvoidWeightRestrictions: (value: boolean) => void;
  vehicleHeight: number;
  setVehicleHeight: (value: number) => void;
  vehicleWeight: number;
  setVehicleWeight: (value: number) => void;
  maxConsecutiveDrivingHours: number;
  setMaxConsecutiveDrivingHours: (value: number) => void;

  handleAnalyze: () => void | Promise<void>;
  loading: boolean;
}

/**
 * Panneau de gauche (saisie du trajet, véhicule, conducteurs, contraintes)
 * de la page Analyse IA. Extrait de src/pages/AIAnalysis.tsx pour alléger
 * ce fichier — comportement identique, y compris les champs conditionnels.
 */
export function AIAnalysisInputPanel({
  loadedTour,
  handleClearTour,
  formatCurrency,
  analysisMode,
  setAnalysisMode,
  inputMode,
  setInputMode,
  handleLoadFromItinerary,
  setLoadTourOpen,
  origin,
  setOrigin,
  setOriginPosition,
  destination,
  setDestination,
  setDestinationPosition,
  swapOriginDestination,
  stops,
  updateStop,
  removeStop,
  addStop,
  vehicles,
  selectedVehicleId,
  setSelectedVehicleId,
  selectedVehicle,
  drivers,
  selectedDriverIds,
  toggleDriver,
  allowRelay,
  setAllowRelay,
  preferNight,
  setPreferNight,
  avoidWeekends,
  setAvoidWeekends,
  maxDrivingHours,
  setMaxDrivingHours,
  urgency,
  setUrgency,
  departureTime,
  setDepartureTime,
  respectRSE,
  setRespectRSE,
  includeRestBreaks,
  setIncludeRestBreaks,
  includeMealBreaks,
  setIncludeMealBreaks,
  requireOvernightRest,
  setRequireOvernightRest,
  avoidLowBridges,
  setAvoidLowBridges,
  avoidWeightRestrictions,
  setAvoidWeightRestrictions,
  vehicleHeight,
  setVehicleHeight,
  vehicleWeight,
  setVehicleWeight,
  maxConsecutiveDrivingHours,
  setMaxConsecutiveDrivingHours,
  handleAnalyze,
  loading,
}: AIAnalysisInputPanelProps) {
  return (
    <div className="space-y-4">
      {/* Loaded Tour Info */}
      {loadedTour && (
        <div className="glass-card p-5 border-l-4 border-l-primary opacity-0 animate-slide-up" style={{ animationDelay: '25ms', animationFillMode: 'forwards' }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Folder className="w-5 h-5 text-primary" />
              <h2 className="font-semibold text-foreground">Tournée chargée</h2>
            </div>
            <Button variant="ghost" size="sm" onClick={handleClearTour}>
              <RotateCcw className="w-4 h-4 mr-1" />
              Effacer
            </Button>
          </div>
          <div className="p-3 bg-primary/10 rounded-lg">
            <p className="font-medium text-primary mb-1">{loadedTour.name}</p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <MapPin className="w-3 h-3" />
              <span className="truncate">{loadedTour.origin_address}</span>
              <Route className="w-3 h-3" />
              <span className="truncate">{loadedTour.destination_address}</span>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-2 bg-background/50 rounded">
                <p className="text-muted-foreground">Distance</p>
                <p className="font-semibold">{loadedTour.distance_km} km</p>
              </div>
              <div className="p-2 bg-background/50 rounded">
                <p className="text-muted-foreground">Coût actuel</p>
                <p className="font-semibold">{formatCurrency(loadedTour.total_cost)}</p>
              </div>
              <div className="p-2 bg-background/50 rounded">
                <p className="text-muted-foreground">Marge</p>
                <p className={cn("font-semibold", loadedTour.profit >= 0 ? 'text-success' : 'text-destructive')}>
                  {loadedTour.profit_margin?.toFixed(1) || 0}%
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Analysis Mode */}
      {!loadedTour && (
        <div className="glass-card p-5 opacity-0 animate-slide-up" style={{ animationDelay: '25ms', animationFillMode: 'forwards' }}>
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-foreground">Mode d'analyse</h2>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setAnalysisMode('full_optimization')}
              className={cn(
                "p-3 rounded-lg border text-left transition-all",
                analysisMode === 'full_optimization' ? "border-primary bg-primary/10" : "border-border/50"
              )}
            >
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="font-medium text-sm">Optimisation complète</span>
              </div>
              <p className="text-xs text-muted-foreground">Compare toutes les stratégies</p>
            </button>
            <button
              onClick={() => setAnalysisMode('relay_analysis')}
              className={cn(
                "p-3 rounded-lg border text-left transition-all",
                analysisMode === 'relay_analysis' ? "border-primary bg-primary/10" : "border-border/50"
              )}
            >
              <div className="flex items-center gap-2 mb-1">
                <ArrowRightLeft className="w-4 h-4 text-primary" />
                <span className="font-medium text-sm">Analyse relais</span>
              </div>
              <p className="text-xs text-muted-foreground">Points de relais optimaux</p>
            </button>
          </div>
        </div>
      )}

      {/* Input Mode Selector */}
      <div className="glass-card p-5 opacity-0 animate-slide-up" style={{ animationDelay: '50ms', animationFillMode: 'forwards' }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-foreground">Trajet</h2>
          </div>
          {inputMode !== 'manual' && (
            <Badge variant="secondary" className="text-xs">
              {inputMode === 'itinerary' ? 'Depuis itinéraire' : 'Depuis tournée'}
            </Badge>
          )}
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <button
            onClick={() => {
              handleClearTour();
              setInputMode('manual');
            }}
            className={cn(
              "p-2 rounded-lg border text-center text-xs transition-all",
              inputMode === 'manual' ? "border-primary bg-primary/10" : "border-border/50 hover:border-primary/50"
            )}
          >
            <Edit3 className="w-4 h-4 mx-auto mb-1 text-primary" />
            <span>Saisie libre</span>
          </button>
          <button
            onClick={handleLoadFromItinerary}
            className={cn(
              "p-2 rounded-lg border text-center text-xs transition-all",
              inputMode === 'itinerary' ? "border-primary bg-primary/10" : "border-border/50 hover:border-primary/50"
            )}
          >
            <Navigation className="w-4 h-4 mx-auto mb-1 text-primary" />
            <span>Itinéraire</span>
          </button>
          <button
            onClick={() => setLoadTourOpen(true)}
            className={cn(
              "p-2 rounded-lg border text-center text-xs transition-all",
              inputMode === 'tour' ? "border-primary bg-primary/10" : "border-border/50 hover:border-primary/50"
            )}
          >
            <Folder className="w-4 h-4 mx-auto mb-1 text-primary" />
            <span>Tournée</span>
          </button>
        </div>

        {/* Address inputs with autocomplete */}
        <div className="space-y-3">
          <AddressInput
            value={origin}
            onChange={setOrigin}
            onSelect={(address, position) => {
              setOrigin(address);
              setOriginPosition({ lat: position.lat, lon: position.lon });
            }}
            label="Origine"
            placeholder="Ex: 15 rue de la Paix, 75002 Paris"
            icon="start"
          />

          {/* Swap button */}
          <div className="flex justify-center py-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={swapOriginDestination}
              className="text-muted-foreground hover:text-primary h-8 w-8 p-0"
              title="Intervertir origine et destination"
              disabled={!origin && !destination}
            >
              <ArrowRightLeft className="w-4 h-4 rotate-90" />
            </Button>
          </div>

          {/* Stops */}
          {stops.length > 0 && (
            <div className="space-y-2">
              {stops.map((stop, index) => (
                <div key={stop.id} className="flex items-start gap-2">
                  <div className="flex-1">
                    <AddressInput
                      value={stop.address}
                      onChange={(value) => updateStop(stop.id, value, null)}
                      onSelect={(address, position) => updateStop(stop.id, address, { lat: position.lat, lon: position.lon })}
                      label={`Arrêt ${index + 1}`}
                      placeholder="Adresse de l'arrêt..."
                      icon="start"
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="mt-7 text-muted-foreground hover:text-destructive"
                    onClick={() => removeStop(stop.id)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Add stop button */}
          <Button
            variant="outline"
            size="sm"
            onClick={addStop}
            className="w-full border-dashed"
          >
            <Plus className="w-4 h-4 mr-2" />
            Ajouter un arrêt
          </Button>

          <AddressInput
            value={destination}
            onChange={setDestination}
            onSelect={(address, position) => {
              setDestination(address);
              setDestinationPosition({ lat: position.lat, lon: position.lon });
            }}
            label="Destination"
            placeholder="Ex: 25 avenue des Champs-Élysées, 75008 Paris"
            icon="end"
          />
        </div>
      </div>

      {/* Vehicle */}
      <div className="glass-card p-5 opacity-0 animate-slide-up" style={{ animationDelay: '100ms', animationFillMode: 'forwards' }}>
        <div className="flex items-center gap-2 mb-4">
          <Truck className="w-5 h-5 text-primary" />
          <h2 className="font-semibold text-foreground">Véhicule</h2>
        </div>
        <Select value={selectedVehicleId} onValueChange={setSelectedVehicleId}>
          <SelectTrigger>
            <SelectValue placeholder="Sélectionnez un véhicule" />
          </SelectTrigger>
          <SelectContent>
            {vehicles.map(v => (
              <SelectItem key={v.id} value={v.id}>
                {v.name} ({v.licensePlate})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedVehicle && (
          <div className="mt-3 p-2 bg-secondary/50 rounded text-xs">
            <p>{selectedVehicle.brand} {selectedVehicle.model} • {selectedVehicle.fuelConsumption}L/100km</p>
          </div>
        )}
      </div>

      {/* Drivers */}
      <div className="glass-card p-5 opacity-0 animate-slide-up" style={{ animationDelay: '150ms', animationFillMode: 'forwards' }}>
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-primary" />
          <h2 className="font-semibold text-foreground">Conducteurs pour relais</h2>
          <Badge variant="outline" className="ml-auto text-xs">
            {selectedDriverIds.length} sélectionné(s)
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          Sélectionnez plusieurs conducteurs pour analyser les options de relais
        </p>
        <div className="grid grid-cols-2 gap-2">
          {drivers.map(driver => (
            <button
              key={driver.id}
              onClick={() => toggleDriver(driver.id)}
              className={cn(
                "p-2 rounded border text-left text-sm transition-all",
                selectedDriverIds.includes(driver.id)
                  ? "border-primary bg-primary/10"
                  : "border-border/50 bg-muted/30"
              )}
            >
              <p className="font-medium">{driver.name}</p>
              <p className="text-xs text-muted-foreground">
                {driver.nightBonus ? `Nuit: +${driver.nightBonus}€` : ''}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Enhanced Constraints */}
      <div className="glass-card p-5 opacity-0 animate-slide-up" style={{ animationDelay: '200ms', animationFillMode: 'forwards' }}>
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-5 h-5 text-primary" />
          <h2 className="font-semibold text-foreground">Contraintes</h2>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ArrowRightLeft className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">Autoriser les relais</span>
            </div>
            <Switch checked={allowRelay} onCheckedChange={setAllowRelay} />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Moon className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">Préférer la nuit</span>
            </div>
            <Switch checked={preferNight} onCheckedChange={setPreferNight} />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">Éviter les weekends</span>
            </div>
            <Switch checked={avoidWeekends} onCheckedChange={setAvoidWeekends} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Conduite max/jour</Label>
              <Select value={String(maxDrivingHours)} onValueChange={(v) => setMaxDrivingHours(Number(v))}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="9">9h (standard)</SelectItem>
                  <SelectItem value="10">10h (2x/sem)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Urgence</Label>
              <Select value={urgency} onValueChange={(v) => setUrgency(v as Urgency)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="flexible">Flexible</SelectItem>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="express">Express</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="text-xs">Heure de départ souhaitée (optionnel)</Label>
            <Input
              type="time"
              value={departureTime}
              onChange={(e) => setDepartureTime(e.target.value)}
              className="mt-1"
            />
          </div>
        </div>
      </div>

      {/* Advanced Truck Driver Constraints */}
      <div className="glass-card p-5 opacity-0 animate-slide-up" style={{ animationDelay: '250ms', animationFillMode: 'forwards' }}>
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-5 h-5 text-primary" />
          <h2 className="font-semibold text-foreground">Contraintes conducteur routier</h2>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">Respect RSE strict</span>
            </div>
            <Switch checked={respectRSE} onCheckedChange={setRespectRSE} />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Timer className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">Inclure pauses repos (45min/4h30)</span>
            </div>
            <Switch checked={includeRestBreaks} onCheckedChange={setIncludeRestBreaks} />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Fuel className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">Inclure pauses repas</span>
            </div>
            <Switch checked={includeMealBreaks} onCheckedChange={setIncludeMealBreaks} />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Moon className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">Repos de nuit obligatoire (11h)</span>
            </div>
            <Switch checked={requireOvernightRest} onCheckedChange={setRequireOvernightRest} />
          </div>

          <div className="border-t pt-4">
            <p className="text-xs font-medium text-muted-foreground mb-3">Restrictions véhicule</p>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">Éviter ponts bas</span>
              </div>
              <Switch checked={avoidLowBridges} onCheckedChange={setAvoidLowBridges} />
            </div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">Éviter limitations tonnage</span>
              </div>
              <Switch checked={avoidWeightRestrictions} onCheckedChange={setAvoidWeightRestrictions} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Hauteur véhicule (m)</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="2"
                  max="5"
                  value={vehicleHeight}
                  onChange={(e) => setVehicleHeight(Number(e.target.value))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">PTAC (tonnes)</Label>
                <Input
                  type="number"
                  step="1"
                  min="3.5"
                  max="44"
                  value={vehicleWeight}
                  onChange={(e) => setVehicleWeight(Number(e.target.value))}
                  className="mt-1"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Pause obligatoire après</Label>
              <Select value={String(maxConsecutiveDrivingHours)} onValueChange={(v) => setMaxConsecutiveDrivingHours(Number(v))}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="4.5">4h30 (RSE)</SelectItem>
                  <SelectItem value="4">4h00</SelectItem>
                  <SelectItem value="3.5">3h30</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {/* Analyze Button */}
      <Button
        onClick={handleAnalyze}
        disabled={loading || !origin || !destination || !selectedVehicleId || selectedDriverIds.length === 0}
        className="w-full"
        size="lg"
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Analyse IA en cours...
          </>
        ) : (
          <>
            <Sparkles className="w-5 h-5 mr-2" />
            Analyser et Optimiser
          </>
        )}
      </Button>
    </div>
  );
}
