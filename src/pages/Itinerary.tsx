import { useMemo, useCallback, useEffect, useRef, useState } from 'react';
import { 
  MapPin, 
  Navigation, 
  Loader2, 
  Route, 
  Fuel, 
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
  Heart,
  Folder,
  ChevronRight,
  Clock,
  Zap
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
import { useCloudCharges } from '@/hooks/useCloudCharges';
import { useCloudDrivers } from '@/hooks/useCloudDrivers';
import { useCalculations } from '@/hooks/useCalculations';
import { FRENCH_TOLL_RATES, SEMI_TRAILER_SPECS } from '@/hooks/useTomTom';
import { ScrollArea } from '@/components/ui/scroll-area';
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
import { useTruckRestrictions } from '@/hooks/useTruckRestrictions';
import type { SavedTour } from '@/types/savedTour';
import { useSearchHistory, type SearchHistoryEntry } from '@/hooks/useSearchHistory';
import { SearchHistoryDialog } from '@/components/itinerary/SearchHistoryDialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
    <div ref={setNodeRef} style={style} className="group">
      <div className="flex items-center gap-2">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-muted-foreground/50 hover:text-muted-foreground touch-none"
        >
          <GripVertical className="w-4 h-4" />
        </button>
        <div className="flex-1">
          <AddressInput
            value={stop.address}
            onChange={(value) => onUpdate(stop.id, value, null)}
            onSelect={(address, position) => onUpdate(stop.id, address, position)}
            label=""
            placeholder={`Arrêt ${index + 1}`}
            icon="start"
          />
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground/50 hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={() => onOpenAddressSelector(stop.id)}
        >
          <Building2 className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground/50 hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={() => onRemove(stop.id)}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

export default function Itinerary() {
  const { vehicle, trip, setTrip, setVehicle, selectedDriverIds, settings } = useApp();
  
  // Use cloud data for drivers and charges (shared company data)
  const { charges } = useCloudCharges();
  const { cdiDrivers, interimDrivers } = useCloudDrivers();
  const drivers = [...cdiDrivers, ...interimDrivers];
  
  const { toast } = useToast();
  const [trips, setTrips] = useLocalStorage<LocalTrip[]>('optiflow_trips', []);
  const [clients] = useLocalStorage<LocalClient[]>('optiflow_clients', []);
  const [reports, setReports] = useLocalStorage<LocalClientReport[]>('optiflow_client_reports', []);
  const [vehicles] = useLocalStorage<Vehicle[]>('optiflow_vehicles', []);
  
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
    clearState: clearItineraryState,
  } = useItineraryState();
  
  const { favorites, addFavorite, removeFavorite, isFavorite } = useFavoriteAddresses();
  const { 
    history: searchHistory, 
    uncalculatedSearches, 
    addSearch, 
    markAsCalculated,
    removeSearch,
    clearHistory 
  } = useSearchHistory();
  
  const currentSearchIdRef = useRef<string | null>(null);
  const { 
    restrictions: truckRestrictions, 
    loading: restrictionsLoading, 
    fetchRestrictions 
  } = useTruckRestrictions();
  
  const [addressSelectorOpen, setAddressSelectorOpen] = useState(false);
  const [addressSelectorTarget, setAddressSelectorTarget] = useState<'origin' | 'destination' | 'stop'>('origin');
  const [addressSelectorStopId, setAddressSelectorStopId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'route' | 'options'>('route');
  
  const selectedVehicle = useMemo(() => 
    vehicles.find(v => v.id === selectedVehicleId) || null,
  [vehicles, selectedVehicleId]);
  
  const vehicleCostBreakdown = useMemo(() => {
    if (!selectedVehicle) return null;
    return calculateVehicleCosts(selectedVehicle, {
      fuelPriceHT: vehicle.fuelPriceHT,
      adBluePriceHT: vehicle.adBluePriceHT,
    });
  }, [selectedVehicle, vehicle.fuelPriceHT, vehicle.adBluePriceHT]);
  
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [routeToSave, setRouteToSave] = useState<RouteResult | null>(null);
  const [saveFormData, setSaveFormData] = useState({
    title: '',
    selectedClientId: '',
    includeCharges: true,
    selectedDriverIds: [] as string[],
    revenue: 0,
  });
  
  const [saveItineraryOpen, setSaveItineraryOpen] = useState(false);
  const [loadItineraryOpen, setLoadItineraryOpen] = useState(false);
  const [routeForSave, setRouteForSave] = useState<RouteResult | null>(null);
  
  const selectedDrivers = drivers.filter(d => selectedDriverIds.includes(d.id));
  const costs = useCalculations(trip, vehicle, selectedDrivers, charges, settings);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
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
  
  const handleLoadSearchHistory = useCallback((entry: SearchHistoryEntry) => {
    setOriginAddress(entry.originAddress);
    setOriginPosition(entry.originPosition);
    setDestinationAddress(entry.destinationAddress);
    setDestinationPosition(entry.destinationPosition);
    setStops(entry.stops);
    if (entry.vehicleId) setSelectedVehicleId(entry.vehicleId);
    if (entry.clientId) setSelectedClientId(entry.clientId);
    clearResults();
    toast({ title: "Recherche chargée" });
  }, [setOriginAddress, setOriginPosition, setDestinationAddress, setDestinationPosition, setStops, setSelectedVehicleId, setSelectedClientId, toast]);

  const handleLoadSavedTour = (tour: SavedTour) => {
    setOriginAddress(tour.origin_address);
    setOriginPosition(null);
    setDestinationAddress(tour.destination_address);
    setDestinationPosition(null);
    const loadedStops: Waypoint[] = tour.stops.map((stop) => ({
      id: crypto.randomUUID(),
      address: stop.address,
      position: stop.lat && stop.lng ? { lat: stop.lat, lon: stop.lng } : null,
    }));
    setStops(loadedStops);
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
    setTrip(prev => ({
      ...prev,
      distance: tour.distance_km,
      tollCost: tour.toll_cost,
    }));
    clearResults();
    toast({ title: "Tournée chargée", description: `"${tour.name}"` });
  };
  
  const handleOpenSaveItinerary = (route: RouteResult) => {
    setRouteForSave(route);
    setSaveItineraryOpen(true);
  };
  
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
  
  const openAddressSelector = (target: 'origin' | 'destination' | 'stop', stopId?: string) => {
    setAddressSelectorTarget(target);
    setAddressSelectorStopId(stopId || null);
    setAddressSelectorOpen(true);
  };
  
  const toggleFavoriteAddress = (address: string, position: Position | null) => {
    if (!address || !position) return;
    if (isFavorite(position.lat, position.lon)) {
      const fav = favorites.find(f => 
        Math.abs(f.lat - position.lat) < 0.0001 && 
        Math.abs(f.lon - position.lon) < 0.0001
      );
      if (fav) removeFavorite(fav.id);
      toast({ title: "Retiré des favoris" });
    } else {
      addFavorite({
        name: address.split(',')[0] || address,
        address,
        lat: position.lat,
        lon: position.lon,
      });
      toast({ title: "Ajouté aux favoris" });
    }
  };

  const selectedRoute = selectedRouteType;

  const handleVehicleSelect = (vehicleId: string) => {
    setSelectedVehicleId(vehicleId === 'none' ? null : vehicleId);
    if (vehicleId !== 'none') {
      const selectedV = vehicles.find(v => v.id === vehicleId);
      if (selectedV) {
        setVehicle(prev => ({
          ...prev,
          fuelConsumption: selectedV.fuelConsumption,
          adBlueConsumption: selectedV.adBlueConsumption,
        }));
      }
    }
  };

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
    const newId = crypto.randomUUID?.() || generateId();
    setStops([...stops, { id: newId, address: '', position: null }]);
  };

  const removeStop = (id: string) => {
    setStops(stops.filter(s => s.id !== id));
  };

  const updateStop = (id: string, address: string, position: Position | null) => {
    setStops(stops.map(s => s.id === id ? { ...s, address, position } : s));
  };

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

  const swapStops = (index: number) => {
    if (index >= stops.length - 1) return;
    const newStops = [...stops];
    [newStops[index], newStops[index + 1]] = [newStops[index + 1], newStops[index]];
    setStops(newStops);
    clearResults();
  };

  const swapStopWithDestination = (index: number) => {
    const stop = stops[index];
    const newStops = [...stops];
    newStops[index] = { ...stop, address: destinationAddress, position: destinationPosition };
    setDestinationAddress(stop.address);
    setDestinationPosition(stop.position);
    setStops(newStops);
    clearResults();
  };

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

  const calculateRoute = async (avoidHighways: boolean): Promise<RouteResult> => {
    const getInvokeErrorMessage = (err: unknown): string => {
      if (!err || typeof err !== 'object') return 'Erreur inconnue';
      const anyErr = err as any;
      const body = anyErr?.context?.body;
      if (typeof body === 'string') {
        try {
          const parsed = JSON.parse(body);
          if (parsed?.error) return String(parsed.error);
        } catch {}
      }
      if (typeof anyErr?.message === 'string' && anyErr.message.trim()) return anyErr.message;
      return 'Erreur de calcul de route';
    };

    const withTimeout = async <T,>(promise: Promise<T>, ms: number, timeoutMessage: string): Promise<T> => {
      let timeoutId: ReturnType<typeof setTimeout> | undefined;
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error(timeoutMessage)), ms);
      });
      try {
        return await Promise.race([promise, timeoutPromise]);
      } finally {
        if (timeoutId) clearTimeout(timeoutId);
      }
    };

    const waypoints: { lat: number; lon: number }[] = [];
    if (originPosition) waypoints.push({ lat: originPosition.lat, lon: originPosition.lon });
    stops.forEach(stop => {
      if (stop.position) waypoints.push({ lat: stop.position.lat, lon: stop.position.lon });
    });
    if (destinationPosition) waypoints.push({ lat: destinationPosition.lat, lon: destinationPosition.lon });
    if (waypoints.length < 2) throw new Error('Au moins 2 points sont nécessaires');

    const origin = `${waypoints[0].lat},${waypoints[0].lon}`;
    const destination = `${waypoints[waypoints.length - 1].lat},${waypoints[waypoints.length - 1].lon}`;
    const intermediateWaypoints = waypoints.slice(1, -1).map(wp => `${wp.lat},${wp.lon}`);
    const timeoutMs = avoidHighways ? 90000 : 60000;

    const { data, error } = await withTimeout(
      supabase.functions.invoke('google-directions', {
        body: { origin, destination, waypoints: intermediateWaypoints.length > 0 ? intermediateWaypoints : undefined, avoidHighways },
      }),
      timeoutMs,
      "Délai d'attente dépassé"
    );

    if (error) throw new Error(getInvokeErrorMessage(error));
    if (data?.error) throw new Error(String(data.error));
    if (!data?.routes?.length) throw new Error('Aucun itinéraire trouvé');

    const route = data.routes[0];
    let totalDistanceMeters = 0;
    let totalDurationSeconds = 0;
    for (const leg of route.legs) {
      totalDistanceMeters += leg.distance.value;
      totalDurationSeconds += leg.duration.value;
    }
    const distanceKm = totalDistanceMeters / 1000;
    const coordinates: [number, number][] = [];
    if (route.overview_polyline?.points) {
      coordinates.push(...decodePolyline(route.overview_polyline.points));
    }

    let tollCost = 0;
    if (!avoidHighways) {
      try {
        const { data: tollData } = await supabase.functions.invoke('tomtom-tolls', {
          body: { waypoints, distanceKm, vehicleWeight: avoidWeightRestrictions ? SEMI_TRAILER_SPECS.weight : 7500, vehicleAxleWeight: avoidWeightRestrictions ? SEMI_TRAILER_SPECS.axleWeight : 3500, avoidHighways },
        });
        if (tollData?.tollCost) tollCost = tollData.tollCost;
        else {
          const tollableDistance = distanceKm * 0.85;
          tollCost = tollableDistance * FRENCH_TOLL_RATES.AVERAGE;
        }
      } catch {
        const tollableDistance = distanceKm * 0.85;
        tollCost = tollableDistance * FRENCH_TOLL_RATES.AVERAGE;
      }
    } else {
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
  };

  const handleCalculateRoutes = async () => {
    if (!originPosition || !destinationPosition) {
      setError('Veuillez sélectionner les adresses de départ et d\'arrivée');
      return;
    }
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
      let highway: RouteResult | null = null;
      let national: RouteResult | null = null;
      let highwayError: string | null = null;
      let nationalError: string | null = null;

      try { highway = await calculateRoute(false); setHighwayRoute(highway); } catch (e) { highwayError = e instanceof Error ? e.message : 'Erreur'; }
      try { national = await calculateRoute(true); setNationalRoute(national); } catch (e) { nationalError = e instanceof Error ? e.message : 'Erreur'; }

      if (!highway && !national) throw new Error(`Impossible de calculer (${highwayError || 'erreur'} / ${nationalError || 'erreur'})`);
      if (highway && !national && nationalError) setError(`Nationale indisponible: ${nationalError}`);
      if (national && !highway && highwayError) setError(`Autoroute indisponible: ${highwayError}`);
      
      if (currentSearchIdRef.current) markAsCalculated(currentSearchIdRef.current);
      const routeForRestrictions = highway || national;
      if (routeForRestrictions?.coordinates?.length) {
        fetchRestrictions(routeForRestrictions.coordinates, { height: selectedVehicle?.height, weight: selectedVehicle?.weight });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyRoute = (route: RouteResult) => {
    setTrip({ ...trip, distance: route.distance, tollCost: route.tollCost });
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
    toast({ title: "Enregistré dans l'historique" });
  };

  const handleOpenSaveToClient = (route: RouteResult) => {
    setRouteToSave(route);
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
    const baseCost = routeToSave.tollCost + routeToSave.fuelCost;
    const totalCostWithCharges = saveFormData.includeCharges ? baseCost + costs.adBlue + costs.driverCost + costs.structureCost : baseCost;
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
        stops: stops.filter(s => s.position).map(s => ({ address: s.address, lat: s.position?.lat, lon: s.position?.lon })),
        revenue: revenue > 0 ? revenue : undefined,
        profit: revenue > 0 ? profit : undefined,
        profit_margin: revenue > 0 ? profitMargin : undefined,
        adblue_cost: saveFormData.includeCharges ? costs.adBlue : undefined,
        driver_cost: saveFormData.includeCharges ? costs.driverCost : undefined,
        structure_cost: saveFormData.includeCharges ? costs.structureCost : undefined,
        vehicle: { fuelConsumption: vehicle.fuelConsumption, fuelPriceHT: vehicle.fuelPriceHT, adBlueConsumption: vehicle.adBlueConsumption, adBluePriceHT: vehicle.adBluePriceHT },
        driver_ids: saveFormData.selectedDriverIds.length > 0 ? saveFormData.selectedDriverIds : undefined,
      },
      notes: null,
      created_at: new Date().toISOString(),
    };
    setReports(prev => [newReport, ...prev]);
    setSaveDialogOpen(false);
    setRouteToSave(null);
    toast({ title: `Tournée "${saveFormData.title}" sauvegardée` });
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
  
  const markers: { position: [number, number]; label: string; type: 'start' | 'end' | 'stop' }[] = [];
  if (originPosition) markers.push({ position: [originPosition.lat, originPosition.lon], label: originAddress || 'Départ', type: 'start' });
  stops.forEach((stop, index) => {
    if (stop.position) markers.push({ position: [stop.position.lat, stop.position.lon], label: stop.address || `Arrêt ${index + 1}`, type: 'stop' });
  });
  if (destinationPosition) markers.push({ position: [destinationPosition.lat, destinationPosition.lon], label: destinationAddress || 'Arrivée', type: 'end' });

  const hasResults = highwayRoute || nationalRoute;

  return (
    <div className="h-[calc(100vh-80px)] lg:h-[calc(100vh-140px)] -m-4 lg:-m-6 flex flex-col lg:flex-row">
      {/* Left Panel - Form */}
      <div className="w-full lg:w-[520px] bg-gradient-to-b from-background to-muted/20 border-r border-border/50 flex flex-col">
        {/* Header */}
        <div className="p-4 lg:p-5 border-b border-border/30 flex items-center justify-between bg-card/50 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-md">
              <Navigation className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg lg:text-xl font-bold text-foreground">Itinéraire</h1>
              <p className="text-xs text-muted-foreground">Calcul de trajets poids lourd</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <SearchHistoryDialog
              history={searchHistory}
              uncalculatedSearches={uncalculatedSearches}
              onLoad={handleLoadSearchHistory}
              onRemove={removeSearch}
              onClear={clearHistory}
            />
            <Button variant="ghost" size="icon" onClick={() => setLoadItineraryOpen(true)} className="h-9 w-9 hover:bg-primary/10 transition-colors">
              <Folder className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-4 lg:p-5 space-y-5">
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
                <Select value={selectedVehicleId || "none"} onValueChange={handleVehicleSelect}>
                  <SelectTrigger className="h-11 bg-background/80 border-border/50 hover:border-primary/30 transition-colors">
                    <div className="flex items-center gap-2">
                      <Truck className="w-4 h-4 text-primary/70" />
                      <SelectValue placeholder="Véhicule" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Par défaut</SelectItem>
                    {vehicles.map((v) => (
                      <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={selectedClientId || "none"} onValueChange={(v) => setSelectedClientId(v === "none" ? null : v)}>
                  <SelectTrigger className="h-11 bg-background/80 border-border/50 hover:border-primary/30 transition-colors">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-secondary/70" />
                      <SelectValue placeholder="Client" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucun</SelectItem>
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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

            {/* Results */}
            {hasResults && (
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
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Right Panel - Map */}
      <div className="hidden lg:flex flex-1 relative bg-muted/20">
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
        
        {/* Route summary overlay */}
        {selectedRoute && displayedRoute && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-card/95 backdrop-blur-md border border-border/50 rounded-2xl px-5 py-3 shadow-xl animate-scale-in">
            <div className="flex items-center gap-4 text-sm">
              <div className={cn(
                "w-8 h-8 rounded-xl flex items-center justify-center",
                selectedRoute === 'highway' ? "bg-primary/20" : "bg-success/20"
              )}>
                {selectedRoute === 'highway' ? (
                  <Zap className="w-4 h-4 text-primary" />
                ) : (
                  <TreePine className="w-4 h-4 text-success" />
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className="font-semibold">
                  {selectedRoute === 'highway' ? 'Autoroute' : 'Nationale'}
                </span>
                <div className="w-px h-4 bg-border" />
                <span className="font-medium">{displayedRoute.distance} km</span>
                <div className="w-px h-4 bg-border" />
                <span className="text-muted-foreground">{formatDuration(displayedRoute.duration)}</span>
                {truckRestrictions.length > 0 && (
                  <>
                    <div className="w-px h-4 bg-border" />
                    <span className="text-warning font-medium flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {truckRestrictions.length} restrictions
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
        
        {/* Map placeholder when no route */}
        {!displayedRoute && !originPosition && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center p-8 max-w-sm">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <MapPin className="w-8 h-8 text-primary/50" />
              </div>
              <h3 className="font-semibold text-lg text-foreground/70 mb-2">Carte du trajet</h3>
              <p className="text-sm text-muted-foreground">Entrez vos adresses de départ et d'arrivée pour visualiser l'itinéraire</p>
            </div>
          </div>
        )}
      </div>
      
      {/* Mobile Map Preview */}
      {displayedRoute && (
        <div className="lg:hidden fixed bottom-20 left-4 right-4 z-40">
          <div className="bg-card/95 backdrop-blur-md border border-border/50 rounded-2xl p-4 shadow-xl animate-slide-up">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center",
                  selectedRoute === 'highway' ? "bg-primary/20" : "bg-success/20"
                )}>
                  {selectedRoute === 'highway' ? (
                    <Zap className="w-5 h-5 text-primary" />
                  ) : (
                    <TreePine className="w-5 h-5 text-success" />
                  )}
                </div>
                <div>
                  <p className="font-semibold">{selectedRoute === 'highway' ? 'Autoroute' : 'Nationale'}</p>
                  <p className="text-xs text-muted-foreground">{displayedRoute.distance} km • {formatDuration(displayedRoute.duration)}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold">{formatCurrency(displayedRoute.tollCost + displayedRoute.fuelCost)}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dialogs */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Sauvegarder la tournée</DialogTitle>
            <DialogDescription>Enregistrez cet itinéraire</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {routeToSave && (
              <div className="p-3 bg-muted/30 rounded-lg text-sm">
                <p className="font-medium">{originAddress.split(',')[0]} → {destinationAddress.split(',')[0]}</p>
                <p className="text-muted-foreground">{routeToSave.distance} km • {formatDuration(routeToSave.duration)} • {formatCurrency(routeToSave.tollCost + routeToSave.fuelCost)}</p>
              </div>
            )}
            <div className="space-y-2">
              <Label>Nom</Label>
              <Input value={saveFormData.title} onChange={(e) => setSaveFormData(prev => ({ ...prev, title: e.target.value }))} placeholder="Ex: Livraison Paris-Lyon" />
            </div>
            <div className="space-y-2">
              <Label>Client</Label>
              <Select value={saveFormData.selectedClientId} onValueChange={(v) => setSaveFormData(prev => ({ ...prev, selectedClientId: v }))}>
                <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                <SelectContent>
                  {clients.map(c => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <Label>Inclure les charges</Label>
              <Switch checked={saveFormData.includeCharges} onCheckedChange={(c) => setSaveFormData(prev => ({ ...prev, includeCharges: c }))} />
            </div>
            <div className="space-y-2">
              <Label>Recette HT</Label>
              <Input type="number" min="0" value={saveFormData.revenue || ''} onChange={(e) => setSaveFormData(prev => ({ ...prev, revenue: parseFloat(e.target.value) || 0 }))} placeholder="Montant facturé" />
            </div>
            <Button className="w-full" variant="gradient" onClick={handleSaveToClient} disabled={!saveFormData.selectedClientId || !saveFormData.title}>
              <Save className="w-4 h-4 mr-2" /> Sauvegarder
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AddressSelectorDialog open={addressSelectorOpen} onOpenChange={setAddressSelectorOpen} onSelect={handleAddressSelect} />
      <SaveItineraryDialog open={saveItineraryOpen} onOpenChange={setSaveItineraryOpen} route={routeForSave} originAddress={originAddress} destinationAddress={destinationAddress} stops={stops} selectedVehicleId={selectedVehicleId} />
      <LoadItineraryDialog open={loadItineraryOpen} onOpenChange={setLoadItineraryOpen} onLoadTour={handleLoadSavedTour} />
    </div>
  );
}
