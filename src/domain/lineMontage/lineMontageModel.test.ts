import { describe, expect, it } from 'vitest';
import { computeDriverDailyCost } from './lineMontageModel';

describe('line montage driver daily cost', () => {
  it('uses the interim agency coefficient', () => {
    expect(computeDriverDailyCost({ contractType: 'interim', interimHourlyRate: 15, interimCoefficient: 1.85, hoursPerDay: 7, mealAllowance: 12 } as never)).toEqual({
      dailyCost: 194.25, dailyBonuses: 0, dailyAllowances: 12, contractLabel: 'Intérim',
    });
  });

  it('keeps non-driver profiles cost-free', () => {
    expect(computeDriverDailyCost({ contractType: 'autre' } as never).dailyCost).toBe(0);
  });
});