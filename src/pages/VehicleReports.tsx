import { useMemo, useState } from 'react';
import { 
  Truck, 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  Fuel, 
  Wrench, 
  CircleDollarSign,
  Calendar,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Target,
  Route,
  Euro,
  Clock,
  Award,
  Medal
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useApp } from '@/context/AppContext';
import { cn } from '@/lib/utils';
import type { Vehicle } from '@/types/vehicle';
import type { LocalClientReport } from '@/types/local';
import { calculateVehicleCosts, calculateTrailerCosts, formatCostPerKm, getCostPerKmColor } from '@/hooks/useVehicleCost';
import type { Trailer } from '@/types/trailer';
import { format, subMonths, startOfMonth, endOfMonth, parseISO, isWithinInterval } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts';

interface VehicleStats {
  vehicle: Vehicle;
  tourCount: number;
  totalDistance: number;
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  profitMargin: number;
  profitPerKm: number;
  costPerKm: number;
  averageDistancePerTour: number;
  utilizationScore: number; // 0-100 based on activity
}

interface MonthlyVehicleData {
  month: string;
  monthKey: string;
  [key: string]: number | string;
}

export default function VehicleReports() {
  const { vehicle } = useApp();
  const [vehicles] = useLocalStorage<Vehicle[]>('optiflow_vehicles', []);
  const [trailers] = useLocalStorage<Trailer[]>('optiflow_trailers', []);
  const [reports] = useLocalStorage<LocalClientReport[]>('optiflow_client_reports', []);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('all');
  const [expandedVehicle, setExpandedVehicle] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'monthly' | 'comparison'>('overview');

  const itineraryReports = reports.filter(r => r.report_type === 'itinerary');

  const formatCurrency = (value: number) => new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR'
  }).format(value);

  const formatNumber = (value: number) => new Intl.NumberFormat('fr-FR').format(value);

  // Calculate cost breakdown for all vehicles
  const vehicleCosts = useMemo(() => {
    return vehicles.map(v => {
      const costs = calculateVehicleCosts(v, {
        fuelPriceHT: vehicle.fuelPriceHT,
        adBluePriceHT: vehicle.adBluePriceHT,
      });
      return { vehicle: v, costs };
    });
  }, [vehicles, vehicle.fuelPriceHT, vehicle.adBluePriceHT]);

  // Calculate cost breakdown for all trailers
  const trailerCosts = useMemo(() => {
    return trailers.map(t => {
      const costs = calculateTrailerCosts(t, {});
      return { trailer: t, costs };
    });
  }, [trailers]);

  // Depreciation alerts (vehicles and trailers at 90%+ depreciation)
  const depreciationAlerts = useMemo(() => {
    const alerts: Array<{
      type: 'vehicle' | 'trailer';
      id: string;
      name: string;
      licensePlate: string;
      percent: number;
      bookValue: number;
      isFullyDepreciated: boolean;
    }> = [];
    
    const ALERT_THRESHOLD = 90;
    
    vehicleCosts.forEach(({ vehicle: v, costs }) => {
      if (costs.depreciation && costs.depreciation.depreciationPercent >= ALERT_THRESHOLD) {
        alerts.push({
          type: 'vehicle',
          id: v.id,
          name: v.name,
          licensePlate: v.licensePlate,
          percent: costs.depreciation.depreciationPercent,
          bookValue: costs.depreciation.currentBookValue,
          isFullyDepreciated: costs.depreciation.isFullyDepreciated,
        });
      }
    });
    
    trailerCosts.forEach(({ trailer: t, costs }) => {
      if (costs.depreciation && costs.depreciation.depreciationPercent >= ALERT_THRESHOLD) {
        alerts.push({
          type: 'trailer',
          id: t.id,
          name: t.name,
          licensePlate: t.licensePlate,
          percent: costs.depreciation.depreciationPercent,
          bookValue: costs.depreciation.currentBookValue,
          isFullyDepreciated: costs.depreciation.isFullyDepreciated,
        });
      }
    });
    
    return alerts.sort((a, b) => b.percent - a.percent);
  }, [vehicleCosts, trailerCosts]);

  // Calculate vehicle statistics from reports
  const vehicleStats = useMemo((): VehicleStats[] => {
    return vehicles.map(v => {
      // Get reports for this vehicle (using vehicle_id from report data)
      const vehicleReports = itineraryReports.filter(r => 
        r.data.vehicle_id === v.id || r.data.vehicle_name === v.name
      );
      
      const totalDistance = vehicleReports.reduce((sum, r) => sum + (r.data.distance_km || 0), 0);
      const totalRevenue = vehicleReports.reduce((sum, r) => sum + (r.data.revenue || 0), 0);
      const totalCost = vehicleReports.reduce((sum, r) => sum + (r.data.total_cost || 0), 0);
      const totalProfit = totalRevenue - totalCost;
      const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
      const profitPerKm = totalDistance > 0 ? totalProfit / totalDistance : 0;
      const costPerKm = totalDistance > 0 ? totalCost / totalDistance : 0;
      const averageDistancePerTour = vehicleReports.length > 0 ? totalDistance / vehicleReports.length : 0;
      
      // Utilization score based on activity (tours per month, distance, etc.)
      const monthsActive = 6; // Consider last 6 months
      const expectedToursPerMonth = 15; // Expected tours
      const utilizationScore = Math.min(100, (vehicleReports.length / (expectedToursPerMonth * monthsActive)) * 100);
      
      return {
        vehicle: v,
        tourCount: vehicleReports.length,
        totalDistance,
        totalRevenue,
        totalCost,
        totalProfit,
        profitMargin,
        profitPerKm,
        costPerKm,
        averageDistancePerTour,
        utilizationScore,
      };
    }).sort((a, b) => b.totalProfit - a.totalProfit);
  }, [vehicles, itineraryReports]);

  // Monthly data for the last 12 months
  const monthlyData = useMemo((): MonthlyVehicleData[] => {
    const months: MonthlyVehicleData[] = [];
    
    for (let i = 11; i >= 0; i--) {
      const monthDate = subMonths(new Date(), i);
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);
      const monthKey = format(monthDate, 'yyyy-MM');
      const monthLabel = format(monthDate, 'MMM yy', { locale: fr });
      
      const data: MonthlyVehicleData = { month: monthLabel, monthKey };
      let totalProfit = 0;
      let totalRevenue = 0;
      let totalDistance = 0;
      
      vehicles.forEach(v => {
        const vehicleReports = itineraryReports.filter(r => {
          if (r.data.vehicle_id !== v.id && r.data.vehicle_name !== v.name) return false;
          try {
            const reportDate = parseISO(r.created_at);
            return isWithinInterval(reportDate, { start: monthStart, end: monthEnd });
          } catch {
            return false;
          }
        });
        
        const distance = vehicleReports.reduce((sum, r) => sum + (r.data.distance_km || 0), 0);
        const revenue = vehicleReports.reduce((sum, r) => sum + (r.data.revenue || 0), 0);
        const cost = vehicleReports.reduce((sum, r) => sum + (r.data.total_cost || 0), 0);
        const profit = revenue - cost;
        
        data[`${v.name}_distance`] = Math.round(distance);
        data[`${v.name}_profit`] = Math.round(profit);
        data[`${v.name}_tours`] = vehicleReports.length;
        
        totalProfit += profit;
        totalRevenue += revenue;
        totalDistance += distance;
      });
      
      data.totalProfit = Math.round(totalProfit);
      data.totalRevenue = Math.round(totalRevenue);
      data.totalDistance = Math.round(totalDistance);
      
      months.push(data);
    }
    
    return months;
  }, [vehicles, itineraryReports]);

  // Comparison data for bar chart
  const comparisonData = useMemo(() => {
    return vehicleCosts.map(({ vehicle: v, costs }) => {
      const stats = vehicleStats.find(s => s.vehicle.id === v.id);
      return {
        name: v.name.substring(0, 12),
        'Carburant': costs.fuelCostPerKm,
        'AdBlue': costs.adBlueCostPerKm,
        'Entretien': costs.maintenanceCostPerKm,
        'Pneus': costs.tireCostPerKm,
        'Fixes': costs.fixedCostPerKm,
        total: costs.totalCostPerKm,
        profit: stats?.totalProfit || 0,
        profitMargin: stats?.profitMargin || 0,
      };
    });
  }, [vehicleCosts, vehicleStats]);

  // Profit comparison data
  const profitComparisonData = useMemo(() => {
    return vehicleStats.map(s => ({
      name: s.vehicle.name.substring(0, 12),
      profit: s.totalProfit,
      margin: s.profitMargin,
      distance: s.totalDistance,
      tours: s.tourCount,
      fill: s.totalProfit > 0 ? 'hsl(var(--success))' : 'hsl(var(--destructive))',
    }));
  }, [vehicleStats]);

  // Cost distribution pie chart data
  const costDistributionData = useMemo(() => {
    const avgCosts = vehicleCosts.reduce((acc, { costs }) => ({
      fuel: acc.fuel + costs.fuelCostPerKm,
      adblue: acc.adblue + costs.adBlueCostPerKm,
      maintenance: acc.maintenance + costs.maintenanceCostPerKm,
      tires: acc.tires + costs.tireCostPerKm,
      fixed: acc.fixed + costs.fixedCostPerKm,
    }), { fuel: 0, adblue: 0, maintenance: 0, tires: 0, fixed: 0 });

    const count = vehicleCosts.length || 1;
    return [
      { name: 'Carburant', value: avgCosts.fuel / count, color: '#ef4444' },
      { name: 'AdBlue', value: avgCosts.adblue / count, color: '#3b82f6' },
      { name: 'Entretien', value: avgCosts.maintenance / count, color: '#f59e0b' },
      { name: 'Pneus', value: avgCosts.tires / count, color: '#10b981' },
      { name: 'Fixes', value: avgCosts.fixed / count, color: '#8b5cf6' },
    ];
  }, [vehicleCosts]);

  const COLORS = ['#ef4444', '#3b82f6', '#f59e0b', '#10b981', '#8b5cf6'];

  // Global stats
  const globalStats = useMemo(() => {
    if (vehicleStats.length === 0) return null;
    
    const totalRevenue = vehicleStats.reduce((sum, s) => sum + s.totalRevenue, 0);
    const totalCost = vehicleStats.reduce((sum, s) => sum + s.totalCost, 0);
    const totalProfit = vehicleStats.reduce((sum, s) => sum + s.totalProfit, 0);
    const totalDistance = vehicleStats.reduce((sum, s) => sum + s.totalDistance, 0);
    const totalTours = vehicleStats.reduce((sum, s) => sum + s.tourCount, 0);
    const avgProfitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
    const avgCostPerKm = vehicleCosts.reduce((sum, v) => sum + v.costs.totalCostPerKm, 0) / vehicleCosts.length;
    
    const bestVehicle = vehicleStats.length > 0 ? vehicleStats[0] : null;
    const worstVehicle = vehicleStats.length > 0 ? vehicleStats[vehicleStats.length - 1] : null;
    
    return {
      totalRevenue,
      totalCost,
      totalProfit,
      totalDistance,
      totalTours,
      avgProfitMargin,
      avgCostPerKm,
      bestVehicle,
      worstVehicle,
      vehicleCount: vehicles.length,
    };
  }, [vehicleStats, vehicleCosts, vehicles.length]);

  if (vehicles.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Rapports Véhicules</h1>
          <p className="text-muted-foreground mt-1">Analyse de rentabilité de votre flotte</p>
        </div>
        <div className="glass-card p-12 text-center">
          <Truck className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-semibold text-foreground mb-2">Aucun véhicule</h3>
          <p className="text-muted-foreground">
            Ajoutez des véhicules pour voir les rapports de rentabilité.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-primary" />
            Rapports Véhicules
          </h1>
          <p className="text-muted-foreground mt-1">Analyse de rentabilité et comparaison de votre flotte</p>
        </div>
        <Select value={selectedVehicleId} onValueChange={setSelectedVehicleId}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Tous les véhicules" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les véhicules</SelectItem>
            {vehicles.map(v => (
              <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Global Stats Cards */}
      {globalStats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Truck className="w-4 h-4 text-primary" />
                <span className="text-xs text-muted-foreground">Flotte</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{globalStats.vehicleCount}</p>
              <p className="text-xs text-muted-foreground">véhicules</p>
            </CardContent>
          </Card>
          
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Route className="w-4 h-4 text-success" />
                <span className="text-xs text-muted-foreground">Distance totale</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{formatNumber(globalStats.totalDistance)}</p>
              <p className="text-xs text-muted-foreground">km</p>
            </CardContent>
          </Card>
          
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Euro className="w-4 h-4 text-warning" />
                <span className="text-xs text-muted-foreground">CA Total</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{formatCurrency(globalStats.totalRevenue)}</p>
            </CardContent>
          </Card>
          
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-success" />
                <span className="text-xs text-muted-foreground">Profit Total</span>
              </div>
              <p className={cn(
                "text-2xl font-bold",
                globalStats.totalProfit >= 0 ? "text-success" : "text-destructive"
              )}>
                {formatCurrency(globalStats.totalProfit)}
              </p>
            </CardContent>
          </Card>
          
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 text-primary" />
                <span className="text-xs text-muted-foreground">Marge moyenne</span>
              </div>
              <p className={cn(
                "text-2xl font-bold",
                globalStats.avgProfitMargin >= 15 ? "text-success" : 
                globalStats.avgProfitMargin >= 0 ? "text-warning" : "text-destructive"
              )}>
                {globalStats.avgProfitMargin.toFixed(1)}%
              </p>
            </CardContent>
          </Card>
          
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <CircleDollarSign className="w-4 h-4 text-purple-500" />
                <span className="text-xs text-muted-foreground">Coût/km moyen</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{formatCostPerKm(globalStats.avgCostPerKm)}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Depreciation Alerts */}
      {depreciationAlerts.length > 0 && (
        <Card className="glass-card border-warning/50 bg-warning/5">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-warning">
              <AlertTriangle className="w-5 h-5" />
              Alertes amortissement
              <Badge variant="outline" className="ml-2 border-warning text-warning">
                {depreciationAlerts.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {depreciationAlerts.map((alert) => (
                <div 
                  key={`${alert.type}-${alert.id}`}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-lg border",
                    alert.isFullyDepreciated 
                      ? "bg-destructive/10 border-destructive/30" 
                      : "bg-warning/10 border-warning/30"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center",
                      alert.type === 'vehicle' ? "bg-primary/20" : "bg-purple-500/20"
                    )}>
                      {alert.type === 'vehicle' ? (
                        <Truck className="w-5 h-5 text-primary" />
                      ) : (
                        <Truck className="w-5 h-5 text-purple-400" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{alert.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {alert.licensePlate} • {alert.type === 'vehicle' ? 'Véhicule' : 'Remorque'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Valeur comptable</p>
                      <p className="font-medium">{formatCurrency(alert.bookValue)}</p>
                    </div>
                    <div className="text-right min-w-[80px]">
                      <p className="text-xs text-muted-foreground">Amorti</p>
                      <p className={cn(
                        "text-lg font-bold",
                        alert.isFullyDepreciated ? "text-destructive" : "text-warning"
                      )}>
                        {alert.percent.toFixed(0)}%
                      </p>
                    </div>
                    {alert.isFullyDepreciated && (
                      <Badge variant="destructive" className="text-xs">
                        Entièrement amorti
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              💡 Les véhicules et remorques proches de leur amortissement total peuvent nécessiter un renouvellement ou une revalorisation.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Podium - Top 3 Vehicles */}
      {vehicleStats.length >= 2 && (
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5 text-warning" />
              Classement Rentabilité
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {vehicleStats.slice(0, 3).map((stat, idx) => {
                const medals = [
                  { icon: '🥇', color: 'bg-amber-500/20 border-amber-500/50' },
                  { icon: '🥈', color: 'bg-slate-400/20 border-slate-400/50' },
                  { icon: '🥉', color: 'bg-orange-600/20 border-orange-600/50' },
                ];
                const medal = medals[idx];
                
                return (
                  <div 
                    key={stat.vehicle.id} 
                    className={cn(
                      "p-4 rounded-xl border-2 text-center",
                      medal.color
                    )}
                  >
                    <div className="text-3xl mb-2">{medal.icon}</div>
                    <h3 className="font-bold text-lg text-foreground">{stat.vehicle.name}</h3>
                    <p className="text-xs text-muted-foreground mb-3">{stat.vehicle.brand} {stat.vehicle.model}</p>
                    
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-muted-foreground">Profit</p>
                        <p className={cn(
                          "font-bold",
                          stat.totalProfit >= 0 ? "text-success" : "text-destructive"
                        )}>
                          {formatCurrency(stat.totalProfit)}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Marge</p>
                        <p className={cn(
                          "font-bold",
                          stat.profitMargin >= 15 ? "text-success" : 
                          stat.profitMargin >= 0 ? "text-warning" : "text-destructive"
                        )}>
                          {stat.profitMargin.toFixed(1)}%
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Tournées</p>
                        <p className="font-bold text-foreground">{stat.tourCount}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Distance</p>
                        <p className="font-bold text-foreground">{formatNumber(stat.totalDistance)} km</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs for different views */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="monthly">Évolution mensuelle</TabsTrigger>
          <TabsTrigger value="comparison">Comparaison</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Cost per KM Comparison */}
            <Card className="glass-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Coût/km par véhicule</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={comparisonData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                      <YAxis dataKey="name" type="category" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} width={80} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                        formatter={(value: number) => `${value.toFixed(3)} €/km`}
                      />
                      <Legend />
                      <Bar dataKey="Carburant" stackId="a" fill="#ef4444" />
                      <Bar dataKey="AdBlue" stackId="a" fill="#3b82f6" />
                      <Bar dataKey="Entretien" stackId="a" fill="#f59e0b" />
                      <Bar dataKey="Pneus" stackId="a" fill="#10b981" />
                      <Bar dataKey="Fixes" stackId="a" fill="#8b5cf6" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Cost Distribution Pie */}
            <Card className="glass-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Répartition moyenne des coûts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={costDistributionData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {costDistributionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: number) => `${value.toFixed(3)} €/km`}
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Profit by Vehicle Chart */}
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Profit par véhicule</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={profitComparisonData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                    <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                      formatter={(value: number, name: string) => {
                        if (name === 'profit') return formatCurrency(value);
                        if (name === 'margin') return `${value.toFixed(1)}%`;
                        if (name === 'distance') return `${formatNumber(value)} km`;
                        return value;
                      }}
                    />
                    <Bar dataKey="profit" name="Profit">
                      {profitComparisonData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Monthly Tab */}
        <TabsContent value="monthly" className="space-y-6 mt-6">
          {/* Monthly Profit Evolution */}
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                Évolution mensuelle du profit total
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyData}>
                    <defs>
                      <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                    <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                      formatter={(value: number) => formatCurrency(value)}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="totalProfit" 
                      name="Profit total"
                      stroke="hsl(var(--success))" 
                      strokeWidth={2}
                      fill="url(#profitGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Monthly Distance & Revenue */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="glass-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Distance mensuelle</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                      <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                        formatter={(value: number) => `${formatNumber(value)} km`}
                      />
                      <Bar dataKey="totalDistance" name="Distance" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Chiffre d'affaires mensuel</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                      <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                        formatter={(value: number) => formatCurrency(value)}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="totalRevenue" 
                        name="CA"
                        stroke="hsl(var(--warning))" 
                        strokeWidth={2}
                        dot={{ fill: 'hsl(var(--warning))' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Comparison Tab */}
        <TabsContent value="comparison" className="space-y-6 mt-6">
          {/* Vehicle Details List */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-primary" />
                Comparaison détaillée
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Véhicule</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Tournées</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Distance</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">CA</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Coûts</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Profit</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Marge</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Coût/km</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vehicleStats
                      .filter(s => selectedVehicleId === 'all' || s.vehicle.id === selectedVehicleId)
                      .map((stat, idx) => {
                        const costs = vehicleCosts.find(c => c.vehicle.id === stat.vehicle.id)?.costs;
                        const costColor = costs ? getCostPerKmColor(costs.totalCostPerKm) : 'warning';
                        
                        return (
                          <tr key={stat.vehicle.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                                  <Truck className="w-4 h-4 text-primary" />
                                </div>
                                <div>
                                  <p className="font-medium text-foreground">{stat.vehicle.name}</p>
                                  <p className="text-xs text-muted-foreground">{stat.vehicle.licensePlate}</p>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <Badge variant="secondary">{stat.tourCount}</Badge>
                            </td>
                            <td className="py-3 px-4 text-right text-muted-foreground">
                              {formatNumber(stat.totalDistance)} km
                            </td>
                            <td className="py-3 px-4 text-right text-muted-foreground">
                              {formatCurrency(stat.totalRevenue)}
                            </td>
                            <td className="py-3 px-4 text-right text-muted-foreground">
                              {formatCurrency(stat.totalCost)}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <span className={cn(
                                "font-bold",
                                stat.totalProfit >= 0 ? "text-success" : "text-destructive"
                              )}>
                                {formatCurrency(stat.totalProfit)}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <span className={cn(
                                "font-medium",
                                stat.profitMargin >= 15 ? "text-success" : 
                                stat.profitMargin >= 0 ? "text-warning" : "text-destructive"
                              )}>
                                {stat.profitMargin.toFixed(1)}%
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              {costs && (
                                <span className={cn(
                                  "font-bold",
                                  costColor === 'success' && "text-success",
                                  costColor === 'warning' && "text-warning",
                                  costColor === 'destructive' && "text-destructive"
                                )}>
                                  {formatCostPerKm(costs.totalCostPerKm)}
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Expandable Vehicle Details */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Détails techniques par véhicule</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {vehicleCosts
                  .filter(v => selectedVehicleId === 'all' || v.vehicle.id === selectedVehicleId)
                  .map(({ vehicle: v, costs }) => {
                    const isExpanded = expandedVehicle === v.id;
                    const costColor = getCostPerKmColor(costs.totalCostPerKm);
                    
                    return (
                      <div key={v.id} className="border border-border rounded-lg">
                        <button
                          onClick={() => setExpandedVehicle(isExpanded ? null : v.id)}
                          className="w-full p-4 flex items-center justify-between hover:bg-muted/30 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                              <Truck className="w-4 h-4 text-primary" />
                            </div>
                            <div className="text-left">
                              <p className="font-medium text-foreground">{v.name}</p>
                              <p className="text-xs text-muted-foreground">{v.brand} {v.model} • {v.licensePlate}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className={cn(
                                "text-lg font-bold",
                                costColor === 'success' && "text-success",
                                costColor === 'warning' && "text-warning",
                                costColor === 'destructive' && "text-destructive"
                              )}>
                                {formatCostPerKm(costs.totalCostPerKm)}
                              </p>
                            </div>
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </div>
                        </button>
                        
                        {isExpanded && (
                          <div className="p-4 pt-0 border-t border-border">
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
                              <div className="p-2 bg-secondary/50 rounded text-center">
                                <p className="text-xs text-muted-foreground">Carburant</p>
                                <p className="font-medium">{formatCostPerKm(costs.fuelCostPerKm)}</p>
                              </div>
                              <div className="p-2 bg-secondary/50 rounded text-center">
                                <p className="text-xs text-muted-foreground">AdBlue</p>
                                <p className="font-medium">{formatCostPerKm(costs.adBlueCostPerKm)}</p>
                              </div>
                              <div className="p-2 bg-secondary/50 rounded text-center">
                                <p className="text-xs text-muted-foreground">Entretien</p>
                                <p className="font-medium">{formatCostPerKm(costs.maintenanceCostPerKm)}</p>
                              </div>
                              <div className="p-2 bg-secondary/50 rounded text-center">
                                <p className="text-xs text-muted-foreground">Pneus</p>
                                <p className="font-medium">{formatCostPerKm(costs.tireCostPerKm)}</p>
                              </div>
                              <div className="p-2 bg-secondary/50 rounded text-center">
                                <p className="text-xs text-muted-foreground">Fixes</p>
                                <p className="font-medium">{formatCostPerKm(costs.fixedCostPerKm)}</p>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-3 gap-4 text-sm">
                              <div>
                                <p className="text-muted-foreground">Kilométrage</p>
                                <p className="font-medium">{formatNumber(v.currentKm)} km</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Consommation</p>
                                <p className="font-medium">{v.fuelConsumption} L/100km</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Coûts annuels fixes</p>
                                <p className="font-medium">{formatCurrency(costs.totalAnnualFixedCost)}</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
