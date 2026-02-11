import { useState, useMemo, useRef, useEffect } from 'react';
import { Check, ChevronsUpDown, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Driver } from '@/types';

interface DriverSearchSelectProps {
  drivers: Driver[];
  value: string; // driver id or empty
  onChange: (driverId: string) => void;
  placeholder?: string;
  excludeId?: string; // exclude this driver from the list
}

export function DriverSearchSelect({
  drivers,
  value,
  onChange,
  placeholder = 'Sélectionner un conducteur',
  excludeId,
}: DriverSearchSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const availableDrivers = useMemo(() => {
    return excludeId ? drivers.filter(d => d.id !== excludeId) : drivers;
  }, [drivers, excludeId]);

  const filteredDrivers = useMemo(() => {
    if (!search.trim()) return availableDrivers;
    const q = search.toLowerCase().trim();
    return availableDrivers.filter(d => {
      const fullName = d.firstName && d.lastName
        ? `${d.firstName} ${d.lastName}`
        : d.name || '';
      return fullName.toLowerCase().includes(q) || (d.name || '').toLowerCase().includes(q);
    });
  }, [availableDrivers, search]);

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
        <div className="p-2 border-b">
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
                  <span className="truncate">{displayName}</span>
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
