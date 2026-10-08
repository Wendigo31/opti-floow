import type { Driver } from '@/types';

export interface MontageScenario {
  name: string;
  driverCount: number;
  overnightStays: boolean;
  totalCost: number;
  totalDuration: number;
  weeklySchedule: Array<{
    day: string;
    segments: Array<{ driver: string; startTime: string; endTime: string; activity: string; notes?: string }>;
  }>;
  costBreakdown: {
    fuel: number; tolls: number; drivers: number; meals: number; overnight: number;
    vehicleCost: number; structureCost: number; total: number;
  };
  rseCompliance: { valid: boolean; notes: string[]; warnings: string[] };
  pros: string[];
  cons: string[];
  isRecommended: boolean;
}

export interface MontageResponse {
  recommendation: { summary: string; bestScenario: string; estimatedWeeklyCost: number; estimatedMonthlyCost: number };
  scenarios: MontageScenario[];
  regulatoryNotes: string[];
  tips: string[];
  warnings: string[];
}

export function computeDriverDailyCost(driver: Driver): {
  dailyCost: number;
  dailyBonuses: number;
  dailyAllowances: number;
  contractLabel: string;
} {
  if (driver.contractType === 'autre') {
    return { dailyCost: 0, dailyBonuses: 0, dailyAllowances: 0, contractLabel: 'Autre' };
  }

  if (driver.contractType === 'interim') {
    return {
      dailyCost: (driver.interimHourlyRate || driver.hourlyRate || 0) * (driver.interimCoefficient || 1.85) * (driver.hoursPerDay || 7),
      dailyBonuses: 0,
      dailyAllowances: driver.mealAllowance || 0,
      contractLabel: 'Intérim',
    };
  }

  const workingDays = driver.workingDaysPerMonth;
  const labels: Record<string, string> = { cdi: 'CDI', cdd: 'CDD', joker: 'Joker' };
  return {
    dailyCost: driver.baseSalary * (1 + driver.patronalCharges / 100) / workingDays,
    dailyBonuses: ((driver.nightBonus || 0) + (driver.sundayBonus || 0) + (driver.seniorityBonus || 0)) / workingDays,
    dailyAllowances: (driver.mealAllowance || 0) + (driver.overnightAllowance || 0),
    contractLabel: labels[driver.contractType || 'cdi'] || 'CDI',
  };
}