import { useState } from 'react';
import { 
  Sparkles, 
  Truck, 
  MapPin, 
  Loader2, 
  AlertTriangle,
  CheckCircle2,
  Lightbulb,
  ChevronDown,
  ChevronUp,
  Upload,
  Folder,
  RotateCcw,
  Save,
  Target
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
import { LoadTourDialog } from '@/components/ai/LoadTourDialog';
import { useSavedTours } from '@/hooks/useSavedTours';
import { useLicense } from '@/hooks/useLicense';
import { validateAIRequest } from '@/utils/aiValidation';
import type { Vehicle } from '@/types/vehicle';
import type { SavedTour } from '@/types/savedTour';

interface AIResponse {
  recommendation: {
    summary: string;
    strategy?: string;
    estimatedCost: number;
    estimatedDuration: number;
    estimatedDistance: number;
    savings: number;
    savingsPercent: number;
  };
  costBreakdown?: {
    fuel: number;
    tolls: number;
    drivers: number;
    meals: number;
    overnight: number;
    total: number;
  };
  optimizations?: { type: string; description: string; savings: number }[];
  warnings?: string[];
  tips?: string[];
}

export default function AIAnalysisPanel() {
  const { toast } = useToast();
  const { vehicle, drivers } = useApp();
  const { planType } = useLicense();
  const [vehicles] = useLocalStorage<Vehicle[]>('optiflow_vehicles', []);
  const { saveTour } = useSavedTours();
  
  const [loadTourOpen, setLoadTourOpen] = useState(false);
  const [loadedTour, setLoadedTour] = useState<SavedTour | null>(null);
  
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  const [selectedDriverIds, setSelectedDriverIds] = useState<string[]>([]);
  
  const [preferNight, setPreferNight] = useState(false);
  const [avoidWeekends, setAvoidWeekends] = useState(true);
  const [maxDrivingHours, setMaxDrivingHours] = useState(9);
  const [allowRelay, setAllowRelay] = useState(true);
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<AIResponse | null>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>('recommendation');

  const selectedVehicle = vehicles.find(v => v.id === selectedVehicleId);
  const selectedDriversData = drivers.filter(d => selectedDriverIds.includes(d.id));
  const isEnterprise = planType === 'enterprise';

  const formatCurrency = (value: number) => new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR'
  }).format(value);

  const handleLoadTour = (tour: SavedTour) => {
    setLoadedTour(tour);
    setOrigin(tour.origin_address);
    setDestination(tour.destination_address);
    setResult(null);
    toast({ title: "Tournée chargée", description: `"${tour.name}" prête pour l'analyse` });
  };

  const handleClearTour = () => {
    setLoadedTour(null);
    setOrigin('');
    setDestination('');
    setResult(null);
  };

  const handleSaveAsNewTour = async () => {
    if (!result || !origin || !destination) return;

    setSaving(true);
    try {
      const tourName = loadedTour 
        ? `${loadedTour.name} (Optimisé IA)`
        : `Trajet IA - ${origin.split(',')[0]} → ${destination.split(',')[0]}`;

      await saveTour({
        name: tourName,
        origin_address: origin,
        destination_address: destination,
        stops: [],
        distance_km: result.recommendation.estimatedDistance,
        duration_minutes: Math.round(result.recommendation.estimatedDuration * 60),
        toll_cost: result.costBreakdown?.tolls || 0,
        fuel_cost: result.costBreakdown?.fuel || 0,
        adblue_cost: 0,
        driver_cost: result.costBreakdown?.drivers || 0,
        structure_cost: (result.costBreakdown?.meals || 0) + (result.costBreakdown?.overnight || 0),
        vehicle_cost: 0,
        total_cost: result.recommendation.estimatedCost,
        pricing_mode: 'auto',
        revenue: result.recommendation.estimatedCost * 1.15,
        profit: result.recommendation.estimatedCost * 0.15,
        profit_margin: 15,
        vehicle_id: selectedVehicleId || null,
        vehicle_data: selectedVehicle || null,
        driver_ids: selectedDriverIds,
        drivers_data: selectedDriversData,
        notes: `Généré par l'IA - ${result.recommendation.summary}`,
        tags: ['IA', 'Optimisé'],
      });

      toast({ title: "Tournée sauvegardée", description: `"${tourName}" créée avec succès` });
    } catch (error) {
      toast({ title: "Erreur", description: "Impossible de sauvegarder", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

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
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-optimize-trip`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          origin,
          destination,
          mode: loadedTour ? 'optimize_route' : 'full_optimization',
          vehicleType: selectedVehicle!.type,
          fuelConsumption: selectedVehicle!.fuelConsumption,
          fuelPrice: vehicle.fuelPriceHT,
          tollClass: 2,
          drivers: validation.sanitizedDrivers,
          constraints: {
            maxDrivingHours,
            preferNightDriving: preferNight,
            avoidWeekends,
            allowRelay,
          },
          currentCosts: validation.sanitizedCosts,
        }),
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

  if (!isEnterprise) {
    return (
      <div className="text-center py-12">
        <Sparkles className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">Analyse IA Enterprise</h3>
        <p className="text-muted-foreground mb-4">
          Cette fonctionnalité est réservée au forfait Enterprise.
        </p>
        <Button variant="outline" onClick={() => window.location.href = '/pricing'}>
          Voir les forfaits
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-500" />
          <h3 className="font-semibold">Optimisation IA</h3>
        </div>
        <Button onClick={() => setLoadTourOpen(true)} variant="outline" size="sm" className="gap-2">
          <Upload className="w-4 h-4" />
          Charger une tournée
        </Button>
      </div>

      {/* Loaded Tour Info */}
      {loadedTour && (
        <div className="glass-card p-4 border-l-4 border-l-purple-500">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Folder className="w-4 h-4 text-purple-500" />
              <span className="font-medium">{loadedTour.name}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={handleClearTour}>
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>{loadedTour.distance_km} km</span>
            <span>{formatCurrency(loadedTour.total_cost)}</span>
            <Badge variant={(loadedTour.profit_margin || 0) >= 15 ? 'default' : 'destructive'}>
              {(loadedTour.profit_margin || 0).toFixed(1)}%
            </Badge>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Panel */}
        <div className="space-y-4">
          {/* Route */}
          <div className="glass-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="w-4 h-4 text-primary" />
              <h4 className="font-medium">Trajet</h4>
            </div>
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Origine</Label>
                <Input
                  value={origin}
                  onChange={(e) => setOrigin(e.target.value)}
                  placeholder="Ex: Paris, 75001"
                  disabled={!!loadedTour}
                />
              </div>
              <div>
                <Label className="text-xs">Destination</Label>
                <Input
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder="Ex: Lyon, 69001"
                  disabled={!!loadedTour}
                />
              </div>
            </div>
          </div>

          {/* Vehicle & Drivers */}
          <div className="glass-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <Truck className="w-4 h-4 text-primary" />
              <h4 className="font-medium">Ressources</h4>
            </div>
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Véhicule</Label>
                <Select value={selectedVehicleId} onValueChange={setSelectedVehicleId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner..." />
                  </SelectTrigger>
                  <SelectContent>
                    {vehicles.filter(v => v.id).map(v => (
                      <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Conducteurs</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {drivers.map(d => (
                    <Badge
                      key={d.id}
                      variant={selectedDriverIds.includes(d.id) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => toggleDriver(d.id)}
                    >
                      {d.name}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Constraints */}
          <div className="glass-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <Target className="w-4 h-4 text-primary" />
              <h4 className="font-medium">Contraintes</h4>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Conduite nuit</Label>
                <Switch checked={preferNight} onCheckedChange={setPreferNight} />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-xs">Éviter WE</Label>
                <Switch checked={avoidWeekends} onCheckedChange={setAvoidWeekends} />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-xs">Relais</Label>
                <Switch checked={allowRelay} onCheckedChange={setAllowRelay} />
              </div>
              <div>
                <Label className="text-xs">Max heures/jour</Label>
                <Input
                  type="number"
                  value={maxDrivingHours}
                  onChange={(e) => setMaxDrivingHours(Number(e.target.value))}
                  min={4}
                  max={10}
                  className="h-8 mt-1"
                />
              </div>
            </div>
          </div>

          <Button onClick={handleAnalyze} disabled={loading} className="w-full gap-2">
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Analyse en cours...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Analyser
              </>
            )}
          </Button>
        </div>

        {/* Results Panel */}
        <div className="space-y-4">
          {!result ? (
            <div className="glass-card p-8 text-center">
              <Sparkles className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                Configurez votre trajet et lancez l'analyse IA pour obtenir des recommandations d'optimisation.
              </p>
            </div>
          ) : (
            <>
              {/* Recommendation */}
              <div className="glass-card p-4 border-l-4 border-l-green-500">
                <div 
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => toggleSection('recommendation')}
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                    <h4 className="font-semibold">Recommandation</h4>
                  </div>
                  {expandedSection === 'recommendation' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
                {expandedSection === 'recommendation' && (
                  <div className="mt-3 space-y-3">
                    <p className="text-sm text-muted-foreground">{result.recommendation.summary}</p>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="p-2 bg-muted/30 rounded">
                        <p className="text-xs text-muted-foreground">Coût estimé</p>
                        <p className="font-bold text-primary">{formatCurrency(result.recommendation.estimatedCost)}</p>
                      </div>
                      <div className="p-2 bg-muted/30 rounded">
                        <p className="text-xs text-muted-foreground">Distance</p>
                        <p className="font-bold">{result.recommendation.estimatedDistance} km</p>
                      </div>
                      <div className="p-2 bg-muted/30 rounded">
                        <p className="text-xs text-muted-foreground">Économies</p>
                        <p className="font-bold text-green-500">
                          {result.recommendation.savingsPercent > 0 ? `-${result.recommendation.savingsPercent.toFixed(0)}%` : '0%'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Warnings */}
              {result.warnings && result.warnings.length > 0 && (
                <div className="glass-card p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    <h4 className="font-medium">Avertissements</h4>
                  </div>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    {result.warnings.map((w, i) => (
                      <li key={i}>• {w}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Tips */}
              {result.tips && result.tips.length > 0 && (
                <div className="glass-card p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Lightbulb className="w-4 h-4 text-amber-500" />
                    <h4 className="font-medium">Conseils</h4>
                  </div>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    {result.tips.map((t, i) => (
                      <li key={i}>• {t}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Save button */}
              <Button onClick={handleSaveAsNewTour} disabled={saving} variant="outline" className="w-full gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Sauvegarder comme nouvelle tournée
              </Button>
            </>
          )}
        </div>
      </div>

      <LoadTourDialog
        open={loadTourOpen}
        onOpenChange={setLoadTourOpen}
        onSelect={handleLoadTour}
      />
    </div>
  );
}
