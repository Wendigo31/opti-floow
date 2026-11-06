/**
 * Marge visée choisie au moment du calcul (OptiFret, OptiFlow, OptiXpress).
 * La valeur des Paramètres n'est plus qu'un point de départ : chaque écran de calcul
 * ou d'analyse de rentabilité permet de la changer directement. Le dernier choix est
 * gardé pour la personne (dans ce navigateur) et partagé entre les écrans ouverts.
 * Fichier partagé : bridge/shared/settings.
 */
import { useCallback, useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const KEY = 'opti-target-margin';
const EVENT = 'opti:target-margin';
export const MARGIN_PRESETS = [10, 15, 20, 25];

const clamp = (v: number) => Math.min(Math.max(Math.round(v * 10) / 10, 0), 90);

function readStored(): number | null {
  try {
    const v = localStorage.getItem(KEY);
    if (v == null || v === '') return null;
    const n = Number(v);
    return Number.isFinite(n) ? clamp(n) : null;
  } catch {
    return null;
  }
}

/** Marge visée actuelle, hors composant React (badges, couleurs). */
export function currentTargetMargin(fallback = 15): number {
  return readStored() ?? clamp(fallback);
}

/** Marge visée en % : dernier choix de la personne, sinon la valeur par défaut (Paramètres). */
export function useTargetMargin(defaultPct = 15): [number, (pct: number) => void] {
  const [value, setValue] = useState<number>(() => readStored() ?? clamp(defaultPct));
  useEffect(() => {
    if (readStored() == null) setValue(clamp(defaultPct));
  }, [defaultPct]);
  useEffect(() => {
    const on = (e: Event) => setValue((e as CustomEvent<number>).detail);
    window.addEventListener(EVENT, on);
    return () => window.removeEventListener(EVENT, on);
  }, []);
  const set = useCallback((pct: number) => {
    const v = clamp(Number(pct) || 0);
    setValue(v);
    try {
      localStorage.setItem(KEY, String(v));
    } catch {
      /* stockage indisponible : choix gardé pour cet écran */
    }
    window.dispatchEvent(new CustomEvent<number>(EVENT, { detail: v }));
  }, []);
  return [value, set];
}

/** Niveau d'une marge par rapport à la marge visée : atteinte, en dessous, ou à perte/très faible. */
export function marginLevel(marginPct: number, targetPct: number): 'good' | 'warn' | 'bad' {
  if (marginPct >= targetPct) return 'good';
  if (marginPct >= Math.max(targetPct / 3, 0) && marginPct >= 0) return 'warn';
  return 'bad';
}

/** Champ « Marge visée » avec raccourcis 10 / 15 / 20 / 25 %. */
export function TargetMarginControl({
  value,
  onChange,
  label = 'Marge visée',
  className,
  compact = false,
}: {
  value: number;
  onChange: (pct: number) => void;
  label?: string;
  className?: string;
  compact?: boolean;
}) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);
  const commit = () => {
    const n = Number(draft.replace(',', '.'));
    if (Number.isFinite(n)) onChange(n);
    else setDraft(String(value));
  };
  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)} data-target-margin>
      <label className="text-sm font-medium whitespace-nowrap" htmlFor="opti-target-margin">
        {label}
      </label>
      <div className="relative w-24">
        <Input
          id="opti-target-margin"
          type="number"
          inputMode="decimal"
          min={0}
          max={90}
          step={0.5}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit();
          }}
          className="h-9 pr-7"
          aria-label={`${label} (%)`}
        />
        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
      </div>
      {!compact &&
        MARGIN_PRESETS.map((m) => (
          <Button key={m} type="button" size="sm" variant={value === m ? 'secondary' : 'outline'} className="h-9 px-2.5" onClick={() => onChange(m)}>
            {m} %
          </Button>
        ))}
    </div>
  );
}
