import { MapPin, ArrowDown, Clock, Route as RouteIcon, Save, Sparkles, Building2, FileDown, Coins } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { exportItineraryPDF } from '@/utils/itineraryPdfExport';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';

interface Position {
  lat: number;
  lon: number;
}

interface Waypoint {
  id: string;
  address: string;
  position: Position | null;
}

interface RouteResult {
  distance: number;
  duration: number;
  tollCost: number;
  fuelCost: number;
  coordinates: [number, number][];
  type: 'highway' | 'national';
}

interface RouteItineraryListingProps {
  originAddress: string;
  destinationAddress: string;
  stops: Waypoint[];
  route: RouteResult;
  onSaveAsLine: () => void;
  transportMode?: 'truck' | 'car';
  vehicleName?: string | null;
  clientName?: string | null;
}

function haversineKm(a: Position, b: Position): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function RouteItineraryListing({
  originAddress,
  destinationAddress,
  stops,
  route,
  onSaveAsLine,
  transportMode = 'truck',
  vehicleName = null,
  clientName = null,
}: RouteItineraryListingProps) {
  const { toast } = useToast();
  const [exporting, setExporting] = useState(false);
  // Build the ordered list of points with positions (for distance estimation)
  const points: { label: string; address: string; position: Position | null; type: 'start' | 'stop' | 'end' }[] = [
    { label: 'Départ', address: originAddress || '—', position: null, type: 'start' },
    ...stops.map((s, i) => ({ label: `Arrêt ${i + 1}`, address: s.address || '—', position: s.position, type: 'stop' as const })),
    { label: 'Arrivée', address: destinationAddress || '—', position: null, type: 'end' as const },
  ];

  // Estimate per-segment distance share via haversine ratios
  const totalKm = route.distance;
  const totalH = route.duration;
  const totalToll = route.tollCost || 0;
  const totalFuel = route.fuelCost || 0;
  const segments: { km: number; durationH: number; tollCost: number; fuelCost: number }[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    segments.push({ km: 0, durationH: 0, tollCost: 0, fuelCost: 0 });
  }
  // We need positions: rebuild points with positions including origin/dest from route start/end coords
  const coords = route.coordinates;
  const positions: (Position | null)[] = points.map((p) => p.position);
  if (coords.length > 0) {
    positions[0] = { lat: coords[0][0], lon: coords[0][1] };
    positions[positions.length - 1] = { lat: coords[coords.length - 1][0], lon: coords[coords.length - 1][1] };
  }
  const rawDistances: number[] = [];
  for (let i = 0; i < positions.length - 1; i++) {
    const a = positions[i];
    const b = positions[i + 1];
    rawDistances.push(a && b ? haversineKm(a, b) : 0);
  }
  const sumRaw = rawDistances.reduce((s, v) => s + v, 0);
  if (sumRaw > 0) {
    rawDistances.forEach((d, i) => {
      const ratio = d / sumRaw;
      segments[i] = {
        km: Math.round(totalKm * ratio),
        durationH: Math.round(totalH * ratio * 100) / 100,
        tollCost: Math.round(totalToll * ratio * 100) / 100,
        fuelCost: Math.round(totalFuel * ratio * 100) / 100,
      };
    });
  }

  const formatEur = (v: number) =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v || 0);

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      const mapElement = document.querySelector<HTMLElement>('[data-itinerary-map]');
      await exportItineraryPDF({
        originAddress,
        destinationAddress,
        stops,
        route,
        segments,
        transportMode,
        vehicleName,
        clientName,
        mapElement,
      });
      toast({ title: 'PDF généré', description: 'Le détail de l\'itinéraire a été exporté.' });
    } catch (e) {
      console.error(e);
      toast({ title: 'Erreur', description: 'Impossible de générer le PDF.', variant: 'destructive' });
    } finally {
      setExporting(false);
    }
  };

  const formatDuration = (h: number) => {
    const hh = Math.floor(h);
    const mm = Math.round((h - hh) * 60);
    return `${hh}h${mm.toString().padStart(2, '0')}`;
  };

  // Suggest a line code based on origin/destination first words
  const lineCode = (() => {
    const o = (originAddress.split(',')[0] || '').trim().slice(0, 3).toUpperCase();
    const d = (destinationAddress.split(',')[0] || '').trim().slice(0, 3).toUpperCase();
    return o && d ? `${o}-${d}` : '';
  })();

  const dotColor = (type: 'start' | 'stop' | 'end') =>
    type === 'start' ? 'bg-primary' : type === 'end' ? 'bg-destructive' : 'bg-warning';

  return (
    <div className="space-y-4 pt-2 animate-fade-in">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
          <RouteIcon className="w-4 h-4 text-primary" />
          Détail de l'itinéraire
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{points.length} points</span>
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2 text-xs"
            onClick={handleExportPDF}
            disabled={exporting}
          >
            <FileDown className="w-3.5 h-3.5 mr-1" />
            {exporting ? 'Export…' : 'PDF'}
          </Button>
        </div>
      </div>

      {/* Stops list */}
      <div className="rounded-2xl border border-border/40 bg-card/60 p-4">
        <div className="space-y-1">
          {points.map((p, idx) => {
            const isLast = idx === points.length - 1;
            const seg = segments[idx];
            return (
              <div key={`${p.label}-${idx}`}>
                <div className="flex items-start gap-3">
                  <div className="flex flex-col items-center pt-1.5">
                    <div className={cn('w-3 h-3 rounded-full ring-4 ring-offset-0', dotColor(p.type), {
                      'ring-primary/15': p.type === 'start',
                      'ring-destructive/15': p.type === 'end',
                      'ring-warning/15': p.type === 'stop',
                    })} />
                    {!isLast && <div className="w-0.5 flex-1 min-h-[28px] bg-border/60 mt-1" />}
                  </div>
                  <div className="flex-1 min-w-0 pb-3">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">{p.label}</p>
                    <p className="text-sm font-medium text-foreground truncate" title={p.address}>{p.address}</p>
                  </div>
                </div>
                {!isLast && seg && (seg.km > 0 || seg.durationH > 0) && (
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 ml-7 -mt-2 mb-2 text-xs text-muted-foreground">
                    <ArrowDown className="w-3 h-3" />
                    <span className="font-medium">{seg.km} km</span>
                    <span>•</span>
                    <Clock className="w-3 h-3" />
                    <span>{formatDuration(seg.durationH)}</span>
                    {seg.tollCost > 0 && (
                      <>
                        <span>•</span>
                        <Coins className="w-3 h-3 text-warning" />
                        <span className="font-medium text-warning">{formatEur(seg.tollCost)}</span>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-2 pt-3 border-t border-border/50 grid grid-cols-2 gap-3 text-center">
          <div>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Distance totale</p>
            <p className="font-bold text-base">{route.distance} km</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Durée totale</p>
            <p className="font-bold text-base">{formatDuration(route.duration)}</p>
          </div>
        </div>
      </div>

      {/* Line proposal */}
      <div className="rounded-2xl border-2 border-dashed border-primary/30 bg-gradient-to-br from-primary/5 to-transparent p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-md shrink-0">
            <Sparkles className="w-4 h-4 text-primary-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">Proposition : créer une ligne régulière</p>
            <p className="text-xs text-muted-foreground">
              Sauvegardez ce trajet comme tournée récurrente
              {lineCode && (
                <> sous la référence <span className="font-mono font-semibold text-primary">{lineCode}</span></>
              )}.
            </p>
          </div>
        </div>
        <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground bg-card/60 rounded-lg px-3 py-2 border border-border/40">
          <span className="flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5" />
            {stops.length > 0 ? `${stops.length} arrêt${stops.length > 1 ? 's' : ''} intermédiaire${stops.length > 1 ? 's' : ''}` : 'Trajet direct'}
          </span>
          <span className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5" />
            {route.type === 'highway' ? 'Via autoroute' : 'Via nationale'}
          </span>
        </div>
        <Button onClick={onSaveAsLine} className="w-full h-10" variant="gradient">
          <Save className="w-4 h-4 mr-2" />
          Mettre en place cette ligne
        </Button>
      </div>
    </div>
  );
}