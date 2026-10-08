import { useState, useMemo } from 'react';
import { Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useApp } from '@/context/AppContext';
import { useCloudVehicles } from '@/hooks/useCloudVehicles';
import { useCloudTrailers } from '@/hooks/useCloudTrailers';
import { useClients } from '@/hooks/useClients';
import { useCloudCharges } from '@/hooks/useCloudCharges';
import { useCloudDrivers } from '@/hooks/useCloudDrivers';
import { useCalculations } from '@/hooks/useCalculations';
import { useLicense } from '@/hooks/useLicense';
import { useSavedTours } from '@/hooks/useSavedTours';
import { useFuelPrice, type FuelType, convertTTCtoHT, convertHTtoTTC } from '@/hooks/useFuelPrice';
import { calculateVehicleCosts, calculateTrailerCosts } from '@/hooks/useVehicleCost';
import { SaveTourDialog } from '@/components/tours/SaveTourDialog';
import { LoadTourDialog } from '@/components/ai/LoadTourDialog';
import { toast } from 'sonner';
import type { SavedTour } from '@/types/savedTour';
import { CalculatorLoadedTourCard } from '@/components/calculator/CalculatorLoadedTourCard';
import { CalculatorVehicleTrailerSection } from '@/components/calculator/CalculatorVehicleTrailerSection';
import { CalculatorTripPricingSection } from '@/components/calculator/CalculatorTripPricingSection';
import { CalculatorDriverSection } from '@/components/calculator/CalculatorDriverSection';
import { CalculatorResultsSummary } from '@/components/calculator/CalculatorResultsSummary';

