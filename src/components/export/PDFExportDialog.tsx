import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { FileDown, Map, BarChart3, PieChart, TrendingUp, MessageSquare } from 'lucide-react';
import { MapPreview } from '@/components/map/MapPreview';

interface PDFExportDialogProps {
  open: boolean;
  onClose: () => void;
  onExport: (options: ExportOptions) => void;
  routeCoordinates?: [number, number][];
  markers?: { position: [number, number]; label: string; type: 'start' | 'end' | 'stop' }[];
}

export interface ExportOptions {
  note: string;
  includeCostChart: boolean;
  includeForecastTable: boolean;
  includeProfitChart: boolean;
  includeMap: boolean;
  mapImageData?: string;
}

export function PDFExportDialog({ 
  open, 
  onClose, 
  onExport, 
  routeCoordinates = [],
  markers = []
}: PDFExportDialogProps) {
  const [note, setNote] = useState('');
  const [includeCostChart, setIncludeCostChart] = useState(true);
  const [includeForecastTable, setIncludeForecastTable] = useState(true);
  const [includeProfitChart, setIncludeProfitChart] = useState(true);
  const [includeMap, setIncludeMap] = useState(true);
  const mapRef = useRef<HTMLDivElement>(null);

  const handleExport = async () => {
    let mapImageData: string | undefined;

    // Capture map if included and route exists
    if (includeMap && routeCoordinates.length > 0) {
      // We'll use the MapPreview component's canvas
      const mapCanvas = mapRef.current?.querySelector('canvas');
      if (mapCanvas) {
        mapImageData = mapCanvas.toDataURL('image/png');
      }
    }

    onExport({
      note,
      includeCostChart,
      includeForecastTable,
      includeProfitChart,
      includeMap,
      mapImageData,
    });
  };

  const hasRoute = routeCoordinates.length > 0;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileDown className="w-5 h-5 text-primary" />
            Options d'export PDF
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Note section */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2 text-base font-medium">
              <MessageSquare className="w-4 h-4 text-primary" />
              Note personnalisée
            </Label>
            <Textarea
              placeholder="Ajoutez une note qui sera incluse dans le PDF..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>

          {/* Chart selection */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Graphiques à inclure</Label>
            <div className="space-y-3">
              <div className="flex items-center space-x-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                <Checkbox
                  id="costChart"
                  checked={includeCostChart}
                  onCheckedChange={(checked) => setIncludeCostChart(checked === true)}
                />
                <label htmlFor="costChart" className="flex items-center gap-2 cursor-pointer flex-1">
                  <PieChart className="w-4 h-4 text-primary" />
                  <span>Répartition des coûts</span>
                </label>
              </div>

              <div className="flex items-center space-x-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                <Checkbox
                  id="forecastTable"
                  checked={includeForecastTable}
                  onCheckedChange={(checked) => setIncludeForecastTable(checked === true)}
                />
                <label htmlFor="forecastTable" className="flex items-center gap-2 cursor-pointer flex-1">
                  <BarChart3 className="w-4 h-4 text-warning" />
                  <span>Tableau prévisionnel</span>
                </label>
              </div>

              <div className="flex items-center space-x-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                <Checkbox
                  id="profitChart"
                  checked={includeProfitChart}
                  onCheckedChange={(checked) => setIncludeProfitChart(checked === true)}
                />
                <label htmlFor="profitChart" className="flex items-center gap-2 cursor-pointer flex-1">
                  <TrendingUp className="w-4 h-4 text-success" />
                  <span>Évolution des bénéfices</span>
                </label>
              </div>
            </div>
          </div>

          {/* Map section */}
          <div className="space-y-3">
            <div className="flex items-center space-x-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
              <Checkbox
                id="includeMap"
                checked={includeMap && hasRoute}
                onCheckedChange={(checked) => setIncludeMap(checked === true)}
                disabled={!hasRoute}
              />
              <label htmlFor="includeMap" className="flex items-center gap-2 cursor-pointer flex-1">
                <Map className="w-4 h-4 text-primary" />
                <span>Carte de l'itinéraire</span>
                {!hasRoute && (
                  <span className="text-xs text-muted-foreground">(Aucun itinéraire calculé)</span>
                )}
              </label>
            </div>

            {/* Map Preview */}
            {includeMap && hasRoute && (
              <div ref={mapRef} className="rounded-lg overflow-hidden border border-border">
                <MapPreview
                  routeCoordinates={routeCoordinates}
                  markers={markers}
                  className="h-[200px]"
                />
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button onClick={handleExport} className="gap-2">
            <FileDown className="w-4 h-4" />
            Exporter en PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
