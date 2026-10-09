export interface ForecastPlanningRow {
  planning_date: string;
  saved_tour_id: string | null;
  status?: string | null;
}

export interface ForecastTourInfo {
  revenue: number;
  realCost: number;
}

export interface MonthlyTourForecast {
  monthIndex: number;
  missions: number;
  revenue: number;
  realCost: number;
  margin: number;
  marginPercent: number;
}

/** Agrège les missions planifiées de l'année par mois : CA de la tournée, coût réel, marge. */
export function buildYearlyTourForecast(
  rows: ForecastPlanningRow[],
  tours: Map<string, ForecastTourInfo>,
  year: number,
): MonthlyTourForecast[] {
  const months: MonthlyTourForecast[] = Array.from({ length: 12 }, (_, i) => ({
    monthIndex: i, missions: 0, revenue: 0, realCost: 0, margin: 0, marginPercent: 0,
  }));
  for (const row of rows) {
    if (!row.saved_tour_id || row.status === 'cancelled') continue;
    const [y, m] = row.planning_date.split('-').map(Number);
    if (y !== year || !m) continue;
    const tour = tours.get(row.saved_tour_id);
    if (!tour) continue;
    const month = months[m - 1];
    month.missions += 1;
    month.revenue += tour.revenue || 0;
    month.realCost += tour.realCost || 0;
  }
  for (const month of months) {
    month.revenue = Math.round(month.revenue * 100) / 100;
    month.realCost = Math.round(month.realCost * 100) / 100;
    month.margin = Math.round((month.revenue - month.realCost) * 100) / 100;
    month.marginPercent = month.revenue > 0 ? Math.round((month.margin / month.revenue) * 1000) / 10 : 0;
  }
  return months;
}
