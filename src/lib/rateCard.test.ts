import { describe, it, expect } from 'vitest';
import { departmentOf, priceFromRateCard, type RateCard } from './rateCard';

describe('grilles tarifaires', () => {
  const km: RateCard = {
    basis: 'km',
    bands: [
      { from: 0, to: 100, price: 180, mode: 'flat' },
      { from: 101, to: 500, price: 1.6, mode: 'unit' },
      { from: 501, to: null, price: 1.4, mode: 'unit' },
    ],
    minimum: 200,
    extras: [{ label: 'Hayon', price: 35 }],
  };

  it('tranche au km, forfait, minimum de perception et frais annexes', () => {
    expect(priceFromRateCard(km, { km: 300 }).amount).toBe(480);
    expect(priceFromRateCard(km, { km: 600 }).amount).toBe(840);
    const short = priceFromRateCard(km, { km: 50, extras: ['Hayon'] });
    expect(short.amount).toBe(235); // forfait 180 < minimum 200, + hayon 35
    expect(short.lines[0].label).toContain('minimum');
  });

  it('zone de livraison par département, avec repli « * »', () => {
    const zone: RateCard = { basis: 'zone', bands: [{ zone: '31', price: 95, mode: 'flat' }, { zone: '*', price: 160, mode: 'flat' }] };
    expect(priceFromRateCard(zone, { destination: '12 rue X, 31200 Toulouse' }).amount).toBe(95);
    expect(priceFromRateCard(zone, { destination: '33000 Bordeaux' }).amount).toBe(160);
    expect(priceFromRateCard(zone, { destination: 'Bordeaux' }).ok).toBe(false);
    expect(departmentOf('97400 Saint-Denis')).toBe('974');
  });

  it('palettes dégressives et validité', () => {
    const pal: RateCard = { basis: 'pallet', bands: [{ from: 1, to: 5, price: 60, mode: 'unit' }, { from: 6, to: 33, price: 45, mode: 'unit' }], validTo: '2026-12-31' };
    expect(priceFromRateCard(pal, { pallets: 10 }).amount).toBe(450);
    expect(priceFromRateCard(pal, { pallets: 10, date: '2027-01-02' }).ok).toBe(false);
    expect(priceFromRateCard(pal, { pallets: 40 }).reason).toContain('hors des tranches');
  });
});
