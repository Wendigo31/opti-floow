 import { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, Download, Check, AlertCircle, Loader2, FileText } from 'lucide-react';
 import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
 import { Button } from '@/components/ui/button';
 import { Badge } from '@/components/ui/badge';
 import { ScrollArea } from '@/components/ui/scroll-area';
 import { parseExcelFile } from '@/utils/excelImport';
 import { parsePlanningExcel, convertToTourInputs, type ParsedPlanningEntry } from '@/utils/planningExcelImport';
import type { ExcelTourInput } from '@/hooks/usePlanning';
import { downloadPlanningTemplate } from '@/utils/excelTemplates';
 import { toast } from 'sonner';
import { format } from 'date-fns';
 import { dayLabels } from '@/types/planning';
 import type { Vehicle } from '@/types/vehicle';
 import type { Driver } from '@/types';
 import type { ClientWithCreator } from '@/hooks/useClients';
 
 interface ImportPlanningDialogProps {
   open: boolean;
   onOpenChange: (open: boolean) => void;
   vehicles: Vehicle[];
   drivers: Driver[];
   clients: ClientWithCreator[];
  /**
   * Week reference used to anchor recurring days to actual dates.
   * We intentionally do NOT use the import day (today) to avoid empty weeks.
   */
  weekStartDate: Date;
  onImport: (entries: ExcelTourInput[]) => Promise<boolean>;
  /** Silent create client function (for auto-creating missing clients) */
  onAutoCreateClient?: (name: string) => Promise<string | null>;
 }
 
 export function ImportPlanningDialog({
   open,
   onOpenChange,
   vehicles,
   drivers,
   clients,
  weekStartDate,
   onImport,
  onAutoCreateClient,
 }: ImportPlanningDialogProps) {
   const [file, setFile] = useState<File | null>(null);
   const [loading, setLoading] = useState(false);
   const [importing, setImporting] = useState(false);
   const [preview, setPreview] = useState<ParsedPlanningEntry[]>([]);
   const [error, setError] = useState<string | null>(null);
   const fileInputRef = useRef<HTMLInputElement>(null);
 
   const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
     const selectedFile = e.target.files?.[0];
     if (!selectedFile) return;
 
     setFile(selectedFile);
     setError(null);
     setLoading(true);
 
     try {
      // Use setTimeout to allow UI to update before heavy parsing
      await new Promise(resolve => setTimeout(resolve, 50));
      
       const workbook = await parseExcelFile(selectedFile);
       const data = parsePlanningExcel(workbook);
       
       if (data.length === 0) {
         setError('Aucune donnée valide trouvée dans le fichier');
         setPreview([]);
       } else {
         setPreview(data);
       }
     } catch (err) {
       console.error('Error parsing file:', err);
       setError(err instanceof Error ? err.message : 'Erreur de lecture du fichier');
       setPreview([]);
     } finally {
       setLoading(false);
     }
   };
 
   const handleImport = async () => {
      if (preview.length === 0) {
        toast.error('Aucune donnée à importer');
       return;
     }
 
     setImporting(true);
     
     try {
       // Build initial maps for matching
       const clientMap = new Map<string, string>();
       clients.forEach(c => {
         if (c.name) clientMap.set(c.name.toLowerCase().trim(), c.id);
         if (c.company) clientMap.set(c.company.toLowerCase().trim(), c.id);
       });
      // Build driver map with firstName/lastName for improved matching
      const driverMap = new Map<string, { id: string; firstName?: string; lastName?: string }>();
      drivers.forEach(d => {
        driverMap.set(d.name, {
          id: d.id,
          firstName: d.firstName,
          lastName: d.lastName,
        });
      });
       
       // Auto-create missing clients (silently)
       const missingClients = new Set<string>();
       for (const entry of preview) {
         if (!entry.client) continue;
         const clientLower = entry.client.toLowerCase().trim();
         if (!clientMap.has(clientLower)) {
           missingClients.add(entry.client);
         }
       }

       if (missingClients.size > 0 && onAutoCreateClient) {
         for (const clientName of missingClients) {
           const newId = await onAutoCreateClient(clientName);
           if (newId) {
             clientMap.set(clientName.toLowerCase().trim(), newId);
           }
         }
       }

       // Convert to TourInput format
        const tourInputs = convertToTourInputs(
         preview,
         clientMap,
         driverMap,
        null, // No default vehicle - entries go to "Non assigné"
         format(weekStartDate, 'yyyy-MM-dd') // Anchor to displayed week start
       );
       
       // Filter out entries with no meaningful data and add required fields
        const validInputs = tourInputs
         .filter(t => t.tour_name && t.recurring_days && t.recurring_days.length > 0)
           .map((t): ExcelTourInput => ({
           ...t,
           tour_name: t.tour_name!,
          vehicle_id: null, // Always null - user will assign later
            recurring_days: t.recurring_days || [0, 1, 2, 3, 4, 5],
            is_all_year: false,
            start_date: format(weekStartDate, 'yyyy-MM-dd'),
           sector_manager: t.sector_manager || null,
            day_notes: t.day_notes,
         }));

      if (validInputs.length === 0) {
        toast.error('Aucune tournée valide à importer');
        setImporting(false);
        return;
      }

      // Batch import: one call, one refetch (handled by parent)
      const success = await onImport(validInputs);

      if (!success) {
        toast.error('Import incomplet : certaines tournées n\'ont pas pu être créées');
        return;
      }

      toast.success(`${validInputs.length} tournée(s) importée(s) avec succès`);
      handleClose();
     } catch (err) {
       console.error('Error importing:', err);
       toast.error('Erreur lors de l\'import');
     } finally {
       setImporting(false);
     }
   };
 
   const handleClose = () => {
     setFile(null);
     setPreview([]);
     setError(null);
     onOpenChange(false);
   };
 
   return (
      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          if (nextOpen) {
            onOpenChange(true);
            return;
          }
          handleClose();
        }}
      >
       <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
         <DialogHeader>
           <DialogTitle className="flex items-center gap-2">
             <FileSpreadsheet className="w-5 h-5 text-primary" />
             Importer un planning depuis Excel
           </DialogTitle>
           <DialogDescription>
             Importez vos tournées depuis un fichier Excel avec les colonnes: Client, Ligne, Titulaire, Commentaire/ODM
           </DialogDescription>
         </DialogHeader>
 
         <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {/* Download template button */}
          <div className="flex justify-end">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={downloadPlanningTemplate}
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              Télécharger le modèle Excel
            </Button>
          </div>

           {/* Upload zone */}
           <div 
             className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors cursor-pointer"
             onClick={() => fileInputRef.current?.click()}
           >
             <input
               ref={fileInputRef}
               type="file"
               accept=".xlsx,.xls,.csv"
               onChange={handleFileChange}
               className="hidden"
             />
             {loading ? (
               <Loader2 className="w-10 h-10 mx-auto mb-3 text-primary animate-spin" />
             ) : (
               <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
             )}
             <p className="text-sm font-medium text-foreground">
               {file ? file.name : 'Cliquez pour sélectionner un fichier'}
             </p>
             <p className="text-xs text-muted-foreground mt-1">
               Formats supportés: .xlsx, .xls, .csv
             </p>
           </div>
 
           {/* Error */}
           {error && (
             <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive text-sm">
               <AlertCircle className="w-4 h-4 flex-shrink-0" />
               {error}
             </div>
           )}
 
           {/* Info banner */}
           {preview.length > 0 && (
             <div className="p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground">
               <p>Les missions seront importées dans <strong className="text-foreground">"Non assigné"</strong>.</p>
               <p className="mt-1">Cliquez ensuite sur chaque mission pour définir le véhicule.</p>
             </div>
           )}
 
           {/* Preview */}
           {preview.length > 0 && (
             <div className="space-y-2 flex-1 overflow-hidden flex flex-col">
               <div className="flex items-center justify-between">
                 <p className="text-sm font-medium">
                   Aperçu ({preview.length} tournées)
                 </p>
                 <Badge variant="secondary" className="bg-success/20 text-success">
                   <Check className="w-3 h-3 mr-1" />
                   Fichier valide
                 </Badge>
               </div>
               <ScrollArea className="flex-1 border rounded-lg">
                 <table className="w-full text-sm">
                   <thead className="bg-muted/50 sticky top-0">
                     <tr>
                       <th className="text-left p-2">Client</th>
                       <th className="text-left p-2">Ligne</th>
                       <th className="text-left p-2">Conducteur</th>
                       <th className="text-left p-2">Jours</th>
                       <th className="text-left p-2">Horaires</th>
                     </tr>
                   </thead>
                   <tbody>
                     {preview.slice(0, 20).map((item, index) => (
                       <tr key={index} className="border-t border-border/50 hover:bg-muted/30">
                         <td className="p-2 max-w-[120px]">
                           <div className="truncate font-medium" title={item.client}>
                             {item.client || '-'}
                           </div>
                         </td>
                         <td className="p-2 max-w-[180px]">
                           <div className="truncate" title={item.ligne}>
                             {item.ligne || '-'}
                           </div>
                           {item.origin_address && item.destination_address && (
                             <div className="text-xs text-muted-foreground truncate">
                               {item.origin_address} → {item.destination_address}
                             </div>
                           )}
                         </td>
                         <td className="p-2 max-w-[120px]">
                           <div className="truncate" title={item.driver_name}>
                             {item.driver_name || '-'}
                           </div>
                         </td>
                         <td className="p-2">
                           <div className="flex gap-1 flex-wrap">
                             {item.recurring_days.map(d => (
                               <Badge key={d} variant="outline" className="text-[10px] px-1">
                                 {dayLabels[d]}
                               </Badge>
                             ))}
                             {item.recurring_days.length === 0 && (
                               <span className="text-muted-foreground text-xs">-</span>
                             )}
                           </div>
                         </td>
                         <td className="p-2 text-xs">
                           {item.start_time && item.end_time ? (
                             `${item.start_time} - ${item.end_time}`
                           ) : item.start_time || item.end_time || '-'}
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
                 {preview.length > 20 && (
                   <p className="text-xs text-muted-foreground text-center py-2">
                     ... et {preview.length - 20} autres
                   </p>
                 )}
               </ScrollArea>
               
               {/* Mission order preview */}
               <div className="p-3 bg-muted/30 rounded-lg space-y-2">
                 <div className="flex items-center gap-2 text-sm font-medium">
                   <FileText className="w-4 h-4" />
                   Aperçu des ordres de mission
                 </div>
                 <ScrollArea className="h-24">
                   <div className="space-y-1">
                     {preview.filter(p => p.mission_order).slice(0, 5).map((item, index) => (
                       <div key={index} className="text-xs p-2 bg-background rounded border">
                         <span className="font-medium">{item.client || item.ligne}:</span>
                         <span className="text-muted-foreground ml-2 line-clamp-2">
                           {item.mission_order.slice(0, 200)}...
                         </span>
                       </div>
                     ))}
                   </div>
                 </ScrollArea>
               </div>
             </div>
           )}
         </div>
 
         <DialogFooter>
           <Button variant="outline" onClick={handleClose}>
             Annuler
           </Button>
           <Button 
             onClick={handleImport} 
              disabled={preview.length === 0 || importing}
           >
             {importing ? (
               <Loader2 className="w-4 h-4 mr-1 animate-spin" />
             ) : (
               <Upload className="w-4 h-4 mr-1" />
             )}
             Importer {preview.length > 0 && `(${preview.length})`}
           </Button>
         </DialogFooter>
       </DialogContent>
     </Dialog>
   );
 }