 import { useEffect, useState } from 'react';
 import { toast } from 'sonner';
 import { parseDriversFromUrl, convertToDrivers } from '@/utils/driversExcelImport';
 import { useCloudDrivers } from '@/hooks/useCloudDrivers';
 import type { Driver } from '@/types';
 import { Loader2, CheckCircle, Users } from 'lucide-react';
 import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
 import { Button } from '@/components/ui/button';
 
 interface AutoImportDriversProps {
   fileUrl: string;
   onComplete?: (count: number) => void;
   onDismiss?: () => void;
 }
 
 export function AutoImportDrivers({ fileUrl, onComplete, onDismiss }: AutoImportDriversProps) {
   const [status, setStatus] = useState<'loading' | 'importing' | 'done' | 'error'>('loading');
   const [count, setCount] = useState(0);
   const [total, setTotal] = useState(0);
   const [error, setError] = useState<string | null>(null);
   const { createDriver, cdiDrivers, interimDrivers } = useCloudDrivers();
 
   useEffect(() => {
     let cancelled = false;
 
     async function importDrivers() {
       try {
         // Parse Excel file
         const parsed = await parseDriversFromUrl(fileUrl);
         
         if (cancelled) return;
         
         if (parsed.length === 0) {
           setError('Aucun conducteur trouvé dans le fichier');
           setStatus('error');
           return;
         }
 
         const drivers = convertToDrivers(parsed);
         setTotal(drivers.length);
         setStatus('importing');
 
         // Check for existing drivers to avoid duplicates
         const existingNames = new Set([
           ...cdiDrivers.map(d => d.name.toLowerCase()),
           ...interimDrivers.map(d => d.name.toLowerCase())
         ]);
 
         let importedCount = 0;
         
         for (const driver of drivers) {
           if (cancelled) return;
           
           // Skip if already exists
           if (existingNames.has(driver.name.toLowerCase())) {
             continue;
           }
 
           const success = await createDriver(driver as Driver, driver.isInterim);
           if (success) {
             importedCount++;
             setCount(importedCount);
           }
         }
 
         if (!cancelled) {
           setStatus('done');
           onComplete?.(importedCount);
           
           if (importedCount > 0) {
             toast.success(`${importedCount} conducteur(s) importé(s) avec succès`);
           } else {
             toast.info('Tous les conducteurs étaient déjà présents');
           }
         }
       } catch (err) {
         console.error('Auto-import error:', err);
         if (!cancelled) {
           setError(err instanceof Error ? err.message : 'Erreur lors de l\'import');
           setStatus('error');
         }
       }
     }
 
     importDrivers();
 
     return () => {
       cancelled = true;
     };
   }, [fileUrl, createDriver, cdiDrivers, interimDrivers, onComplete]);
 
   if (status === 'done') {
     return (
       <Alert className="bg-success/10 border-success/30">
         <CheckCircle className="h-4 w-4 text-success" />
         <AlertTitle>Import terminé</AlertTitle>
         <AlertDescription className="flex items-center justify-between">
           <span>{count} conducteur(s) ajouté(s) sur {total} détectés</span>
           {onDismiss && (
             <Button size="sm" variant="ghost" onClick={onDismiss}>
               Fermer
             </Button>
           )}
         </AlertDescription>
       </Alert>
     );
   }
 
   if (status === 'error') {
     return (
       <Alert variant="destructive">
         <AlertTitle>Erreur d'import</AlertTitle>
         <AlertDescription className="flex items-center justify-between">
           <span>{error}</span>
           {onDismiss && (
             <Button size="sm" variant="ghost" onClick={onDismiss}>
               Fermer
             </Button>
           )}
         </AlertDescription>
       </Alert>
     );
   }
 
   return (
     <Alert className="bg-primary/10 border-primary/30">
       <Loader2 className="h-4 w-4 animate-spin text-primary" />
       <AlertTitle className="flex items-center gap-2">
         <Users className="w-4 h-4" />
         Import des conducteurs en cours...
       </AlertTitle>
       <AlertDescription>
         {status === 'loading' 
           ? 'Analyse du fichier Excel...'
           : `${count} / ${total} conducteurs importés`
         }
       </AlertDescription>
     </Alert>
   );
 }