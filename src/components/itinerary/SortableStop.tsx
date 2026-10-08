import { Button } from '@/components/ui/button';
import { AddressInput } from '@/components/route/AddressInput';
import { GripVertical, Building2, X } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Position, Waypoint } from '@/types/itinerary';

interface SortableStopProps {
  stop: Waypoint;
  index: number;
  onUpdate: (id: string, address: string, position: Position | null) => void;
  onRemove: (id: string) => void;
  onSwap: () => void;
  isLast: boolean;
  onOpenAddressSelector: (stopId: string) => void;
}

/**
 * Un arrêt déplaçable (drag & drop) dans le formulaire d'itinéraire.
 * Déplacé hors de src/pages/Itinerary.tsx pour alléger ce fichier —
 * comportement identique.
 */
export function SortableStop({ stop, index, onUpdate, onRemove, onSwap, isLast, onOpenAddressSelector }: SortableStopProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: stop.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="group">
      <div className="flex items-center gap-2">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-muted-foreground/50 hover:text-muted-foreground touch-none"
        >
          <GripVertical className="w-4 h-4" />
        </button>
        <div className="flex-1">
          <AddressInput
            value={stop.address}
            onChange={(value) => onUpdate(stop.id, value, stop.position)}
            onSelect={(address, position) => onUpdate(stop.id, address, position)}
            label=""
            placeholder={`Arrêt ${index + 1}`}
            icon="start"
          />
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground/50 hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={() => onOpenAddressSelector(stop.id)}
        >
          <Building2 className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground/50 hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={() => onRemove(stop.id)}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
