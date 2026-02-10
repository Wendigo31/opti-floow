import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Filter, X } from 'lucide-react';
import type { ClientWithCreator } from '@/hooks/useClients';

interface PlanningFiltersProps {
  sectorManagers: string[];
  clients: ClientWithCreator[];
  days: string[];
  selectedSector: string | null;
  selectedClient: string | null;
  selectedDay: string | null;
  onSectorChange: (v: string | null) => void;
  onClientChange: (v: string | null) => void;
  onDayChange: (v: string | null) => void;
}

export function PlanningFilters({
  sectorManagers,
  clients,
  days,
  selectedSector,
  selectedClient,
  selectedDay,
  onSectorChange,
  onClientChange,
  onDayChange,
}: PlanningFiltersProps) {
  const hasFilter = selectedSector || selectedClient || selectedDay;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Filter className="h-4 w-4 text-muted-foreground" />

      <Select value={selectedSector || '_all'} onValueChange={v => onSectorChange(v === '_all' ? null : v)}>
        <SelectTrigger className="w-[180px] h-8 text-xs">
          <SelectValue placeholder="Resp. secteur" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="_all">Tous les resp.</SelectItem>
          {sectorManagers.map(s => (
            <SelectItem key={s} value={s}>{s}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={selectedClient || '_all'} onValueChange={v => onClientChange(v === '_all' ? null : v)}>
        <SelectTrigger className="w-[180px] h-8 text-xs">
          <SelectValue placeholder="Client" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="_all">Tous les clients</SelectItem>
          {clients.map(c => (
            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={selectedDay || '_all'} onValueChange={v => onDayChange(v === '_all' ? null : v)}>
        <SelectTrigger className="w-[160px] h-8 text-xs">
          <SelectValue placeholder="Jour" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="_all">Tous les jours</SelectItem>
          {days.map(d => (
            <SelectItem key={d} value={d}>{d}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasFilter && (
        <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs" onClick={() => { onSectorChange(null); onClientChange(null); onDayChange(null); }}>
          <X className="h-3 w-3" /> Réinitialiser
        </Button>
      )}
    </div>
  );
}
