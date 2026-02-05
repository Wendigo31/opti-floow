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
 import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
 } from '@/components/ui/select';
 import { Trash2, Save } from 'lucide-react';
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
   });
 
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
       });
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
       });
     }
   }, [entry, defaultValues, open]);
 
   const handleSubmit = (e: React.FormEvent) => {
     e.preventDefault();
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
 
           {/* Vehicle (Traction), Driver, Client row */}
           <div className="grid grid-cols-3 gap-4">
             <div className="space-y-2">
               <Label>Traction *</Label>
               <Select
                 value={formData.vehicle_id || ''}
                 onValueChange={(value) => setFormData(prev => ({ ...prev, vehicle_id: value || null }))}
               >
                 <SelectTrigger>
                   <SelectValue placeholder="Sélectionner une traction" />
                 </SelectTrigger>
                 <SelectContent>
                   {vehicles.map((vehicle) => (
                     <SelectItem key={vehicle.id} value={vehicle.id}>
                       {vehicle.name} ({vehicle.licensePlate})
                     </SelectItem>
                   ))}
                 </SelectContent>
               </Select>
             </div>
 
             <div className="space-y-2">
               <Label>Conducteur</Label>
               <Select
                 value={formData.driver_id || ''}
                 onValueChange={(value) => setFormData(prev => ({ ...prev, driver_id: value || null }))}
               >
                 <SelectTrigger>
                   <SelectValue placeholder="Sélectionner un conducteur" />
                 </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="">Aucun</SelectItem>
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
                 onValueChange={(value) => setFormData(prev => ({ ...prev, client_id: value || null }))}
               >
                 <SelectTrigger>
                   <SelectValue placeholder="Sélectionner un client" />
                 </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="">Aucun</SelectItem>
                   {clients.map((client) => (
                     <SelectItem key={client.id} value={client.id}>
                       {client.name} {client.company && `(${client.company})`}
                     </SelectItem>
                   ))}
                 </SelectContent>
               </Select>
             </div>
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
             <Button type="submit" disabled={!formData.planning_date || !formData.vehicle_id}>
               <Save className="h-4 w-4 mr-2" />
               {entry ? 'Modifier' : 'Créer'}
             </Button>
           </DialogFooter>
         </form>
       </DialogContent>
     </Dialog>
   );
 }