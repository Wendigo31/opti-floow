import { useMemo, useCallback, useEffect, useRef } from 'react';
import { 
  MapPin, 
  Navigation, 
  Loader2, 
  Route, 
  Fuel, 
  ArrowRight,
  ArrowDown,
  ArrowUpDown,
  Milestone,
  TreePine,
  CheckCircle2,
  AlertCircle,
  Plus,
  X,
  GripVertical,
  Save,
  History,
  User,
  Truck,
  Users,
  Edit3,
  Euro,
  TrendingUp,
  Calculator,
  Building2,
  Star,
  Heart,
  PanelLeftOpen,
  PanelLeftClose,
  Settings2,
  Folder,
  Upload
} from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { AddressInput } from '@/components/route/AddressInput';
import { MapPreview } from '@/components/map/MapPreview';
import { useApp } from '@/context/AppContext';
import { useCalculations } from '@/hooks/useCalculations';
import { FRENCH_TOLL_RATES, SEMI_TRAILER_SPECS } from '@/hooks/useTomTom';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useState } from 'react';

import { supabase } from '@/integrations/supabase/client';

import { cn } from '@/lib/utils';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useItineraryState } from '@/hooks/useItineraryState';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import type { LocalTrip, LocalClient, LocalClientReport } from '@/types/local';
import { generateId } from '@/types/local';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import type { Vehicle } from '@/types/vehicle';
import { calculateVehicleCosts, formatCostPerKm } from '@/hooks/useVehicleCost';
import { AddressSelectorDialog } from '@/components/itinerary/AddressSelectorDialog';
import { useFavoriteAddresses } from '@/hooks/useFavoriteAddresses';
import { SaveItineraryDialog } from '@/components/itinerary/SaveItineraryDialog';
import { LoadItineraryDialog } from '@/components/itinerary/LoadItineraryDialog';
import { useTruckRestrictions, type TruckRestriction } from '@/hooks/useTruckRestrictions';
import type { SavedTour } from '@/types/savedTour';
import { useSearchHistory, type SearchHistoryEntry } from '@/hooks/useSearchHistory';
import { SearchHistoryDialog } from '@/components/itinerary/SearchHistoryDialog';

// Decode Google polyline encoding
function decodePolyline(encoded: string): [number, number][] {
  const points: [number, number][] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const dlat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const dlng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    points.push([lat / 1e5, lng / 1e5]);
  }

  return points;
}

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

interface SortableStopProps {
  stop: Waypoint;
  index: number;
  onUpdate: (id: string, address: string, position: Position | null) => void;
  onRemove: (id: string) => void;
  onSwap: () => void;
  isLast: boolean;
  onOpenAddressSelector: (stopId: string) => void;
}

