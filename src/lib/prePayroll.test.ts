import { describe, expect, it } from 'vitest';
import { computePrePayroll } from './prePayroll';
import { contractPreset, seniorityYears, splitServiceHours } from './driverContract';
import type { Activity, TachoDay } from './tachograph';

/** Journée de carte (heures UTC) : liste [heure début, activité]. */
function day(date: string, plan: [number, Activity][]): TachoDay {
  const changes = plan.map(([h, activity]) => ({ minute: Math.round(h * 60), activity, cardOut: false, crew: false }));
  const minutes = { rest: 0, availability: 0, work: 0, driving: 0 } as Record<Activity, number>;
  changes.forEach((c, i) => { minutes[c.activity] += (changes[i + 1]?.minute ?? 1440) - c.minute; });
  return { date, distanceKm: 0, minutes, longestContinuousDriving: 0, changes };
}

describe('Décompte des heures (temps de service mensuel)', () => {
  it('grand routier : équivalences jusqu’à 186,33 h puis +50 %', () => {
    expect(splitServiceHours(200, 'longue_distance')).toEqual({ normal: 151.67, equivalence25: 34.66, overtime25: 0, overtime50: 13.67 });
  });
  it('courte distance : équivalences jusqu’à 169 h, sup. +25 % jusqu’à 186,33 h', () => {
    expect(splitServiceHours(190, 'courte_distance')).toEqual({ normal: 151.67, equivalence25: 17.33, overtime25: 17.33, overtime50: 3.67 });
  });
  it('35 h : tout au-delà de 151,67 h est en heures sup.', () => {
    expect(splitServiceHours(160, 'messagerie')).toEqual({ normal: 151.67, equivalence25: 0, overtime25: 8.33, overtime50: 0 });
  });
});

describe('Modèle de contrat', () => {
  it('150M grand routier à l’embauche', () => {
    const p = contractPreset('longue_distance', '150M', '2026-11-01', new Date('2026-11-22'));
    expect(p.hourlyRate).toBe(12.43);
    expect(p.weeklyHours).toBe(43);
    expect(p.baseSalary).toBeCloseTo(12.43 * 151.67 + 12.43 * 1.25 * 34.66, 1);
  });
  it('138M : le SMIC prime sur la grille', () => {
    expect(contractPreset('courte_distance', '138M').usesSmic).toBe(true);
  });
  it('ancienneté de 10 ans : +6 %', () => {
    expect(seniorityYears('2016-01-15', new Date('2026-11-22'))).toBe(10);
    expect(contractPreset('longue_distance', '150M', '2016-01-15', new Date('2026-11-22')).hourlyRate).toBe(13.18);
  });
});

describe('Pré-paie depuis la carte conducteur', () => {
  it('journée 5 h – 16 h (heure de Paris) : 1 repas, 1 h de nuit', () => {
    const r = computePrePayroll([day('2026-11-10', [[0, 'rest'], [4, 'work'], [4.5, 'driving'], [8, 'rest'], [8.75, 'driving'], [13, 'availability'], [15, 'rest']])], '2026-11', 'longue_distance');
    expect(r.days).toHaveLength(1);
    expect(r.days[0]).toMatchObject({ date: '2026-11-10', start: '05:00', end: '16:00', meals: 1, casseCroute: false, nightMin: 60 });
    expect(r.serviceHours).toBe(10.25);
  });
  it('service de nuit à cheval sur minuit : une seule journée, repas de nuit et casse-croûte', () => {
    const r = computePrePayroll([
      day('2026-11-11', [[0, 'rest'], [22, 'driving']]),
      day('2026-11-12', [[0, 'driving'], [3, 'work'], [4, 'rest']]),
    ], '2026-11', 'courte_distance');
    expect(r.days).toHaveLength(1);
    expect(r.days[0]).toMatchObject({ date: '2026-11-11', start: '23:00', meals: 0, nightMeal: true, casseCroute: false });
    expect(r.nightHours).toBe(6);
  });
  it('prise de service à 3 h : casse-croûte', () => {
    const r = computePrePayroll([day('2026-11-16', [[0, 'rest'], [2, 'driving'], [9, 'rest']])], '2026-11', 'courte_distance');
    expect(r.casseCroutes).toBe(1);
  });
  it('le dimanche est compté à l’heure de Paris', () => {
    const r = computePrePayroll([day('2026-11-22', [[0, 'rest'], [8, 'driving'], [10, 'rest']])], '2026-11', 'longue_distance');
    expect(r.sundayHours).toBe(2);
  });
  it('ignore les journées des autres mois', () => {
    expect(computePrePayroll([day('2026-10-30', [[0, 'rest'], [8, 'driving'], [10, 'rest']])], '2026-11', 'longue_distance').days).toHaveLength(0);
  });
});
