import {
  Navigation,
  Loader2,
  ArrowUpDown,
  Building2,
  Heart,
  Plus,
  Truck,
  User,
  Car,
  AlertCircle,
} from 'lucide-react';
import {
  DndContext,
  closestCenter,
  type DragEndEvent,
  type SensorDescriptor,
  type SensorOptions,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Button } from '@/components/ui/button';
import { AddressInput } from '@/components/route/AddressInput';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { DriverSearchSelect } from '@/components/planning/DriverSearchSelect';
import { cn } from '@/lib/utils';
import { formatCostPerKm, type VehicleCostBreakdown } from '@/hooks/useVehicleCost';
import { SortableStop } from '@/components/itinerary/SortableStop';
import type { Position, Waypoint } from '@/types/itinerary';
import type { Vehicle } from '@/types/vehicle';
import type { Driver } from '@/types';
import type { ClientWithCreator } from '@/hooks/useClients';
import type { Trailer } from '@/types/trailer';

interface ItineraryRouteFormProps {
  originAddress: string;
  setOriginAddress: (value: string) => void;
  originPosition: Position | null;
  setOriginPosition: (position: Position | null) => void;
  destinationAddress: string;
  setDestinationAddress: (value: string) => void;
  destinationPosition: Position | null;
  setDestinationPosition: (position: Position | null) => void;
  openAddressSelector: (target: 'origin' | 'destination' | 'stop', stopId?: string) => void;
  toggleFavoriteAddress: (address: string, position: Position | null) => void;
  isFavorite: (lat: number, lon: number) => boolean;
  swapOriginWithNext: () => void;

  stops: Waypoint[];
  sensors: SensorDescriptor<SensorOptions>[];
  handleDragEnd: (event: DragEndEvent) => void;
  updateStop: (id: string, address: string, position: Position | null) => void;
  removeStop: (id: string) => void;
  swapStops: (index: number) => void;
  swapLastWithDestination: () => void;
  addStop: () => void;

  allVehicles: Vehicle[];
  selectedVehicleId: string | null;
  handleVehicleSelect: (vehicleId: string) => void;
  clients: ClientWithCreator[];
  selectedClientId: string | null;
  setSelectedClientId: (id: string | null) => void;
  drivers: Driver[];
  selectedDriverIds: string[];
  setSelectedDriverIds: (ids: string[]) => void;
  selectedTrailerId: string | null;
  setSelectedTrailerId: (id: string | null) => void;
  trailers: Trailer[];
  selectedVehicle: Vehicle | null;
  vehicleCostBreakdown: VehicleCostBreakdown | null;

  transportMode: 'truck' | 'car';
  setTransportMode: (mode: 'truck' | 'car') => void;
  clearResults: () => void;

  handleCalculateRoutes: () => void | Promise<void>;
  loading: boolean;
  error: string | null;
}

/**
 * Formulaire de saisie du trajet (origine/destination/arrêts, véhicule,
 * client, conducteur, remorque, mode de transport, bouton de calcul) de la
 * page Itinéraire. Extrait de src/pages/Itinerary.tsx pour alléger ce
 * fichier — comportement identique.
 */
