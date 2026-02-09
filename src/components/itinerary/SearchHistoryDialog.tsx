import { useState } from 'react';
import { History, Trash2, Upload, Clock, MapPin, Navigation, CheckCircle2, AlertCircle, Search, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { SearchHistoryEntry } from '@/hooks/useSearchHistory';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface SearchHistoryDialogProps {
  history: SearchHistoryEntry[];
  uncalculatedSearches: SearchHistoryEntry[];
  onLoad: (entry: SearchHistoryEntry) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
}

export function SearchHistoryDialog({
  history,
  uncalculatedSearches,
  onLoad,
  onRemove,
  onClear,
}: SearchHistoryDialogProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<string>('uncalculated');

  const filterEntries = (entries: SearchHistoryEntry[]) => {
    if (!searchQuery.trim()) return entries;
    const query = searchQuery.toLowerCase();
    return entries.filter(entry =>
      entry.originAddress.toLowerCase().includes(query) ||
      entry.destinationAddress.toLowerCase().includes(query) ||
      entry.stops.some(s => s.address.toLowerCase().includes(query))
    );
  };

  const handleLoad = (entry: SearchHistoryEntry) => {
    onLoad(entry);
    setOpen(false);
  };

  const formatTime = (timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true, locale: fr });
    } catch {
      return timestamp;
    }
  };

  const truncateAddress = (address: string, maxLength: number = 40) => {
    if (address.length <= maxLength) return address;
    return address.slice(0, maxLength) + '...';
  };

  const SearchEntryCard = ({ entry }: { entry: SearchHistoryEntry }) => (
    <div className="p-3 bg-card border rounded-lg space-y-2 hover:bg-accent/50 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
            <span className="text-sm font-medium truncate" title={entry.originAddress}>
              {truncateAddress(entry.originAddress)}
            </span>
          </div>
          
          {entry.stops.length > 0 && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <span className="w-3.5 flex-shrink-0 text-center text-xs">+{entry.stops.length}</span>
              <span className="text-xs">arrêt{entry.stops.length > 1 ? 's' : ''}</span>
            </div>
          )}
          
          <div className="flex items-center gap-2">
            <Navigation className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
            <span className="text-sm truncate" title={entry.destinationAddress}>
              {truncateAddress(entry.destinationAddress)}
            </span>
          </div>
        </div>
        
        <div className="flex flex-col items-end gap-1">
          {entry.calculated ? (
            <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600 border-green-500/20">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Calculé
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-600 border-amber-500/20">
              <AlertCircle className="w-3 h-3 mr-1" />
              Non calculé
            </Badge>
          )}
        </div>
      </div>
      
      <div className="flex items-center justify-between pt-1 border-t">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="w-3 h-3" />
          {formatTime(entry.timestamp)}
          {entry.displayName && (
            <span className="text-foreground font-medium">• {entry.displayName}</span>
          )}
        </div>
        
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleLoad(entry)}
            className="h-7 px-2 text-xs"
          >
            <Upload className="w-3 h-3 mr-1" />
            Charger
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onRemove(entry.id)}
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </div>
    </div>
  );

  const EmptyState = ({ message }: { message: string }) => (
    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
      <History className="w-10 h-10 mb-2 opacity-50" />
      <p className="text-sm">{message}</p>
    </div>
  );

  const filteredHistory = filterEntries(history);
  const filteredUncalculated = filterEntries(uncalculatedSearches);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <History className="w-4 h-4" />
          <span className="hidden sm:inline">Historique</span>
          {uncalculatedSearches.length > 0 && (
            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs bg-amber-500/20 text-amber-600">
              {uncalculatedSearches.length}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Historique des recherches
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher dans l'historique..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-9"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                onClick={() => setSearchQuery('')}
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full">
              <TabsTrigger value="uncalculated" className="flex-1 gap-1">
                Non calculés
                {uncalculatedSearches.length > 0 && (
                  <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                    {uncalculatedSearches.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="all" className="flex-1 gap-1">
                Tous
                <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                  {history.length}
                </Badge>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="uncalculated" className="mt-4">
              <ScrollArea className="h-[300px] pr-4">
                {filteredUncalculated.length === 0 ? (
                  <EmptyState message={searchQuery ? "Aucun résultat" : "Aucune recherche non calculée"} />
                ) : (
                  <div className="space-y-2">
                    {filteredUncalculated.map(entry => (
                      <SearchEntryCard key={entry.id} entry={entry} />
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="all" className="mt-4">
              <ScrollArea className="h-[300px] pr-4">
                {filteredHistory.length === 0 ? (
                  <EmptyState message={searchQuery ? "Aucun résultat" : "Aucun historique"} />
                ) : (
                  <div className="space-y-2">
                    {filteredHistory.map(entry => (
                      <SearchEntryCard key={entry.id} entry={entry} />
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>

          {history.length > 0 && (
            <div className="flex justify-end pt-2 border-t">
              <Button
                variant="ghost"
                size="sm"
                onClick={onClear}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Effacer l'historique
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
