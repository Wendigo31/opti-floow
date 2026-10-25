// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { applyThemeMode, readThemeMode, setThemeMode } from '@/lib/themeMode';

function mockMedia(dark: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn().mockReturnValue({ matches: dark, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
  });
}

describe('thème jour / nuit commun', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = '';
  });

  it('Automatique par défaut, suit l’appareil', () => {
    mockMedia(true);
    expect(readThemeMode()).toBe('system');
    applyThemeMode('system');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    mockMedia(false);
    applyThemeMode('system');
    expect(document.documentElement.classList.contains('light')).toBe(true);
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('reprend l’ancien réglage de chaque logiciel', () => {
    localStorage.setItem('optifret-theme', 'light');
    expect(readThemeMode()).toBe('light');
    localStorage.clear();
    localStorage.setItem('theme', 'auto');
    expect(readThemeMode()).toBe('system');
    localStorage.clear();
    localStorage.setItem('optixpress_theme', 'dark');
    expect(readThemeMode()).toBe('dark');
  });

  it('Clair / Sombre forcent le thème et sont mémorisés', () => {
    mockMedia(true);
    setThemeMode('light');
    expect(localStorage.getItem('opti-theme')).toBe('light');
    expect(document.documentElement.classList.contains('light')).toBe(true);
    setThemeMode('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(readThemeMode()).toBe('dark');
  });
});
