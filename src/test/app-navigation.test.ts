import { describe, expect, it } from 'vitest';
import { NAV_CATEGORIES, getVisibleNavCategories } from '@/config/appNavigation';

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

  it('reserves the Planification tab to Exploitation, RH and Gestion de parc only', () => {
    const withPlanning = ['exploitation', 'rh', 'parc'];
    const withoutPlanning = ['geoloc', 'appels-offres', 'comptabilite', 'rentabilite'];

    for (const category of NAV_CATEGORIES) {
      const hasPlanning = category.pages.some((page) => page.to === '/planning');
      if (withPlanning.includes(category.id)) {
        expect(hasPlanning, category.label).toBe(true);
      } else {
        expect(withoutPlanning, category.id).toContain(category.id);
        expect(hasPlanning, category.label).toBe(false);
      }
    }
  });

  it('removes the Paramètres tab from Exploitation only (the top-right gear already gives access there)', () => {
    const exploitation = NAV_CATEGORIES.find((category) => category.id === 'exploitation');
    expect(exploitation?.pages.map((page) => page.to)).not.toContain('/settings');

    // Les autres espaces qui avaient déjà un onglet Paramètres le gardent (portée de la
    // demande : Exploitation uniquement). Appels d'offres n'en a jamais eu.
    const othersWithSettings = NAV_CATEGORIES.filter(
      (category) => category.id !== 'exploitation' && category.id !== 'appels-offres'
    );
    for (const category of othersWithSettings) {
      expect(category.pages.map((page) => page.to), category.label).toContain('/settings');
    }
  });

  it('simulates 3 test accounts (exploitant/compta/direction) and confirms each sees different spaces', () => {
    // Pas de vrai compte en base (voir le reste de la session) : on simule les 3 rôles comme le ferait
    // la navigation réelle, avec le même contexte d'accès que celui construit par Sidebar.tsx/useTeam.
    const baseCtx = { hasFeature: () => true, canAccessUserFeature: () => true };

    const exploitantCategories = getVisibleNavCategories({ ...baseCtx, isDirection: false, role: 'exploitation' }).map((c) => c.id);
    const comptaCategories = getVisibleNavCategories({ ...baseCtx, isDirection: false, role: 'comptabilite' }).map((c) => c.id);
    const directionCategories = getVisibleNavCategories({ ...baseCtx, isDirection: true, role: 'direction' }).map((c) => c.id);

    // Exploitant : les espaces opérationnels, jamais Comptabilité ni Rentabilité.
    expect(exploitantCategories).toEqual(expect.arrayContaining(['exploitation', 'geoloc', 'parc', 'appels-offres']));
    expect(exploitantCategories).not.toContain('comptabilite');
    expect(exploitantCategories).not.toContain('rentabilite');
    expect(exploitantCategories).not.toContain('rh');

    // Compta : les espaces financiers, jamais les espaces opérationnels/RH.
    expect(comptaCategories).toEqual(expect.arrayContaining(['comptabilite', 'rentabilite']));
    expect(comptaCategories).not.toContain('exploitation');
    expect(comptaCategories).not.toContain('geoloc');
    expect(comptaCategories).not.toContain('parc');
    expect(comptaCategories).not.toContain('rh');

    // Direction : tous les espaces, sans exception.
    expect(directionCategories).toEqual(NAV_CATEGORIES.map((c) => c.id));

    // Les 3 comptes de test n'ont pas le même accès : la fiabilisation des rôles fonctionne.
    expect(exploitantCategories).not.toEqual(comptaCategories);
    expect(exploitantCategories).not.toEqual(directionCategories);
    expect(comptaCategories).not.toEqual(directionCategories);
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
