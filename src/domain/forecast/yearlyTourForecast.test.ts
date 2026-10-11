import { describe, it, expect } from 'vitest';
import { buildYearlyTourForecast } from './yearlyTourForecast';

describe('buildYearlyTourForecast', () => {
  const tours = new Map([['t1', { revenue: 500, realCost: 400 }]]);

  it('additionne CA, coût réel et marge par mois', () => {
    const r = buildYearlyTourForecast(
      [
        { planning_date: '2026-03-02', saved_tour_id: 't1' },
        { planning_date: '2026-03-09', saved_tour_id: 't1' },
      ],
      tours,
      2026,
    );
    expect(r[2]).toMatchObject({ missions: 2, revenue: 1000, realCost: 800, margin: 200, marginPercent: 20 });
  });

  it('ignore les missions annulées, sans tournée ou hors année', () => {
    const r = buildYearlyTourForecast(
      [
        { planning_date: '2026-04-01', saved_tour_id: 't1', status: 'cancelled' },
        { planning_date: '2026-04-02', saved_tour_id: null },
        { planning_date: '2025-04-03', saved_tour_id: 't1' },
      ],
      tours,
      2026,
    );
    expect(r[3].missions).toBe(0);
  });

  // Scénario bout en bout : quelques missions réelles planifiées sur plusieurs mois et
  // plusieurs tournées (comme assigné depuis le Planning via saved_tour_id), pour confirmer
  // qu'elles apparaissent bien dans le Prévisionnel mois par mois avec leur coût réel.
  it('agrège plusieurs missions réelles sur plusieurs mois et plusieurs tournées, avec le coût réel de chacune', () => {
    const realTours = new Map([
      ['paris-lyon', { revenue: 450, realCost: 320 }],
      ['lyon-marseille', { revenue: 320, realCost: 250 }],
    ]);

    const planningMissions = [
      // Janvier : 3 missions Paris-Lyon
      { planning_date: '2026-01-05', saved_tour_id: 'paris-lyon' },
      { planning_date: '2026-01-12', saved_tour_id: 'paris-lyon' },
      { planning_date: '2026-01-19', saved_tour_id: 'paris-lyon' },
      // Février : 2 missions Paris-Lyon + 1 Lyon-Marseille
      { planning_date: '2026-02-02', saved_tour_id: 'paris-lyon' },
      { planning_date: '2026-02-09', saved_tour_id: 'paris-lyon' },
      { planning_date: '2026-02-16', saved_tour_id: 'lyon-marseille' },
      // Mars : 1 seule mission Lyon-Marseille
      { planning_date: '2026-03-03', saved_tour_id: 'lyon-marseille' },
    ];

    const r = buildYearlyTourForecast(planningMissions, realTours, 2026);

    expect(r[0]).toMatchObject({ monthIndex: 0, missions: 3, revenue: 1350, realCost: 960 }); // Janvier
    expect(r[1]).toMatchObject({ monthIndex: 1, missions: 3, revenue: 1220, realCost: 890 }); // Février
    expect(r[2]).toMatchObject({ monthIndex: 2, missions: 1, revenue: 320, realCost: 250 }); // Mars
    expect(r[1].margin).toBe(330);
    // Les mois sans mission réelle restent à zéro, pas à NaN ni undefined.
    expect(r[11]).toMatchObject({ missions: 0, revenue: 0, realCost: 0, margin: 0, marginPercent: 0 });
  });
});
