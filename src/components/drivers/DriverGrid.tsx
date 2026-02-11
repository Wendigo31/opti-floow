import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit2, Trash2, Copy, Clock } from 'lucide-react';
import type { Driver } from '@/types';
import { cn } from '@/lib/utils';

interface DriverGridProps {
  drivers: Driver[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onEdit: (driver: Driver) => void;
  onDelete: (driver: Driver) => void;
  onDuplicate: (driver: Driver) => void;
  isDeleting?: boolean;
}

export function DriverGrid({
  drivers,
  selectedIds,
  onToggleSelect,
  onEdit,
  onDelete,
  onDuplicate,
  isDeleting,
}: DriverGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {drivers.map((driver) => (
        <Card
          key={driver.id}
          className={cn(
            'p-4 cursor-pointer transition-all',
            selectedIds.has(driver.id) && 'ring-2 ring-primary'
          )}
          onClick={() => onToggleSelect(driver.id)}
        >
          <div className="space-y-3">
            <h3 className="font-semibold text-lg">{driver.name}</h3>

            {driver.baseSalary && (
              <div className="text-sm text-muted-foreground">
                Salaire: <span className="font-medium">{driver.baseSalary.toFixed(2)}€/mois</span>
              </div>
            )}

            {driver.hourlyRate && (
              <div className="text-sm text-muted-foreground">
                Taux: <span className="font-medium">{driver.hourlyRate.toFixed(2)}€/h</span>
              </div>
            )}

            <div className="flex gap-2 pt-3">
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(driver);
                }}
              >
                <Edit2 className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  onDuplicate(driver);
                }}
              >
                <Copy className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(driver);
                }}
                disabled={isDeleting}
              >
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
