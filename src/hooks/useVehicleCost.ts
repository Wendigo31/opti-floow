import { useMemo } from 'react';
import type { Vehicle } from '@/types/vehicle';
import type { Trailer } from '@/types/trailer';

export interface DepreciationResult {
  annualDepreciation: number;
  monthlyDepreciation: number;
  depreciationPerKm: number;
  currentBookValue: number;
  totalDepreciated: number;
  remainingYears: number;
  isFullyDepreciated: boolean;
  depreciationPercent: number; // 0-100, percentage of total depreciation completed
}

export interface VehicleCostBreakdown {
  // Annual costs
  annualMaintenanceCost: number;
  annualTireCost: number;
  annualInsuranceCost: number;
  annualSinisterCharge: number;
  annualLeasingCost: number;
  annualDepreciation: number;
  totalAnnualFixedCost: number;
  
  // Per km costs
  maintenanceCostPerKm: number;
  tireCostPerKm: number;
  fuelCostPerKm: number;
  adBlueCostPerKm: number;
  fixedCostPerKm: number;
  depreciationCostPerKm: number;
  totalCostPerKm: number;
  
  // Depreciation info
  depreciation: DepreciationResult | null;
  
  // Additional info
  estimatedAnnualKm: number;
  nextMaintenanceKm: number | null;
  nextTireChangeKm: number | null;
}

export interface TrailerCostBreakdown {
  annualMaintenanceCost: number;
  annualTireCost: number;
  annualInsuranceCost: number;
  annualLeasingCost: number;
  annualDepreciation: number;
  totalAnnualFixedCost: number;
  maintenanceCostPerKm: number;
  tireCostPerKm: number;
  fixedCostPerKm: number;
  depreciationCostPerKm: number;
  totalCostPerKm: number;
  depreciation: DepreciationResult | null;
  estimatedAnnualKm: number;
}

export interface VehicleCostParams {
  fuelPriceHT: number;
  adBluePriceHT: number;
  estimatedAnnualKm?: number; // If not provided, calculated from average
}

const DEFAULT_ESTIMATED_ANNUAL_KM = 120000; // 120,000 km/year for a semi-trailer

// Calculate vehicle depreciation
export function calculateDepreciation(vehicle: Vehicle): DepreciationResult | null {
  const purchasePrice = vehicle.purchasePrice || 0;
  const depreciationYears = vehicle.depreciationYears || 5;
  const residualValue = vehicle.residualValue || 0;
  const depreciationMethod = vehicle.depreciationMethod || 'linear';
  const expectedLifetimeKm = vehicle.expectedLifetimeKm || 600000;
  
  // No depreciation if no purchase price or if leasing only
  if (purchasePrice <= 0 || depreciationYears <= 0) {
    return null;
  }
  
  const depreciableAmount = purchasePrice - residualValue;
  const vehicleAge = new Date().getFullYear() - vehicle.year;
  
  let annualDepreciation = 0;
  let totalDepreciated = 0;
  
  switch (depreciationMethod) {
    case 'linear':
      // Linear depreciation: same amount each year
      annualDepreciation = depreciableAmount / depreciationYears;
      totalDepreciated = Math.min(annualDepreciation * vehicleAge, depreciableAmount);
      break;
      
    case 'degressive':
      // Degressive depreciation: higher in first years (coefficient 2.25 for 5+ years)
      const coefficient = depreciationYears >= 5 ? 2.25 : depreciationYears >= 3 ? 1.75 : 1.25;
      const linearRate = 100 / depreciationYears;
      const degressiveRate = linearRate * coefficient;
      
      let remainingValue = purchasePrice;
      for (let year = 0; year < vehicleAge && year < depreciationYears; year++) {
        const degressiveAmount = remainingValue * (degressiveRate / 100);
        const linearAmount = (purchasePrice - residualValue) / depreciationYears;
        const yearlyDepreciation = Math.max(degressiveAmount, linearAmount);
        totalDepreciated += Math.min(yearlyDepreciation, remainingValue - residualValue);
        remainingValue -= yearlyDepreciation;
        if (remainingValue < residualValue) remainingValue = residualValue;
      }
      
      // Calculate current year's depreciation
      const currentDegressiveAmount = (purchasePrice - totalDepreciated) * (degressiveRate / 100);
      const currentLinearAmount = depreciableAmount / depreciationYears;
      annualDepreciation = Math.max(currentDegressiveAmount, currentLinearAmount);
      break;
      
    case 'km':
      // Kilometer-based depreciation
      const depreciationPerKm = depreciableAmount / expectedLifetimeKm;
      totalDepreciated = Math.min(depreciationPerKm * vehicle.currentKm, depreciableAmount);
      // Assume 120,000 km/year for annual calculation
      annualDepreciation = depreciationPerKm * DEFAULT_ESTIMATED_ANNUAL_KM;
      break;
  }
  
  const currentBookValue = purchasePrice - totalDepreciated;
  const isFullyDepreciated = totalDepreciated >= depreciableAmount;
  const remainingYears = isFullyDepreciated ? 0 : Math.ceil((depreciableAmount - totalDepreciated) / annualDepreciation);
  const depreciationPerKm = expectedLifetimeKm > 0 ? depreciableAmount / expectedLifetimeKm : 0;
  const depreciationPercent = depreciableAmount > 0 ? (totalDepreciated / depreciableAmount) * 100 : 0;
  
  return {
    annualDepreciation,
    monthlyDepreciation: annualDepreciation / 12,
    depreciationPerKm,
    currentBookValue: Math.max(currentBookValue, residualValue),
    totalDepreciated,
    remainingYears,
    isFullyDepreciated,
    depreciationPercent: Math.min(depreciationPercent, 100),
  };
}

