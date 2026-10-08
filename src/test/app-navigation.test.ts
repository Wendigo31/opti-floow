import { describe, expect, it } from 'vitest';
import { APP_NAVIGATION } from '@/config/appNavigation';

describe('authenticated app navigation', () => {
  it('contains the five requested categories in order', () => {
    expect(APP_NAVIGATION.map((category) => category.label)).toEqual([
      'Exploitation',
      'Géoloc',
      'Comptabilité',
      'RH',
      'Gestion de rentabilité',
    ]);
  });

  it('keeps fixed charges as the only accounting page', () => {
    const accounting = APP_NAVIGATION.find((category) => category.id === 'accounting');
    expect(accounting?.items.map((item) => item.to)).toEqual(['/charges']);
    expect(accounting?.items[0].directionOnly).toBe(true);
  });

  it('does not expose internal or removed routes', () => {
    const paths = APP_NAVIGATION.flatMap((category) => category.items.map((item) => item.to));
    expect(paths).not.toContain('/pricing');
    expect(paths).not.toContain('/pricing-export');
    expect(paths).not.toContain('/admin');
  });
});