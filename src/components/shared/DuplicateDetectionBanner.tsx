import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertTriangle, Merge, ChevronDown, ChevronUp, Check, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface DuplicateItem {
  id: string;
  name: string;
  extra?: string;
}

interface DuplicateGroup {
  key: string;
  items: DuplicateItem[];
}

interface DuplicateDetectionBannerProps {
  items: DuplicateItem[];
  entityLabel: string; // "clients", "conducteurs", "tournées"
  onMerge: (keepId: string, mergeIds: string[]) => Promise<boolean>;
  /** Minimum number of items to trigger detection (default: 2) */
  minGroupSize?: number;
}

function normalize(str: string): string {
  return str
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove accents
    .replace(/\s+/g, ' ');
}

function findDuplicateGroups(items: DuplicateItem[], minSize = 2): DuplicateGroup[] {
  const groups = new Map<string, DuplicateItem[]>();

  items.forEach(item => {
    const key = normalize(item.name);
    if (!key) return;
    const arr = groups.get(key) || [];
    arr.push(item);
    groups.set(key, arr);
  });

  return Array.from(groups.entries())
    .filter(([, g]) => g.length >= minSize)
    .map(([key, items]) => ({ key, items }));
}

export function DuplicateDetectionBanner({
  items,
  entityLabel,
  onMerge,
  minGroupSize = 2,
}: DuplicateDetectionBannerProps) {
  const [expanded, setExpanded] = useState(false);
  const [mergingKey, setMergingKey] = useState<string | null>(null);
  const [dismissedKeys, setDismissedKeys] = useState<Set<string>>(new Set());

  const duplicateGroups = useMemo(
    () => findDuplicateGroups(items, minGroupSize),
    [items, minGroupSize]
  );

  const visibleGroups = useMemo(
    () => duplicateGroups.filter(g => !dismissedKeys.has(g.key)),
    [duplicateGroups, dismissedKeys]
  );

  if (visibleGroups.length === 0) return null;

  const totalDuplicates = visibleGroups.reduce((sum, g) => sum + g.items.length - 1, 0);

  const handleMergeGroup = async (group: DuplicateGroup) => {
    setMergingKey(group.key);
    try {
      const keep = group.items[0];
      const mergeIds = group.items.slice(1).map(i => i.id);
      const ok = await onMerge(keep.id, mergeIds);
      if (ok) {
        // After successful merge, dismiss this group
        setDismissedKeys(prev => new Set([...prev, group.key]));
      }
    } finally {
      setMergingKey(null);
    }
  };

  const handleDismiss = (key: string) => {
    setDismissedKeys(prev => new Set([...prev, key]));
  };

  const handleDismissAll = () => {
    setDismissedKeys(new Set(duplicateGroups.map(g => g.key)));
  };

  return (
    <div className="rounded-lg border border-destructive/30 bg-destructive/5 overflow-hidden">
      {/* Header bar */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-destructive/10 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
          <span className="text-sm font-medium">
            {totalDuplicates} doublon{totalDuplicates > 1 ? 's' : ''} détecté{totalDuplicates > 1 ? 's' : ''} parmi vos {entityLabel}
          </span>
          <Badge variant="secondary" className="text-[10px]">
            {visibleGroups.length} groupe{visibleGroups.length > 1 ? 's' : ''}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground h-7"
            onClick={(e) => { e.stopPropagation(); handleDismissAll(); }}
          >
            Tout ignorer
          </Button>
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Expanded list */}
      {expanded && (
        <ScrollArea className="max-h-[280px]">
          <div className="p-3 pt-0 space-y-2">
            {visibleGroups.map(group => {
              const isMerging = mergingKey === group.key;

              return (
                <div
                  key={group.key}
                  className="flex items-center justify-between gap-3 p-3 rounded-lg border bg-card"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Merge className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="font-medium text-sm truncate">
                        {group.items[0].name}
                      </span>
                      <Badge variant="outline" className="text-[10px] shrink-0">
                        {group.items.length}×
                      </Badge>
                    </div>
                    {group.items.some(i => i.extra) && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {group.items.map(i => i.extra).filter(Boolean).join(' • ')}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 gap-1 text-xs"
                      disabled={isMerging}
                      onClick={() => handleMergeGroup(group)}
                    >
                      {isMerging ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Check className="h-3 w-3" />
                      )}
                      Fusionner
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0"
                      onClick={() => handleDismiss(group.key)}
                      title="Ignorer"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
