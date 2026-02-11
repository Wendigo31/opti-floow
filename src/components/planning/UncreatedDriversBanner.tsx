import { useState } from 'react';
import { AlertTriangle, UserPlus, X, Link2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DriverSearchSelect } from '@/components/planning/DriverSearchSelect';
import type { Driver } from '@/types';
import { useUncreatedDrivers } from '@/hooks/useUncreatedDrivers';
import { toast } from 'sonner';

interface UncreatedDriversBannerProps {
  drivers: Driver[];
  onCreateDriver?: (name: string) => Promise<void>;
}

export function UncreatedDriversBanner({ drivers, onCreateDriver }: UncreatedDriversBannerProps) {
  const { uncreatedDrivers, removeUncreatedDriver, clearAll } = useUncreatedDrivers();
  const [isOpen, setIsOpen] = useState(false);
  const [linking, setLinking] = useState<string | null>(null); // name being linked
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const [creating, setCreating] = useState<string | null>(null);

  if (uncreatedDrivers.length === 0) return null;

  const handleLink = (name: string) => {
    setLinking(name);
    setSelectedDriverId(null);
  };

  const confirmLink = () => {
    if (linking && selectedDriverId) {
      removeUncreatedDriver(linking);
      toast.success(`"${linking}" lié au conducteur existant`);
      setLinking(null);
      setSelectedDriverId(null);
    }
  };

  const handleCreate = async (name: string) => {
    if (!onCreateDriver) return;
    setCreating(name);
    try {
      await onCreateDriver(name);
      removeUncreatedDriver(name);
      toast.success(`Conducteur "${name}" créé`);
    } catch {
      toast.error(`Erreur lors de la création de "${name}"`);
    } finally {
      setCreating(null);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2 p-3 bg-warning/10 border border-warning/30 rounded-lg text-sm">
        <AlertTriangle className="h-4 w-4 text-warning flex-shrink-0" />
        <span className="flex-1">
          <strong>{uncreatedDrivers.length}</strong> conducteur{uncreatedDrivers.length > 1 ? 's' : ''} non reconnu{uncreatedDrivers.length > 1 ? 's' : ''} détecté{uncreatedDrivers.length > 1 ? 's' : ''} lors de l'import.
        </span>
        <Button variant="outline" size="sm" onClick={() => setIsOpen(true)} className="gap-1.5">
          <UserPlus className="h-3.5 w-3.5" />
          Gérer
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={clearAll}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-warning" />
              Conducteurs non reconnus
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="max-h-[400px]">
            <div className="space-y-2">
              {uncreatedDrivers.map((d) => (
                <div key={d.name} className="flex items-center gap-2 p-3 rounded-lg border bg-card">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{d.name}</p>
                    <p className="text-xs text-muted-foreground">{d.source}</p>
                  </div>

                  {linking === d.name ? (
                    <div className="flex items-center gap-2">
                      <div className="w-48">
                        <DriverSearchSelect
                          drivers={drivers}
                          value={selectedDriverId}
                          onChange={setSelectedDriverId}
                          placeholder="Lier à..."
                        />
                      </div>
                      <Button size="sm" disabled={!selectedDriverId} onClick={confirmLink}>OK</Button>
                      <Button variant="ghost" size="sm" onClick={() => setLinking(null)}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      {onCreateDriver && (
                        <Button
                          variant="default"
                          size="sm"
                          className="gap-1"
                          disabled={creating === d.name}
                          onClick={() => handleCreate(d.name)}
                        >
                          <UserPlus className="h-3 w-3" />
                          Créer
                        </Button>
                      )}
                      <Button variant="outline" size="sm" className="gap-1" onClick={() => handleLink(d.name)}>
                        <Link2 className="h-3 w-3" />
                        Lier
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeUncreatedDriver(d.name)}>
                        <Trash2 className="h-3 w-3 text-muted-foreground" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={clearAll}>
              Tout ignorer
            </Button>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
