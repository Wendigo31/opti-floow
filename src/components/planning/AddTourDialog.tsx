import { useState, useEffect } from 'react';
import { useSavedTours } from '@/hooks/useSavedTours';
import type { SavedTour } from '@/types/savedTour';
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
 import { Switch } from '@/components/ui/switch';
 import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
 } from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Plus, UserPlus, Save, FileText, ChevronDown, Loader2 } from 'lucide-react';
 import { dayLabels, fullDayLabels } from '@/types/planning';
 import type { TourInput } from '@/types/planning';
 import type { Vehicle } from '@/types/vehicle';
 import type { Driver } from '@/types';
 import type { ClientWithCreator } from '@/hooks/useClients';
 import { format } from 'date-fns';
 
 interface AddTourDialogProps {
   open: boolean;
   onOpenChange: (open: boolean) => void;
   clients: ClientWithCreator[];
   drivers: Driver[];
   vehicles: Vehicle[];
   onSave: (input: TourInput, weeksAhead?: number) => Promise<boolean>;
 }
 
 export function AddTourDialog({
   open,
   onOpenChange,
   clients,
   drivers,
   vehicles,
   onSave,
 }: AddTourDialogProps) {
   const [formData, setFormData] = useState<TourInput>({
     tour_name: '',
     vehicle_id: '',
     client_id: null,
     driver_id: null,
     recurring_days: [],
     is_all_year: false,
     start_date: format(new Date(), 'yyyy-MM-dd'),
     end_date: null,
     start_time: null,
     end_time: null,
     origin_address: null,
     destination_address: null,
     mission_order: null,
     notes: null,
     relay_driver_id: null,
     relay_location: null,
     relay_time: null,
   });
   
   const [showRelay, setShowRelay] = useState(false);
   const [weeksAhead, setWeeksAhead] = useState(4);
   const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSavedTours, setShowSavedTours] = useState(false);
  
  // Load saved tours
  const { tours: savedTours, loading: loadingSavedTours } = useSavedTours();
 
   const toggleDay = (dayIndex: number) => {
     setFormData(prev => ({
       ...prev,
       recurring_days: prev.recurring_days.includes(dayIndex)
         ? prev.recurring_days.filter(d => d !== dayIndex)
         : [...prev.recurring_days, dayIndex].sort((a, b) => a - b),
     }));
   };
 
   const selectAllWeekdays = () => {
     setFormData(prev => ({
       ...prev,
       recurring_days: [0, 1, 2, 3, 4], // Lun-Ven
     }));
   };
 
   const selectAllDays = () => {
     setFormData(prev => ({
       ...prev,
       recurring_days: [0, 1, 2, 3, 4, 5, 6],
     }));
   };
 
  const loadFromSavedTour = (tour: SavedTour) => {
    setFormData(prev => ({
      ...prev,
      tour_name: tour.name,
      client_id: tour.client_id || null,
      driver_id: tour.driver_ids?.[0] || null,
      vehicle_id: tour.vehicle_id || prev.vehicle_id,
      origin_address: tour.origin_address || null,
      destination_address: tour.destination_address || null,
      notes: tour.notes || null,
      relay_driver_id: tour.driver_ids?.[1] || null,
    }));
    
    if (tour.driver_ids && tour.driver_ids.length > 1) {
      setShowRelay(true);
    }
    
    setShowSavedTours(false);
  };

   const handleSubmit = async (e: React.FormEvent) => {
     e.preventDefault();
     if (!formData.tour_name || !formData.vehicle_id || formData.recurring_days.length === 0) {
       return;
     }
     
     setIsSubmitting(true);
     const success = await onSave(formData, formData.is_all_year ? 52 : weeksAhead);
     setIsSubmitting(false);
     
     if (success) {
       onOpenChange(false);
       // Reset form
       setFormData({
         tour_name: '',
         vehicle_id: '',
         client_id: null,
         driver_id: null,
         recurring_days: [],
         is_all_year: false,
         start_date: format(new Date(), 'yyyy-MM-dd'),
         end_date: null,
         start_time: null,
         end_time: null,
         origin_address: null,
         destination_address: null,
         mission_order: null,
         notes: null,
         relay_driver_id: null,
         relay_location: null,
         relay_time: null,
       });
       setShowRelay(false);
     }
   };
 
   return (
     <Dialog open={open} onOpenChange={onOpenChange}>
       <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
         <DialogHeader>
           <DialogTitle className="flex items-center gap-2">
             <Plus className="h-5 w-5" />
             Ajouter une tournée
           </DialogTitle>
         </DialogHeader>
 
         <form onSubmit={handleSubmit} className="space-y-4">
            {/* Load from saved tours */}
            <Collapsible open={showSavedTours} onOpenChange={setShowSavedTours}>
              <CollapsibleTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-between"
                >
                  <span className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Charger depuis une tournée enregistrée
                    {savedTours.length > 0 && (
                      <Badge variant="secondary" className="ml-2">
                        {savedTours.length}
                      </Badge>
                    )}
                  </span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${showSavedTours ? 'rotate-180' : ''}`} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2">
                <div className="border rounded-lg p-2 bg-muted/30">
                  {loadingSavedTours ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      <span className="ml-2 text-sm text-muted-foreground">Chargement...</span>
                    </div>
                  ) : savedTours.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Aucune tournée enregistrée
                    </p>
                  ) : (
                    <ScrollArea className="h-48">
                      <div className="space-y-1">
                        {savedTours.map((tour) => (
                          <button
                            key={tour.id}
                            type="button"
                            onClick={() => loadFromSavedTour(tour)}
                            className="w-full text-left p-2 rounded hover:bg-accent transition-colors"
                          >
                            <div className="font-medium text-sm">{tour.name}</div>
                            <div className="text-xs text-muted-foreground truncate">
                              {tour.origin_address} → {tour.destination_address}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-muted-foreground">
                                {tour.distance_km} km
                              </span>
                              {tour.driver_ids && tour.driver_ids.length > 1 && (
                                <Badge variant="outline" className="text-xs">
                                  {tour.driver_ids.length} conducteurs
                                </Badge>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>

           {/* Tour name and Vehicle */}
           <div className="grid grid-cols-2 gap-4">
             <div className="space-y-2">
               <Label htmlFor="tour_name">Nom de la tournée *</Label>
               <Input
                 id="tour_name"
                 value={formData.tour_name}
                 onChange={(e) => setFormData(prev => ({ ...prev, tour_name: e.target.value }))}
                 placeholder="Ex: Navette Paris-Lyon"
                 required
               />
             </div>
             <div className="space-y-2">
               <Label>Traction *</Label>
               <Select
                 value={formData.vehicle_id}
                 onValueChange={(value) => setFormData(prev => ({ ...prev, vehicle_id: value }))}
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
           </div>
 
           {/* Days selection */}
           <div className="space-y-3">
             <div className="flex items-center justify-between">
               <Label>Jours de circulation *</Label>
               <div className="flex gap-2">
                 <Button type="button" variant="outline" size="sm" onClick={selectAllWeekdays}>
                   Lun-Ven
                 </Button>
                 <Button type="button" variant="outline" size="sm" onClick={selectAllDays}>
                   Tous
                 </Button>
               </div>
             </div>
             <div className="flex gap-2 flex-wrap">
               {dayLabels.map((label, index) => (
                 <button
                   key={index}
                   type="button"
                   onClick={() => toggleDay(index)}
                   className={`
                     px-4 py-2 rounded-lg font-medium text-sm transition-colors
                     ${formData.recurring_days.includes(index)
                       ? 'bg-primary text-primary-foreground'
                       : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                     }
                   `}
                 >
                   {label}
                 </button>
               ))}
             </div>
             {formData.recurring_days.length === 0 && (
               <p className="text-xs text-destructive">Sélectionnez au moins un jour</p>
             )}
           </div>
 
           {/* Duration */}
           <div className="space-y-3">
             <div className="flex items-center gap-4">
               <div className="flex items-center gap-2">
                 <Switch
                   id="is_all_year"
                   checked={formData.is_all_year}
                   onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_all_year: checked }))}
                 />
                 <Label htmlFor="is_all_year">Toute l'année</Label>
               </div>
             </div>
             
             <div className="grid grid-cols-3 gap-4">
               <div className="space-y-2">
                 <Label htmlFor="start_date">Date de début *</Label>
                 <Input
                   id="start_date"
                   type="date"
                   value={formData.start_date}
                   onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                   required
                 />
               </div>
               {!formData.is_all_year && (
                 <>
                   <div className="space-y-2">
                     <Label htmlFor="end_date">Date de fin</Label>
                     <Input
                       id="end_date"
                       type="date"
                       value={formData.end_date || ''}
                       onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value || null }))}
                     />
                   </div>
                   <div className="space-y-2">
                     <Label htmlFor="weeks_ahead">Ou nb semaines</Label>
                     <Input
                       id="weeks_ahead"
                       type="number"
                       min={1}
                       max={52}
                       value={weeksAhead}
                       onChange={(e) => setWeeksAhead(parseInt(e.target.value) || 4)}
                       disabled={!!formData.end_date}
                     />
                   </div>
                 </>
               )}
             </div>
           </div>
 
           {/* Time and Client/Driver */}
           <div className="grid grid-cols-4 gap-4">
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
             <div className="space-y-2">
               <Label>Client</Label>
               <Select
                 value={formData.client_id || ''}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, client_id: value === 'none' ? null : (value || null) }))}
               >
                 <SelectTrigger>
                   <SelectValue placeholder="Client" />
                 </SelectTrigger>
                 <SelectContent>
                    <SelectItem value="none">Aucun</SelectItem>
                   {clients.map((client) => (
                     <SelectItem key={client.id} value={client.id}>
                       {client.name}
                     </SelectItem>
                   ))}
                 </SelectContent>
               </Select>
             </div>
             <div className="space-y-2">
               <Label>Conducteur</Label>
               <Select
                 value={formData.driver_id || ''}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, driver_id: value === 'none' ? null : (value || null) }))}
               >
                 <SelectTrigger>
                   <SelectValue placeholder="Conducteur" />
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
 
           {/* Addresses */}
           <div className="grid grid-cols-2 gap-4">
             <div className="space-y-2">
               <Label htmlFor="origin_address">Adresse départ</Label>
               <Input
                 id="origin_address"
                 value={formData.origin_address || ''}
                 onChange={(e) => setFormData(prev => ({ ...prev, origin_address: e.target.value || null }))}
                 placeholder="Ex: Entrepôt Paris"
               />
             </div>
             <div className="space-y-2">
               <Label htmlFor="destination_address">Adresse arrivée</Label>
               <Input
                 id="destination_address"
                 value={formData.destination_address || ''}
                 onChange={(e) => setFormData(prev => ({ ...prev, destination_address: e.target.value || null }))}
                 placeholder="Ex: Entrepôt Lyon"
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
               placeholder="Instructions, références, contacts..."
               rows={3}
             />
           </div>
 
           <DialogFooter>
             <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
               Annuler
             </Button>
             <Button 
               type="submit" 
               disabled={!formData.tour_name || !formData.vehicle_id || formData.recurring_days.length === 0 || isSubmitting}
             >
               <Save className="h-4 w-4 mr-2" />
               {isSubmitting ? 'Création...' : 'Créer la tournée'}
             </Button>
           </DialogFooter>
         </form>
       </DialogContent>
     </Dialog>
   );
 }