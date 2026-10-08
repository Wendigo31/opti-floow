import { useState } from 'react';
import {
  Layers,
  Users,
  Moon,
  Loader2,
  Clock,
  Plus,
  X,
  Route,
  ArrowLeftRight,
  Truck,
  Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useCloudVehicles } from '@/hooks/useCloudVehicles';
import { useCloudCharges } from '@/hooks/useCloudCharges';
import { useCloudDrivers } from '@/hooks/useCloudDrivers';
import { useApp } from '@/context/AppContext';
import { cn } from '@/lib/utils';
import { AddressInput } from '@/components/route/AddressInput';
import { QuickDriverDialog } from '@/components/ai/QuickDriverDialog';
import { computeDriverDailyCost } from '@/lib/driverDailyCost';
import type { Position, StopWaypoint } from '@/types/lineMontage';

interface LineMontageFormProps {
  origin: string;
  setOrigin: (v: string) => void;
  destination: string;
  setDestination: (v: string) => void;
  stops: StopWaypoint[];
  addStop: () => void;
  removeStop: (id: string) => void;
  updateStop: (id: string, address: string, position: Position | null) => void;
  selectedVehicleId: string;
  setSelectedVehicleId: (v: string) => void;
  selectedDriverIds: string[];
  setSelectedDriverIds: React.Dispatch<React.SetStateAction<string[]>>;
  driverCount: number;
  setDriverCount: (v: number) => void;
  allowOvernight: boolean;
  setAllowOvernight: (v: boolean) => void;
  frequency: 'single' | 'daily_round' | 'weekly';
  setFrequency: (v: 'single' | 'daily_round' | 'weekly') => void;
  routeType: 'highway' | 'national' | 'mixed_70_30' | 'mixed_50_50' | 'mixed_30_70' | 'eco' | 'fastest' | 'shortest';
  setRouteType: (v: 'highway' | 'national' | 'mixed_70_30' | 'mixed_50_50' | 'mixed_30_70' | 'eco' | 'fastest' | 'shortest') => void;
  relayCount: number;
  setRelayCount: (v: number) => void;
  loadingTime: string;
  setLoadingTime: (v: string) => void;
  deliveryTime: string;
  setDeliveryTime: (v: string) => void;
  budgetTarget: string;
  setBudgetTarget: (v: string) => void;
  routePriority: 'cost' | 'time' | 'distance' | 'comfort' | 'emissions';
  setRoutePriority: (v: 'cost' | 'time' | 'distance' | 'comfort' | 'emissions') => void;
  maxTollBudget: string;
  setMaxTollBudget: (v: string) => void;
  avoidUrbanZones: boolean;
  setAvoidUrbanZones: (v: boolean) => void;
  avoidLowEmissionZones: boolean;
  setAvoidLowEmissionZones: (v: boolean) => void;
  avoidFerries: boolean;
  setAvoidFerries: (v: boolean) => void;
  avoidBorderCrossings: boolean;
  setAvoidBorderCrossings: (v: boolean) => void;
  preferTruckRoutes: boolean;
  setPreferTruckRoutes: (v: boolean) => void;
  maxSpeedKmh: number;
  setMaxSpeedKmh: (v: number) => void;
  allowNightDriving: boolean;
  setAllowNightDriving: (v: boolean) => void;
  allowWeekendDriving: boolean;
  setAllowWeekendDriving: (v: boolean) => void;
  vehicleHeight: string;
  setVehicleHeight: (v: string) => void;
  vehicleWeight: string;
  setVehicleWeight: (v: string) => void;
  enableTollBudget: boolean;
  setEnableTollBudget: (v: boolean) => void;
  enableVehicleHeight: boolean;
  setEnableVehicleHeight: (v: boolean) => void;
  enableVehicleWeight: boolean;
  setEnableVehicleWeight: (v: boolean) => void;
  inputMode: 'form' | 'text';
  setInputMode: (v: 'form' | 'text') => void;
  freeText: string;
  setFreeText: (v: string) => void;
  crossRoundTrip: boolean;
  setCrossRoundTrip: (v: boolean) => void;
  returnOrigin: string;
  setReturnOrigin: (v: string) => void;
  returnDestination: string;
  setReturnDestination: (v: string) => void;
  returnClientName: string;
  setReturnClientName: (v: string) => void;
  returnLoadingTime: string;
  setReturnLoadingTime: (v: string) => void;
  returnDeliveryTime: string;
  setReturnDeliveryTime: (v: string) => void;
  outboundClientName: string;
  setOutboundClientName: (v: string) => void;
  loading: boolean;
  handleGenerate: () => void;
  formatCurrency: (value: number) => string;
}

