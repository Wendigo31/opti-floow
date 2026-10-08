import { useEffect, useMemo, useState } from 'react';
import { Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuotes } from '@/hooks/useQuotes';
import { useClients } from '@/hooks/useClients';
import { useCloudVehicles } from '@/hooks/useCloudVehicles';
import { useCloudTrailers } from '@/hooks/useCloudTrailers';
import { useCloudDrivers } from '@/hooks/useCloudDrivers';
import { useApp } from '@/context/AppContext';
import { estimateQuote } from '@/domain/quotes/quoteEstimate';

export interface QuoteCalculatorInitial {
  origin?: string;
  destination?: string;
  distanceKm?: number;
  tollCost?: number;
  vehicleId?: string;
  driverIds?: string[];
  notes?: string;
}

const eur = (n: number) => n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
const NONE = '__none__';

/** Calcule et enregistre un devis client directement, sans créer de tournée. */
export function QuoteCalculator({ initial, onSaved }: { initial?: QuoteCalculatorInitial; onSaved?: () => void }) {
  const { createQuote } = useQuotes();
  const { clients } = useClients();
  const { vehicles } = useCloudVehicles();
  const { trailers } = useCloudTrailers();
  const { cdiDrivers, cddDrivers, interimDrivers, autreDrivers, jokerDrivers } = useCloudDrivers();
  const drivers = useMemo(
    () => [...cdiDrivers, ...cddDrivers, ...interimDrivers, ...jokerDrivers, ...autreDrivers],
    [cdiDrivers, cddDrivers, interimDrivers, autreDrivers, jokerDrivers]
  );
  const { vehicle: appVehicleParams, settings, charges } = useApp();

  const [clientId, setClientId] = useState('');
  const [origin, setOrigin] = useState(initial?.origin ?? '');
  const [destination, setDestination] = useState(initial?.destination ?? '');
  const [distance, setDistance] = useState(initial?.distanceKm ?? 0);
  const [tolls, setTolls] = useState(initial?.tollCost ?? 0);
  const [vehicleId, setVehicleId] = useState(initial?.vehicleId || NONE);
  const [trailerId, setTrailerId] = useState(NONE);
  const [driverIds, setDriverIds] = useState<string[]>(initial?.driverIds ?? []);
  const [margin, setMargin] = useState(15);
  const [tva, setTva] = useState(settings.tvaRate || 20);
  const [validUntil, setValidUntil] = useState('');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [saving, setSaving] = useState(false);

  // Données du client : adresse de départ par défaut.
  useEffect(() => {
    const c = clients.find((x) => x.id === clientId);
    if (c && !origin) setOrigin([c.address, c.postal_code, c.city].filter(Boolean).join(' '));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  const est = useMemo(() => estimateQuote({
    distance: distance || 0,
    tollCost: tolls || 0,
    selectedDrivers: drivers.filter((d) => driverIds.includes(d.id)),
    selectedVehicles: vehicles.filter((v) => v.id === vehicleId),
    selectedTrailer: trailers.find((t) => t.id === trailerId) ?? null,
    charges, settings, appVehicleParams,
  }, margin, tva), [distance, tolls, drivers, driverIds, vehicles, vehicleId, trailers, trailerId, charges, settings, appVehicleParams, margin, tva]);

  const toggleDriver = (id: string) =>
    setDriverIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));

  const save = async () => {
    setSaving(true);
    const created = await createQuote({
      client_id: clientId || null,
      origin_address: origin,
      destination_address: destination,
      distance_km: distance,
      total_cost: Math.round(est.cost.totalCost * 100) / 100,
      margin_percent: margin,
      tva_rate: tva,
      price_ht: est.priceHT,
      price_ttc: est.priceTTC,
      valid_until: validUntil || null,
      notes: notes || null,
      status: 'draft',
      stops: null,
    });
    setSaving(false);
    if (created) onSaved?.();
  };

  const rows: [string, number][] = [
    ['Carburant', est.cost.fuelCost], ['AdBlue', est.cost.adBlueCost], ['Péages', est.cost.tollCost],
    ['Salaires', est.cost.driverCost], ['Primes', est.cost.driverBonuses], ['Indemnités', est.cost.driverAllowances],
    ['Véhicule', est.cost.vehicleCost], ['Remorque', est.cost.trailerCost], ['Charges fixes', est.cost.structureCost],
  ];

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="grid gap-3">
        <div><Label>Client</Label>
          <Select value={clientId} onValueChange={setClientId}>
            <SelectTrigger><SelectValue placeholder="Choisir un client" /></SelectTrigger>
            <SelectContent>{clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Départ</Label><Input value={origin} onChange={(e) => setOrigin(e.target.value)} /></div>
          <div><Label>Arrivée</Label><Input value={destination} onChange={(e) => setDestination(e.target.value)} /></div>
          <div><Label>Distance (km)</Label><Input type="number" value={distance} onChange={(e) => setDistance(Number(e.target.value))} /></div>
          <div><Label>Péages HT (€)</Label><Input type="number" value={tolls} onChange={(e) => setTolls(Number(e.target.value))} /></div>
          <div><Label>Véhicule</Label>
            <Select value={vehicleId} onValueChange={setVehicleId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Paramètres par défaut</SelectItem>
                {vehicles.map((v) => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Remorque</Label>
            <Select value={trailerId} onValueChange={setTrailerId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Aucune</SelectItem>
                {trailers.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Marge (%)</Label><Input type="number" value={margin} onChange={(e) => setMargin(Number(e.target.value))} /></div>
          <div><Label>TVA (%)</Label><Input type="number" value={tva} onChange={(e) => setTva(Number(e.target.value))} /></div>
          <div className="col-span-2"><Label>Valable jusqu'au</Label><Input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} /></div>
        </div>
        <div><Label>Conducteurs</Label>
          <div className="mt-1 max-h-36 space-y-1 overflow-auto rounded-md border p-2">
            {drivers.length === 0 && <p className="text-sm text-muted-foreground">Aucun conducteur</p>}
            {drivers.map((d) => (
              <label key={d.id} className="flex items-center gap-2 text-sm">
                <Checkbox checked={driverIds.includes(d.id)} onCheckedChange={() => toggleDriver(d.id)} />{d.name}
              </label>
            ))}
          </div>
        </div>
        <div><Label>Notes</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
      </div>

      <div className="space-y-3 rounded-lg bg-muted p-4 text-sm">
        <h3 className="font-semibold text-foreground">Coût réel</h3>
        {rows.map(([l, v]) => (
          <div key={l} className="flex justify-between"><span className="text-muted-foreground">{l}</span><span>{eur(v)}</span></div>
        ))}
        <div className="flex justify-between border-t pt-2 font-medium"><span>Coût de revient</span><span>{eur(est.cost.totalCost)}</span></div>
        <div className="flex justify-between"><span>Marge ({margin} %)</span><span>{eur(est.marginAmount)}</span></div>
        <div className="flex justify-between font-semibold text-foreground"><span>Prix HT</span><span>{eur(est.priceHT)}</span></div>
        <div className="flex justify-between"><span>TVA ({tva} %)</span><span>{eur(est.tvaAmount)}</span></div>
        <div className="flex justify-between text-base font-bold text-foreground"><span>Prix TTC</span><span>{eur(est.priceTTC)}</span></div>
        <Button className="w-full" onClick={save} disabled={saving || !clientId || !origin || !destination || distance <= 0}>
          <Save className="mr-2 h-4 w-4" />Enregistrer le devis
        </Button>
      </div>
    </div>
  );
}
