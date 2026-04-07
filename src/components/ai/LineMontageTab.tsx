import { useState } from 'react';
import {
  Layers,
  MapPin,
  Users,
  Moon,
  Sun,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  TrendingDown,
  Clock,
  Fuel,
  Shield,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  Save,
  Plus,
  X,
  Route,
  ArrowLeftRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useCloudVehicles } from '@/hooks/useCloudVehicles';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { AddressInput } from '@/components/route/AddressInput';
import { useSavedTours } from '@/hooks/useSavedTours';

interface Position {
  lat: number;
  lon: number;
}

interface StopWaypoint {
  id: string;
  address: string;
  position: Position | null;
}

interface MontageScenario {
  name: string;
  driverCount: number;
  overnightStays: boolean;
  totalCost: number;
  totalDuration: number;
  weeklySchedule: {
    day: string;
    segments: {
      driver: string;
      startTime: string;
      endTime: string;
      activity: string;
      notes?: string;
    }[];
  }[];
  costBreakdown: {
    fuel: number;
    tolls: number;
    drivers: number;
    meals: number;
    overnight: number;
    vehicleCost: number;
    structureCost: number;
    total: number;
  };
  rseCompliance: {
    valid: boolean;
    notes: string[];
    warnings: string[];
  };
  pros: string[];
  cons: string[];
  isRecommended: boolean;
}

interface MontageResponse {
  recommendation: {
    summary: string;
    bestScenario: string;
    estimatedWeeklyCost: number;
    estimatedMonthlyCost: number;
  };
  scenarios: MontageScenario[];
  regulatoryNotes: string[];
  tips: string[];
  warnings: string[];
}

