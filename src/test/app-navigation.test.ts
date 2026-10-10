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

  it('keeps fixed charges reserved to Direction and Comptabilité', () => {
    const accounting = NAV_CATEGORIES.find((category) => category.id === 'comptabilite');
    const charges = accounting?.pages.find((page) => page.to === '/charges');
    expect(charges?.allowedRoles).toEqual(['direction', 'comptabilite']);
  });

  it('separates the 4 roles across categories (Exploitation cannot reach Comptabilité or RH)', () => {
    const exploitation = NAV_CATEGORIES.find((category) => category.id === 'exploitation');
    const comptabilite = NAV_CATEGORIES.find((category) => category.id === 'comptabilite');
    const rentabilite = NAV_CATEGORIES.find((category) => category.id === 'rentabilite');
    const rh = NAV_CATEGORIES.find((category) => category.id === 'rh');

    expect(exploitation?.allowedRoles).toEqual(['direction', 'exploitation']);
    expect(comptabilite?.allowedRoles).toEqual(['direction', 'comptabilite']);
    expect(rentabilite?.allowedRoles).toEqual(['direction', 'comptabilite']);
    expect(rh?.allowedRoles).toEqual(['direction', 'rh']);

    // Un rôle hors liste n'a jamais accès à l'espace (sauf Direction, qui voit tout).
    expect(comptabilite?.allowedRoles).not.toContain('exploitation');
    expect(rh?.allowedRoles).not.toContain('exploitation');
    expect(exploitation?.allowedRoles).not.toContain('comptabilite');
    expect(exploitation?.allowedRoles).not.toContain('rh');
  });

  it('reserves the team page to Direction and RH', () => {
    const rh = NAV_CATEGORIES.find((category) => category.id === 'rh');
    const team = rh?.pages.find((page) => page.to === '/team');
    expect(team?.allowedRoles).toEqual(['direction', 'rh']);
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
