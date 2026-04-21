import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { FileDown, Map, BarChart3, PieChart, TrendingUp, MessageSquare, Loader2 } from 'lucide-react';
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
  const [exporting, setExporting] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);

  const fetchStaticMap = async (): Promise<string | undefined> => {
    if (!includeMap || routeCoordinates.length === 0) return undefined;
    try {
      const keyRes = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/here-maps-key`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
      });
      const { apiKey } = await keyRes.json();
      if (!apiKey) return undefined;

      // HERE Map Image API: route polyline as r0=lat,lon,lat,lon,... (max ~50 points to stay under URL limit)
      const step = Math.max(1, Math.floor(routeCoordinates.length / 50));
      const sampled = routeCoordinates.filter((_, i) => i % step === 0);
      if (sampled[sampled.length - 1] !== routeCoordinates[routeCoordinates.length - 1]) {
        sampled.push(routeCoordinates[routeCoordinates.length - 1]);
      }
      const route = sampled.map(([lat, lon]) => `${lat.toFixed(5)},${lon.toFixed(5)}`).join(',');

      const poiParams = markers
        .map((m) => {
          const color = m.type === 'start' ? '00aa00' : m.type === 'end' ? 'cc0000' : '2563eb';
          return `poi=${m.position[0].toFixed(5)},${m.position[1].toFixed(5)};fc=${color};lc=ffffff`;
        })
        .join('&');

      const url = `https://image.maps.hereapi.com/mia/1.6/route?r0=${route}&lc0=2563eb&lw0=4&w=640&h=320&ppi=250&t=0&${poiParams}&apiKey=${apiKey}`;

      const imgRes = await fetch(url);
      if (!imgRes.ok) return undefined;
      const blob = await imgRes.blob();
      return await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
    } catch (e) {
      console.error('Static map fetch failed:', e);
      return undefined;
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const mapImageData = await fetchStaticMap();
      onExport({
        note,
        includeCostChart,
        includeForecastTable,
        includeProfitChart,
        includeMap,
        mapImageData,
      });
    } finally {
      setExporting(false);
    }
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
          <Button variant="outline" onClick={onClose} disabled={exporting}>
            Annuler
          </Button>
          <Button onClick={handleExport} className="gap-2" disabled={exporting}>
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
            {exporting ? 'Génération…' : 'Exporter en PDF'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
