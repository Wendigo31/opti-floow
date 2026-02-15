import { useEffect } from 'react';
import { 
  Calculator, 
  Route, 
  Truck, 
  Users, 
  Building2, 
  BarChart3, 
  TrendingUp, 
  Euro, 
  MapPin,
  Clock,
  Star,
  Settings2,
  Plus,
  ChevronRight,
  Container,
  FileText
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useNavigate } from 'react-router-dom';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useApp } from '@/context/AppContext';
import { useCloudCharges } from '@/hooks/useCloudCharges';
import { useCloudDrivers } from '@/hooks/useCloudDrivers';
import { useCloudVehicles } from '@/hooks/useCloudVehicles';
import { useCloudTrailers } from '@/hooks/useCloudTrailers';
import { useClients } from '@/hooks/useClients';
import { useSavedTours } from '@/hooks/useSavedTours';
import { useLicense } from '@/hooks/useLicense';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface WidgetConfig {
  id: string;
  enabled: boolean;
  order: number;
}

interface DashboardConfig {
  widgets: WidgetConfig[];
  showCustomization: boolean;
}

const defaultWidgets: WidgetConfig[] = [
  { id: 'shortcuts', enabled: true, order: 0 },
  { id: 'stats', enabled: true, order: 1 },
  { id: 'recent-tours', enabled: true, order: 2 },
  { id: 'fleet-status', enabled: true, order: 3 },
  { id: 'quick-actions', enabled: true, order: 4 },
  { id: 'profitability', enabled: true, order: 5 },
];

const widgetLabels: Record<string, string> = {
  'shortcuts': 'Raccourcis rapides',
  'stats': 'Statistiques globales',
  'recent-tours': 'Dernières tournées',
  'fleet-status': 'État de la flotte',
  'quick-actions': 'Actions rapides',
  'profitability': 'Rentabilité',
};

