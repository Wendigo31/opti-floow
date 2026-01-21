import { useState, useEffect, useMemo } from 'react';
import { Euro, Gauge, BarChart3, FileDown, Image, FileSpreadsheet, Banknote, PiggyBank, Sparkles, Filter, X } from 'lucide-react';
import { StatCard } from '@/components/dashboard/StatCard';
import { CostChart } from '@/components/dashboard/CostChart';
import { useApp } from '@/context/AppContext';
import { useCalculations } from '@/hooks/useCalculations';
import { useClients } from '@/hooks/useClients';
import { useSavedTours } from '@/hooks/useSavedTours';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { exportForecastPDF } from '@/utils/pdfExport';
import { PDFExportDialog, ExportOptions } from '@/components/export/PDFExportDialog';
import { cn } from '@/lib/utils';
import html2canvas from 'html2canvas';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useLicense } from '@/hooks/useLicense';
import { useLanguage } from '@/i18n/LanguageContext';
import AIAnalysisPanel from '@/components/dashboard/AIAnalysisPanel';
import { FeatureGate } from '@/components/license/FeatureGate';

type ChartType = 'pie' | 'donut' | 'bar' | 'radial';

interface StoredRoute {
  originAddress: string;
  destinationAddress: string;
  coordinates: [number, number][];
  markers: { position: [number, number]; label: string; type: 'start' | 'end' | 'stop' }[];
}

