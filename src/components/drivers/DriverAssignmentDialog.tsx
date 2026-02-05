 import { useState, useEffect } from 'react';
 import { Building2, MapPin, Route, Check, X, Users2 } from 'lucide-react';
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
 import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
 import { ScrollArea } from '@/components/ui/scroll-area';
 import { Badge } from '@/components/ui/badge';
 import { useCloudData } from '@/hooks/useCloudData';
 import { cn } from '@/lib/utils';
 
 interface DriverAssignmentDialogProps {
   open: boolean;
   onOpenChange: (open: boolean) => void;
   selectedDriverIds: string[];
   onAssign: (assignment: {
     type: 'client' | 'city' | 'tour';
     clientId?: string;
     city?: string;
     tourIds?: string[];
   }) => Promise<void>;
 }
 
 export function DriverAssignmentDialog({
   open,
   onOpenChange,
   selectedDriverIds,
   onAssign,
 }: DriverAssignmentDialogProps) {
   const { clients, tours } = useCloudData();
   const [activeTab, setActiveTab] = useState<'client' | 'city' | 'tour'>('client');
   const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
   const [city, setCity] = useState('');
   const [selectedTourIds, setSelectedTourIds] = useState<string[]>([]);
   const [searchTerm, setSearchTerm] = useState('');
   const [isSubmitting, setIsSubmitting] = useState(false);
 
   // Reset form when dialog opens
   useEffect(() => {
     if (open) {
       setSelectedClientId(null);
       setCity('');
       setSelectedTourIds([]);
       setSearchTerm('');
     }
   }, [open]);
 
   const filteredClients = clients.filter(c => 
     c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
     (c.company && c.company.toLowerCase().includes(searchTerm.toLowerCase()))
   );
 
   const filteredTours = tours.filter(t =>
     t.name.toLowerCase().includes(searchTerm.toLowerCase())
   );
 
   const handleSubmit = async () => {
     setIsSubmitting(true);
     try {
       if (activeTab === 'client' && selectedClientId) {
         await onAssign({ type: 'client', clientId: selectedClientId });
       } else if (activeTab === 'city' && city.trim()) {
         await onAssign({ type: 'city', city: city.trim() });
       } else if (activeTab === 'tour' && selectedTourIds.length > 0) {
         await onAssign({ type: 'tour', tourIds: selectedTourIds });
       }
       onOpenChange(false);
     } finally {
       setIsSubmitting(false);
     }
   };
 
   const toggleTourSelection = (tourId: string) => {
     setSelectedTourIds(prev => 
       prev.includes(tourId) 
         ? prev.filter(id => id !== tourId)
         : [...prev, tourId]
     );
   };
 
   const canSubmit = 
     (activeTab === 'client' && selectedClientId) ||
     (activeTab === 'city' && city.trim()) ||
     (activeTab === 'tour' && selectedTourIds.length > 0);
 
   return (
     <Dialog open={open} onOpenChange={onOpenChange}>
       <DialogContent className="max-w-lg">
         <DialogHeader>
           <DialogTitle className="flex items-center gap-2">
             <Users2 className="w-5 h-5" />
             Assigner {selectedDriverIds.length} conducteur{selectedDriverIds.length > 1 ? 's' : ''}
           </DialogTitle>
         </DialogHeader>
 
         <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
           <TabsList className="grid w-full grid-cols-3">
             <TabsTrigger value="client" className="gap-2">
               <Building2 className="w-4 h-4" />
               Client
             </TabsTrigger>
             <TabsTrigger value="city" className="gap-2">
               <MapPin className="w-4 h-4" />
               Ville
             </TabsTrigger>
             <TabsTrigger value="tour" className="gap-2">
               <Route className="w-4 h-4" />
               Tournée
             </TabsTrigger>
           </TabsList>
 
           <TabsContent value="client" className="mt-4 space-y-4">
             <div className="space-y-2">
               <Label>Rechercher un client</Label>
               <Input
                 placeholder="Nom ou société..."
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
               />
             </div>
             <ScrollArea className="h-64 border rounded-md">
               {filteredClients.length === 0 ? (
                 <div className="p-4 text-center text-muted-foreground text-sm">
                   Aucun client trouvé
                 </div>
               ) : (
                 <div className="p-2 space-y-1">
                   {filteredClients.map(client => (
                     <button
                       key={client.id}
                       onClick={() => setSelectedClientId(client.id)}
                       className={cn(
                         "w-full p-3 rounded-md text-left transition-colors",
                         selectedClientId === client.id
                           ? "bg-primary text-primary-foreground"
                           : "hover:bg-muted"
                       )}
                     >
                       <p className="font-medium">{client.name}</p>
                       {client.company && (
                         <p className={cn(
                           "text-sm",
                           selectedClientId === client.id ? "text-primary-foreground/70" : "text-muted-foreground"
                         )}>
                           {client.company}
                         </p>
                       )}
                     </button>
                   ))}
                 </div>
               )}
             </ScrollArea>
           </TabsContent>
 
           <TabsContent value="city" className="mt-4 space-y-4">
             <div className="space-y-2">
               <Label htmlFor="city">Ville de prise de poste</Label>
               <Input
                 id="city"
                 placeholder="Ex: Lyon, Paris, Marseille..."
                 value={city}
                 onChange={(e) => setCity(e.target.value)}
               />
               <p className="text-xs text-muted-foreground">
                 Les conducteurs sélectionnés seront assignés à cette ville comme point de départ habituel.
               </p>
             </div>
           </TabsContent>
 
           <TabsContent value="tour" className="mt-4 space-y-4">
             <div className="space-y-2">
               <Label>Rechercher une tournée</Label>
               <Input
                 placeholder="Nom de la tournée..."
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
               />
             </div>
             <ScrollArea className="h-64 border rounded-md">
               {filteredTours.length === 0 ? (
                 <div className="p-4 text-center text-muted-foreground text-sm">
                   Aucune tournée trouvée
                 </div>
               ) : (
                 <div className="p-2 space-y-1">
                   {filteredTours.map(tour => (
                     <button
                       key={tour.id}
                       onClick={() => toggleTourSelection(tour.id)}
                       className={cn(
                         "w-full p-3 rounded-md text-left transition-colors flex items-center justify-between",
                         selectedTourIds.includes(tour.id)
                           ? "bg-primary text-primary-foreground"
                           : "hover:bg-muted"
                       )}
                     >
                       <div>
                         <p className="font-medium">{tour.name}</p>
                         <p className={cn(
                           "text-sm",
                           selectedTourIds.includes(tour.id) ? "text-primary-foreground/70" : "text-muted-foreground"
                         )}>
                           {tour.origin_address?.split(',')[0]} → {tour.destination_address?.split(',')[0]}
                         </p>
                       </div>
                       {selectedTourIds.includes(tour.id) && (
                         <Check className="w-4 h-4" />
                       )}
                     </button>
                   ))}
                 </div>
               )}
             </ScrollArea>
             {selectedTourIds.length > 0 && (
               <div className="flex flex-wrap gap-1">
                 {selectedTourIds.map(id => {
                   const tour = tours.find(t => t.id === id);
                   return tour ? (
                     <Badge key={id} variant="secondary" className="gap-1">
                       {tour.name}
                       <button onClick={() => toggleTourSelection(id)}>
                         <X className="w-3 h-3" />
                       </button>
                     </Badge>
                   ) : null;
                 })}
               </div>
             )}
           </TabsContent>
         </Tabs>
 
         <DialogFooter>
           <Button variant="outline" onClick={() => onOpenChange(false)}>
             Annuler
           </Button>
           <Button onClick={handleSubmit} disabled={!canSubmit || isSubmitting}>
             <Check className="w-4 h-4 mr-2" />
             Assigner
           </Button>
         </DialogFooter>
       </DialogContent>
     </Dialog>
   );
 }