export function calculateVehicleCosts(
  vehicle: Vehicle,
  params: VehicleCostParams
): VehicleCostBreakdown {
  const estimatedAnnualKm = params.estimatedAnnualKm || DEFAULT_ESTIMATED_ANNUAL_KM;
  
  // === Depreciation ===
  const depreciation = calculateDepreciation(vehicle);
  const annualDepreciation = depreciation?.annualDepreciation || 0;
  const depreciationCostPerKm = depreciation?.depreciationPerKm || 0;
  
  // === Annual Maintenance Cost ===
  // Calculate cost per km for each maintenance and multiply by annual km
  let annualMaintenanceCost = 0;
  let nextMaintenanceKm: number | null = null;
  
  for (const maintenance of vehicle.maintenances) {
    if (maintenance.intervalKm > 0) {
      // Cost per km for this maintenance
      const maintenancePerKm = maintenance.cost / maintenance.intervalKm;
      annualMaintenanceCost += maintenancePerKm * estimatedAnnualKm;
      
      // Calculate next maintenance
      const kmUntilNext = maintenance.intervalKm - (vehicle.currentKm - maintenance.lastKm);
      if (kmUntilNext > 0 && (nextMaintenanceKm === null || kmUntilNext < nextMaintenanceKm)) {
        nextMaintenanceKm = vehicle.currentKm + kmUntilNext;
      }
    }
  }
  
  // === Annual Tire Cost ===
  // Calculate cost per km for each tire set and multiply by annual km
  let annualTireCost = 0;
  let nextTireChangeKm: number | null = null;
  
  for (const tire of vehicle.tires) {
    if (tire.durabilityKm > 0) {
      // Total cost for this tire set
      const tireTotalCost = tire.pricePerUnit * tire.quantity;
      // Cost per km
      const tirePerKm = tireTotalCost / tire.durabilityKm;
      annualTireCost += tirePerKm * estimatedAnnualKm;
      
      // Calculate next tire change
      const kmUntilChange = tire.durabilityKm - (vehicle.currentKm - tire.lastChangeKm);
      if (kmUntilChange > 0 && (nextTireChangeKm === null || kmUntilChange < nextTireChangeKm)) {
        nextTireChangeKm = vehicle.currentKm + kmUntilChange;
      }
    }
  }
  
  // === Annual Fixed Costs ===
  const annualInsuranceCost = vehicle.insuranceCost || 0;
  const annualSinisterCharge = vehicle.sinisterCharge || 0;
  const annualLeasingCost = (vehicle.monthlyLeasing || 0) * 12;
  
  const totalAnnualFixedCost = 
    annualMaintenanceCost + 
    annualTireCost + 
    annualInsuranceCost + 
    annualSinisterCharge + 
    annualLeasingCost +
    annualDepreciation;
  
  // === Per km costs ===
  // Maintenance cost per km
  const maintenanceCostPerKm = vehicle.maintenances.reduce((total, m) => {
    if (m.intervalKm > 0) {
      return total + (m.cost / m.intervalKm);
    }
    return total;
  }, 0);
  
  // Tire cost per km
  const tireCostPerKm = vehicle.tires.reduce((total, t) => {
    if (t.durabilityKm > 0) {
      return total + ((t.pricePerUnit * t.quantity) / t.durabilityKm);
    }
    return total;
  }, 0);
  
  // Fuel cost per km
  const fuelCostPerKm = (vehicle.fuelConsumption / 100) * params.fuelPriceHT;
  
  // AdBlue cost per km
  const adBlueCostPerKm = (vehicle.adBlueConsumption / 100) * params.adBluePriceHT;
  
  // Fixed costs spread per km (insurance, sinister, leasing)
  const fixedCostPerKm = estimatedAnnualKm > 0 
    ? (annualInsuranceCost + annualSinisterCharge + annualLeasingCost) / estimatedAnnualKm
    : 0;
  
  // Total cost per km (including depreciation)
  const totalCostPerKm = 
    maintenanceCostPerKm + 
    tireCostPerKm + 
    fuelCostPerKm + 
    adBlueCostPerKm + 
    fixedCostPerKm +
    depreciationCostPerKm;
  
  return {
    annualMaintenanceCost,
    annualTireCost,
    annualInsuranceCost,
    annualSinisterCharge,
    annualLeasingCost,
    annualDepreciation,
    totalAnnualFixedCost,
    maintenanceCostPerKm,
    tireCostPerKm,
    fuelCostPerKm,
    adBlueCostPerKm,
    fixedCostPerKm,
    depreciationCostPerKm,
    totalCostPerKm,
    depreciation,
    estimatedAnnualKm,
    nextMaintenanceKm,
    nextTireChangeKm,
  };
}

