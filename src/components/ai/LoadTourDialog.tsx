import { useState, useEffect } from 'react';
import { 
  Folder, 
  Star, 
  MapPin, 
  Search,
  Route,
  RefreshCw,
  Upload
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useSavedTours } from '@/hooks/useSavedTours';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { SavedTour } from '@/types/savedTour';

interface LoadTourDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (tour: SavedTour) => void;
}

export function LoadTourDialog({ open, onOpenChange, onSelect }: LoadTourDialogProps) {
  const { tours, loading, fetchTours } = useSavedTours();
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (open) {
      fetchTours();
    }
  }, [open, fetchTours]);

  const filteredTours = tours.filter(tour => 
    tour.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tour.origin_address.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tour.destination_address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (value: number) => new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR'
  }).format(value);

  const handleSelect = (tour: SavedTour) => {
    onSelect(tour);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Charger une tournée
          </DialogTitle>
          <DialogDescription>
            Sélectionnez une tournée sauvegardée pour l'analyser avec l'IA
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Rechercher une tournée..."
              className="pl-10"
            />
          </div>

          {/* Tours list */}
          <ScrollArea className="h-[400px] border rounded-lg">
            <div className="p-2 space-y-2">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : filteredTours.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Folder className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Aucune tournée trouvée</p>
                </div>
              ) : (
                filteredTours.map((tour) => (
                  <button
                    key={tour.id}
                    onClick={() => handleSelect(tour)}
                    className="w-full p-4 text-left rounded-lg border border-border/50 bg-card hover:bg-accent/50 hover:border-primary/50 transition-all"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{tour.name}</span>
                        {tour.is_favorite && (
                          <Star className="w-4 h-4 text-yellow-500 fill-current" />
                        )}
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {tour.distance_km} km
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                      <MapPin className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{tour.origin_address}</span>
                      <Route className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{tour.destination_address}</span>
                    </div>

                    {tour.stops.length > 0 && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                        <span className="text-primary">{tour.stops.length} arrêt{tour.stops.length > 1 ? 's' : ''}</span>
                        <span>•</span>
                        <span>{tour.stops.map(s => s.address.split(',')[0]).join(' → ')}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">
                        {format(new Date(tour.created_at), 'dd MMM yyyy', { locale: fr })}
                      </span>
                      <div className="flex items-center gap-3">
                        <span>Coût: {formatCurrency(tour.total_cost)}</span>
                        <span className={cn(
                          tour.profit >= 0 ? 'text-success' : 'text-destructive'
                        )}>
                          Marge: {tour.profit_margin.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
