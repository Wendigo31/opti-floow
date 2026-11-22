import { describe, expect, it } from 'vitest';
import { CNR_DEFAULT, cnrCost, compareToCnr, estimateHours } from './cnr';

describe('CNR', () => {
  it('applique la formule trinôme', () => {
    // 500 km, 10 h : 0,572×500 + 30,39×10 + 255,42×1
    expect(cnrCost(CNR_DEFAULT, 500, 10)).toBeCloseTo(286 + 303.9 + 255.42, 2);
  });
  it('estime les heures', () => {
    expect(estimateHours(650)).toBe(12);
  });
  it('compare le prix au coût CNR', () => {
    const r = compareToCnr(CNR_DEFAULT, [
      { id: 'a', date: '2026-11-02', label: 'A', km: 500, hours: 10, revenue: 900 },
      { id: 'b', date: '2026-11-03', label: 'B', km: 500, hours: 10, revenue: 700 },
    ]);
    expect(r.below).toBe(1);
    expect(r.rows[0].gap).toBeCloseTo(900 - 845.32, 2);
  });
});
