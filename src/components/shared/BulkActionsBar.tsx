import { Trash2, Copy, X, Merge } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { ReactNode } from 'react';

interface BulkActionsBarProps {
  count: number;
  onDelete?: () => void;
  onDuplicate?: () => void;
  onMerge?: () => void;
  onClear: () => void;
  deleting?: boolean;
  duplicating?: boolean;
  extraActions?: ReactNode;
}

export function BulkActionsBar({ count, onDelete, onDuplicate, onMerge, onClear, deleting, duplicating, extraActions }: BulkActionsBarProps) {
  if (count === 0) return null;

  return (
    <div className="flex items-center gap-3 p-3 bg-primary/10 border border-primary/20 rounded-lg animate-in slide-in-from-top-2">
      <Badge variant="secondary" className="font-semibold">
        {count} sélectionné{count > 1 ? 's' : ''}
      </Badge>
      <div className="flex items-center gap-2">
        {extraActions}
        {onMerge && count >= 2 && (
          <Button variant="outline" size="sm" onClick={onMerge} className="gap-1.5">
            <Merge className="w-3.5 h-3.5" />
            Fusionner
          </Button>
        )}
        {onDuplicate && (
          <Button variant="outline" size="sm" onClick={onDuplicate} disabled={duplicating} className="gap-1.5">
            <Copy className="w-3.5 h-3.5" />
            Dupliquer
          </Button>
        )}
        {onDelete && (
          <Button variant="outline" size="sm" onClick={onDelete} disabled={deleting} className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10">
            <Trash2 className="w-3.5 h-3.5" />
            Supprimer
          </Button>
        )}
      </div>
      <Button variant="ghost" size="icon" className="h-7 w-7 ml-auto" onClick={onClear}>
        <X className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
}