export function LineMontageTab() {
  const { toast } = useToast();
  const { vehicle } = useApp();
  const { vehicles } = useCloudVehicles();
  const { saveTour } = useSavedTours();

  const [origin, setOrigin] = useState('');
  const [originPosition, setOriginPosition] = useState<Position | null>(null);
  const [destination, setDestination] = useState('');
  const [destinationPosition, setDestinationPosition] = useState<Position | null>(null);
  const [stops, setStops] = useState<StopWaypoint[]>([]);

  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [driverCount, setDriverCount] = useState(2);
  const [allowOvernight, setAllowOvernight] = useState(false);
  const [frequency, setFrequency] = useState<'single' | 'daily_round' | 'weekly'>('daily_round');
  const [routeType, setRouteType] = useState<'highway' | 'national' | 'mixed'>('highway');
  const [relayCount, setRelayCount] = useState(0);
  const [loadingTime, setLoadingTime] = useState('06:00');
  const [deliveryTime, setDeliveryTime] = useState('');
  const [budgetTarget, setBudgetTarget] = useState('');

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MontageResponse | null>(null);
  const [expandedScenario, setExpandedScenario] = useState<number | null>(null);

  const selectedVehicle = vehicles.find(v => v.id === selectedVehicleId);

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

  const handleGenerate = async () => {
    if (!origin || !destination) {
      toast({ title: 'Champs requis', description: "Renseignez l'origine et la destination", variant: 'destructive' });
      return;
    }
    if (!selectedVehicle) {
      toast({ title: 'Véhicule requis', description: 'Sélectionnez un véhicule', variant: 'destructive' });
      return;
    }

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
          origin,
          destination,
          stops: stops.map(s => s.address).filter(Boolean),
          mode: 'line_montage',
          vehicleType: selectedVehicle.type,
          fuelConsumption: selectedVehicle.fuelConsumption,
          fuelPrice: vehicle.fuelPriceHT,
          tollClass: 2,
          drivers: Array.from({ length: driverCount }, (_, i) => ({
            name: `Conducteur ${i + 1}`,
            hourlyCost: 15,
          })),
          constraints: {
            respectRSE: true,
            includeRestBreaks: true,
            includeMealBreaks: true,
            requireOvernightRest: allowOvernight,
          },
          montageOptions: {
            driverCount,
            allowOvernight,
            frequency,
            loadingTime: loadingTime || undefined,
            deliveryTime: deliveryTime || undefined,
            budgetTarget: budgetTarget ? parseFloat(budgetTarget) : undefined,
          },
          vehicleCosts: {
            dailyCost: (selectedVehicle as any).dailyCost || 150,
            kmCost: (selectedVehicle as any).kmCost || 0.25,
          },
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
      {/* Form */}
      <div className="space-y-4">
        <div className="glass-card p-5 space-y-4 opacity-0 animate-slide-up" style={{ animationDelay: '25ms', animationFillMode: 'forwards' }}>
          <div className="flex items-center gap-2 mb-2">
            <Layers className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-foreground">Configuration du montage</h2>
          </div>

          {/* Origin / Destination */}
          <div className="space-y-3">
            <AddressInput
              value={origin}
              onChange={setOrigin}
              onSelect={(addr, pos) => { setOrigin(addr); setOriginPosition(pos); }}
              placeholder="Adresse de départ"
              label="Origine"
              icon="start"
            />
            <AddressInput
              value={destination}
              onChange={setDestination}
              onSelect={(addr, pos) => { setDestination(addr); setDestinationPosition(pos); }}
              placeholder="Adresse d'arrivée"
              label="Destination"
              icon="end"
            />
          </div>

          {/* Stops */}
          {stops.map((stop, idx) => (
            <div key={stop.id} className="flex items-center gap-2">
              <div className="flex-1">
                <AddressInput
                  value={stop.address}
                  onChange={(val) => updateStop(stop.id, val, stop.position)}
                  onSelect={(addr, pos) => updateStop(stop.id, addr, pos)}
                  placeholder={`Arrêt ${idx + 1}`}
                />
              </div>
              <Button variant="ghost" size="icon" onClick={() => removeStop(stop.id)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}
          <Button variant="outline" size="sm" className="gap-1" onClick={addStop}>
            <Plus className="w-3 h-3" /> Ajouter un arrêt
          </Button>

          {/* Vehicle */}
          <div>
            <Label>Véhicule</Label>
            <Select value={selectedVehicleId} onValueChange={setSelectedVehicleId}>
              <SelectTrigger><SelectValue placeholder="Choisir un véhicule" /></SelectTrigger>
              <SelectContent>
                {vehicles.map(v => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.name || v.type} — {v.fuelConsumption}L/100km
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Driver count */}
          <div>
            <Label className="flex items-center gap-2">
              <Users className="w-4 h-4" /> Nombre de conducteurs
            </Label>
            <Select value={String(driverCount)} onValueChange={v => setDriverCount(Number(v))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5, 6].map(n => (
                  <SelectItem key={n} value={String(n)}>{n} conducteur{n > 1 ? 's' : ''}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Overnight */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
            <Label className="flex items-center gap-2 cursor-pointer">
              <Moon className="w-4 h-4" /> Découché autorisé
            </Label>
            <Switch checked={allowOvernight} onCheckedChange={setAllowOvernight} />
          </div>

          {/* Route type */}
          <div>
            <Label className="flex items-center gap-2">
              <Route className="w-4 h-4" /> Type de route
            </Label>
            <Select value={routeType} onValueChange={(v: any) => setRouteType(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="highway">100% Autoroute</SelectItem>
                <SelectItem value="national">100% Nationale / Départementale</SelectItem>
                <SelectItem value="mixed">Mixte (autoroute + nationale)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Relay count */}
          <div>
            <Label className="flex items-center gap-2">
              <ArrowLeftRight className="w-4 h-4" /> Nombre de relais
            </Label>
            <Select value={String(relayCount)} onValueChange={v => setRelayCount(Number(v))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Aucun relais (conducteur unique bout en bout)</SelectItem>
                <SelectItem value="1">1 relais</SelectItem>
                <SelectItem value="2">2 relais</SelectItem>
                <SelectItem value="3">3 relais</SelectItem>
                <SelectItem value="4">4 relais</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              Un relais = changement de conducteur en cours de route
            </p>
          </div>

          {/* Frequency */}
          <div>
            <Label>Fréquence</Label>
            <Select value={frequency} onValueChange={(v: any) => setFrequency(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="single">Aller simple</SelectItem>
                <SelectItem value="daily_round">Aller-retour quotidien</SelectItem>
                <SelectItem value="weekly">Hebdomadaire</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Times */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="flex items-center gap-1"><Clock className="w-3 h-3" /> Heure chargement</Label>
              <Input type="time" value={loadingTime} onChange={e => setLoadingTime(e.target.value)} />
            </div>
            <div>
              <Label className="flex items-center gap-1"><Clock className="w-3 h-3" /> Heure livraison</Label>
              <Input type="time" value={deliveryTime} onChange={e => setDeliveryTime(e.target.value)} />
            </div>
          </div>

          {/* Budget */}
          <div>
            <Label>Budget cible (€, optionnel)</Label>
            <Input
              type="number"
              placeholder="Ex: 1500"
              value={budgetTarget}
              onChange={e => setBudgetTarget(e.target.value)}
            />
          </div>

          <Button
            className="w-full gap-2"
            onClick={handleGenerate}
            disabled={loading || !origin || !destination || !selectedVehicleId}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Génération en cours…
              </>
            ) : (
              <>
                <Layers className="w-4 h-4" /> Générer le montage
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Results */}
      <div className="space-y-4">
        {loading && (
          <div className="glass-card p-12 flex flex-col items-center gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
            <p className="text-muted-foreground">L'IA analyse les rotations et le respect RSE…</p>
          </div>
        )}

        {result && (
          <>
            {/* Recommendation */}
            <div className="glass-card p-5 border-l-4 border-l-primary opacity-0 animate-slide-up" style={{ animationDelay: '50ms', animationFillMode: 'forwards' }}>
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="w-5 h-5 text-primary" />
                <h3 className="font-semibold">Recommandation</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-3">{result.recommendation.summary}</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-primary/10 text-center">
                  <p className="text-xs text-muted-foreground">Coût hebdo</p>
                  <p className="text-lg font-bold text-primary">
                    {formatCurrency(result.recommendation.estimatedWeeklyCost)}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-primary/10 text-center">
                  <p className="text-xs text-muted-foreground">Coût mensuel</p>
                  <p className="text-lg font-bold text-primary">
                    {formatCurrency(result.recommendation.estimatedMonthlyCost)}
                  </p>
                </div>
              </div>
            </div>

            {/* Scenarios */}
            {result.scenarios?.map((scenario, idx) => (
              <div
                key={idx}
                className={cn(
                  'glass-card p-5 opacity-0 animate-slide-up cursor-pointer transition-all',
                  scenario.isRecommended && 'border-l-4 border-l-green-500',
                )}
                style={{ animationDelay: `${100 + idx * 50}ms`, animationFillMode: 'forwards' }}
                onClick={() => setExpandedScenario(expandedScenario === idx ? null : idx)}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-sm">{scenario.name}</h4>
                    {scenario.isRecommended && (
                      <Badge variant="default" className="text-xs">Recommandé</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-primary">{formatCurrency(scenario.totalCost)}</span>
                    {expandedScenario === idx ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs text-muted-foreground mb-2">
                  <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {scenario.driverCount} conducteur{scenario.driverCount > 1 ? 's' : ''}</span>
                  <span className="flex items-center gap-1">{scenario.overnightStays ? <Moon className="w-3 h-3" /> : <Sun className="w-3 h-3" />} {scenario.overnightStays ? 'Avec découché' : 'Sans découché'}</span>
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {scenario.totalDuration}h</span>
                </div>

                {/* RSE status */}
                <div className="flex items-center gap-1 text-xs">
                  {scenario.rseCompliance?.valid ? (
                    <><Shield className="w-3 h-3 text-green-500" /><span className="text-green-600">RSE conforme</span></>
                  ) : (
                    <><AlertTriangle className="w-3 h-3 text-amber-500" /><span className="text-amber-600">Attention RSE</span></>
                  )}
                </div>

                {expandedScenario === idx && (
                  <div className="mt-4 space-y-4 border-t pt-4">
                    {/* Cost breakdown */}
                    <div>
                      <h5 className="text-xs font-semibold uppercase text-muted-foreground mb-2">Détail des coûts</h5>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="flex justify-between"><span className="text-muted-foreground">Carburant</span><span>{formatCurrency(scenario.costBreakdown.fuel)}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Péages</span><span>{formatCurrency(scenario.costBreakdown.tolls)}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Conducteurs</span><span>{formatCurrency(scenario.costBreakdown.drivers)}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Repas</span><span>{formatCurrency(scenario.costBreakdown.meals)}</span></div>
                        {scenario.overnightStays && (
                          <div className="flex justify-between"><span className="text-muted-foreground">Découché</span><span>{formatCurrency(scenario.costBreakdown.overnight)}</span></div>
                        )}
                        <div className="flex justify-between"><span className="text-muted-foreground">Véhicule</span><span>{formatCurrency(scenario.costBreakdown.vehicleCost)}</span></div>
                      </div>
                    </div>

                    {/* Weekly schedule */}
                    {scenario.weeklySchedule?.length > 0 && (
                      <div>
                        <h5 className="text-xs font-semibold uppercase text-muted-foreground mb-2">Planning hebdomadaire</h5>
                        <div className="space-y-2">
                          {scenario.weeklySchedule.map((day, dIdx) => (
                            <div key={dIdx} className="p-2 rounded bg-muted/30">
                              <p className="text-xs font-semibold mb-1">{day.day}</p>
                              {day.segments.map((seg, sIdx) => (
                                <div key={sIdx} className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <span className="font-mono">{seg.startTime}-{seg.endTime}</span>
                                  <Badge variant="outline" className="text-[10px]">{seg.driver}</Badge>
                                  <span>{seg.activity}</span>
                                </div>
                              ))}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Pros / Cons */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <h5 className="text-xs font-semibold text-green-600 mb-1">Avantages</h5>
                        {scenario.pros?.map((p, i) => (
                          <p key={i} className="text-xs text-muted-foreground flex items-start gap-1">
                            <CheckCircle2 className="w-3 h-3 text-green-500 mt-0.5 shrink-0" /> {p}
                          </p>
                        ))}
                      </div>
                      <div>
                        <h5 className="text-xs font-semibold text-amber-600 mb-1">Inconvénients</h5>
                        {scenario.cons?.map((c, i) => (
                          <p key={i} className="text-xs text-muted-foreground flex items-start gap-1">
                            <AlertTriangle className="w-3 h-3 text-amber-500 mt-0.5 shrink-0" /> {c}
                          </p>
                        ))}
                      </div>
                    </div>

                    {/* RSE notes */}
                    {scenario.rseCompliance?.notes?.length > 0 && (
                      <div>
                        <h5 className="text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-1">
                          <Shield className="w-3 h-3" /> Notes RSE
                        </h5>
                        {scenario.rseCompliance.notes.map((n, i) => (
                          <p key={i} className="text-xs text-muted-foreground">• {n}</p>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}

            {/* Warnings */}
            {result.warnings?.length > 0 && (
              <div className="glass-card p-4 border-l-4 border-l-amber-500">
                <h4 className="text-sm font-semibold flex items-center gap-1 mb-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" /> Avertissements
                </h4>
                {result.warnings.map((w, i) => (
                  <p key={i} className="text-xs text-muted-foreground">• {w}</p>
                ))}
              </div>
            )}

            {/* Tips */}
            {result.tips?.length > 0 && (
              <div className="glass-card p-4">
                <h4 className="text-sm font-semibold flex items-center gap-1 mb-2">
                  <Lightbulb className="w-4 h-4 text-primary" /> Conseils
                </h4>
                {result.tips.map((t, i) => (
                  <p key={i} className="text-xs text-muted-foreground">• {t}</p>
                ))}
              </div>
            )}
          </>
        )}

        {!loading && !result && (
          <div className="glass-card p-12 flex flex-col items-center gap-4 text-center">
            <Layers className="w-12 h-12 text-muted-foreground/30" />
            <div>
              <h3 className="font-semibold text-foreground mb-1">Créez votre montage de ligne</h3>
              <p className="text-sm text-muted-foreground">
                Configurez les paramètres à gauche puis cliquez sur "Générer le montage" pour obtenir
                un plan optimisé avec rotations conducteurs et respect RSE.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
