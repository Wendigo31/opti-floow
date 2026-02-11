import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Edit2, Trash2, Copy } from 'lucide-react';
import type { Driver } from '@/types';

interface DriverTableProps {
  drivers: Driver[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onSelectAll: (select: boolean) => void;
  onEdit: (driver: Driver) => void;
  onDelete: (driver: Driver) => void;
  onDuplicate: (driver: Driver) => void;
  isDeleting?: boolean;
}

export function DriverTable({
  drivers,
  selectedIds,
  onToggleSelect,
  onSelectAll,
  onEdit,
  onDelete,
  onDuplicate,
  isDeleting,
}: DriverTableProps) {
  const allSelected = drivers.length > 0 && drivers.every(d => selectedIds.has(d.id));

  return (
    <div className="border rounded-lg overflow-hidden">
      <table className="w-full">
        <thead className="bg-muted">
          <tr>
            <th className="p-4 text-left">
            <Checkbox
              checked={allSelected}
              onCheckedChange={(checked) => onSelectAll(!!checked)}
            />
            </th>
            <th className="p-4 text-left">Nom</th>
            <th className="p-4 text-left">Salaire/Taux</th>
            <th className="p-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {drivers.map((driver) => (
            <tr key={driver.id} className="border-t hover:bg-muted/50">
              <td className="p-4">
              <Checkbox
                checked={selectedIds.has(driver.id)}
                onCheckedChange={() => onToggleSelect(driver.id)}
              />
              </td>
              <td className="p-4 font-medium">{driver.name}</td>
              <td className="p-4 text-sm text-muted-foreground">
                {driver.baseSalary ? `${driver.baseSalary.toFixed(2)}€/mois` : ''}
                {driver.hourlyRate ? ` • ${driver.hourlyRate.toFixed(2)}€/h` : ''}
              </td>
              <td className="p-4 text-right">
                <div className="flex items-center justify-end gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onEdit(driver)}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onDuplicate(driver)}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onDelete(driver)}
                    disabled={isDeleting}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
