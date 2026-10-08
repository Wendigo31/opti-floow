import { useMemo, useCallback, useEffect, useRef, useState } from 'react';
import {
  Navigation,
  Folder,
  Save,
} from 'lucide-react';
import {
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { useApp } from '@/context/AppContext';
import { useCloudCharges } from '@/hooks/useCloudCharges';
import { useCloudDrivers } from '@/hooks/useCloudDrivers';
import { useCloudTrailers } from '@/hooks/useCloudTrailers';
import { useClients } from '@/hooks/useClients';
import { useCloudVehicles } from '@/hooks/useCloudVehicles';
import { useCalculations } from '@/hooks/useCalculations';
import { FRENCH_TOLL_RATES, SEMI_TRAILER_SPECS } from '@/hooks/useTomTom';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useItineraryState } from '@/hooks/useItineraryState';
import { useToast } from '@/hooks/use-toast';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Label } from '@/components/ui/label';
import type { LocalTrip, LocalClientReport } from '@/types/local';
import { generateId } from '@/types/local';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { calculateVehicleCosts } from '@/hooks/useVehicleCost';
import { AddressSelectorDialog } from '@/components/itinerary/AddressSelectorDialog';
import { useFavoriteAddresses } from '@/hooks/useFavoriteAddresses';
import { SaveItineraryDialog } from '@/components/itinerary/SaveItineraryDialog';
import { LoadItineraryDialog } from '@/components/itinerary/LoadItineraryDialog';
import { useTruckRestrictions } from '@/hooks/useTruckRestrictions';
import type { SavedTour } from '@/types/savedTour';
import { useSearchHistory, type SearchHistoryEntry } from '@/hooks/useSearchHistory';
import { SearchHistoryDialog } from '@/components/itinerary/SearchHistoryDialog';
import { ItineraryRouteForm } from '@/components/itinerary/ItineraryRouteForm';
import { ItineraryRouteResults } from '@/components/itinerary/ItineraryRouteResults';
import { ItineraryMapPanel } from '@/components/itinerary/ItineraryMapPanel';
import type { Position, RouteResult, Waypoint } from '@/types/itinerary';

