import { useState, useMemo, useEffect } from 'react';
import { Fuel, Route, Receipt, Truck, Users, Euro, Percent, Check, CalendarDays, AlertTriangle, Calculator as CalculatorIcon, Save, Folder, Container, Upload, TrendingUp, TrendingDown, RefreshCw, Loader2, Eye, EyeOff, Zap, Lock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useApp } from '@/context/AppContext';
import { useCalculations } from '@/hooks/useCalculations';
import { useRolePermissions } from '@/hooks/useRolePermissions';
import { useExploitationMetrics } from '@/hooks/useExploitationMetrics';
import { useMarginAlerts } from '@/hooks/useMarginAlerts';
import { cn } from '@/lib/utils';
import { useLicense } from '@/hooks/useLicense';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useSavedTours } from '@/hooks/useSavedTours';
import { useFuelPrice, FuelType, convertTTCtoHT, convertHTtoTTC } from '@/hooks/useFuelPrice';
import type { Vehicle } from '@/types/vehicle';
import type { Trailer } from '@/types/trailer';
import type { LocalClient } from '@/types/local';
import { calculateVehicleCosts, calculateTrailerCosts, formatCostPerKm } from '@/hooks/useVehicleCost';
import { Link } from 'react-router-dom';
import { SaveTourDialog } from '@/components/tours/SaveTourDialog';
import { ToursList } from '@/components/tours/ToursList';
import { LoadTourDialog } from '@/components/ai/LoadTourDialog';
import { MarginAlertIndicator } from '@/components/alerts/MarginAlertIndicator';
import { toast } from 'sonner';
import type { SavedTour } from '@/types/savedTour';

