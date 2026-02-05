 import { useState, useEffect } from 'react';
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
import { Trash2, Save, UserPlus, Truck } from 'lucide-react';
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
   onSave: (input: PlanningEntryInput) => void;
   onDelete?: () => void;
  onApplyVehicleToTour?: (vehicleId: string, tourName: string) => void;
 }
 
 export function PlanningEntryDialog({
   open,
   onOpenChange,
   entry,
   defaultValues,
   clients,
   drivers,
   vehicles,
   onSave,
   onDelete,
  onApplyVehicleToTour,
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
               <Select
                 value={formData.vehicle_id || 'none'}
                 onValueChange={(value) => setFormData(prev => ({ ...prev, vehicle_id: value === 'none' ? null : value }))}
               >
                 <SelectTrigger>
                   <SelectValue placeholder="Définir une traction" />
                 </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="none">Aucune (Non assigné)</SelectItem>
                   {vehicles.map((vehicle) => (
                     <SelectItem key={vehicle.id} value={vehicle.id}>
                       {vehicle.name} ({vehicle.licensePlate})
                     </SelectItem>
                   ))}
                 </SelectContent>
               </Select>
               
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
               <Select
                 value={formData.driver_id || ''}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, driver_id: value === 'none' ? null : (value || null) }))}
               >
                 <SelectTrigger>
                   <SelectValue placeholder="Sélectionner un conducteur" />
                 </SelectTrigger>
                 <SelectContent>
                    <SelectItem value="none">Aucun</SelectItem>
                   {drivers.map((driver) => (
                     <SelectItem key={driver.id} value={driver.id}>
                       {driver.name}
                     </SelectItem>
                   ))}
                 </SelectContent>
               </Select>
             </div>
 
             <div className="space-y-2">
               <Label>Client</Label>
               <Select
                 value={formData.client_id || ''}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, client_id: value === 'none' ? null : (value || null) }))}
               >
                 <SelectTrigger>
                   <SelectValue placeholder="Sélectionner un client" />
                 </SelectTrigger>
                 <SelectContent>
                    <SelectItem value="none">Aucun</SelectItem>
                   {clients.map((client) => (
                     <SelectItem key={client.id} value={client.id}>
                       {client.name} {client.company && `(${client.company})`}
                     </SelectItem>
                   ))}
                 </SelectContent>
               </Select>
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
                   <Select
                     value={formData.relay_driver_id || ''}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, relay_driver_id: value === 'none' ? null : (value || null) }))}
                   >
                     <SelectTrigger>
                       <SelectValue placeholder="2ème conducteur" />
                     </SelectTrigger>
                     <SelectContent>
                        <SelectItem value="none">Aucun</SelectItem>
                       {drivers.filter(d => d.id !== formData.driver_id).map((driver) => (
                         <SelectItem key={driver.id} value={driver.id}>
                           {driver.name}
                         </SelectItem>
                       ))}
                     </SelectContent>
                   </Select>
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
             {onDelete && (
               <Button
                 type="button"
                 variant="destructive"
                 onClick={onDelete}
                 className="mr-auto"
               >
                 <Trash2 className="h-4 w-4 mr-2" />
                 Supprimer
               </Button>
             )}
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