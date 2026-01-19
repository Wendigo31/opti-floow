import { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, Download, Check, AlertCircle, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { parseExcelFile, parseChargesFromExcel, parseToursFromExcel, generateExcelTemplate } from '@/utils/excelImport';
import type { FixedCharge } from '@/types';
import type { SavedTour } from '@/types/savedTour';
import { toast } from 'sonner';

interface ExcelImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: 'charges' | 'tours';
  onImport: (data: Partial<FixedCharge>[] | Partial<SavedTour>[]) => void;
}

export function ExcelImportDialog({ open, onOpenChange, type, onImport }: ExcelImportDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<any[]>([]);
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
      const data = type === 'charges' 
        ? parseChargesFromExcel(workbook)
        : parseToursFromExcel(workbook);
      
      setPreview(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de lecture du fichier');
      setPreview([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadTemplate = () => {
    const blob = generateExcelTemplate(type);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = type === 'charges' ? 'modele_charges.xlsx' : 'modele_tournees.xlsx';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Modèle téléchargé');
  };

  const handleImport = () => {
    if (preview.length === 0) return;
    onImport(preview);
    toast.success(`${preview.length} ${type === 'charges' ? 'charges' : 'tournées'} importées`);
    handleClose();
  };

  const handleClose = () => {
    setFile(null);
    setPreview([]);
    setError(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-primary" />
            Importer depuis Excel
          </DialogTitle>
          <DialogDescription>
            Importez vos {type === 'charges' ? 'charges fixes' : 'tournées'} depuis un fichier Excel (.xlsx, .xls, .csv)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
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
              ou glissez-déposez votre fichier ici
            </p>
          </div>

          {/* Template download */}
          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
            <div>
              <p className="text-sm font-medium">Besoin d'un modèle ?</p>
              <p className="text-xs text-muted-foreground">
                Téléchargez notre modèle Excel pré-formaté
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
              <Download className="w-4 h-4 mr-1" />
              Modèle
            </Button>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Preview */}
          {preview.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">
                  Aperçu ({preview.length} éléments)
                </p>
                <Badge variant="secondary" className="bg-success/20 text-success">
                  <Check className="w-3 h-3 mr-1" />
                  Fichier valide
                </Badge>
              </div>
              <ScrollArea className="h-48 border rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr>
                      {type === 'charges' ? (
                        <>
                          <th className="text-left p-2">Nom</th>
                          <th className="text-right p-2">Montant</th>
                          <th className="text-left p-2">Périodicité</th>
                          <th className="text-left p-2">Catégorie</th>
                        </>
                      ) : (
                        <>
                          <th className="text-left p-2">Nom</th>
                          <th className="text-left p-2">Origine</th>
                          <th className="text-left p-2">Destination</th>
                          <th className="text-right p-2">Distance</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.slice(0, 10).map((item, index) => (
                      <tr key={index} className="border-t border-border/50">
                        {type === 'charges' ? (
                          <>
                            <td className="p-2">{(item as Partial<FixedCharge>).name}</td>
                            <td className="p-2 text-right">{(item as Partial<FixedCharge>).amount}€</td>
                            <td className="p-2">{(item as Partial<FixedCharge>).periodicity}</td>
                            <td className="p-2">{(item as Partial<FixedCharge>).category}</td>
                          </>
                        ) : (
                          <>
                            <td className="p-2">{(item as Partial<SavedTour>).name}</td>
                            <td className="p-2 truncate max-w-[120px]">{(item as Partial<SavedTour>).origin_address}</td>
                            <td className="p-2 truncate max-w-[120px]">{(item as Partial<SavedTour>).destination_address}</td>
                            <td className="p-2 text-right">{(item as Partial<SavedTour>).distance_km} km</td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {preview.length > 10 && (
                  <p className="text-xs text-muted-foreground text-center py-2">
                    ... et {preview.length - 10} autres
                  </p>
                )}
              </ScrollArea>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Annuler
          </Button>
          <Button onClick={handleImport} disabled={preview.length === 0}>
            <Upload className="w-4 h-4 mr-1" />
            Importer {preview.length > 0 && `(${preview.length})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
