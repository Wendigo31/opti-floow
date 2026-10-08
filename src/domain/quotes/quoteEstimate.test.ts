import { describe, it, expect } from 'vitest';
import { estimateQuote } from './quoteEstimate';

const base = {
  distance: 100, tollCost: 50, selectedDrivers: [], selectedVehicles: [], selectedTrailer: null,
  charges: [{ id: 'c', name: 'Loyer', amount: 2200, isHT: true, periodicity: 'monthly', category: 'other' }],
  settings: { tvaRate: 20, workingDaysPerMonth: 22, workingDaysPerYear: 264 },
  appVehicleParams: { fuelConsumption: 30, fuelPriceHT: 2, fuelPriceIsHT: true, adBlueConsumption: 0, adBluePriceHT: 0, adBluePriceIsHT: true },
} as any;

describe('estimateQuote', () => {
  it('coût réel = carburant + péages + charges fixes, puis marge et TVA', () => {
    // carburant 60 + péages 50 + charges 100 = 210 ; marge 10 % → 231 HT ; TVA 20 % → 277,20 TTC
    const e = estimateQuote(base, 10, 20);
    expect(e.cost.totalCost).toBeCloseTo(210);
    expect(e.priceHT).toBe(231);
    expect(e.marginAmount).toBe(21);
    expect(e.priceTTC).toBe(277.2);
    expect(e.tvaAmount).toBe(46.2);
  });
});
