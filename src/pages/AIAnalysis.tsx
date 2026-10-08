import { useState } from 'react';
import {
  Sparkles,
  RotateCcw,
  ArrowRightLeft,
  Moon,
  Sun,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCloudVehicles } from '@/hooks/useCloudVehicles';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/hooks/use-toast';
import { FeatureGate } from '@/components/license/FeatureGate';
import { LoadTourDialog } from '@/components/ai/LoadTourDialog';
import { useSavedTours } from '@/hooks/useSavedTours';
import { validateAIRequest } from '@/utils/aiValidation';
import type { SavedTour } from '@/types/savedTour';
import { AIAnalysisInputPanel } from '@/components/ai-analysis/AIAnalysisInputPanel';
import { AIAnalysisResultsPanel } from '@/components/ai-analysis/AIAnalysisResultsPanel';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { QuoteCalculator } from '@/components/quotes/QuoteCalculator';
import type { AIResponse, AnalysisMode, Position, StopWaypoint } from '@/types/aiAnalysis';

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

export default function AIAnalysis() {
  const { toast } = useToast();
  const { vehicle, drivers } = useApp();
  const { vehicles } = useCloudVehicles();
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
  const [quoteOpen, setQuoteOpen] = useState(false);
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
          <AIAnalysisInputPanel
            loadedTour={loadedTour}
            handleClearTour={handleClearTour}
            formatCurrency={formatCurrency}
            analysisMode={analysisMode}
            setAnalysisMode={setAnalysisMode}
            inputMode={inputMode}
            setInputMode={setInputMode}
            handleLoadFromItinerary={handleLoadFromItinerary}
            setLoadTourOpen={setLoadTourOpen}
            origin={origin}
            setOrigin={setOrigin}
            setOriginPosition={setOriginPosition}
            destination={destination}
            setDestination={setDestination}
            setDestinationPosition={setDestinationPosition}
            swapOriginDestination={swapOriginDestination}
            stops={stops}
            updateStop={updateStop}
            removeStop={removeStop}
            addStop={addStop}
            vehicles={vehicles}
            selectedVehicleId={selectedVehicleId}
            setSelectedVehicleId={setSelectedVehicleId}
            selectedVehicle={selectedVehicle}
            drivers={drivers}
            selectedDriverIds={selectedDriverIds}
            toggleDriver={toggleDriver}
            allowRelay={allowRelay}
            setAllowRelay={setAllowRelay}
            preferNight={preferNight}
            setPreferNight={setPreferNight}
            avoidWeekends={avoidWeekends}
            setAvoidWeekends={setAvoidWeekends}
            maxDrivingHours={maxDrivingHours}
            setMaxDrivingHours={setMaxDrivingHours}
            urgency={urgency}
            setUrgency={setUrgency}
            departureTime={departureTime}
            setDepartureTime={setDepartureTime}
            respectRSE={respectRSE}
            setRespectRSE={setRespectRSE}
            includeRestBreaks={includeRestBreaks}
            setIncludeRestBreaks={setIncludeRestBreaks}
            includeMealBreaks={includeMealBreaks}
            setIncludeMealBreaks={setIncludeMealBreaks}
            requireOvernightRest={requireOvernightRest}
            setRequireOvernightRest={setRequireOvernightRest}
            avoidLowBridges={avoidLowBridges}
            setAvoidLowBridges={setAvoidLowBridges}
            avoidWeightRestrictions={avoidWeightRestrictions}
            setAvoidWeightRestrictions={setAvoidWeightRestrictions}
            vehicleHeight={vehicleHeight}
            setVehicleHeight={setVehicleHeight}
            vehicleWeight={vehicleWeight}
            setVehicleWeight={setVehicleWeight}
            maxConsecutiveDrivingHours={maxConsecutiveDrivingHours}
            setMaxConsecutiveDrivingHours={setMaxConsecutiveDrivingHours}
            handleAnalyze={handleAnalyze}
            loading={loading}
          />

          <AIAnalysisResultsPanel
            result={result}
            loading={loading}
            saving={saving}
            origin={origin}
            destination={destination}
            getStopsForAPI={getStopsForAPI}
            handleSaveAsNewTour={handleSaveAsNewTour}
            onCreateQuote={() => setQuoteOpen(true)}
            formatCurrency={formatCurrency}
            expandedSection={expandedSection}
            toggleSection={toggleSection}
            getStrategyIcon={getStrategyIcon}
            getStrategyColor={getStrategyColor}
          />
        </div>
      </div>

      <Dialog open={quoteOpen} onOpenChange={setQuoteOpen}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader><DialogTitle>Devis client depuis l'analyse IA</DialogTitle></DialogHeader>
          {result && (
            <QuoteCalculator
              initial={{
                origin, destination,
                distanceKm: Math.round(result.recommendation.estimatedDistance || 0),
                tollCost: result.costBreakdown?.tolls || 0,
                vehicleId: selectedVehicleId,
                driverIds: selectedDriverIds,
                notes: `Analyse IA - ${result.recommendation.strategy || 'optimisée'}`,
              }}
              onSaved={() => { setQuoteOpen(false); toast({ title: 'Devis enregistré', description: "Retrouvez-le dans Appels d'offres." }); }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Load Tour Dialog */}
      <LoadTourDialog
        open={loadTourOpen}
        onOpenChange={setLoadTourOpen}
        onSelect={handleLoadTour}
      />
    </FeatureGate>
  );
}
