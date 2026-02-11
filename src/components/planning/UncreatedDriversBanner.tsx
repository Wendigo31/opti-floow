import { useState } from 'react';
import { AlertTriangle, UserPlus, X, Link2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DriverSearchSelect } from '@/components/planning/DriverSearchSelect';
import type { Driver } from '@/types';
import { useUncreatedDrivers } from '@/hooks/useUncreatedDrivers';
import { toast } from 'sonner';

interface UncreatedDriversBannerProps {
  drivers: Driver[];
  onCreateDriver?: (name: string, driverType?: string) => Promise<void>;
}

export function UncreatedDriversBanner({ drivers, onCreateDriver }: UncreatedDriversBannerProps) {
  const { uncreatedDrivers, removeUncreatedDriver, clearAll } = useUncreatedDrivers();
  const [isOpen, setIsOpen] = useState(false);
  const [linking, setLinking] = useState<string | null>(null);
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const [creating, setCreating] = useState<string | null>(null);
  const [driverTypes, setDriverTypes] = useState<Record<string, string>>({});
  const [bulkType, setBulkType] = useState<string>('cdi');
  const [bulkCreating, setBulkCreating] = useState(false);

  if (uncreatedDrivers.length === 0) return null;

  const getTypeForDriver = (name: string) => driverTypes[name] || 'cdi';
  const setTypeForDriver = (name: string, type: string) => {
    setDriverTypes(prev => ({ ...prev, [name]: type }));
  };

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
    const type = getTypeForDriver(name);
    setCreating(name);
    try {
      await onCreateDriver(name, type);
      removeUncreatedDriver(name);
      toast.success(`Conducteur "${name}" créé (${type.toUpperCase()})`);
    } catch {
      toast.error(`Erreur lors de la création de "${name}"`);
    } finally {
      setCreating(null);
    }
  };

  const handleCreateAll = async () => {
    if (!onCreateDriver) return;
    setBulkCreating(true);
    let created = 0;
    for (const d of [...uncreatedDrivers]) {
      try {
        await onCreateDriver(d.name, bulkType);
        removeUncreatedDriver(d.name);
        created++;
      } catch {
        toast.error(`Erreur pour "${d.name}"`);
      }
    }
    setBulkCreating(false);
    if (created > 0) toast.success(`${created} conducteur(s) créé(s) en ${bulkType.toUpperCase()}`);
  };

  const isBusy = creating !== null || bulkCreating;

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
        <DialogContent className="w-[90vw] max-w-3xl h-[80vh] max-h-[80vh] flex flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-warning" />
              Conducteurs non reconnus ({uncreatedDrivers.length})
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="flex-1">
            <div className="space-y-2 pr-2">
              {uncreatedDrivers.map((d) => (
                <div key={d.name} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{d.name}</p>
                    <p className="text-xs text-muted-foreground">{d.source}</p>
                  </div>

                  {linking === d.name ? (
                    <div className="flex items-center gap-2 flex-wrap justify-end">
                      <div className="w-48">
                        <DriverSearchSelect
                          drivers={drivers}
                          value={selectedDriverId}
                          onChange={setSelectedDriverId}
                          placeholder="Fusionner avec..."
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
                        <>
                          <Select value={getTypeForDriver(d.name)} onValueChange={(v) => setTypeForDriver(d.name, v)}>
                            <SelectTrigger className="w-24 h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="cdi">CDI</SelectItem>
                              <SelectItem value="cdd">CDD</SelectItem>
                              <SelectItem value="interim">Intérim</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            variant="default"
                            size="sm"
                            className="gap-1"
                            disabled={isBusy}
                            onClick={() => handleCreate(d.name)}
                          >
                            <UserPlus className="h-3 w-3" />
                            Créer
                          </Button>
                        </>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1"
                        disabled={isBusy}
                        onClick={() => handleLink(d.name)}
                      >
                        <Link2 className="h-3 w-3" />
                        Fusionner
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        disabled={isBusy}
                        onClick={() => removeUncreatedDriver(d.name)}
                      >
                        <Trash2 className="h-3 w-3 text-muted-foreground" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>

          <DialogFooter className="flex-row items-center justify-between gap-2 sm:justify-between">
            {onCreateDriver && (
              <div className="flex items-center gap-2">
                <Select value={bulkType} onValueChange={setBulkType}>
                  <SelectTrigger className="w-24 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cdi">CDI</SelectItem>
                    <SelectItem value="cdd">CDD</SelectItem>
                    <SelectItem value="interim">Intérim</SelectItem>
                  </SelectContent>
                </Select>
                <Button size="sm" disabled={isBusy} onClick={handleCreateAll}>
                  Créer tous ({uncreatedDrivers.length})
                </Button>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={clearAll} disabled={isBusy}>
                Tout ignorer
              </Button>
              <Button variant="outline" onClick={() => setIsOpen(false)}>
                Fermer
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
