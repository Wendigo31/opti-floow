import { describe, it, expect } from 'vitest';
import {
  calculateDepreciation,
  calculateVehicleCosts,
  calculateTrailerDepreciation,
  calculateTrailerCosts,
  formatCostPerKm,
  getCostPerKmColor,
} from '../useVehicleCost';
import { defaultVehicle } from '@/types/vehicle';
import { defaultTrailer } from '@/types/trailer';
import type { Vehicle } from '@/types/vehicle';
import type { Trailer } from '@/types/trailer';

const CURRENT_YEAR = new Date().getFullYear();

function makeVehicle(overrides: Partial<Vehicle> = {}): Vehicle {
  return {
    ...defaultVehicle,
    id: 'v1',
    createdAt: '',
    updatedAt: '',
    ...overrides,
  } as Vehicle;
}

function makeTrailer(overrides: Partial<Trailer> = {}): Trailer {
  return {
    ...defaultTrailer,
    id: 't1',
    createdAt: '',
    updatedAt: '',
    ...overrides,
  } as Trailer;
}

describe('calculateDepreciation', () => {
  it('returns null when there is no purchase price', () => {
    const vehicle = makeVehicle({ purchasePrice: 0 });
    expect(calculateDepreciation(vehicle)).toBeNull();
  });

  it('returns null when depreciationYears is 0 (leasing-only vehicle)', () => {
    const vehicle = makeVehicle({ purchasePrice: 100000, depreciationYears: 0 });
    expect(calculateDepreciation(vehicle)).toBeNull();
  });

  it('linear method: spreads (price - residual) evenly over the depreciation years', () => {
    const vehicle = makeVehicle({
      purchasePrice: 100000,
      residualValue: 10000,
      depreciationYears: 5,
      depreciationMethod: 'linear',
      year: CURRENT_YEAR, // age 0 -> nothing depreciated yet
    });
    const result = calculateDepreciation(vehicle)!;
    expect(result.annualDepreciation).toBeCloseTo((100000 - 10000) / 5, 5); // 18000
    expect(result.totalDepreciated).toBeCloseTo(0, 5);
    expect(result.currentBookValue).toBeCloseTo(100000, 5);
  });

  it('linear method: after N years, totalDepreciated caps at the depreciable amount', () => {
    const vehicle = makeVehicle({
      purchasePrice: 100000,
      residualValue: 10000,
      depreciationYears: 5,
      depreciationMethod: 'linear',
      year: CURRENT_YEAR - 10, // way past full depreciation
    });
    const result = calculateDepreciation(vehicle)!;
    expect(result.totalDepreciated).toBeCloseTo(90000, 5);
    expect(result.isFullyDepreciated).toBe(true);
    expect(result.currentBookValue).toBeCloseTo(10000, 5); // clamped at residual value
    expect(result.remainingYears).toBe(0);
  });

  it('km method: depreciates proportionally to currentKm / expectedLifetimeKm', () => {
    const vehicle = makeVehicle({
      purchasePrice: 200000,
      residualValue: 20000,
      depreciationMethod: 'km',
      expectedLifetimeKm: 900000,
      currentKm: 450000, // halfway through its expected life
    });
    const result = calculateDepreciation(vehicle)!;
    const depreciationPerKm = (200000 - 20000) / 900000;
    expect(result.depreciationPerKm).toBeCloseTo(depreciationPerKm, 5);
    expect(result.totalDepreciated).toBeCloseTo(depreciationPerKm * 450000, 5);
    expect(result.depreciationPercent).toBeCloseTo(50, 1);
  });

  it('degressive method never depreciates slower than the equivalent linear rate', () => {
    const vehicle = makeVehicle({
      purchasePrice: 100000,
      residualValue: 0,
      depreciationYears: 5,
      depreciationMethod: 'degressive',
      year: CURRENT_YEAR - 4,
    });
    const linearEquivalent = makeVehicle({
      purchasePrice: 100000,
      residualValue: 0,
      depreciationYears: 5,
      depreciationMethod: 'linear',
      year: CURRENT_YEAR - 4,
    });
    const degressive = calculateDepreciation(vehicle)!;
    const linear = calculateDepreciation(linearEquivalent)!;
    expect(degressive.totalDepreciated).toBeGreaterThanOrEqual(linear.totalDepreciated - 1e-6);
  });

  it('never lets currentBookValue drop below the residual value', () => {
    const vehicle = makeVehicle({
      purchasePrice: 50000,
      residualValue: 5000,
      depreciationYears: 3,
      depreciationMethod: 'linear',
      year: CURRENT_YEAR - 20,
    });
    const result = calculateDepreciation(vehicle)!;
    expect(result.currentBookValue).toBeGreaterThanOrEqual(5000);
  });
});

