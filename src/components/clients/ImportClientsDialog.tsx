 import { useState, useCallback } from 'react';
 import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
 import { Button } from '@/components/ui/button';
 import { Input } from '@/components/ui/input';
 import { Label } from '@/components/ui/label';
 import { Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle2 } from 'lucide-react';
 import { toast } from 'sonner';
 import * as XLSX from 'xlsx';
 import { downloadClientsTemplate } from '@/utils/excelTemplates';
 import { ScrollArea } from '@/components/ui/scroll-area';
 
 interface ParsedClient {
   name: string;
   company?: string;
   email?: string;
   phone?: string;
   address?: string;
   city?: string;
   postal_code?: string;
   siret?: string;
   notes?: string;
 }
 
 interface ImportClientsDialogProps {
   open: boolean;
   onOpenChange: (open: boolean) => void;
   onImport: (clients: ParsedClient[]) => Promise<void>;
 }
 
 export function ImportClientsDialog({ open, onOpenChange, onImport }: ImportClientsDialogProps) {
   const [file, setFile] = useState<File | null>(null);
   const [parsedClients, setParsedClients] = useState<ParsedClient[]>([]);
   const [importing, setImporting] = useState(false);
   const [parseError, setParseError] = useState<string | null>(null);
 
   const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
     const selectedFile = e.target.files?.[0];
     if (!selectedFile) return;
 
     setFile(selectedFile);
     setParseError(null);
     setParsedClients([]);
 
     try {
       const data = await selectedFile.arrayBuffer();
       const workbook = XLSX.read(data, { type: 'array' });
       const sheetName = workbook.SheetNames[0];
       const sheet = workbook.Sheets[sheetName];
       const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet);
 
       if (rows.length === 0) {
         setParseError('Le fichier ne contient aucune donnée');
         return;
       }
 
       const clients: ParsedClient[] = rows.map((row) => {
         // Map French or English column names
         const name = row['Nom'] || row['nom'] || row['Name'] || row['name'] || '';
         const company = row['Société'] || row['societe'] || row['Company'] || row['company'] || '';
         const email = row['Email'] || row['email'] || row['E-mail'] || '';
         const phone = row['Téléphone'] || row['telephone'] || row['Phone'] || row['phone'] || row['Tel'] || '';
         const address = row['Adresse'] || row['adresse'] || row['Address'] || row['address'] || '';
         const city = row['Ville'] || row['ville'] || row['City'] || row['city'] || '';
         const postal_code = row['Code postal'] || row['code_postal'] || row['Postal'] || row['postal_code'] || row['CP'] || '';
         const siret = row['SIRET'] || row['siret'] || row['Siret'] || '';
         const notes = row['Notes'] || row['notes'] || row['Commentaires'] || row['commentaires'] || '';
 
         return {
           name: String(name).trim(),
           company: company ? String(company).trim() : undefined,
           email: email ? String(email).trim() : undefined,
           phone: phone ? String(phone).trim() : undefined,
           address: address ? String(address).trim() : undefined,
           city: city ? String(city).trim() : undefined,
           postal_code: postal_code ? String(postal_code).trim() : undefined,
           siret: siret ? String(siret).trim() : undefined,
           notes: notes ? String(notes).trim() : undefined,
         };
       }).filter(c => c.name); // Filter out rows without a name
 
       if (clients.length === 0) {
         setParseError('Aucun client valide trouvé (colonne "Nom" requise)');
         return;
       }
 
       setParsedClients(clients);
     } catch (error) {
       console.error('Error parsing Excel file:', error);
       setParseError('Erreur de lecture du fichier Excel');
     }
   }, []);
 
   const handleImport = async () => {
     if (parsedClients.length === 0) return;
 
     setImporting(true);
     try {
       await onImport(parsedClients);
       toast.success(`${parsedClients.length} client(s) importé(s) avec succès`);
       onOpenChange(false);
       // Reset state
       setFile(null);
       setParsedClients([]);
       setParseError(null);
     } catch (error) {
       console.error('Import error:', error);
       toast.error('Erreur lors de l\'import');
     } finally {
       setImporting(false);
     }
   };
 
   const handleClose = (open: boolean) => {
     if (!open) {
       setFile(null);
       setParsedClients([]);
       setParseError(null);
     }
     onOpenChange(open);
   };
 
   return (
     <Dialog open={open} onOpenChange={handleClose}>
       <DialogContent className="max-w-2xl">
         <DialogHeader>
           <DialogTitle className="flex items-center gap-2">
             <FileSpreadsheet className="w-5 h-5" />
             Importer des clients depuis Excel
           </DialogTitle>
           <DialogDescription>
             Importez votre base clients depuis un fichier Excel (.xlsx, .xls)
           </DialogDescription>
         </DialogHeader>
 
         <div className="space-y-4">
           {/* Download template */}
           <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
             <div>
               <p className="font-medium text-sm">Modèle Excel</p>
               <p className="text-xs text-muted-foreground">Téléchargez le modèle pour faciliter l'import</p>
             </div>
             <Button variant="outline" size="sm" onClick={downloadClientsTemplate}>
               <Download className="w-4 h-4 mr-2" />
               Télécharger le modèle
             </Button>
           </div>
 
           {/* File input */}
           <div className="space-y-2">
             <Label>Fichier Excel</Label>
             <Input
               type="file"
               accept=".xlsx,.xls"
               onChange={handleFileChange}
               className="cursor-pointer"
             />
           </div>
 
           {/* Parse error */}
           {parseError && (
             <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
               <AlertCircle className="w-4 h-4 shrink-0" />
               {parseError}
             </div>
           )}
 
           {/* Preview */}
           {parsedClients.length > 0 && (
             <div className="space-y-2">
               <div className="flex items-center gap-2 text-sm text-success">
                 <CheckCircle2 className="w-4 h-4" />
                 {parsedClients.length} client(s) détecté(s)
               </div>
               <ScrollArea className="h-[200px] border rounded-lg">
                 <table className="w-full text-sm">
                   <thead className="bg-muted/50 sticky top-0">
                     <tr>
                       <th className="text-left p-2">Nom</th>
                       <th className="text-left p-2">Société</th>
                       <th className="text-left p-2">Email</th>
                       <th className="text-left p-2">Ville</th>
                     </tr>
                   </thead>
                   <tbody>
                     {parsedClients.map((client, idx) => (
                       <tr key={idx} className="border-t border-border/50">
                         <td className="p-2 font-medium">{client.name}</td>
                         <td className="p-2 text-muted-foreground">{client.company || '-'}</td>
                         <td className="p-2 text-muted-foreground">{client.email || '-'}</td>
                         <td className="p-2 text-muted-foreground">{client.city || '-'}</td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </ScrollArea>
             </div>
           )}
 
           {/* Actions */}
           <div className="flex justify-end gap-2 pt-4">
             <Button variant="outline" onClick={() => handleClose(false)}>
               Annuler
             </Button>
             <Button 
               onClick={handleImport} 
               disabled={parsedClients.length === 0 || importing}
               className="btn-primary"
             >
               <Upload className="w-4 h-4 mr-2" />
               {importing ? 'Import en cours...' : `Importer ${parsedClients.length} client(s)`}
             </Button>
           </div>
         </div>
       </DialogContent>
     </Dialog>
   );
 }