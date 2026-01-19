import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Building2, Mail, Phone, MapPin, Route, 
  Calculator, History, Receipt, Trash2, Calendar,
  TrendingUp, TrendingDown, Fuel, ReceiptText, Users, Truck, Droplet, Landmark,
  FileDown, Copy, Edit3, RefreshCw, Euro
} from 'lucide-react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/hooks/use-toast';
import type { LocalClient, LocalClientReport, LocalTrip, LocalQuote } from '@/types/local';
import { generateId } from '@/types/local';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ClientDetailDialogProps {
  client: LocalClient | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ClientDetailDialog({ client, open, onOpenChange }: ClientDetailDialogProps) {
  const { drivers, vehicle, selectedDriverIds, charges, settings } = useApp();
  const { toast } = useToast();
  const [reports, setReports] = useLocalStorage<LocalClientReport[]>('optiflow_client_reports', []);
  const [clients] = useLocalStorage<LocalClient[]>('optiflow_clients', []);
  const [trips] = useLocalStorage<LocalTrip[]>('optiflow_trips', []);
  const [quotes] = useLocalStorage<LocalQuote[]>('optiflow_quotes', []);

  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingReport, setEditingReport] = useState<LocalClientReport | null>(null);
  const [editFormData, setEditFormData] = useState({
    title: '',
    selectedDriverIds: [] as string[],
    revenue: 0,
  });

  // Duplicate dialog state
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [duplicatingReport, setDuplicatingReport] = useState<LocalClientReport | null>(null);
  const [duplicateTargetClientId, setDuplicateTargetClientId] = useState('');

  if (!client) return null;

  const clientReports = reports.filter(r => r.client_id === client.id);
  const clientTrips = trips.filter(t => t.client_id === client.id);
  const clientQuotes = quotes.filter(q => q.client_id === client.id);

  const itineraryReports = clientReports.filter(r => r.report_type === 'itinerary');
  const costAnalysisReports = clientReports.filter(r => r.report_type === 'cost_analysis');

  const handleDeleteReport = (reportId: string) => {
    if (!confirm('Supprimer ce rapport ?')) return;
    setReports(prev => prev.filter(r => r.id !== reportId));
  };

  // Recalculate costs using current vehicle parameters
  const handleRecalculateCosts = (report: LocalClientReport) => {
    if (!report.data.distance_km) {
      toast({ title: "Impossible de recalculer", description: "Distance non définie", variant: "destructive" });
      return;
    }

    const distance = report.data.distance_km;
    const tvaRate = settings.tvaRate || 20;

    // Convert prices to HT if needed
    const fuelPriceHT = vehicle.fuelPriceIsHT ? vehicle.fuelPriceHT : vehicle.fuelPriceHT / (1 + tvaRate / 100);
    const adBluePriceHT = vehicle.adBluePriceIsHT ? vehicle.adBluePriceHT : vehicle.adBluePriceHT / (1 + tvaRate / 100);

    // Calculate fuel cost
    const fuelCost = (distance / 100) * vehicle.fuelConsumption * fuelPriceHT;
    
    // Calculate AdBlue cost
    const adBlueCost = (distance / 100) * vehicle.adBlueConsumption * adBluePriceHT;

    // Calculate driver cost - use report's drivers or current selection
    const driverIdsToUse = report.data.driver_ids || selectedDriverIds;
    const selectedDriversForCalc = drivers.filter(d => driverIdsToUse.includes(d.id));
    
    let driverCost = 0;
    for (const driver of selectedDriversForCalc) {
      const monthlyEmployerCost = driver.baseSalary * (1 + driver.patronalCharges / 100);
      const dailyRate = monthlyEmployerCost / driver.workingDaysPerMonth;
      driverCost += dailyRate;
    }

    // Calculate structure cost
    const dailyCharges = charges.reduce((total, charge) => {
      const amountHT = charge.isHT ? charge.amount : charge.amount / (1 + tvaRate / 100);
      let dailyAmount = 0;
      switch (charge.periodicity) {
        case 'yearly':
          dailyAmount = amountHT / settings.workingDaysPerYear;
          break;
        case 'monthly':
          dailyAmount = amountHT / settings.workingDaysPerMonth;
          break;
        case 'daily':
          dailyAmount = amountHT;
          break;
      }
      return total + dailyAmount;
    }, 0);

    // Keep original toll cost
    const tollCost = report.data.toll_cost || 0;

    // Total cost
    const totalCost = fuelCost + adBlueCost + tollCost + driverCost + dailyCharges;

    // Update the report
    setReports(prev => prev.map(r => 
      r.id === report.id 
        ? {
            ...r,
            data: {
              ...r.data,
              fuel_cost: fuelCost,
              adblue_cost: adBlueCost,
              driver_cost: driverCost,
              structure_cost: dailyCharges,
              total_cost: totalCost,
              vehicle: {
                fuelConsumption: vehicle.fuelConsumption,
                fuelPriceHT: fuelPriceHT,
                adBlueConsumption: vehicle.adBlueConsumption,
                adBluePriceHT: adBluePriceHT,
              },
            }
          }
        : r
    ));

    toast({ 
      title: "Coûts recalculés", 
      description: `Nouveau total: ${new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(totalCost)}` 
    });
  };

  const getDriverNames = (driverIds: string[] | undefined): string => {
    if (!driverIds || driverIds.length === 0) return '';
    return driverIds
      .map(id => drivers.find(d => d.id === id)?.name)
      .filter(Boolean)
      .join(', ');
  };

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value);

  const formatDate = (date: string) => 
    format(new Date(date), 'dd MMM yyyy', { locale: fr });

  const formatDuration = (hours: number): string => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h${m.toString().padStart(2, '0')}`;
  };

  // Export PDF function
  const handleExportPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Header
    doc.setFontSize(18);
    doc.text(`Tournées - ${client.name}`, 14, 20);
    
    if (client.company) {
      doc.setFontSize(12);
      doc.setTextColor(100);
      doc.text(client.company, 14, 28);
    }
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Généré le ${format(new Date(), 'dd/MM/yyyy à HH:mm', { locale: fr })}`, 14, 36);
    
    let yPos = 45;

    if (itineraryReports.length === 0) {
      doc.setFontSize(12);
      doc.setTextColor(0);
      doc.text('Aucune tournée sauvegardée pour ce client.', 14, yPos);
    } else {
      itineraryReports.forEach((report, index) => {
        // Check if we need a new page
        if (yPos > 250) {
          doc.addPage();
          yPos = 20;
        }

        // Tournée title
        doc.setFontSize(14);
        doc.setTextColor(0);
        doc.text(`${index + 1}. ${report.title}`, 14, yPos);
        yPos += 6;

        doc.setFontSize(10);
        doc.setTextColor(80);
        doc.text(`Date: ${formatDate(report.created_at)} | Type: ${report.data.route_type === 'highway' ? 'Autoroute' : 'Nationale'}`, 14, yPos);
        yPos += 8;

        // Route info
        doc.setTextColor(0);
        doc.text(`Départ: ${report.data.origin_address || '-'}`, 14, yPos);
        yPos += 5;
        doc.text(`Arrivée: ${report.data.destination_address || '-'}`, 14, yPos);
        yPos += 8;

        // Costs table
        const tableData: (string | number)[][] = [];
        
        if (report.data.distance_km) {
          tableData.push(['Distance', `${report.data.distance_km} km`]);
        }
        if (report.data.duration_hours) {
          tableData.push(['Durée', formatDuration(report.data.duration_hours)]);
        }
        if (report.data.fuel_cost) {
          tableData.push(['Carburant', formatCurrency(report.data.fuel_cost)]);
        }
        if (report.data.toll_cost) {
          tableData.push(['Péages', formatCurrency(report.data.toll_cost)]);
        }
        if (report.data.adblue_cost !== undefined) {
          tableData.push(['AdBlue', formatCurrency(report.data.adblue_cost)]);
        }
        if (report.data.driver_cost !== undefined) {
          tableData.push(['Coût chauffeur', formatCurrency(report.data.driver_cost)]);
        }
        if (report.data.structure_cost !== undefined) {
          tableData.push(['Charges structure', formatCurrency(report.data.structure_cost)]);
        }
        if (report.data.total_cost) {
          tableData.push(['COÛT TOTAL', formatCurrency(report.data.total_cost)]);
        }
        if (report.data.revenue !== undefined && report.data.revenue > 0) {
          tableData.push(['Recette HT', formatCurrency(report.data.revenue)]);
        }
        if (report.data.profit !== undefined) {
          tableData.push(['BÉNÉFICE', `${formatCurrency(report.data.profit)} (${report.data.profit_margin?.toFixed(1) || 0}%)`]);
        }

        if (tableData.length > 0) {
          autoTable(doc, {
            startY: yPos,
            head: [['Élément', 'Valeur']],
            body: tableData,
            theme: 'striped',
            headStyles: { fillColor: [59, 130, 246] },
            margin: { left: 14, right: 14 },
            tableWidth: pageWidth - 28,
          });
          yPos = (doc as any).lastAutoTable.finalY + 10;
        }

        // Drivers if available
        const driverNames = getDriverNames(report.data.driver_ids);
        if (driverNames) {
          doc.setFontSize(10);
          doc.text(`Chauffeur(s): ${driverNames}`, 14, yPos);
          yPos += 8;
        }

        // Vehicle info if available
        if (report.data.vehicle) {
          doc.text(`Véhicule: ${report.data.vehicle.fuelConsumption}L/100km • ${report.data.vehicle.fuelPriceHT?.toFixed(3)}€/L`, 14, yPos);
          yPos += 8;
        }

        yPos += 5;
      });
    }

    // Save
    const fileName = `tournees_${client.name.replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
    doc.save(fileName);
    toast({ title: 'PDF exporté avec succès' });
  };

  // Edit handlers
  const handleOpenEdit = (report: LocalClientReport) => {
    setEditingReport(report);
    setEditFormData({
      title: report.title,
      selectedDriverIds: report.data.driver_ids || [],
      revenue: report.data.revenue || 0,
    });
    setEditDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (!editingReport) return;

    // Calculate profit if revenue is set
    const revenue = editFormData.revenue || 0;
    const totalCost = editingReport.data.total_cost || 0;
    const profit = revenue > 0 ? revenue - totalCost : undefined;
    const profitMargin = revenue > 0 ? (profit! / revenue) * 100 : undefined;

    setReports(prev => prev.map(r => 
      r.id === editingReport.id 
        ? {
            ...r,
            title: editFormData.title,
            data: {
              ...r.data,
              driver_ids: editFormData.selectedDriverIds.length > 0 ? editFormData.selectedDriverIds : undefined,
              revenue: revenue > 0 ? revenue : undefined,
              profit: profit,
              profit_margin: profitMargin,
            }
          }
        : r
    ));
    
    setEditDialogOpen(false);
    setEditingReport(null);
    toast({ title: 'Tournée mise à jour' });
  };

  const toggleDriverEdit = (driverId: string) => {
    setEditFormData(prev => ({
      ...prev,
      selectedDriverIds: prev.selectedDriverIds.includes(driverId)
        ? prev.selectedDriverIds.filter(id => id !== driverId)
        : [...prev.selectedDriverIds, driverId]
    }));
  };

  // Duplicate handlers
  const handleOpenDuplicate = (report: LocalClientReport) => {
    setDuplicatingReport(report);
    setDuplicateTargetClientId('');
    setDuplicateDialogOpen(true);
  };

  const handleConfirmDuplicate = () => {
    if (!duplicatingReport || !duplicateTargetClientId) return;

    const targetClient = clients.find(c => c.id === duplicateTargetClientId);
    if (!targetClient) return;

    const newReport: LocalClientReport = {
      ...duplicatingReport,
      id: generateId(),
      client_id: duplicateTargetClientId,
      created_at: new Date().toISOString(),
    };

    setReports(prev => [newReport, ...prev]);
    setDuplicateDialogOpen(false);
    setDuplicatingReport(null);
    toast({ title: `Tournée dupliquée pour ${targetClient.name}` });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Building2 className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <span className="text-xl">{client.name}</span>
                  {client.company && (
                    <span className="text-muted-foreground text-sm ml-2">({client.company})</span>
                  )}
                </div>
              </div>
              {itineraryReports.length > 0 && (
                <Button variant="outline" size="sm" onClick={handleExportPDF}>
                  <FileDown className="w-4 h-4 mr-2" />
                  Export PDF
                </Button>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-3 gap-2 mb-4 text-sm">
            {client.email && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="w-3 h-3" /> {client.email}
              </div>
            )}
            {client.phone && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="w-3 h-3" /> {client.phone}
              </div>
            )}
            {client.address && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="w-3 h-3" /> {client.city}
              </div>
            )}
          </div>

          <Tabs defaultValue="itineraries" className="flex-1">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="itineraries" className="flex items-center gap-1.5">
                <Route className="w-3.5 h-3.5" />
                Tournées ({itineraryReports.length})
              </TabsTrigger>
              <TabsTrigger value="analyses" className="flex items-center gap-1.5">
                <Calculator className="w-3.5 h-3.5" />
                Analyses ({costAnalysisReports.length})
              </TabsTrigger>
              <TabsTrigger value="trips" className="flex items-center gap-1.5">
                <History className="w-3.5 h-3.5" />
                Trajets ({clientTrips.length})
              </TabsTrigger>
              <TabsTrigger value="quotes" className="flex items-center gap-1.5">
                <Receipt className="w-3.5 h-3.5" />
                Devis ({clientQuotes.length})
              </TabsTrigger>
            </TabsList>

            <ScrollArea className="h-[400px] mt-4">
              {/* Itineraries Tab */}
              <TabsContent value="itineraries" className="space-y-3 m-0">
                {itineraryReports.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Route className="w-12 h-12 mx-auto mb-2 opacity-30" />
                    <p>Aucune tournée sauvegardée</p>
                    <p className="text-xs mt-1">Calculez un itinéraire et associez-le à ce client</p>
                  </div>
                ) : (
                  itineraryReports.map(report => {
                    const driverNames = getDriverNames(report.data.driver_ids);
                    const hasExtendedCosts = report.data.adblue_cost !== undefined || 
                                             report.data.driver_cost !== undefined || 
                                             report.data.structure_cost !== undefined;
                    
                    return (
                      <Card key={report.id} className="hover:border-primary/30 transition-colors">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h4 className="font-medium">{report.title}</h4>
                                <Badge variant={report.data.route_type === 'highway' ? 'default' : 'secondary'}>
                                  {report.data.route_type === 'highway' ? 'Autoroute' : 'Nationale'}
                                </Badge>
                              </div>
                              <div className="text-sm text-muted-foreground space-y-1">
                                <p className="flex items-center gap-1.5">
                                  <MapPin className="w-3 h-3 text-success" /> {report.data.origin_address}
                                </p>
                                <p className="flex items-center gap-1.5">
                                  <MapPin className="w-3 h-3 text-destructive" /> {report.data.destination_address}
                                </p>
                              </div>
                              
                              {/* Basic route info */}
                              <div className="flex flex-wrap gap-3 mt-3 text-sm">
                                <span className="flex items-center gap-1">
                                  <Route className="w-3 h-3" /> {report.data.distance_km} km
                                </span>
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" /> {report.data.duration_hours && formatDuration(report.data.duration_hours)}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Fuel className="w-3 h-3" /> {report.data.fuel_cost && formatCurrency(report.data.fuel_cost)}
                                </span>
                                <span className="flex items-center gap-1">
                                  <ReceiptText className="w-3 h-3" /> {report.data.toll_cost && formatCurrency(report.data.toll_cost)}
                                </span>
                              </div>
                              
                              {/* Extended costs if available */}
                              {hasExtendedCosts && (
                                <div className="flex flex-wrap gap-3 mt-2 text-sm text-muted-foreground">
                                  {report.data.adblue_cost !== undefined && (
                                    <span className="flex items-center gap-1">
                                      <Droplet className="w-3 h-3 text-blue-400" /> AdBlue: {formatCurrency(report.data.adblue_cost)}
                                    </span>
                                  )}
                                  {report.data.driver_cost !== undefined && (
                                    <span className="flex items-center gap-1">
                                      <Users className="w-3 h-3" /> Chauffeur: {formatCurrency(report.data.driver_cost)}
                                    </span>
                                  )}
                                  {report.data.structure_cost !== undefined && (
                                    <span className="flex items-center gap-1">
                                      <Landmark className="w-3 h-3" /> Structure: {formatCurrency(report.data.structure_cost)}
                                    </span>
                                  )}
                                </div>
                              )}

                              {/* Assigned drivers */}
                              {driverNames && (
                                <div className="mt-2 flex items-center gap-1.5 text-sm">
                                  <Users className="w-3 h-3 text-primary" />
                                  <span className="text-muted-foreground">Chauffeur(s):</span>
                                  <span className="font-medium">{driverNames}</span>
                                </div>
                              )}

                              {/* Vehicle info if available */}
                              {report.data.vehicle && (
                                <div className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
                                  <Truck className="w-3 h-3 text-primary" />
                                  <span>
                                    {report.data.vehicle.fuelConsumption}L/100km • 
                                    {report.data.vehicle.fuelPriceHT?.toFixed(3)}€/L
                                  </span>
                                </div>
                              )}

                              {/* Total cost */}
                              {report.data.total_cost && (
                                <div className="mt-3 pt-2 border-t border-border flex flex-wrap gap-4">
                                  <span className="text-sm font-medium">
                                    Coût total: {formatCurrency(report.data.total_cost)}
                                  </span>
                                  {report.data.revenue !== undefined && report.data.revenue > 0 && (
                                    <span className="text-sm flex items-center gap-1">
                                      <Euro className="w-3 h-3" />
                                      Recette: {formatCurrency(report.data.revenue)}
                                    </span>
                                  )}
                                  {report.data.profit !== undefined && (
                                    <span className={`text-sm font-bold flex items-center gap-1 ${report.data.profit >= 0 ? 'text-success' : 'text-destructive'}`}>
                                      {report.data.profit >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                      Bénéfice: {formatCurrency(report.data.profit)}
                                      {report.data.profit_margin !== undefined && (
                                        <span className="text-xs font-normal ml-1">({report.data.profit_margin.toFixed(1)}%)</span>
                                      )}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              <span className="text-xs text-muted-foreground">{formatDate(report.created_at)}</span>
                              <div className="flex gap-1">
                                <Button variant="ghost" size="icon" onClick={() => handleRecalculateCosts(report)} title="Recalculer les coûts">
                                  <RefreshCw className="w-4 h-4 text-primary" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(report)} title="Modifier">
                                  <Edit3 className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => handleOpenDuplicate(report)} title="Dupliquer">
                                  <Copy className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => handleDeleteReport(report.id)} title="Supprimer">
                                  <Trash2 className="w-4 h-4 text-destructive" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </TabsContent>

              {/* Cost Analysis Tab */}
              <TabsContent value="analyses" className="space-y-3 m-0">
                {costAnalysisReports.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calculator className="w-12 h-12 mx-auto mb-2 opacity-30" />
                    <p>Aucune analyse de coûts sauvegardée</p>
                  </div>
                ) : (
                  costAnalysisReports.map(report => (
                    <Card key={report.id} className="hover:border-primary/30 transition-colors">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h4 className="font-medium mb-2">{report.title}</h4>
                            <div className="grid grid-cols-4 gap-4 text-sm">
                              <div>
                                <p className="text-muted-foreground text-xs">Coût total</p>
                                <p className="font-medium">{report.data.total_cost && formatCurrency(report.data.total_cost)}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground text-xs">Prix HT</p>
                                <p className="font-medium">{report.data.price_ht && formatCurrency(report.data.price_ht)}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground text-xs">Marge</p>
                                <p className="font-medium text-success">{report.data.margin_percent}%</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground text-xs">Profit</p>
                                <p className="font-medium text-success">{report.data.profit && formatCurrency(report.data.profit)}</p>
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <span className="text-xs text-muted-foreground">{formatDate(report.created_at)}</span>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteReport(report.id)}>
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>

              {/* Trips Tab */}
              <TabsContent value="trips" className="space-y-3 m-0">
                {clientTrips.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <History className="w-12 h-12 mx-auto mb-2 opacity-30" />
                    <p>Aucun trajet enregistré pour ce client</p>
                  </div>
                ) : (
                  clientTrips.map(trip => (
                    <Card key={trip.id} className="hover:border-primary/30 transition-colors">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="text-sm text-muted-foreground space-y-1 mb-2">
                              <p className="flex items-center gap-1.5">
                                <MapPin className="w-3 h-3 text-success" /> {trip.origin_address}
                              </p>
                              <p className="flex items-center gap-1.5">
                                <MapPin className="w-3 h-3 text-destructive" /> {trip.destination_address}
                              </p>
                            </div>
                            <div className="flex gap-4 text-sm">
                              <span>{trip.distance_km} km</span>
                              <span>{formatCurrency(trip.total_cost)}</span>
                              {trip.profit && (
                                <span className="text-success flex items-center gap-1">
                                  <TrendingUp className="w-3 h-3" /> {formatCurrency(trip.profit)}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge variant={trip.status === 'completed' ? 'default' : 'secondary'}>
                              {trip.status === 'completed' ? 'Terminé' : trip.status}
                            </Badge>
                            <p className="text-xs text-muted-foreground mt-1">{formatDate(trip.trip_date)}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>

              {/* Quotes Tab */}
              <TabsContent value="quotes" className="space-y-3 m-0">
                {clientQuotes.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Receipt className="w-12 h-12 mx-auto mb-2 opacity-30" />
                    <p>Aucun devis pour ce client</p>
                  </div>
                ) : (
                  clientQuotes.map(quote => (
                    <Card key={quote.id} className="hover:border-primary/30 transition-colors">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-medium">{quote.quote_number}</h4>
                              <Badge variant={
                                quote.status === 'accepted' ? 'default' : 
                                quote.status === 'rejected' ? 'destructive' : 'secondary'
                              }>
                                {quote.status === 'accepted' ? 'Accepté' : 
                                 quote.status === 'rejected' ? 'Refusé' : 'Brouillon'}
                              </Badge>
                            </div>
                            <div className="text-sm text-muted-foreground space-y-1">
                              <p>{quote.origin_address} → {quote.destination_address}</p>
                            </div>
                            <div className="flex gap-4 mt-2 text-sm">
                              <span>{quote.distance_km} km</span>
                              <span className="font-medium">{formatCurrency(quote.price_ttc)} TTC</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">{formatDate(quote.created_at)}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit3 className="w-5 h-5 text-primary" />
              Modifier la tournée
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nom de la tournée</Label>
              <Input
                value={editFormData.title}
                onChange={(e) => setEditFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Nom de la tournée"
              />
            </div>

            <div className="space-y-2">
              <Label>Chauffeurs affectés</Label>
              <div className="space-y-2 max-h-[150px] overflow-y-auto p-2 border border-border rounded-md">
                {drivers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucun chauffeur configuré</p>
                ) : (
                  drivers.map(driver => (
                    <div key={driver.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`edit-driver-${driver.id}`}
                        checked={editFormData.selectedDriverIds.includes(driver.id)}
                        onCheckedChange={() => toggleDriverEdit(driver.id)}
                      />
                      <label 
                        htmlFor={`edit-driver-${driver.id}`}
                        className="text-sm cursor-pointer flex-1"
                      >
                        {driver.name}
                      </label>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Euro className="w-3.5 h-3.5" />
                Recette HT
              </Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={editFormData.revenue || ''}
                onChange={(e) => setEditFormData(prev => ({ ...prev, revenue: parseFloat(e.target.value) || 0 }))}
                placeholder="Montant facturé au client"
              />
              {editFormData.revenue > 0 && editingReport?.data.total_cost && (
                <p className={`text-sm ${(editFormData.revenue - editingReport.data.total_cost) >= 0 ? 'text-success' : 'text-destructive'}`}>
                  Bénéfice estimé: {formatCurrency(editFormData.revenue - editingReport.data.total_cost)}
                </p>
              )}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setEditDialogOpen(false)}>
                Annuler
              </Button>
              <Button className="flex-1" onClick={handleSaveEdit} disabled={!editFormData.title}>
                Enregistrer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Duplicate Dialog */}
      <Dialog open={duplicateDialogOpen} onOpenChange={setDuplicateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Copy className="w-5 h-5 text-primary" />
              Dupliquer la tournée
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {duplicatingReport && (
              <div className="p-3 bg-muted/30 rounded-lg text-sm">
                <p className="font-medium">{duplicatingReport.title}</p>
                <p className="text-muted-foreground mt-1">
                  {duplicatingReport.data.distance_km} km • {duplicatingReport.data.total_cost && formatCurrency(duplicatingReport.data.total_cost)}
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label>Sélectionner le client cible</Label>
              <Select value={duplicateTargetClientId} onValueChange={setDuplicateTargetClientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir un client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.filter(c => c.id !== client.id).map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} {c.company ? `(${c.company})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setDuplicateDialogOpen(false)}>
                Annuler
              </Button>
              <Button className="flex-1" onClick={handleConfirmDuplicate} disabled={!duplicateTargetClientId}>
                <Copy className="w-4 h-4 mr-2" />
                Dupliquer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}