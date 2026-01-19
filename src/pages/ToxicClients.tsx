import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TrendingDown, TrendingUp, Minus, AlertTriangle, 
  Clock, Euro, Users, Target, Skull, Smile, Meh,
  ArrowUpRight, ArrowDownRight, BarChart3, FileText
} from 'lucide-react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import type { LocalClient, LocalClientReport } from '@/types/local';
import { format, differenceInHours, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell, ResponsiveContainer, PieChart, Pie, Legend } from 'recharts';

type ClientCategory = 'profitable' | 'neutral' | 'toxic';

interface ClientAnalysis {
  client: LocalClient;
  category: ClientCategory;
  tourCount: number;
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  profitMargin: number;
  averageProfitPerTour: number;
  estimatedTimeHours: number;
  revenuePerHour: number;
  costPerHour: number;
  profitPerHour: number;
  lastTourDate: string | null;
  trend: 'up' | 'down' | 'stable';
}

const categoryConfig: Record<ClientCategory, { 
  label: string; 
  icon: React.ElementType; 
  color: string; 
  bgColor: string;
  description: string;
}> = {
  profitable: { 
    label: 'Rentable', 
    icon: Smile, 
    color: 'text-success', 
    bgColor: 'bg-success/10 border-success/30',
    description: 'Marge > 15%'
  },
  neutral: { 
    label: 'Neutre', 
    icon: Meh, 
    color: 'text-warning', 
    bgColor: 'bg-warning/10 border-warning/30',
    description: 'Marge 0-15%'
  },
  toxic: { 
    label: 'Destructeur de marge', 
    icon: Skull, 
    color: 'text-destructive', 
    bgColor: 'bg-destructive/10 border-destructive/30',
    description: 'Marge négative'
  },
};

