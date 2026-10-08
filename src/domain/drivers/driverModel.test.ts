import { describe, expect, it } from 'vitest';
import { calculateEmployerCost, calculateInterimCost } from './driverModel';

describe('driver costs', () => {
  it('calculates agency cost for an interim driver', () => {
    expect(calculateInterimCost({ interimHourlyRate: 15, interimCoefficient: 1.85, hoursPerDay: 10, workingDaysPerMonth: 21 } as never)).toBe(5827.5);
  });

  it('adds the configured night increase to employer cost', () => {
    expect(calculateEmployerCost({ baseSalary: 2000, patronalCharges: 40, sundayBonus: 0, nightBonus: 0, seniorityBonus: 0, scheduleType: 'night', nightBonusPercent: 25 } as never)).toBe(3300);
  });
});