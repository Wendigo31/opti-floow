import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useCalculations } from '../useCalculations';
import type { Driver, FixedCharge, TripCalculation, VehicleParams, AppSettings } from '@/types';

// Sensible baseline fixtures — each test overrides only what it needs to keep
// intent obvious and avoid the tests drifting out of sync with each other.

const baseVehicle: VehicleParams = {
  fuelConsumption: 30, // L/100km
  fuelPriceHT: 1.5,
  fuelPriceIsHT: true,
  adBlueConsumption: 1.5,
  adBluePriceHT: 0.5,
  adBluePriceIsHT: true,
};

const baseTrip: TripCalculation = {
  distance: 100,
  tollCost: 0,
  tollIsHT: true,
  tollClass: 2,
  pricingMode: 'fixed',
  pricePerKm: 1.7,
  fixedPrice: 200,
  targetMargin: 20,
  hourlyRate: 85,
  estimatedHours: 8,
  pricePerStop: 25,
  numberOfStops: 0,
};

const baseSettings: AppSettings = {
  workingDaysPerMonth: 21,
  workingDaysPerYear: 252,
  tomtomApiKey: '',
  companyName: '',
  tvaRate: 20,
  defaultDownloadPath: '',
};

function makeCdiDriver(overrides: Partial<Driver> = {}): Driver {
  return {
    id: 'd1',
    name: 'Jean Dupont',
    contractType: 'cdi',
    baseSalary: 2100, // monthly, employer gross before charges
    hourlyRate: 12,
    hoursPerDay: 7,
    patronalCharges: 42, // %
    mealAllowance: 15,
    overnightAllowance: 0,
    workingDaysPerMonth: 21,
    sundayBonus: 0,
    nightBonus: 0,
    seniorityBonus: 0,
    unloadingBonus: 0,
    ...overrides,
  };
}

function runCalc(
  trip: Partial<TripCalculation> = {},
  vehicle: Partial<VehicleParams> = {},
  drivers: Driver[] = [],
  charges: FixedCharge[] = [],
  settings: Partial<AppSettings> = {}
) {
  const { result } = renderHook(() =>
    useCalculations(
      { ...baseTrip, ...trip },
      { ...baseVehicle, ...vehicle },
      drivers,
      charges,
      { ...baseSettings, ...settings }
    )
  );
  return result.current;
}

