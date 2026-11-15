import { describe, it, expect } from 'vitest';
import { NAV_CATEGORIES } from '@/config/appNavigation';
import { PLAN_INFO, PLAN_OPTIONS, optionsFor, nextPlan } from '@/lib/planCatalog';
import { visibleDetails } from '@/lib/tutorialPlan';

const navPaths = new Set(NAV_CATEGORIES.flatMap((c) => c.pages.map((p) => p.to)));

describe('catalogue des forfaits', () => {
  it('ne cite que des onglets qui existent', () => {
    for (const p of Object.values(PLAN_INFO)) for (const h of p.hiddenPages) expect(navPaths.has(h), h).toBe(true);
    for (const o of PLAN_OPTIONS) for (const h of o.pages) expect(navPaths.has(h), h).toBe(true);
  });
  it('noms et enchaînement des forfaits', () => {
    expect(Object.values(PLAN_INFO).map((p) => p.label)).toEqual(['Essentiel', 'Pro', 'Entreprise']);
    expect(nextPlan('start')?.label).toBe('Pro');
    expect(nextPlan('enterprise')).toBeNull();
    expect(optionsFor('enterprise')).toEqual([]);
  });
  it('tutoriel : une ligne ne reste que si un de ses onglets est ouvert', () => {
    expect(visibleDetails(['a', ['b', '/ai-analysis'], ['c', '/x', '/planning']], new Set(['/planning']))).toEqual(['a', 'c']);
  });
});
