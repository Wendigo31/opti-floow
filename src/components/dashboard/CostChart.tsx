import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, RadialBarChart, RadialBar } from 'recharts';
import type { CostBreakdown } from '@/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type ChartType = 'pie' | 'donut' | 'bar' | 'radial';

interface CostChartProps {
  costs: CostBreakdown;
  chartType: ChartType;
  onChartTypeChange: (type: ChartType) => void;
}

const COLORS = [
  'hsl(199, 89%, 48%)',   // fuel - primary blue
  'hsl(142, 76%, 36%)',   // adBlue - green
  'hsl(38, 92%, 50%)',    // tolls - warning/orange
  'hsl(280, 67%, 55%)',   // driver - purple
  'hsl(0, 72%, 51%)',     // structure - destructive
];

export function CostChart({ costs, chartType, onChartTypeChange }: CostChartProps) {
  const data = [
    { name: 'Gazole', value: costs.fuel, color: COLORS[0] },
    { name: 'AdBlue', value: costs.adBlue, color: COLORS[1] },
    { name: 'Péages', value: costs.tolls, color: COLORS[2] },
    { name: 'Conducteur', value: costs.driverCost, color: COLORS[3] },
    { name: 'Structure', value: costs.structureCost, color: COLORS[4] },
  ].filter(item => item.value > 0);

  const formatValue = (value: number) => `${value.toFixed(2)} €`;

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      const percentage = ((item.value / costs.totalCost) * 100).toFixed(1);
      return (
        <div className="glass-card p-3 border border-border/50">
          <p className="text-sm font-medium text-foreground">{item.name}</p>
          <p className="text-lg font-bold" style={{ color: item.color }}>
            {formatValue(item.value)}
          </p>
          <p className="text-xs text-muted-foreground">{percentage}% du total</p>
        </div>
      );
    }
    return null;
  };

  if (costs.totalCost === 0) {
    return (
      <div className="glass-card p-6 h-80 flex items-center justify-center">
        <p className="text-muted-foreground text-center">
          Configurez un trajet pour voir<br />la répartition des coûts
        </p>
      </div>
    );
  }

  const renderChart = () => {
    switch (chartType) {
      case 'pie':
        return (
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              outerRadius={90}
              paddingAngle={2}
              dataKey="value"
              animationBegin={0}
              animationDuration={800}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} stroke="transparent" />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend verticalAlign="bottom" height={36} formatter={(value) => <span className="text-sm text-muted-foreground">{value}</span>} />
          </PieChart>
        );
      
      case 'donut':
        return (
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={3}
              dataKey="value"
              animationBegin={0}
              animationDuration={800}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} stroke="transparent" />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend verticalAlign="bottom" height={36} formatter={(value) => <span className="text-sm text-muted-foreground">{value}</span>} />
          </PieChart>
        );
      
      case 'bar':
        return (
          <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 60, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis type="number" tickFormatter={(v) => `${v.toFixed(0)}€`} stroke="hsl(var(--muted-foreground))" />
            <YAxis dataKey="name" type="category" stroke="hsl(var(--muted-foreground))" width={80} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        );
      
      case 'radial':
        const radialData = data.map((item, index) => ({
          ...item,
          fill: item.color,
          fullMark: costs.totalCost,
        }));
        return (
          <RadialBarChart cx="50%" cy="50%" innerRadius="20%" outerRadius="90%" data={radialData} startAngle={180} endAngle={0}>
            <RadialBar background dataKey="value" />
            <Tooltip content={<CustomTooltip />} />
            <Legend verticalAlign="bottom" height={36} formatter={(value) => <span className="text-sm text-muted-foreground">{value}</span>} />
          </RadialBarChart>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">Répartition des Coûts</h3>
        <Select value={chartType} onValueChange={(v) => onChartTypeChange(v as ChartType)}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pie">Camembert</SelectItem>
            <SelectItem value="donut">Anneau</SelectItem>
            <SelectItem value="bar">Barres</SelectItem>
            <SelectItem value="radial">Radial</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          {renderChart()}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