export default function Itinerary() {
  const { vehicle, trip, setTrip, setVehicle, selectedDriverIds, setSelectedDriverIds, settings } = useApp();
  
  // Use cloud data for drivers and charges (shared company data)
  const { charges } = useCloudCharges();
  const { cdiDrivers, cddDrivers, interimDrivers, jokerDrivers, autreDrivers } = useCloudDrivers();
  const drivers = [...cdiDrivers, ...cddDrivers, ...interimDrivers, ...jokerDrivers, ...autreDrivers];
  const { vehicles: cloudVehicles } = useCloudVehicles();
  const { trailers } = useCloudTrailers();
  
  const { toast } = useToast();
  const [trips, setTrips] = useLocalStorage<LocalTrip[]>('optiflow_trips', []);
  const { clients } = useClients();
  const [reports, setReports] = useLocalStorage<LocalClientReport[]>('optiflow_client_reports', []);
  // Use cloud vehicles directly (no more localStorage fallback)
  const allVehicles = cloudVehicles;
  
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
  const [selectedTrailerId, setSelectedTrailerId] = useState<string | null>(null);
  const [transportMode, setTransportMode] = useState<'truck' | 'car'>('truck');
  
  const selectedVehicle = useMemo(() => 
    allVehicles.find(v => v.id === selectedVehicleId) || null,
  [allVehicles, selectedVehicleId]);
  
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
    // Auto-save to history once both origin AND destination have been selected
    // (i.e. have geo-coordinates), not while typing.
    if (
      originAddress &&
      destinationAddress &&
      originPosition?.lat &&
      destinationPosition?.lat
    ) {
      const saveSearch = async () => {
        const searchId = await addSearch({
          originAddress,
          originPosition: originPosition || null,
          destinationAddress,
          destinationPosition: destinationPosition || null,
          stops,
          vehicleId: selectedVehicleId,
          clientId: selectedClientId,
          calculated: false,
          displayName: null,
        });
        if (searchId) {
          currentSearchIdRef.current = searchId;
        }
      };
      saveSearch();
    }
  }, [
    originAddress,
    destinationAddress,
    originPosition?.lat,
    originPosition?.lon,
    destinationPosition?.lat,
    destinationPosition?.lon,
    selectedVehicleId,
    selectedClientId,
    addSearch,
  ]);
  
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
      const vehicleExists = allVehicles.find(v => v.id === tour.vehicle_id);
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
      const selectedV = allVehicles.find(v => v.id === vehicleId);
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

    const timeoutMs = avoidHighways ? 90000 : 60000;

    const { data, error } = await withTimeout(
      supabase.functions.invoke('here-route', {
        body: {
          waypoints,
          transportMode,
          vehicleWeight: avoidWeightRestrictions ? SEMI_TRAILER_SPECS.weight : 7500,
          vehicleHeight: SEMI_TRAILER_SPECS.height,
          vehicleLength: SEMI_TRAILER_SPECS.length,
          vehicleWidth: SEMI_TRAILER_SPECS.width,
          vehicleAxleWeight: avoidWeightRestrictions ? SEMI_TRAILER_SPECS.axleWeight : 3500,
          avoidHighways,
        },
      }),
      timeoutMs,
      "Délai d'attente dépassé"
    );

    if (error) throw new Error(getInvokeErrorMessage(error));
    if (data?.error) throw new Error(String(data.error));
    if (typeof data?.distanceKm !== 'number') throw new Error('Aucun itinéraire trouvé');

    const distanceKm = data.distanceKm;
    const durationHours = data.durationHours ?? 0;
    const coordinates: [number, number][] = Array.isArray(data.coordinates) ? data.coordinates : [];
    let tollCost = typeof data.tollCost === 'number' ? data.tollCost : 0;

    if (!avoidHighways && tollCost === 0) {
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
    } else if (avoidHighways) {
      tollCost = distanceKm * FRENCH_TOLL_RATES.NATIONAL;
    }

    const fuelCost = calculateFuelCost(distanceKm);
    return {
      distance: Math.round(distanceKm),
      duration: Math.round(durationHours * 10) / 10,
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

      // Run highway + national in parallel for speed
      const [hwResult, natResult] = await Promise.allSettled([
        calculateRoute(false),
        calculateRoute(true),
      ]);

      if (hwResult.status === 'fulfilled') {
        highway = hwResult.value;
        setHighwayRoute(highway);
      } else {
        highwayError = hwResult.reason instanceof Error ? hwResult.reason.message : 'Erreur';
      }

      if (natResult.status === 'fulfilled') {
        national = natResult.value;
        setNationalRoute(national);
      } else {
        nationalError = natResult.reason instanceof Error ? natResult.reason.message : 'Erreur';
      }

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

  // Stabilize markers and route coordinates so the HERE map polyline doesn't
  // get torn down on every parent re-render (which caused the route to flicker
  // and appear to "disappear" a few seconds after calculation).
  const markers = useMemo(() => {
    const m: { position: [number, number]; label: string; type: 'start' | 'end' | 'stop' }[] = [];
    if (originPosition) m.push({ position: [originPosition.lat, originPosition.lon], label: originAddress || 'Départ', type: 'start' });
    stops.forEach((stop, index) => {
      if (stop.position) m.push({ position: [stop.position.lat, stop.position.lon], label: stop.address || `Arrêt ${index + 1}`, type: 'stop' });
    });
    if (destinationPosition) m.push({ position: [destinationPosition.lat, destinationPosition.lon], label: destinationAddress || 'Arrivée', type: 'end' });
    return m;
  // Only depend on positions (lat/lon) so typing an address character does
  // NOT rebuild markers and tear down the HERE map layer on every keystroke.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    originPosition?.lat, originPosition?.lon,
    destinationPosition?.lat, destinationPosition?.lon,
    stops.map(s => `${s.id}:${s.position?.lat ?? ''},${s.position?.lon ?? ''}`).join('|'),
  ]);

  const routeCoordinates = useMemo(
    () => displayedRoute?.coordinates || [],
    [displayedRoute?.coordinates]
  );

  const restrictionMarkers = useMemo(
    () => truckRestrictions.map(r => ({
      lat: r.lat,
      lng: r.lng,
      type: r.type,
      value: r.value,
      unit: r.unit,
      description: r.description,
    })),
    [truckRestrictions]
  );

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
              <p className="text-xs text-muted-foreground">Entrez vos adresses de départ et d'arrivée pour visualiser l'itinéraire</p>
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
            <ItineraryRouteForm
              originAddress={originAddress}
              setOriginAddress={setOriginAddress}
              originPosition={originPosition}
              setOriginPosition={setOriginPosition}
              destinationAddress={destinationAddress}
              setDestinationAddress={setDestinationAddress}
              destinationPosition={destinationPosition}
              setDestinationPosition={setDestinationPosition}
              openAddressSelector={openAddressSelector}
              toggleFavoriteAddress={toggleFavoriteAddress}
              isFavorite={isFavorite}
              swapOriginWithNext={swapOriginWithNext}
              stops={stops}
              sensors={sensors}
              handleDragEnd={handleDragEnd}
              updateStop={updateStop}
              removeStop={removeStop}
              swapStops={swapStops}
              swapLastWithDestination={swapLastWithDestination}
              addStop={addStop}
              allVehicles={allVehicles}
              selectedVehicleId={selectedVehicleId}
              handleVehicleSelect={handleVehicleSelect}
              clients={clients}
              selectedClientId={selectedClientId}
              setSelectedClientId={setSelectedClientId}
              drivers={drivers}
              selectedDriverIds={selectedDriverIds}
              setSelectedDriverIds={setSelectedDriverIds}
              selectedTrailerId={selectedTrailerId}
              setSelectedTrailerId={setSelectedTrailerId}
              trailers={trailers}
              selectedVehicle={selectedVehicle}
              vehicleCostBreakdown={vehicleCostBreakdown}
              transportMode={transportMode}
              setTransportMode={setTransportMode}
              clearResults={clearResults}
              handleCalculateRoutes={handleCalculateRoutes}
              loading={loading}
              error={error}
            />

            <ItineraryRouteResults
              hasResults={!!hasResults}
              highwayRoute={highwayRoute}
              nationalRoute={nationalRoute}
              selectedRoute={selectedRoute}
              displayedRoute={displayedRoute}
              handleApplyRoute={handleApplyRoute}
              handleOpenSaveItinerary={handleOpenSaveItinerary}
              handleSaveToHistory={handleSaveToHistory}
              formatCurrency={formatCurrency}
              formatDuration={formatDuration}
              originAddress={originAddress}
              destinationAddress={destinationAddress}
              stops={stops}
              transportMode={transportMode}
              vehicleName={selectedVehicle?.name || null}
              clientName={clients.find(c => c.id === selectedClientId)?.name || null}
            />
          </div>
        </ScrollArea>
      </div>

      <ItineraryMapPanel
        markers={markers}
        routeCoordinates={routeCoordinates}
        restrictionMarkers={restrictionMarkers}
        truckRestrictionsCount={truckRestrictions.length}
        selectedRoute={selectedRoute}
        displayedRoute={displayedRoute}
        formatDuration={formatDuration}
        formatCurrency={formatCurrency}
      />

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
              <SearchableSelect
                value={saveFormData.selectedClientId}
                onValueChange={(v) => setSaveFormData(prev => ({ ...prev, selectedClientId: v }))}
                options={clients.map(c => ({ value: c.id, label: c.name }))}
                placeholder="Sélectionner un client"
                searchPlaceholder="Rechercher un client..."
              />
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
