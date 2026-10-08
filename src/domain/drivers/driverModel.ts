import type { Driver } from '@/types';

export type DriverContractType = 'cdi' | 'cdd' | 'interim' | 'autre' | 'joker';

export interface ExtendedDriver extends Driver {
  isInterim?: boolean;
  interimAgency?: string;
  interimHourlyRate?: number;
  interimCoefficient?: number;
  scheduleType?: 'day' | 'night' | 'mixed';
  nightStartHour?: number;
  nightEndHour?: number;
  nightBonusPercent?: number;
  assignedClientId?: string;
  assignedCity?: string;
  assignedTourIds?: string[];
}

/** Salary properties that restricted users must never write back. */
export const DRIVER_PAY_FIELDS = [
  'baseSalary', 'hourlyRate', 'patronalCharges',
  'mealAllowance', 'overnightAllowance',
  'sundayBonus', 'nightBonus', 'seniorityBonus', 'unloadingBonus',
  'interimHourlyRate', 'interimCoefficient',
] as const;

export function calculateInterimCost(driver: ExtendedDriver): number {
  return (driver.interimHourlyRate || 15)
    * (driver.interimCoefficient || 1.85)
    * (driver.hoursPerDay || 10)
    * (driver.workingDaysPerMonth || 21);
}

export function calculateEmployerCost(driver: ExtendedDriver): number {
  if (driver.isInterim) return calculateInterimCost(driver);

  const baseCost = (driver.baseSalary + (driver.sundayBonus || 0) + (driver.nightBonus || 0) + (driver.seniorityBonus || 0))
    * (1 + driver.patronalCharges / 100);
  if (driver.scheduleType === 'night' || driver.scheduleType === 'mixed') {
    return baseCost + driver.baseSalary * ((driver.nightBonusPercent || 25) / 100);
  }
  return baseCost;
}

export function getDriverContractType(
  id: string,
  groups: Pick<Record<DriverContractType, Driver[]>, 'cdd' | 'interim' | 'autre' | 'joker'>,
): DriverContractType {
  if (groups.interim.some((driver) => driver.id === id)) return 'interim';
  if (groups.cdd.some((driver) => driver.id === id)) return 'cdd';
  if (groups.autre.some((driver) => driver.id === id)) return 'autre';
  if (groups.joker.some((driver) => driver.id === id)) return 'joker';
  return 'cdi';
}