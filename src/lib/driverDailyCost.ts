import type { Driver } from '@/types';

/**
 * Calcule le coût journalier d'un conducteur (coût de base, primes,
 * indemnités) selon son type de contrat. Extrait de
 * src/components/ai/LineMontageTab.tsx pour pouvoir être partagé entre
 * le formulaire et la logique de génération — logique identique à
 * l'originale (qui reprenait elle-même celle de tourCostCalculation).
 */
export function computeDriverDailyCost(driver: Driver): {
  dailyCost: number;
  dailyBonuses: number;
  dailyAllowances: number;
  contractLabel: string;
} {
  const isInterim = driver.contractType === 'interim';
  const isAutre = driver.contractType === 'autre';

  if (isAutre) {
    return { dailyCost: 0, dailyBonuses: 0, dailyAllowances: 0, contractLabel: 'Autre' };
  }

  if (isInterim) {
    const interimRate = driver.interimHourlyRate || driver.hourlyRate || 0;
    const coefficient = driver.interimCoefficient || 1.85;
    const hoursPerDay = driver.hoursPerDay || 7;
    return {
      dailyCost: interimRate * coefficient * hoursPerDay,
      dailyBonuses: 0,
      dailyAllowances: driver.mealAllowance || 0,
      contractLabel: 'Intérim',
    };
  }

  // CDI / CDD / Joker
  const monthlyEmployerCost = driver.baseSalary * (1 + driver.patronalCharges / 100);
  const dailyRate = monthlyEmployerCost / driver.workingDaysPerMonth;
  const monthlyBonuses = (driver.nightBonus || 0) + (driver.sundayBonus || 0) + (driver.seniorityBonus || 0);
  const dailyBonuses = monthlyBonuses / driver.workingDaysPerMonth;
  const dailyAllowances = (driver.mealAllowance || 0) + (driver.overnightAllowance || 0);

  const contractLabels: Record<string, string> = { cdi: 'CDI', cdd: 'CDD', joker: 'Joker' };
  return {
    dailyCost: dailyRate,
    dailyBonuses,
    dailyAllowances,
    contractLabel: contractLabels[driver.contractType || 'cdi'] || 'CDI',
  };
}
