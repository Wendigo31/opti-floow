import { useState, useMemo } from 'react';
import { Route, MapPin, Truck, Users, Calendar, TrendingUp, Filter, X, Clock, Package } from 'lucide-react';
import { StatCard } from '@/components/dashboard/StatCard';
import { useApp } from '@/context/AppContext';
import { useClients } from '@/hooks/useClients';
import { useSavedTours } from '@/hooks/useSavedTours';
import { useTrips } from '@/hooks/useTrips';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import type { Vehicle } from '@/types/vehicle';

/**
 * OperationalDashboard - A simplified dashboard for exploitation/member roles
 * Shows operational data (distances, trips, clients, vehicles) without financial details
 * Calculations still use charges data internally but values are hidden from display
 */
export function OperationalDashboard() {
  const { trip, settings } = useApp();
  const { clients } = useClients();
  const { tours } = useSavedTours();
  const { trips } = useTrips();
  const [vehicles] = useLocalStorage<Vehicle[]>('optiflow_vehicles', []);

  // Filter state
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'quarter' | 'year'>('month');

  // Calculate date range based on period
  const dateRange = useMemo(() => {
    const now = new Date();
    const start = new Date();
    
    switch (selectedPeriod) {
      case 'week':
        start.setDate(now.getDate() - 7);
        break;
      case 'month':
        start.setMonth(now.getMonth() - 1);
        break;
      case 'quarter':
        start.setMonth(now.getMonth() - 3);
        break;
      case 'year':
        start.setFullYear(now.getFullYear() - 1);
        break;
    }
    
    return { start, end: now };
  }, [selectedPeriod]);

  // Filter trips by date and client
  const filteredTrips = useMemo(() => {
    return trips.filter(trip => {
      const tripDate = new Date(trip.trip_date);
      const inDateRange = tripDate >= dateRange.start && tripDate <= dateRange.end;
      const matchesClient = !selectedClientId || trip.client_id === selectedClientId;
      return inDateRange && matchesClient;
    });
  }, [trips, dateRange, selectedClientId]);

  // Filter tours by client
  const filteredTours = useMemo(() => {
    if (!selectedClientId) return tours;
    return tours.filter(tour => tour.client_id === selectedClientId);
  }, [tours, selectedClientId]);

  // Calculate operational statistics
  const stats = useMemo(() => {
    const totalDistance = filteredTrips.reduce((sum, t) => sum + (Number(t.distance_km) || 0), 0);
    const totalTours = filteredTours.length;
    const totalTrips = filteredTrips.length;
    const activeClients = new Set(filteredTrips.map(t => t.client_id).filter(Boolean)).size;
    const totalDuration = filteredTrips.reduce((sum, t) => sum + (t.duration_minutes || 0), 0);
    const avgDistancePerTrip = totalTrips > 0 ? totalDistance / totalTrips : 0;

    // Calculate trips per period
    const periodDays = selectedPeriod === 'week' ? 7 : 
                       selectedPeriod === 'month' ? 30 : 
                       selectedPeriod === 'quarter' ? 90 : 365;
    const tripsPerDay = totalTrips / periodDays;

    return {
      totalDistance,
      totalTours,
      totalTrips,
      activeClients,
      totalDuration,
      avgDistancePerTrip,
      tripsPerDay,
      activeVehicles: vehicles.filter(v => v.isActive !== false).length,
    };
  }, [filteredTrips, filteredTours, vehicles, selectedPeriod]);

  // Recent tours for activity feed
  const recentTours = useMemo(() => {
    return [...filteredTours]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5);
  }, [filteredTours]);

  // Format helpers
  const formatDistance = (km: number) => `${km.toFixed(0)} km`;
  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}min` : `${mins}min`;
  };

  const periodLabels = {
    week: '7 derniers jours',
    month: '30 derniers jours',
    quarter: '3 derniers mois',
    year: '12 derniers mois',
  };

  const clearFilters = () => {
    setSelectedClientId(null);
  };

  const hasActiveFilters = selectedClientId !== null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Tableau de bord</h1>
          <p className="text-muted-foreground mt-1">Vue opérationnelle • Données d'exploitation</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1 px-3 py-1">
            <Calendar className="w-3 h-3" />
            {periodLabels[selectedPeriod]}
          </Badge>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-card p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">Filtres</span>
          </div>
          
          {/* Period Filter */}
          <div className="min-w-[150px]">
            <Select
              value={selectedPeriod}
              onValueChange={(value) => setSelectedPeriod(value as typeof selectedPeriod)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">7 derniers jours</SelectItem>
                <SelectItem value="month">30 derniers jours</SelectItem>
                <SelectItem value="quarter">3 derniers mois</SelectItem>
                <SelectItem value="year">12 derniers mois</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Client Filter */}
          <div className="flex-1 min-w-[200px] max-w-[300px]">
            <Select
              value={selectedClientId || "all"}
              onValueChange={(value) => setSelectedClientId(value === "all" ? null : value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Tous les clients" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les clients</SelectItem>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.company || client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Clear filters */}
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground hover:text-destructive">
              <X className="w-4 h-4 mr-1" />
              Effacer
            </Button>
          )}
        </div>
      </div>

      {/* KPI Cards - Operational metrics only */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <StatCard 
          title="Distance Totale" 
          value={formatDistance(stats.totalDistance)} 
          subtitle={`Sur ${stats.totalTrips} trajet${stats.totalTrips > 1 ? 's' : ''}`}
          icon={<Route className="w-6 h-6" />} 
          variant="default" 
          delay={100} 
        />
        <StatCard 
          title="Tournées Planifiées" 
          value={stats.totalTours} 
          subtitle="Tournées enregistrées"
          icon={<MapPin className="w-6 h-6" />} 
          variant="default" 
          delay={200} 
        />
        <StatCard 
          title="Clients Actifs" 
          value={stats.activeClients} 
          subtitle={`Sur ${clients.length} clients au total`}
          icon={<Users className="w-6 h-6" />} 
          variant="default" 
          delay={300} 
        />
        <StatCard 
          title="Véhicules Actifs" 
          value={stats.activeVehicles} 
          subtitle="Véhicules en service"
          icon={<Truck className="w-6 h-6" />} 
          variant="default" 
          delay={400} 
        />
      </div>

      {/* Secondary metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Distance moyenne</p>
              <p className="text-2xl font-bold text-foreground">{formatDistance(stats.avgDistancePerTrip)}</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Par trajet effectué</p>
        </div>
        
        <div className="glass-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-success/20 flex items-center justify-center">
              <Clock className="w-5 h-5 text-success" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Temps total</p>
              <p className="text-2xl font-bold text-foreground">{formatDuration(stats.totalDuration)}</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Durée cumulée des trajets</p>
        </div>
        
        <div className="glass-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-warning/20 flex items-center justify-center">
              <Package className="w-5 h-5 text-warning" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Fréquence</p>
              <p className="text-2xl font-bold text-foreground">{stats.tripsPerDay.toFixed(1)}</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Trajets par jour en moyenne</p>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">Activité Récente</h3>
          <Badge variant="outline">{recentTours.length} tournée{recentTours.length > 1 ? 's' : ''}</Badge>
        </div>
        
        {recentTours.length > 0 ? (
          <div className="space-y-3">
            {recentTours.map((tour) => {
              const client = clients.find(c => c.id === tour.client_id);
              return (
                <div 
                  key={tour.id} 
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                      <MapPin className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground text-sm">{tour.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {client?.company || client?.name || 'Client non assigné'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-foreground text-sm">{formatDistance(Number(tour.distance_km))}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(tour.created_at).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Aucune tournée récente</p>
          </div>
        )}
      </div>

      {/* Info notice */}
      <div className="glass-card p-4 border-l-4 border-l-primary/50">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
            <Users className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="font-medium text-foreground text-sm">Vue Exploitation</p>
            <p className="text-xs text-muted-foreground mt-1">
              Cette vue affiche les données opérationnelles. Pour accéder aux informations financières 
              (coûts, marges, bénéfices), veuillez contacter un utilisateur avec le rôle Direction.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
