import { useState } from 'react';
import { 
  Save, 
  X, 
  MapPin, 
  Building2, 
  FileText,
  Tag,
  User,
  Users,
  Check,
  Truck,
  Container
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
import type { SaveTourInput } from '@/types/savedTour';
import type { Driver } from '@/types/index';
import type { Vehicle } from '@/types/vehicle';
import type { Trailer } from '@/types/trailer';

interface Client {
  id: string;
  name: string;
  company?: string | null;
}

interface SaveTourDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (input: SaveTourInput) => Promise<void>;
  tourData: Omit<SaveTourInput, 'name' | 'client_id' | 'notes' | 'tags' | 'driver_ids' | 'drivers_data' | 'vehicle_id' | 'vehicle_data' | 'trailer_id' | 'trailer_data' | 'vehicle_ids' | 'vehicles_data'>;
  clients: Client[];
  drivers: Driver[];
  vehicles: Vehicle[];
  trailers: Trailer[];
  selectedDriverIds?: string[];
  selectedVehicleId?: string;
  selectedTrailerId?: string;
  saving?: boolean;
}

export function SaveTourDialog({
  open,
  onOpenChange,
  onSave,
  tourData,
  clients,
  drivers,
  vehicles,
  trailers,
  selectedDriverIds: initialSelectedDriverIds = [],
  selectedVehicleId: initialVehicleId = '',
  selectedTrailerId: initialTrailerId = '',
  saving = false,
}: SaveTourDialogProps) {
  const [name, setName] = useState('');
  const [clientId, setClientId] = useState<string>('');
  const [selectedVehicleIds, setSelectedVehicleIds] = useState<string[]>(initialVehicleId ? [initialVehicleId] : []);
  const [trailerId, setTrailerId] = useState<string>(initialTrailerId);
  const [selectedDriverIds, setSelectedDriverIds] = useState<string[]>(initialSelectedDriverIds);
  const [notes, setNotes] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);

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

  const toggleVehicle = (vehicleId: string) => {
    setSelectedVehicleIds(prev =>
      prev.includes(vehicleId)
        ? prev.filter(id => id !== vehicleId)
        : [...prev, vehicleId]
    );
  };

  const handleSave = async () => {
    if (!name.trim()) return;

    // Get driver data for the selected drivers
    const driversData = drivers.filter(d => selectedDriverIds.includes(d.id));
    const vehiclesData = vehicles.filter(v => selectedVehicleIds.includes(v.id));
    const primaryVehicleId = selectedVehicleIds[0] || null;
    const primaryVehicleData = primaryVehicleId ? vehicles.find(v => v.id === primaryVehicleId) || null : null;
    const trailerData = trailers.find(t => t.id === trailerId) || null;

    await onSave({
      ...tourData,
      name: name.trim(),
      client_id: clientId || null,
      vehicle_id: primaryVehicleId,
      vehicle_data: primaryVehicleData,
      vehicle_ids: selectedVehicleIds,
      vehicles_data: vehiclesData,
      trailer_id: trailerId || null,
      trailer_data: trailerData,
      driver_ids: selectedDriverIds,
      drivers_data: driversData,
      notes: notes.trim() || undefined,
      tags,
    });

    // Reset form
    setName('');
    setClientId('');
    setSelectedVehicleIds([]);
    setTrailerId('');
    setSelectedDriverIds([]);
    setNotes('');
    setTags([]);
    onOpenChange(false);
  };

  const formatCurrency = (value: number) => new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR'
  }).format(value);

  const selectedClient = clients.find(c => c.id === clientId);
  const selectedTrailer = trailers.find(t => t.id === trailerId);
  const selectedDriversList = drivers.filter(d => selectedDriverIds.includes(d.id));
  const selectedVehiclesList = vehicles.filter(v => selectedVehicleIds.includes(v.id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Save className="w-5 h-5 text-primary" />
            Sauvegarder la tournée
          </DialogTitle>
          <DialogDescription>
            Enregistrez ce calcul pour le retrouver plus tard
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-4 py-4">
            {/* Tour summary */}
            <div className="p-3 bg-muted/50 rounded-lg text-sm space-y-1">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" />
                <span className="text-muted-foreground truncate">
                  {tourData.origin_address} → {tourData.destination_address}
                </span>
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                <span>{tourData.distance_km} km</span>
                <span>Coût: {formatCurrency(tourData.total_cost)}</span>
                <span>CA: {formatCurrency(tourData.revenue)}</span>
                <span className={tourData.profit >= 0 ? 'text-success' : 'text-destructive'}>
                  Profit: {formatCurrency(tourData.profit)}
                </span>
              </div>
            </div>

            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="tour-name">Nom de la tournée *</Label>
              <Input
                id="tour-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Paris-Lyon Client X"
              />
            </div>

            {/* Client selection */}
            <div className="space-y-2">
              <Label htmlFor="tour-client" className="flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Client associé
              </Label>
              <Select value={clientId || "none"} onValueChange={(val) => setClientId(val === "none" ? "" : val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionnez un client (optionnel)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucun client</SelectItem>
                  {clients.filter(c => c.id).map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4" />
                        {client.name}
                        {client.company && <span className="text-muted-foreground">({client.company})</span>}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Multi-Vehicle selection */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Truck className="w-4 h-4" />
                Véhicule(s) — multi-relais
              </Label>
              {vehicles.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun véhicule configuré</p>
              ) : (
                <div className="border rounded-lg p-2 space-y-1 max-h-32 overflow-y-auto">
                  {vehicles.map((vehicle) => (
                    <div 
                      key={vehicle.id} 
                      className={`flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors ${
                        selectedVehicleIds.includes(vehicle.id) 
                          ? 'bg-primary/10 border border-primary/30' 
                          : 'hover:bg-muted/50'
                      }`}
                      onClick={() => toggleVehicle(vehicle.id)}
                    >
                      <Checkbox 
                        checked={selectedVehicleIds.includes(vehicle.id)}
                        onCheckedChange={() => toggleVehicle(vehicle.id)}
                      />
                      <Truck className="w-4 h-4 text-muted-foreground" />
                      <span className="flex-1 text-sm">
                        {vehicle.name}
                        {vehicle.licensePlate && <span className="text-muted-foreground ml-1">({vehicle.licensePlate})</span>}
                      </span>
                      {selectedVehicleIds.includes(vehicle.id) && (
                        <Check className="w-4 h-4 text-primary" />
                      )}
                    </div>
                  ))}
                </div>
              )}
              {selectedVehiclesList.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {selectedVehiclesList.map((vehicle) => (
                    <Badge key={vehicle.id} variant="secondary" className="text-xs cursor-pointer" onClick={() => toggleVehicle(vehicle.id)}>
                      <Truck className="w-3 h-3 mr-1" />
                      {vehicle.name}
                      <X className="w-3 h-3 ml-1" />
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Trailer selection */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Container className="w-4 h-4" />
                Remorque assignée
              </Label>
              <Select value={trailerId || "none"} onValueChange={(val) => setTrailerId(val === "none" ? "" : val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionnez une remorque (optionnel)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucune remorque</SelectItem>
                  {trailers.filter(t => t.id).map((trailer) => (
                    <SelectItem key={trailer.id} value={trailer.id}>
                      <div className="flex items-center gap-2">
                        <Container className="w-4 h-4" />
                        {trailer.name}
                        <span className="text-muted-foreground">({trailer.licensePlate})</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedTrailer && (
                <Badge variant="secondary" className="text-xs">
                  <Container className="w-3 h-3 mr-1" />
                  {selectedTrailer.name} - {selectedTrailer.brand} {selectedTrailer.model}
                </Badge>
              )}
            </div>

            {/* Driver selection */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Conducteur(s) assigné(s)
              </Label>
              
              {drivers.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun conducteur configuré</p>
              ) : (
                <div className="border rounded-lg p-2 space-y-1 max-h-32 overflow-y-auto">
                  {drivers.map((driver) => {
                    const typeLabel = driver.contractType === 'interim' ? 'Intérim'
                      : driver.contractType === 'cdd' ? 'CDD'
                      : driver.contractType === 'autre' ? 'Autre'
                      : 'CDI';
                    const typeColor = driver.contractType === 'interim' ? 'bg-amber-500/10 text-amber-700 border-amber-500/30'
                      : driver.contractType === 'cdd' ? 'bg-blue-500/10 text-blue-700 border-blue-500/30'
                      : driver.contractType === 'autre' ? 'bg-muted text-muted-foreground border-border'
                      : 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30';
                    return (
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
                      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${typeColor}`}>
                        {typeLabel}
                      </Badge>
                      {selectedDriverIds.includes(driver.id) && (
                        <Check className="w-4 h-4 text-primary" />
                      )}
                    </div>
                    );
                  })}
                </div>
              )}
              
              {selectedDriversList.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {selectedDriversList.map((driver) => (
                    <Badge key={driver.id} variant="secondary" className="text-xs">
                      <User className="w-3 h-3 mr-1" />
                      {driver.name}
                    </Badge>
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
                <Button type="button" variant="outline" onClick={handleAddTag}>
                  <Tag className="w-4 h-4" />
                </Button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
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
              <Label htmlFor="tour-notes" className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Notes
              </Label>
              <Textarea
                id="tour-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notes additionnelles..."
                rows={2}
              />
            </div>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button variant="gradient" onClick={handleSave} disabled={!name.trim() || saving}>
            {saving ? 'Sauvegarde...' : 'Sauvegarder'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