function SortableStop({ stop, index, onUpdate, onRemove, onSwap, isLast, onOpenAddressSelector }: SortableStopProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: stop.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <div className="flex items-start gap-2">
        <button
          {...attributes}
          {...listeners}
          className="mt-8 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground touch-none"
        >
          <GripVertical className="w-4 h-4" />
        </button>
        <div className="flex-1">
          <AddressInput
            value={stop.address}
            onChange={(value) => onUpdate(stop.id, value, null)}
            onSelect={(address, position) => onUpdate(stop.id, address, position)}
            label={`Arrêt ${index + 1}`}
            placeholder="Adresse de l'arrêt..."
            icon="start"
          />
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="mt-7 text-muted-foreground hover:text-primary"
          onClick={() => onOpenAddressSelector(stop.id)}
          title="Sélectionner une adresse transporteur"
        >
          <Building2 className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="mt-7 text-muted-foreground hover:text-destructive"
          onClick={() => onRemove(stop.id)}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
      
      {/* Swap button between this stop and next (or destination if last) */}
      <div className="flex justify-center py-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={onSwap}
          className="text-muted-foreground hover:text-primary h-8 w-8 p-0"
          title="Interchanger avec le suivant"
        >
          <ArrowUpDown className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

export default function Itinerary() {
  const { vehicle, trip, setTrip, setVehicle, drivers, selectedDriverIds, charges, settings } = useApp();
  const { toast } = useToast();
  const [trips, setTrips] = useLocalStorage<LocalTrip[]>('optiflow_trips', []);
  const [clients] = useLocalStorage<LocalClient[]>('optiflow_clients', []);
  const [reports, setReports] = useLocalStorage<LocalClientReport[]>('optiflow_client_reports', []);
  const [vehicles] = useLocalStorage<Vehicle[]>('optiflow_vehicles', []);
  
  // Use persistent state for itinerary search
  const {
    originAddress,
    originPosition,
    destinationAddress,
    destinationPosition,
    stops,
    selectedVehicleId,
    selectedClientId,
    avoidLowBridges,
    avoidWeightRestrictions,
    avoidTruckForbidden,
    highwayRoute,
    nationalRoute,
    selectedRouteType,
    isPanelOpen,
    setOriginAddress,
    setOriginPosition,
    setDestinationAddress,
    setDestinationPosition,
    setStops,
    setSelectedVehicleId,
    setSelectedClientId,
    setAvoidLowBridges,
    setAvoidWeightRestrictions,
    setAvoidTruckForbidden,
    setHighwayRoute,
    setNationalRoute,
    setSelectedRouteType,
    setIsPanelOpen,
    clearState: clearItineraryState,
  } = useItineraryState();
  
  // Favorite addresses
  const { favorites, addFavorite, removeFavorite, isFavorite } = useFavoriteAddresses();
  
  // Search history
  const { 
    history: searchHistory, 
    uncalculatedSearches, 
    addSearch, 
    markAsCalculated,
    removeSearch,
    clearHistory 
  } = useSearchHistory();
  
  // Track current search ID for marking as calculated
  const currentSearchIdRef = useRef<string | null>(null);
  
  // Truck restrictions
  const { 
    restrictions: truckRestrictions, 
    loading: restrictionsLoading, 
    fetchRestrictions 
  } = useTruckRestrictions();
  
  // Address selector dialog
  const [addressSelectorOpen, setAddressSelectorOpen] = useState(false);
  const [addressSelectorTarget, setAddressSelectorTarget] = useState<'origin' | 'destination' | 'stop'>('origin');
  const [addressSelectorStopId, setAddressSelectorStopId] = useState<string | null>(null);
  
  // Selected vehicle from list
  const selectedVehicle = useMemo(() => 
    vehicles.find(v => v.id === selectedVehicleId) || null,
  [vehicles, selectedVehicleId]);
  
  // Calculate vehicle cost breakdown when a vehicle is selected
  const vehicleCostBreakdown = useMemo(() => {
    if (!selectedVehicle) return null;
    return calculateVehicleCosts(selectedVehicle, {
      fuelPriceHT: vehicle.fuelPriceHT,
      adBluePriceHT: vehicle.adBluePriceHT,
    });
  }, [selectedVehicle, vehicle.fuelPriceHT, vehicle.adBluePriceHT]);
  
  // Save to client dialog
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [routeToSave, setRouteToSave] = useState<RouteResult | null>(null);
  const [saveFormData, setSaveFormData] = useState({
    title: '',
    selectedClientId: '',
    includeCharges: true,
    selectedDriverIds: [] as string[],
    revenue: 0,
  });
  
  // Save/Load itinerary dialogs
  const [saveItineraryOpen, setSaveItineraryOpen] = useState(false);
  const [loadItineraryOpen, setLoadItineraryOpen] = useState(false);
  const [routeForSave, setRouteForSave] = useState<RouteResult | null>(null);
  
  // Get selected drivers for calculations
  const selectedDrivers = drivers.filter(d => selectedDriverIds.includes(d.id));
  const costs = useCalculations(trip, vehicle, selectedDrivers, charges, settings);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Auto-save search to history when origin and destination are set
  useEffect(() => {
    // Only save if we have both origin and destination addresses with positions
    if (originAddress && destinationAddress && originPosition && destinationPosition) {
      const saveSearch = async () => {
        const searchId = await addSearch({
          originAddress,
          originPosition,
          destinationAddress,
          destinationPosition,
          stops,
          vehicleId: selectedVehicleId,
          clientId: selectedClientId,
          calculated: false,
        });
        if (searchId) {
          currentSearchIdRef.current = searchId;
        }
      };
      saveSearch();
    }
  }, [originAddress, destinationAddress, originPosition, destinationPosition, stops, selectedVehicleId, selectedClientId, addSearch]);
  
  // Load a search from history
  const handleLoadSearchHistory = useCallback((entry: SearchHistoryEntry) => {
    setOriginAddress(entry.originAddress);
    setOriginPosition(entry.originPosition);
    setDestinationAddress(entry.destinationAddress);
    setDestinationPosition(entry.destinationPosition);
    setStops(entry.stops);
    if (entry.vehicleId) {
      setSelectedVehicleId(entry.vehicleId);
    }
    if (entry.clientId) {
      setSelectedClientId(entry.clientId);
    }
    // Clear previous results
    clearResults();
    
    toast({
      title: "Recherche chargée",
      description: "Cliquez sur Calculer pour recalculer l'itinéraire",
    });
  }, [setOriginAddress, setOriginPosition, setDestinationAddress, setDestinationPosition, setStops, setSelectedVehicleId, setSelectedClientId, toast]);

  // Handle loading a saved tour into the itinerary
  const handleLoadSavedTour = (tour: SavedTour) => {
    // Set origin
    setOriginAddress(tour.origin_address);
    setOriginPosition(null); // Will be re-geocoded on search
    
    // Set destination
    setDestinationAddress(tour.destination_address);
    setDestinationPosition(null);
    
    // Set stops
    const loadedStops: Waypoint[] = tour.stops.map((stop, idx) => ({
      id: crypto.randomUUID(),
      address: stop.address,
      position: stop.lat && stop.lng ? { lat: stop.lat, lon: stop.lng } : null,
    }));
    setStops(loadedStops);
    
    // Set vehicle if available
    if (tour.vehicle_id) {
      const vehicleExists = vehicles.find(v => v.id === tour.vehicle_id);
      if (vehicleExists) {
        setSelectedVehicleId(tour.vehicle_id);
        setVehicle(prev => ({
          ...prev,
          fuelConsumption: vehicleExists.fuelConsumption,
          adBlueConsumption: vehicleExists.adBlueConsumption,
        }));
      }
    }
    
    // Apply toll and fuel costs to trip
    setTrip(prev => ({
      ...prev,
      distance: tour.distance_km,
      tollCost: tour.toll_cost,
    }));
    
    // Clear any previous route results - user needs to recalculate
    clearResults();
    
    toast({
      title: "Tournée chargée",
      description: `"${tour.name}" - Cliquez sur Calculer pour recalculer l'itinéraire`,
    });
  };
  
  // Open save dialog with current route
  const handleOpenSaveItinerary = (route: RouteResult) => {
    setRouteForSave(route);
    setSaveItineraryOpen(true);
  };
  
  // Handle address selection from dialog
  const handleAddressSelect = (address: string, position: { lat: number; lon: number }) => {
    const pos = { lat: position.lat, lon: position.lon };
    
    if (addressSelectorTarget === 'origin') {
      setOriginAddress(address);
      setOriginPosition(pos);
    } else if (addressSelectorTarget === 'destination') {
      setDestinationAddress(address);
      setDestinationPosition(pos);
    } else if (addressSelectorTarget === 'stop' && addressSelectorStopId) {
      updateStop(addressSelectorStopId, address, pos);
    }
    
    setAddressSelectorOpen(false);
  };
  
  // Open address selector for a specific target
  const openAddressSelector = (target: 'origin' | 'destination' | 'stop', stopId?: string) => {
    setAddressSelectorTarget(target);
    setAddressSelectorStopId(stopId || null);
    setAddressSelectorOpen(true);
  };
  
  // Toggle favorite for current address
  const toggleFavoriteAddress = (address: string, position: Position | null) => {
    if (!address || !position) return;
    
    if (isFavorite(position.lat, position.lon)) {
      // Find favorite by coordinates (more reliable than address string)
      const fav = favorites.find(f => 
        Math.abs(f.lat - position.lat) < 0.0001 && 
        Math.abs(f.lon - position.lon) < 0.0001
      );
      if (fav) removeFavorite(fav.id);
      toast({ title: "Adresse retirée des favoris" });
    } else {
      addFavorite({
        name: address.split(',')[0] || address,
        address,
        lat: position.lat,
        lon: position.lon,
      });
      toast({ title: "Adresse ajoutée aux favoris" });
    }
  };

  // selectedRoute is derived from the persisted selectedRouteType
  const selectedRoute = selectedRouteType;

  // Apply vehicle parameters when a vehicle is selected
  const handleVehicleSelect = (vehicleId: string) => {
    setSelectedVehicleId(vehicleId === 'none' ? null : vehicleId);
    
    if (vehicleId !== 'none') {
      const selectedV = vehicles.find(v => v.id === vehicleId);
      if (selectedV) {
        // Update the global vehicle parameters with the selected vehicle's values
        setVehicle(prev => ({
          ...prev,
          fuelConsumption: selectedV.fuelConsumption,
          adBlueConsumption: selectedV.adBlueConsumption,
        }));
      }
    }
  };

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = stops.findIndex((item) => item.id === active.id);
      const newIndex = stops.findIndex((item) => item.id === over.id);
      setStops(arrayMove(stops, oldIndex, newIndex));
      clearResults();
    }
  };

  const addStop = () => {
    const newId = typeof crypto !== 'undefined' && crypto.randomUUID 
      ? crypto.randomUUID() 
      : generateId();
    setStops([...stops, { id: newId, address: '', position: null }]);
  };

  const removeStop = (id: string) => {
    setStops(stops.filter(s => s.id !== id));
  };

  const updateStop = (id: string, address: string, position: Position | null) => {
    setStops(stops.map(s => 
      s.id === id ? { ...s, address, position } : s
    ));
  };

  // Swap origin with first stop or destination
  const swapOriginWithNext = () => {
    if (stops.length > 0) {
      const firstStop = stops[0];
      const newStops = [...stops];
      newStops[0] = { ...firstStop, address: originAddress, position: originPosition };
      setOriginAddress(firstStop.address);
      setOriginPosition(firstStop.position);
      setStops(newStops);
    } else {
      const tempAddress = originAddress;
      const tempPosition = originPosition;
      setOriginAddress(destinationAddress);
      setOriginPosition(destinationPosition);
      setDestinationAddress(tempAddress);
      setDestinationPosition(tempPosition);
    }
    clearResults();
  };

  // Swap two consecutive stops
  const swapStops = (index: number) => {
    if (index >= stops.length - 1) return;
    const newStops = [...stops];
    [newStops[index], newStops[index + 1]] = [newStops[index + 1], newStops[index]];
    setStops(newStops);
    clearResults();
  };

  // Swap a stop with destination
  const swapStopWithDestination = (index: number) => {
    const stop = stops[index];
    const newStops = [...stops];
    newStops[index] = { ...stop, address: destinationAddress, position: destinationPosition };
    setDestinationAddress(stop.address);
    setDestinationPosition(stop.position);
    setStops(newStops);
    clearResults();
  };

  // Swap last stop with destination (or origin with destination if no stops)
  const swapLastWithDestination = () => {
    if (stops.length > 0) {
      swapStopWithDestination(stops.length - 1);
    } else {
      const tempAddress = originAddress;
      const tempPosition = originPosition;
      setOriginAddress(destinationAddress);
      setOriginPosition(destinationPosition);
      setDestinationAddress(tempAddress);
      setDestinationPosition(tempPosition);
      clearResults();
    }
  };

  const clearResults = () => {
    setHighwayRoute(null);
    setNationalRoute(null);
    setSelectedRouteType('highway');
  };

  const calculateFuelCost = (distanceKm: number): number => {
    const litersNeeded = (distanceKm / 100) * vehicle.fuelConsumption;
    return litersNeeded * vehicle.fuelPriceHT;
  };

  const buildWaypointsString = (): string => {
    const points: string[] = [];
    
    if (originPosition) {
      points.push(`${originPosition.lat},${originPosition.lon}`);
    }
    
    stops.forEach(stop => {
      if (stop.position) {
        points.push(`${stop.position.lat},${stop.position.lon}`);
      }
    });
    
    if (destinationPosition) {
      points.push(`${destinationPosition.lat},${destinationPosition.lon}`);
    }
    
    return points.join(':');
  };

  const calculateRoute = async (
    avoidHighways: boolean
  ): Promise<RouteResult | null> => {
    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
    
    try {
      // Build waypoints for Google Directions API
      const waypoints: { lat: number; lon: number }[] = [];
      
      if (originPosition) {
        waypoints.push({ lat: originPosition.lat, lon: originPosition.lon });
      }
      
      stops.forEach(stop => {
        if (stop.position) {
          waypoints.push({ lat: stop.position.lat, lon: stop.position.lon });
        }
      });
      
      if (destinationPosition) {
        waypoints.push({ lat: destinationPosition.lat, lon: destinationPosition.lon });
      }

      if (waypoints.length < 2) {
        throw new Error('Au moins 2 points sont nécessaires');
      }

      const origin = `${waypoints[0].lat},${waypoints[0].lon}`;
      const destination = `${waypoints[waypoints.length - 1].lat},${waypoints[waypoints.length - 1].lon}`;
      const intermediateWaypoints = waypoints.slice(1, -1).map(wp => `${wp.lat},${wp.lon}`);

      // Call Google Directions API via edge function with timeout
      const response = await Promise.race([
        supabase.functions.invoke('google-directions', {
          body: {
            origin,
            destination,
            waypoints: intermediateWaypoints.length > 0 ? intermediateWaypoints : undefined,
            avoidHighways,
          }
        }),
        new Promise<never>((_, reject) => {
          controller.signal.addEventListener('abort', () => {
            reject(new Error('Délai d\'attente dépassé pour le calcul de l\'itinéraire'));
          });
        })
      ]);
      
      clearTimeout(timeoutId);
      
      const { data, error } = response;
      
      if (error) {
        console.error('Google Directions API error:', error);
        throw new Error(`Erreur de calcul de route`);
      }
      
      if (!data.routes || data.routes.length === 0) {
        throw new Error('Aucun itinéraire trouvé');
      }

      const route = data.routes[0];
      
      // Calculate total distance and duration from all legs
      let totalDistanceMeters = 0;
      let totalDurationSeconds = 0;
      
      for (const leg of route.legs) {
        totalDistanceMeters += leg.distance.value;
        totalDurationSeconds += leg.duration.value;
      }

      const distanceKm = totalDistanceMeters / 1000;

      // Decode polyline to get coordinates
      const coordinates: [number, number][] = [];
      if (route.overview_polyline?.points) {
        const decoded = decodePolyline(route.overview_polyline.points);
        coordinates.push(...decoded);
      }

      // Calculate toll cost using TomTom API for accurate truck toll estimation
      let tollCost = 0;
      if (!avoidHighways) {
        try {
          const { data: tollData } = await supabase.functions.invoke('tomtom-tolls', {
            body: {
              waypoints,
              distanceKm,
              vehicleWeight: avoidWeightRestrictions ? SEMI_TRAILER_SPECS.weight : 7500,
              vehicleAxleWeight: avoidWeightRestrictions ? SEMI_TRAILER_SPECS.axleWeight : 3500,
              avoidHighways,
            }
          });
          
          if (tollData?.tollCost) {
            tollCost = tollData.tollCost;
            console.log('TomTom toll cost:', tollCost, 'source:', tollData.source);
          } else {
            // Fallback to estimation
            const estimatedHighwayRatio = 0.85;
            const tollableDistance = distanceKm * estimatedHighwayRatio;
            tollCost = tollableDistance * FRENCH_TOLL_RATES.AVERAGE;
          }
        } catch (tollError) {
          console.warn('TomTom toll calculation failed, using estimation:', tollError);
          const estimatedHighwayRatio = 0.85;
          const tollableDistance = distanceKm * estimatedHighwayRatio;
          tollCost = tollableDistance * FRENCH_TOLL_RATES.AVERAGE;
        }
      } else {
        // National roads: minimal tolls (bridges, tunnels)
        tollCost = distanceKm * FRENCH_TOLL_RATES.NATIONAL;
      }
      
      const fuelCost = calculateFuelCost(distanceKm);

      return {
        distance: Math.round(distanceKm),
        duration: Math.round(totalDurationSeconds / 3600 * 10) / 10,
        tollCost: Math.round(tollCost * 100) / 100,
        fuelCost: Math.round(fuelCost * 100) / 100,
        coordinates,
        type: avoidHighways ? 'national' : 'highway',
      };
    } catch (err) {
      clearTimeout(timeoutId);
      if (err instanceof Error && err.message.includes('Délai')) {
        console.error('Route calculation timeout:', err);
      } else {
        console.error('Route calculation error:', err);
      }
      return null;
    }
  };

  const handleCalculateRoutes = async () => {
    if (!originPosition || !destinationPosition) {
      setError('Veuillez sélectionner les adresses de départ et d\'arrivée');
      return;
    }

    // Check if all stops have positions
    const invalidStops = stops.filter(s => s.address && !s.position);
    if (invalidStops.length > 0) {
      setError('Veuillez sélectionner une adresse valide pour tous les arrêts');
      return;
    }

    setLoading(true);
    setError(null);
    setHighwayRoute(null);
    setNationalRoute(null);
    setSelectedRouteType('highway');

    try {
      const [highway, national] = await Promise.all([
        calculateRoute(false),
        calculateRoute(true),
      ]);

      if (!highway && !national) {
        throw new Error('Impossible de calculer les itinéraires');
      }

      setHighwayRoute(highway);
      setNationalRoute(national);
      
      // Mark search as calculated in history
      if (currentSearchIdRef.current) {
        markAsCalculated(currentSearchIdRef.current);
      }

      // Fetch truck restrictions for the calculated route
      const routeForRestrictions = highway || national;
      if (routeForRestrictions?.coordinates && routeForRestrictions.coordinates.length > 0) {
        fetchRestrictions(routeForRestrictions.coordinates, {
          height: selectedVehicle?.height,
          weight: selectedVehicle?.weight,
        });
      }

      // Save route data for PDF export
      const routeToSave = highway || national;
      if (routeToSave) {
        const routeMarkers: { position: [number, number]; label: string; type: 'start' | 'end' | 'stop' }[] = [];
        
        if (originPosition) {
          routeMarkers.push({ position: [originPosition.lat, originPosition.lon], label: originAddress, type: 'start' });
        }
        stops.forEach((stop, index) => {
          if (stop.position) {
            routeMarkers.push({ position: [stop.position.lat, stop.position.lon], label: stop.address || `Arrêt ${index + 1}`, type: 'stop' });
          }
        });
        if (destinationPosition) {
          routeMarkers.push({ position: [destinationPosition.lat, destinationPosition.lon], label: destinationAddress, type: 'end' });
        }

        localStorage.setItem('last-calculated-route', JSON.stringify({
          originAddress,
          destinationAddress,
          coordinates: routeToSave.coordinates,
          markers: routeMarkers,
        }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyRoute = (route: RouteResult) => {
    setTrip({
      ...trip,
      distance: route.distance,
      tollCost: route.tollCost,
    });
    setSelectedRouteType(route.type);
  };

  const handleSaveToHistory = (route: RouteResult) => {
    if (!originAddress || !destinationAddress) {
      toast({ title: "Erreur", description: "Adresses manquantes", variant: "destructive" });
      return;
    }

    const newTrip: LocalTrip = {
      id: generateId(),
      client_id: selectedClientId,
      origin_address: originAddress,
      destination_address: destinationAddress,
      origin_lat: originPosition?.lat || null,
      origin_lng: originPosition?.lon || null,
      destination_lat: destinationPosition?.lat || null,
      destination_lng: destinationPosition?.lon || null,
      distance_km: route.distance,
      duration_minutes: Math.round(route.duration * 60),
      fuel_cost: route.fuelCost,
      toll_cost: route.tollCost,
      driver_cost: null,
      adblue_cost: null,
      structure_cost: null,
      total_cost: route.fuelCost + route.tollCost,
      revenue: null,
      profit: null,
      profit_margin: null,
      trip_date: new Date().toISOString(),
      status: 'completed',
      notes: route.type === 'highway' ? 'Via autoroute' : 'Via nationale',
      stops: stops.filter(s => s.position).map(s => ({ address: s.address, lat: s.position?.lat, lon: s.position?.lon })),
      vehicle_data: { fuelConsumption: vehicle.fuelConsumption, fuelPriceHT: vehicle.fuelPriceHT },
      driver_ids: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setTrips(prev => [newTrip, ...prev]);
    toast({ title: "Trajet enregistré dans l'historique" });
  };

  const handleOpenSaveToClient = (route: RouteResult) => {
    setRouteToSave(route);
    // Pre-fill the title with origin → destination
    const defaultTitle = `${originAddress.split(',')[0]} → ${destinationAddress.split(',')[0]}`;
    setSaveFormData({
      title: defaultTitle,
      selectedClientId: '',
      includeCharges: true,
      selectedDriverIds: [...selectedDriverIds],
      revenue: 0,
    });
    setSaveDialogOpen(true);
  };

  const handleSaveToClient = () => {
    if (!routeToSave || !saveFormData.selectedClientId) return;
    
    const client = clients.find(c => c.id === saveFormData.selectedClientId);
    if (!client) return;

    // Calculate total cost with all charges if requested
    const baseCost = routeToSave.tollCost + routeToSave.fuelCost;
    const totalCostWithCharges = saveFormData.includeCharges 
      ? baseCost + costs.adBlue + costs.driverCost + costs.structureCost
      : baseCost;
    
    // Calculate profit
    const revenue = saveFormData.revenue || 0;
    const profit = revenue - totalCostWithCharges;
    const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0;

    const newReport: LocalClientReport = {
      id: generateId(),
      client_id: saveFormData.selectedClientId,
      report_type: 'itinerary',
      title: saveFormData.title || `${originAddress.split(',')[0]} → ${destinationAddress.split(',')[0]}`,
      data: {
        origin_address: originAddress,
        destination_address: destinationAddress,
        distance_km: routeToSave.distance,
        duration_hours: routeToSave.duration,
        toll_cost: routeToSave.tollCost,
        fuel_cost: routeToSave.fuelCost,
        total_cost: totalCostWithCharges,
        route_type: routeToSave.type,
        stops: stops.filter(s => s.position).map(s => ({ 
          address: s.address, 
          lat: s.position?.lat, 
          lon: s.position?.lon 
        })),
        // Revenue and profit
        revenue: revenue > 0 ? revenue : undefined,
        profit: revenue > 0 ? profit : undefined,
        profit_margin: revenue > 0 ? profitMargin : undefined,
        // Extended data
        adblue_cost: saveFormData.includeCharges ? costs.adBlue : undefined,
        driver_cost: saveFormData.includeCharges ? costs.driverCost : undefined,
        structure_cost: saveFormData.includeCharges ? costs.structureCost : undefined,
        vehicle: {
          fuelConsumption: vehicle.fuelConsumption,
          fuelPriceHT: vehicle.fuelPriceHT,
          adBlueConsumption: vehicle.adBlueConsumption,
          adBluePriceHT: vehicle.adBluePriceHT,
        },
        driver_ids: saveFormData.selectedDriverIds.length > 0 ? saveFormData.selectedDriverIds : undefined,
      },
      notes: null,
      created_at: new Date().toISOString(),
    };

    setReports(prev => [newReport, ...prev]);
    setSaveDialogOpen(false);
    setRouteToSave(null);
    toast({ title: `Tournée "${saveFormData.title}" sauvegardée pour ${client.name}` });
  };

  const toggleDriverSelection = (driverId: string) => {
    setSaveFormData(prev => ({
      ...prev,
      selectedDriverIds: prev.selectedDriverIds.includes(driverId)
        ? prev.selectedDriverIds.filter(id => id !== driverId)
        : [...prev.selectedDriverIds, driverId]
    }));
  };

  const formatDuration = (hours: number): string => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h${m.toString().padStart(2, '0')}`;
  };

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value);
  };

  const displayedRoute = selectedRoute === 'national' ? nationalRoute : (highwayRoute || nationalRoute);
  
  // Build markers for map
  const markers: { position: [number, number]; label: string; type: 'start' | 'end' | 'stop' }[] = [];
  
  if (originPosition) {
    markers.push({ 
      position: [originPosition.lat, originPosition.lon], 
      label: originAddress || 'Départ', 
      type: 'start' 
    });
  }
  
  stops.forEach((stop, index) => {
    if (stop.position) {
      markers.push({ 
        position: [stop.position.lat, stop.position.lon], 
        label: stop.address || `Arrêt ${index + 1}`, 
        type: 'stop' 
      });
    }
  });
  
  if (destinationPosition) {
    markers.push({ 
      position: [destinationPosition.lat, destinationPosition.lon], 
      label: destinationAddress || 'Arrivée', 
      type: 'end' 
    });
  }

  return (
    <div className="relative h-[calc(100vh-180px)] -m-6">
      {/* Map with reduced height */}
      <div className="absolute inset-0">
        <MapPreview 
          className="h-full w-full"
          center={[46.603354, 1.888334]}
          zoom={6}
          markers={markers}
          routeCoordinates={displayedRoute?.coordinates || []}
          restrictions={truckRestrictions.map(r => ({
            lat: r.lat,
            lng: r.lng,
            type: r.type,
            value: r.value,
            unit: r.unit,
            description: r.description
          }))}
          showRestrictionsLegend={true}
        />
        
        {/* Route summary overlay on map */}
        {selectedRoute && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-background/95 backdrop-blur-sm border border-border rounded-lg p-3 shadow-lg">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-success" />
              <span className="font-medium text-sm">
                {selectedRoute === 'highway' ? 'Autoroute' : 'Nationale'} • {displayedRoute?.distance} km • {formatDuration(displayedRoute?.duration || 0)}
                {truckRestrictions.length > 0 && (
                  <span className="ml-2 text-warning">• {truckRestrictions.length} restrictions</span>
                )}
              </span>
            </div>
          </div>
        )}
        
        {/* Toggle panel button */}
        <Button
          variant="secondary"
          size="icon"
          className="absolute top-4 left-4 z-10 shadow-lg"
          onClick={() => setIsPanelOpen(!isPanelOpen)}
        >
          {isPanelOpen ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeftOpen className="w-5 h-5" />}
        </Button>
      </div>
      
      {/* Sliding Panel */}
      <div className={cn(
        "absolute top-0 left-0 h-full bg-background border-r border-border shadow-xl transition-all duration-300 z-20",
        isPanelOpen ? "w-[420px]" : "w-0 overflow-hidden"
      )}>
        <ScrollArea className="h-full">
          <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-foreground">Itinéraire</h1>
                <p className="text-sm text-muted-foreground">Calculez vos trajets poids lourd</p>
              </div>
              <div className="flex items-center gap-1">
                <SearchHistoryDialog
                  history={searchHistory}
                  uncalculatedSearches={uncalculatedSearches}
                  onLoad={handleLoadSearchHistory}
                  onRemove={removeSearch}
                  onClear={clearHistory}
                />
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setLoadItineraryOpen(true)}
                  title="Charger une tournée"
                >
                  <Folder className="w-5 h-5" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setIsPanelOpen(false)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>
            
            {/* Addresses Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Navigation className="w-5 h-5 text-primary" />
                  <h2 className="font-semibold text-foreground">Adresses</h2>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openAddressSelector('origin')}
                  className="gap-1 h-8"
                >
                  <Building2 className="w-3 h-3" />
                  Transporteurs
                </Button>
              </div>

              <div className="space-y-2">
              {/* Origin */}
              <div className="flex gap-2">
                <div className="flex-1">
                  <AddressInput
                    value={originAddress}
                    onChange={setOriginAddress}
                    onSelect={(address, position) => {
                      setOriginAddress(address);
                      setOriginPosition(position);
                    }}
                    label="Adresse de départ"
                    placeholder="Ex: 15 rue de la Paix, 75002 Paris"
                    icon="start"
                  />
                </div>
                <div className="flex flex-col gap-1 pt-6">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => toggleFavoriteAddress(originAddress, originPosition)}
                    disabled={!originAddress || !originPosition}
                    title={originPosition && isFavorite(originPosition.lat, originPosition.lon) ? "Retirer des favoris" : "Ajouter aux favoris"}
                  >
                    <Heart className={cn(
                      "w-4 h-4",
                      originPosition && isFavorite(originPosition.lat, originPosition.lon) ? "fill-red-500 text-red-500" : "text-muted-foreground"
                    )} />
                  </Button>
                </div>
              </div>

              {/* Swap button between origin and first stop (or destination) */}
              <div className="flex justify-center py-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={swapOriginWithNext}
                  className="text-muted-foreground hover:text-primary h-8 w-8 p-0"
                  title="Interchanger avec le suivant"
                >
                  <ArrowUpDown className="w-4 h-4" />
                </Button>
              </div>

              {/* Stops with Drag and Drop */}
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={stops.map(s => s.id)}
                  strategy={verticalListSortingStrategy}
                >
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
                </SortableContext>
              </DndContext>

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

              {/* Destination */}
              <div className="flex gap-2">
                <div className="flex-1">
                  <AddressInput
                    value={destinationAddress}
                    onChange={setDestinationAddress}
                    onSelect={(address, position) => {
                      setDestinationAddress(address);
                      setDestinationPosition(position);
                    }}
                    label="Adresse d'arrivée"
                    placeholder="Ex: 25 avenue des Champs-Élysées, 75008 Paris"
                    icon="end"
                  />
                </div>
                <div className="flex flex-col gap-1 pt-6">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => openAddressSelector('destination')}
                    title="Choisir depuis transporteurs/favoris"
                  >
                    <Building2 className="w-4 h-4 text-muted-foreground" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => toggleFavoriteAddress(destinationAddress, destinationPosition)}
                    disabled={!destinationAddress || !destinationPosition}
                    title={destinationPosition && isFavorite(destinationPosition.lat, destinationPosition.lon) ? "Retirer des favoris" : "Ajouter aux favoris"}
                  >
                    <Heart className={cn(
                      "w-4 h-4",
                      destinationPosition && isFavorite(destinationPosition.lat, destinationPosition.lon) ? "fill-red-500 text-red-500" : "text-muted-foreground"
                    )} />
                  </Button>
                </div>
              </div>

              {/* Vehicle selector */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-muted-foreground" />
                  Véhicule
                </Label>
                <Select
                  value={selectedVehicleId || "none"}
                  onValueChange={handleVehicleSelect}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un véhicule..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Paramètres par défaut</SelectItem>
                    {vehicles.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.name} ({v.licensePlate})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Client selector */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <User className="w-4 h-4 text-muted-foreground" />
                  Client (optionnel)
                </Label>
                <Select
                  value={selectedClientId || "none"}
                  onValueChange={(value) => setSelectedClientId(value === "none" ? null : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un client..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucun client</SelectItem>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name} {client.company ? `(${client.company})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button 
                onClick={handleCalculateRoutes} 
                disabled={loading || !originPosition || !destinationPosition}
                className="w-full mt-4"
                size="lg"
                variant="gradient"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Calcul en cours...
                  </>
                ) : (
                  <>
                    <Navigation className="w-4 h-4 mr-2" />
                    Calculer les itinéraires
                  </>
                )}
              </Button>

              {error && (
                <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}
            </div>
          </div>

          {/* Vehicle cost breakdown when vehicle is selected */}
          {selectedVehicle && vehicleCostBreakdown && (
            <div className="glass-card p-4 opacity-0 animate-slide-up" style={{ animationDelay: '125ms', animationFillMode: 'forwards' }}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                  <Calculator className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium text-foreground">{selectedVehicle.name}</h3>
                  <p className="text-xs text-muted-foreground">{selectedVehicle.brand} {selectedVehicle.model}</p>
                </div>
                <div className="ml-auto text-right">
                  <p className="text-lg font-bold text-primary">
                    {formatCostPerKm(vehicleCostBreakdown.totalCostPerKm)}
                  </p>
                  <p className="text-xs text-muted-foreground">Coût/km total</p>
                </div>
              </div>
              <div className="grid grid-cols-5 gap-2 text-xs">
                <div className="text-center p-2 rounded bg-secondary/50">
                  <p className="text-muted-foreground">Carburant</p>
                  <p className="font-medium">{formatCostPerKm(vehicleCostBreakdown.fuelCostPerKm)}</p>
                </div>
                <div className="text-center p-2 rounded bg-secondary/50">
                  <p className="text-muted-foreground">AdBlue</p>
                  <p className="font-medium">{formatCostPerKm(vehicleCostBreakdown.adBlueCostPerKm)}</p>
                </div>
                <div className="text-center p-2 rounded bg-secondary/50">
                  <p className="text-muted-foreground">Entretien</p>
                  <p className="font-medium">{formatCostPerKm(vehicleCostBreakdown.maintenanceCostPerKm)}</p>
                </div>
                <div className="text-center p-2 rounded bg-secondary/50">
                  <p className="text-muted-foreground">Pneus</p>
                  <p className="font-medium">{formatCostPerKm(vehicleCostBreakdown.tireCostPerKm)}</p>
                </div>
                <div className="text-center p-2 rounded bg-secondary/50">
                  <p className="text-muted-foreground">Fixes</p>
                  <p className="font-medium">{formatCostPerKm(vehicleCostBreakdown.fixedCostPerKm)}</p>
                </div>
              </div>
            </div>
          )}

          <div className="glass-card p-4 opacity-0 animate-slide-up" style={{ animationDelay: '150ms', animationFillMode: 'forwards' }}>
            <div className="flex items-center gap-3">
              <Fuel className="w-5 h-5 text-primary" />
              <div className="text-sm">
                <span className="text-muted-foreground">Consommation : </span>
                <span className="font-medium text-foreground">{vehicle.fuelConsumption} L/100km</span>
                <span className="text-muted-foreground"> × </span>
                <span className="font-medium text-foreground">{vehicle.fuelPriceHT} €/L</span>
              </div>
            </div>
          </div>

          <div className="glass-card p-4 opacity-0 animate-slide-up" style={{ animationDelay: '175ms', animationFillMode: 'forwards' }}>
            <div className="flex items-center gap-3 mb-4">
              <Truck className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium text-foreground">Restrictions poids lourd</span>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Éviter ponts bas (&lt;4m)</span>
                <Switch checked={avoidLowBridges} onCheckedChange={setAvoidLowBridges} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Éviter restrictions de poids</span>
                <Switch checked={avoidWeightRestrictions} onCheckedChange={setAvoidWeightRestrictions} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Éviter zones interdites camions</span>
                <Switch checked={avoidTruckForbidden} onCheckedChange={setAvoidTruckForbidden} />
              </div>
            </div>
          </div>

          {(highwayRoute || nationalRoute) && (
            <div className="space-y-4 opacity-0 animate-slide-up" style={{ animationDelay: '200ms', animationFillMode: 'forwards' }}>
              {highwayRoute && (
                <div 
                  className={cn(
                    "glass-card p-6 cursor-pointer transition-all duration-200",
                    selectedRoute === 'highway' 
                      ? "border-primary ring-2 ring-primary/20" 
                      : "hover:border-primary/50"
                  )}
                  onClick={() => handleApplyRoute(highwayRoute)}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                        <Milestone className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">Autoroute</h3>
                        <p className="text-xs text-muted-foreground">Trajet le plus rapide</p>
                      </div>
                    </div>
                    {selectedRoute === 'highway' && (
                      <CheckCircle2 className="w-6 h-6 text-primary" />
                    )}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Distance</p>
                      <p className="text-lg font-bold text-foreground">{highwayRoute.distance} km</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Durée</p>
                      <p className="text-lg font-bold text-foreground">{formatDuration(highwayRoute.duration)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Péages</p>
                      <p className="text-lg font-bold text-warning">{formatCurrency(highwayRoute.tollCost)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Gazole</p>
                      <p className="text-lg font-bold text-primary">{formatCurrency(highwayRoute.fuelCost)}</p>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-border/50 flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Coût total énergie</span>
                    <span className="text-xl font-bold text-foreground">
                      {formatCurrency(highwayRoute.tollCost + highwayRoute.fuelCost)}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <Button
                      variant="default"
                      size="sm"
                      className="flex-1"
                      onClick={(e) => { e.stopPropagation(); handleOpenSaveItinerary(highwayRoute); }}
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Sauvegarder
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={(e) => { e.stopPropagation(); handleSaveToHistory(highwayRoute); }}
                    >
                      <History className="w-4 h-4 mr-2" />
                      Historique
                    </Button>
                    {clients.length > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={(e) => { e.stopPropagation(); handleOpenSaveToClient(highwayRoute); }}
                      >
                        <User className="w-4 h-4 mr-2" />
                        Client
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {nationalRoute && (
                <div 
                  className={cn(
                    "glass-card p-6 cursor-pointer transition-all duration-200",
                    selectedRoute === 'national' 
                      ? "border-success ring-2 ring-success/20" 
                      : "hover:border-success/50"
                  )}
                  onClick={() => handleApplyRoute(nationalRoute)}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-success/20 flex items-center justify-center">
                        <TreePine className="w-5 h-5 text-success" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">Nationale</h3>
                        <p className="text-xs text-muted-foreground">Évite les autoroutes</p>
                      </div>
                    </div>
                    {selectedRoute === 'national' && (
                      <CheckCircle2 className="w-6 h-6 text-success" />
                    )}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Distance</p>
                      <p className="text-lg font-bold text-foreground">{nationalRoute.distance} km</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Durée</p>
                      <p className="text-lg font-bold text-foreground">{formatDuration(nationalRoute.duration)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Péages</p>
                      <p className="text-lg font-bold text-success">{formatCurrency(nationalRoute.tollCost)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Gazole</p>
                      <p className="text-lg font-bold text-primary">{formatCurrency(nationalRoute.fuelCost)}</p>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-border/50 flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Coût total énergie</span>
                    <span className="text-xl font-bold text-foreground">
                      {formatCurrency(nationalRoute.tollCost + nationalRoute.fuelCost)}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <Button
                      variant="default"
                      size="sm"
                      className="flex-1"
                      onClick={(e) => { e.stopPropagation(); handleOpenSaveItinerary(nationalRoute); }}
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Sauvegarder
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={(e) => { e.stopPropagation(); handleSaveToHistory(nationalRoute); }}
                    >
                      <History className="w-4 h-4 mr-2" />
                      Historique
                    </Button>
                    {clients.length > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={(e) => { e.stopPropagation(); handleOpenSaveToClient(nationalRoute); }}
                      >
                        <User className="w-4 h-4 mr-2" />
                        Client
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {highwayRoute && nationalRoute && (
                <div className="glass-card p-4 bg-muted/30">
                  <p className="text-sm text-center text-muted-foreground">
                    {highwayRoute.tollCost + highwayRoute.fuelCost < nationalRoute.tollCost + nationalRoute.fuelCost ? (
                      <>
                        <span className="text-primary font-medium">Autoroute</span> : économie de{' '}
                        <span className="text-success font-medium">
                          {formatCurrency((nationalRoute.tollCost + nationalRoute.fuelCost) - (highwayRoute.tollCost + highwayRoute.fuelCost))}
                        </span>
                        {' '}et{' '}
                        <span className="text-primary font-medium">
                          {formatDuration(nationalRoute.duration - highwayRoute.duration)}
                        </span>
                        {' '}de moins
                      </>
                    ) : (
                      <>
                        <span className="text-success font-medium">Nationale</span> : économie de{' '}
                        <span className="text-success font-medium">
                          {formatCurrency((highwayRoute.tollCost + highwayRoute.fuelCost) - (nationalRoute.tollCost + nationalRoute.fuelCost))}
                        </span>
                        {' '}mais{' '}
                        <span className="text-warning font-medium">
                          {formatDuration(nationalRoute.duration - highwayRoute.duration)}
                        </span>
                        {' '}de plus
                      </>
                    )}
                  </p>
                </div>
              )}
            </div>
          )}
          </div>
        </ScrollArea>
      </div>

      {/* Save to Client Dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Save className="w-5 h-5 text-primary" />
              Sauvegarder la tournée
            </DialogTitle>
            <DialogDescription>Enregistrez cet itinéraire pour le retrouver dans votre historique.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {routeToSave && (
              <div className="p-3 bg-muted/30 rounded-lg text-sm">
                <p className="font-medium">{originAddress.split(',')[0]} → {destinationAddress.split(',')[0]}</p>
                <p className="text-muted-foreground mt-1">
                  {routeToSave.distance} km • {formatDuration(routeToSave.duration)} • {formatCurrency(routeToSave.tollCost + routeToSave.fuelCost)}
                </p>
              </div>
            )}
            
            {/* Title */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Edit3 className="w-3.5 h-3.5" />
                Nom de la tournée
              </Label>
              <Input
                value={saveFormData.title}
                onChange={(e) => setSaveFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Ex: Livraison Paris-Lyon"
              />
            </div>

            {/* Client Selection */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <User className="w-3.5 h-3.5" />
                Client
              </Label>
              <Select 
                value={saveFormData.selectedClientId} 
                onValueChange={(value) => setSaveFormData(prev => ({ ...prev, selectedClientId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map(client => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name} {client.company ? `(${client.company})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Driver Selection */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Users className="w-3.5 h-3.5" />
                Chauffeurs affectés
              </Label>
              <div className="space-y-2 max-h-[120px] overflow-y-auto p-2 border border-border rounded-md">
                {drivers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucun chauffeur configuré</p>
                ) : (
                  drivers.map(driver => (
                    <div key={driver.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`driver-${driver.id}`}
                        checked={saveFormData.selectedDriverIds.includes(driver.id)}
                        onCheckedChange={() => toggleDriverSelection(driver.id)}
                      />
                      <label 
                        htmlFor={`driver-${driver.id}`}
                        className="text-sm cursor-pointer flex-1"
                      >
                        {driver.name}
                      </label>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Include Charges */}
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div className="space-y-0.5">
                <Label className="flex items-center gap-2">
                  <Truck className="w-3.5 h-3.5" />
                  Inclure les charges calculées
                </Label>
                <p className="text-xs text-muted-foreground">
                  AdBlue, coût chauffeur, charges de structure
                </p>
              </div>
              <Switch
                checked={saveFormData.includeCharges}
                onCheckedChange={(checked) => setSaveFormData(prev => ({ ...prev, includeCharges: checked }))}
              />
            </div>

            {/* Revenue input */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Euro className="w-3.5 h-3.5" />
                Recette HT (optionnel)
              </Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={saveFormData.revenue || ''}
                onChange={(e) => setSaveFormData(prev => ({ ...prev, revenue: parseFloat(e.target.value) || 0 }))}
                placeholder="Montant facturé au client"
              />
            </div>

            {/* Cost Summary if charges included */}
            {saveFormData.includeCharges && routeToSave && (
              <div className="p-3 border border-border rounded-lg text-sm space-y-1">
                <p className="font-medium mb-2">Résumé des coûts</p>
                <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                  <span>Carburant:</span><span className="text-right">{formatCurrency(routeToSave.fuelCost)}</span>
                  <span>Péages:</span><span className="text-right">{formatCurrency(routeToSave.tollCost)}</span>
                  <span>AdBlue:</span><span className="text-right">{formatCurrency(costs.adBlue)}</span>
                  <span>Chauffeur:</span><span className="text-right">{formatCurrency(costs.driverCost)}</span>
                  <span>Structure:</span><span className="text-right">{formatCurrency(costs.structureCost)}</span>
                </div>
                <div className="border-t border-border pt-2 mt-2 flex justify-between font-medium text-foreground">
                  <span>Coût total:</span>
                  <span>{formatCurrency(routeToSave.tollCost + routeToSave.fuelCost + costs.adBlue + costs.driverCost + costs.structureCost)}</span>
                </div>
                
                {/* Profit calculation */}
                {saveFormData.revenue > 0 && (
                  <div className="border-t border-border pt-2 mt-2">
                    <div className="flex justify-between items-center">
                      <span className="flex items-center gap-1">
                        <TrendingUp className="w-3.5 h-3.5" />
                        Bénéfice:
                      </span>
                      <span className={`font-bold ${(saveFormData.revenue - (routeToSave.tollCost + routeToSave.fuelCost + costs.adBlue + costs.driverCost + costs.structureCost)) >= 0 ? 'text-success' : 'text-destructive'}`}>
                        {formatCurrency(saveFormData.revenue - (routeToSave.tollCost + routeToSave.fuelCost + costs.adBlue + costs.driverCost + costs.structureCost))}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>Marge:</span>
                      <span>{((saveFormData.revenue - (routeToSave.tollCost + routeToSave.fuelCost + costs.adBlue + costs.driverCost + costs.structureCost)) / saveFormData.revenue * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            <Button 
              className="w-full" 
              variant="gradient"
              onClick={handleSaveToClient}
              disabled={!saveFormData.selectedClientId || !saveFormData.title}
            >
              <Save className="w-4 h-4 mr-2" />
              Sauvegarder la tournée
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Address Selector Dialog */}
      <AddressSelectorDialog
        open={addressSelectorOpen}
        onOpenChange={setAddressSelectorOpen}
        onSelect={handleAddressSelect}
      />

      {/* Save Itinerary Dialog */}
      <SaveItineraryDialog
        open={saveItineraryOpen}
        onOpenChange={setSaveItineraryOpen}
        route={routeForSave}
        originAddress={originAddress}
        destinationAddress={destinationAddress}
        stops={stops}
        selectedVehicleId={selectedVehicleId}
      />

      {/* Load Itinerary Dialog */}
      <LoadItineraryDialog
        open={loadItineraryOpen}
        onOpenChange={setLoadItineraryOpen}
        onLoadTour={handleLoadSavedTour}
      />
    </div>
  );
}
