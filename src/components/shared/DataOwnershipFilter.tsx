import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User, Users } from 'lucide-react';

export type OwnershipFilter = 'all' | 'mine' | 'team';

interface DataOwnershipFilterProps {
  value: OwnershipFilter;
  onChange: (value: OwnershipFilter) => void;
  disabled?: boolean;
  className?: string;
}

export function DataOwnershipFilter({ 
  value, 
  onChange, 
  disabled = false,
  className 
}: DataOwnershipFilterProps) {
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className={className}>
        {value === 'all' && <Users className="w-4 h-4 mr-2 text-muted-foreground" />}
        {value === 'mine' && <User className="w-4 h-4 mr-2 text-primary" />}
        {value === 'team' && <Users className="w-4 h-4 mr-2 text-blue-500" />}
        <SelectValue placeholder="Afficher" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Toutes les données
          </div>
        </SelectItem>
        <SelectItem value="mine">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4" />
            Mes données
          </div>
        </SelectItem>
        <SelectItem value="team">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Données équipe
          </div>
        </SelectItem>
      </SelectContent>
    </Select>
  );
}
