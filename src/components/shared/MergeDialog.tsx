import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Merge, Search, AlertTriangle } from 'lucide-react';

interface MergeItem {
  id: string;
  name: string;
  extra?: string;
}

interface MergeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: MergeItem[];
  entityLabel: string; // "clients" or "conducteurs"
  onMerge: (keepId: string, mergeIds: string[]) => Promise<boolean>;
  /** Optional: all items for auto-detect duplicates */
  allItems?: MergeItem[];
}

function findDuplicateGroups(items: MergeItem[]): MergeItem[][] {
  const groups: Map<string, MergeItem[]> = new Map();
  items.forEach(item => {
    const key = item.name.trim().toLowerCase();
    const arr = groups.get(key) || [];
    arr.push(item);
    groups.set(key, arr);
  });
  return Array.from(groups.values()).filter(g => g.length > 1);
}

export function MergeDialog({
  open,
  onOpenChange,
  items,
  entityLabel,
  onMerge,
  allItems,
}: MergeDialogProps) {
  const [keepId, setKeepId] = useState<string>(items[0]?.id || '');
  const [merging, setMerging] = useState(false);
  const [mode, setMode] = useState<'manual' | 'auto'>('manual');
  const [autoSearch, setAutoSearch] = useState('');

  const duplicateGroups = useMemo(() => {
    if (!allItems) return [];
    return findDuplicateGroups(allItems);
  }, [allItems]);

  const filteredDuplicates = useMemo(() => {
    if (!autoSearch) return duplicateGroups;
    const q = autoSearch.toLowerCase();
    return duplicateGroups.filter(g => g[0].name.toLowerCase().includes(q));
  }, [duplicateGroups, autoSearch]);

  const handleMerge = async () => {
    const mergeIds = items.filter(i => i.id !== keepId).map(i => i.id);
    if (mergeIds.length === 0) return;
    setMerging(true);
    try {
      const ok = await onMerge(keepId, mergeIds);
      if (ok) onOpenChange(false);
    } finally {
      setMerging(false);
    }
  };

  const handleAutoMerge = async (group: MergeItem[]) => {
    const keep = group[0];
    const mergeIds = group.slice(1).map(i => i.id);
    setMerging(true);
    try {
      await onMerge(keep.id, mergeIds);
    } finally {
      setMerging(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Merge className="h-5 w-5" /> Fusionner des {entityLabel}
          </DialogTitle>
          <DialogDescription>
            {items.length >= 2
              ? `Choisissez le ${entityLabel.slice(0, -1)} à conserver. Les autres seront fusionnés (données réassignées).`
              : `Détectez et fusionnez les ${entityLabel} en double.`}
          </DialogDescription>
        </DialogHeader>

        {items.length >= 2 ? (
          /* Manual merge mode */
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              Les entrées fusionnées seront supprimées. Leurs données seront réassignées.
            </p>
            <RadioGroup value={keepId} onValueChange={setKeepId}>
              {items.map(item => (
                <div key={item.id} className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/30">
                  <RadioGroupItem value={item.id} id={item.id} />
                  <Label htmlFor={item.id} className="flex-1 cursor-pointer">
                    <span className="font-medium">{item.name}</span>
                    {item.extra && <span className="text-xs text-muted-foreground ml-2">{item.extra}</span>}
                    {item.id === keepId && <Badge className="ml-2 text-[10px]">Conservé</Badge>}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        ) : (
          /* Auto-detect mode */
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher des doublons..."
                value={autoSearch}
                onChange={e => setAutoSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <ScrollArea className="max-h-[300px]">
              {filteredDuplicates.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  Aucun doublon détecté
                </p>
              ) : (
                <div className="space-y-2">
                  {filteredDuplicates.map((group, i) => (
                    <div key={i} className="p-3 rounded-lg border space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">{group[0].name}</span>
                        <Badge variant="secondary">{group.length} doublons</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {group.map(g => g.extra).filter(Boolean).join(' • ')}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAutoMerge(group)}
                        disabled={merging}
                        className="gap-1 mt-1"
                      >
                        <Merge className="h-3 w-3" /> Fusionner (garder le premier)
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          {items.length >= 2 && (
            <Button onClick={handleMerge} disabled={merging} className="gap-1">
              <Merge className="h-4 w-4" /> Fusionner
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