export default function ToxicClients() {
  const [clients] = useLocalStorage<LocalClient[]>('optiflow_clients', []);
  const [reports] = useLocalStorage<LocalClientReport[]>('optiflow_client_reports', []);
  const [activeTab, setActiveTab] = useState<'overview' | 'details'>('overview');
  const [selectedCategory, setSelectedCategory] = useState<ClientCategory | 'all'>('all');

  const itineraryReports = reports.filter(r => r.report_type === 'itinerary');

  // Analyse complète des clients
  const clientAnalyses = useMemo(() => {
    const analyses: ClientAnalysis[] = clients.map(client => {
      const clientReports = itineraryReports.filter(r => r.client_id === client.id);
      
      const totalRevenue = clientReports.reduce((sum, r) => sum + (r.data.revenue || 0), 0);
      const totalCost = clientReports.reduce((sum, r) => sum + (r.data.total_cost || 0), 0);
      const totalProfit = totalRevenue - totalCost;
      const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
      
      // Estimation du temps passé (1.5h par 100km + 0.5h par arrêt)
      const totalDistance = clientReports.reduce((sum, r) => sum + (r.data.distance_km || 0), 0);
      const estimatedTimeHours = (totalDistance / 100) * 1.5 + clientReports.length * 0.5;
      
      const revenuePerHour = estimatedTimeHours > 0 ? totalRevenue / estimatedTimeHours : 0;
      const costPerHour = estimatedTimeHours > 0 ? totalCost / estimatedTimeHours : 0;
      const profitPerHour = estimatedTimeHours > 0 ? totalProfit / estimatedTimeHours : 0;
      
      // Catégorisation
      let category: ClientCategory = 'neutral';
      if (profitMargin > 15) category = 'profitable';
      else if (profitMargin < 0) category = 'toxic';
      
      // Tendance (basée sur les 3 dernières tournées vs les 3 précédentes)
      const sortedReports = [...clientReports].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      
      let trend: 'up' | 'down' | 'stable' = 'stable';
      if (sortedReports.length >= 4) {
        const recent = sortedReports.slice(0, 3);
        const older = sortedReports.slice(3, 6);
        const recentMargin = recent.reduce((sum, r) => {
          const rev = r.data.revenue || 0;
          const cost = r.data.total_cost || 0;
          return sum + (rev > 0 ? ((rev - cost) / rev) * 100 : 0);
        }, 0) / recent.length;
        const olderMargin = older.reduce((sum, r) => {
          const rev = r.data.revenue || 0;
          const cost = r.data.total_cost || 0;
          return sum + (rev > 0 ? ((rev - cost) / rev) * 100 : 0);
        }, 0) / older.length;
        
        if (recentMargin > olderMargin + 5) trend = 'up';
        else if (recentMargin < olderMargin - 5) trend = 'down';
      }
      
      return {
        client,
        category,
        tourCount: clientReports.length,
        totalRevenue,
        totalCost,
        totalProfit,
        profitMargin,
        averageProfitPerTour: clientReports.length > 0 ? totalProfit / clientReports.length : 0,
        estimatedTimeHours,
        revenuePerHour,
        costPerHour,
        profitPerHour,
        lastTourDate: sortedReports[0]?.created_at || null,
        trend,
      };
    }).filter(a => a.tourCount > 0); // Only clients with tours

    // Sort by profit (most profitable first, toxic last)
    return analyses.sort((a, b) => b.totalProfit - a.totalProfit);
  }, [clients, itineraryReports]);

  // Statistics par catégorie
  const categoryStats = useMemo(() => {
    const stats = {
      profitable: { count: 0, revenue: 0, profit: 0, timeHours: 0 },
      neutral: { count: 0, revenue: 0, profit: 0, timeHours: 0 },
      toxic: { count: 0, revenue: 0, profit: 0, timeHours: 0 },
    };
    
    clientAnalyses.forEach(a => {
      stats[a.category].count++;
      stats[a.category].revenue += a.totalRevenue;
      stats[a.category].profit += a.totalProfit;
      stats[a.category].timeHours += a.estimatedTimeHours;
    });
    
    return stats;
  }, [clientAnalyses]);

  // Filtered clients
  const filteredClients = selectedCategory === 'all' 
    ? clientAnalyses 
    : clientAnalyses.filter(a => a.category === selectedCategory);

  // Chart data
  const pieData = [
    { name: 'Rentables', value: categoryStats.profitable.count, color: 'hsl(var(--success))' },
    { name: 'Neutres', value: categoryStats.neutral.count, color: 'hsl(var(--warning))' },
    { name: 'Toxiques', value: categoryStats.toxic.count, color: 'hsl(var(--destructive))' },
  ].filter(d => d.value > 0);

  const profitComparisonData = [
    { name: 'Rentables', profit: categoryStats.profitable.profit, fill: 'hsl(var(--success))' },
    { name: 'Neutres', profit: categoryStats.neutral.profit, fill: 'hsl(var(--warning))' },
    { name: 'Toxiques', profit: categoryStats.toxic.profit, fill: 'hsl(var(--destructive))' },
  ];

  const chartConfig = {
    profit: { label: 'Profit', color: 'hsl(var(--primary))' },
    count: { label: 'Clients', color: 'hsl(var(--success))' },
  };

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value);

  const formatHours = (hours: number) => {
    if (hours < 1) return `${Math.round(hours * 60)} min`;
    return `${hours.toFixed(1)}h`;
  };

  // Calcul de l'impact total des clients toxiques
  const toxicImpact = categoryStats.toxic.profit;
  const timeWastedOnToxic = categoryStats.toxic.timeHours;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
          <Target className="w-8 h-8 text-primary" />
          Analyse Clients Toxiques
        </h1>
        <p className="text-muted-foreground mt-1">
          Identifiez les clients rentables et ceux qui détruisent votre marge
        </p>
      </div>

      {/* Alert si clients toxiques */}
      {categoryStats.toxic.count > 0 && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-full bg-destructive/20">
                <AlertTriangle className="w-6 h-6 text-destructive" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-destructive">
                  ⚠️ {categoryStats.toxic.count} client(s) destructeur(s) de marge détecté(s)
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Ces clients vous coûtent{' '}
                  <span className="font-bold text-destructive">{formatCurrency(Math.abs(toxicImpact))}</span>
                  {' '}pour{' '}
                  <span className="font-bold">{formatHours(timeWastedOnToxic)}</span>
                  {' '}de travail estimé.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Category Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(['profitable', 'neutral', 'toxic'] as ClientCategory[]).map(cat => {
          const config = categoryConfig[cat];
          const stats = categoryStats[cat];
          const Icon = config.icon;
          
          return (
            <Card 
              key={cat}
              className={cn(
                "cursor-pointer transition-all border-2",
                config.bgColor,
                selectedCategory === cat && "ring-2 ring-primary"
              )}
              onClick={() => setSelectedCategory(selectedCategory === cat ? 'all' : cat)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Icon className={cn("w-5 h-5", config.color)} />
                    <span className="font-semibold">{config.label}</span>
                  </div>
                  <Badge variant="secondary">{stats.count}</Badge>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">CA Total</span>
                    <span className="font-medium">{formatCurrency(stats.revenue)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Profit/Perte</span>
                    <span className={cn("font-bold", stats.profit >= 0 ? "text-success" : "text-destructive")}>
                      {formatCurrency(stats.profit)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Temps estimé</span>
                    <span className="font-medium">{formatHours(stats.timeHours)}</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-3 pt-2 border-t border-border/50">
                  {config.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Pie Chart - Distribution */}
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Répartition des clients
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[250px] w-full">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    nameKey="name"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Legend />
                </PieChart>
              </ChartContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                Aucune donnée disponible
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bar Chart - Profit Comparison */}
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              Profit par catégorie
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[250px] w-full">
              <BarChart data={profitComparisonData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" tickFormatter={(v) => `${(v/1000).toFixed(0)}k€`} />
                <YAxis type="category" dataKey="name" width={80} />
                <ChartTooltip 
                  content={<ChartTooltipContent />} 
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Bar dataKey="profit" radius={[0, 4, 4, 0]}>
                  {profitComparisonData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* KPI Row - Time vs Billing */}
      <Card className="glass-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            Indicateur Temps perdu vs Facturation réelle
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-success/10 rounded-lg">
              <p className="text-sm text-muted-foreground">Rentables - €/heure</p>
              <p className="text-2xl font-bold text-success">
                {categoryStats.profitable.timeHours > 0 
                  ? formatCurrency(categoryStats.profitable.profit / categoryStats.profitable.timeHours) 
                  : '-'}
              </p>
            </div>
            <div className="p-4 bg-warning/10 rounded-lg">
              <p className="text-sm text-muted-foreground">Neutres - €/heure</p>
              <p className="text-2xl font-bold text-warning">
                {categoryStats.neutral.timeHours > 0 
                  ? formatCurrency(categoryStats.neutral.profit / categoryStats.neutral.timeHours) 
                  : '-'}
              </p>
            </div>
            <div className="p-4 bg-destructive/10 rounded-lg">
              <p className="text-sm text-muted-foreground">Toxiques - €/heure</p>
              <p className="text-2xl font-bold text-destructive">
                {categoryStats.toxic.timeHours > 0 
                  ? formatCurrency(categoryStats.toxic.profit / categoryStats.toxic.timeHours) 
                  : '-'}
              </p>
            </div>
            <div className="p-4 bg-primary/10 rounded-lg">
              <p className="text-sm text-muted-foreground">Temps perdu (toxiques)</p>
              <p className="text-2xl font-bold text-primary">
                {formatHours(timeWastedOnToxic)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Client List */}
      <Card className="glass-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Classement détaillé ({filteredClients.length} clients)
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant={selectedCategory === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory('all')}
            >
              Tous
            </Button>
            {(['profitable', 'neutral', 'toxic'] as ClientCategory[]).map(cat => {
              const config = categoryConfig[cat];
              return (
                <Button
                  key={cat}
                  variant={selectedCategory === cat ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(cat)}
                  className={selectedCategory === cat ? '' : config.color}
                >
                  {config.label}
                </Button>
              );
            })}
          </div>
        </CardHeader>
        <CardContent>
          {filteredClients.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Aucun client avec des tournées enregistrées</p>
              <p className="text-sm">Créez des tournées pour vos clients pour voir l'analyse</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Client</th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">Catégorie</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Tournées</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">CA</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Coûts</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Profit</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Marge</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">€/h estimé</th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">Tendance</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredClients.map((analysis) => {
                    const config = categoryConfig[analysis.category];
                    const CategoryIcon = config.icon;
                    
                    return (
                      <tr key={analysis.client.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                        <td className="py-3 px-4">
                          <div>
                            <span className="font-medium text-foreground">{analysis.client.name}</span>
                            {analysis.client.company && (
                              <span className="text-muted-foreground text-sm ml-2">({analysis.client.company})</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Badge variant="outline" className={cn("gap-1", config.bgColor, config.color)}>
                            <CategoryIcon className="w-3 h-3" />
                            {config.label}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Badge variant="secondary">{analysis.tourCount}</Badge>
                        </td>
                        <td className="py-3 px-4 text-right text-muted-foreground">
                          {formatCurrency(analysis.totalRevenue)}
                        </td>
                        <td className="py-3 px-4 text-right text-muted-foreground">
                          {formatCurrency(analysis.totalCost)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className={cn(
                            "font-bold",
                            analysis.totalProfit >= 0 ? "text-success" : "text-destructive"
                          )}>
                            {formatCurrency(analysis.totalProfit)}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className={cn(
                            "font-medium",
                            analysis.profitMargin >= 15 ? "text-success" : 
                            analysis.profitMargin >= 0 ? "text-warning" : "text-destructive"
                          )}>
                            {analysis.profitMargin.toFixed(1)}%
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className={cn(
                            "font-medium",
                            analysis.profitPerHour >= 50 ? "text-success" : 
                            analysis.profitPerHour >= 0 ? "text-warning" : "text-destructive"
                          )}>
                            {formatCurrency(analysis.profitPerHour)}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {analysis.trend === 'up' && (
                            <ArrowUpRight className="w-5 h-5 text-success mx-auto" />
                          )}
                          {analysis.trend === 'down' && (
                            <ArrowDownRight className="w-5 h-5 text-destructive mx-auto" />
                          )}
                          {analysis.trend === 'stable' && (
                            <Minus className="w-5 h-5 text-muted-foreground mx-auto" />
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
