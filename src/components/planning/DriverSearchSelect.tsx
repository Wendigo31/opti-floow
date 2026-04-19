import { useState, useMemo, useRef, useEffect } from 'react';
import { Check, ChevronsUpDown, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { Driver } from '@/types';

type ContractFilter = 'all' | 'cdi' | 'cdd' | 'interim' | 'autre' | 'joker';

interface DriverSearchSelectProps {
  drivers: Driver[];
  value: string; // driver id or empty
  onChange: (driverId: string) => void;
  placeholder?: string;
  excludeId?: string; // exclude this driver from the list
}

const CONTRACT_FILTERS: { key: ContractFilter; label: string }[] = [
  { key: 'all', label: 'Tous' },
  { key: 'cdi', label: 'CDI' },
  { key: 'cdd', label: 'CDD' },
  { key: 'interim', label: 'Intérim' },
  { key: 'joker', label: 'Joker' },
  { key: 'autre', label: 'Autre' },
];

export function DriverSearchSelect({
  drivers,
  value,
  onChange,
  placeholder = 'Sélectionner un conducteur',
  excludeId,
}: DriverSearchSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [contractFilter, setContractFilter] = useState<ContractFilter>('all');
  const inputRef = useRef<HTMLInputElement>(null);

  const availableDrivers = useMemo(() => {
    return excludeId ? drivers.filter(d => d.id !== excludeId) : drivers;
  }, [drivers, excludeId]);

  // Count by contract type for badge display
  const contractCounts = useMemo(() => {
    const counts: Record<string, number> = { all: availableDrivers.length };
    for (const d of availableDrivers) {
      const t = d.contractType || 'autre';
      counts[t] = (counts[t] || 0) + 1;
    }
    return counts;
  }, [availableDrivers]);

  const filteredDrivers = useMemo(() => {
    let list = availableDrivers;
    if (contractFilter !== 'all') {
      list = list.filter(d => (d.contractType || 'autre') === contractFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter(d => {
        const fullName = d.firstName && d.lastName
          ? `${d.firstName} ${d.lastName}`
          : d.name || '';
        return fullName.toLowerCase().includes(q) || (d.name || '').toLowerCase().includes(q);
      });
    }
    return list;
  }, [availableDrivers, search, contractFilter]);

  const selectedDriver = useMemo(() => {
    if (!value) return null;
    return drivers.find(d => d.id === value) || null;
  }, [drivers, value]);

  const getDriverDisplayName = (d: Driver) => {
    return d.firstName && d.lastName
      ? `${d.firstName} ${d.lastName}`
      : d.name || 'Sans nom';
  };

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setSearch('');
      setContractFilter('all');
    }
  }, [open]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between h-10 font-normal"
        >
          <span className="truncate">
            {selectedDriver ? (
              <span className="flex items-center gap-1.5">
                👤 {getDriverDisplayName(selectedDriver)}
              </span>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </span>
          <div className="flex items-center gap-1 shrink-0">
            {value && (
              <X
                className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange('');
                }}
              />
            )}
            <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0" align="start">
        <div className="p-2 border-b space-y-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              ref={inputRef}
              placeholder="Rechercher un conducteur..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>
          <div className="flex flex-wrap gap-1">
            {CONTRACT_FILTERS.map(f => {
              const count = contractCounts[f.key] || 0;
              if (f.key !== 'all' && count === 0) return null;
              const active = contractFilter === f.key;
              return (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setContractFilter(f.key)}
                  className={cn(
                    'px-2 py-0.5 rounded-full text-xs border transition-colors',
                    active
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background hover:bg-accent border-border text-muted-foreground'
                  )}
                >
                  {f.label} <span className="opacity-70">({count})</span>
                </button>
              );
            })}
          </div>
        </div>
        <div className="max-h-[240px] overflow-y-auto p-1">
          {/* None option */}
          <button
            className={cn(
              "w-full flex items-center gap-2 px-2 py-1.5 rounded-sm text-sm hover:bg-accent transition-colors text-left",
              !value && "bg-accent"
            )}
            onClick={() => { onChange(''); setOpen(false); }}
          >
            <Check className={cn("h-3.5 w-3.5", value ? "opacity-0" : "opacity-100")} />
            <span className="text-muted-foreground">Aucun</span>
          </button>

          {filteredDrivers.length === 0 ? (
            <div className="py-4 text-center text-sm text-muted-foreground">
              Aucun conducteur trouvé
            </div>
          ) : (
            filteredDrivers.map(d => {
              const isSelected = d.id === value;
              const displayName = getDriverDisplayName(d);
              const contract = (d.contractType || 'autre').toUpperCase();
              return (
                <button
                  key={d.id}
                  className={cn(
                    "w-full flex items-center gap-2 px-2 py-1.5 rounded-sm text-sm hover:bg-accent transition-colors text-left",
                    isSelected && "bg-accent"
                  )}
                  onClick={() => { onChange(d.id); setOpen(false); }}
                >
                  <Check className={cn("h-3.5 w-3.5 shrink-0", isSelected ? "opacity-100" : "opacity-0")} />
                  <span className="truncate flex-1">{displayName}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground shrink-0">
                    {contract}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
