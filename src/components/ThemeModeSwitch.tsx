import { useEffect, useRef, useState } from 'react';
import { Check, Monitor, Moon, Sun } from 'lucide-react';
import { THEME_LABELS, useThemeMode, type ThemeMode } from '@/lib/themeMode';

const ICONS = { system: Monitor, light: Sun, dark: Moon } as const;

/**
 * Bouton jour / nuit — identique dans les 3 logiciels : Automatique (suit
 * l'appareil), Clair ou Sombre. `variant="segmented"` pour la page Paramètres.
 */
export function ThemeModeSwitch({ variant = 'menu', className = '' }: { variant?: 'menu' | 'segmented'; className?: string }) {
  const { mode, isDark, setMode } = useThemeMode();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  if (variant === 'segmented')
    return (
      <div className={`inline-flex rounded-lg border p-1 ${className}`} role="radiogroup" aria-label="Thème">
        {(['system', 'light', 'dark'] as ThemeMode[]).map((m) => {
          const Icon = ICONS[m];
          return (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={mode === m}
              onClick={() => setMode(m)}
              className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors ${
                mode === m ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="h-4 w-4" />
              {THEME_LABELS[m]}
            </button>
          );
        })}
      </div>
    );

  const Current = mode === 'system' ? Monitor : isDark ? Moon : Sun;
  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-label={`Thème : ${THEME_LABELS[mode]}`}
        title={`Thème : ${THEME_LABELS[mode]}`}
        className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        <Current className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-44 rounded-lg border bg-popover p-1 text-popover-foreground shadow-lg">
          {(['system', 'light', 'dark'] as ThemeMode[]).map((m) => {
            const Icon = ICONS[m];
            return (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setMode(m);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
              >
                <Icon className="h-4 w-4" />
                <span className="flex-1">{THEME_LABELS[m]}</span>
                {mode === m && <Check className="h-4 w-4 text-primary" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