export default function Calculator() {
  const {
    trip,
    setTrip,
    vehicle,
    setVehicle,
    drivers,
    selectedDriverIds,
    setSelectedDriverIds,
    charges,
    settings,
    setSettings,
  } = useApp();
  
  // Role-based permissions
  const { canViewCostBreakdown, canViewFinancialData, canViewPricing, role } = useRolePermissions();
  
  // Exploitation-specific metric visibility
  const { canExploitationView, isDirection } = useExploitationMetrics();
  
  // Margin alerts
  const { settings: marginSettings, checkMargin } = useMarginAlerts();
  
  const [vehicles] = useLocalStorage<Vehicle[]>('optiflow_vehicles', []);
  const [trailers] = useLocalStorage<Trailer[]>('optiflow_trailers', []);
  const [clients] = useLocalStorage<LocalClient[]>('optiflow_clients', []);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [selectedTrailerId, setSelectedTrailerId] = useState<string | null>(null);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [loadDialogOpen, setLoadDialogOpen] = useState(false);
  const [loadedTour, setLoadedTour] = useState<SavedTour | null>(null);
  const [saving, setSaving] = useState(false);
  const [showHTPrice, setShowHTPrice] = useState(false);
  
  const { saveTour, updateTour } = useSavedTours();
  const { 
    fetchFuelPrice, 
    fetchAdBluePrice, 
    loading: fuelLoading, 
    fuelTypeLabels,
    referencePrices 
  } = useFuelPrice();
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
  
  const toggleDriver = (driverId: string) => {
    if (selectedDriverIds.includes(driverId)) {
      setSelectedDriverIds(selectedDriverIds.filter(id => id !== driverId));
    } else {
      setSelectedDriverIds([...selectedDriverIds, driverId]);
    }
  };

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
        <div className="glass-card p-4 space-y-4">
          {/* Header with global indicator */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <Folder className="w-5 h-5 text-primary" />
              <span className="font-medium">{loadedTour.name}</span>
            </div>
            
            {/* Global improvement/degradation indicator */}
            {(() => {
              const profitDiff = profitWithVehicle - loadedTour.profit;
              const isImproved = profitDiff > 0;
              const isUnchanged = Math.abs(profitDiff) < 0.01;
              
              if (isUnchanged) {
                return (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted text-muted-foreground text-sm">
                    <Check className="w-4 h-4" />
                    <span>Aucun changement</span>
                  </div>
                );
              }
              
              return (
                <div className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium",
                  isImproved ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive"
                )}>
                  {isImproved ? (
                    <TrendingUp className="w-4 h-4" />
                  ) : (
                    <TrendingDown className="w-4 h-4" />
                  )}
                  <span>
                    {isImproved ? '+' : ''}{formatCurrency(profitDiff)} de bénéfice
                  </span>
                </div>
              );
            })()}
            
            <div className="flex items-center gap-2">
              <Button
                variant="default"
                size="sm"
                onClick={handleUpdateTour}
                disabled={updating}
                className="h-7 text-xs gap-1"
              >
                {updating ? (
                  <RefreshCw className="w-3 h-3 animate-spin" />
                ) : (
                  <Save className="w-3 h-3" />
                )}
                Mettre à jour la tournée
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearTour}
                className="h-7 text-xs"
              >
                Effacer
              </Button>
            </div>
          </div>
          
          {/* Addresses */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div className="flex items-start gap-2 p-2 bg-secondary/50 rounded-lg">
              <div className="w-6 h-6 rounded-full bg-success/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-success">A</span>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Départ</p>
                <p className="font-medium text-foreground">{loadedTour.origin_address}</p>
              </div>
            </div>
            <div className="flex items-start gap-2 p-2 bg-secondary/50 rounded-lg">
              <div className="w-6 h-6 rounded-full bg-destructive/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-destructive">B</span>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Arrivée</p>
                <p className="font-medium text-foreground">{loadedTour.destination_address}</p>
              </div>
            </div>
          </div>
          
          {/* Stops if any */}
          {loadedTour.stops.length > 0 && (
            <div className="text-sm">
              <p className="text-xs text-muted-foreground mb-1">Étapes intermédiaires</p>
              <div className="flex flex-wrap gap-1">
                {loadedTour.stops.map((stop, idx) => (
                  <span key={idx} className="px-2 py-1 bg-secondary rounded text-xs">
                    {stop.address.split(',')[0]}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {/* Comparison table */}
          <div className="border-t pt-4">
            <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
              <CalculatorIcon className="w-4 h-4" />
              Comparaison: Ancien vs Nouveau calcul
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 font-medium">Élément</th>
                    <th className="text-right py-2 font-medium text-muted-foreground">Ancien</th>
                    <th className="text-right py-2 font-medium text-primary">Nouveau</th>
                    <th className="text-right py-2 font-medium">Écart</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  <tr>
                    <td className="py-2">Coût carburant</td>
                    <td className="text-right text-muted-foreground">{formatCurrency(loadedTour.fuel_cost)}</td>
                    <td className="text-right font-medium">{formatCurrency(costs.fuel)}</td>
                    <td className={cn("text-right", costs.fuel - loadedTour.fuel_cost > 0 ? "text-destructive" : "text-success")}>
                      {costs.fuel - loadedTour.fuel_cost >= 0 ? '+' : ''}{formatCurrency(costs.fuel - loadedTour.fuel_cost)}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2">Coût AdBlue</td>
                    <td className="text-right text-muted-foreground">{formatCurrency(loadedTour.adblue_cost)}</td>
                    <td className="text-right font-medium">{formatCurrency(costs.adBlue)}</td>
                    <td className={cn("text-right", costs.adBlue - loadedTour.adblue_cost > 0 ? "text-destructive" : "text-success")}>
                      {costs.adBlue - loadedTour.adblue_cost >= 0 ? '+' : ''}{formatCurrency(costs.adBlue - loadedTour.adblue_cost)}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2">Péages</td>
                    <td className="text-right text-muted-foreground">{formatCurrency(loadedTour.toll_cost)}</td>
                    <td className="text-right font-medium">{formatCurrency(costs.tolls)}</td>
                    <td className={cn("text-right", costs.tolls - loadedTour.toll_cost > 0 ? "text-destructive" : "text-success")}>
                      {costs.tolls - loadedTour.toll_cost >= 0 ? '+' : ''}{formatCurrency(costs.tolls - loadedTour.toll_cost)}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2">Coût chauffeur</td>
                    <td className="text-right text-muted-foreground">{formatCurrency(loadedTour.driver_cost)}</td>
                    <td className="text-right font-medium">{formatCurrency(costs.driverCost)}</td>
                    <td className={cn("text-right", costs.driverCost - loadedTour.driver_cost > 0 ? "text-destructive" : "text-success")}>
                      {costs.driverCost - loadedTour.driver_cost >= 0 ? '+' : ''}{formatCurrency(costs.driverCost - loadedTour.driver_cost)}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2">Charges structure</td>
                    <td className="text-right text-muted-foreground">{formatCurrency(loadedTour.structure_cost)}</td>
                    <td className="text-right font-medium">{formatCurrency(costs.structureCost)}</td>
                    <td className={cn("text-right", costs.structureCost - loadedTour.structure_cost > 0 ? "text-destructive" : "text-success")}>
                      {costs.structureCost - loadedTour.structure_cost >= 0 ? '+' : ''}{formatCurrency(costs.structureCost - loadedTour.structure_cost)}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2">Coût véhicule</td>
                    <td className="text-right text-muted-foreground">{formatCurrency(loadedTour.vehicle_cost)}</td>
                    <td className="text-right font-medium">{formatCurrency(vehicleCostForTrip)}</td>
                    <td className={cn("text-right", vehicleCostForTrip - loadedTour.vehicle_cost > 0 ? "text-destructive" : "text-success")}>
                      {vehicleCostForTrip - loadedTour.vehicle_cost >= 0 ? '+' : ''}{formatCurrency(vehicleCostForTrip - loadedTour.vehicle_cost)}
                    </td>
                  </tr>
                  <tr className="font-bold border-t-2">
                    <td className="py-2">Coût total</td>
                    <td className="text-right text-muted-foreground">{formatCurrency(loadedTour.total_cost)}</td>
                    <td className="text-right text-primary">{formatCurrency(totalCostWithVehicle)}</td>
                    <td className={cn("text-right", totalCostWithVehicle - loadedTour.total_cost > 0 ? "text-destructive" : "text-success")}>
                      {totalCostWithVehicle - loadedTour.total_cost >= 0 ? '+' : ''}{formatCurrency(totalCostWithVehicle - loadedTour.total_cost)}
                    </td>
                  </tr>
                  <tr className="font-bold">
                    <td className="py-2">Chiffre d'affaires</td>
                    <td className="text-right text-muted-foreground">{formatCurrency(loadedTour.revenue)}</td>
                    <td className="text-right text-primary">{formatCurrency(revenueWithVehicle)}</td>
                    <td className={cn("text-right", revenueWithVehicle - loadedTour.revenue > 0 ? "text-success" : "text-destructive")}>
                      {revenueWithVehicle - loadedTour.revenue >= 0 ? '+' : ''}{formatCurrency(revenueWithVehicle - loadedTour.revenue)}
                    </td>
                  </tr>
                  <tr className="font-bold">
                    <td className="py-2">Bénéfice</td>
                    <td className="text-right text-muted-foreground">{formatCurrency(loadedTour.profit)}</td>
                    <td className="text-right text-primary">{formatCurrency(profitWithVehicle)}</td>
                    <td className={cn("text-right", profitWithVehicle - loadedTour.profit > 0 ? "text-success" : "text-destructive")}>
                      {profitWithVehicle - loadedTour.profit >= 0 ? '+' : ''}{formatCurrency(profitWithVehicle - loadedTour.profit)}
                    </td>
                  </tr>
                  <tr className="font-bold">
                    <td className="py-2">Marge</td>
                    <td className="text-right text-muted-foreground">{loadedTour.profit_margin.toFixed(1)}%</td>
                    <td className="text-right text-primary">{profitMarginWithVehicle.toFixed(1)}%</td>
                    <td className={cn("text-right", profitMarginWithVehicle - loadedTour.profit_margin > 0 ? "text-success" : "text-destructive")}>
                      {profitMarginWithVehicle - loadedTour.profit_margin >= 0 ? '+' : ''}{(profitMarginWithVehicle - loadedTour.profit_margin).toFixed(1)}%
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left Column - Inputs */}
        <div className="xl:col-span-2 space-y-4">
          
          {/* Vehicle Selection - REQUIRED */}
          <div className="glass-card p-5 opacity-0 animate-slide-up" style={{ animationDelay: '50ms', animationFillMode: 'forwards' }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                <Truck className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">Véhicule</h2>
                <p className="text-xs text-muted-foreground">Sélectionnez le véhicule pour ce calcul</p>
              </div>
            </div>
            
            {vehicles.length === 0 ? (
              <div className="p-4 bg-warning/10 border border-warning/30 rounded-lg">
                <div className="flex items-center gap-2 text-warning mb-2">
                  <AlertTriangle className="w-5 h-5" />
                  <span className="font-medium">Aucun véhicule configuré</span>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Vous devez créer au moins un véhicule pour utiliser le calculateur avec tous les coûts.
                </p>
                <Link 
                  to="/vehicles" 
                  className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  <Truck className="w-4 h-4" />
                  Ajouter un véhicule
                </Link>
              </div>
            ) : (
              <Select
                value={selectedVehicleId || "none"}
                onValueChange={handleVehicleSelect}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Sélectionnez un véhicule..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">-- Sélectionnez un véhicule --</SelectItem>
                  {vehicles.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.name} ({v.licensePlate}) - {v.fuelConsumption}L/100km
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            
            {/* Show vehicle cost breakdown if selected */}
            {selectedVehicle && vehicleCostBreakdown && (
              <div className="mt-4 p-3 bg-secondary/50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">{selectedVehicle.name}</span>
                  <span className="text-sm font-bold text-primary">
                    {formatCostPerKm(vehicleCostBreakdown.totalCostPerKm)}
                  </span>
                </div>
                <div className="grid grid-cols-5 gap-1 text-xs">
                  <div className="text-center">
                    <p className="text-muted-foreground">Carburant</p>
                    <p>{formatCostPerKm(vehicleCostBreakdown.fuelCostPerKm)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-muted-foreground">AdBlue</p>
                    <p>{formatCostPerKm(vehicleCostBreakdown.adBlueCostPerKm)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-muted-foreground">Entretien</p>
                    <p>{formatCostPerKm(vehicleCostBreakdown.maintenanceCostPerKm)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-muted-foreground">Pneus</p>
                    <p>{formatCostPerKm(vehicleCostBreakdown.tireCostPerKm)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-muted-foreground">Fixes</p>
                    <p>{formatCostPerKm(vehicleCostBreakdown.fixedCostPerKm)}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Trailer Selection */}
          {selectedVehicle && selectedVehicle.type === 'tracteur' && (
            <div className="glass-card p-5 opacity-0 animate-slide-up" style={{ animationDelay: '75ms', animationFillMode: 'forwards' }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                  <Container className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Semi-remorque</h2>
                  <p className="text-xs text-muted-foreground">Sélectionnez la remorque associée</p>
                </div>
              </div>
              
              {trailers.length === 0 ? (
                <div className="p-4 bg-muted/50 border border-border rounded-lg">
                  <p className="text-sm text-muted-foreground mb-2">Aucune semi-remorque configurée</p>
                  <Link 
                    to="/vehicles" 
                    className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    <Container className="w-4 h-4" />
                    Ajouter une remorque
                  </Link>
                </div>
              ) : (
                <Select
                  value={selectedTrailerId || "none"}
                  onValueChange={(id) => setSelectedTrailerId(id === 'none' ? null : id)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Sélectionnez une remorque..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">-- Sans remorque --</SelectItem>
                    {trailers.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name} ({t.licensePlate}) - {t.type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              
              {/* Show trailer cost breakdown if selected */}
              {selectedTrailer && trailerCostBreakdown && (
                <div className="mt-4 p-3 bg-purple-500/10 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">{selectedTrailer.name}</span>
                    <span className="text-sm font-bold text-purple-400">
                      {formatCostPerKm(trailerCostBreakdown.totalCostPerKm)}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-1 text-xs">
                    <div className="text-center">
                      <p className="text-muted-foreground">Entretien</p>
                      <p>{formatCostPerKm(trailerCostBreakdown.maintenanceCostPerKm)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-muted-foreground">Pneus</p>
                      <p>{formatCostPerKm(trailerCostBreakdown.tireCostPerKm)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-muted-foreground">Fixes</p>
                      <p>{formatCostPerKm(trailerCostBreakdown.fixedCostPerKm)}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Trip & Pricing - Combined */}
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

          {/* Driver Selection */}
          <div className="glass-card p-5 opacity-0 animate-slide-up" style={{ animationDelay: '150ms', animationFillMode: 'forwards' }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <Users className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">Conducteurs</h2>
                <p className="text-xs text-muted-foreground">{selectedDriverIds.length} sélectionné(s)</p>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {drivers.map(driver => {
                const isSelected = selectedDriverIds.includes(driver.id);
                return (
                  <button 
                    key={driver.id} 
                    onClick={() => toggleDriver(driver.id)} 
                    className={cn(
                      "p-3 rounded-lg border transition-all text-left relative",
                      isSelected 
                        ? "border-primary bg-primary/10" 
                        : "border-border/50 bg-muted/30 hover:bg-muted/50"
                    )}
                  >
                    {isSelected && (
                      <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                        <Check className="w-3 h-3 text-primary-foreground" />
                      </div>
                    )}
                    <p className="font-medium text-sm text-foreground">{driver.name}</p>
                    <p className="text-xs text-muted-foreground">{formatCurrency(driver.baseSalary)}/mois</p>
                  </button>
                );
              })}
              {drivers.length === 0 && (
                <p className="text-muted-foreground col-span-full text-center py-3 text-sm">
                  Aucun conducteur configuré.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Cost Summary */}
        <div>
          <div className="glass-card p-5 sticky top-6 opacity-0 animate-slide-up" style={{ animationDelay: '200ms', animationFillMode: 'forwards' }}>
            <div className="flex items-center gap-2 mb-4">
              <CalculatorIcon className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">Récapitulatif</h2>
            </div>
            
            {!selectedVehicle && (
              <div className="mb-4 p-3 bg-warning/10 border border-warning/30 rounded-lg text-center">
                <AlertTriangle className="w-5 h-5 text-warning mx-auto mb-1" />
                <p className="text-xs text-warning">Sélectionnez un véhicule pour un calcul complet</p>
              </div>
            )}
            
            {/* Cost Breakdown - Visible based on exploitation settings */}
            {(canViewCostBreakdown || canExploitationView('can_view_total_cost')) ? (
              <div className="space-y-2 text-sm">
                {(isDirection || canExploitationView('can_view_fuel_cost')) && (
                  <>
                    <div className="flex justify-between py-1 border-b border-border/30">
                      <span className="text-muted-foreground">Gazole</span>
                      <span className="font-medium">{formatCurrency(costs.fuel)}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border/30">
                      <span className="text-muted-foreground">AdBlue</span>
                      <span className="font-medium">{formatCurrency(costs.adBlue)}</span>
                    </div>
                  </>
                )}
                {(isDirection || canExploitationView('can_view_toll_cost')) && (
                  <div className="flex justify-between py-1 border-b border-border/30">
                    <span className="text-muted-foreground">Péages</span>
                    <span className="font-medium">{formatCurrency(costs.tolls)}</span>
                  </div>
                )}
                {(isDirection || canExploitationView('can_view_driver_cost')) && (
                  <div className="flex justify-between py-1 border-b border-border/30">
                    <span className="text-muted-foreground">Conducteur(s)</span>
                    <span className="font-medium">{formatCurrency(costs.driverCost)}</span>
                  </div>
                )}
                {(isDirection || canExploitationView('can_view_structure_cost')) && (
                  <div className="flex justify-between py-1 border-b border-border/30">
                    <span className="text-muted-foreground">Structure</span>
                    <span className="font-medium">{formatCurrency(costs.structureCost)}</span>
                  </div>
                )}
                
                {selectedVehicle && vehicleCostBreakdown && (isDirection || canExploitationView('can_view_fuel_cost')) && (
                  <>
                    <div className="flex justify-between py-1 border-b border-border/30">
                      <span className="text-muted-foreground">Entretien véhicule</span>
                      <span className="font-medium">{formatCurrency(vehicleCostBreakdown.maintenanceCostPerKm * trip.distance)}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border/30">
                      <span className="text-muted-foreground">Pneus</span>
                      <span className="font-medium">{formatCurrency(vehicleCostBreakdown.tireCostPerKm * trip.distance)}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border/30">
                      <span className="text-muted-foreground">Charges véhicule</span>
                      <span className="font-medium">{formatCurrency(vehicleCostBreakdown.fixedCostPerKm * trip.distance)}</span>
                    </div>
                  </>
                )}
                
                {selectedTrailer && trailerCostBreakdown && (isDirection || canExploitationView('can_view_fuel_cost')) && (
                  <div className="flex justify-between py-1 border-b border-border/30">
                    <span className="text-muted-foreground">Semi-remorque</span>
                    <span className="font-medium">{formatCurrency(trailerCostForTrip)}</span>
                  </div>
                )}
                
                {(isDirection || canExploitationView('can_view_total_cost')) && (
                  <div className="flex justify-between py-2 bg-primary/10 rounded-lg px-3 mt-2">
                    <span className="font-semibold text-foreground">Coût Total</span>
                    <span className="font-bold text-primary">{formatCurrency(totalCostWithVehicle)}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 bg-muted/30 rounded-lg text-center">
                <Lock className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Détail des coûts réservé à la Direction</p>
                <p className="text-xs text-muted-foreground mt-1">Les calculs utilisent les données de structure</p>
              </div>
            )}

            {/* Suggested Price - Visible to ALL roles */}
            {canViewPricing && (
              <div className="mt-4 p-4 bg-primary/10 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-foreground">Prix suggéré</span>
                  <span className="text-xl font-bold text-primary">{formatCurrency(suggestedPriceWithVehicle)}</span>
                </div>
                {trip.distance > 0 && (
                  <p className="text-xs text-muted-foreground mt-1 text-right">
                    {(suggestedPriceWithVehicle / trip.distance).toFixed(3)} €/km
                  </p>
                )}
              </div>
            )}

            {/* Detailed Metrics - Visible based on exploitation settings */}
            {(canViewFinancialData || canExploitationView('can_view_revenue')) ? (
              <div className="mt-4 pt-3 border-t border-border space-y-2 text-sm">
                {(isDirection || canExploitationView('can_view_price_per_km')) && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Coût/km</span>
                    <span className="font-medium">{totalCostPerKmWithVehicle.toFixed(3)} €</span>
                  </div>
                )}
                {(isDirection || canExploitationView('can_view_revenue')) && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Chiffre d'affaires</span>
                    <span className="font-medium text-success">{formatCurrency(revenueWithVehicle)}</span>
                  </div>
                )}
                {(isDirection || canExploitationView('can_view_profit')) && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Bénéfice</span>
                    <span className={cn("font-bold", profitWithVehicle >= 0 ? "text-success" : "text-destructive")}>
                      {formatCurrency(profitWithVehicle)}
                    </span>
                  </div>
                )}
              </div>
            ) : !canViewPricing ? (
              <div className="mt-4 pt-3 border-t border-border">
                <div className="p-3 bg-muted/30 rounded-lg text-center">
                  <EyeOff className="w-5 h-5 text-muted-foreground mx-auto mb-1" />
                  <p className="text-xs text-muted-foreground">Données financières réservées</p>
                </div>
              </div>
            ) : null}
            
            {/* Margin indicator - Visible based on exploitation settings */}
            {(isDirection || canExploitationView('can_view_margin')) && (
              <div className={cn(
                "mt-4 p-3 rounded-lg text-center",
                profitMarginWithVehicle >= 15 ? "bg-success/20" :
                profitMarginWithVehicle >= 0 ? "bg-warning/20" :
                "bg-destructive/20"
              )}>
                <p className="text-xs text-muted-foreground mb-1">Marge réelle</p>
                <p className={cn(
                  "text-2xl font-bold",
                  profitMarginWithVehicle >= 15 ? "text-success" :
                  profitMarginWithVehicle >= 0 ? "text-warning" :
                  "text-destructive"
                )}>
                  {profitMarginWithVehicle.toFixed(1)}%
                </p>
              </div>
            )}
            
            {/* Margin Alert - Show when margin is below threshold */}
            {marginSettings.showInCalculator && trip.distance > 0 && (
              <div className="mt-4">
                <MarginAlertIndicator
                  currentMargin={profitMarginWithVehicle}
                  profit={profitWithVehicle}
                  revenue={revenueWithVehicle}
                  showSettings={isDirection}
                  compact={false}
                />
              </div>
            )}

            {/* Save button */}
            {trip.distance > 0 && (
              <Button 
                className="w-full mt-4" 
                variant="gradient"
                onClick={() => setSaveDialogOpen(true)}
              >
                <Save className="w-4 h-4 mr-2" />
                Sauvegarder cette tournée
              </Button>
            )}
          </div>
        </div>
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
          revenue: costs.revenue,
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