export default function Dashboard() {
  const { t } = useLanguage();
  const { trip, vehicle, drivers, selectedDriverIds, charges, settings } = useApp();
  const { hasFeature } = useLicense();
  const { clients, loading: clientsLoading } = useClients();
  const { tours, loading: toursLoading } = useSavedTours();
  
  const [chartType, setChartType] = useState<ChartType>('donut');
  const [forecastMonths] = useState(6);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [lastRoute] = useLocalStorage<StoredRoute | null>('last-calculated-route', null);
  
  // Filter state
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedTourId, setSelectedTourId] = useState<string | null>(null);
  
  // Get filtered tours based on selected client
  const filteredTours = useMemo(() => {
    if (!selectedClientId) return tours;
    return tours.filter(tour => tour.client_id === selectedClientId);
  }, [tours, selectedClientId]);
  
  // Get selected tour data
  const selectedTour = useMemo(() => {
    if (!selectedTourId) return null;
    return tours.find(t => t.id === selectedTourId) || null;
  }, [tours, selectedTourId]);
  
  // Use tour data if selected, otherwise use current trip data
  const analysisData = useMemo(() => {
    if (selectedTour) {
      const distance = Number(selectedTour.distance_km) || 0;
      const totalCost = Number(selectedTour.total_cost) || 0;
      const targetMargin = Number(selectedTour.target_margin) || 15;
      const suggestedPrice = totalCost * (1 + targetMargin / 100);
      
      return {
        distance,
        tollCost: Number(selectedTour.toll_cost) || 0,
        fuel: Number(selectedTour.fuel_cost) || 0,
        adBlue: Number(selectedTour.adblue_cost) || 0,
        driverCost: Number(selectedTour.driver_cost) || 0,
        structureCost: Number(selectedTour.structure_cost) || 0,
        vehicleCost: Number(selectedTour.vehicle_cost) || 0,
        totalCost,
        revenue: Number(selectedTour.revenue) || 0,
        profit: Number(selectedTour.profit) || 0,
        profitMargin: Number(selectedTour.profit_margin) || 0,
        costPerKm: distance > 0 ? totalCost / distance : 0,
        suggestedPrice,
        suggestedPricePerKm: distance > 0 ? suggestedPrice / distance : 0,
        tolls: Number(selectedTour.toll_cost) || 0,
        pricingMode: selectedTour.pricing_mode || 'km',
        targetMargin,
      };
    }
    return null;
  }, [selectedTour]);
  
  // Reset tour selection when client changes
  useEffect(() => {
    if (selectedClientId && selectedTourId) {
      const tourExists = filteredTours.some(t => t.id === selectedTourId);
      if (!tourExists) {
        setSelectedTourId(null);
      }
    }
  }, [selectedClientId, selectedTourId, filteredTours]);
  
  const selectedDrivers = drivers.filter(d => selectedDriverIds.includes(d.id));
  const costs = useCalculations(trip, vehicle, selectedDrivers, charges, settings);
  
  // Use either tour data or calculated costs
  const displayCosts = analysisData || costs;

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value);

  // Forecast calculations
  const getMonthlyForecast = () => {
    const tripsPerMonth = settings.workingDaysPerMonth;
    
    const monthlyFuel = costs.fuel * tripsPerMonth;
    const monthlyAdBlue = costs.adBlue * tripsPerMonth;
    const monthlyTolls = costs.tolls * tripsPerMonth;
    const monthlyRevenue = costs.revenue * tripsPerMonth;
    
    const monthlyStructure = charges.reduce((total, charge) => {
      const tvaRate = settings.tvaRate || 20;
      const amountHT = charge.isHT ? charge.amount : charge.amount / (1 + tvaRate / 100);
      switch (charge.periodicity) {
        case 'yearly': return total + amountHT / 12;
        case 'monthly': return total + amountHT;
        case 'daily': return total + amountHT * settings.workingDaysPerMonth;
      }
    }, 0);
    
    let monthlyDriver = 0;
    for (const driver of selectedDrivers) {
      const monthlySalary = driver.baseSalary * (1 + driver.patronalCharges / 100);
      monthlyDriver += monthlySalary;
    }
    
    const totalCost = monthlyFuel + monthlyAdBlue + monthlyTolls + monthlyStructure + monthlyDriver;
    const profit = monthlyRevenue - totalCost;
    
    return {
      tripsPerMonth,
      fuel: monthlyFuel,
      adBlue: monthlyAdBlue,
      tolls: monthlyTolls,
      structure: monthlyStructure,
      driver: monthlyDriver,
      totalCost,
      revenue: monthlyRevenue,
      profit,
    };
  };

  const monthlyForecast = getMonthlyForecast();

  const generateDetailedForecast = () => {
    const months = [];
    const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
    const currentMonth = new Date().getMonth();
    
    let cumulativeCost = 0;
    let cumulativeRevenue = 0;
    let cumulativeProfit = 0;
    
    for (let i = 0; i < forecastMonths; i++) {
      const monthIndex = (currentMonth + i) % 12;
      cumulativeCost += monthlyForecast.totalCost;
      cumulativeRevenue += monthlyForecast.revenue;
      cumulativeProfit += monthlyForecast.profit;
      
      months.push({
        name: monthNames[monthIndex],
        fuel: monthlyForecast.fuel,
        adBlue: monthlyForecast.adBlue,
        tolls: monthlyForecast.tolls,
        structure: monthlyForecast.structure,
        driver: monthlyForecast.driver,
        total: monthlyForecast.totalCost,
        revenue: monthlyForecast.revenue,
        profit: monthlyForecast.profit,
        cumulative: cumulativeCost,
        cumulativeRevenue,
        cumulativeProfit,
        trips: Math.round(monthlyForecast.tripsPerMonth),
      });
    }
    
    return months;
  };

  const detailedForecast = generateDetailedForecast();

  const handleExportPDF = (options: ExportOptions) => {
    exportForecastPDF({
      companyName: settings.companyName,
      trip,
      vehicle,
      costs,
      selectedDriverNames: selectedDrivers.map(d => d.name),
      forecast: detailedForecast,
      forecastMonths,
      monthlyTotalCost: monthlyForecast.totalCost,
      tripsPerMonth: monthlyForecast.tripsPerMonth,
      exportOptions: options,
      originAddress: lastRoute?.originAddress,
      destinationAddress: lastRoute?.destinationAddress,
    });
    setShowExportDialog(false);
  };

  const handleExportImage = async () => {
    const element = document.getElementById('dashboard-content');
    if (element) {
      const canvas = await html2canvas(element, { backgroundColor: '#1a1a2e' });
      const link = document.createElement('a');
      link.download = `analyse_${new Date().toISOString().split('T')[0]}.png`;
      link.href = canvas.toDataURL();
      link.click();
    }
  };

  const handleExportExcel = () => {
    // CSV export for Excel compatibility
    const headers = ['Mois', 'Trajets', 'Gazole', 'AdBlue', 'Péages', 'Structure', 'Conducteur', 'Total Coûts', 'CA', 'Bénéfice'];
    const rows = detailedForecast.map(m => [
      m.name, m.trips, m.fuel.toFixed(2), m.adBlue.toFixed(2), m.tolls.toFixed(2),
      m.structure.toFixed(2), m.driver.toFixed(2), m.total.toFixed(2), m.revenue.toFixed(2), m.profit.toFixed(2)
    ]);
    
    const csv = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `previsionnel_${forecastMonths}mois_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  // Clear filters
  const clearFilters = () => {
    setSelectedClientId(null);
    setSelectedTourId(null);
  };
  
  const hasActiveFilters = selectedClientId || selectedTourId;

  return (
    <div className="space-y-6" id="dashboard-content">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t.dashboard.title}</h1>
          <p className="text-muted-foreground mt-1">{t.dashboard.subtitle}</p>
        </div>
        <div className="flex items-center gap-3">
          <FeatureGate feature="btn_export_pdf" showLockedIndicator={false}>
            <Button onClick={() => setShowExportDialog(true)} variant="outline" size="sm" className="gap-2">
              <FileDown className="w-4 h-4" />
              PDF
            </Button>
          </FeatureGate>
          <FeatureGate feature="btn_export_excel" showLockedIndicator={false}>
            <Button 
              onClick={handleExportExcel} 
              variant="outline" size="sm" 
              className="gap-2"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Excel
            </Button>
          </FeatureGate>
          <Button onClick={handleExportImage} variant="outline" size="sm" className="gap-2">
            <Image className="w-4 h-4" />
            Image
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-card p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">Filtres</span>
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
          
          {/* Tour Filter */}
          <div className="flex-1 min-w-[200px] max-w-[300px]">
            <Select
              value={selectedTourId || ""}
              onValueChange={(value) => setSelectedTourId(value || null)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Sélectionner une tournée" />
              </SelectTrigger>
              <SelectContent>
                {filteredTours.map((tour) => (
                  <SelectItem key={tour.id} value={tour.id}>
                    {tour.name} ({Number(tour.distance_km).toFixed(0)} km)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Active filters badges + clear */}
          {hasActiveFilters && (
            <div className="flex items-center gap-2">
              {selectedClientId && (
                <Badge variant="secondary" className="gap-1">
                  Client: {clients.find(c => c.id === selectedClientId)?.company || clients.find(c => c.id === selectedClientId)?.name}
                  <X 
                    className="w-3 h-3 cursor-pointer hover:text-destructive" 
                    onClick={() => setSelectedClientId(null)}
                  />
                </Badge>
              )}
              {selectedTourId && (
                <Badge variant="secondary" className="gap-1">
                  Tournée: {tours.find(t => t.id === selectedTourId)?.name}
                  <X 
                    className="w-3 h-3 cursor-pointer hover:text-destructive" 
                    onClick={() => setSelectedTourId(null)}
                  />
                </Badge>
              )}
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground hover:text-destructive">
                Effacer tout
              </Button>
            </div>
          )}
        </div>
        
        {/* Tour info when selected */}
        {selectedTour && (
          <div className="mt-4 pt-4 border-t border-border/50">
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <span className="text-muted-foreground">
                <strong className="text-foreground">{selectedTour.origin_address}</strong>
                {' → '}
                <strong className="text-foreground">{selectedTour.destination_address}</strong>
              </span>
              <Badge variant="outline">{Number(selectedTour.distance_km).toFixed(0)} km</Badge>
              {selectedTour.client_id && (
                <Badge variant="outline">
                  Client: {clients.find(c => c.id === selectedTour.client_id)?.company || clients.find(c => c.id === selectedTour.client_id)?.name}
                </Badge>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Tabs for Analysis and AI */}
      <Tabs defaultValue="analysis" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="analysis" className="gap-2">
            <BarChart3 className="w-4 h-4" />
            Analyse
          </TabsTrigger>
          <TabsTrigger value="ai" className="gap-2">
            <Sparkles className="w-4 h-4" />
            Analyse par IA
          </TabsTrigger>
        </TabsList>

        <TabsContent value="analysis" className="space-y-6 mt-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            <StatCard title="Coût Total HT" value={formatCurrency(displayCosts.totalCost)} subtitle="Coût de revient" icon={<Euro className="w-6 h-6" />} variant="default" delay={100} />
            <StatCard title="Chiffre d'Affaires" value={formatCurrency(displayCosts.revenue)} subtitle={selectedTour ? selectedTour.pricing_mode || 'Prix au km' : (trip.pricingMode === 'auto' ? 'Marge auto' : trip.pricingMode === 'km' ? 'Prix au km' : 'Forfait')} icon={<Banknote className="w-6 h-6" />} variant="default" delay={200} />
            <StatCard title="Bénéfice" value={formatCurrency(displayCosts.profit)} subtitle={`${displayCosts.profitMargin.toFixed(1)}% de marge`} icon={<PiggyBank className="w-6 h-6" />} variant={displayCosts.profit >= 0 ? 'success' : 'danger'} trend={displayCosts.profit >= 0 ? 'up' : 'down'} trendValue={`${displayCosts.profit >= 0 ? '+' : ''}${displayCosts.profitMargin.toFixed(1)}%`} delay={300} />
            <StatCard title="Coût au Kilomètre" value={`${displayCosts.costPerKm.toFixed(3)} €`} subtitle={`Pour ${selectedTour ? Number(selectedTour.distance_km).toFixed(0) : trip.distance} km`} icon={<Gauge className="w-6 h-6" />} variant="default" delay={400} />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <CostChart costs={displayCosts} chartType={chartType} onChartTypeChange={setChartType} />
            <div className="glass-card p-6">
              <div className="flex items-center gap-3 mb-4">
                <BarChart3 className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-semibold text-foreground">Tarification (HT)</h3>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-center py-3 border-b border-border/50">
                  <span className="text-muted-foreground">Chiffre d'affaires</span>
                  <span className="text-xl font-bold text-primary">{formatCurrency(displayCosts.revenue)}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-border/50">
                  <span className="text-muted-foreground">Coût de revient</span>
                  <span className="text-lg font-medium text-foreground">{formatCurrency(displayCosts.totalCost)}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-border/50">
                  <span className="text-muted-foreground">Bénéfice</span>
                  <span className={cn("text-xl font-bold", displayCosts.profit >= 0 ? "text-success" : "text-destructive")}>{formatCurrency(displayCosts.profit)}</span>
                </div>
                <div className="flex justify-between items-center py-3">
                  <span className="text-muted-foreground">Prix suggéré (marge {selectedTour ? Number(selectedTour.target_margin) : trip.targetMargin}%)</span>
                  <span className="text-lg font-medium text-success">{formatCurrency(displayCosts.suggestedPrice)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Cost Details */}
          <div className="glass-card p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Détail des Coûts (HT)</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {[
                { label: 'Gazole', value: displayCosts.fuel, color: 'text-primary' },
                { label: 'AdBlue', value: displayCosts.adBlue, color: 'text-success' },
                { label: 'Péages', value: displayCosts.tolls, color: 'text-warning' },
                { label: 'Conducteur', value: displayCosts.driverCost, color: 'text-purple-400' },
                { label: 'Structure', value: displayCosts.structureCost, color: 'text-destructive' },
              ].map((item) => (
                <div key={item.label} className="text-center p-4 rounded-lg bg-muted/30">
                  <p className="text-sm text-muted-foreground mb-1">{item.label}</p>
                  <p className={`text-xl font-bold ${item.color}`}>{formatCurrency(item.value)}</p>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="ai" className="mt-6">
          <FeatureGate 
            feature="ai_optimization" 
            mode="blur"
            showUpgradePrompt={true}
          >
            <AIAnalysisPanel />
          </FeatureGate>
        </TabsContent>
      </Tabs>

      <PDFExportDialog open={showExportDialog} onClose={() => setShowExportDialog(false)} onExport={handleExportPDF} routeCoordinates={lastRoute?.coordinates || []} markers={lastRoute?.markers || []} />
    </div>
  );
}
