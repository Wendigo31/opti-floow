import { useState, useEffect, useMemo } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Save, Copy, FileText, MapPin, Clock, UserPlus, Plus, Trash2, X, Link2, AlertTriangle, Sparkles, Loader2 } from 'lucide-react';
import { DriverSearchSelect } from '@/components/planning/DriverSearchSelect';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { PlanningEntry, PlanningEntryInput } from '@/types/planning';
import type { Vehicle } from '@/types/vehicle';
import type { Driver } from '@/types';
import type { ClientWithCreator } from '@/hooks/useClients';

interface PlanningRowDetailPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entries: PlanningEntry[];
  allEntries?: PlanningEntry[];
  clients: ClientWithCreator[];
  drivers: Driver[];
  vehicles: Vehicle[];
  onUpdateEntry: (id: string, updates: Partial<PlanningEntryInput>) => Promise<boolean>;
  onDeleteEntry: (id: string) => Promise<boolean>;
  onDeleteTraction?: () => Promise<boolean>;
  onSyncToSavedTour?: (savedTourId: string, updates: Record<string, any>) => Promise<void>;
}

interface StopAddress {
  address: string;
  label?: string;
}

export function PlanningRowDetailPanel({
  open,
  onOpenChange,
  entries,
  allEntries = [],
  clients,
  drivers,
  vehicles,
  onUpdateEntry,
  onDeleteEntry,
  onDeleteTraction,
  onSyncToSavedTour,
}: PlanningRowDetailPanelProps) {
  const first = entries.length > 0 ? entries[0] : null;

  const [tourName, setTourName] = useState('');
  const [lineReference, setLineReference] = useState('');
  const [returnLineReference, setReturnLineReference] = useState('');
  const [missionOrder, setMissionOrder] = useState('');
  const [clientId, setClientId] = useState('');
  const [driverId, setDriverId] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [sectorManager, setSectorManager] = useState('');
  const [startTime, setStartTime] = useState('');
  const [originAddress, setOriginAddress] = useState('');
  const [destinationAddress, setDestinationAddress] = useState('');
  const [stops, setStops] = useState<StopAddress[]>([]);
  const [showRelay, setShowRelay] = useState(false);
  const [relayDriverId, setRelayDriverId] = useState('');
  const [relayTime, setRelayTime] = useState('');
  const [relayLocation, setRelayLocation] = useState('');
  const [isRewriting, setIsRewriting] = useState(false);

  useEffect(() => {
    if (open && first) {
      setTourName(first.tour_name || '');
      setLineReference(first.line_reference || '');
      setReturnLineReference(first.return_line_reference || '');
      setMissionOrder(first.mission_order || '');
      setClientId(first.client_id || '');
      setDriverId(first.driver_id || '');
      setVehicleId(first.vehicle_id || '');
      setSectorManager(first.sector_manager || '');
      setStartTime(first.start_time || '');
      setOriginAddress(first.origin_address || '');
      setDestinationAddress(first.destination_address || '');
      setStops(Array.isArray(first.stops) ? first.stops : []);
      setShowRelay(!!first.relay_driver_id);
      setRelayDriverId(first.relay_driver_id || '');
      setRelayTime(first.relay_time || '');
      setRelayLocation(first.relay_location || '');
    }
  }, [open, first?.id]);

  const clientName = useMemo(() => {
    const c = clients.find(c => c.id === clientId);
    return c?.name || '';
  }, [clients, clientId]);

  const driverName = useMemo(() => {
    const d = drivers.find(d => d.id === driverId);
    return d?.firstName && d?.lastName ? `${d.firstName} ${d.lastName}` : d?.name || '';
  }, [drivers, driverId]);

  if (!first) return null;

  const handleSaveAll = async () => {
    const updates: Partial<PlanningEntryInput> = {
      tour_name: tourName || null,
      line_reference: lineReference || null,
      return_line_reference: returnLineReference || null,
      mission_order: missionOrder || null,
      client_id: clientId || null,
      driver_id: driverId || null,
      vehicle_id: vehicleId || null,
      sector_manager: sectorManager || null,
      start_time: startTime || null,
      origin_address: originAddress || null,
      destination_address: destinationAddress || null,
      stops: stops.filter(s => s.address.trim()),
      relay_driver_id: showRelay ? (relayDriverId || null) : null,
      relay_time: showRelay ? (relayTime || null) : null,
      relay_location: showRelay ? (relayLocation || null) : null,
    };

    let success = true;
    for (const entry of entries) {
      const ok = await onUpdateEntry(entry.id, updates);
      if (!ok) success = false;
    }

    // Sync to linked saved tour if exists
    const savedTourId = first?.saved_tour_id;
    if (success && savedTourId && onSyncToSavedTour) {
      try {
        await onSyncToSavedTour(savedTourId, {
          name: tourName || 'Sans nom',
          origin_address: originAddress || '',
          destination_address: destinationAddress || '',
          stops: stops.filter(s => s.address.trim()),
          client_id: clientId || null,
          vehicle_id: vehicleId || null,
          driver_ids: driverId ? [driverId] : [],
          notes: missionOrder || null,
        });
      } catch (e) {
        console.error('Error syncing to saved tour:', e);
      }
    }

    if (success) {
      toast.success(`${entries.length} entrée(s) mise(s) à jour`);
      onOpenChange(false);
    }
  };

  const handleDeleteDay = async (entryId: string) => {
    if (!confirm('Supprimer cette journée du planning ?')) return;
    await onDeleteEntry(entryId);
    if (entries.length <= 1) onOpenChange(false);
  };

  const handleDeleteTraction = async () => {
    if (!confirm(`Supprimer toute la traction "${tourName || 'Sans nom'}" sur cette semaine ?`)) return;
    if (onDeleteTraction) {
      const ok = await onDeleteTraction();
      if (ok) onOpenChange(false);
    } else {
      // Fallback: delete all entries one by one
      for (const entry of entries) {
        await onDeleteEntry(entry.id);
      }
      onOpenChange(false);
    }
  };

  const addStop = () => {
    setStops(prev => [...prev, { address: '', label: '' }]);
  };

  const updateStop = (index: number, field: 'address' | 'label', value: string) => {
    setStops(prev => prev.map((s, i) => i === index ? { ...s, [field]: value } : s));
  };

  const removeStop = (index: number) => {
    setStops(prev => prev.filter((_, i) => i !== index));
  };

  const handleRewriteODM = async () => {
    if (!missionOrder.trim()) return;
    setIsRewriting(true);
    try {
      const { data, error } = await supabase.functions.invoke('rewrite-mission-order', {
        body: {
          missionOrder,
          tourName,
          driverName,
          clientName,
          originAddress,
          destinationAddress,
          startTime,
        },
      });
      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
        return;
      }
      if (data?.rewritten) {
        setMissionOrder(data.rewritten);
        toast.success('Ordre de mission reformulé par l\'IA');
      }
    } catch (e) {
      console.error('Rewrite ODM error:', e);
      toast.error('Impossible de reformuler l\'ordre de mission');
    } finally {
      setIsRewriting(false);
    }
  };

  const generateDriverText = () => {
    const lines: string[] = [];
    lines.push(`📋 ORDRE DE MISSION`);
    if (lineReference) lines.push(`Réf. ligne : ${lineReference}`);
    if (returnLineReference) lines.push(`Réf. retour : ${returnLineReference}`);
    lines.push(`Ligne : ${tourName || 'Non définie'}`);
    if (clientName) lines.push(`Client : ${clientName}`);
    if (driverName) lines.push(`Conducteur : ${driverName}`);
    if (startTime) lines.push(`Prise de service : ${startTime}`);
    
    lines.push('');
    lines.push('📍 ITINÉRAIRE');
    if (originAddress) lines.push(`Départ : ${originAddress}`);
    stops.filter(s => s.address.trim()).forEach((s, i) => {
      const label = s.label ? ` (${s.label})` : '';
      lines.push(`Étape ${i + 1}${label} : ${s.address}`);
    });
    if (destinationAddress) lines.push(`Arrivée : ${destinationAddress}`);
    
    if (relayDriverId && showRelay) {
      const rd = drivers.find(d => d.id === relayDriverId);
      const rdName = rd?.firstName && rd?.lastName ? `${rd.firstName} ${rd.lastName}` : rd?.name || '';
      lines.push('');
      lines.push(`🔄 RELAIS`);
      lines.push(`Conducteur relais : ${rdName}`);
      if (relayTime) lines.push(`Heure : ${relayTime}`);
      if (relayLocation) lines.push(`Lieu : ${relayLocation}`);
    }
    if (missionOrder) {
      lines.push('');
      lines.push(`📝 INSTRUCTIONS`);
      lines.push(missionOrder);
    }
    const text = lines.join('\n');
    navigator.clipboard.writeText(text);
    toast.success('Texte copié dans le presse-papier');
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[480px] sm:max-w-[480px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            🚚 {tourName || 'Ligne sans nom'}
            <Badge variant="secondary" className="text-xs">{entries.length} jours</Badge>
            {first?.saved_tour_id && (
              <Badge variant="outline" className="text-xs gap-1 text-primary border-primary/30">
                <Link2 className="h-3 w-3" /> Tournée liée
              </Badge>
            )}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-4 mt-6">
          {/* Ligne / Tour name */}
          <div className="space-y-1.5">
            <Label className="text-xs">Ligne (nom de tournée)</Label>
            <Input value={tourName} onChange={e => setTourName(e.target.value)} placeholder="Nom de la ligne" />
          </div>

          {/* Line references */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Référence ligne</Label>
              <Input value={lineReference} onChange={e => setLineReference(e.target.value)} placeholder="Réf. aller" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Référence retour</Label>
              <Input value={returnLineReference} onChange={e => setReturnLineReference(e.target.value)} placeholder="Réf. retour" />
            </div>
          </div>

          {/* Client */}
          <div className="space-y-1.5">
            <Label className="text-xs">Client</Label>
            <Select value={clientId || '_none'} onValueChange={v => setClientId(v === '_none' ? '' : v)}>
              <SelectTrigger><SelectValue placeholder="Client" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">Aucun</SelectItem>
                {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Sector manager */}
          <div className="space-y-1.5">
            <Label className="text-xs">Responsable secteur</Label>
            <Input value={sectorManager} onChange={e => setSectorManager(e.target.value)} placeholder="Nom du responsable" />
          </div>

          {/* Driver */}
          <div className="space-y-1.5">
            <Label className="text-xs">Conducteur titulaire</Label>
            <DriverSearchSelect
              drivers={drivers}
              value={driverId}
              onChange={v => setDriverId(v)}
              placeholder="Rechercher un conducteur..."
            />
          </div>

          {/* Vehicle */}
          <div className="space-y-1.5">
            <Label className="text-xs">Véhicule</Label>
            <Select value={vehicleId || '_none'} onValueChange={v => setVehicleId(v === '_none' ? '' : v)}>
              <SelectTrigger><SelectValue placeholder="Véhicule" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">Aucun</SelectItem>
                {vehicles.map(v => {
                  const isGeneric = !v.licensePlate;
                  // Check if this registered vehicle is already used on any date of this traction's entries
                  const isConflict = !isGeneric && entries.length > 0 && allEntries.some(e => 
                    e.vehicle_id === v.id && 
                    entries.some(te => te.planning_date === e.planning_date) &&
                    !entries.some(te => te.id === e.id)
                  );
                  return (
                    <SelectItem key={v.id} value={v.id} disabled={isConflict}>
                      <div className="flex items-center gap-2">
                        {isGeneric ? (
                          <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 font-normal">TYPE</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4 font-normal">{v.licensePlate}</Badge>
                        )}
                        <span>{v.name}</span>
                        {isConflict && <span className="text-destructive text-[10px]">(Déjà affecté)</span>}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            {/* Info about generic vehicles */}
            {vehicleId && vehicles.find(v => v.id === vehicleId && !v.licensePlate) && (
              <p className="text-[10px] text-muted-foreground">
                ℹ️ Véhicule-type : peut être utilisé sur plusieurs tractions
              </p>
            )}
          </div>

          {/* Time */}
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1"><Clock className="h-3 w-3" /> Heure prise de service</Label>
            <Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} />
          </div>

          {/* Addresses - Origin */}
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1"><MapPin className="h-3 w-3" /> Adresse de départ</Label>
            <Input value={originAddress} onChange={e => setOriginAddress(e.target.value)} placeholder="Adresse de départ" />
          </div>

          {/* Intermediate stops */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs flex items-center gap-1"><MapPin className="h-3 w-3" /> Étapes intermédiaires</Label>
              <Button type="button" variant="ghost" size="sm" onClick={addStop} className="gap-1 text-xs h-7">
                <Plus className="h-3 w-3" /> Ajouter
              </Button>
            </div>
            {stops.map((stop, i) => (
              <div key={i} className="flex gap-2 items-start">
                <div className="flex-1 space-y-1">
                  <Input
                    value={stop.address}
                    onChange={e => updateStop(i, 'address', e.target.value)}
                    placeholder={`Adresse étape ${i + 1}`}
                    className="text-xs h-8"
                  />
                  <Input
                    value={stop.label || ''}
                    onChange={e => updateStop(i, 'label', e.target.value)}
                    placeholder="Label (optionnel)"
                    className="text-xs h-7 text-muted-foreground"
                  />
                </div>
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => removeStop(i)}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>

          {/* Destination */}
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1"><MapPin className="h-3 w-3" /> Adresse d'arrivée</Label>
            <Input value={destinationAddress} onChange={e => setDestinationAddress(e.target.value)} placeholder="Adresse d'arrivée" />
          </div>

          {/* Relay */}
          <div>
            <Button type="button" variant="outline" size="sm" onClick={() => setShowRelay(!showRelay)} className="gap-1 text-xs">
              <UserPlus className="h-3 w-3" />
              {showRelay ? 'Masquer relais' : 'Ajouter relais'}
            </Button>
            {showRelay && (
              <div className="grid grid-cols-1 gap-3 mt-3 p-3 rounded-lg bg-muted/30 border">
                <div className="space-y-1.5">
                  <Label className="text-xs">Conducteur relais</Label>
                  <DriverSearchSelect
                    drivers={drivers}
                    value={relayDriverId}
                    onChange={v => setRelayDriverId(v)}
                    placeholder="Rechercher un relais..."
                    excludeId={driverId}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Heure relais</Label>
                  <Input type="time" value={relayTime} onChange={e => setRelayTime(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Lieu relais</Label>
                  <Input value={relayLocation} onChange={e => setRelayLocation(e.target.value)} placeholder="Aire de..." />
                </div>
              </div>
            )}
          </div>

          {/* Mission order */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs flex items-center gap-1"><FileText className="h-3 w-3" /> Ordre de mission</Label>
              {missionOrder.trim() && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1 text-xs h-7"
                  disabled={isRewriting}
                  onClick={handleRewriteODM}
                >
                  {isRewriting ? (
                    <><Loader2 className="h-3 w-3 animate-spin" /> Réécriture…</>
                  ) : (
                    <><Sparkles className="h-3 w-3" /> Régénérer</>
                  )}
                </Button>
              )}
            </div>
            <Textarea value={missionOrder} onChange={e => setMissionOrder(e.target.value)} placeholder="Instructions, références..." rows={4} />
          </div>

          {/* Delete section */}
          <div className="pt-4 border-t space-y-2">
            <Label className="text-xs text-destructive font-medium">Zone de suppression</Label>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" className="gap-1 text-destructive border-destructive/30 hover:bg-destructive/10 text-xs" onClick={handleDeleteTraction}>
                <Trash2 className="h-3 w-3" /> Supprimer toute la traction ({entries.length} jours)
              </Button>
            </div>
            {entries.length > 1 && (
              <div className="space-y-1 mt-2">
                <p className="text-[10px] text-muted-foreground">Ou supprimer des jours individuels :</p>
                <div className="flex flex-wrap gap-1">
                  {entries.map(entry => (
                    <Button
                      key={entry.id}
                      variant="ghost"
                      size="sm"
                      className="text-[10px] h-6 px-2 hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleDeleteDay(entry.id)}
                    >
                      <X className="h-2.5 w-2.5 mr-0.5" />
                      {new Date(entry.planning_date + 'T00:00').toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' })}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <SheetFooter className="mt-6 flex gap-2">
          <Button variant="outline" size="sm" onClick={generateDriverText} className="gap-1">
            <Copy className="h-3 w-3" /> Générer texte conducteur
          </Button>
          <Button size="sm" onClick={handleSaveAll} className="gap-1">
            <Save className="h-3 w-3" /> Enregistrer tout
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
