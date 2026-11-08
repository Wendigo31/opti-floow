// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { bindLocalDataToCompany } from '@/lib/localDataScope';

// Stockage complet (certains environnements de test n'ont ni key() ni length).
function memoryStorage(): Storage {
  const m = new Map<string, string>();
  return {
    get length() {
      return m.size;
    },
    key: (i: number) => [...m.keys()][i] ?? null,
    getItem: (k: string) => (m.has(k) ? m.get(k)! : null),
    setItem: (k: string, v: string) => void m.set(k, String(v)),
    removeItem: (k: string) => void m.delete(k),
    clear: () => m.clear(),
  };
}

describe('données locales liées à la société', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'localStorage', { configurable: true, value: memoryStorage() });
    Object.defineProperty(window, 'sessionStorage', { configurable: true, value: memoryStorage() });
  });

  it("met de côté les données d'une autre société, garde session et réglages", () => {
    const reload = vi.fn();
    Object.defineProperty(window, 'location', { configurable: true, value: { ...window.location, reload } });
    localStorage.setItem('opti-data-owner', 'societe-A');
    localStorage.setItem('optiflow_vehicles_cache', '[{"name":"TEST Audit"}]');
    localStorage.setItem('optixpress_routes', '[1]');
    localStorage.setItem('sb-abc-auth-token', 'x');
    localStorage.setItem('opti-theme', 'dark');
    localStorage.setItem('optiflow-license', '{}');
    localStorage.setItem('optixpress_clients::societe-B', '[2]');
    expect(bindLocalDataToCompany('societe-B')).toBe(true);
    expect(reload).toHaveBeenCalledOnce();
    expect(localStorage.getItem('optiflow_vehicles_cache')).toBeNull();
    expect(localStorage.getItem('optixpress_routes')).toBeNull();
    expect(localStorage.getItem('sb-abc-auth-token')).toBe('x');
    expect(localStorage.getItem('opti-theme')).toBe('dark');
    expect(localStorage.getItem('optiflow-license')).toBe('{}');
    expect(localStorage.getItem('optixpress_clients::societe-B')).toBe('[2]');
    expect(localStorage.getItem('opti-data-owner')).toBe('societe-B');
    // Rien n'est perdu : la société A retrouve ses données en revenant.
    expect(bindLocalDataToCompany('societe-A', false)).toBe(true);
    expect(localStorage.getItem('optiflow_vehicles_cache')).toBe('[{"name":"TEST Audit"}]');
    expect(localStorage.getItem('optixpress_routes')).toBe('[1]');
  });

  it('première ouverture après la mise à jour : rien n\'est effacé', () => {
    localStorage.setItem('optiflow_trips', '[{"id":1}]');
    localStorage.setItem('optifret_fec_accounts', '{"client":"411000"}');
    expect(bindLocalDataToCompany('societe-A')).toBe(false);
    expect(localStorage.getItem('optiflow_trips')).toBe('[{"id":1}]');
    expect(localStorage.getItem('optifret_fec_accounts')).toBe('{"client":"411000"}');
    expect(localStorage.getItem('opti-data-owner')).toBe('societe-A');
  });

  it('même société : rien ne change', () => {
    localStorage.setItem('opti-data-owner', 'societe-A');
    localStorage.setItem('optifret_drafts', '[1]');
    expect(bindLocalDataToCompany('societe-A')).toBe(false);
    expect(localStorage.getItem('optifret_drafts')).toBe('[1]');
  });
});
