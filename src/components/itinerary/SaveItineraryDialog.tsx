import { useState, useMemo } from 'react';
import { Save, Loader2, MapPin, Route, Euro, Users, Truck, Container } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useSavedTours } from '@/hooks/useSavedTours';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useApp } from '@/context/AppContext';
import { useCalculations } from '@/hooks/useCalculations';
import { calculateVehicleCosts, calculateTrailerCosts } from '@/hooks/useVehicleCost';
import type { Vehicle } from '@/types/vehicle';
import type { Trailer } from '@/types/trailer';
import type { LocalClient } from '@/types/local';
import type { TourStop } from '@/types/savedTour';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface RouteResult {
  distance: number;
  duration: number;
  tollCost: number;
  fuelCost: number;
  coordinates: [number, number][];
  type: 'highway' | 'national';
}

interface Position {
  lat: number;
  lon: number;
}

interface Waypoint {
  id: string;
  address: string;
  position: Position | null;
}

interface SaveItineraryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  route: RouteResult | null;
  originAddress: string;
  destinationAddress: string;
  stops: Waypoint[];
  selectedVehicleId: string | null;
  onSaved?: () => void;
}

export function SaveItineraryDialog({
  open,
  onOpenChange,
  route,
  originAddress,
  destinationAddress,
  stops,
  selectedVehicleId,
  onSaved,
}: SaveItineraryDialogProps) {
  const navigate = useNavigate();
  const { saveTour } = useSavedTours();
  const { vehicle, drivers, selectedDriverIds, charges, settings } = useApp();
  const [vehicles] = useLocalStorage<Vehicle[]>('optiflow_vehicles', []);
  const [trailers] = useLocalStorage<Trailer[]>('optiflow_trailers', []);
  const [clients] = useLocalStorage<LocalClient[]>('optiflow_clients', []);
  
  const [saving, setSaving] = useState(false);
  const [tourName, setTourName] = useState('');
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [selectedTrailerId, setSelectedTrailerId] = useState<string>('');
  const [selectedDriverIdsLocal, setSelectedDriverIdsLocal] = useState<string[]>(selectedDriverIds);
  const [notes, setNotes] = useState('');
  const [goToCalculator, setGoToCalculator] = useState(true);
  
  // Get selected vehicle and trailer
  const selectedVehicle = useMemo(() => 
    vehicles.find(v => v.id === selectedVehicleId) || null,
  [vehicles, selectedVehicleId]);
  
  const selectedTrailer = useMemo(() => 
    trailers.find(t => t.id === selectedTrailerId) || null,
  [trailers, selectedTrailerId]);
  
  // Calculate costs
  const selectedDrivers = drivers.filter(d => selectedDriverIdsLocal.includes(d.id));
  
  const effectiveVehicle = useMemo(() => {
    if (selectedVehicle) {
      return {
        ...vehicle,
        fuelConsumption: selectedVehicle.fuelConsumption,
        adBlueConsumption: selectedVehicle.adBlueConsumption,
      };
    }
    return vehicle;
  }, [selectedVehicle, vehicle]);
  
  const tripData = useMemo(() => ({
    distance: route?.distance || 0,
    tollCost: route?.tollCost || 0,
    tollIsHT: true,
    tollClass: 2 as const,
    targetMargin: 15,
    pricePerKm: 0,
    fixedPrice: 0,
    pricingMode: 'auto' as const,
    hourlyRate: 0,
    estimatedHours: 0,
    pricePerStop: 0,
    numberOfStops: stops.filter(s => s.position).length,
  }), [route, stops]);
  
  const costs = useCalculations(tripData, effectiveVehicle, selectedDrivers, charges, settings);
  
  // Calculate vehicle and trailer costs
  const vehicleCostBreakdown = useMemo(() => {
    if (!selectedVehicle) return null;
    return calculateVehicleCosts(selectedVehicle, {
      fuelPriceHT: vehicle.fuelPriceHT,
      adBluePriceHT: vehicle.adBluePriceHT,
    });
  }, [selectedVehicle, vehicle.fuelPriceHT, vehicle.adBluePriceHT]);
  
  const trailerCostBreakdown = useMemo(() => {
    if (!selectedTrailer) return null;
    return calculateTrailerCosts(selectedTrailer, {});
  }, [selectedTrailer]);
  
  const vehicleCostForTrip = vehicleCostBreakdown 
    ? (vehicleCostBreakdown.maintenanceCostPerKm + vehicleCostBreakdown.tireCostPerKm + vehicleCostBreakdown.fixedCostPerKm) * (route?.distance || 0)
    : 0;
  
  const trailerCostForTrip = trailerCostBreakdown 
    ? trailerCostBreakdown.totalCostPerKm * (route?.distance || 0)
    : 0;
  
  const totalCost = costs.totalCost + vehicleCostForTrip + trailerCostForTrip;
  const suggestedPrice = totalCost * 1.15; // 15% margin
  const profit = suggestedPrice - totalCost;
  const profitMargin = suggestedPrice > 0 ? (profit / suggestedPrice) * 100 : 0;
  
  // Set default tour name when dialog opens
  const defaultTourName = useMemo(() => {
    const origin = originAddress.split(',')[0] || 'Départ';
    const dest = destinationAddress.split(',')[0] || 'Arrivée';
    return `${origin} → ${dest}`;
  }, [originAddress, destinationAddress]);
  
  // Reset form when dialog opens
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setTourName(defaultTourName);
      setSelectedDriverIdsLocal(selectedDriverIds);
      setSelectedTrailerId('');
      setNotes('');
    }
    onOpenChange(newOpen);
  };
  
  const toggleDriver = (driverId: string) => {
    setSelectedDriverIdsLocal(prev => 
      prev.includes(driverId) 
        ? prev.filter(id => id !== driverId)
        : [...prev, driverId]
    );
  };
  
  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value);
  
  const formatDuration = (hours: number) => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h${m.toString().padStart(2, '0')}`;
  };
  
  const handleSave = async () => {
    if (!route || !tourName.trim()) {
      toast.error('Veuillez renseigner un nom pour la tournée');
      return;
    }
    
    setSaving(true);
    try {
      const tourStops: TourStop[] = stops
        .filter(s => s.position)
        .map(s => ({
          address: s.address,
          lat: s.position?.lat,
          lng: s.position?.lon,
        }));
      
      const savedTour = await saveTour({
        name: tourName.trim(),
        client_id: selectedClientId || null,
        origin_address: originAddress,
        destination_address: destinationAddress,
        stops: tourStops,
        distance_km: route.distance,
        duration_minutes: Math.round(route.duration * 60),
        toll_cost: route.tollCost,
        fuel_cost: route.fuelCost,
        adblue_cost: costs.adBlue,
        driver_cost: costs.driverCost,
        structure_cost: costs.structureCost,
        vehicle_cost: vehicleCostForTrip,
        total_cost: totalCost,
        pricing_mode: 'auto',
        price_per_km: 0,
        fixed_price: 0,
        target_margin: 15,
        revenue: suggestedPrice,
        profit: profit,
        profit_margin: profitMargin,
        vehicle_id: selectedVehicleId,
        vehicle_data: selectedVehicle,
        trailer_id: selectedTrailerId || null,
        trailer_data: selectedTrailer,
        driver_ids: selectedDriverIdsLocal,
        drivers_data: selectedDrivers,
        notes: notes.trim() || undefined,
        tags: [],
      });
      
      if (savedTour) {
        onOpenChange(false);
        onSaved?.();
        
        if (goToCalculator) {
          // Navigate to calculator with the saved tour data
          navigate('/calculator', { state: { loadTourId: savedTour.id } });
        }
      }
    } finally {
      setSaving(false);
    }
  };
  
  if (!route) return null;
  
  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Save className="w-5 h-5 text-primary" />
            Sauvegarder l'itinéraire
          </DialogTitle>
          <DialogDescription>
            Enregistrez cet itinéraire pour le retrouver et l'importer dans le calculateur
          </DialogDescription>
        </DialogHeader>
        
        {/* Route Summary */}
        <div className="bg-muted/50 rounded-lg p-4 space-y-2">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-success" />
            <span className="text-sm font-medium truncate">{originAddress}</span>
          </div>
          {stops.filter(s => s.position).length > 0 && (
            <div className="ml-6 text-xs text-muted-foreground">
              {stops.filter(s => s.position).length} étape(s)
            </div>
          )}
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-destructive" />
            <span className="text-sm font-medium truncate">{destinationAddress}</span>
          </div>
          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border text-sm">
            <span><strong>{route.distance}</strong> km</span>
            <span><strong>{formatDuration(route.duration)}</strong></span>
            <span className="text-warning">{formatCurrency(route.tollCost)} péages</span>
            <span className="text-primary">{formatCurrency(route.fuelCost)} carburant</span>
          </div>
        </div>
        
        <div className="space-y-4">
          {/* Tour name */}
          <div className="space-y-2">
            <Label htmlFor="tourName">Nom de la tournée *</Label>
            <Input
              id="tourName"
              value={tourName}
              onChange={(e) => setTourName(e.target.value)}
              placeholder="Ex: Livraison Paris-Lyon"
            />
          </div>
          
          {/* Client selection */}
          {clients.length > 0 && (
            <div className="space-y-2">
              <Label>Client (optionnel)</Label>
              <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Aucun client" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Aucun client</SelectItem>
                  {clients.map(client => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name} {client.company ? `(${client.company})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          
          {/* Vehicle info */}
          {selectedVehicle && (
            <div className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg">
              <Truck className="w-5 h-5 text-primary" />
              <div>
                <p className="font-medium text-sm">{selectedVehicle.name}</p>
                <p className="text-xs text-muted-foreground">
                  {selectedVehicle.brand} {selectedVehicle.model}
                </p>
              </div>
            </div>
          )}
          
          {/* Trailer selection */}
          {trailers.length > 0 && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Container className="w-4 h-4" />
                Remorque (optionnel)
              </Label>
              <Select value={selectedTrailerId} onValueChange={setSelectedTrailerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Aucune remorque" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Aucune remorque</SelectItem>
                  {trailers.map(trailer => (
                    <SelectItem key={trailer.id} value={trailer.id}>
                      {trailer.name} - {trailer.licensePlate || 'Sans immat.'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          
          {/* Driver selection */}
          {drivers.length > 0 && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Chauffeurs
              </Label>
              <div className="space-y-2 max-h-[100px] overflow-y-auto p-2 border border-border rounded-md">
                {drivers.map(driver => (
                  <div key={driver.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`save-driver-${driver.id}`}
                      checked={selectedDriverIdsLocal.includes(driver.id)}
                      onCheckedChange={() => toggleDriver(driver.id)}
                    />
                    <label 
                      htmlFor={`save-driver-${driver.id}`}
                      className="text-sm cursor-pointer flex-1"
                    >
                      {driver.name}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optionnel)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Instructions particulières, contraintes..."
              rows={2}
            />
          </div>
          
          {/* Cost summary */}
          <div className="bg-primary/10 rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <Euro className="w-4 h-4 text-primary" />
              <span className="font-medium">Estimation des coûts</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Péages + Carburant</span>
                <span>{formatCurrency(route.tollCost + route.fuelCost)}</span>
              </div>
              {costs.adBlue > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">AdBlue</span>
                  <span>{formatCurrency(costs.adBlue)}</span>
                </div>
              )}
              {costs.driverCost > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Chauffeur(s)</span>
                  <span>{formatCurrency(costs.driverCost)}</span>
                </div>
              )}
              {vehicleCostForTrip > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Véhicule</span>
                  <span>{formatCurrency(vehicleCostForTrip)}</span>
                </div>
              )}
            </div>
            <div className="flex justify-between pt-2 border-t border-border mt-2 font-bold">
              <span>Coût total estimé</span>
              <span className="text-primary">{formatCurrency(totalCost)}</span>
            </div>
          </div>
          
          {/* Go to calculator option */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="goToCalculator"
              checked={goToCalculator}
              onCheckedChange={(checked) => setGoToCalculator(!!checked)}
            />
            <label htmlFor="goToCalculator" className="text-sm cursor-pointer">
              Ouvrir dans le calculateur après sauvegarde
            </label>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleSave} disabled={saving || !tourName.trim()}>
            {saving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Sauvegarder
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
