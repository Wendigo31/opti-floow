import { describe, it, expect } from 'vitest';
import { getOverlappingAbsences, formatAbsencePeriod } from './driverAbsenceOverlap';
import type { DriverAbsence } from '@/hooks/useDriverAbsences';

function makeAbsence(overrides: Partial<DriverAbsence>): DriverAbsence {
  return {
    id: 'abs_1',
    driver_id: 'drv_1',
    license_id: 'lic_1',
    user_id: 'usr_1',
    absence_type: 'conges',
    start_date: '2026-11-01',
    end_date: '2026-11-10',
    notes: null,
    created_at: '2026-10-01T00:00:00Z',
    updated_at: '2026-10-01T00:00:00Z',
    ...overrides,
  };
}

describe('getOverlappingAbsences', () => {
  it('returns no conflict when the driver has no absence at all', () => {
    expect(getOverlappingAbsences([], 'drv_1', '2026-11-05', '2026-11-05')).toEqual([]);
  });

  it('ignores absences of other drivers', () => {
    const absences = [makeAbsence({ driver_id: 'drv_2' })];
    expect(getOverlappingAbsences(absences, 'drv_1', '2026-11-05', '2026-11-05')).toEqual([]);
  });

  it('returns nothing when driverId is null/undefined', () => {
    const absences = [makeAbsence({})];
    expect(getOverlappingAbsences(absences, null, '2026-11-05', '2026-11-05')).toEqual([]);
    expect(getOverlappingAbsences(absences, undefined, '2026-11-05', '2026-11-05')).toEqual([]);
  });

  it('detects a mission fully inside a declared absence', () => {
    const absences = [makeAbsence({})]; // 2026-11-01 -> 2026-11-10
    const result = getOverlappingAbsences(absences, 'drv_1', '2026-11-03', '2026-11-05');
    expect(result).toHaveLength(1);
  });

  it('detects a mission that only partially overlaps the absence', () => {
    const absences = [makeAbsence({})]; // 2026-11-01 -> 2026-11-10
    expect(getOverlappingAbsences(absences, 'drv_1', '2026-11-09', '2026-11-20')).toHaveLength(1);
    expect(getOverlappingAbsences(absences, 'drv_1', '2026-10-20', '2026-11-02')).toHaveLength(1);
  });

  it('finds no conflict when the ranges do not touch', () => {
    const absences = [makeAbsence({})]; // 2026-11-01 -> 2026-11-10
    expect(getOverlappingAbsences(absences, 'drv_1', '2026-12-01', '2026-12-10')).toEqual([]);
  });

  it('treats a missing absence end_date as an ongoing, open-ended absence', () => {
    const absences = [makeAbsence({ end_date: null })];
    // Mission bien après le début de l'absence -> doit quand même être en conflit
    expect(getOverlappingAbsences(absences, 'drv_1', '2027-06-01', '2027-06-05')).toHaveLength(1);
    // Mission avant le début de l'absence -> pas de conflit
    expect(getOverlappingAbsences(absences, 'drv_1', '2026-01-01', '2026-01-05')).toEqual([]);
  });

  it('treats a missing mission end_date (tour à l\'année / sans fin) as open-ended', () => {
    const absences = [makeAbsence({ start_date: '2027-01-01', end_date: '2027-01-10' })];
    expect(getOverlappingAbsences(absences, 'drv_1', '2026-12-01', null)).toHaveLength(1);
  });
});

describe('formatAbsencePeriod', () => {
  it('formats a bounded absence with both dates', () => {
    const absence = makeAbsence({ start_date: '2026-11-01', end_date: '2026-11-10' });
    expect(formatAbsencePeriod(absence)).toBe('du 01/11/2026 au 10/11/2026');
  });

  it('formats an open-ended absence with only a start date', () => {
    const absence = makeAbsence({ start_date: '2026-11-01', end_date: null });
    expect(formatAbsencePeriod(absence)).toBe('depuis le 01/11/2026');
  });
});
