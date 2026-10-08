import type { Driver } from '@/types';

/**
 * Champs de paie : jamais renvoyés par un membre qui n'a pas accès aux
 * données financières (voir useRolePermissions().canViewFinancialData).
 */
export const PAY_FIELDS = [
  'baseSalary', 'hourlyRate', 'patronalCharges',
  'mealAllowance', 'overnightAllowance',
  'sundayBonus', 'nightBonus', 'seniorityBonus', 'unloadingBonus',
  'interimHourlyRate', 'interimCoefficient',
] as const;

export type DriverContractType = 'cdi' | 'cdd' | 'interim' | 'autre' | 'joker';

/** Driver avec les champs étendus utilisés par la page Conducteurs. */
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
