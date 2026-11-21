import { describe, it, expect } from 'vitest';
import { computeDayHours, nightMinutes } from './driverHours';

describe('heures conducteur', () => {
  it('travail, coupure, amplitude et nuit (heure de Paris, hiver UTC+1)', () => {
    // 04:00 → 14:30 Paris, coupure 09:00 → 09:45
    const h = computeDayHours([
      { kind: 'start', at: '2026-11-23T03:00:00Z' },
      { kind: 'break_start', at: '2026-11-23T08:00:00Z' },
      { kind: 'break_end', at: '2026-11-23T08:45:00Z' },
      { kind: 'end', at: '2026-11-23T13:30:00Z' },
    ]);
    expect(h.amplitude).toBe(630);
    expect(h.breaks).toBe(45);
    expect(h.work).toBe(585);
    expect(h.night).toBe(120); // 04:00 → 06:00
    expect(h.open).toBe(false);
  });

  it('service en cours et coupure en cours', () => {
    const now = new Date('2026-11-23T10:00:00Z');
    const h = computeDayHours([{ kind: 'start', at: '2026-11-23T08:00:00Z' }, { kind: 'break_start', at: '2026-11-23T09:30:00Z' }], now);
    expect(h.open).toBe(true);
    expect(h.onBreak).toBe(true);
    expect(h.work).toBe(90);
    expect(h.breaks).toBe(30);
  });

  it('nuit : 20 h → 23 h Paris = 2 h de nuit', () => {
    expect(nightMinutes(new Date('2026-11-23T19:00:00Z'), new Date('2026-11-23T22:00:00Z'))).toBe(120);
  });
});
