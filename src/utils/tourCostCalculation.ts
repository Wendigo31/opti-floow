/**
 * Centralized tour cost calculation engine.
 * Integrates ALL cost components:
 * - Fuel & AdBlue
 * - Driver: salary + patronal charges + bonuses (night, sunday, seniority) + meal/overnight allowances
 * - Vehicle: leasing + insurance + sinister + depreciation + maintenance + tires
 * - Trailer: leasing + insurance + depreciation + maintenance + tires
 * - Structure: fixed charges (daily/monthly/yearly)
 */
import type { Driver, FixedCharge, AppSettings, VehicleParams } from '@/types';
import type { Vehicle } from '@/types/vehicle';
import type { Trailer } from '@/types/trailer';
import { calculateVehicleCosts, type VehicleCostParams } from '@/hooks/useVehicleCost';
import { calculateTrailerCosts } from '@/hooks/useVehicleCost';

export interface TourCostResult {
  fuelCost: number;
  adBlueCost: number;
  tollCost: number;
  driverCost: number;
  driverBonuses: number; // primes (nuit, dimanche, ancienneté)
  driverAllowances: number; // indemnités (repas, découcher)
  structureCost: number;
  vehicleCost: number; // leasing + insurance + sinister + depreciation + maintenance + tires
  trailerCost: number; // leasing + insurance + depreciation + maintenance + tires
  totalCost: number;
}

const toHT = (amount: number, tvaRate: number, isHT: boolean): number => {
  if (isHT) return amount;
  return amount / (1 + tvaRate / 100);
};

export function calculateTourCosts(params: {
  distance: number;
  tollCost: number;
  selectedDrivers: Driver[];
  selectedVehicles: Vehicle[];
  selectedTrailer: Trailer | null;
  charges: FixedCharge[];
  settings: AppSettings;
  appVehicleParams: VehicleParams;
}): TourCostResult {
  const { distance, tollCost, selectedDrivers, selectedVehicles, selectedTrailer, charges, settings, appVehicleParams } = params;
  const tvaRate = settings.tvaRate || 20;

  // ── Fuel & AdBlue ──
  const fuelPriceHT = toHT(appVehicleParams.fuelPriceHT, tvaRate, appVehicleParams.fuelPriceIsHT);
  const adBluePriceHT = toHT(appVehicleParams.adBluePriceHT, tvaRate, appVehicleParams.adBluePriceIsHT);

  let fuelConsumption = appVehicleParams.fuelConsumption;
  let adBlueConsumption = appVehicleParams.adBlueConsumption;
  if (selectedVehicles.length > 0) {
    fuelConsumption = selectedVehicles.reduce((s, v) => s + v.fuelConsumption, 0) / selectedVehicles.length;
    adBlueConsumption = selectedVehicles.reduce((s, v) => s + v.adBlueConsumption, 0) / selectedVehicles.length;
  }

  const fuelCost = (distance / 100) * fuelConsumption * fuelPriceHT;
  const adBlueCost = (distance / 100) * adBlueConsumption * adBluePriceHT;

  // ── Driver costs (salary + bonuses + allowances) ──
  let driverCost = 0;
  let driverBonuses = 0;
  let driverAllowances = 0;

  for (const driver of selectedDrivers) {
    const isInterim = driver.contractType === 'interim';
    const isAutre = driver.contractType === 'autre';

    if (isAutre) {
      // "Autre" type drivers have no cost (they're not real drivers)
      continue;
    }

    if (isInterim) {
      // Interim: hourly rate × coefficient × hours per day
      const interimRate = (driver as any).interimHourlyRate || driver.hourlyRate || 0;
      const coefficient = (driver as any).interimCoefficient || 1.85;
      const hoursPerDay = driver.hoursPerDay || 7;
      driverCost += interimRate * coefficient * hoursPerDay;
      // Interim drivers typically don't have bonuses/allowances from the company
      driverAllowances += (driver.mealAllowance || 0);
    } else {
      // CDI/CDD: Base daily employer cost
      const monthlyEmployerCost = driver.baseSalary * (1 + driver.patronalCharges / 100);
      const dailyRate = monthlyEmployerCost / driver.workingDaysPerMonth;
      driverCost += dailyRate;

      // Daily bonuses (night, sunday, seniority) — prorated per working day
      const monthlyBonuses = (driver.nightBonus || 0) + (driver.sundayBonus || 0) + (driver.seniorityBonus || 0);
      const dailyBonuses = monthlyBonuses / driver.workingDaysPerMonth;
      driverBonuses += dailyBonuses;

      // Allowances per day (meal + overnight)
      driverAllowances += (driver.mealAllowance || 0) + (driver.overnightAllowance || 0);
    }
  }

  // ── Structure costs (fixed charges) ──
  const structureCost = charges.reduce((total, charge) => {
    const amountHT = toHT(charge.amount, tvaRate, charge.isHT);
    let dailyAmount = 0;
    switch (charge.periodicity) {
      case 'yearly': dailyAmount = amountHT / settings.workingDaysPerYear; break;
      case 'monthly': dailyAmount = amountHT / settings.workingDaysPerMonth; break;
      case 'daily': dailyAmount = amountHT; break;
    }
    return total + dailyAmount;
  }, 0);

  // ── Vehicle costs (full: leasing + insurance + sinister + depreciation + maintenance + tires) ──
  let vehicleCost = 0;
  const vehicleCostParams: VehicleCostParams = {
    fuelPriceHT,
    adBluePriceHT,
  };

  for (const vehicle of selectedVehicles) {
    const breakdown = calculateVehicleCosts(vehicle, vehicleCostParams);
    // Daily fixed cost = annual total / working days per year
    const dailyFixed = breakdown.totalAnnualFixedCost / settings.workingDaysPerYear;
    vehicleCost += dailyFixed;
  }

  // ── Trailer costs (leasing + insurance + depreciation + maintenance + tires) ──
  let trailerCost = 0;
  if (selectedTrailer) {
    const trailerBreakdown = calculateTrailerCosts(selectedTrailer, {});
    const dailyTrailerFixed = trailerBreakdown.totalAnnualFixedCost / settings.workingDaysPerYear;
    trailerCost = dailyTrailerFixed;
  }

  // ── Total ──
  const totalCost = fuelCost + adBlueCost + tollCost + driverCost + driverBonuses + driverAllowances + structureCost + vehicleCost + trailerCost;

  return {
    fuelCost,
    adBlueCost,
    tollCost,
    driverCost,
    driverBonuses,
    driverAllowances,
    structureCost,
    vehicleCost,
    trailerCost,
    totalCost,
  };
}
