import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { TrendingUp } from 'lucide-react';
import type { SavedTour } from '@/types/savedTour';

interface TourComparisonChartProps {
  tours: SavedTour[];
}

const COLORS = {
  revenue: 'hsl(var(--primary))',
  cost: 'hsl(var(--destructive))',
  profit: 'hsl(var(--success))',
};

export function TourComparisonChart({ tours }: TourComparisonChartProps) {
  const chartData = useMemo(() => {
    return tours.map((tour) => {
      const revenue = Number(tour.revenue) || 0;
      const cost = Number(tour.total_cost) || 0;
      const profit = Number(tour.profit) || 0;
      const distance = Number(tour.distance_km) || 0;
      const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
      
      // Truncate name for display
      const displayName = tour.name.length > 15 
        ? tour.name.substring(0, 12) + '...' 
        : tour.name;
      
      return {
        name: displayName,
        fullName: tour.name,
        'CA': revenue,
        'Coût': cost,
        'Bénéfice': profit,
        distance,
        margin: margin.toFixed(1),
      };
    });
  }, [tours]);

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0]?.payload;
      return (
        <div className="bg-card border border-border rounded-lg shadow-lg p-3 z-50">
          <p className="font-semibold text-foreground mb-2">{data?.fullName}</p>
          <div className="space-y-1 text-sm">
            <p className="text-primary">CA: {formatCurrency(data?.['CA'])}</p>
            <p className="text-destructive">Coût: {formatCurrency(data?.['Coût'])}</p>
            <p className={data?.['Bénéfice'] >= 0 ? "text-success" : "text-destructive"}>
              Bénéfice: {formatCurrency(data?.['Bénéfice'])}
            </p>
            <p className="text-muted-foreground">{data?.distance} km | Marge: {data?.margin}%</p>
          </div>
        </div>
      );
    }
    return null;
  };

  if (tours.length === 0) {
    return null;
  }

  return (
    <div className="glass-card p-6">
      <div className="flex items-center gap-3 mb-4">
        <TrendingUp className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold text-foreground">
          Comparaison des tournées ({tours.length})
        </h3>
      </div>
      
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
            <XAxis 
              dataKey="name" 
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
            />
            <YAxis 
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
              tickFormatter={(value) => `${(value / 1000).toFixed(0)}k€`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              wrapperStyle={{ paddingTop: '10px' }}
              formatter={(value) => <span className="text-foreground text-sm">{value}</span>}
            />
            <Bar dataKey="CA" fill={COLORS.revenue} radius={[4, 4, 0, 0]} />
            <Bar dataKey="Coût" fill={COLORS.cost} radius={[4, 4, 0, 0]} />
            <Bar dataKey="Bénéfice" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry['Bénéfice'] >= 0 ? COLORS.profit : COLORS.cost} 
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      
      {/* Quick stats table */}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-2 text-muted-foreground font-medium">Tournée</th>
              <th className="text-right py-2 text-muted-foreground font-medium">Distance</th>
              <th className="text-right py-2 text-muted-foreground font-medium">CA</th>
              <th className="text-right py-2 text-muted-foreground font-medium">Bénéfice</th>
              <th className="text-right py-2 text-muted-foreground font-medium">Marge</th>
            </tr>
          </thead>
          <tbody>
            {tours.map((tour) => {
              const revenue = Number(tour.revenue) || 0;
              const profit = Number(tour.profit) || 0;
              const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
              
              return (
                <tr key={tour.id} className="border-b border-border/50 hover:bg-muted/30">
                  <td className="py-2 text-foreground font-medium truncate max-w-[150px]" title={tour.name}>
                    {tour.name}
                  </td>
                  <td className="text-right py-2 text-muted-foreground">
                    {Number(tour.distance_km).toFixed(0)} km
                  </td>
                  <td className="text-right py-2 text-primary font-medium">
                    {formatCurrency(revenue)}
                  </td>
                  <td className={`text-right py-2 font-medium ${profit >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {formatCurrency(profit)}
                  </td>
                  <td className={`text-right py-2 font-medium ${margin >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {margin.toFixed(1)}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