describe('useCalculations', () => {
  describe('variable costs (fuel / AdBlue / tolls)', () => {
    it('computes fuel cost as (distance/100) * consumption * price HT', () => {
      const cost = runCalc({ distance: 200 }, { fuelConsumption: 30, fuelPriceHT: 1.5 });
      expect(cost.fuel).toBeCloseTo((200 / 100) * 30 * 1.5, 5); // 90
    });

    it('converts a TTC fuel price to HT before costing', () => {
      const ttc = runCalc(
        { distance: 100 },
        { fuelConsumption: 30, fuelPriceHT: 1.8, fuelPriceIsHT: false },
        [],
        [],
        { tvaRate: 20 }
      );
      const ht = runCalc(
        { distance: 100 },
        { fuelConsumption: 30, fuelPriceHT: 1.5, fuelPriceIsHT: true },
        [],
        [],
        { tvaRate: 20 }
      );
      // 1.8 TTC at 20% VAT === 1.5 HT
      expect(ttc.fuel).toBeCloseTo(ht.fuel, 5);
    });

    it('computes AdBlue cost the same way as fuel', () => {
      const cost = runCalc({ distance: 300 }, { adBlueConsumption: 1.5, adBluePriceHT: 0.5 });
      expect(cost.adBlue).toBeCloseTo((300 / 100) * 1.5 * 0.5, 5); // 2.25
    });

    it('leaves an HT toll cost untouched and converts a TTC one', () => {
      const htTolls = runCalc({ tollCost: 12, tollIsHT: true });
      expect(htTolls.tolls).toBeCloseTo(12, 5);

      const ttcTolls = runCalc({ tollCost: 14.4, tollIsHT: false }, {}, [], [], { tvaRate: 20 });
      expect(ttcTolls.tolls).toBeCloseTo(12, 5);
    });
  });

  describe('driver costs', () => {
    it('costs a CDI driver as monthly employer cost / working days, plus meal allowance', () => {
      const driver = makeCdiDriver({ baseSalary: 2100, patronalCharges: 42, workingDaysPerMonth: 21, mealAllowance: 15 });
      const cost = runCalc({}, {}, [driver]);

      const expectedDailyRate = (2100 * 1.42) / 21;
      expect(cost.driverCost).toBeCloseTo(expectedDailyRate, 5);
      expect(cost.driverAllowances).toBeCloseTo(15, 5);
    });

    it('prorates monthly bonuses (night/sunday/seniority) over working days', () => {
      const driver = makeCdiDriver({
        nightBonus: 63,
        sundayBonus: 42,
        seniorityBonus: 21,
        workingDaysPerMonth: 21,
      });
      const cost = runCalc({}, {}, [driver]);
      // (63 + 42 + 21) / 21 = 6
      expect(cost.driverBonuses).toBeCloseTo(6, 5);
    });

    it('costs an interim driver as hourlyRate * coefficient * hoursPerDay, meal allowance only', () => {
      const driver = makeCdiDriver({
        contractType: 'interim',
        interimHourlyRate: 14,
        interimCoefficient: 2,
        hoursPerDay: 8,
        mealAllowance: 15,
        overnightAllowance: 25, // must be ignored for interim
      });
      const cost = runCalc({}, {}, [driver]);
      expect(cost.driverCost).toBeCloseTo(14 * 2 * 8, 5); // 224
      expect(cost.driverAllowances).toBeCloseTo(15, 5); // overnight allowance not applied
    });

    it('applies no cost at all for "autre" (planning-only) drivers', () => {
      const driver = makeCdiDriver({ contractType: 'autre', baseSalary: 5000 });
      const cost = runCalc({}, {}, [driver]);
      expect(cost.driverCost).toBe(0);
      expect(cost.driverAllowances).toBe(0);
      expect(cost.driverBonuses).toBe(0);
    });

    it('sums costs across multiple selected drivers', () => {
      const d1 = makeCdiDriver({ id: 'd1', baseSalary: 2100, patronalCharges: 40, workingDaysPerMonth: 20 });
      const d2 = makeCdiDriver({ id: 'd2', baseSalary: 1900, patronalCharges: 40, workingDaysPerMonth: 20 });
      const cost = runCalc({}, {}, [d1, d2]);
      const expected = (2100 * 1.4) / 20 + (1900 * 1.4) / 20;
      expect(cost.driverCost).toBeCloseTo(expected, 5);
    });
  });

  describe('structure costs (fixed charges spread over the trip)', () => {
    const charge = (overrides: Partial<FixedCharge>): FixedCharge => ({
      id: 'c1',
      name: 'Test',
      amount: 100,
      isHT: true,
      periodicity: 'monthly',
      category: 'other',
      ...overrides,
    });

    it('spreads a yearly charge over workingDaysPerYear', () => {
      const cost = runCalc({}, {}, [], [charge({ amount: 2520, periodicity: 'yearly' })], { workingDaysPerYear: 252 });
      expect(cost.structureCost).toBeCloseTo(10, 5);
    });

    it('spreads a monthly charge over workingDaysPerMonth', () => {
      const cost = runCalc({}, {}, [], [charge({ amount: 210, periodicity: 'monthly' })], { workingDaysPerMonth: 21 });
      expect(cost.structureCost).toBeCloseTo(10, 5);
    });

    it('applies a daily charge as-is', () => {
      const cost = runCalc({}, {}, [], [charge({ amount: 10, periodicity: 'daily' })]);
      expect(cost.structureCost).toBeCloseTo(10, 5);
    });

    it('converts a TTC charge to HT before spreading it', () => {
      const cost = runCalc({}, {}, [], [charge({ amount: 12, isHT: false, periodicity: 'daily' })], { tvaRate: 20 });
      expect(cost.structureCost).toBeCloseTo(10, 5);
    });
  });

  describe('revenue by pricing mode', () => {
    it('"km" mode: pricePerKm * distance', () => {
      const cost = runCalc({ pricingMode: 'km', pricePerKm: 1.7, distance: 150 });
      expect(cost.revenue).toBeCloseTo(1.7 * 150, 5);
    });

    it('"fixed" mode: uses fixedPrice regardless of distance', () => {
      const cost = runCalc({ pricingMode: 'fixed', fixedPrice: 350, distance: 999 });
      expect(cost.revenue).toBe(350);
    });

    it('"hourly" mode: hourlyRate * estimatedHours', () => {
      const cost = runCalc({ pricingMode: 'hourly', hourlyRate: 90, estimatedHours: 6 });
      expect(cost.revenue).toBe(540);
    });

    it('"km_stops" mode: (pricePerKm * distance) + (pricePerStop * numberOfStops)', () => {
      const cost = runCalc({ pricingMode: 'km_stops', pricePerKm: 1.5, distance: 100, pricePerStop: 20, numberOfStops: 3 });
      expect(cost.revenue).toBeCloseTo(1.5 * 100 + 20 * 3, 5);
    });

    it('"auto" mode: falls back to the suggested price (cost * (1 + targetMargin/100))', () => {
      const cost = runCalc({ pricingMode: 'auto', distance: 0, targetMargin: 25 }, {}, [], [
        { id: 'c1', name: 'x', amount: 80, isHT: true, periodicity: 'daily', category: 'other' },
      ]);
      expect(cost.revenue).toBeCloseTo(cost.suggestedPrice, 5);
      expect(cost.suggestedPrice).toBeCloseTo(cost.totalCost * 1.25, 5);
    });
  });

  describe('profit and margin', () => {
    it('computes profit as revenue - totalCost, and margin as profit / revenue', () => {
      const cost = runCalc({ pricingMode: 'fixed', fixedPrice: 500 }, {}, [], [
        { id: 'c1', name: 'x', amount: 300, isHT: true, periodicity: 'daily', category: 'other' },
      ]);
      expect(cost.profit).toBeCloseTo(cost.revenue - cost.totalCost, 5);
      expect(cost.profitMargin).toBeCloseTo((cost.profit / cost.revenue) * 100, 5);
    });

    it('does not divide by zero when revenue is 0 (profitMargin falls back to 0)', () => {
      const cost = runCalc({ pricingMode: 'fixed', fixedPrice: 0 });
      expect(cost.revenue).toBe(0);
      expect(cost.profitMargin).toBe(0);
      expect(Number.isFinite(cost.profitMargin)).toBe(true);
    });
  });

  describe('cost per km', () => {
    it('does not divide by zero when distance is 0 (costPerKm falls back to 0)', () => {
      const cost = runCalc({ distance: 0 });
      expect(cost.costPerKm).toBe(0);
      expect(Number.isFinite(cost.costPerKm)).toBe(true);
    });

    it('computes costPerKm as totalCost / distance when distance > 0', () => {
      const cost = runCalc({ distance: 250, tollCost: 0 }, {}, [], [
        { id: 'c1', name: 'x', amount: 50, isHT: true, periodicity: 'daily', category: 'other' },
      ]);
      expect(cost.costPerKm).toBeCloseTo(cost.totalCost / 250, 5);
    });
  });
});
