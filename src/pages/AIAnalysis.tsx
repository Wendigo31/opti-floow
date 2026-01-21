import { useState } from 'react';
import { 
  Sparkles, 
  Truck, 
  MapPin, 
  Loader2, 
  TrendingDown, 
  Clock, 
  Route,
  Users,
  AlertTriangle,
  CheckCircle2,
  Lightbulb,
  ChevronDown,
  ChevronUp,
  Fuel,
  Moon,
  Sun,
  Upload,
  Folder,
  RotateCcw,
  Zap,
  Save,
  RefreshCw,
  Calendar,
  Timer,
  ArrowRightLeft,
  Award,
  Target,
  Shield,
  Navigation,
  Plus,
  X,
  Edit3
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { FeatureGate } from '@/components/license/FeatureGate';
import { LoadTourDialog } from '@/components/ai/LoadTourDialog';
import { VisualSchedule } from '@/components/ai/VisualSchedule';
import { AIRouteMap } from '@/components/ai/AIRouteMap';
import { useSavedTours } from '@/hooks/useSavedTours';
import { validateAIRequest } from '@/utils/aiValidation';
import { AddressInput } from '@/components/route/AddressInput';
import type { Vehicle } from '@/types/vehicle';
import type { SavedTour } from '@/types/savedTour';

interface Position {
  lat: number;
  lon: number;
}

interface StopWaypoint {
  id: string;
  address: string;
  position: Position | null;
}

// Import itinerary state to get current search
const ITINERARY_STORAGE_KEY = 'optiflow_itinerary_state';
function getItineraryState() {
  try {
    const stored = sessionStorage.getItem(ITINERARY_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    return null;
  }
  return null;
}

interface AIOptimization {
  type: string;
  description: string;
  savings: number;
  impact?: string;
}

interface AISegment {
  from: string;
  to: string;
  distance: number;
  duration: number;
  driver: string;
  type: string;
  startTime?: string;
  endTime?: string;
  notes?: string;
}

interface AIRelayPoint {
  location: string;
  km: number;
  driverOut: string;
  driverIn: string;
  estimatedTime: string;
  waitTime: number;
  notes?: string;
}

interface AIStrategy {
  name: string;
  type: string;
  timing: string;
  totalCost: number;
  totalDuration: number;
  breakdown: {
    fuel: number;
    tolls: number;
    drivers: number;
    meals: number;
    overnight: number;
    vehicleCost?: number;
  };
  pros: string[];
  cons: string[];
  isRecommended: boolean;
}

interface AIRelayPlan {
  isRecommended: boolean;
  reason: string;
  relayPoints: AIRelayPoint[];
  totalDriversCost: number;
  savingsVsSolo: number;
}

interface AIResponse {
  recommendation: {
    summary: string;
    strategy?: string;
    estimatedCost: number;
    estimatedDuration: number;
    estimatedDistance: number;
    savings: number;
    savingsPercent: number;
    comparedTo?: string;
  };
  strategies?: AIStrategy[];
  relayPlan?: AIRelayPlan;
  routeDetails?: {
    departureTime: string;
    arrivalTime: string;
    segments: AISegment[];
  };
  costBreakdown?: {
    fuel: number;
    tolls: number;
    drivers: number;
    driverBonuses?: number;
    meals: number;
    overnight: number;
    vehicleCost?: number;
    structureCost?: number;
    total: number;
  };
  timeOptimization?: {
    standardDuration: number;
    optimizedDuration: number;
    timeSaved: number;
    explanation: string;
  };
  optimizations?: AIOptimization[];
  alternatives?: { name: string; cost: number; duration: number; pros: string[]; cons: string[] }[];
  warnings?: string[];
  tips?: string[];
  regulatoryNotes?: string[];
  rawResponse?: string;
}

type AnalysisMode = 'basic' | 'optimize_route' | 'relay_analysis' | 'full_optimization';

export default function AIAnalysis() {
  const { toast } = useToast();
  const { vehicle, drivers } = useApp();
  const [vehicles] = useLocalStorage<Vehicle[]>('optiflow_vehicles', []);
  const { saveTour } = useSavedTours();
  
  const [loadTourOpen, setLoadTourOpen] = useState(false);
  const [loadedTour, setLoadedTour] = useState<SavedTour | null>(null);
  
  // Address inputs with autocomplete
  const [origin, setOrigin] = useState('');
  const [originPosition, setOriginPosition] = useState<Position | null>(null);
  const [destination, setDestination] = useState('');
  const [destinationPosition, setDestinationPosition] = useState<Position | null>(null);
  const [stops, setStops] = useState<StopWaypoint[]>([]);
  const [inputMode, setInputMode] = useState<'manual' | 'itinerary' | 'tour'>('manual');
  
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  const [selectedDriverIds, setSelectedDriverIds] = useState<string[]>([]);
  
  // Enhanced constraints for truck drivers
  const [preferNight, setPreferNight] = useState(false);
  const [avoidWeekends, setAvoidWeekends] = useState(true);
  const [maxDrivingHours, setMaxDrivingHours] = useState(9);
  const [allowRelay, setAllowRelay] = useState(true);
  const [urgency, setUrgency] = useState<'standard' | 'express' | 'flexible'>('standard');
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>('full_optimization');
  const [departureTime, setDepartureTime] = useState('');
  
  // Additional truck driver constraints
  const [respectRSE, setRespectRSE] = useState(true);
  const [includeRestBreaks, setIncludeRestBreaks] = useState(true);
  const [includeMealBreaks, setIncludeMealBreaks] = useState(true);
  const [maxConsecutiveDrivingHours, setMaxConsecutiveDrivingHours] = useState(4.5);
  const [requireOvernightRest, setRequireOvernightRest] = useState(true);
  const [avoidLowBridges, setAvoidLowBridges] = useState(true);
  const [avoidWeightRestrictions, setAvoidWeightRestrictions] = useState(true);
  const [vehicleHeight, setVehicleHeight] = useState(4.0);
  const [vehicleWeight, setVehicleWeight] = useState(44);
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<AIResponse | null>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>('recommendation');

  const selectedVehicle = vehicles.find(v => v.id === selectedVehicleId);
  const selectedDriversData = drivers.filter(d => selectedDriverIds.includes(d.id));

  const formatCurrency = (value: number) => new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR'
  }).format(value);

  const handleSaveAsNewTour = async () => {
    if (!result || !origin || !destination) return;

    setSaving(true);
    try {
      const tourStops = result.routeDetails?.segments
        ?.filter(seg => seg.type !== 'rest' && seg.type !== 'relay')
        .slice(1, -1)
        .map(seg => ({ address: seg.from })) || [];

      const tourName = loadedTour 
        ? `${loadedTour.name} (Optimisé IA)`
        : `Trajet IA - ${origin.split(',')[0]} → ${destination.split(',')[0]}`;

      const newTour = await saveTour({
        name: tourName,
        origin_address: origin,
        destination_address: destination,
        stops: tourStops,
        distance_km: result.recommendation.estimatedDistance,
        duration_minutes: Math.round(result.recommendation.estimatedDuration * 60),
        toll_cost: result.costBreakdown?.tolls || 0,
        fuel_cost: result.costBreakdown?.fuel || 0,
        adblue_cost: 0,
        driver_cost: result.costBreakdown?.drivers || 0,
        structure_cost: (result.costBreakdown?.meals || 0) + (result.costBreakdown?.overnight || 0),
        vehicle_cost: result.costBreakdown?.vehicleCost || 0,
        total_cost: result.recommendation.estimatedCost,
        pricing_mode: 'auto',
        revenue: result.recommendation.estimatedCost * 1.15,
        profit: result.recommendation.estimatedCost * 0.15,
        profit_margin: 15,
        vehicle_id: selectedVehicleId || null,
        vehicle_data: selectedVehicle || null,
        driver_ids: selectedDriverIds,
        drivers_data: selectedDriversData,
        notes: `Généré par l'IA - Stratégie: ${result.recommendation.strategy || 'optimisée'} - ${result.recommendation.summary}`,
        tags: ['IA', 'Optimisé', result.recommendation.strategy || 'auto'],
      });

      if (newTour) {
        toast({ 
          title: "Tournée sauvegardée", 
          description: `"${tourName}" créée avec succès` 
        });
      }
    } catch (error) {
      console.error('Error saving tour:', error);
      toast({ 
        title: "Erreur", 
        description: "Impossible de sauvegarder la tournée", 
        variant: "destructive" 
      });
    } finally {
      setSaving(false);
    }
  };

  const handleLoadFromItinerary = () => {
    const itineraryState = getItineraryState();
    if (!itineraryState?.originAddress || !itineraryState?.destinationAddress) {
      toast({
        title: "Aucun itinéraire",
        description: "Aucun trajet programmé dans la page Itinéraire",
        variant: "destructive",
      });
      return;
    }
    
    setOrigin(itineraryState.originAddress);
    setOriginPosition(itineraryState.originPosition || null);
    setDestination(itineraryState.destinationAddress);
    setDestinationPosition(itineraryState.destinationPosition || null);
    
    // Convert stops from itinerary format to StopWaypoint format
    const itineraryStops = itineraryState.stops || [];
    setStops(itineraryStops.map((s: any) => ({
      id: s.id || crypto.randomUUID(),
      address: s.address || '',
      position: s.position || null,
    })));
    
    setInputMode('itinerary');
    
    // Load vehicle if selected
    if (itineraryState.selectedVehicleId) {
      setSelectedVehicleId(itineraryState.selectedVehicleId);
    }
    
    // Load route constraints from itinerary
    if (itineraryState.avoidLowBridges !== undefined) {
      setAvoidLowBridges(itineraryState.avoidLowBridges);
    }
    if (itineraryState.avoidWeightRestrictions !== undefined) {
      setAvoidWeightRestrictions(itineraryState.avoidWeightRestrictions);
    }
    
    setResult(null);
    setLoadedTour(null);
    setAnalysisMode('full_optimization');
    
    toast({
      title: "Itinéraire chargé",
      description: `${itineraryState.originAddress.split(',')[0]} → ${itineraryState.destinationAddress.split(',')[0]}`,
    });
  };

  const handleLoadTour = (tour: SavedTour) => {
    setLoadedTour(tour);
    setOrigin(tour.origin_address);
    setOriginPosition(null); // Tours don't store positions
    setDestination(tour.destination_address);
    setDestinationPosition(null);
    
    // Convert tour stops to StopWaypoint format
    setStops(tour.stops?.map(s => ({
      id: crypto.randomUUID(),
      address: s.address,
      position: null,
    })) || []);
    
    setInputMode('tour');
    setResult(null);
    setAnalysisMode('optimize_route');
    toast({ title: "Tournée chargée", description: `"${tour.name}" prête pour l'analyse` });
  };

  const handleClearTour = () => {
    setLoadedTour(null);
    setOrigin('');
    setOriginPosition(null);
    setDestination('');
    setDestinationPosition(null);
    setStops([]);
    setInputMode('manual');
    setResult(null);
    setAnalysisMode('full_optimization');
  };

  // Stops management for manual input
  const addStop = () => {
    setStops([...stops, { id: crypto.randomUUID(), address: '', position: null }]);
  };

  const removeStop = (id: string) => {
    setStops(stops.filter(s => s.id !== id));
  };

  const updateStop = (id: string, address: string, position: Position | null) => {
    setStops(stops.map(s => s.id === id ? { ...s, address, position } : s));
  };

  // Swap origin and destination
  const swapOriginDestination = () => {
    const tempOrigin = origin;
    const tempOriginPosition = originPosition;
    setOrigin(destination);
    setOriginPosition(destinationPosition);
    setDestination(tempOrigin);
    setDestinationPosition(tempOriginPosition);
  };

  // Get stops as string array for API
  const getStopsForAPI = () => stops.map(s => s.address).filter(Boolean);

  const handleAnalyze = async () => {
    // Comprehensive validation using the utility
    const validation = validateAIRequest({
      origin,
      destination,
      vehicle: selectedVehicle,
      fuelPrice: vehicle.fuelPriceHT,
      driversData: selectedDriversData,
      loadedTour: loadedTour,
    });

    if (!validation.isValid) {
      // Show all errors as a formatted list
      const errorMessage = validation.errors.length === 1 
        ? validation.errors[0] 
        : validation.errors.map((e, i) => `${i + 1}. ${e}`).join('\n');
      
      toast({ 
        title: "Données incomplètes", 
        description: errorMessage, 
        variant: "destructive" 
      });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const requestBody: Record<string, unknown> = {
        origin,
        destination,
        mode: loadedTour ? 'optimize_route' : analysisMode,
        vehicleType: selectedVehicle!.type,
        fuelConsumption: selectedVehicle!.fuelConsumption,
        fuelPrice: vehicle.fuelPriceHT,
        tollClass: 2,
        drivers: validation.sanitizedDrivers,
        constraints: {
          maxDrivingHours,
          maxConsecutiveDrivingHours,
          preferNightDriving: preferNight,
          avoidWeekends,
          allowRelay,
          urgency,
          departureTime: departureTime || undefined,
          // Enhanced truck driver constraints
          respectRSE,
          includeRestBreaks,
          includeMealBreaks,
          requireOvernightRest,
          avoidLowBridges,
          avoidWeightRestrictions,
          vehicleHeight,
          vehicleWeight,
        },
      };

      if (loadedTour && validation.sanitizedCosts) {
        requestBody.stops = getStopsForAPI();
        requestBody.currentCosts = validation.sanitizedCosts;
        requestBody.currentDistance = loadedTour.distance_km;
        requestBody.currentDuration = loadedTour.duration_minutes;
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-optimize-trip`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erreur lors de l\'analyse');
      }

      const data = await response.json();
      setResult(data);
      setExpandedSection('recommendation');
    } catch (error) {
      console.error('AI analysis error:', error);
      toast({ 
        title: "Erreur", 
        description: error instanceof Error ? error.message : "Impossible d'analyser le trajet", 
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleDriver = (driverId: string) => {
    setSelectedDriverIds(prev => 
      prev.includes(driverId) 
        ? prev.filter(id => id !== driverId)
        : [...prev, driverId]
    );
  };

  const toggleSection = (section: string) => {
    setExpandedSection(prev => prev === section ? null : section);
  };

  const getStrategyIcon = (type: string, timing: string) => {
    if (type === 'relay') return <ArrowRightLeft className="w-4 h-4" />;
    if (timing === 'night') return <Moon className="w-4 h-4" />;
    return <Sun className="w-4 h-4" />;
  };

  const getStrategyColor = (isRecommended: boolean) => {
    return isRecommended ? 'border-success bg-success/10' : 'border-border/50';
  };

  return (
    <FeatureGate feature="ai_optimization" showLockedIndicator={true}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Analyse par IA</h1>
              <p className="text-muted-foreground">Optimisation relais, horaires & coûts</p>
            </div>
          </div>
          <div className="flex gap-2">
            {(origin || destination || stops.length > 0) && (
              <Button onClick={handleClearTour} variant="ghost" className="gap-2 text-muted-foreground">
                <RotateCcw className="w-4 h-4" />
                Réinitialiser
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input Panel */}
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
                    <Select value={urgency} onValueChange={(v) => setUrgency(v as typeof urgency)}>
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

          {/* Results Panel */}
          <div className="space-y-4">
            {!result && !loading && (
              <div className="glass-card p-8 text-center opacity-0 animate-slide-up" style={{ animationDelay: '100ms', animationFillMode: 'forwards' }}>
                <Sparkles className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold text-foreground mb-2">Prêt pour l'analyse</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  L'IA va analyser les meilleures stratégies: solo vs relais, jour vs nuit, et proposer les points de relais optimaux.
                </p>
                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div className="p-2 bg-secondary/50 rounded">
                    <ArrowRightLeft className="w-4 h-4 mx-auto mb-1 text-primary" />
                    <p>Points de relais</p>
                  </div>
                  <div className="p-2 bg-secondary/50 rounded">
                    <Moon className="w-4 h-4 mx-auto mb-1 text-primary" />
                    <p>Horaires optimaux</p>
                  </div>
                  <div className="p-2 bg-secondary/50 rounded">
                    <TrendingDown className="w-4 h-4 mx-auto mb-1 text-primary" />
                    <p>Économies max</p>
                  </div>
                </div>
              </div>
            )}

            {loading && (
              <div className="glass-card p-8 text-center">
                <Loader2 className="w-12 h-12 text-primary mx-auto mb-4 animate-spin" />
                <h3 className="font-semibold text-foreground mb-2">Analyse en cours...</h3>
                <p className="text-sm text-muted-foreground">
                  L'IA calcule les stratégies de relais, les horaires optimaux et les points d'arrêt...
                </p>
              </div>
            )}

            {result && (
              <>
                {/* Save Action Bar */}
                <div className="glass-card p-4 opacity-0 animate-slide-up border-l-4 border-l-success" style={{ animationDelay: '25ms', animationFillMode: 'forwards' }}>
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-success" />
                      <div>
                        <p className="font-medium text-foreground">Analyse terminée</p>
                        <p className="text-xs text-muted-foreground">
                          {result.recommendation.strategy && (
                            <Badge variant="outline" className="mr-2 text-xs">
                              {result.recommendation.strategy}
                            </Badge>
                          )}
                          Économie: {formatCurrency(result.recommendation.savings)} ({result.recommendation.savingsPercent?.toFixed(0) || 0}%)
                        </p>
                      </div>
                    </div>
                    <Button 
                      onClick={handleSaveAsNewTour} 
                      disabled={saving}
                      variant="gradient"
                      className="gap-2"
                    >
                      {saving ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Sauvegarde...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          Sauvegarder
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Interactive Map */}
                <div className="opacity-0 animate-slide-up" style={{ animationDelay: '40ms', animationFillMode: 'forwards' }}>
                  <AIRouteMap
                    origin={origin}
                    destination={destination}
                    stops={getStopsForAPI()}
                    relayPoints={result.relayPlan?.relayPoints || []}
                    segments={result.routeDetails?.segments || []}
                  />
                </div>

                {/* Visual Schedule Timeline */}
                {result.routeDetails?.segments && result.routeDetails.segments.length > 0 && (
                  <div className="glass-card p-5 opacity-0 animate-slide-up" style={{ animationDelay: '45ms', animationFillMode: 'forwards' }}>
                    <div className="flex items-center gap-2 mb-4">
                      <Calendar className="w-5 h-5 text-primary" />
                      <h3 className="font-semibold text-foreground">Planning horaire</h3>
                    </div>
                    <VisualSchedule 
                      segments={result.routeDetails.segments}
                      departureTime={result.routeDetails.departureTime}
                      arrivalTime={result.routeDetails.arrivalTime}
                    />
                  </div>
                )}

                {/* Recommendation */}
                <div className="glass-card p-5 opacity-0 animate-slide-up" style={{ animationDelay: '50ms', animationFillMode: 'forwards' }}>
                  <button
                    onClick={() => toggleSection('recommendation')}
                    className="w-full flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <Award className="w-5 h-5 text-success" />
                      <h3 className="font-semibold text-foreground">Recommandation IA</h3>
                    </div>
                    {expandedSection === 'recommendation' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  {expandedSection === 'recommendation' && (
                    <div className="mt-4 space-y-4">
                      <p className="text-sm text-muted-foreground">{result.recommendation.summary}</p>
                      {result.recommendation.comparedTo && (
                        <p className="text-xs text-muted-foreground bg-secondary/50 p-2 rounded">
                          Comparé à: {result.recommendation.comparedTo}
                        </p>
                      )}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 bg-primary/10 rounded-lg text-center">
                          <p className="text-xs text-muted-foreground">Coût optimisé</p>
                          <p className="text-xl font-bold text-primary">{formatCurrency(result.recommendation.estimatedCost)}</p>
                        </div>
                        <div className="p-3 bg-success/10 rounded-lg text-center">
                          <p className="text-xs text-muted-foreground">Économies</p>
                          <p className="text-xl font-bold text-success">
                            {formatCurrency(result.recommendation.savings)}
                          </p>
                        </div>
                        <div className="p-3 bg-secondary rounded-lg text-center">
                          <p className="text-xs text-muted-foreground">Distance</p>
                          <p className="text-lg font-semibold">{result.recommendation.estimatedDistance} km</p>
                        </div>
                        <div className="p-3 bg-secondary rounded-lg text-center">
                          <p className="text-xs text-muted-foreground">Durée</p>
                          <p className="text-lg font-semibold">{result.recommendation.estimatedDuration?.toFixed(1) || 0}h</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Strategies Comparison */}
                {result.strategies && result.strategies.length > 0 && (
                  <div className="glass-card p-5 opacity-0 animate-slide-up" style={{ animationDelay: '75ms', animationFillMode: 'forwards' }}>
                    <button
                      onClick={() => toggleSection('strategies')}
                      className="w-full flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <RefreshCw className="w-5 h-5 text-primary" />
                        <h3 className="font-semibold text-foreground">Comparaison des stratégies</h3>
                      </div>
                      {expandedSection === 'strategies' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    {expandedSection === 'strategies' && (
                      <div className="mt-4 space-y-3">
                        {result.strategies.map((strategy, idx) => (
                          <div 
                            key={idx} 
                            className={cn(
                              "p-3 rounded-lg border transition-all",
                              getStrategyColor(strategy.isRecommended)
                            )}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                {getStrategyIcon(strategy.type, strategy.timing)}
                                <span className="font-medium">{strategy.name}</span>
                                {strategy.isRecommended && (
                                  <Badge className="bg-success text-white text-xs">Recommandé</Badge>
                                )}
                              </div>
                              <span className="font-bold text-primary">{formatCurrency(strategy.totalCost)}</span>
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-xs mb-2">
                              <div>
                                <span className="text-muted-foreground">Durée:</span> {strategy.totalDuration}h
                              </div>
                              <div>
                                <span className="text-muted-foreground">Carburant:</span> {formatCurrency(strategy.breakdown.fuel)}
                              </div>
                              <div>
                                <span className="text-muted-foreground">Conducteurs:</span> {formatCurrency(strategy.breakdown.drivers)}
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {strategy.pros.slice(0, 2).map((pro, i) => (
                                <span key={i} className="text-xs bg-success/20 text-success px-2 py-0.5 rounded">
                                  + {pro}
                                </span>
                              ))}
                              {strategy.cons.slice(0, 1).map((con, i) => (
                                <span key={i} className="text-xs bg-destructive/20 text-destructive px-2 py-0.5 rounded">
                                  - {con}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Relay Plan */}
                {result.relayPlan && (
                  <div className="glass-card p-5 opacity-0 animate-slide-up" style={{ animationDelay: '100ms', animationFillMode: 'forwards' }}>
                    <button
                      onClick={() => toggleSection('relay')}
                      className="w-full flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <ArrowRightLeft className="w-5 h-5 text-primary" />
                        <h3 className="font-semibold text-foreground">Plan de relais</h3>
                        {result.relayPlan.isRecommended && (
                          <Badge className="bg-success text-white text-xs">Recommandé</Badge>
                        )}
                      </div>
                      {expandedSection === 'relay' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    {expandedSection === 'relay' && (
                      <div className="mt-4 space-y-3">
                        <p className="text-sm text-muted-foreground">{result.relayPlan.reason}</p>
                        
                        {result.relayPlan.relayPoints.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-xs font-medium text-foreground">Points de relais:</p>
                            {result.relayPlan.relayPoints.map((point, idx) => (
                              <div key={idx} className="p-3 bg-primary/10 rounded-lg border border-primary/30">
                                <div className="flex items-center justify-between mb-1">
                                  <div className="flex items-center gap-2">
                                    <Navigation className="w-4 h-4 text-primary" />
                                    <span className="font-medium">{point.location}</span>
                                  </div>
                                  <Badge variant="outline">{point.km} km</Badge>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                                  <div>
                                    <span className="text-foreground">{point.driverOut}</span> → <span className="text-foreground">{point.driverIn}</span>
                                  </div>
                                  <div className="text-right">
                                    {point.estimatedTime} • Attente: {point.waitTime}min
                                  </div>
                                </div>
                                {point.notes && (
                                  <p className="text-xs text-muted-foreground mt-1">{point.notes}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                        
                        <div className="flex justify-between p-2 bg-success/10 rounded text-sm">
                          <span>Économie vs solo:</span>
                          <span className="font-bold text-success">{formatCurrency(result.relayPlan.savingsVsSolo)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Time Optimization */}
                {result.timeOptimization && (
                  <div className="glass-card p-5 opacity-0 animate-slide-up" style={{ animationDelay: '125ms', animationFillMode: 'forwards' }}>
                    <button
                      onClick={() => toggleSection('time')}
                      className="w-full flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <Timer className="w-5 h-5 text-primary" />
                        <h3 className="font-semibold text-foreground">Optimisation du temps</h3>
                      </div>
                      {expandedSection === 'time' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    {expandedSection === 'time' && (
                      <div className="mt-4 space-y-3">
                        <div className="grid grid-cols-3 gap-3 text-center">
                          <div className="p-2 bg-muted/50 rounded">
                            <p className="text-xs text-muted-foreground">Standard</p>
                            <p className="font-semibold">{result.timeOptimization.standardDuration}h</p>
                          </div>
                          <div className="p-2 bg-success/10 rounded">
                            <p className="text-xs text-muted-foreground">Optimisé</p>
                            <p className="font-semibold text-success">{result.timeOptimization.optimizedDuration}h</p>
                          </div>
                          <div className="p-2 bg-primary/10 rounded">
                            <p className="text-xs text-muted-foreground">Gagné</p>
                            <p className="font-semibold text-primary">-{result.timeOptimization.timeSaved}h</p>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground">{result.timeOptimization.explanation}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Cost Breakdown */}
                {result.costBreakdown && (
                  <div className="glass-card p-5 opacity-0 animate-slide-up" style={{ animationDelay: '150ms', animationFillMode: 'forwards' }}>
                    <button
                      onClick={() => toggleSection('costs')}
                      className="w-full flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <Fuel className="w-5 h-5 text-warning" />
                        <h3 className="font-semibold text-foreground">Détail des coûts</h3>
                      </div>
                      {expandedSection === 'costs' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    {expandedSection === 'costs' && (
                      <div className="mt-4 space-y-2 text-sm">
                        <div className="flex justify-between py-1 border-b border-border/30">
                          <span className="text-muted-foreground">Carburant</span>
                          <span>{formatCurrency(result.costBreakdown.fuel)}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-border/30">
                          <span className="text-muted-foreground">Péages</span>
                          <span>{formatCurrency(result.costBreakdown.tolls)}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-border/30">
                          <span className="text-muted-foreground">Conducteurs</span>
                          <span>{formatCurrency(result.costBreakdown.drivers)}</span>
                        </div>
                        {result.costBreakdown.driverBonuses !== undefined && result.costBreakdown.driverBonuses > 0 && (
                          <div className="flex justify-between py-1 border-b border-border/30">
                            <span className="text-muted-foreground">Primes (nuit/dimanche)</span>
                            <span>{formatCurrency(result.costBreakdown.driverBonuses)}</span>
                          </div>
                        )}
                        <div className="flex justify-between py-1 border-b border-border/30">
                          <span className="text-muted-foreground">Repas</span>
                          <span>{formatCurrency(result.costBreakdown.meals)}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-border/30">
                          <span className="text-muted-foreground">Nuitées</span>
                          <span>{formatCurrency(result.costBreakdown.overnight)}</span>
                        </div>
                        {result.costBreakdown.vehicleCost !== undefined && (
                          <div className="flex justify-between py-1 border-b border-border/30">
                            <span className="text-muted-foreground">Véhicule</span>
                            <span>{formatCurrency(result.costBreakdown.vehicleCost)}</span>
                          </div>
                        )}
                        {result.costBreakdown.structureCost !== undefined && (
                          <div className="flex justify-between py-1 border-b border-border/30">
                            <span className="text-muted-foreground">Structure</span>
                            <span>{formatCurrency(result.costBreakdown.structureCost)}</span>
                          </div>
                        )}
                        <div className="flex justify-between py-2 font-semibold">
                          <span>Total</span>
                          <span className="text-primary">{formatCurrency(result.costBreakdown.total)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Route Details */}
                {result.routeDetails && (
                  <div className="glass-card p-5 opacity-0 animate-slide-up" style={{ animationDelay: '175ms', animationFillMode: 'forwards' }}>
                    <button
                      onClick={() => toggleSection('route')}
                      className="w-full flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <Route className="w-5 h-5 text-primary" />
                        <h3 className="font-semibold text-foreground">Détail du parcours</h3>
                      </div>
                      {expandedSection === 'route' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    {expandedSection === 'route' && (
                      <div className="mt-4 space-y-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Départ recommandé</span>
                          <span className="font-medium">{result.routeDetails.departureTime}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Arrivée estimée</span>
                          <span className="font-medium">{result.routeDetails.arrivalTime}</span>
                        </div>
                        <div className="space-y-2 mt-3">
                          {result.routeDetails.segments.map((seg, idx) => (
                            <div 
                              key={idx} 
                              className={cn(
                                "p-2 rounded text-xs",
                                seg.type === 'relay' ? 'bg-primary/20 border border-primary/30' :
                                seg.type === 'rest' ? 'bg-warning/20 border border-warning/30' :
                                'bg-secondary/50'
                              )}
                            >
                              <div className="flex justify-between">
                                <span className="font-medium">{seg.from} → {seg.to}</span>
                                <span>{seg.distance}km • {seg.duration}h</span>
                              </div>
                              <div className="flex justify-between mt-1 text-muted-foreground">
                                {seg.driver && <span>Conducteur: {seg.driver}</span>}
                                {seg.startTime && seg.endTime && (
                                  <span>{seg.startTime} - {seg.endTime}</span>
                                )}
                              </div>
                              {seg.notes && <p className="text-muted-foreground mt-1">{seg.notes}</p>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Optimizations */}
                {result.optimizations && result.optimizations.length > 0 && (
                  <div className="glass-card p-5 opacity-0 animate-slide-up" style={{ animationDelay: '200ms', animationFillMode: 'forwards' }}>
                    <button
                      onClick={() => toggleSection('optimizations')}
                      className="w-full flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <TrendingDown className="w-5 h-5 text-success" />
                        <h3 className="font-semibold text-foreground">Optimisations appliquées</h3>
                      </div>
                      {expandedSection === 'optimizations' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    {expandedSection === 'optimizations' && (
                      <div className="mt-4 space-y-2">
                        {result.optimizations.map((opt, idx) => (
                          <div key={idx} className="flex items-start gap-2 p-2 bg-success/10 rounded">
                            <CheckCircle2 className="w-4 h-4 text-success mt-0.5" />
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <p className="text-sm">{opt.description}</p>
                                {opt.impact && (
                                  <Badge 
                                    variant="outline" 
                                    className={cn(
                                      "text-xs",
                                      opt.impact === 'high' ? 'border-success text-success' :
                                      opt.impact === 'medium' ? 'border-warning text-warning' :
                                      'border-muted-foreground'
                                    )}
                                  >
                                    {opt.impact}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-success">Économie: {formatCurrency(opt.savings)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Regulatory Notes */}
                {result.regulatoryNotes && result.regulatoryNotes.length > 0 && (
                  <div className="glass-card p-5 opacity-0 animate-slide-up" style={{ animationDelay: '225ms', animationFillMode: 'forwards' }}>
                    <div className="flex items-center gap-2 mb-3">
                      <Shield className="w-5 h-5 text-primary" />
                      <h3 className="font-semibold text-foreground">Notes réglementaires (RSE)</h3>
                    </div>
                    <div className="space-y-2">
                      {result.regulatoryNotes.map((note, idx) => (
                        <div key={idx} className="flex items-start gap-2 p-2 bg-primary/10 rounded text-sm">
                          <Shield className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                          <p>{note}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tips & Warnings */}
                {(result.tips?.length || result.warnings?.length) && (
                  <div className="glass-card p-5 opacity-0 animate-slide-up" style={{ animationDelay: '250ms', animationFillMode: 'forwards' }}>
                    {result.warnings && result.warnings.length > 0 && (
                      <div className="mb-4">
                        {result.warnings.map((warning, idx) => (
                          <div key={idx} className="flex items-start gap-2 p-2 bg-warning/10 rounded mb-2">
                            <AlertTriangle className="w-4 h-4 text-warning mt-0.5" />
                            <p className="text-sm">{warning}</p>
                          </div>
                        ))}
                      </div>
                    )}
                    {result.tips && result.tips.length > 0 && (
                      <div>
                        {result.tips.map((tip, idx) => (
                          <div key={idx} className="flex items-start gap-2 p-2 bg-primary/10 rounded mb-2">
                            <Lightbulb className="w-4 h-4 text-primary mt-0.5" />
                            <p className="text-sm">{tip}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Load Tour Dialog */}
      <LoadTourDialog 
        open={loadTourOpen} 
        onOpenChange={setLoadTourOpen} 
        onSelect={handleLoadTour} 
      />
    </FeatureGate>
  );
}
