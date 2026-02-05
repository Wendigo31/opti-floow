 import { useState } from 'react';
 import {
   Dialog,
   DialogContent,
   DialogHeader,
   DialogTitle,
   DialogFooter,
   DialogDescription,
 } from '@/components/ui/dialog';
 import { Button } from '@/components/ui/button';
 import { Input } from '@/components/ui/input';
 import { Label } from '@/components/ui/label';
 import { Copy } from 'lucide-react';
 
 interface DuplicateWeeksDialogProps {
   open: boolean;
   onOpenChange: (open: boolean) => void;
   selectedCount: number;
   onDuplicate: (numWeeks: number) => Promise<boolean>;
 }
 
 export function DuplicateWeeksDialog({
   open,
   onOpenChange,
   selectedCount,
   onDuplicate,
 }: DuplicateWeeksDialogProps) {
   const [numWeeks, setNumWeeks] = useState(1);
   const [isSubmitting, setIsSubmitting] = useState(false);
 
   const handleSubmit = async (e: React.FormEvent) => {
     e.preventDefault();
     setIsSubmitting(true);
     const success = await onDuplicate(numWeeks);
     setIsSubmitting(false);
     if (success) {
       onOpenChange(false);
     }
   };
 
   return (
     <Dialog open={open} onOpenChange={onOpenChange}>
       <DialogContent>
         <DialogHeader>
           <DialogTitle className="flex items-center gap-2">
             <Copy className="h-5 w-5" />
             Dupliquer aux semaines suivantes
           </DialogTitle>
           <DialogDescription>
             {selectedCount} entrée(s) sélectionnée(s) seront dupliquées
           </DialogDescription>
         </DialogHeader>
 
         <form onSubmit={handleSubmit} className="space-y-4">
           <div className="space-y-2">
             <Label htmlFor="num_weeks">Nombre de semaines</Label>
             <Input
               id="num_weeks"
               type="number"
               min={1}
               max={52}
               value={numWeeks}
               onChange={(e) => setNumWeeks(parseInt(e.target.value) || 1)}
             />
             <p className="text-xs text-muted-foreground">
               {selectedCount * numWeeks} nouvelles entrées seront créées
             </p>
           </div>
 
           <DialogFooter>
             <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
               Annuler
             </Button>
             <Button type="submit" disabled={isSubmitting}>
               <Copy className="h-4 w-4 mr-2" />
               {isSubmitting ? 'Duplication...' : 'Dupliquer'}
             </Button>
           </DialogFooter>
         </form>
       </DialogContent>
     </Dialog>
   );
 }