export default function Calculator() {
  const {
    trip,
    setTrip,
    vehicle,
    setVehicle,
    selectedDriverIds,
    setSelectedDriverIds,
    settings,
  } = useApp();

  // Use cloud data for drivers and charges (shared company data)
  const { charges } = useCloudCharges();
  const { cdiDrivers, cddDrivers, interimDrivers, autreDrivers, jokerDrivers } = useCloudDrivers();
  const drivers = [...cdiDrivers, ...cddDrivers, ...interimDrivers, ...autreDrivers, ...jokerDrivers];

  const { vehicles } = useCloudVehicles();
  const { trailers } = useCloudTrailers();
  const { clients } = useClients();
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [selectedTrailerId, setSelectedTrailerId] = useState<string | null>(null);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [loadDialogOpen, setLoadDialogOpen] = useState(false);
  const [loadedTour, setLoadedTour] = useState<SavedTour | null>(null);
  const [saving, setSaving] = useState(false);
  const [showHTPrice, setShowHTPrice] = useState(false);

  const { saveTour, updateTour } = useSavedTours();
  const { fetchFuelPrice } = useFuelPrice();
  const [updating, setUpdating] = useState(false);
  
  // Handle loading a saved tour
  const handleLoadTour = (tour: SavedTour) => {
    // Set trip data
    setTrip(prev => ({
      ...prev,
      distance: tour.distance_km,
      tollCost: tour.toll_cost,
      targetMargin: tour.target_margin || 15,
      pricePerKm: tour.price_per_km || 0,
      fixedPrice: tour.fixed_price || 0,
      pricingMode: (tour.pricing_mode as 'km' | 'fixed' | 'auto') || 'auto',
    }));
    
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
    
    // Set trailer if available
    if (tour.trailer_id) {
      const trailerExists = trailers.find(t => t.id === tour.trailer_id);
      if (trailerExists) {
        setSelectedTrailerId(tour.trailer_id);
      }
    }
    
    // Set drivers if available
    if (tour.driver_ids && tour.driver_ids.length > 0) {
      const validDriverIds = tour.driver_ids.filter(id => drivers.some(d => d.id === id));
      setSelectedDriverIds(validDriverIds);
    }
    
    setLoadedTour(tour);
    toast.success(`Tournée "${tour.name}" chargée`);
  };
  
  // Clear loaded tour
  const handleClearTour = () => {
    setLoadedTour(null);
  };
  
  // Update existing tour with new calculations
  const handleUpdateTour = async () => {
    if (!loadedTour) return;
    
    setUpdating(true);
    try {
      const success = await updateTour(loadedTour.id, {
        distance_km: trip.distance,
        toll_cost: trip.tollCost,
        fuel_cost: costs.fuel,
        adblue_cost: costs.adBlue,
        driver_cost: costs.driverCost,
        structure_cost: costs.structureCost,
        vehicle_cost: vehicleCostForTrip,
        total_cost: totalCostWithVehicle,
        pricing_mode: trip.pricingMode as 'km' | 'fixed' | 'auto',
        price_per_km: trip.pricePerKm,
        fixed_price: trip.fixedPrice,
        target_margin: trip.targetMargin,
        revenue: revenueWithVehicle,
        profit: profitWithVehicle,
        profit_margin: profitMarginWithVehicle,
        vehicle_id: selectedVehicleId,
        vehicle_data: selectedVehicle,
        trailer_id: selectedTrailerId,
        trailer_data: selectedTrailer,
        driver_ids: selectedDriverIds,
        drivers_data: selectedDrivers,
      });
      
      if (success) {
        // Update local state with new values
        setLoadedTour(prev => prev ? {
          ...prev,
          distance_km: trip.distance,
          toll_cost: trip.tollCost,
          fuel_cost: costs.fuel,
          adblue_cost: costs.adBlue,
          driver_cost: costs.driverCost,
          structure_cost: costs.structureCost,
          vehicle_cost: vehicleCostForTrip,
          total_cost: totalCostWithVehicle,
          revenue: revenueWithVehicle,
          profit: profitWithVehicle,
          profit_margin: profitMarginWithVehicle,
        } : null);
        toast.success('Tournée mise à jour avec les nouveaux calculs');
      }
    } finally {
      setUpdating(false);
    }
  };
  
  // Get selected vehicle and trailer
  const selectedVehicle = useMemo(() => 
    vehicles.find(v => v.id === selectedVehicleId) || null,
  [vehicles, selectedVehicleId]);
  
  const selectedTrailer = useMemo(() => 
    trailers.find(t => t.id === selectedTrailerId) || null,
  [trailers, selectedTrailerId]);
  
  // Calculate vehicle costs when vehicle is selected
  const vehicleCostBreakdown = useMemo(() => {
    if (!selectedVehicle) return null;
    return calculateVehicleCosts(selectedVehicle, {
      fuelPriceHT: vehicle.fuelPriceHT,
      adBluePriceHT: vehicle.adBluePriceHT,
    });
  }, [selectedVehicle, vehicle.fuelPriceHT, vehicle.adBluePriceHT]);
  
  // Calculate trailer costs when trailer is selected
  const trailerCostBreakdown = useMemo(() => {
    if (!selectedTrailer) return null;
    return calculateTrailerCosts(selectedTrailer, {});
  }, [selectedTrailer]);
  
  const selectedDrivers = drivers.filter(d => selectedDriverIds.includes(d.id));
  const { hasFeature } = useLicense();
  
  // Use vehicle parameters from selected vehicle
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
  
  const costs = useCalculations(trip, effectiveVehicle, selectedDrivers, charges, settings);
  
  // Calculate total cost including vehicle and trailer costs (maintenance, tires, etc.)
  const vehicleCostForTrip = useMemo(() => {
    if (!vehicleCostBreakdown) return 0;
    return (vehicleCostBreakdown.maintenanceCostPerKm + vehicleCostBreakdown.tireCostPerKm + vehicleCostBreakdown.fixedCostPerKm) * trip.distance;
  }, [vehicleCostBreakdown, trip.distance]);
  
  const trailerCostForTrip = useMemo(() => {
    if (!trailerCostBreakdown) return 0;
    return trailerCostBreakdown.totalCostPerKm * trip.distance;
  }, [trailerCostBreakdown, trip.distance]);
  
  const totalCostWithVehicle = costs.totalCost + vehicleCostForTrip + trailerCostForTrip;
  const totalCostPerKmWithVehicle = trip.distance > 0 ? totalCostWithVehicle / trip.distance : 0;
  
  // Calculate suggested price including vehicle and trailer costs (for auto mode)
  const suggestedPriceWithVehicle = totalCostWithVehicle * (1 + trip.targetMargin / 100);
  
  // Revenue calculation - use suggested price with vehicle costs in auto mode
  const revenueWithVehicle = trip.pricingMode === 'auto' 
    ? suggestedPriceWithVehicle 
    : costs.revenue;
  
  // Profit and margin calculations with vehicle and trailer costs
  const profitWithVehicle = revenueWithVehicle - totalCostWithVehicle;
  const profitMarginWithVehicle = revenueWithVehicle > 0 ? (profitWithVehicle / revenueWithVehicle) * 100 : 0;
  
  const canUseAutoMode = hasFeature('auto_pricing');
  
  const formatCurrency = (value: number) => new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR'
  }).format(value);
  
  // Get current fuel type from selected vehicle
  const currentFuelType: FuelType = useMemo(() => {
    if (selectedVehicle) {
      return selectedVehicle.fuelType || 'diesel';
    }
    return 'diesel';
  }, [selectedVehicle]);

  // Fuel unit based on type
  const fuelUnit = currentFuelType === 'electric' ? '€/kWh' : currentFuelType === 'gnv' ? '€/kg' : '€/L';

  const handleVehicleSelect = (vehicleId: string) => {
    setSelectedVehicleId(vehicleId === 'none' ? null : vehicleId);
    
    if (vehicleId !== 'none') {
      const v = vehicles.find(veh => veh.id === vehicleId);
      if (v) {
        setVehicle(prev => ({
          ...prev,
          fuelConsumption: v.fuelConsumption,
          adBlueConsumption: v.adBlueConsumption,
        }));
      }
    }
  };

  // Fetch current fuel price based on vehicle type
  const handleFetchFuelPrice = async () => {
    const priceTTC = await fetchFuelPrice(currentFuelType);
    if (priceTTC) {
      // Set as TTC and let user toggle
      setVehicle(prev => ({ ...prev, fuelPriceHT: priceTTC, fuelPriceIsHT: false }));
    }
  };

  // Calculate displayed prices
  const displayedFuelPriceTTC = vehicle.fuelPriceIsHT 
    ? convertHTtoTTC(vehicle.fuelPriceHT, settings.tvaRate) 
    : vehicle.fuelPriceHT;
  
  const displayedFuelPriceHT = vehicle.fuelPriceIsHT 
    ? vehicle.fuelPriceHT 
    : convertTTCtoHT(vehicle.fuelPriceHT, settings.tvaRate);

  const displayedAdBluePriceTTC = vehicle.adBluePriceIsHT 
    ? convertHTtoTTC(vehicle.adBluePriceHT, settings.tvaRate) 
    : vehicle.adBluePriceHT;
  
  const displayedAdBluePriceHT = vehicle.adBluePriceIsHT 
    ? vehicle.adBluePriceHT 
    : convertTTCtoHT(vehicle.adBluePriceHT, settings.tvaRate);
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Calculateur de trajet</h1>
          <p className="text-muted-foreground mt-1">Calculez précisément le coût et la rentabilité de vos trajets</p>
        </div>
        <Button
          variant="outline"
          onClick={() => setLoadDialogOpen(true)}
          className="gap-2"
        >
          <Upload className="w-4 h-4" />
          Charger une tournée
        </Button>
      </div>

      {/* Loaded tour indicator with addresses and comparison */}
      {loadedTour && (
        <CalculatorLoadedTourCard
          loadedTour={loadedTour}
          handleUpdateTour={handleUpdateTour}
          updating={updating}
          handleClearTour={handleClearTour}
          formatCurrency={formatCurrency}
          costs={costs}
          vehicleCostForTrip={vehicleCostForTrip}
          totalCostWithVehicle={totalCostWithVehicle}
          revenueWithVehicle={revenueWithVehicle}
          profitWithVehicle={profitWithVehicle}
          profitMarginWithVehicle={profitMarginWithVehicle}
        />
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left Column - Inputs */}
        <div className="xl:col-span-2 space-y-4">
          <CalculatorVehicleTrailerSection
            selectedVehicleId={selectedVehicleId}
            handleVehicleSelect={handleVehicleSelect}
            selectedVehicle={selectedVehicle}
            vehicleCostBreakdown={vehicleCostBreakdown}
            selectedTrailerId={selectedTrailerId}
            setSelectedTrailerId={setSelectedTrailerId}
            selectedTrailer={selectedTrailer}
            trailerCostBreakdown={trailerCostBreakdown}
          />

          <CalculatorTripPricingSection
            showHTPrice={showHTPrice}
            setShowHTPrice={setShowHTPrice}
            currentFuelType={currentFuelType}
            fuelUnit={fuelUnit}
            displayedFuelPriceHT={displayedFuelPriceHT}
            displayedAdBluePriceHT={displayedAdBluePriceHT}
            handleFetchFuelPrice={handleFetchFuelPrice}
            formatCurrency={formatCurrency}
            canUseAutoMode={canUseAutoMode}
          />

          <CalculatorDriverSection
            formatCurrency={formatCurrency}
            costs={costs}
          />
        </div>

        {/* Right Column - Cost Summary */}
        <CalculatorResultsSummary
          costs={costs}
          selectedVehicle={selectedVehicle}
          vehicleCostBreakdown={vehicleCostBreakdown}
          selectedTrailer={selectedTrailer}
          trailerCostBreakdown={trailerCostBreakdown}
          trailerCostForTrip={trailerCostForTrip}
          totalCostWithVehicle={totalCostWithVehicle}
          totalCostPerKmWithVehicle={totalCostPerKmWithVehicle}
          suggestedPriceWithVehicle={suggestedPriceWithVehicle}
          revenueWithVehicle={revenueWithVehicle}
          profitWithVehicle={profitWithVehicle}
          profitMarginWithVehicle={profitMarginWithVehicle}
          formatCurrency={formatCurrency}
          setSaveDialogOpen={setSaveDialogOpen}
        />
      </div>

      {/* Save Tour Dialog */}
      <SaveTourDialog
        open={saveDialogOpen}
        onOpenChange={setSaveDialogOpen}
        tourData={{
          origin_address: 'Adresse de départ (calculateur)',
          destination_address: 'Adresse d\'arrivée (calculateur)',
          stops: [],
          distance_km: trip.distance,
          duration_minutes: 0,
          toll_cost: trip.tollCost,
          fuel_cost: costs.fuel,
          adblue_cost: costs.adBlue,
          driver_cost: costs.driverCost,
          structure_cost: costs.structureCost,
          vehicle_cost: vehicleCostForTrip + trailerCostForTrip,
          total_cost: totalCostWithVehicle,
          pricing_mode: trip.pricingMode as 'km' | 'fixed' | 'auto',
          price_per_km: trip.pricePerKm,
          fixed_price: trip.fixedPrice,
          target_margin: trip.targetMargin,
          revenue: revenueWithVehicle,
          profit: profitWithVehicle,
          profit_margin: profitMarginWithVehicle,
        }}
        clients={clients.map(c => ({ id: c.id, name: c.name, company: c.company }))}
        drivers={drivers}
        vehicles={vehicles}
        trailers={trailers}
        selectedDriverIds={selectedDriverIds}
        selectedVehicleId={selectedVehicleId || ''}
        selectedTrailerId={selectedTrailerId || ''}
        saving={saving}
        onSave={async (input) => {
          setSaving(true);
          try {
            const result = await saveTour(input);
            if (result) {
              toast.success('Tournée sauvegardée ! Retrouvez-la dans l\'onglet Tournées.');
            }
          } finally {
            setSaving(false);
          }
        }}
      />

      <LoadTourDialog
        open={loadDialogOpen}
        onOpenChange={setLoadDialogOpen}
        onSelect={handleLoadTour}
      />
    </div>
  );
}