export function ItineraryRouteForm({
  originAddress,
  setOriginAddress,
  originPosition,
  setOriginPosition,
  destinationAddress,
  setDestinationAddress,
  destinationPosition,
  setDestinationPosition,
  openAddressSelector,
  toggleFavoriteAddress,
  isFavorite,
  swapOriginWithNext,
  stops,
  sensors,
  handleDragEnd,
  updateStop,
  removeStop,
  swapStops,
  swapLastWithDestination,
  addStop,
  allVehicles,
  selectedVehicleId,
  handleVehicleSelect,
  clients,
  selectedClientId,
  setSelectedClientId,
  drivers,
  selectedDriverIds,
  setSelectedDriverIds,
  selectedTrailerId,
  setSelectedTrailerId,
  trailers,
  selectedVehicle,
  vehicleCostBreakdown,
  transportMode,
  setTransportMode,
  clearResults,
  handleCalculateRoutes,
  loading,
  error,
}: ItineraryRouteFormProps) {
  return (
    <>
      {/* Origin & Destination */}
      <div className="space-y-3 bg-card/60 rounded-2xl p-4 border border-border/30 shadow-sm">
        {/* Origin */}
        <div className="flex items-start gap-3 animate-fade-in">
          <div className="mt-3 relative">
            <div className="w-4 h-4 rounded-full bg-gradient-to-br from-primary to-primary/70 shadow-md ring-4 ring-primary/20" />
            <div className="absolute top-5 left-1/2 -translate-x-1/2 w-0.5 h-8 bg-gradient-to-b from-primary/50 to-transparent" />
          </div>
          <div className="flex-1">
            <AddressInput
              value={originAddress}
              onChange={setOriginAddress}
              onSelect={(address, position) => { setOriginAddress(address); setOriginPosition(position); }}
              label=""
              placeholder="Adresse de départ"
              icon="start"
            />
          </div>
          <div className="flex gap-1 pt-1.5">
            <Button variant="ghost" size="icon" className="h-9 w-9 hover:bg-primary/10 transition-colors" onClick={() => openAddressSelector('origin')}>
              <Building2 className="w-4 h-4 text-muted-foreground" />
            </Button>
            <Button variant="ghost" size="icon" className="h-9 w-9 hover:bg-destructive/10 transition-colors" onClick={() => toggleFavoriteAddress(originAddress, originPosition)} disabled={!originAddress || !originPosition}>
              <Heart className={cn("w-4 h-4 transition-all", originPosition && isFavorite(originPosition.lat, originPosition.lon) ? "fill-destructive text-destructive scale-110" : "text-muted-foreground")} />
            </Button>
          </div>
        </div>

        {/* Swap button */}
        <div className="flex items-center gap-3 ml-7">
          <div className="h-px flex-1 bg-gradient-to-r from-border to-transparent" />
          <Button variant="outline" size="icon" className="h-7 w-7 rounded-full border-dashed hover:border-primary hover:bg-primary/5 transition-all" onClick={swapOriginWithNext}>
            <ArrowUpDown className="w-3 h-3" />
          </Button>
          <div className="h-px flex-1 bg-gradient-to-l from-border to-transparent" />
        </div>

        {/* Stops */}
        {stops.length > 0 && (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={stops.map(s => s.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2 ml-7">
                {stops.map((stop, index) => (
                  <SortableStop
                    key={stop.id}
                    stop={stop}
                    index={index}
                    onUpdate={updateStop}
                    onRemove={removeStop}
                    onSwap={() => index < stops.length - 1 ? swapStops(index) : swapLastWithDestination()}
                    isLast={index === stops.length - 1}
                    onOpenAddressSelector={(stopId) => openAddressSelector('stop', stopId)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}

        {/* Add stop */}
        <Button variant="ghost" size="sm" onClick={addStop} className="ml-7 text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all rounded-full">
          <Plus className="w-4 h-4 mr-1.5" /> Ajouter un arrêt
        </Button>

        {/* Destination */}
        <div className="flex items-start gap-3 animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <div className="mt-3 relative">
            <div className="absolute bottom-5 left-1/2 -translate-x-1/2 w-0.5 h-8 bg-gradient-to-t from-destructive/50 to-transparent" />
            <div className="w-4 h-4 rounded-full bg-gradient-to-br from-destructive to-destructive/70 shadow-md ring-4 ring-destructive/20" />
          </div>
          <div className="flex-1">
            <AddressInput
              value={destinationAddress}
              onChange={setDestinationAddress}
              onSelect={(address, position) => { setDestinationAddress(address); setDestinationPosition(position); }}
              label=""
              placeholder="Adresse d'arrivée"
              icon="end"
            />
          </div>
          <div className="flex gap-1 pt-1.5">
            <Button variant="ghost" size="icon" className="h-9 w-9 hover:bg-primary/10 transition-colors" onClick={() => openAddressSelector('destination')}>
              <Building2 className="w-4 h-4 text-muted-foreground" />
            </Button>
            <Button variant="ghost" size="icon" className="h-9 w-9 hover:bg-destructive/10 transition-colors" onClick={() => toggleFavoriteAddress(destinationAddress, destinationPosition)} disabled={!destinationAddress || !destinationPosition}>
              <Heart className={cn("w-4 h-4 transition-all", destinationPosition && isFavorite(destinationPosition.lat, destinationPosition.lon) ? "fill-destructive text-destructive scale-110" : "text-muted-foreground")} />
            </Button>
          </div>
        </div>
      </div>

      {/* Options */}
      <div className="p-4 rounded-2xl bg-card/60 border border-border/30 shadow-sm space-y-4 animate-fade-in" style={{ animationDelay: '0.15s' }}>
        <div className="flex items-center gap-2 text-sm font-medium text-foreground/80">
          <Truck className="w-4 h-4 text-primary" />
          <span>Options du trajet</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <SearchableSelect
            value={selectedVehicleId || ''}
            onValueChange={(v) => handleVehicleSelect(v || 'none')}
            options={allVehicles.map(v => ({ value: v.id, label: v.name, sublabel: v.licensePlate || undefined }))}
            placeholder="Véhicule"
            emptyLabel="Par défaut"
            searchPlaceholder="Rechercher un véhicule..."
            icon={<Truck className="w-4 h-4 text-primary/70" />}
            triggerClassName="h-11"
          />

          <SearchableSelect
            value={selectedClientId || ''}
            onValueChange={(v) => setSelectedClientId(v || null)}
            options={clients.map(c => ({ value: c.id, label: c.name }))}
            placeholder="Client"
            emptyLabel="Aucun"
            searchPlaceholder="Rechercher un client..."
            icon={<User className="w-4 h-4 text-secondary/70" />}
            triggerClassName="h-11"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <DriverSearchSelect
            drivers={drivers}
            value={selectedDriverIds[0] || ''}
            onChange={(id) => {
              setSelectedDriverIds(id ? [id] : []);
            }}
            placeholder="Conducteur"
          />

          <SearchableSelect
            value={selectedTrailerId || ''}
            onValueChange={(v) => setSelectedTrailerId(v || null)}
            options={trailers.filter(t => t.isActive).map(t => ({ value: t.id, label: t.name, sublabel: t.licensePlate || undefined }))}
            placeholder="Remorque"
            emptyLabel="Aucune"
            searchPlaceholder="Rechercher une remorque..."
            icon={<Truck className="w-4 h-4 text-warning/70" />}
            triggerClassName="h-11"
          />
        </div>

        {selectedVehicle && vehicleCostBreakdown && (
          <div className="flex items-center justify-between text-sm p-3 rounded-xl bg-primary/5 border border-primary/10">
            <span className="text-muted-foreground flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              {selectedVehicle.name}
            </span>
            <span className="font-semibold text-primary">{formatCostPerKm(vehicleCostBreakdown.totalCostPerKm)}/km</span>
          </div>
        )}
      </div>

      {/* Transport mode selector */}
      <div className="flex items-center gap-2 p-1 bg-muted/50 rounded-xl border border-border/40">
        <button
          type="button"
          onClick={() => { setTransportMode('truck'); clearResults(); }}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 h-10 rounded-lg text-sm font-medium transition-all",
            transportMode === 'truck'
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Truck className="w-4 h-4" /> Camion
        </button>
        <button
          type="button"
          onClick={() => { setTransportMode('car'); clearResults(); }}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 h-10 rounded-lg text-sm font-medium transition-all",
            transportMode === 'car'
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Car className="w-4 h-4" /> Voiture
        </button>
      </div>

      {/* Calculate Button */}
      <Button
        onClick={handleCalculateRoutes}
        disabled={loading || !originPosition || !destinationPosition}
        className="w-full h-12 text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-300 animate-fade-in"
        style={{ animationDelay: '0.2s' }}
        size="lg"
        variant="gradient"
      >
        {loading ? (
          <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Calcul en cours...</>
        ) : (
          <><Navigation className="w-5 h-5 mr-2" /> Calculer l'itinéraire</>
        )}
      </Button>

      {error && (
        <div className="flex items-center gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive animate-scale-in">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}
    </>
  );
}
