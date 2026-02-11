import { useState, useEffect, useMemo } from 'react';
import {
  Pencil,
  X,
  MapPin,
  Building2,
  FileText,
  Tag,
  User,
  Users,
  Check,
  Truck,
  Container,
  Euro,
  Calculator,
  RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useApp } from '@/context/AppContext';
import type { SavedTour, SaveTourInput } from '@/types/savedTour';
import type { Driver } from '@/types/index';
import type { Vehicle } from '@/types/vehicle';
import type { Trailer } from '@/types/trailer';

interface Client {
  id: string;
  name: string;
  company?: string | null;
}

interface EditTourDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tour: SavedTour;
  onUpdate: (id: string, updates: Partial<SaveTourInput>) => Promise<boolean>;
  clients: Client[];
  drivers: Driver[];
  vehicles: Vehicle[];
  trailers: Trailer[];
}

export function EditTourDialog({
  open,
  onOpenChange,
  tour,
  onUpdate,
  clients,
  drivers,
  vehicles,
  trailers,
}: EditTourDialogProps) {
  const { vehicle: appVehicleParams, settings, charges } = useApp();

  const [name, setName] = useState('');
  const [clientId, setClientId] = useState<string>('');
  const [vehicleId, setVehicleId] = useState<string>('');
  const [trailerId, setTrailerId] = useState<string>('');
  const [selectedDriverIds, setSelectedDriverIds] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [originAddress, setOriginAddress] = useState('');
  const [destinationAddress, setDestinationAddress] = useState('');
  const [revenue, setRevenue] = useState(0);
  const [pricingMode, setPricingMode] = useState<'km' | 'fixed' | 'auto'>('km');
  const [pricePerKm, setPricePerKm] = useState(0);
  const [fixedPrice, setFixedPrice] = useState(0);
  const [targetMargin, setTargetMargin] = useState(15);
  const [saving, setSaving] = useState(false);

  // Populate form when tour changes
  useEffect(() => {
    if (tour && open) {
      setName(tour.name);
      setClientId(tour.client_id || '');
      setVehicleId(tour.vehicle_id || '');
      setTrailerId(tour.trailer_id || '');
      setSelectedDriverIds(tour.driver_ids || []);
      setNotes(tour.notes || '');
      setTags(tour.tags || []);
      setOriginAddress(tour.origin_address);
      setDestinationAddress(tour.destination_address);
      setRevenue(tour.revenue || 0);
      setPricingMode(tour.pricing_mode || 'km');
      setPricePerKm(tour.price_per_km || 0);
      setFixedPrice(tour.fixed_price || 0);
      setTargetMargin(tour.target_margin || 15);
    }
  }, [tour, open]);

  // ── Live cost recalculation ──
  const calculatedCosts = useMemo(() => {
    const distance = tour.distance_km;
    const tvaRate = settings.tvaRate || 20;

    // Fuel & AdBlue: use selected vehicle's consumption, app-level fuel prices
    const selectedVehicle = vehicles.find(v => v.id === vehicleId);
    const fuelConsumption = selectedVehicle?.fuelConsumption ?? appVehicleParams.fuelConsumption;
    const adBlueConsumption = selectedVehicle?.adBlueConsumption ?? appVehicleParams.adBlueConsumption;

    const fuelPriceHT = appVehicleParams.fuelPriceIsHT
      ? appVehicleParams.fuelPriceHT
      : appVehicleParams.fuelPriceHT / (1 + tvaRate / 100);
    const adBluePriceHT = appVehicleParams.adBluePriceIsHT
      ? appVehicleParams.adBluePriceHT
      : appVehicleParams.adBluePriceHT / (1 + tvaRate / 100);

    const fuelCost = (distance / 100) * fuelConsumption * fuelPriceHT;
    const adBlueCost = (distance / 100) * adBlueConsumption * adBluePriceHT;

    // Tolls: keep original (no route recalculation)
    const tollCost = tour.toll_cost;

    // Driver cost: sum of each selected driver's daily employer cost
    let driverCost = 0;
    for (const dId of selectedDriverIds) {
      const driver = drivers.find(d => d.id === dId);
      if (driver) {
        const monthlyEmployerCost = driver.baseSalary * (1 + driver.patronalCharges / 100);
        const dailyRate = monthlyEmployerCost / driver.workingDaysPerMonth;
        driverCost += dailyRate;
      }
    }

    // Structure cost: daily charges (same logic as useCalculations)
    const structureCost = charges.reduce((total, charge) => {
      const amountHT = charge.isHT ? charge.amount : charge.amount / (1 + tvaRate / 100);
      let dailyAmount = 0;
      switch (charge.periodicity) {
        case 'yearly':
          dailyAmount = amountHT / settings.workingDaysPerYear;
          break;
        case 'monthly':
          dailyAmount = amountHT / settings.workingDaysPerMonth;
          break;
        case 'daily':
          dailyAmount = amountHT;
          break;
      }
      return total + dailyAmount;
    }, 0);

    // Vehicle cost: leasing + insurance/365 (daily) if vehicle selected
    let vehicleCost = 0;
    if (selectedVehicle) {
      vehicleCost = (selectedVehicle.monthlyLeasing / settings.workingDaysPerMonth) +
        (selectedVehicle.insuranceCost / settings.workingDaysPerYear);
    }

    const totalCost = fuelCost + adBlueCost + tollCost + driverCost + structureCost + vehicleCost;

    return { fuelCost, adBlueCost, tollCost, driverCost, structureCost, vehicleCost, totalCost };
  }, [tour.distance_km, tour.toll_cost, vehicleId, selectedDriverIds, vehicles, drivers, charges, settings, appVehicleParams]);

  // Derived financials
  const profit = revenue - calculatedCosts.totalCost;
  const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0;

  const handleAddTag = () => {
    const trimmed = tagInput.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  const toggleDriver = (driverId: string) => {
    setSelectedDriverIds(prev =>
      prev.includes(driverId)
        ? prev.filter(id => id !== driverId)
        : [...prev, driverId]
    );
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);

    const driversData = drivers.filter(d => selectedDriverIds.includes(d.id));
    const vehicleData = vehicles.find(v => v.id === vehicleId) || null;
    const trailerData = trailers.find(t => t.id === trailerId) || null;

    const success = await onUpdate(tour.id, {
      name: name.trim(),
      client_id: clientId || null,
      origin_address: originAddress,
      destination_address: destinationAddress,
      vehicle_id: vehicleId || null,
      vehicle_data: vehicleData,
      trailer_id: trailerId || null,
      trailer_data: trailerData,
      driver_ids: selectedDriverIds,
      drivers_data: driversData,
      notes: notes.trim() || undefined,
      tags,
      // Updated costs
      fuel_cost: calculatedCosts.fuelCost,
      adblue_cost: calculatedCosts.adBlueCost,
      driver_cost: calculatedCosts.driverCost,
      structure_cost: calculatedCosts.structureCost,
      vehicle_cost: calculatedCosts.vehicleCost,
      total_cost: calculatedCosts.totalCost,
      // Updated financials
      revenue,
      profit,
      profit_margin: profitMargin,
      pricing_mode: pricingMode,
      price_per_km: pricePerKm,
      fixed_price: fixedPrice,
      target_margin: targetMargin,
    });

    setSaving(false);
    if (success) {
      onOpenChange(false);
    }
  };

  const formatCurrency = (value: number) => new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR'
  }).format(value);

  const costChanged = Math.abs(calculatedCosts.totalCost - tour.total_cost) > 0.01;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[90vw] max-w-4xl h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="w-5 h-5 text-primary" />
            Modifier la tournée
          </DialogTitle>
          <DialogDescription>
            Les coûts sont recalculés automatiquement selon le véhicule et les conducteurs sélectionnés
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-2">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 py-4">
            {/* ── Left column: Logistics ── */}
            <div className="space-y-4">
              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="edit-tour-name">Nom de la tournée *</Label>
                <Input
                  id="edit-tour-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Paris-Lyon Client X"
                />
              </div>

              {/* Addresses */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Départ
                  </Label>
                  <Input
                    value={originAddress}
                    onChange={(e) => setOriginAddress(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Arrivée
                  </Label>
                  <Input
                    value={destinationAddress}
                    onChange={(e) => setDestinationAddress(e.target.value)}
                  />
                </div>
              </div>

              {/* Client selection */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  Client associé
                </Label>
                <Select value={clientId || "none"} onValueChange={(val) => setClientId(val === "none" ? "" : val)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionnez un client" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucun client</SelectItem>
                    {clients.filter(c => c.id).map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                        {client.company && ` (${client.company})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Vehicle selection */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Truck className="w-4 h-4" />
                  Véhicule
                </Label>
                <Select value={vehicleId || "none"} onValueChange={(val) => setVehicleId(val === "none" ? "" : val)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionnez un véhicule" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucun véhicule</SelectItem>
                    {vehicles.filter(v => v.id).map((vehicle) => (
                      <SelectItem key={vehicle.id} value={vehicle.id}>
                        {vehicle.name} ({vehicle.licensePlate})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Trailer selection */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Container className="w-4 h-4" />
                  Remorque
                </Label>
                <Select value={trailerId || "none"} onValueChange={(val) => setTrailerId(val === "none" ? "" : val)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionnez une remorque" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucune remorque</SelectItem>
                    {trailers.filter(t => t.id).map((trailer) => (
                      <SelectItem key={trailer.id} value={trailer.id}>
                        {trailer.name} ({trailer.licensePlate})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Driver selection */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Conducteur(s)
                </Label>
                {drivers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucun conducteur configuré</p>
                ) : (
                  <div className="border rounded-lg p-2 space-y-1 max-h-40 overflow-y-auto">
                    {drivers.map((driver) => (
                      <div
                        key={driver.id}
                        className={`flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors ${
                          selectedDriverIds.includes(driver.id)
                            ? 'bg-primary/10 border border-primary/30'
                            : 'hover:bg-muted/50'
                        }`}
                        onClick={() => toggleDriver(driver.id)}
                      >
                        <Checkbox
                          checked={selectedDriverIds.includes(driver.id)}
                          onCheckedChange={() => toggleDriver(driver.id)}
                        />
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span className="flex-1 text-sm">{driver.name}</span>
                        {selectedDriverIds.includes(driver.id) && (
                          <Check className="w-4 h-4 text-primary" />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Tags */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Tag className="w-4 h-4" />
                  Tags
                </Label>
                <div className="flex gap-2">
                  <Input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    placeholder="Ajouter un tag..."
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                  />
                  <Button type="button" variant="outline" onClick={handleAddTag} size="icon">
                    <Tag className="w-4 h-4" />
                  </Button>
                </div>
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="cursor-pointer" onClick={() => handleRemoveTag(tag)}>
                        {tag}
                        <X className="w-3 h-3 ml-1" />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Notes
                </Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Notes additionnelles..."
                  rows={2}
                />
              </div>
            </div>

            {/* ── Right column: Costs & Financials ── */}
            <div className="space-y-4">
              {/* Live cost breakdown */}
              <div className="p-4 rounded-lg border bg-muted/30 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Calculator className="w-4 h-4 text-primary" />
                    Coûts calculés
                  </h3>
                  {costChanged && (
                    <Badge variant="outline" className="text-xs flex items-center gap-1 text-amber-600 border-amber-300">
                      <RefreshCw className="w-3 h-3" />
                      Mis à jour
                    </Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  Distance : {tour.distance_km.toFixed(0)} km · Péages : {formatCurrency(calculatedCosts.tollCost)}
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex justify-between p-2 bg-background rounded">
                    <span className="text-muted-foreground">Carburant</span>
                    <span className="font-medium">{formatCurrency(calculatedCosts.fuelCost)}</span>
                  </div>
                  <div className="flex justify-between p-2 bg-background rounded">
                    <span className="text-muted-foreground">AdBlue</span>
                    <span className="font-medium">{formatCurrency(calculatedCosts.adBlueCost)}</span>
                  </div>
                  <div className="flex justify-between p-2 bg-background rounded">
                    <span className="text-muted-foreground">Conducteur(s)</span>
                    <span className="font-medium">{formatCurrency(calculatedCosts.driverCost)}</span>
                  </div>
                  <div className="flex justify-between p-2 bg-background rounded">
                    <span className="text-muted-foreground">Structure</span>
                    <span className="font-medium">{formatCurrency(calculatedCosts.structureCost)}</span>
                  </div>
                  <div className="flex justify-between p-2 bg-background rounded">
                    <span className="text-muted-foreground">Véhicule</span>
                    <span className="font-medium">{formatCurrency(calculatedCosts.vehicleCost)}</span>
                  </div>
                  <div className="flex justify-between p-2 bg-background rounded">
                    <span className="text-muted-foreground">Péages</span>
                    <span className="font-medium">{formatCurrency(calculatedCosts.tollCost)}</span>
                  </div>
                </div>

                <div className="flex justify-between items-center p-3 bg-primary/10 rounded-lg font-semibold">
                  <span>Coût total</span>
                  <span className="text-lg">{formatCurrency(calculatedCosts.totalCost)}</span>
                </div>
              </div>

              {/* Revenue / Pricing */}
              <div className="p-4 rounded-lg border space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <Euro className="w-4 h-4 text-primary" />
                  Tarification
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Recette (€ HT)</Label>
                    <Input
                      type="number"
                      value={revenue}
                      onChange={(e) => setRevenue(parseFloat(e.target.value) || 0)}
                      step="0.01"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Marge cible (%)</Label>
                    <Input
                      type="number"
                      value={targetMargin}
                      onChange={(e) => setTargetMargin(parseFloat(e.target.value) || 0)}
                      step="1"
                    />
                  </div>
                </div>
              </div>

              {/* Profit summary */}
              <div className={`p-4 rounded-lg border space-y-2 ${
                profit >= 0 ? 'bg-green-500/5 border-green-500/20' : 'bg-destructive/5 border-destructive/20'
              }`}>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Recette</span>
                  <span className="font-medium">{formatCurrency(revenue)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Coût total</span>
                  <span className="font-medium">- {formatCurrency(calculatedCosts.totalCost)}</span>
                </div>
                <hr className="border-border" />
                <div className="flex justify-between items-center">
                  <span className="font-semibold">Bénéfice</span>
                  <span className={`text-lg font-bold ${profit >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                    {formatCurrency(profit)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Marge effective</span>
                  <Badge variant={profitMargin >= targetMargin ? 'default' : 'destructive'}>
                    {profitMargin.toFixed(1)}%
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="pt-4 border-t flex-shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleSave} disabled={!name.trim() || saving}>
            {saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