/**
 * Formulaire de configuration du montage de ligne (colonne gauche).
 * Extrait de src/components/ai/LineMontageTab.tsx pour alléger ce
 * fichier — comportement identique. Les champs purement internes à
 * l'affichage du formulaire (positions d'adresse non utilisées ailleurs,
 * recherche/filtre conducteur, ouverture du dialogue de création rapide)
 * sont désormais un état local à ce composant.
 */
export function LineMontageForm({
  origin,
  setOrigin,
  destination,
  setDestination,
  stops,
  addStop,
  removeStop,
  updateStop,
  selectedVehicleId,
  setSelectedVehicleId,
  selectedDriverIds,
  setSelectedDriverIds,
  driverCount,
  setDriverCount,
  allowOvernight,
  setAllowOvernight,
  frequency,
  setFrequency,
  routeType,
  setRouteType,
  relayCount,
  setRelayCount,
  loadingTime,
  setLoadingTime,
  deliveryTime,
  setDeliveryTime,
  budgetTarget,
  setBudgetTarget,
  routePriority,
  setRoutePriority,
  maxTollBudget,
  setMaxTollBudget,
  avoidUrbanZones,
  setAvoidUrbanZones,
  avoidLowEmissionZones,
  setAvoidLowEmissionZones,
  avoidFerries,
  setAvoidFerries,
  avoidBorderCrossings,
  setAvoidBorderCrossings,
  preferTruckRoutes,
  setPreferTruckRoutes,
  maxSpeedKmh,
  setMaxSpeedKmh,
  allowNightDriving,
  setAllowNightDriving,
  allowWeekendDriving,
  setAllowWeekendDriving,
  vehicleHeight,
  setVehicleHeight,
  vehicleWeight,
  setVehicleWeight,
  enableTollBudget,
  setEnableTollBudget,
  enableVehicleHeight,
  setEnableVehicleHeight,
  enableVehicleWeight,
  setEnableVehicleWeight,
  inputMode,
  setInputMode,
  freeText,
  setFreeText,
  crossRoundTrip,
  setCrossRoundTrip,
  returnOrigin,
  setReturnOrigin,
  returnDestination,
  setReturnDestination,
  returnClientName,
  setReturnClientName,
  returnLoadingTime,
  setReturnLoadingTime,
  returnDeliveryTime,
  setReturnDeliveryTime,
  outboundClientName,
  setOutboundClientName,
  loading,
  handleGenerate,
  formatCurrency,
}: LineMontageFormProps) {
  const { charges: localCharges, settings } = useApp();
  const { vehicles } = useCloudVehicles();
  const { charges: cloudCharges } = useCloudCharges();
  const { cdiDrivers, cddDrivers, interimDrivers, jokerDrivers } = useCloudDrivers();

  const allDrivers = [...cdiDrivers, ...cddDrivers, ...interimDrivers, ...jokerDrivers];
  const effectiveCharges = cloudCharges.length > 0 ? cloudCharges : localCharges;
  const selectedDrivers = allDrivers.filter(d => selectedDriverIds.includes(d.id));

  const [originPosition, setOriginPosition] = useState<Position | null>(null);
  const [destinationPosition, setDestinationPosition] = useState<Position | null>(null);
  const [quickDriverOpen, setQuickDriverOpen] = useState(false);
  const [driverSearch, setDriverSearch] = useState('');
  const [driverContractFilter, setDriverContractFilter] = useState<'all' | 'cdi' | 'cdd' | 'interim' | 'joker' | 'autre'>('all');

  // Compute traction hours per day from loadingTime → deliveryTime (default to 8h)
  const tractionHoursPerDay = (() => {
    if (!loadingTime || !deliveryTime) return 8;
    const [lh, lm] = loadingTime.split(':').map(Number);
    const [dh, dm] = deliveryTime.split(':').map(Number);
    let diff = (dh * 60 + dm) - (lh * 60 + lm);
    if (diff <= 0) diff += 24 * 60; // crossing midnight
    const hours = diff / 60;
    // For round trips, double; for weekly, base on single trip
    if (frequency === 'daily_round') return Math.min(hours * 2, 12);
    return Math.min(hours, 12);
  })();

  // Days per month deduced from frequency
  const tractionDaysPerMonth = frequency === 'weekly' ? 4 : (settings.workingDaysPerMonth || 21);

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

  const toggleDriver = (driverId: string) => {
    setSelectedDriverIds(prev =>
      prev.includes(driverId)
        ? prev.filter(id => id !== driverId)
        : [...prev, driverId]
    );
  };

  return (
    <div className="space-y-4">
      <div className="glass-card p-5 space-y-4 opacity-0 animate-slide-up" style={{ animationDelay: '25ms', animationFillMode: 'forwards' }}>
        <div className="flex items-center gap-2 mb-2">
          <Layers className="w-5 h-5 text-primary" />
          <h2 className="font-semibold text-foreground">Configuration du montage</h2>
        </div>

        {/* Input mode tabs */}
        <Tabs value={inputMode} onValueChange={(v) => setInputMode(v as 'form' | 'text')}>
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="form">📝 Formulaire</TabsTrigger>
            <TabsTrigger value="text">💬 Texte libre</TabsTrigger>
          </TabsList>

          <TabsContent value="form" className="space-y-3 mt-3">
            {/* Cross round-trip toggle */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
              <Label className="flex items-center gap-2 cursor-pointer">
                <ArrowLeftRight className="w-4 h-4" />
                Aller-retour croisé (2 clients)
              </Label>
              <Switch checked={crossRoundTrip} onCheckedChange={setCrossRoundTrip} />
            </div>

            {/* Outbound section */}
            <div className={cn('space-y-3', crossRoundTrip && 'p-3 rounded-lg border border-border/60')}>
              {crossRoundTrip && (
                <div className="flex items-center gap-2 text-xs font-semibold text-primary uppercase">
                  <Badge variant="default">Aller</Badge>
                  <Input
                    placeholder="Nom client aller (optionnel)"
                    value={outboundClientName}
                    onChange={e => setOutboundClientName(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
              )}
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

              {/* Stops (outbound only) */}
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
            </div>

            {/* Return section */}
            {crossRoundTrip && (
              <div className="space-y-3 p-3 rounded-lg border border-border/60 bg-muted/10">
                <div className="flex items-center gap-2 text-xs font-semibold text-primary uppercase">
                  <Badge variant="secondary">Retour</Badge>
                  <Input
                    placeholder="Nom client retour (optionnel)"
                    value={returnClientName}
                    onChange={e => setReturnClientName(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <AddressInput
                  value={returnOrigin}
                  onChange={setReturnOrigin}
                  onSelect={(addr) => setReturnOrigin(addr)}
                  placeholder="Adresse de départ retour"
                  label="Origine retour"
                  icon="start"
                />
                <AddressInput
                  value={returnDestination}
                  onChange={setReturnDestination}
                  onSelect={(addr) => setReturnDestination(addr)}
                  placeholder="Adresse d'arrivée retour"
                  label="Destination retour"
                  icon="end"
                />
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs flex items-center gap-1"><Clock className="w-3 h-3" /> Chargement retour</Label>
                    <Input type="time" value={returnLoadingTime} onChange={e => setReturnLoadingTime(e.target.value)} className="h-9" />
                  </div>
                  <div>
                    <Label className="text-xs flex items-center gap-1"><Clock className="w-3 h-3" /> Livraison retour</Label>
                    <Input type="time" value={returnDeliveryTime} onChange={e => setReturnDeliveryTime(e.target.value)} className="h-9" />
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="text" className="space-y-3 mt-3">
            <Label className="text-sm">Décrivez votre besoin de ligne</Label>
            <Textarea
              value={freeText}
              onChange={e => setFreeText(e.target.value)}
              placeholder="Ex : Je veux mettre en place une ligne entre Lyon (client Carrefour) et Paris (client Auchan) en aller-retour quotidien, avec relais à Mâcon, départ 6h, retour avec chargement à 14h. 2 conducteurs CDI, pas de découché."
              rows={8}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              💡 L'IA détectera automatiquement adresses, clients, fréquence, contraintes et générera le montage optimal.
            </p>
          </TabsContent>
        </Tabs>

        {/* Vehicle */}
        <div>
          <Label className="flex items-center gap-2">
            <Truck className="w-4 h-4" /> Véhicule
          </Label>
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

        {/* Driver selection from real data */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <Label className="flex items-center gap-2">
              <Users className="w-4 h-4" /> Conducteurs
            </Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 gap-1 text-xs"
              onClick={() => setQuickDriverOpen(true)}
            >
              <Plus className="w-3 h-3" /> Créer (CDI/CDD/Intérim)
            </Button>
          </div>
          {allDrivers.length > 0 ? (
            <div className="mt-2 space-y-2">
              {/* Search + contract filter */}
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher un conducteur..."
                    value={driverSearch}
                    onChange={(e) => setDriverSearch(e.target.value)}
                    className="pl-8 h-8 text-sm"
                  />
                </div>
                <div className="flex flex-wrap gap-1">
                  {([
                    { key: 'all', label: 'Tous' },
                    { key: 'cdi', label: 'CDI' },
                    { key: 'cdd', label: 'CDD' },
                    { key: 'interim', label: 'Intérim' },
                    { key: 'joker', label: 'Joker' },
                    { key: 'autre', label: 'Autre' },
                  ] as const).map((f) => {
                    const count = f.key === 'all'
                      ? allDrivers.length
                      : allDrivers.filter(d => (d.contractType || 'autre') === f.key).length;
                    if (f.key !== 'all' && count === 0) return null;
                    const active = driverContractFilter === f.key;
                    return (
                      <button
                        key={f.key}
                        type="button"
                        onClick={() => setDriverContractFilter(f.key)}
                        className={cn(
                          'px-2 py-0.5 rounded-full text-xs border transition-colors',
                          active
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-background hover:bg-accent border-border text-muted-foreground'
                        )}
                      >
                        {f.label} <span className="opacity-70">({count})</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto rounded-lg border p-2">
                {(() => {
                  const q = driverSearch.toLowerCase().trim();
                  const filtered = allDrivers.filter(d => {
                    if (driverContractFilter !== 'all' && (d.contractType || 'autre') !== driverContractFilter) return false;
                    if (!q) return true;
                    const fullName = (d.firstName && d.lastName ? `${d.firstName} ${d.lastName}` : d.name || '').toLowerCase();
                    return fullName.includes(q) || (d.name || '').toLowerCase().includes(q);
                  });
                  if (filtered.length === 0) {
                    return (
                      <p className="text-xs text-muted-foreground text-center py-3">
                        Aucun conducteur trouvé
                      </p>
                    );
                  }
                  return filtered.map(d => {
                    const costs = computeDriverDailyCost(d);
                    const driverName = d.name || `${d.firstName || ''} ${d.lastName || ''}`.trim() || 'Sans nom';
                    return (
                      <label key={d.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 cursor-pointer">
                        <Checkbox
                          checked={selectedDriverIds.includes(d.id)}
                          onCheckedChange={() => toggleDriver(d.id)}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{driverName}</p>
                          <p className="text-xs text-muted-foreground">
                            {costs.contractLabel} · {formatCurrency(costs.dailyCost + costs.dailyBonuses + costs.dailyAllowances)}/jour
                          </p>
                        </div>
                      </label>
                    );
                  });
                })()}
              </div>
            </div>
          ) : (
            <div className="mt-2 space-y-2">
              <p className="text-xs text-muted-foreground">
                Aucun conducteur enregistré. Cliquez « Créer » ci-dessus pour ajouter un CDI, CDD ou intérimaire — ou indiquez un nombre théorique :
              </p>
              <Select value={String(driverCount)} onValueChange={v => setDriverCount(Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6].map(n => (
                    <SelectItem key={n} value={String(n)}>{n} conducteur{n > 1 ? 's' : ''}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {selectedDrivers.length > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              {selectedDrivers.length} sélectionné{selectedDrivers.length > 1 ? 's' : ''} ·
              Coût total/jour: {formatCurrency(selectedDrivers.reduce((s, d) => {
                const c = computeDriverDailyCost(d);
                return s + c.dailyCost + c.dailyBonuses + c.dailyAllowances;
              }, 0))}
            </p>
          )}
        </div>

        {/* Quick driver dialog */}
        <QuickDriverDialog
          open={quickDriverOpen}
          onOpenChange={setQuickDriverOpen}
          tractionHoursPerDay={tractionHoursPerDay}
          tractionDaysPerMonth={tractionDaysPerMonth}
          onCreated={(id) => setSelectedDriverIds(prev => [...prev, id])}
        />

        {/* Overnight */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
          <Label className="flex items-center gap-2 cursor-pointer">
            <Moon className="w-4 h-4" /> Découché autorisé
          </Label>
          <Switch checked={allowOvernight} onCheckedChange={setAllowOvernight} />
        </div>

        {/* Route type — enriched */}
        <div className="space-y-2 p-3 rounded-lg border border-border/60 bg-muted/20">
          <Label className="flex items-center gap-2 text-sm font-semibold">
            <Route className="w-4 h-4" /> Type de route
          </Label>
          <Select value={routeType} onValueChange={(v: any) => setRouteType(v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="highway">🛣️ 100% Autoroute (rapide, péages)</SelectItem>
              <SelectItem value="national">🛤️ 100% Nationale / Départementale (sans péage)</SelectItem>
              <SelectItem value="mixed_70_30">⚖️ Mixte 70% Autoroute / 30% Nationale</SelectItem>
              <SelectItem value="mixed_50_50">⚖️ Mixte 50% / 50%</SelectItem>
              <SelectItem value="mixed_30_70">⚖️ Mixte 30% Autoroute / 70% Nationale</SelectItem>
              <SelectItem value="eco">🌱 Éco (consommation minimale)</SelectItem>
              <SelectItem value="fastest">⚡ Le plus rapide (sans contrainte)</SelectItem>
              <SelectItem value="shortest">📏 Le plus court (km min)</SelectItem>
            </SelectContent>
          </Select>

          <Label className="flex items-center gap-2 text-xs mt-2">Critère prioritaire</Label>
          <Select value={routePriority} onValueChange={(v: any) => setRoutePriority(v)}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="cost">💰 Coût total minimum</SelectItem>
              <SelectItem value="time">⏱️ Temps minimum</SelectItem>
              <SelectItem value="distance">📏 Distance minimum</SelectItem>
              <SelectItem value="comfort">😌 Confort conducteur</SelectItem>
              <SelectItem value="emissions">🌍 Émissions CO₂ minimum</SelectItem>
            </SelectContent>
          </Select>

          <div className="grid grid-cols-2 gap-2 mt-2">
            <div>
              <Label className="text-xs flex items-center gap-2">
                <Checkbox checked={enableTollBudget} onCheckedChange={(v) => setEnableTollBudget(!!v)} />
                <span>Budget péages max (€)</span>
              </Label>
              <Input
                type="number"
                placeholder={enableTollBudget ? 'Ex: 200' : 'Illimité (désactivé)'}
                value={maxTollBudget}
                onChange={e => setMaxTollBudget(e.target.value)}
                disabled={!enableTollBudget}
                className="h-9"
              />
            </div>
            <div>
              <Label className="text-xs">Vitesse max (km/h)</Label>
              <Input
                type="number"
                value={maxSpeedKmh}
                onChange={e => setMaxSpeedKmh(Number(e.target.value))}
                className="h-9"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-1">
            <div>
              <Label className="text-xs flex items-center gap-2">
                <Checkbox checked={enableVehicleHeight} onCheckedChange={(v) => setEnableVehicleHeight(!!v)} />
                <span>Hauteur véhicule (m)</span>
              </Label>
              <Input
                type="number"
                step="0.1"
                placeholder={enableVehicleHeight ? '4.0' : 'Non spécifié'}
                value={vehicleHeight}
                onChange={e => setVehicleHeight(e.target.value)}
                disabled={!enableVehicleHeight}
                className="h-9"
              />
            </div>
            <div>
              <Label className="text-xs flex items-center gap-2">
                <Checkbox checked={enableVehicleWeight} onCheckedChange={(v) => setEnableVehicleWeight(!!v)} />
                <span>Poids véhicule (t)</span>
              </Label>
              <Input
                type="number"
                step="0.5"
                placeholder={enableVehicleWeight ? '40' : 'Non spécifié'}
                value={vehicleWeight}
                onChange={e => setVehicleWeight(e.target.value)}
                disabled={!enableVehicleWeight}
                className="h-9"
              />
            </div>
          </div>

          <div className="space-y-1.5 mt-2">
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <Checkbox checked={preferTruckRoutes} onCheckedChange={(v) => setPreferTruckRoutes(!!v)} />
              <span>Privilégier itinéraires PL adaptés</span>
            </label>
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <Checkbox checked={avoidUrbanZones} onCheckedChange={(v) => setAvoidUrbanZones(!!v)} />
              <span>Éviter zones urbaines denses</span>
            </label>
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <Checkbox checked={avoidLowEmissionZones} onCheckedChange={(v) => setAvoidLowEmissionZones(!!v)} />
              <span>Éviter ZFE (Zones Faibles Émissions)</span>
            </label>
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <Checkbox checked={avoidFerries} onCheckedChange={(v) => setAvoidFerries(!!v)} />
              <span>Éviter ferries / navettes</span>
            </label>
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <Checkbox checked={avoidBorderCrossings} onCheckedChange={(v) => setAvoidBorderCrossings(!!v)} />
              <span>Éviter passages frontaliers</span>
            </label>
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <Checkbox checked={allowNightDriving} onCheckedChange={(v) => setAllowNightDriving(!!v)} />
              <span>Autoriser conduite de nuit (22h-6h)</span>
            </label>
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <Checkbox checked={allowWeekendDriving} onCheckedChange={(v) => setAllowWeekendDriving(!!v)} />
              <span>Autoriser conduite weekend</span>
            </label>
          </div>
        </div>

        {/* Relay count */}
        <div>
          <Label className="flex items-center gap-2">
            <ArrowLeftRight className="w-4 h-4" /> Nombre de relais
          </Label>
          <Select value={String(relayCount)} onValueChange={v => setRelayCount(Number(v))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="0">Aucun relais</SelectItem>
              <SelectItem value="1">1 relais</SelectItem>
              <SelectItem value="2">2 relais</SelectItem>
              <SelectItem value="3">3 relais</SelectItem>
              <SelectItem value="4">4 relais</SelectItem>
              <SelectItem value="5">5 relais</SelectItem>
              <SelectItem value="6">6 relais</SelectItem>
            </SelectContent>
          </Select>
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

        {/* Structure costs summary */}
        {structureDailyCost > 0 && (
          <div className="p-3 rounded-lg bg-muted/30 text-sm">
            <p className="text-muted-foreground">
              📊 Charges de structure détectées : <span className="font-semibold text-foreground">{formatCurrency(structureDailyCost)}/jour</span>
              <span className="text-xs ml-1">({effectiveCharges.length} poste{effectiveCharges.length > 1 ? 's' : ''})</span>
            </p>
          </div>
        )}

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
  );
}
