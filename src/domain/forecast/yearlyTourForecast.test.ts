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
});
