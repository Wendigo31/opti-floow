/**
 * Thème jour / nuit — identique dans OptiFlow, OptiFret et OptiXpress.
 * « Automatique » suit le réglage de l'appareil (et bascule tout seul le soir
 * si l'appareil le fait) ; « Clair » et « Sombre » forcent l'un ou l'autre.
 */
import { useEffect, useState } from 'react';

export type ThemeMode = 'system' | 'light' | 'dark';

const KEY = 'opti-theme';
const EVENT = 'opti-theme-change';
// Anciens réglages de chaque logiciel, repris une fois.
const LEGACY_KEYS = ['optifret-theme', 'optixpress_theme', 'theme'];

const media = () =>
  typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

export function readThemeMode(): ThemeMode {
  try {
    const v = localStorage.getItem(KEY);
    if (v === 'system' || v === 'light' || v === 'dark') return v;
    for (const k of LEGACY_KEYS) {
      const old = localStorage.getItem(k);
      if (old === 'light' || old === 'dark') return old;
      if (old === 'auto' || old === 'system') return 'system';
    }
  } catch {
    /* stockage indisponible */
  }
  return 'system';
}

export const isDarkFor = (mode: ThemeMode) => (mode === 'system' ? !!media()?.matches : mode === 'dark');

export function applyThemeMode(mode: ThemeMode): void {
  if (typeof document === 'undefined') return;
  const dark = isDarkFor(mode);
  const root = document.documentElement;
  root.classList.toggle('dark', dark);
  root.classList.toggle('light', !dark);
  root.style.colorScheme = dark ? 'dark' : 'light';
}

export function setThemeMode(mode: ThemeMode): void {
  try {
    localStorage.setItem(KEY, mode);
  } catch {
    /* stockage indisponible : le choix vaut pour cette visite */
  }
  applyThemeMode(mode);
  window.dispatchEvent(new CustomEvent(EVENT, { detail: mode }));
}

let started = false;
/** À appeler une fois au démarrage, avant le premier affichage. */
export function initThemeMode(): void {
  applyThemeMode(readThemeMode());
  if (started) return;
  started = true;
  media()?.addEventListener('change', () => {
    if (readThemeMode() === 'system') applyThemeMode('system');
  });
}

/** Thème choisi + thème réellement affiché, mis à jour partout dans le logiciel. */
export function useThemeMode(): { mode: ThemeMode; isDark: boolean; setMode: (m: ThemeMode) => void } {
  const [mode, setModeState] = useState<ThemeMode>(readThemeMode);
  const [isDark, setIsDark] = useState(() => isDarkFor(readThemeMode()));
  useEffect(() => {
    const sync = () => {
      const m = readThemeMode();
      setModeState(m);
      setIsDark(isDarkFor(m));
    };
    window.addEventListener(EVENT, sync);
    const mq = media();
    mq?.addEventListener('change', sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      mq?.removeEventListener('change', sync);
    };
  }, []);
  return { mode, isDark, setMode: setThemeMode };
}

export const THEME_LABELS: Record<ThemeMode, string> = {
  system: 'Automatique',
  light: 'Clair',
  dark: 'Sombre',
};
