/**
 * Validation utilities for AI optimization requests
 * Ensures all required data is present and valid before calling the API
 */

export interface DriverForAI {
  name: string;
  hourlyCost: number;
  nightBonus?: number;
  sundayBonus?: number;
  mealAllowance?: number;
  overnightAllowance?: number;
  hoursPerDay?: number;
}

export interface CurrentCostsForAI {
  fuel: number;
  tolls: number;
  driver: number;
  structure?: number;
  total: number;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  sanitizedDrivers?: DriverForAI[];
  sanitizedCosts?: CurrentCostsForAI;
}

/**
 * Safely calculates hourly cost from driver data
 * Returns 0 if calculation would result in NaN or Infinity
 */
export function calculateSafeHourlyCost(driver: {
  hourlyRate?: number;
  baseSalary?: number;
  workingDaysPerMonth?: number;
  hoursPerDay?: number;
}): number {
  // If hourlyRate is already defined and valid, use it
  if (typeof driver.hourlyRate === 'number' && isFinite(driver.hourlyRate) && driver.hourlyRate > 0) {
    return driver.hourlyRate;
  }

  // Try to calculate from salary data
  const baseSalary = driver.baseSalary || 0;
  const workingDays = driver.workingDaysPerMonth || 22;
  const hoursPerDay = driver.hoursPerDay || 8;

  if (workingDays <= 0 || hoursPerDay <= 0) {
    return 0;
  }

  const calculated = baseSalary / (workingDays * hoursPerDay);
  
  return isFinite(calculated) && calculated > 0 ? calculated : 0;
}

/**
 * Validates and sanitizes driver data for AI API
 */
export function validateDrivers(
  driversData: Array<{
    name?: string;
    hourlyRate?: number;
    baseSalary?: number;
    workingDaysPerMonth?: number;
    hoursPerDay?: number;
    nightBonus?: number;
    sundayBonus?: number;
    mealAllowance?: number;
    overnightAllowance?: number;
  }>
): { isValid: boolean; errors: string[]; sanitizedDrivers: DriverForAI[] } {
  const errors: string[] = [];
  const sanitizedDrivers: DriverForAI[] = [];

  if (!driversData || driversData.length === 0) {
    return { isValid: false, errors: ['Aucun conducteur sélectionné'], sanitizedDrivers: [] };
  }

  driversData.forEach((d, index) => {
    const name = d.name || `Conducteur ${index + 1}`;
    const hourlyCost = calculateSafeHourlyCost(d);

    // Only warn if hourlyCost is 0 but don't block - use a default
    const effectiveHourlyCost = hourlyCost > 0 ? hourlyCost : 15; // Default hourly cost if not calculable

    sanitizedDrivers.push({
      name,
      hourlyCost: effectiveHourlyCost,
      nightBonus: typeof d.nightBonus === 'number' ? d.nightBonus : undefined,
      sundayBonus: typeof d.sundayBonus === 'number' ? d.sundayBonus : undefined,
      mealAllowance: typeof d.mealAllowance === 'number' ? d.mealAllowance : undefined,
      overnightAllowance: typeof d.overnightAllowance === 'number' ? d.overnightAllowance : undefined,
      hoursPerDay: typeof d.hoursPerDay === 'number' && d.hoursPerDay > 0 ? d.hoursPerDay : 8,
    });
  });

  // No errors - we use defaults for missing data
  return {
    isValid: true,
    errors,
    sanitizedDrivers,
  };
}

/**
 * Validates and sanitizes current costs from a loaded tour
 */
export function validateCurrentCosts(
  costs: {
    fuel_cost?: number;
    toll_cost?: number;
    driver_cost?: number;
    structure_cost?: number;
    total_cost?: number;
  } | null | undefined
): { isValid: boolean; errors: string[]; sanitizedCosts: CurrentCostsForAI | undefined } {
  if (!costs) {
    return { isValid: true, errors: [], sanitizedCosts: undefined };
  }

  const errors: string[] = [];

  const fuel = typeof costs.fuel_cost === 'number' && isFinite(costs.fuel_cost) ? costs.fuel_cost : 0;
  const tolls = typeof costs.toll_cost === 'number' && isFinite(costs.toll_cost) ? costs.toll_cost : 0;
  const driver = typeof costs.driver_cost === 'number' && isFinite(costs.driver_cost) ? costs.driver_cost : 0;
  const structure = typeof costs.structure_cost === 'number' && isFinite(costs.structure_cost) ? costs.structure_cost : 0;
  const total = typeof costs.total_cost === 'number' && isFinite(costs.total_cost) ? costs.total_cost : 0;

  // Warn if total seems inconsistent (but don't block)
  const calculatedTotal = fuel + tolls + driver + structure;
  if (total > 0 && Math.abs(total - calculatedTotal) > total * 0.1) {
    // More than 10% difference - just a warning, don't fail
    console.warn('AI Validation: Total cost differs significantly from sum of components');
  }

  // If everything is 0, that's suspicious for an existing tour
  if (total === 0 && fuel === 0 && driver === 0) {
    errors.push('Les coûts de la tournée chargée sont tous à zéro. Vérifiez les données.');
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitizedCosts: {
      fuel,
      tolls,
      driver,
      structure,
      total: total > 0 ? total : calculatedTotal,
    },
  };
}

/**
 * Full validation for AI optimization request
 */
export function validateAIRequest(params: {
  origin: string;
  destination: string;
  vehicle: { type?: string; fuelConsumption?: number } | null;
  fuelPrice: number;
  driversData: Array<{
    name?: string;
    hourlyRate?: number;
    baseSalary?: number;
    workingDaysPerMonth?: number;
    hoursPerDay?: number;
    nightBonus?: number;
    sundayBonus?: number;
    mealAllowance?: number;
    overnightAllowance?: number;
  }>;
  loadedTour?: {
    fuel_cost?: number;
    toll_cost?: number;
    driver_cost?: number;
    structure_cost?: number;
    total_cost?: number;
  } | null;
}): ValidationResult {
  const errors: string[] = [];

  // Basic validations
  if (!params.origin?.trim()) {
    errors.push("L'origine est requise");
  }

  if (!params.destination?.trim()) {
    errors.push("La destination est requise");
  }

  if (!params.vehicle) {
    errors.push("Veuillez sélectionner un véhicule");
  } else {
    if (!params.vehicle.type) {
      errors.push("Type de véhicule non défini");
    }
    if (typeof params.vehicle.fuelConsumption !== 'number' || params.vehicle.fuelConsumption <= 0) {
      errors.push("Consommation du véhicule invalide");
    }
  }

  if (typeof params.fuelPrice !== 'number' || params.fuelPrice <= 0) {
    errors.push("Prix du carburant invalide");
  }

  // Validate drivers
  const driverValidation = validateDrivers(params.driversData);
  if (!driverValidation.isValid) {
    errors.push(...driverValidation.errors);
  }

  // Validate current costs if present
  const costsValidation = validateCurrentCosts(params.loadedTour);
  if (!costsValidation.isValid) {
    errors.push(...costsValidation.errors);
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitizedDrivers: driverValidation.sanitizedDrivers,
    sanitizedCosts: costsValidation.sanitizedCosts,
  };
}
