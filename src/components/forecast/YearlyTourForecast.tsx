import { useEffect, useMemo, useState } from 'react';
import { CalendarRange } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useLicenseContext } from '@/context/LicenseContext';
import { useSavedTours } from '@/hooks/useSavedTours';
import { useTourRealCosts } from '@/hooks/useTourRealCosts';
import { buildYearlyTourForecast, type ForecastPlanningRow, type ForecastTourInfo } from '@/domain/forecast/yearlyTourForecast';
import { cn } from '@/lib/utils';

const MONTHS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
const fmt = (v: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(v);

export function YearlyTourForecast() {
  const year = new Date().getFullYear();
  const { licenseId } = useLicenseContext();
  const { tours } = useSavedTours();
  const realCosts = useTourRealCosts(tours);
  const [rows, setRows] = useState<ForecastPlanningRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!licenseId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const all: ForecastPlanningRow[] = [];
      for (let from = 0; ; from += 1000) {
        const { data, error } = await supabase
          .from('planning_entries')
          .select('planning_date, saved_tour_id, status')
          .eq('license_id', licenseId)
          .gte('planning_date', `${year}-01-01`)
          .lte('planning_date', `${year}-12-31`)
          .not('saved_tour_id', 'is', null)
          .range(from, from + 999);
        if (error || !data) break;
        all.push(...data);
        if (data.length < 1000) break;
      }
      if (!cancelled) { setRows(all); setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [licenseId, year]);

  const months = useMemo(() => {
    const info = new Map<string, ForecastTourInfo>();
    for (const t of tours) {
      info.set(t.id, { revenue: Number(t.revenue) || 0, realCost: realCosts.get(t.id)?.totalCost ?? (Number(t.total_cost) || 0) });
    }
    return buildYearlyTourForecast(rows, info, year);
  }, [rows, tours, realCosts, year]);

  const total = months.reduce((a, m) => ({ missions: a.missions + m.missions, revenue: a.revenue + m.revenue, realCost: a.realCost + m.realCost }), { missions: 0, revenue: 0, realCost: 0 });
  const totalMargin = total.revenue - total.realCost;

  return (
    <div className="glass-card p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
          <CalendarRange className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground">Prévisionnel {year} d'après les tournées planifiées</h2>
          <p className="text-sm text-muted-foreground">Coût réel recalculé avec la flotte, les salaires et les charges actuels</p>
        </div>
      </div>
      {loading ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="text-left p-2">Mois</th>
                <th className="text-right p-2">Missions</th>
                <th className="text-right p-2">Chiffre d'affaires</th>
                <th className="text-right p-2">Coût réel</th>
                <th className="text-right p-2">Marge</th>
                <th className="text-right p-2">Marge %</th>
              </tr>
            </thead>
            <tbody>
              {months.map(m => (
                <tr key={m.monthIndex} className="border-b border-border/50">
                  <td className="p-2">{MONTHS[m.monthIndex]}</td>
                  <td className="p-2 text-right">{m.missions}</td>
                  <td className="p-2 text-right">{fmt(m.revenue)}</td>
                  <td className="p-2 text-right">{fmt(m.realCost)}</td>
                  <td className={cn('p-2 text-right font-medium', m.margin < 0 ? 'text-destructive' : 'text-success')}>{fmt(m.margin)}</td>
                  <td className="p-2 text-right">{m.marginPercent.toFixed(1)} %</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="font-semibold">
                <td className="p-2">Total</td>
                <td className="p-2 text-right">{total.missions}</td>
                <td className="p-2 text-right">{fmt(total.revenue)}</td>
                <td className="p-2 text-right">{fmt(total.realCost)}</td>
                <td className={cn('p-2 text-right', totalMargin < 0 ? 'text-destructive' : 'text-success')}>{fmt(totalMargin)}</td>
                <td className="p-2 text-right">{total.revenue > 0 ? ((totalMargin / total.revenue) * 100).toFixed(1) : '0.0'} %</td>
              </tr>
            </tfoot>
          </table>
          {total.missions === 0 && (
            <p className="text-xs text-muted-foreground mt-3">Aucune mission liée à une tournée sauvegardée n'est planifiée cette année.</p>
          )}
        </div>
      )}
    </div>
  );
}
