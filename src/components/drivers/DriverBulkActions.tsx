import { Button } from '@/components/ui/button';
import { Merge, Trash2, Upload, UserPlus, CheckSquare, Square } from 'lucide-react';

interface DriverBulkActionsProps {
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onMerge: () => void;
  onDeleteBulk: () => void;
  onImport: () => void;
  onAssign: () => void;
  canAddDriver: boolean;
  isDeleting?: boolean;
}

export function DriverBulkActions({
  selectedCount,
  totalCount,
  onSelectAll,
  onClearSelection,
  onMerge,
  onDeleteBulk,
  onImport,
  onAssign,
  canAddDriver,
  isDeleting,
}: DriverBulkActionsProps) {
  const allSelected = selectedCount === totalCount && totalCount > 0;

  return (
    <div className="flex flex-wrap items-center gap-2 p-4 bg-muted rounded-lg">
      <Button
        variant="ghost"
        size="sm"
        onClick={allSelected ? onClearSelection : onSelectAll}
        className="gap-2"
      >
        {allSelected ? (
          <>
            <CheckSquare className="w-4 h-4" />
            Désélectionner tout ({selectedCount})
          </>
        ) : (
          <>
            <Square className="w-4 h-4" />
            Sélectionner tout ({totalCount})
          </>
        )}
      </Button>

      {selectedCount > 0 && (
        <>
          <div className="w-px h-6 bg-border" />
          <Button
            variant="outline"
            size="sm"
            onClick={onMerge}
            className="gap-2"
            disabled={selectedCount < 2}
          >
            <Merge className="w-4 h-4" />
            Fusionner ({selectedCount})
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onDeleteBulk}
            className="gap-2"
            disabled={isDeleting}
          >
            <Trash2 className="w-4 h-4" />
            Supprimer ({selectedCount})
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onAssign}
            className="gap-2"
          >
            <UserPlus className="w-4 h-4" />
            Assigner
          </Button>
        </>
      )}

      <div className="ml-auto flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onImport}
          className="gap-2"
        >
          <Upload className="w-4 h-4" />
          Importer
        </Button>
      </div>
    </div>
  );
}
