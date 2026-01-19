import { useState, useEffect } from 'react';
import { 
  Folder, 
  Star, 
  Trash2, 
  MapPin, 
  Building2,
  Calendar,
  Euro,
  FileText,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Search
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
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
import { cn } from '@/lib/utils';
import { useSavedTours } from '@/hooks/useSavedTours';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { SavedTour } from '@/types/savedTour';

interface ToursListProps {
  onExportPDF?: (tour: SavedTour) => void;
  onLoadTour?: (tour: SavedTour) => void;
  clientFilter?: string | null;
}

export function ToursList({ onExportPDF, onLoadTour, clientFilter }: ToursListProps) {
  const { tours, loading, fetchTours, deleteTour, toggleFavorite } = useSavedTours();
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    fetchTours();
  }, [fetchTours]);

  const filteredTours = tours.filter(tour => {
    const matchesSearch = 
      tour.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tour.origin_address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tour.destination_address.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesClient = !clientFilter || tour.client_id === clientFilter;
    
    return matchesSearch && matchesClient;
  });

  const formatCurrency = (value: number) => new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR'
  }).format(value);

  const handleDelete = async () => {
    if (deleteId) {
      await deleteTour(deleteId);
      setDeleteId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
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
      <ScrollArea className="h-[500px]">
        <div className="space-y-3 pr-4">
          {filteredTours.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Folder className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Aucune tournée sauvegardée</p>
            </div>
          ) : (
            filteredTours.map((tour) => (
              <Card key={tour.id} className="overflow-hidden">
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-base">{tour.name}</CardTitle>
                        <button
                          onClick={() => toggleFavorite(tour.id)}
                          className={cn(
                            "transition-colors",
                            tour.is_favorite ? "text-yellow-500" : "text-muted-foreground hover:text-yellow-500"
                          )}
                        >
                          <Star className={cn("w-4 h-4", tour.is_favorite && "fill-current")} />
                        </button>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                        <MapPin className="w-3 h-3" />
                        <span className="truncate max-w-[200px]">{tour.origin_address}</span>
                        <span>→</span>
                        <span className="truncate max-w-[200px]">{tour.destination_address}</span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setExpandedId(expandedId === tour.id ? null : tour.id)}
                    >
                      {expandedId === tour.id ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </CardHeader>

                <CardContent className="p-4 pt-2">
                  <div className="flex items-center gap-4 text-sm">
                    <span>{tour.distance_km} km</span>
                    <span className="text-muted-foreground">|</span>
                    <span>Coût: {formatCurrency(tour.total_cost)}</span>
                    <span className="text-muted-foreground">|</span>
                    <span className={tour.profit >= 0 ? 'text-success' : 'text-destructive'}>
                      {formatCurrency(tour.profit)} ({tour.profit_margin.toFixed(1)}%)
                    </span>
                  </div>

                  {/* Expanded details */}
                  {expandedId === tour.id && (
                    <div className="mt-4 pt-4 border-t border-border space-y-3 animate-fade-in">
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-muted-foreground">Carburant</p>
                          <p>{formatCurrency(tour.fuel_cost)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Péages</p>
                          <p>{formatCurrency(tour.toll_cost)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Conducteur</p>
                          <p>{formatCurrency(tour.driver_cost)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Structure</p>
                          <p>{formatCurrency(tour.structure_cost)}</p>
                        </div>
                      </div>

                      {tour.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {tour.tags.map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3 h-3" />
                          <span>{format(new Date(tour.created_at), 'dd MMM yyyy à HH:mm', { locale: fr })}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-2">
                        {onLoadTour && (
                          <Button size="sm" onClick={() => onLoadTour(tour)}>
                            Charger
                          </Button>
                        )}
                        {onExportPDF && (
                          <Button size="sm" variant="outline" onClick={() => onExportPDF(tour)}>
                            <FileText className="w-4 h-4 mr-1" />
                            PDF
                          </Button>
                        )}
                        <Button 
                          size="sm" 
                          variant="destructive" 
                          onClick={() => setDeleteId(tour.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer la tournée ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. La tournée sera définitivement supprimée.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