export default function Home() {
  const navigate = useNavigate();
  const { settings } = useApp();
  
  // Use cloud data for drivers and charges (shared company data)
  const { charges } = useCloudCharges();
  const { cdiDrivers, interimDrivers } = useCloudDrivers();
  const drivers = [...cdiDrivers, ...interimDrivers];
  
  const { tours, fetchTours, loading: toursLoading } = useSavedTours();
  const { planType } = useLicense();
  
  const { vehicles } = useCloudVehicles();
  const { trailers } = useCloudTrailers();
  const { clients } = useClients();
  
  const [config, setConfig] = useLocalStorage<DashboardConfig>('optiflow_dashboard_config', {
    widgets: defaultWidgets,
    showCustomization: false,
  });

  useEffect(() => {
    fetchTours();
  }, [fetchTours]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value);

  const toggleWidget = (widgetId: string) => {
    setConfig(prev => ({
      ...prev,
      widgets: prev.widgets.map(w => 
        w.id === widgetId ? { ...w, enabled: !w.enabled } : w
      ),
    }));
  };

  const enabledWidgets = config.widgets
    .filter(w => w.enabled)
    .sort((a, b) => a.order - b.order);

  // Calculate stats
  const totalRevenue = tours.reduce((sum, t) => sum + (t.revenue || 0), 0);
  const totalProfit = tours.reduce((sum, t) => sum + (t.profit || 0), 0);
  const avgMargin = tours.length > 0 
    ? tours.reduce((sum, t) => sum + (t.profit_margin || 0), 0) / tours.length 
    : 0;
  const totalDistance = tours.reduce((sum, t) => sum + t.distance_km, 0);

  // Recent tours (last 5)
  const recentTours = tours.slice(0, 5);

  // Fleet status
  const activeVehicles = vehicles.filter(v => v.isActive).length;
  const activeTrailers = trailers.filter(t => t.isActive).length;

  const shortcuts = [
    { icon: Calculator, label: 'Calculateur', path: '/calculator', color: 'bg-blue-500/20 text-blue-500' },
    { icon: Route, label: 'Itinéraire', path: '/itinerary', color: 'bg-green-500/20 text-green-500' },
    { icon: FileText, label: 'Tournées', path: '/tours', color: 'bg-purple-500/20 text-purple-500' },
    { icon: Truck, label: 'Véhicules', path: '/vehicles', color: 'bg-orange-500/20 text-orange-500' },
    { icon: Users, label: 'Conducteurs', path: '/drivers', color: 'bg-cyan-500/20 text-cyan-500' },
    { icon: Building2, label: 'Clients', path: '/clients', color: 'bg-pink-500/20 text-pink-500' },
    { icon: BarChart3, label: 'Analyse', path: '/dashboard', color: 'bg-amber-500/20 text-amber-500' },
    { icon: TrendingUp, label: 'Prévisionnel', path: '/forecast', color: 'bg-indigo-500/20 text-indigo-500' },
  ];

  const renderWidget = (widgetId: string) => {
    switch (widgetId) {
      case 'shortcuts':
        return (
          <Card key={widgetId} className="col-span-full">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <MapPin className="w-5 h-5 text-primary" />
                Accès rapide
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
                {shortcuts.map((shortcut) => (
                  <button
                    key={shortcut.path}
                    onClick={() => navigate(shortcut.path)}
                    className="flex flex-col items-center gap-2 p-4 rounded-xl hover:bg-muted/50 transition-all hover:scale-105 group"
                  >
                    <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", shortcut.color)}>
                      <shortcut.icon className="w-6 h-6" />
                    </div>
                    <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                      {shortcut.label}
                    </span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        );

      case 'stats':
        return (
          <div key={widgetId} className="col-span-full grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <Route className="w-4 h-4" />
                  <span className="text-sm">Tournées</span>
                </div>
                <p className="text-2xl font-bold text-foreground">{tours.length}</p>
                <p className="text-xs text-muted-foreground">{totalDistance.toLocaleString('fr-FR')} km total</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-primary mb-2">
                  <Euro className="w-4 h-4" />
                  <span className="text-sm">CA Total</span>
                </div>
                <p className="text-2xl font-bold text-foreground">{formatCurrency(totalRevenue)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-green-500 mb-2">
                  <TrendingUp className="w-4 h-4" />
                  <span className="text-sm">Bénéfice</span>
                </div>
                <p className={cn("text-2xl font-bold", totalProfit >= 0 ? "text-green-500" : "text-destructive")}>
                  {formatCurrency(totalProfit)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-amber-500 mb-2">
                  <BarChart3 className="w-4 h-4" />
                  <span className="text-sm">Marge moyenne</span>
                </div>
                <p className={cn(
                  "text-2xl font-bold",
                  avgMargin >= 15 ? "text-green-500" : avgMargin >= 0 ? "text-amber-500" : "text-destructive"
                )}>
                  {avgMargin.toFixed(1)}%
                </p>
              </CardContent>
            </Card>
          </div>
        );

      case 'recent-tours':
        return (
          <Card key={widgetId} className="col-span-full md:col-span-2">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Clock className="w-5 h-5 text-primary" />
                Dernières tournées
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/tours')}>
                Voir tout
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </CardHeader>
            <CardContent>
              {toursLoading ? (
                <p className="text-muted-foreground text-sm">Chargement...</p>
              ) : recentTours.length === 0 ? (
                <div className="text-center py-6">
                  <Route className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground text-sm">Aucune tournée enregistrée</p>
                  <Button variant="outline" size="sm" className="mt-3" onClick={() => navigate('/calculator')}>
                    Créer une tournée
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentTours.map((tour) => (
                    <div 
                      key={tour.id} 
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => navigate('/tours')}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-foreground truncate">{tour.name}</p>
                          {tour.is_favorite && <Star className="w-3 h-3 text-amber-500 fill-amber-500" />}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {tour.origin_address.split(',')[0]} → {tour.destination_address.split(',')[0]}
                        </p>
                      </div>
                      <div className="text-right ml-4">
                        <Badge 
                          variant={(tour.profit_margin || 0) >= 15 ? 'default' : 'destructive'}
                          className={(tour.profit_margin || 0) >= 15 ? 'bg-green-500/20 text-green-500' : ''}
                        >
                          {(tour.profit_margin || 0).toFixed(1)}%
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(tour.created_at), 'dd/MM', { locale: fr })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        );

      case 'fleet-status':
        return (
          <Card key={widgetId}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Truck className="w-5 h-5 text-primary" />
                État de la flotte
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                    <Truck className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Véhicules</p>
                    <p className="text-xs text-muted-foreground">{activeVehicles} actif(s)</p>
                  </div>
                </div>
                <p className="text-2xl font-bold">{vehicles.length}</p>
              </div>
              
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
                    <Container className="w-5 h-5 text-orange-500" />
                  </div>
                  <div>
                    <p className="font-medium">Remorques</p>
                    <p className="text-xs text-muted-foreground">{activeTrailers} active(s)</p>
                  </div>
                </div>
                <p className="text-2xl font-bold">{trailers.length}</p>
              </div>
              
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                    <Users className="w-5 h-5 text-cyan-500" />
                  </div>
                  <div>
                    <p className="font-medium">Conducteurs</p>
                    <p className="text-xs text-muted-foreground">Configurés</p>
                  </div>
                </div>
                <p className="text-2xl font-bold">{drivers.length}</p>
              </div>

              <Button variant="outline" className="w-full" onClick={() => navigate('/vehicles')}>
                Gérer la flotte
              </Button>
            </CardContent>
          </Card>
        );

      case 'quick-actions':
        return (
          <Card key={widgetId}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Plus className="w-5 h-5 text-primary" />
                Actions rapides
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button 
                variant="outline" 
                className="w-full justify-start" 
                onClick={() => navigate('/calculator')}
              >
                <Calculator className="w-4 h-4 mr-2" />
                Nouveau calcul de coût
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start" 
                onClick={() => navigate('/itinerary')}
              >
                <Route className="w-4 h-4 mr-2" />
                Calculer un itinéraire
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start" 
                onClick={() => navigate('/clients')}
              >
                <Building2 className="w-4 h-4 mr-2" />
                Ajouter un client
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start" 
                onClick={() => navigate('/vehicles')}
              >
                <Truck className="w-4 h-4 mr-2" />
                Ajouter un véhicule
              </Button>
            </CardContent>
          </Card>
        );

      case 'profitability':
        return (
          <Card key={widgetId}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <TrendingUp className="w-5 h-5 text-primary" />
                Indicateurs clés
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm text-muted-foreground">Clients</span>
                  <span className="font-medium">{clients.length}</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary rounded-full" 
                    style={{ width: `${Math.min(clients.length * 10, 100)}%` }}
                  />
                </div>
              </div>
              
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm text-muted-foreground">Charges fixes</span>
                  <span className="font-medium">{charges.length}</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-amber-500 rounded-full" 
                    style={{ width: `${Math.min(charges.length * 10, 100)}%` }}
                  />
                </div>
              </div>
              
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm text-muted-foreground">Tournées favorites</span>
                  <span className="font-medium">{tours.filter(t => t.is_favorite).length}</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-green-500 rounded-full" 
                    style={{ width: `${tours.length > 0 ? (tours.filter(t => t.is_favorite).length / tours.length) * 100 : 0}%` }}
                  />
                </div>
              </div>

              <div className="pt-2 border-t">
                <p className="text-sm text-muted-foreground mb-1">Plan actuel</p>
                <Badge variant="secondary" className="capitalize">{planType || 'Gratuit'}</Badge>
              </div>
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Bienvenue sur OptiFlow
          </h1>
          <p className="text-muted-foreground mt-1">
            {settings.companyName || 'Votre tableau de bord personnalisé'}
          </p>
        </div>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => setConfig(prev => ({ ...prev, showCustomization: !prev.showCustomization }))}
        >
          <Settings2 className="w-4 h-4 mr-2" />
          Personnaliser
        </Button>
      </div>

      {/* Customization Panel */}
      {config.showCustomization && (
        <Card className="border-primary/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Settings2 className="w-5 h-5" />
              Personnalisation du tableau de bord
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {config.widgets.map((widget) => (
                <div key={widget.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <Label htmlFor={widget.id} className="cursor-pointer">
                    {widgetLabels[widget.id]}
                  </Label>
                  <Switch
                    id={widget.id}
                    checked={widget.enabled}
                    onCheckedChange={() => toggleWidget(widget.id)}
                  />
                </div>
              ))}
            </div>
            <div className="mt-4 flex justify-end">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setConfig(prev => ({ ...prev, showCustomization: false }))}
              >
                Fermer
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Widgets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {enabledWidgets.map(widget => renderWidget(widget.id))}
      </div>
    </div>
  );
}