 import { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, Check, AlertCircle, Loader2, User, Phone, Building2, Download } from 'lucide-react';
 import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
 import { Button } from '@/components/ui/button';
 import { Badge } from '@/components/ui/badge';
 import { ScrollArea } from '@/components/ui/scroll-area';
 import { parseExcelFile } from '@/utils/excelImport';
 import { parseDriversExcel, convertToDrivers, type ParsedDriverRow, type ExtendedParsedDriver } from '@/utils/driversExcelImport';
import { downloadDriversTemplate, downloadInterimDriversTemplate } from '@/utils/excelTemplates';
 import { toast } from 'sonner';
 
 interface ImportDriversDialogProps {
   open: boolean;
   onOpenChange: (open: boolean) => void;
   onImport: (drivers: ExtendedParsedDriver[]) => Promise<number>;
 }
 
 export function ImportDriversDialog({
   open,
   onOpenChange,
   onImport,
 }: ImportDriversDialogProps) {
   const [file, setFile] = useState<File | null>(null);
   const [loading, setLoading] = useState(false);
   const [importing, setImporting] = useState(false);
   const [preview, setPreview] = useState<ParsedDriverRow[]>([]);
   const [error, setError] = useState<string | null>(null);
   const fileInputRef = useRef<HTMLInputElement>(null);
 
   const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
     const selectedFile = e.target.files?.[0];
     if (!selectedFile) return;
 
     setFile(selectedFile);
     setError(null);
     setLoading(true);
 
     try {
       const workbook = await parseExcelFile(selectedFile);
       const data = parseDriversExcel(workbook);
       
       if (data.length === 0) {
         setError('Aucun conducteur/chauffeur trouvé dans le fichier. Vérifiez que le fichier contient des lignes avec "chauffeur", "conducteur" ou "routier" dans la colonne fonction.');
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
     if (preview.length === 0) return;
 
     setImporting(true);
     
     try {
       const drivers = convertToDrivers(preview);
       const count = await onImport(drivers);
       
       toast.success(`${count} conducteur(s) importé(s) avec succès`);
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
 
   const cdiCount = preview.filter(d => d.contractType === 'cdi' || d.contractType === 'cdd').length;
   const interimCount = preview.filter(d => d.contractType === 'interim').length;
 
   return (
     <Dialog open={open} onOpenChange={handleClose}>
       <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
         <DialogHeader>
           <DialogTitle className="flex items-center gap-2">
             <FileSpreadsheet className="w-5 h-5 text-primary" />
             Importer des conducteurs depuis Excel
           </DialogTitle>
           <DialogDescription>
             Importez votre liste du personnel. Le système détectera automatiquement les chauffeurs et leurs contrats.
           </DialogDescription>
         </DialogHeader>
 
         <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {/* Download template button */}
          <div className="flex justify-end gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={downloadDriversTemplate}
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              Modèle CDI/CDD
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={downloadInterimDriversTemplate}
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              Modèle Intérimaires
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
               Liste du personnel au format Excel (.xlsx, .xls)
             </p>
           </div>
 
           {/* Error */}
           {error && (
             <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive text-sm">
               <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
               <span>{error}</span>
             </div>
           )}
 
           {/* Preview */}
           {preview.length > 0 && (
             <div className="space-y-2 flex-1 overflow-hidden flex flex-col">
               <div className="flex items-center justify-between">
                 <div className="flex items-center gap-3">
                   <p className="text-sm font-medium">
                     {preview.length} conducteur(s) trouvé(s)
                   </p>
                   <div className="flex gap-2">
                     <Badge variant="secondary">
                       CDI/CDD: {cdiCount}
                     </Badge>
                     <Badge variant="outline">
                       Intérim: {interimCount}
                     </Badge>
                   </div>
                 </div>
                 <Badge variant="secondary" className="bg-success/20 text-success">
                   <Check className="w-3 h-3 mr-1" />
                   Fichier valide
                 </Badge>
               </div>
               <ScrollArea className="flex-1 border rounded-lg">
                 <table className="w-full text-sm">
                   <thead className="bg-muted/50 sticky top-0">
                     <tr>
                       <th className="text-left p-2">Nom</th>
                       <th className="text-left p-2">Téléphone</th>
                       <th className="text-left p-2">Contrat</th>
                       <th className="text-left p-2">Agence / Service</th>
                       <th className="text-left p-2">Fonction</th>
                     </tr>
                   </thead>
                   <tbody>
                     {preview.map((driver, index) => (
                       <tr key={index} className="border-t border-border/50 hover:bg-muted/30">
                         <td className="p-2">
                           <div className="flex items-center gap-2">
                             <User className="w-4 h-4 text-muted-foreground" />
                             <span className="font-medium">{driver.name}</span>
                           </div>
                         </td>
                         <td className="p-2">
                           {driver.phone ? (
                             <div className="flex items-center gap-1 text-muted-foreground">
                               <Phone className="w-3 h-3" />
                               {driver.phone}
                             </div>
                           ) : (
                             <span className="text-muted-foreground">-</span>
                           )}
                         </td>
                         <td className="p-2">
                           <Badge 
                             variant={driver.contractType === 'interim' ? 'outline' : 'secondary'}
                             className={driver.contractType === 'interim' ? 'border-orange-500 text-orange-600' : ''}
                           >
                             {driver.contractType.toUpperCase()}
                           </Badge>
                         </td>
                         <td className="p-2 max-w-[150px]">
                           {driver.agencyName || driver.department ? (
                             <div className="flex items-center gap-1 text-muted-foreground truncate">
                               <Building2 className="w-3 h-3 flex-shrink-0" />
                               <span className="truncate">{driver.agencyName || driver.department}</span>
                             </div>
                           ) : (
                             <span className="text-muted-foreground">-</span>
                           )}
                         </td>
                         <td className="p-2 max-w-[150px]">
                           <span className="text-muted-foreground truncate block">
                             {driver.position || '-'}
                           </span>
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </ScrollArea>
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