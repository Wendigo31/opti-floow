import { describe, expect, it } from 'vitest';
import { NAV_CATEGORIES } from '@/config/appNavigation';

describe('authenticated app navigation', () => {
  it('contains the five requested categories in order', () => {
    expect(NAV_CATEGORIES.map((category) => category.label)).toEqual([
      'Exploitation',
      'Géoloc',
      'Comptabilité',
      'RH',
      'Gestion de rentabilité',
    ]);
  });

  it('keeps fixed charges as the only accounting page', () => {
    const accounting = NAV_CATEGORIES.find((category) => category.id === 'comptabilite');
    expect(accounting?.pages.map((page) => page.to)).toEqual(['/charges']);
    expect(accounting?.pages[0].directionOnly).toBe(true);
  });

  it('keeps shared operational pages available from exploitation', () => {
    const operations = NAV_CATEGORIES.find((category) => category.id === 'exploitation');
    expect(operations?.pages.map((page) => page.to)).toEqual(expect.arrayContaining([
      '/planning', '/tours', '/clients', '/vehicles',
    ]));
  });

  it('does not expose internal or removed routes', () => {
    const paths = NAV_CATEGORIES.flatMap((category) => category.pages.map((page) => page.to));
    expect(paths).not.toContain('/pricing');
    expect(paths).not.toContain('/pricing-export');
    expect(paths).not.toContain('/admin');
  });
});
