import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Users, Route, Euro, TrendingUp, MapPin, 
  Fuel, ReceiptText, Calendar, Building2, BarChart3
} from 'lucide-react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useClients } from '@/hooks/useClients';
import type { LocalClient, LocalClientReport } from '@/types/local';
import { format, startOfMonth, subMonths } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, LineChart, Line, CartesianGrid, Legend } from 'recharts';

interface ClientStats {
  client: LocalClient;
  tourCount: number;
  totalDistance: number;
  totalFuelCost: number;
  totalTollCost: number;
  totalCost: number;
  averageCostPerKm: number;
  lastTourDate: string | null;
}

export function ClientsDashboard() {
  const { clients } = useClients();
  const [reports] = useLocalStorage<LocalClientReport[]>('optiflow_client_reports', []);

  const itineraryReports = reports.filter(r => r.report_type === 'itinerary');

  const clientStats = useMemo(() => {
    const stats: ClientStats[] = clients.map(client => {
      const clientReports = itineraryReports.filter(r => r.client_id === client.id);
      
      const totalDistance = clientReports.reduce((sum, r) => sum + (r.data.distance_km || 0), 0);
      const totalFuelCost = clientReports.reduce((sum, r) => sum + (r.data.fuel_cost || 0), 0);
      const totalTollCost = clientReports.reduce((sum, r) => sum + (r.data.toll_cost || 0), 0);
      const totalCost = clientReports.reduce((sum, r) => sum + (r.data.total_cost || 0), 0);
      
      const sortedReports = [...clientReports].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      
      return {
        client,
        tourCount: clientReports.length,
        totalDistance,
        totalFuelCost,
        totalTollCost,
        totalCost,
        averageCostPerKm: totalDistance > 0 ? totalCost / totalDistance : 0,
        lastTourDate: sortedReports[0]?.created_at || null,
      };
    });

    // Sort by tour count descending
    return stats.sort((a, b) => b.tourCount - a.tourCount);
  }, [clients, itineraryReports]);

  const globalStats = useMemo(() => {
    const totalTours = itineraryReports.length;
    const totalDistance = itineraryReports.reduce((sum, r) => sum + (r.data.distance_km || 0), 0);
    const totalCost = itineraryReports.reduce((sum, r) => sum + (r.data.total_cost || 0), 0);
    const totalFuelCost = itineraryReports.reduce((sum, r) => sum + (r.data.fuel_cost || 0), 0);
    const totalTollCost = itineraryReports.reduce((sum, r) => sum + (r.data.toll_cost || 0), 0);
    const clientsWithTours = clientStats.filter(s => s.tourCount > 0).length;
    
    return {
      totalTours,
      totalDistance,
      totalCost,
      totalFuelCost,
      totalTollCost,
      clientsWithTours,
      totalClients: clients.length,
      averageCostPerKm: totalDistance > 0 ? totalCost / totalDistance : 0,
      averageToursPerClient: clientsWithTours > 0 ? totalTours / clientsWithTours : 0,
    };
  }, [itineraryReports, clientStats, clients.length]);

  // Monthly evolution data for the last 12 months
  const monthlyData = useMemo(() => {
    const months: { month: string; monthKey: string; tours: number; distance: number; cost: number }[] = [];
    
    for (let i = 11; i >= 0; i--) {
      const monthDate = subMonths(new Date(), i);
      const monthKey = format(monthDate, 'yyyy-MM');
      const monthLabel = format(monthDate, 'MMM yy', { locale: fr });
      
      const monthReports = itineraryReports.filter(r => {
        const reportDate = new Date(r.created_at);
        return format(reportDate, 'yyyy-MM') === monthKey;
      });
      
      months.push({
        month: monthLabel,
        monthKey,
        tours: monthReports.length,
        distance: Math.round(monthReports.reduce((sum, r) => sum + (r.data.distance_km || 0), 0)),
        cost: Math.round(monthReports.reduce((sum, r) => sum + (r.data.total_cost || 0), 0) * 100) / 100,
      });
    }
    
    return months;
  }, [itineraryReports]);

  const chartConfig = {
    tours: {
      label: 'Tournées',
      color: 'hsl(var(--primary))',
    },
    distance: {
      label: 'Distance (km)',
      color: 'hsl(var(--success))',
    },
    cost: {
      label: 'Coût (€)',
      color: 'hsl(var(--warning))',
    },
  };

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value);

  const formatDate = (date: string) => 
    format(new Date(date), 'dd MMM yyyy', { locale: fr });

  return (
    <div className="space-y-6">
      {/* Global Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Clients actifs</p>
                <p className="text-2xl font-bold">{globalStats.clientsWithTours}/{globalStats.totalClients}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <Route className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tournées totales</p>
                <p className="text-2xl font-bold">{globalStats.totalTours}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/10">
                <MapPin className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Distance totale</p>
                <p className="text-2xl font-bold">{globalStats.totalDistance.toLocaleString('fr-FR')} km</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10">
                <Euro className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Coûts totaux</p>
                <p className="text-2xl font-bold">{formatCurrency(globalStats.totalCost)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <TrendingUp className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Coût moyen/km</p>
                <p className="text-2xl font-bold">{globalStats.averageCostPerKm.toFixed(3)} €</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Costs Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Fuel className="w-5 h-5 text-primary" />
              Répartition des coûts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Carburant</span>
                <span className="font-medium">{formatCurrency(globalStats.totalFuelCost)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Péages</span>
                <span className="font-medium">{formatCurrency(globalStats.totalTollCost)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Autres (AdBlue, chauffeur, structure)</span>
                <span className="font-medium">{formatCurrency(globalStats.totalCost - globalStats.totalFuelCost - globalStats.totalTollCost)}</span>
              </div>
              <div className="pt-2 border-t border-border flex justify-between items-center">
                <span className="font-medium">Total</span>
                <span className="text-lg font-bold text-primary">{formatCurrency(globalStats.totalCost)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-success" />
              Moyennes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Tournées par client</span>
                <span className="font-medium">{globalStats.averageToursPerClient.toFixed(1)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Distance moyenne par tournée</span>
                <span className="font-medium">{globalStats.totalTours > 0 ? Math.round(globalStats.totalDistance / globalStats.totalTours) : 0} km</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Coût moyen par tournée</span>
                <span className="font-medium">{globalStats.totalTours > 0 ? formatCurrency(globalStats.totalCost / globalStats.totalTours) : formatCurrency(0)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Coût moyen au km</span>
                <span className="font-medium">{globalStats.averageCostPerKm.toFixed(3)} €/km</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Evolution Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              Tournées par mois
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[250px] w-full">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="month" 
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar 
                  dataKey="tours" 
                  fill="hsl(var(--primary))" 
                  radius={[4, 4, 0, 0]}
                  name="Tournées"
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-success" />
              Évolution distance & coûts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[250px] w-full">
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="month" 
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  yAxisId="left"
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  yAxisId="right" 
                  orientation="right"
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Legend />
                <Line 
                  yAxisId="left"
                  type="monotone" 
                  dataKey="distance" 
                  stroke="hsl(var(--success))" 
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--success))' }}
                  name="Distance (km)"
                />
                <Line 
                  yAxisId="right"
                  type="monotone" 
                  dataKey="cost" 
                  stroke="hsl(var(--warning))" 
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--warning))' }}
                  name="Coût (€)"
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Client Table */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            Statistiques par client
          </CardTitle>
        </CardHeader>
        <CardContent>
          {clientStats.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p>Aucun client enregistré</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Client</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Tournées</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Distance</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Carburant</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Péages</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Coût total</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">€/km</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Dernière tournée</th>
                  </tr>
                </thead>
                <tbody>
                  {clientStats.map((stat) => (
                    <tr key={stat.client.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                      <td className="py-3 px-4">
                        <div>
                          <span className="font-medium text-foreground">{stat.client.name}</span>
                          {stat.client.company && (
                            <span className="text-muted-foreground text-sm ml-2">({stat.client.company})</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {stat.tourCount > 0 ? (
                          <Badge variant="default">{stat.tourCount}</Badge>
                        ) : (
                          <Badge variant="secondary">0</Badge>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right text-muted-foreground">
                        {stat.totalDistance.toLocaleString('fr-FR')} km
                      </td>
                      <td className="py-3 px-4 text-right text-muted-foreground">
                        {formatCurrency(stat.totalFuelCost)}
                      </td>
                      <td className="py-3 px-4 text-right text-muted-foreground">
                        {formatCurrency(stat.totalTollCost)}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-foreground">
                        {formatCurrency(stat.totalCost)}
                      </td>
                      <td className="py-3 px-4 text-right text-muted-foreground">
                        {stat.averageCostPerKm.toFixed(3)} €
                      </td>
                      <td className="py-3 px-4 text-right text-muted-foreground text-sm">
                        {stat.lastTourDate ? formatDate(stat.lastTourDate) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-muted/30">
                    <td className="py-3 px-4 font-bold text-foreground">TOTAL</td>
                    <td className="py-3 px-4 text-right font-bold">{globalStats.totalTours}</td>
                    <td className="py-3 px-4 text-right font-bold">{globalStats.totalDistance.toLocaleString('fr-FR')} km</td>
                    <td className="py-3 px-4 text-right font-bold">{formatCurrency(globalStats.totalFuelCost)}</td>
                    <td className="py-3 px-4 text-right font-bold">{formatCurrency(globalStats.totalTollCost)}</td>
                    <td className="py-3 px-4 text-right font-bold text-primary">{formatCurrency(globalStats.totalCost)}</td>
                    <td className="py-3 px-4 text-right font-bold">{globalStats.averageCostPerKm.toFixed(3)} €</td>
                    <td className="py-3 px-4"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}