export function useVehicleCost(
  vehicle: Vehicle | null,
  params: VehicleCostParams
): VehicleCostBreakdown | null {
  return useMemo(() => {
    if (!vehicle) return null;
    return calculateVehicleCosts(vehicle, params);
  }, [vehicle, params.fuelPriceHT, params.adBluePriceHT, params.estimatedAnnualKm]);
}

// Calculate trailer depreciation
export function calculateTrailerDepreciation(trailer: Trailer): DepreciationResult | null {
  const purchasePrice = trailer.purchasePrice || 0;
  const depreciationYears = trailer.depreciationYears || 7;
  const residualValue = trailer.residualValue || 0;
  const depreciationMethod = trailer.depreciationMethod || 'linear';
  const expectedLifetimeKm = trailer.expectedLifetimeKm || 800000;
  
  if (purchasePrice <= 0 || depreciationYears <= 0) {
    return null;
  }
  
  const depreciableAmount = purchasePrice - residualValue;
  const trailerAge = new Date().getFullYear() - trailer.year;
  
  let annualDepreciation = 0;
  let totalDepreciated = 0;
  
  switch (depreciationMethod) {
    case 'linear':
      annualDepreciation = depreciableAmount / depreciationYears;
      totalDepreciated = Math.min(annualDepreciation * trailerAge, depreciableAmount);
      break;
      
    case 'degressive':
      const coefficient = depreciationYears >= 5 ? 2.25 : depreciationYears >= 3 ? 1.75 : 1.25;
      const linearRate = 100 / depreciationYears;
      const degressiveRate = linearRate * coefficient;
      
      let remainingValue = purchasePrice;
      for (let year = 0; year < trailerAge && year < depreciationYears; year++) {
        const degressiveAmount = remainingValue * (degressiveRate / 100);
        const linearAmount = (purchasePrice - residualValue) / depreciationYears;
        const yearlyDepreciation = Math.max(degressiveAmount, linearAmount);
        totalDepreciated += Math.min(yearlyDepreciation, remainingValue - residualValue);
        remainingValue -= yearlyDepreciation;
        if (remainingValue < residualValue) remainingValue = residualValue;
      }
      
      const currentDegressiveAmount = (purchasePrice - totalDepreciated) * (degressiveRate / 100);
      const currentLinearAmount = depreciableAmount / depreciationYears;
      annualDepreciation = Math.max(currentDegressiveAmount, currentLinearAmount);
      break;
      
    case 'km':
      const depreciationPerKm = depreciableAmount / expectedLifetimeKm;
      totalDepreciated = Math.min(depreciationPerKm * trailer.currentKm, depreciableAmount);
      annualDepreciation = depreciationPerKm * DEFAULT_ESTIMATED_ANNUAL_KM;
      break;
  }
  
  const currentBookValue = purchasePrice - totalDepreciated;
  const isFullyDepreciated = totalDepreciated >= depreciableAmount;
  const remainingYears = isFullyDepreciated ? 0 : Math.ceil((depreciableAmount - totalDepreciated) / annualDepreciation);
  const depreciationPerKm = expectedLifetimeKm > 0 ? depreciableAmount / expectedLifetimeKm : 0;
  const depreciationPercent = depreciableAmount > 0 ? (totalDepreciated / depreciableAmount) * 100 : 0;
  
  return {
    annualDepreciation,
    monthlyDepreciation: annualDepreciation / 12,
    depreciationPerKm,
    currentBookValue: Math.max(currentBookValue, residualValue),
    totalDepreciated,
    remainingYears,
    isFullyDepreciated,
    depreciationPercent: Math.min(depreciationPercent, 100),
  };
}