describe('calculateVehicleCosts', () => {
  it('computes fuel and AdBlue cost per km from consumption and HT prices', () => {
    const vehicle = makeVehicle({ fuelConsumption: 32, adBlueConsumption: 1.5, purchasePrice: 0 });
    const result = calculateVehicleCosts(vehicle, { fuelPriceHT: 1.5, adBluePriceHT: 0.5 });
    expect(result.fuelCostPerKm).toBeCloseTo((32 / 100) * 1.5, 5);
    expect(result.adBlueCostPerKm).toBeCloseTo((1.5 / 100) * 0.5, 5);
  });

  it('spreads a maintenance cost over its interval, scaled to the annual km', () => {
    const vehicle = makeVehicle({
      purchasePrice: 0,
      maintenances: [
        { id: 'm1', type: 'vidange', name: 'Vidange', intervalKm: 50000, lastKm: 0, lastDate: '', cost: 500 },
      ],
    });
    const result = calculateVehicleCosts(vehicle, { fuelPriceHT: 0, adBluePriceHT: 0, estimatedAnnualKm: 100000 });
    const perKm = 500 / 50000;
    expect(result.maintenanceCostPerKm).toBeCloseTo(perKm, 6);
    expect(result.annualMaintenanceCost).toBeCloseTo(perKm * 100000, 5);
  });

  it('flags the next maintenance km based on remaining distance to the interval', () => {
    const vehicle = makeVehicle({
      purchasePrice: 0,
      currentKm: 40000,
      maintenances: [
        { id: 'm1', type: 'vidange', name: 'Vidange', intervalKm: 50000, lastKm: 0, lastDate: '', cost: 500 },
      ],
    });
    const result = calculateVehicleCosts(vehicle, { fuelPriceHT: 0, adBluePriceHT: 0 });
    expect(result.nextMaintenanceKm).toBe(50000); // 40000 + (50000 - 40000)
  });

  it('spreads insurance, sinister and leasing as a fixed cost per km', () => {
    const vehicle = makeVehicle({
      purchasePrice: 0,
      insuranceCost: 2400,
      sinisterCharge: 600,
      monthlyLeasing: 1000,
    });
    const result = calculateVehicleCosts(vehicle, { fuelPriceHT: 0, adBluePriceHT: 0, estimatedAnnualKm: 120000 });
    const expectedFixed = (2400 + 600 + 1000 * 12) / 120000;
    expect(result.fixedCostPerKm).toBeCloseTo(expectedFixed, 6);
  });

  it('rolls fuel, AdBlue, maintenance, tires, fixed costs and depreciation into totalCostPerKm', () => {
    const vehicle = makeVehicle({ purchasePrice: 0, fuelConsumption: 30, adBlueConsumption: 1 });
    const result = calculateVehicleCosts(vehicle, { fuelPriceHT: 1.5, adBluePriceHT: 0.5 });
    const sum =
      result.maintenanceCostPerKm +
      result.tireCostPerKm +
      result.fuelCostPerKm +
      result.adBlueCostPerKm +
      result.fixedCostPerKm +
      result.depreciationCostPerKm;
    expect(result.totalCostPerKm).toBeCloseTo(sum, 8);
  });
});

describe('trailer depreciation and costs (mirrors vehicle logic)', () => {
  it('returns null with no purchase price', () => {
    const trailer = makeTrailer({ purchasePrice: 0 });
    expect(calculateTrailerDepreciation(trailer)).toBeNull();
  });

  it('linear method matches the vehicle formula', () => {
    const trailer = makeTrailer({
      purchasePrice: 40000,
      residualValue: 4000,
      depreciationYears: 7,
      depreciationMethod: 'linear',
      year: CURRENT_YEAR,
    });
    const result = calculateTrailerDepreciation(trailer)!;
    expect(result.annualDepreciation).toBeCloseTo((40000 - 4000) / 7, 5);
  });

  it('calculateTrailerCosts omits fuel/AdBlue (trailers have none) but includes maintenance, tires, fixed and depreciation', () => {
    const trailer = makeTrailer({
      purchasePrice: 0,
      insuranceCost: 1200,
      monthlyLeasing: 300,
      maintenances: [{ id: 'm1', type: 'other', name: 'Test', intervalKm: 100000, lastKm: 0, lastDate: '', cost: 200 }],
    });
    const result = calculateTrailerCosts(trailer, { estimatedAnnualKm: 100000 });
    expect(result.totalCostPerKm).toBeCloseTo(
      result.maintenanceCostPerKm + result.tireCostPerKm + result.fixedCostPerKm + result.depreciationCostPerKm,
      8
    );
    expect(result.fixedCostPerKm).toBeCloseTo((1200 + 300 * 12) / 100000, 6);
  });
});

describe('formatCostPerKm', () => {
  it('formats a value as EUR with 3 decimal places, French locale', () => {
    const formatted = formatCostPerKm(0.856);
    expect(formatted).toContain('0,856');
    expect(formatted).toContain('€');
  });
});

describe('getCostPerKmColor', () => {
  it('returns success under 0.80', () => {
    expect(getCostPerKmColor(0.5)).toBe('success');
  });
  it('returns warning between 0.80 and 1.00', () => {
    expect(getCostPerKmColor(0.9)).toBe('warning');
  });
  it('returns destructive at or above 1.00', () => {
    expect(getCostPerKmColor(1.0)).toBe('destructive');
    expect(getCostPerKmColor(1.5)).toBe('destructive');
  });
});
