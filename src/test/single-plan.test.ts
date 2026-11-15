import { describe, it, expect } from 'vitest';
import { PUBLIC_PLANS } from '@/config/pricingPlans';
import { PLAN_LIMITS } from '@/hooks/usePlanLimits';
import { PLAN_DEFAULTS } from '@/types/features';

describe('Forfaits publics et défauts internes', () => {
  it('affiche les trois forfaits Essentiel, Pro et Entreprise', () => {
    expect(PUBLIC_PLANS.map((p) => p.name)).toEqual(['Essentiel', 'Pro', 'Entreprise']);
  });

  it("l'Entreprise inclut tout, l'Essentiel non", () => {
    expect(PUBLIC_PLANS[2].features.every((f) => f.included)).toBe(true);
    expect(PUBLIC_PLANS[0].features.some((f) => !f.included)).toBe(true);
  });

  it('garde les prix confidentiels (« Sur devis »)', () => {
    expect(PUBLIC_PLANS.every((p) => p.priceLabel === 'Sur devis')).toBe(true);
  });

  it('has only the optiflow plan with unlimited resources', () => {
    expect(Object.keys(PLAN_LIMITS)).toEqual(['optiflow']);
    expect(PLAN_LIMITS.optiflow.maxDrivers).toBe(Infinity);
    expect(PLAN_LIMITS.optiflow.maxVehicles).toBe(Infinity);
    expect(PLAN_LIMITS.optiflow.maxClients).toBe(Infinity);
  });

  it('enables former Enterprise-only features by default', () => {
    expect(Object.keys(PLAN_DEFAULTS)).toEqual(['optiflow']);
    expect(PLAN_DEFAULTS.optiflow.forecast).toBe(true);
    expect(PLAN_DEFAULTS.optiflow.multi_agency).toBe(true);
    expect(PLAN_DEFAULTS.optiflow.smart_quotes).toBe(true);
  });
});
