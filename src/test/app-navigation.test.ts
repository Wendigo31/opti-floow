import { describe, expect, it } from 'vitest';
import { NAV_CATEGORIES } from '@/config/appNavigation';

describe('authenticated app navigation', () => {
  it('contains the requested categories in order', () => {
    // Ordre pensé comme un flux de travail : le quotidien (Exploitation/Géoloc) → les
    // ressources (parc/RH) → développer l'activité (Appels d'offres) → le suivi financier
    // (Comptabilité) → la synthèse (Gestion de rentabilité).
    expect(NAV_CATEGORIES.map((category) => category.label)).toEqual([
      'Exploitation',
      'Géoloc',
      'Gestion de parc',
      'RH',
      "Appels d'offres",
      'Comptabilité',
      'Gestion de rentabilité',
    ]);
  });

  it('keeps fixed charges Direction-only in accounting', () => {
    const accounting = NAV_CATEGORIES.find((category) => category.id === 'comptabilite');
    const charges = accounting?.pages.find((page) => page.to === '/charges');
    expect(charges?.directionOnly).toBe(true);
  });

  it('keeps shared operational pages available from exploitation', () => {
    const operations = NAV_CATEGORIES.find((category) => category.id === 'exploitation');
    expect(operations?.pages.map((page) => page.to)).toEqual(expect.arrayContaining([
      '/planning', '/tours', '/clients', '/vehicles',
    ]));
  });

  it('every navigation page renders content in its workspace', async () => {
    const src = (await import('@/pages/CategoryWorkspace.tsx?raw')).default as string;
    for (const page of NAV_CATEGORIES.flatMap((c) => c.pages)) {
      expect(src, page.to).toContain(`'${page.to}':`);
    }
  });

  it('does not expose internal or removed routes', () => {
    const paths = NAV_CATEGORIES.flatMap((category) => category.pages.map((page) => page.to));
    expect(paths).not.toContain('/pricing');
    expect(paths).not.toContain('/pricing-export');
    expect(paths).not.toContain('/admin');
  });
});
