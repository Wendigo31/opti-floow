 import { useState, useEffect, useCallback } from 'react';
 import {
   Dialog,
   DialogContent,
   DialogHeader,
   DialogTitle,
   DialogFooter,
 } from '@/components/ui/dialog';
 import { Button } from '@/components/ui/button';
 import { Input } from '@/components/ui/input';
 import { Label } from '@/components/ui/label';
 import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
  import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
 } from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Trash2, Save, UserPlus, Truck, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
 import type { PlanningEntry, PlanningEntryInput } from '@/types/planning';
 import { planningStatusLabels } from '@/types/planning';
 import type { Vehicle } from '@/types/vehicle';
 import type { Driver } from '@/types';
 import type { ClientWithCreator } from '@/hooks/useClients';
 
interface PlanningEntryDialogProps {
   open: boolean;
   onOpenChange: (open: boolean) => void;
   entry: PlanningEntry | null;
   defaultValues: Partial<PlanningEntryInput>;
   clients: ClientWithCreator[];
   drivers: Driver[];
   vehicles: Vehicle[];
   allEntries?: PlanningEntry[];
   onSave: (input: PlanningEntryInput) => void;
   onDelete?: () => void;
  onApplyVehicleToTour?: (vehicleId: string, tourName: string) => void;
  onDeleteTourInWeek?: (tourName: string) => void;
}
 
 export function PlanningEntryDialog({
   open,
   onOpenChange,
   entry,
   defaultValues,
   clients,
   drivers,
   vehicles,
   allEntries = [],
   onSave,
   onDelete,
  onApplyVehicleToTour,
  onDeleteTourInWeek,
 }: PlanningEntryDialogProps) {
   const [formData, setFormData] = useState<PlanningEntryInput>({
     planning_date: '',
     start_time: null,
     end_time: null,
     client_id: null,
     driver_id: null,
     vehicle_id: null,
     mission_order: null,
     origin_address: null,
     destination_address: null,
     notes: null,
     status: 'planned',
     tour_name: null,
      relay_driver_id: null,
      relay_location: null,
      relay_time: null,
      sector_manager: null,
    });
   
   const [showRelay, setShowRelay] = useState(false);
  const [applyToAllTour, setApplyToAllTour] = useState(false);
  // Reset applyToAllTour when dialog opens
  useEffect(() => {
    if (open) {
      setApplyToAllTour(false);
    }
  }, [open]);
 
   useEffect(() => {
     if (entry) {
       setFormData({
         planning_date: entry.planning_date,
         start_time: entry.start_time,
         end_time: entry.end_time,
         client_id: entry.client_id,
         driver_id: entry.driver_id,
         vehicle_id: entry.vehicle_id,
         mission_order: entry.mission_order,
         origin_address: entry.origin_address,
         destination_address: entry.destination_address,
         notes: entry.notes,
         status: entry.status,
         tour_name: entry.tour_name,
          relay_driver_id: entry.relay_driver_id,
          relay_location: entry.relay_location,
          relay_time: entry.relay_time,
          sector_manager: entry.sector_manager,
        });
        setShowRelay(!!entry.relay_driver_id);
     } else {
       setFormData({
         planning_date: defaultValues.planning_date || '',
         start_time: defaultValues.start_time || null,
         end_time: defaultValues.end_time || null,
         client_id: defaultValues.client_id || null,
         driver_id: defaultValues.driver_id || null,
         vehicle_id: defaultValues.vehicle_id || null,
         mission_order: defaultValues.mission_order || null,
         origin_address: defaultValues.origin_address || null,
         destination_address: defaultValues.destination_address || null,
         notes: defaultValues.notes || null,
         status: defaultValues.status || 'planned',
         tour_name: defaultValues.tour_name || null,
          relay_driver_id: defaultValues.relay_driver_id || null,
          relay_location: defaultValues.relay_location || null,
          relay_time: defaultValues.relay_time || null,
          sector_manager: defaultValues.sector_manager || null,
       });
       setShowRelay(false);
     }
   }, [entry, defaultValues, open]);
 
   const handleSubmit = (e: React.FormEvent) => {
     e.preventDefault();
    
    // If user wants to apply vehicle to all entries of this tour
    if (applyToAllTour && formData.vehicle_id && entry?.tour_name && onApplyVehicleToTour) {
      onApplyVehicleToTour(formData.vehicle_id, entry.tour_name);
    }
    
     onSave(formData);
   };
 
   const selectedVehicle = vehicles.find(v => v.id === formData.vehicle_id);

   // Check if a vehicle with a license plate is already assigned to another entry on the same date
   const getVehicleConflict = useCallback((vehicleId: string | null): PlanningEntry | null => {
     if (!vehicleId || !formData.planning_date) return null;
     const vehicle = vehicles.find(v => v.id === vehicleId);
     if (!vehicle || !vehicle.licensePlate) return null; // No plate = generic type, no conflict
     
     return allEntries.find(e => 
       e.vehicle_id === vehicleId && 
       e.planning_date === formData.planning_date && 
       e.id !== entry?.id // Exclude current entry
     ) || null;
   }, [allEntries, vehicles, formData.planning_date, entry?.id]);

   const vehicleConflict = getVehicleConflict(formData.vehicle_id);

   // Check which vehicles are already taken on this date (with plate)
   const getVehicleAvailability = useCallback((vehicleId: string): { taken: boolean; byTour?: string } => {
     const vehicle = vehicles.find(v => v.id === vehicleId);
     if (!vehicle || !vehicle.licensePlate) return { taken: false }; // No plate = always available
     
     const conflict = allEntries.find(e => 
       e.vehicle_id === vehicleId && 
       e.planning_date === formData.planning_date && 
       e.id !== entry?.id
     );
     return conflict ? { taken: true, byTour: conflict.tour_name || undefined } : { taken: false };
   }, [allEntries, vehicles, formData.planning_date, entry?.id]);

  const handleClearCell = () => {
    if (!entry) return;
    onSave({
      ...formData,
      driver_id: null,
      relay_driver_id: null,
      relay_location: null,
      relay_time: null,
      // Clear Excel placeholders / content
      notes: null,
      mission_order: null,
      status: 'planned',
    });
    onOpenChange(false);
  };

  const handleDeleteTourWeek = () => {
    if (!entry?.tour_name || !onDeleteTourInWeek) return;
    const ok = window.confirm(`Supprimer toute la traction "${entry.tour_name}" sur la semaine affichée ?`);
    if (!ok) return;
    onDeleteTourInWeek(entry.tour_name);
    onOpenChange(false);
  };
 
   return (
     <Dialog open={open} onOpenChange={onOpenChange}>
       <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
         <DialogHeader>
           <DialogTitle>
             {entry ? 'Modifier l\'entrée' : 'Nouvelle entrée de planning'}
           </DialogTitle>
         </DialogHeader>
 
         <form onSubmit={handleSubmit} className="space-y-4">
           {/* Date and Time row */}
           <div className="grid grid-cols-3 gap-4">
             <div className="space-y-2">
               <Label htmlFor="planning_date">Date *</Label>
               <Input
                 id="planning_date"
                 type="date"
                 value={formData.planning_date}
                 onChange={(e) => setFormData(prev => ({ ...prev, planning_date: e.target.value }))}
                 required
               />
             </div>
             <div className="space-y-2">
               <Label htmlFor="start_time">Heure début</Label>
               <Input
                 id="start_time"
                 type="time"
                 value={formData.start_time || ''}
                 onChange={(e) => setFormData(prev => ({ ...prev, start_time: e.target.value || null }))}
               />
             </div>
             <div className="space-y-2">
               <Label htmlFor="end_time">Heure fin</Label>
               <Input
                 id="end_time"
                 type="time"
                 value={formData.end_time || ''}
                 onChange={(e) => setFormData(prev => ({ ...prev, end_time: e.target.value || null }))}
               />
             </div>
           </div>
 
           {/* Vehicle (Traction) section */}
           <div className="space-y-3 p-3 rounded-lg border bg-muted/20">
             <div className="flex items-center gap-2">
               <Truck className="h-4 w-4 text-primary" />
               <Label className="font-medium">Traction</Label>
               {!formData.vehicle_id && (
                 <span className="text-xs text-muted-foreground">(Non assigné)</span>
               )}
             </div>
              <div className="space-y-2">
                <SearchableSelect
                  value={formData.vehicle_id || ''}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, vehicle_id: value || null }))}
                  options={vehicles.map((vehicle) => {
                    const availability = getVehicleAvailability(vehicle.id);
                    const isGeneric = !vehicle.licensePlate;
                    return {
                      value: vehicle.id,
                      label: vehicle.name,
                      sublabel: isGeneric ? 'TYPE' : (vehicle.licensePlate || '') + (availability.taken ? ` (Déjà affecté${availability.byTour ? ` - ${availability.byTour}` : ''})` : ''),
                    };
                  })}
                  placeholder="Définir une traction"
                  emptyLabel="Aucune (Non assigné)"
                  searchPlaceholder="Rechercher un véhicule..."
                />
                
                {/* Warning if selected vehicle has a conflict */}
                {vehicleConflict && (
                  <div className="flex items-center gap-2 p-2 bg-destructive/10 rounded-md text-destructive text-xs">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span>
                      Ce véhicule immatriculé est déjà affecté le {formData.planning_date}
                      {vehicleConflict.tour_name && ` sur "${vehicleConflict.tour_name}"`}
                    </span>
                  </div>
                )}

                {/* Info about generic vs registered */}
                {selectedVehicle && !selectedVehicle.licensePlate && (
                  <p className="text-[10px] text-muted-foreground">
                    ℹ️ Véhicule-type (sans plaque) : peut être utilisé sur plusieurs tractions simultanément
                  </p>
                )}
                
                {/* Checkbox to apply vehicle to all entries of this tour */}
                {entry?.tour_name && formData.vehicle_id && onApplyVehicleToTour && (
                  <div className="flex items-center space-x-2 pt-2">
                    <Checkbox
                      id="applyToAllTour"
                      checked={applyToAllTour}
                      onCheckedChange={(checked) => setApplyToAllTour(checked === true)}
                    />
                    <label
                      htmlFor="applyToAllTour"
                      className="text-sm text-muted-foreground cursor-pointer"
                    >
                      Appliquer à toutes les missions "{entry.tour_name}"
                    </label>
                  </div>
                )}
              </div>
           </div>
 
           {/* Driver, Client row */}
           <div className="grid grid-cols-2 gap-4">
             <div className="space-y-2">
               <Label>Conducteur</Label>
                <SearchableSelect
                  value={formData.driver_id || ''}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, driver_id: value || null }))}
                  options={drivers.map((driver) => ({
                    value: driver.id,
                    label: driver.firstName && driver.lastName
                      ? `${driver.firstName} ${driver.lastName}`
                      : driver.name,
                  }))}
                  placeholder="Sélectionner un conducteur"
                  emptyLabel="Aucun"
                  searchPlaceholder="Rechercher un conducteur..."
                />
             </div>
 
             <div className="space-y-2">
               <Label>Client</Label>
                <SearchableSelect
                  value={formData.client_id || ''}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, client_id: value || null }))}
                  options={clients.map((client) => ({
                    value: client.id,
                    label: client.name,
                    sublabel: client.company || undefined,
                  }))}
                  placeholder="Sélectionner un client"
                  emptyLabel="Aucun"
                  searchPlaceholder="Rechercher un client..."
                />
             </div>
           </div>
 
           {/* Tour name (optional) */}
           <div className="space-y-2">
             <Label htmlFor="tour_name">Nom de la tournée (optionnel)</Label>
             <Input
               id="tour_name"
               value={formData.tour_name || ''}
               onChange={(e) => setFormData(prev => ({ ...prev, tour_name: e.target.value || null }))}
               placeholder="Ex: Navette Paris-Lyon"
             />
           </div>
 
           {/* Status */}
           <div className="space-y-2">
             <Label>Statut</Label>
             <Select
               value={formData.status}
               onValueChange={(value) => setFormData(prev => ({ ...prev, status: value as PlanningEntry['status'] }))}
             >
               <SelectTrigger>
                 <SelectValue />
               </SelectTrigger>
               <SelectContent>
                 {Object.entries(planningStatusLabels).map(([value, label]) => (
                   <SelectItem key={value} value={value}>
                     {label}
                   </SelectItem>
                 ))}
               </SelectContent>
             </Select>
           </div>
 
           {/* Addresses */}
           <div className="grid grid-cols-2 gap-4">
             <div className="space-y-2">
               <Label htmlFor="origin_address">Adresse de départ</Label>
               <Input
                 id="origin_address"
                 value={formData.origin_address || ''}
                 onChange={(e) => setFormData(prev => ({ ...prev, origin_address: e.target.value || null }))}
                 placeholder="Ex: 123 Rue de Paris, 75001 Paris"
               />
             </div>
             <div className="space-y-2">
               <Label htmlFor="destination_address">Adresse d'arrivée</Label>
               <Input
                 id="destination_address"
                 value={formData.destination_address || ''}
                 onChange={(e) => setFormData(prev => ({ ...prev, destination_address: e.target.value || null }))}
                 placeholder="Ex: 456 Avenue de Lyon, 69001 Lyon"
               />
             </div>
           </div>
 
           {/* Relay Driver Toggle */}
           <div className="space-y-3">
             <Button
               type="button"
               variant="outline"
               size="sm"
               onClick={() => setShowRelay(!showRelay)}
               className="gap-2"
             >
               <UserPlus className="h-4 w-4" />
               {showRelay ? 'Masquer le relais' : 'Ajouter un relais'}
             </Button>
             
             {showRelay && (
               <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
                 <div className="space-y-2">
                   <Label>Conducteur relais</Label>
                    <SearchableSelect
                      value={formData.relay_driver_id || ''}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, relay_driver_id: value || null }))}
                      options={drivers.filter(d => d.id !== formData.driver_id).map((driver) => ({
                        value: driver.id,
                        label: driver.firstName && driver.lastName
                          ? `${driver.firstName} ${driver.lastName}`
                          : driver.name,
                      }))}
                      placeholder="2ème conducteur"
                      emptyLabel="Aucun"
                      searchPlaceholder="Rechercher..."
                    />
                 </div>
                 <div className="space-y-2">
                   <Label htmlFor="relay_time">Heure de relais</Label>
                   <Input
                     id="relay_time"
                     type="time"
                     value={formData.relay_time || ''}
                     onChange={(e) => setFormData(prev => ({ ...prev, relay_time: e.target.value || null }))}
                   />
                 </div>
                 <div className="space-y-2">
                   <Label htmlFor="relay_location">Lieu de relais</Label>
                   <Input
                     id="relay_location"
                     value={formData.relay_location || ''}
                     onChange={(e) => setFormData(prev => ({ ...prev, relay_location: e.target.value || null }))}
                     placeholder="Ex: Aire de Mâcon"
                   />
                 </div>
               </div>
             )}
           </div>
 
            {/* Mission Order */}
            <div className="space-y-2">
              <Label htmlFor="mission_order">Ordre de mission</Label>
              <Textarea
                id="mission_order"
                value={formData.mission_order || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, mission_order: e.target.value || null }))}
                placeholder="Détails de la mission : instructions, références, contacts..."
                rows={4}
              />
            </div>

            {/* Sector Manager */}
            <div className="space-y-2">
              <Label htmlFor="sector_manager">Responsable de secteur</Label>
              <Input
                id="sector_manager"
                value={formData.sector_manager || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, sector_manager: e.target.value || null }))}
                placeholder="Ex: Jean Dupont"
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value || null }))}
                placeholder="Notes internes..."
                rows={2}
              />
            </div>
 
           <DialogFooter className="gap-2 sm:gap-0">
              <div className="mr-auto flex flex-wrap gap-2">
                {entry && (
                  <Button type="button" variant="outline" onClick={handleClearCell}>
                    Vider la case
                  </Button>
                )}

                {entry?.tour_name && onDeleteTourInWeek && (
                  <Button type="button" variant="destructive" onClick={handleDeleteTourWeek}>
                    Supprimer la traction (semaine)
                  </Button>
                )}

                {onDelete && (
                  <Button type="button" variant="destructive" onClick={onDelete}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Supprimer
                  </Button>
                )}
              </div>
             <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
               Annuler
             </Button>
             <Button type="submit" disabled={!formData.planning_date}>
               <Save className="h-4 w-4 mr-2" />
               {entry ? 'Modifier' : 'Créer'}
             </Button>
           </DialogFooter>
         </form>
       </DialogContent>
     </Dialog>
   );
 }