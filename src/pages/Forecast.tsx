import { useState, useMemo, useCallback } from 'react';
import { TrendingUp, Calendar, Download, Filter, BarChart3, Truck, Building2, CalendarDays, Edit3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { useApp } from '@/context/AppContext';
import { useCalculations } from '@/hooks/useCalculations';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { FeatureGate, LockedButton } from '@/components/license/FeatureGate';
import { cn } from '@/lib/utils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { LocalClient } from '@/types/local';
import type { FixedCharge } from '@/types';
import { useLanguage } from '@/i18n/LanguageContext';

type PeriodType = '3' | '6' | '12';

interface ForecastData {
  month: string;
  monthIndex: number;
  revenue: number;
  costs: number;
  profit: number;
  margin: number;
  trips: number;
  distance: number;
}

// Default working days per month (customizable)
interface MonthlyWorkingDays {
  [key: number]: number; // monthIndex -> working days
}

export default function Forecast() {
  const { t } = useLanguage();
  const { trip, vehicle, drivers, selectedDriverIds, charges, settings } = useApp();
  const [clients] = useLocalStorage<LocalClient[]>('optiflow_clients', []);
  const selectedDrivers = drivers.filter(d => selectedDriverIds.includes(d.id));
  const costs = useCalculations(trip, vehicle, selectedDrivers, charges, settings);

  const [period, setPeriod] = useState<PeriodType>('3');
  const [filterClient, setFilterClient] = useState<string>('all');
  
  // Custom working days per month
  const [useCustomDays, setUseCustomDays] = useState(false);
  const [customWorkingDays, setCustomWorkingDays] = useLocalStorage<MonthlyWorkingDays>('optiflow_forecast_custom_days', {});
  
  // Default from settings
  const defaultWorkingDays = settings.workingDaysPerMonth;
  
  // Charge selection
  const [selectedChargeIds, setSelectedChargeIds] = useState<string[]>(charges.map(c => c.id));
  const [showChargeFilter, setShowChargeFilter] = useState(false);

  // Keep selected charges in sync when charges are updated
  useMemo(() => {
    // Add any new charges that aren't already selected
    const existingIds = new Set(selectedChargeIds);
    const allChargeIds = new Set(charges.map(c => c.id));
    
    // Remove deleted charges from selection
    const validSelections = selectedChargeIds.filter(id => allChargeIds.has(id));
    
    // Add new charges that appeared
    const newCharges = charges.filter(c => !existingIds.has(c.id));
    if (newCharges.length > 0 || validSelections.length !== selectedChargeIds.length) {
      setSelectedChargeIds([...validSelections, ...newCharges.map(c => c.id)]);
    }
  }, [charges]);

  // Filter charges for calculation
  const filteredCharges = useMemo(() => {
    return charges.filter(c => selectedChargeIds.includes(c.id));
  }, [charges, selectedChargeIds]);

  // Recalculate costs with filtered charges
  const filteredCosts = useCalculations(trip, vehicle, selectedDrivers, filteredCharges, settings);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value);

  const months = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 
                  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
  
  const currentMonth = new Date().getMonth();

  // Get working days for a specific month
  const getWorkingDays = useCallback((monthIndex: number): number => {
    if (useCustomDays && customWorkingDays[monthIndex] !== undefined) {
      return customWorkingDays[monthIndex];
    }
    return defaultWorkingDays;
  }, [useCustomDays, customWorkingDays, defaultWorkingDays]);

  // Update custom working days for a month
  const updateWorkingDays = useCallback((monthIndex: number, days: number) => {
    setCustomWorkingDays(prev => ({
      ...prev,
      [monthIndex]: Math.max(0, Math.min(31, days))
    }));
  }, [setCustomWorkingDays]);

  const forecastData = useMemo((): ForecastData[] => {
    const periodNum = parseInt(period);
    const data: ForecastData[] = [];
    
    for (let i = 0; i < periodNum; i++) {
      const monthIndex = (currentMonth + i) % 12;
      const monthlyTrips = getWorkingDays(monthIndex);
      const monthlyRevenue = filteredCosts.revenue * monthlyTrips;
      const monthlyCosts = filteredCosts.totalCost * monthlyTrips;
      const monthlyProfit = monthlyRevenue - monthlyCosts;
      const margin = monthlyRevenue > 0 ? (monthlyProfit / monthlyRevenue) * 100 : 0;
      
      data.push({
        month: months[monthIndex],
        monthIndex,
        revenue: monthlyRevenue,
        costs: monthlyCosts,
        profit: monthlyProfit,
        margin,
        trips: monthlyTrips,
        distance: trip.distance * monthlyTrips,
      });
    }
    
    return data;
  }, [period, getWorkingDays, filteredCosts, trip.distance, currentMonth]);

  const totals = useMemo(() => {
    return forecastData.reduce((acc, month) => ({
      revenue: acc.revenue + month.revenue,
      costs: acc.costs + month.costs,
      profit: acc.profit + month.profit,
      trips: acc.trips + month.trips,
      distance: acc.distance + month.distance,
    }), { revenue: 0, costs: 0, profit: 0, trips: 0, distance: 0 });
  }, [forecastData]);

  const avgMargin = totals.revenue > 0 ? (totals.profit / totals.revenue) * 100 : 0;

  const toggleCharge = (chargeId: string) => {
    setSelectedChargeIds(prev => 
      prev.includes(chargeId) 
        ? prev.filter(id => id !== chargeId)
        : [...prev, chargeId]
    );
  };

  const selectAllCharges = () => {
    setSelectedChargeIds(charges.map(c => c.id));
  };

  const deselectAllCharges = () => {
    setSelectedChargeIds([]);
  };

  const exportToPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    
    // Watermark
    doc.setFontSize(60);
    doc.setTextColor(230, 230, 230);
    doc.text('OptiFlow', doc.internal.pageSize.width / 2, doc.internal.pageSize.height / 2, {
      align: 'center',
      angle: 45,
    });
    doc.setTextColor(0, 0, 0);

    // Title
    doc.setFontSize(20);
    doc.text(`Prévisionnel ${period} mois`, 14, 22);
    
    doc.setFontSize(10);
    doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')}`, 14, 30);
    doc.text(`${useCustomDays ? 'Jours personnalisés par mois' : defaultWorkingDays + ' trajets/mois'}`, 14, 36);
    doc.text(`${selectedChargeIds.length}/${charges.length} charges incluses`, 14, 42);

    // Table
    autoTable(doc, {
      startY: 50,
      head: [['Mois', 'Trajets', 'Distance (km)', 'CA', 'Coûts', 'Bénéfice', 'Marge']],
      body: forecastData.map(row => [
        row.month,
        row.trips.toString(),
        row.distance.toLocaleString('fr-FR'),
        formatCurrency(row.revenue),
        formatCurrency(row.costs),
        formatCurrency(row.profit),
        `${row.margin.toFixed(1)}%`,
      ]),
      foot: [[
        'TOTAL',
        totals.trips.toString(),
        totals.distance.toLocaleString('fr-FR'),
        formatCurrency(totals.revenue),
        formatCurrency(totals.costs),
        formatCurrency(totals.profit),
        `${avgMargin.toFixed(1)}%`,
      ]],
      theme: 'grid',
      styles: { fontSize: 10 },
      headStyles: { fillColor: [45, 212, 191] },
      footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
    });

    doc.save(`previsionnel_${period}mois_${new Date().toISOString().slice(0,10)}.pdf`);
  };

  return (
    <FeatureGate feature="page_forecast">
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">{t.forecast.title}</h1>
            <p className="text-muted-foreground mt-1">
              {t.forecast.subtitle}
            </p>
          </div>
          <FeatureGate feature="btn_export_pdf" showLockedIndicator={false}>
            <Button onClick={exportToPDF} className="gap-2">
              <Download className="w-4 h-4" />
              {t.dashboard.exportPDF}
            </Button>
          </FeatureGate>
        </div>

        {/* Filters */}
        <div className="glass-card p-6 opacity-0 animate-slide-up" style={{ animationDelay: '100ms', animationFillMode: 'forwards' }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <Filter className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">Paramètres</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="space-y-2">
              <Label>Période</Label>
              <Select value={period} onValueChange={(v: PeriodType) => setPeriod(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3 mois</SelectItem>
                  <SelectItem value="6">6 mois</SelectItem>
                  <SelectItem value="12">12 mois</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Jours travaillés/mois</Label>
                <div className="flex items-center gap-2">
                  <Label htmlFor="custom-days" className="text-xs text-muted-foreground">Personnaliser</Label>
                  <Switch 
                    id="custom-days"
                    checked={useCustomDays} 
                    onCheckedChange={setUseCustomDays}
                  />
                </div>
              </div>
              {!useCustomDays ? (
                <div className="flex items-center gap-2 h-10 px-3 rounded-md border border-input bg-background text-sm">
                  <CalendarDays className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">{defaultWorkingDays} jours</span>
                  <span className="text-xs text-muted-foreground">(depuis Calculateur)</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 h-10 px-3 rounded-md border border-primary/50 bg-primary/5 text-sm">
                  <Edit3 className="w-4 h-4 text-primary" />
                  <span className="font-medium text-primary">Édition par mois</span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Client</Label>
              <Select value={filterClient} onValueChange={setFilterClient}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les clients</SelectItem>
                  {clients.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Charges</Label>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowChargeFilter(!showChargeFilter)}
                  className="w-full justify-between"
                >
                  <span>{selectedChargeIds.length}/{charges.length} charges</span>
                  <Building2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Charge Filter Panel */}
          {showChargeFilter && (
            <div className="mt-4 p-4 bg-muted/30 rounded-lg border border-border">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-foreground">Sélectionner les charges à inclure</span>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={selectAllCharges}>Tout</Button>
                  <Button variant="ghost" size="sm" onClick={deselectAllCharges}>Aucun</Button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                {charges.map(charge => (
                  <div 
                    key={charge.id} 
                    className="flex items-center gap-2 p-2 rounded hover:bg-muted/50 cursor-pointer"
                    onClick={() => toggleCharge(charge.id)}
                  >
                    <Checkbox 
                      checked={selectedChargeIds.includes(charge.id)}
                      onCheckedChange={() => toggleCharge(charge.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm truncate block">{charge.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {charge.amount.toFixed(2)}€/{charge.periodicity === 'daily' ? 'jour' : charge.periodicity === 'monthly' ? 'mois' : 'an'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="glass-card p-4 opacity-0 animate-slide-up" style={{ animationDelay: '150ms', animationFillMode: 'forwards' }}>
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <TrendingUp className="w-4 h-4" />
              <span className="text-sm">CA Prévisionnel</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{formatCurrency(totals.revenue)}</p>
          </div>
          
          <div className="glass-card p-4 opacity-0 animate-slide-up" style={{ animationDelay: '200ms', animationFillMode: 'forwards' }}>
            <div className="flex items-center gap-2 text-destructive mb-1">
              <BarChart3 className="w-4 h-4" />
              <span className="text-sm">Coûts</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{formatCurrency(totals.costs)}</p>
          </div>
          
          <div className="glass-card p-4 opacity-0 animate-slide-up" style={{ animationDelay: '250ms', animationFillMode: 'forwards' }}>
            <div className={cn("flex items-center gap-2 mb-1", totals.profit >= 0 ? "text-success" : "text-destructive")}>
              <TrendingUp className="w-4 h-4" />
              <span className="text-sm">Bénéfice</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{formatCurrency(totals.profit)}</p>
          </div>
          
          <div className="glass-card p-4 opacity-0 animate-slide-up" style={{ animationDelay: '300ms', animationFillMode: 'forwards' }}>
            <div className="flex items-center gap-2 text-primary mb-1">
              <Truck className="w-4 h-4" />
              <span className="text-sm">Distance totale</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{totals.distance.toLocaleString('fr-FR')} km</p>
          </div>
        </div>

        {/* Forecast Table */}
        <div className="glass-card p-6 opacity-0 animate-slide-up" style={{ animationDelay: '350ms', animationFillMode: 'forwards' }}>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-success/20 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-success" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">Détail mensuel</h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Mois</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground">
                    {useCustomDays ? 'Jours (éditable)' : 'Trajets'}
                  </th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground">Distance</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground">CA</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground">Coûts</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground">Bénéfice</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground">Marge</th>
                </tr>
              </thead>
              <tbody>
                {forecastData.map((row, index) => (
                  <tr key={row.month} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4 font-medium text-foreground">{row.month}</td>
                    <td className="py-2 px-4 text-right text-foreground">
                      {useCustomDays ? (
                        <Input
                          type="number"
                          min={0}
                          max={31}
                          value={customWorkingDays[row.monthIndex] ?? defaultWorkingDays}
                          onChange={(e) => updateWorkingDays(row.monthIndex, parseInt(e.target.value) || 0)}
                          className="w-16 h-8 text-right ml-auto"
                        />
                      ) : (
                        row.trips
                      )}
                    </td>
                    <td className="py-3 px-4 text-right text-foreground">{row.distance.toLocaleString('fr-FR')} km</td>
                    <td className="py-3 px-4 text-right text-foreground">{formatCurrency(row.revenue)}</td>
                    <td className="py-3 px-4 text-right text-foreground">{formatCurrency(row.costs)}</td>
                    <td className={cn("py-3 px-4 text-right font-medium", row.profit >= 0 ? "text-success" : "text-destructive")}>
                      {formatCurrency(row.profit)}
                    </td>
                    <td className={cn("py-3 px-4 text-right", row.margin >= 15 ? "text-success" : row.margin >= 5 ? "text-warning" : "text-destructive")}>
                      {row.margin.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-muted/50 font-bold">
                  <td className="py-3 px-4 text-foreground">TOTAL</td>
                  <td className="py-3 px-4 text-right text-foreground">{totals.trips}</td>
                  <td className="py-3 px-4 text-right text-foreground">{totals.distance.toLocaleString('fr-FR')} km</td>
                  <td className="py-3 px-4 text-right text-foreground">{formatCurrency(totals.revenue)}</td>
                  <td className="py-3 px-4 text-right text-foreground">{formatCurrency(totals.costs)}</td>
                  <td className={cn("py-3 px-4 text-right", totals.profit >= 0 ? "text-success" : "text-destructive")}>
                    {formatCurrency(totals.profit)}
                  </td>
                  <td className={cn("py-3 px-4 text-right", avgMargin >= 15 ? "text-success" : avgMargin >= 5 ? "text-warning" : "text-destructive")}>
                    {avgMargin.toFixed(1)}%
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </FeatureGate>
  );
}
