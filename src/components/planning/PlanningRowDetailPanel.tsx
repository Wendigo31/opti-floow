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
import { Save, Copy, FileText, MapPin, Clock, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import type { PlanningEntry, PlanningEntryInput } from '@/types/planning';
import type { Vehicle } from '@/types/vehicle';
import type { Driver } from '@/types';
import type { ClientWithCreator } from '@/hooks/useClients';

interface PlanningRowDetailPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entries: PlanningEntry[];
  clients: ClientWithCreator[];
  drivers: Driver[];
  vehicles: Vehicle[];
  onUpdateEntry: (id: string, updates: Partial<PlanningEntryInput>) => Promise<boolean>;
  onDeleteEntry: (id: string) => Promise<boolean>;
}

export function PlanningRowDetailPanel({
  open,
  onOpenChange,
  entries,
  clients,
  drivers,
  vehicles,
  onUpdateEntry,
  onDeleteEntry,
}: PlanningRowDetailPanelProps) {
  const first = entries.length > 0 ? entries[0] : null;

  const [tourName, setTourName] = useState('');
  const [missionOrder, setMissionOrder] = useState('');
  const [clientId, setClientId] = useState('');
  const [driverId, setDriverId] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [sectorManager, setSectorManager] = useState('');
  const [startTime, setStartTime] = useState('');
  const [originAddress, setOriginAddress] = useState('');
  const [destinationAddress, setDestinationAddress] = useState('');
  const [showRelay, setShowRelay] = useState(false);
  const [relayDriverId, setRelayDriverId] = useState('');
  const [relayTime, setRelayTime] = useState('');
  const [relayLocation, setRelayLocation] = useState('');

  useEffect(() => {
    if (open && first) {
      setTourName(first.tour_name || '');
      setMissionOrder(first.mission_order || '');
      setClientId(first.client_id || '');
      setDriverId(first.driver_id || '');
      setVehicleId(first.vehicle_id || '');
      setSectorManager(first.sector_manager || '');
      setStartTime(first.start_time || '');
      setOriginAddress(first.origin_address || '');
      setDestinationAddress(first.destination_address || '');
      setShowRelay(!!first.relay_driver_id);
      setRelayDriverId(first.relay_driver_id || '');
      setRelayTime(first.relay_time || '');
      setRelayLocation(first.relay_location || '');
    }
  }, [open, first]);

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
      mission_order: missionOrder || null,
      client_id: clientId || null,
      driver_id: driverId || null,
      vehicle_id: vehicleId || null,
      sector_manager: sectorManager || null,
      start_time: startTime || null,
      origin_address: originAddress || null,
      destination_address: destinationAddress || null,
      relay_driver_id: showRelay ? (relayDriverId || null) : null,
      relay_time: showRelay ? (relayTime || null) : null,
      relay_location: showRelay ? (relayLocation || null) : null,
    };

    let success = true;
    for (const entry of entries) {
      const ok = await onUpdateEntry(entry.id, updates);
      if (!ok) success = false;
    }
    if (success) {
      toast.success(`${entries.length} entrée(s) mise(s) à jour`);
      onOpenChange(false);
    }
  };

  const generateDriverText = () => {
    const lines: string[] = [];
    lines.push(`📋 ORDRE DE MISSION`);
    lines.push(`Ligne : ${tourName || 'Non définie'}`);
    if (clientName) lines.push(`Client : ${clientName}`);
    if (driverName) lines.push(`Conducteur : ${driverName}`);
    if (startTime) lines.push(`Prise de service : ${startTime}`);
    if (originAddress) lines.push(`Départ : ${originAddress}`);
    if (destinationAddress) lines.push(`Arrivée : ${destinationAddress}`);
    if (relayDriverId && showRelay) {
      const rd = drivers.find(d => d.id === relayDriverId);
      const rdName = rd?.firstName && rd?.lastName ? `${rd.firstName} ${rd.lastName}` : rd?.name || '';
      lines.push(`Relais : ${rdName} à ${relayTime || '?'} (${relayLocation || '?'})`);
    }
    if (missionOrder) {
      lines.push('');
      lines.push(`Instructions :`);
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
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-4 mt-6">
          <div className="space-y-1.5">
            <Label className="text-xs">Ligne (nom de tournée)</Label>
            <Input value={tourName} onChange={e => setTourName(e.target.value)} placeholder="Nom de la ligne" />
          </div>

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

          <div className="space-y-1.5">
            <Label className="text-xs">Responsable secteur</Label>
            <Input value={sectorManager} onChange={e => setSectorManager(e.target.value)} placeholder="Nom du responsable" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Conducteur titulaire</Label>
            <Select value={driverId || '_none'} onValueChange={v => setDriverId(v === '_none' ? '' : v)}>
              <SelectTrigger><SelectValue placeholder="Conducteur" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">Aucun</SelectItem>
                {drivers.map(d => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.firstName && d.lastName ? `${d.firstName} ${d.lastName}` : d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Véhicule</Label>
            <Select value={vehicleId || '_none'} onValueChange={v => setVehicleId(v === '_none' ? '' : v)}>
              <SelectTrigger><SelectValue placeholder="Véhicule" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">Aucun</SelectItem>
                {vehicles.map(v => <SelectItem key={v.id} value={v.id}>{v.name} ({v.licensePlate})</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1"><Clock className="h-3 w-3" /> Heure prise de service</Label>
            <Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1"><MapPin className="h-3 w-3" /> Adresse de départ</Label>
            <Input value={originAddress} onChange={e => setOriginAddress(e.target.value)} placeholder="Adresse de départ" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1"><MapPin className="h-3 w-3" /> Adresse d'arrivée</Label>
            <Input value={destinationAddress} onChange={e => setDestinationAddress(e.target.value)} placeholder="Adresse d'arrivée" />
          </div>

          <div>
            <Button type="button" variant="outline" size="sm" onClick={() => setShowRelay(!showRelay)} className="gap-1 text-xs">
              <UserPlus className="h-3 w-3" />
              {showRelay ? 'Masquer relais' : 'Ajouter relais'}
            </Button>
            {showRelay && (
              <div className="grid grid-cols-1 gap-3 mt-3 p-3 rounded-lg bg-muted/30 border">
                <div className="space-y-1.5">
                  <Label className="text-xs">Conducteur relais</Label>
                  <Select value={relayDriverId || '_none'} onValueChange={v => setRelayDriverId(v === '_none' ? '' : v)}>
                    <SelectTrigger><SelectValue placeholder="Relais" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">Aucun</SelectItem>
                      {drivers.filter(d => d.id !== driverId).map(d => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.firstName && d.lastName ? `${d.firstName} ${d.lastName}` : d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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

          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1"><FileText className="h-3 w-3" /> Ordre de mission</Label>
            <Textarea value={missionOrder} onChange={e => setMissionOrder(e.target.value)} placeholder="Instructions, références..." rows={4} />
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