// Calculate trailer costs
export function calculateTrailerCosts(
  trailer: Trailer,
  params: { estimatedAnnualKm?: number }
): TrailerCostBreakdown {
  const estimatedAnnualKm = params.estimatedAnnualKm || DEFAULT_ESTIMATED_ANNUAL_KM;
  
  // Depreciation
  const depreciation = calculateTrailerDepreciation(trailer);
  const annualDepreciation = depreciation?.annualDepreciation || 0;
  const depreciationCostPerKm = depreciation?.depreciationPerKm || 0;
  
  // Annual maintenance cost
  let annualMaintenanceCost = 0;
  for (const maintenance of trailer.maintenances) {
    if (maintenance.intervalKm > 0) {
      const maintenancePerKm = maintenance.cost / maintenance.intervalKm;
      annualMaintenanceCost += maintenancePerKm * estimatedAnnualKm;
    }
  }
  
  // Annual tire cost
  let annualTireCost = 0;
  for (const tire of trailer.tires) {
    if (tire.durabilityKm > 0) {
      const tireTotalCost = tire.pricePerUnit * tire.quantity;
      const tirePerKm = tireTotalCost / tire.durabilityKm;
      annualTireCost += tirePerKm * estimatedAnnualKm;
    }
  }
  
  // Annual fixed costs
  const annualInsuranceCost = trailer.insuranceCost || 0;
  const annualLeasingCost = (trailer.monthlyLeasing || 0) * 12;
  
  const totalAnnualFixedCost = annualMaintenanceCost + annualTireCost + annualInsuranceCost + annualLeasingCost + annualDepreciation;
  
  // Per km costs
  const maintenanceCostPerKm = trailer.maintenances.reduce((total, m) => {
    if (m.intervalKm > 0) {
      return total + (m.cost / m.intervalKm);
    }
    return total;
  }, 0);
  
  const tireCostPerKm = trailer.tires.reduce((total, t) => {
    if (t.durabilityKm > 0) {
      return total + ((t.pricePerUnit * t.quantity) / t.durabilityKm);
    }
    return total;
  }, 0);
  
  const fixedCostPerKm = estimatedAnnualKm > 0 
    ? (annualInsuranceCost + annualLeasingCost) / estimatedAnnualKm
    : 0;
  
  const totalCostPerKm = maintenanceCostPerKm + tireCostPerKm + fixedCostPerKm + depreciationCostPerKm;
  
  return {
    annualMaintenanceCost,
    annualTireCost,
    annualInsuranceCost,
    annualLeasingCost,
    annualDepreciation,
    totalAnnualFixedCost,
    maintenanceCostPerKm,
    tireCostPerKm,
    fixedCostPerKm,
    depreciationCostPerKm,
    totalCostPerKm,
    depreciation,
    estimatedAnnualKm,
  };
}

export function useTrailerCost(
  trailer: Trailer | null,
  params: { estimatedAnnualKm?: number }
): TrailerCostBreakdown | null {
  return useMemo(() => {
    if (!trailer) return null;
    return calculateTrailerCosts(trailer, params);
  }, [trailer, params.estimatedAnnualKm]);
}

// Helper function to format cost per km display
export function formatCostPerKm(value: number): string {
  return new Intl.NumberFormat('fr-FR', { 
    style: 'currency', 
    currency: 'EUR',
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(value);
}

// Helper function to get color based on cost per km
export function getCostPerKmColor(costPerKm: number): 'success' | 'warning' | 'destructive' {
  if (costPerKm < 0.80) return 'success';
  if (costPerKm < 1.00) return 'warning';
  return 'destructive';
}
