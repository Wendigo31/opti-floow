import { describe, it, expect } from 'vitest';
import { PUBLIC_PLANS } from '@/config/pricingPlans';
import { PLAN_LIMITS } from '@/hooks/usePlanLimits';
import { PLAN_DEFAULTS } from '@/types/features';

describe('Single plan "OptiFlow"', () => {
  it('exposes exactly one public plan named OptiFlow', () => {
    expect(PUBLIC_PLANS).toHaveLength(1);
    expect(PUBLIC_PLANS[0].name).toBe('OptiFlow');
  });

  it('lists every public feature as included', () => {
    expect(PUBLIC_PLANS[0].features.every((f) => f.included)).toBe(true);
  });

  it('keeps the public price confidential ("Sur devis")', () => {
    expect(PUBLIC_PLANS[0].priceLabel).toBe('Sur devis');
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
