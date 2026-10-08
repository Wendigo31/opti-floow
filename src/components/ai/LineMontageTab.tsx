import { useState } from 'react';
import { useCloudVehicles } from '@/hooks/useCloudVehicles';
import { useCloudCharges } from '@/hooks/useCloudCharges';
import { useCloudDrivers } from '@/hooks/useCloudDrivers';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/hooks/use-toast';
import { LineMontageForm } from '@/components/ai/line-montage/LineMontageForm';
import { LineMontageResults } from '@/components/ai/line-montage/LineMontageResults';
import { computeDriverDailyCost } from '@/lib/driverDailyCost';
import type { Driver } from '@/types';
import type { Position, StopWaypoint, MontageScenario, MontageResponse } from '@/types/lineMontage';

export function LineMontageTab() {
  const { toast } = useToast();
  const { vehicle, charges: localCharges, settings } = useApp();
  const { vehicles } = useCloudVehicles();
  const { charges: cloudCharges } = useCloudCharges();
  const { cdiDrivers, cddDrivers, interimDrivers, jokerDrivers } = useCloudDrivers();

  // Merge all drivers
  const allDrivers: Driver[] = [...cdiDrivers, ...cddDrivers, ...interimDrivers, ...jokerDrivers];
  // Use cloud charges if available, otherwise local
  const effectiveCharges = cloudCharges.length > 0 ? cloudCharges : localCharges;

  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [stops, setStops] = useState<StopWaypoint[]>([]);

  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [selectedDriverIds, setSelectedDriverIds] = useState<string[]>([]);
  const [driverCount, setDriverCount] = useState(2);
  const [allowOvernight, setAllowOvernight] = useState(false);
  const [frequency, setFrequency] = useState<'single' | 'daily_round' | 'weekly'>('daily_round');
  const [routeType, setRouteType] = useState<'highway' | 'national' | 'mixed_70_30' | 'mixed_50_50' | 'mixed_30_70' | 'eco' | 'fastest' | 'shortest'>('highway');
  const [relayCount, setRelayCount] = useState(0);
  const [loadingTime, setLoadingTime] = useState('06:00');
  const [deliveryTime, setDeliveryTime] = useState('');
  const [budgetTarget, setBudgetTarget] = useState('');
  // Enriched route filters
  const [routePriority, setRoutePriority] = useState<'cost' | 'time' | 'distance' | 'comfort' | 'emissions'>('cost');
  const [maxTollBudget, setMaxTollBudget] = useState('');
  const [avoidUrbanZones, setAvoidUrbanZones] = useState(false);
  const [avoidLowEmissionZones, setAvoidLowEmissionZones] = useState(false);
  const [avoidFerries, setAvoidFerries] = useState(true);
  const [avoidBorderCrossings, setAvoidBorderCrossings] = useState(false);
  const [preferTruckRoutes, setPreferTruckRoutes] = useState(true);
  const [maxSpeedKmh, setMaxSpeedKmh] = useState(90);
  const [allowNightDriving, setAllowNightDriving] = useState(true);
  const [allowWeekendDriving, setAllowWeekendDriving] = useState(false);
  const [vehicleHeight, setVehicleHeight] = useState('4.0');
  const [vehicleWeight, setVehicleWeight] = useState('40');
  // Optional filter toggles
  const [enableTollBudget, setEnableTollBudget] = useState(false);
  const [enableVehicleHeight, setEnableVehicleHeight] = useState(false);
  const [enableVehicleWeight, setEnableVehicleWeight] = useState(false);

  // Input mode + cross round-trip
  const [inputMode, setInputMode] = useState<'form' | 'text'>('form');
  const [freeText, setFreeText] = useState('');
  const [crossRoundTrip, setCrossRoundTrip] = useState(false);
  const [returnOrigin, setReturnOrigin] = useState('');
  const [returnDestination, setReturnDestination] = useState('');
  const [returnClientName, setReturnClientName] = useState('');
  const [returnLoadingTime, setReturnLoadingTime] = useState('');
  const [returnDeliveryTime, setReturnDeliveryTime] = useState('');
  const [outboundClientName, setOutboundClientName] = useState('');

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MontageResponse | null>(null);
  const [expandedScenario, setExpandedScenario] = useState<number | null>(null);

  const selectedVehicle = vehicles.find(v => v.id === selectedVehicleId);
  const selectedDrivers = allDrivers.filter(d => selectedDriverIds.includes(d.id));

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value);

  const addStop = () => {
    setStops([...stops, { id: crypto.randomUUID(), address: '', position: null }]);
  };

  const removeStop = (id: string) => {
    setStops(stops.filter(s => s.id !== id));
  };

  const updateStop = (id: string, address: string, position: Position | null) => {
    setStops(stops.map(s => (s.id === id ? { ...s, address, position } : s)));
  };

  // Compute structure cost (daily) from charges
  const structureDailyCost = effectiveCharges.reduce((total, charge) => {
    const amount = charge.amount || 0;
    switch (charge.periodicity) {
      case 'yearly': return total + amount / (settings.workingDaysPerYear || 252);
      case 'monthly': return total + amount / (settings.workingDaysPerMonth || 21);
      case 'daily': return total + amount;
      default: return total;
    }
  }, 0);

  const handleGenerate = async () => {
    // Free-text mode: send raw text + minimal context
    if (inputMode === 'text') {
      if (!freeText.trim()) {
        toast({ title: 'Texte requis', description: 'Décrivez votre besoin de ligne en texte libre', variant: 'destructive' });
        return;
      }
      if (!selectedVehicle) {
        toast({ title: 'Véhicule requis', description: 'Sélectionnez un véhicule', variant: 'destructive' });
        return;
      }
    } else {
      if (!origin || !destination) {
        toast({ title: 'Champs requis', description: "Renseignez l'origine et la destination", variant: 'destructive' });
        return;
      }
      if (!selectedVehicle) {
        toast({ title: 'Véhicule requis', description: 'Sélectionnez un véhicule', variant: 'destructive' });
        return;
      }
      if (crossRoundTrip && (!returnOrigin || !returnDestination)) {
        toast({ title: 'Retour requis', description: "Renseignez l'origine et la destination du retour", variant: 'destructive' });
        return;
      }
    }

    // Build real driver cost data
    const driversForAI = selectedDrivers.length > 0
      ? selectedDrivers.map(d => {
          const costs = computeDriverDailyCost(d);
          return {
            name: d.name || `${d.firstName || ''} ${d.lastName || ''}`.trim(),
            hourlyCost: d.hourlyRate || (costs.dailyCost / (d.hoursPerDay || 8)),
            dailyCost: costs.dailyCost,
            dailyBonuses: costs.dailyBonuses,
            dailyAllowances: costs.dailyAllowances,
            contractType: costs.contractLabel,
            nightBonus: d.nightBonus || 0,
            sundayBonus: d.sundayBonus || 0,
            mealAllowance: d.mealAllowance || 0,
            overnightAllowance: d.overnightAllowance || 0,
            hoursPerDay: d.hoursPerDay || 8,
          };
        })
      : Array.from({ length: driverCount }, (_, i) => ({
          name: `Conducteur ${i + 1}`,
          hourlyCost: 15,
          dailyCost: 120,
          dailyBonuses: 0,
          dailyAllowances: 15,
          contractType: 'CDI',
          nightBonus: 0,
          sundayBonus: 0,
          mealAllowance: 15,
          overnightAllowance: 0,
          hoursPerDay: 8,
        }));

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-optimize-trip`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          origin: inputMode === 'text' ? undefined : origin,
          destination: inputMode === 'text' ? undefined : destination,
          stops: inputMode === 'text' ? [] : stops.map(s => s.address).filter(Boolean),
          mode: 'line_montage',
          inputMode,
          freeTextRequest: inputMode === 'text' ? freeText : undefined,
          outboundClient: outboundClientName || undefined,
          returnLeg: crossRoundTrip && inputMode === 'form' ? {
            origin: returnOrigin,
            destination: returnDestination,
            clientName: returnClientName || undefined,
            loadingTime: returnLoadingTime || undefined,
            deliveryTime: returnDeliveryTime || undefined,
          } : undefined,
          vehicleType: selectedVehicle.type,
          fuelConsumption: selectedVehicle.fuelConsumption,
          fuelPrice: vehicle.fuelPriceHT,
          tollClass: 2,
          drivers: driversForAI,
          constraints: {
            respectRSE: true,
            includeRestBreaks: true,
            includeMealBreaks: true,
            requireOvernightRest: allowOvernight,
          },
          montageOptions: {
            driverCount: selectedDrivers.length > 0 ? selectedDrivers.length : driverCount,
            allowOvernight,
            frequency,
            routeType,
            relayCount,
            loadingTime: loadingTime || undefined,
            deliveryTime: deliveryTime || undefined,
            budgetTarget: budgetTarget ? parseFloat(budgetTarget) : undefined,
            routePriority,
            maxTollBudget: enableTollBudget && maxTollBudget ? parseFloat(maxTollBudget) : undefined,
            avoidUrbanZones,
            avoidLowEmissionZones,
            avoidFerries,
            avoidBorderCrossings,
            preferTruckRoutes,
            maxSpeedKmh,
            allowNightDriving,
            allowWeekendDriving,
            vehicleHeight: enableVehicleHeight ? parseFloat(vehicleHeight) || undefined : undefined,
            vehicleWeight: enableVehicleWeight ? parseFloat(vehicleWeight) || undefined : undefined,
          },
          vehicleCosts: {
            dailyCost: (selectedVehicle as any).dailyCost || 150,
            kmCost: (selectedVehicle as any).kmCost || 0.25,
          },
          structureCosts: {
            dailyCost: structureDailyCost,
          },
          chargesDetail: effectiveCharges.map(c => ({
            name: c.name,
            amount: c.amount,
            periodicity: c.periodicity,
            category: c.category,
          })),
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          toast({ title: 'Limite atteinte', description: 'Trop de requêtes, réessayez plus tard', variant: 'destructive' });
          return;
        }
        if (response.status === 402) {
          toast({ title: 'Crédits insuffisants', description: 'Rechargez vos crédits IA', variant: 'destructive' });
          return;
        }
        const err = await response.json();
        throw new Error(err.error || 'Erreur');
      }

      const data = await response.json();
      setResult(data);
      if (data.scenarios?.length) {
        const recIdx = data.scenarios.findIndex((s: MontageScenario) => s.isRecommended);
        setExpandedScenario(recIdx >= 0 ? recIdx : 0);
      }
    } catch (error) {
      console.error('Montage error:', error);
      toast({
        title: 'Erreur',
        description: error instanceof Error ? error.message : "Impossible de générer le montage",
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <LineMontageForm
        origin={origin}
        setOrigin={setOrigin}
        destination={destination}
        setDestination={setDestination}
        stops={stops}
        addStop={addStop}
        removeStop={removeStop}
        updateStop={updateStop}
        selectedVehicleId={selectedVehicleId}
        setSelectedVehicleId={setSelectedVehicleId}
        selectedDriverIds={selectedDriverIds}
        setSelectedDriverIds={setSelectedDriverIds}
        driverCount={driverCount}
        setDriverCount={setDriverCount}
        allowOvernight={allowOvernight}
        setAllowOvernight={setAllowOvernight}
        frequency={frequency}
        setFrequency={setFrequency}
        routeType={routeType}
        setRouteType={setRouteType}
        relayCount={relayCount}
        setRelayCount={setRelayCount}
        loadingTime={loadingTime}
        setLoadingTime={setLoadingTime}
        deliveryTime={deliveryTime}
        setDeliveryTime={setDeliveryTime}
        budgetTarget={budgetTarget}
        setBudgetTarget={setBudgetTarget}
        routePriority={routePriority}
        setRoutePriority={setRoutePriority}
        maxTollBudget={maxTollBudget}
        setMaxTollBudget={setMaxTollBudget}
        avoidUrbanZones={avoidUrbanZones}
        setAvoidUrbanZones={setAvoidUrbanZones}
        avoidLowEmissionZones={avoidLowEmissionZones}
        setAvoidLowEmissionZones={setAvoidLowEmissionZones}
        avoidFerries={avoidFerries}
        setAvoidFerries={setAvoidFerries}
        avoidBorderCrossings={avoidBorderCrossings}
        setAvoidBorderCrossings={setAvoidBorderCrossings}
        preferTruckRoutes={preferTruckRoutes}
        setPreferTruckRoutes={setPreferTruckRoutes}
        maxSpeedKmh={maxSpeedKmh}
        setMaxSpeedKmh={setMaxSpeedKmh}
        allowNightDriving={allowNightDriving}
        setAllowNightDriving={setAllowNightDriving}
        allowWeekendDriving={allowWeekendDriving}
        setAllowWeekendDriving={setAllowWeekendDriving}
        vehicleHeight={vehicleHeight}
        setVehicleHeight={setVehicleHeight}
        vehicleWeight={vehicleWeight}
        setVehicleWeight={setVehicleWeight}
        enableTollBudget={enableTollBudget}
        setEnableTollBudget={setEnableTollBudget}
        enableVehicleHeight={enableVehicleHeight}
        setEnableVehicleHeight={setEnableVehicleHeight}
        enableVehicleWeight={enableVehicleWeight}
        setEnableVehicleWeight={setEnableVehicleWeight}
        inputMode={inputMode}
        setInputMode={setInputMode}
        freeText={freeText}
        setFreeText={setFreeText}
        crossRoundTrip={crossRoundTrip}
        setCrossRoundTrip={setCrossRoundTrip}
        returnOrigin={returnOrigin}
        setReturnOrigin={setReturnOrigin}
        returnDestination={returnDestination}
        setReturnDestination={setReturnDestination}
        returnClientName={returnClientName}
        setReturnClientName={setReturnClientName}
        returnLoadingTime={returnLoadingTime}
        setReturnLoadingTime={setReturnLoadingTime}
        returnDeliveryTime={returnDeliveryTime}
        setReturnDeliveryTime={setReturnDeliveryTime}
        outboundClientName={outboundClientName}
        setOutboundClientName={setOutboundClientName}
        loading={loading}
        handleGenerate={handleGenerate}
        formatCurrency={formatCurrency}
      />

      <LineMontageResults
        loading={loading}
        result={result}
        expandedScenario={expandedScenario}
        setExpandedScenario={setExpandedScenario}
        formatCurrency={formatCurrency}
      />
    </div>
  );
}
