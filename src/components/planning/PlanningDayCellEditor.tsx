/**
 * Modification d'une case du planning sans quitter le planning (nov. 2026) :
 * un clic sur un jour d'une ligne ouvre ce petit panneau pour choisir le conducteur du jour,
 * noter une absence ou une remarque, ou retirer la ligne ce jour-là.
 * La ligne entière (titulaire, véhicule, adresses…) se modifie en cliquant sur son nom.
 */
import { useEffect, useState, type ReactNode } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DriverSearchSelect } from '@/components/planning/DriverSearchSelect';
import type { Driver } from '@/types';
import type { PlanningEntry } from '@/types/planning';

interface Props {
  date: Date;
  lineName: string;
  entry: PlanningEntry | undefined;
  defaultDriverId: string | null;
  drivers: Driver[];
  onSave: (driverId: string | null, note: string | null) => Promise<boolean>;
  onRemove: (() => Promise<boolean>) | null;
  children: ReactNode;
  className?: string;
}

export function PlanningDayCellEditor({ date, lineName, entry, defaultDriverId, drivers, onSave, onRemove, children, className }: Props) {
  const [open, setOpen] = useState(false);
  const [driverId, setDriverId] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDriverId(entry ? entry.driver_id || '' : defaultDriverId || '');
    setNote(entry?.notes || '');
  }, [open, entry, defaultDriverId]);

  const run = async (fn: () => Promise<boolean>) => {
    setBusy(true);
    try {
      if (await fn()) setOpen(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={className}
          onClick={(e) => e.stopPropagation()}
          aria-label={`${lineName} — ${format(date, 'EEEE d MMMM', { locale: fr })} : modifier`}
        >
          {children}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 space-y-3" onClick={(e) => e.stopPropagation()} align="center">
        <div>
          <p className="text-sm font-semibold truncate">{lineName}</p>
          <p className="text-xs text-muted-foreground capitalize">{format(date, 'EEEE d MMMM yyyy', { locale: fr })}</p>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Conducteur ce jour-là</Label>
          <DriverSearchSelect drivers={drivers} value={driverId} onChange={setDriverId} placeholder="Choisir un conducteur" />
          {driverId && (
            <button type="button" className="text-xs text-muted-foreground underline" onClick={() => setDriverId('')}>
              Laisser sans conducteur
            </button>
          )}
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs" htmlFor="planning-day-note">Remarque (absence, congé, client fermé…)</Label>
          <Input id="planning-day-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Facultatif" className="h-9" />
        </div>
        <div className="flex items-center justify-between gap-2 pt-1">
          {onRemove ? (
            <Button type="button" variant="ghost" size="sm" className="text-destructive" disabled={busy} onClick={() => run(onRemove)}>
              Retirer ce jour
            </Button>
          ) : (
            <span />
          )}
          <Button type="button" size="sm" disabled={busy} onClick={() => run(() => onSave(driverId || null, note.trim() || null))}>
            {entry ? 'Enregistrer' : 'Ajouter ce jour'}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
