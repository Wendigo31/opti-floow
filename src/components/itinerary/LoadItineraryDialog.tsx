import { useEffect, useState } from 'react';
import { Folder, MapPin, Route, Clock, Euro, Star, Search, Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useSavedTours } from '@/hooks/useSavedTours';
import type { SavedTour } from '@/types/savedTour';
import { cn } from '@/lib/utils';

interface LoadItineraryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLoadTour: (tour: SavedTour) => void;
}

export function LoadItineraryDialog({
  open,
  onOpenChange,
  onLoadTour,
}: LoadItineraryDialogProps) {
  const { tours, loading, fetchTours, deleteTour, toggleFavorite } = useSavedTours();
  const [search, setSearch] = useState('');
  const [tourToDelete, setTourToDelete] = useState<SavedTour | null>(null);
  
  useEffect(() => {
    if (open) {
      fetchTours();
    }
  }, [open, fetchTours]);
  
  const filteredTours = tours.filter(tour => 
    tour.name.toLowerCase().includes(search.toLowerCase()) ||
    tour.origin_address.toLowerCase().includes(search.toLowerCase()) ||
    tour.destination_address.toLowerCase().includes(search.toLowerCase())
  );
  
  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value);
  
  const formatDuration = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}h${m.toString().padStart(2, '0')}`;
  };
  
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };
  
  const handleSelectTour = (tour: SavedTour) => {
    onLoadTour(tour);
    onOpenChange(false);
  };
  
  const handleDeleteConfirm = async () => {
    if (tourToDelete) {
      await deleteTour(tourToDelete.id);
      setTourToDelete(null);
    }
  };
  
  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Folder className="w-5 h-5 text-primary" />
              Charger un itinéraire sauvegardé
            </DialogTitle>
            <DialogDescription>
              Sélectionnez une tournée pour importer ses données dans l'itinéraire
            </DialogDescription>
          </DialogHeader>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par nom ou adresse..."
              className="pl-9"
            />
          </div>
          
          {/* Tours list */}
          <ScrollArea className="h-[400px] -mx-6 px-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredTours.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                {tours.length === 0 
                  ? 'Aucune tournée sauvegardée'
                  : 'Aucun résultat pour cette recherche'}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredTours.map(tour => (
                  <div
                    key={tour.id}
                    className={cn(
                      "p-4 border border-border rounded-lg cursor-pointer transition-all",
                      "hover:border-primary hover:bg-primary/5"
                    )}
                    onClick={() => handleSelectTour(tour)}
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium truncate">{tour.name}</h4>
                          {tour.is_favorite && (
                            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500 flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(tour.created_at)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(tour.id);
                          }}
                        >
                          <Star className={cn(
                            "w-4 h-4",
                            tour.is_favorite ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground"
                          )} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            setTourToDelete(tour);
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    
                    {/* Addresses */}
                    <div className="space-y-1 mb-3">
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="w-3 h-3 text-success flex-shrink-0" />
                        <span className="truncate">{tour.origin_address}</span>
                      </div>
                      {tour.stops.length > 0 && (
                        <div className="ml-5 text-xs text-muted-foreground">
                          + {tour.stops.length} étape(s)
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="w-3 h-3 text-destructive flex-shrink-0" />
                        <span className="truncate">{tour.destination_address}</span>
                      </div>
                    </div>
                    
                    {/* Stats */}
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary" className="text-xs">
                        <Route className="w-3 h-3 mr-1" />
                        {tour.distance_km} km
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        <Clock className="w-3 h-3 mr-1" />
                        {formatDuration(tour.duration_minutes)}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        <Euro className="w-3 h-3 mr-1" />
                        {formatCurrency(tour.total_cost)}
                      </Badge>
                      {tour.profit > 0 && (
                        <Badge 
                          variant="outline" 
                          className={cn(
                            "text-xs",
                            tour.profit > 0 ? "text-success border-success" : "text-destructive border-destructive"
                          )}
                        >
                          {tour.profit > 0 ? '+' : ''}{formatCurrency(tour.profit)}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
      
      {/* Delete confirmation */}
      <AlertDialog open={!!tourToDelete} onOpenChange={() => setTourToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette tournée ?</AlertDialogTitle>
            <AlertDialogDescription>
              La tournée "{tourToDelete?.name}" sera définitivement supprimée. 
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
