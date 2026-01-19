import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { fr, enUS, es } from 'date-fns/locale';
import { Search, Calendar, TrendingUp, TrendingDown, MapPin, Fuel, Scale, Trash2, Lock, Edit2, RefreshCw, Users, X, Check, FileSpreadsheet, Download, FileText } from 'lucide-react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useSavedTours } from '@/hooks/useSavedTours';
import type { LocalClient } from '@/types/local';
import type { SavedTour } from '@/types/savedTour';
import { useLicense } from '@/hooks/useLicense';
import { FeatureGate } from '@/components/license/FeatureGate';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';
import { ExcelImportDialog } from '@/components/import/ExcelImportDialog';
import { exportTourDetailedPDF, exportToursSummaryPDF } from '@/utils/tourPdfExport';

export default function TripHistory() {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const { hasFeature } = useLicense();
  const navigate = useNavigate();
  const { tours, loading, fetchTours, deleteTour, updateTour } = useSavedTours();
  const [clients] = useLocalStorage<LocalClient[]>('optiflow_clients', []);
  const [searchTerm, setSearchTerm] = useState('');
  const [clientFilter, setClientFilter] = useState<string>('all');
  const [selectedTours, setSelectedTours] = useState<string[]>([]);
  const [compareMode, setCompareMode] = useState(false);
  const [editingTour, setEditingTour] = useState<SavedTour | null>(null);
  const [editForm, setEditForm] = useState<Partial<SavedTour>>({});
  const [excelImportOpen, setExcelImportOpen] = useState(false);
  
  const canCompare = hasFeature('trip_history'); // Compare is part of trip_history feature
  const dateLocale = language === 'fr' ? fr : language === 'es' ? es : enUS;
  
  const handleExcelImport = async (data: any[]) => {
    let imported = 0;
    for (const row of data) {
      if (row.origin_address && row.destination_address) {
        const revenue = row.revenue || 0;
        const totalCost = (row.toll_cost || 0) + (row.fuel_cost || 0);
        const profit = revenue - totalCost;
        const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0;
        
        await saveTour({
          name: row.name || `Import ${new Date().toLocaleDateString()}`,
          origin_address: row.origin_address,
          destination_address: row.destination_address,
          distance_km: row.distance_km || 0,
          toll_cost: row.toll_cost || 0,
          fuel_cost: row.fuel_cost || 0,
          driver_cost: 0,
          structure_cost: 0,
          vehicle_cost: 0,
          adblue_cost: 0,
          total_cost: totalCost,
          revenue: revenue,
          profit: profit,
          profit_margin: profitMargin,
          pricing_mode: 'fixed',
          notes: row.notes || '',
        });
        imported++;
      }
    }
    toast({ title: `${imported} tournée(s) importée(s)` });
    fetchTours();
  };
  
  const { saveTour } = useSavedTours();

  useEffect(() => {
    fetchTours();
  }, [fetchTours]);

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette tournée ?')) return;
    const success = await deleteTour(id);
    if (success) {
      toast({ title: "Tournée supprimée" });
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedTours(prev => 
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    );
  };

  const openEditDialog = (tour: SavedTour) => {
    setEditingTour(tour);
    setEditForm({
      origin_address: tour.origin_address,
      destination_address: tour.destination_address,
      distance_km: tour.distance_km,
      toll_cost: tour.toll_cost,
      fuel_cost: tour.fuel_cost,
      driver_cost: tour.driver_cost,
      total_cost: tour.total_cost,
      revenue: tour.revenue,
      notes: tour.notes,
    });
  };

  const handleSaveEdit = async () => {
    if (!editingTour) return;
    
    const revenue = editForm.revenue ?? editingTour.revenue ?? 0;
    const totalCost = editForm.total_cost ?? editingTour.total_cost;
    const profit = revenue - totalCost;
    const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0;

    const success = await updateTour(editingTour.id, {
      origin_address: editForm.origin_address || editingTour.origin_address,
      destination_address: editForm.destination_address || editingTour.destination_address,
      distance_km: editForm.distance_km ?? editingTour.distance_km,
      toll_cost: editForm.toll_cost ?? editingTour.toll_cost,
      fuel_cost: editForm.fuel_cost ?? editingTour.fuel_cost,
      driver_cost: editForm.driver_cost ?? editingTour.driver_cost,
      total_cost: totalCost,
      revenue,
      profit,
      profit_margin: profitMargin,
      notes: editForm.notes ?? editingTour.notes,
    });

    if (success) {
      setEditingTour(null);
      toast({ title: "Tournée modifiée" });
    }
  };

  const sortedTours = [...tours].sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const filteredTours = sortedTours.filter(tour => {
    const matchesSearch = 
      tour.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tour.origin_address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tour.destination_address.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesClient = clientFilter === 'all' || tour.client_id === clientFilter;
    return matchesSearch && matchesClient;
  });

  const comparedTours = tours.filter(t => selectedTours.includes(t.id));

  const getClientName = (clientId: string | null) => {
    if (!clientId) return null;
    return clients.find(c => c.id === clientId)?.name;
  };

  const getDriverNames = (driversData: any[] | null) => {
    if (driversData && driversData.length > 0) {
      return driversData.map((d: any) => d.name).join(', ');
    }
    return null;
  };

  return (
    <FeatureGate feature="trip_history" showLockedIndicator={true}>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">{t.history.title}</h1>
            <p className="text-muted-foreground">{t.history.subtitle}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" onClick={() => setExcelImportOpen(true)}>
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Importer Excel
            </Button>
            <Button 
              variant="outline" 
              onClick={() => {
                if (filteredTours.length > 0) {
                  exportToursSummaryPDF(filteredTours);
                  toast({ title: "Synthèse PDF exportée" });
                }
              }}
              disabled={filteredTours.length === 0}
            >
              <Download className="w-4 h-4 mr-2" />
              Exporter synthèse
            </Button>
            <Button variant="outline" onClick={() => fetchTours()} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Actualiser
            </Button>
            {canCompare ? (
              <Button 
                variant={compareMode ? "default" : "outline"}
                onClick={() => { setCompareMode(!compareMode); setSelectedTours([]); }}
              >
                <Scale className="w-4 h-4 mr-2" />
                {compareMode ? 'Quitter comparaison' : 'Comparer'}
              </Button>
            ) : (
              <Button variant="outline" onClick={() => navigate('/pricing')} className="gap-2">
                <Lock className="w-4 h-4" />
                Comparer (PRO)
              </Button>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Rechercher par nom ou adresse..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={clientFilter} onValueChange={setClientFilter}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Filtrer par client" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les clients</SelectItem>
              {clients.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Comparison Panel */}
        {compareMode && selectedTours.length >= 2 && (
          <Card className="border-primary/30">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Scale className="w-5 h-5 text-primary" />
                Comparaison de {selectedTours.length} tournées
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 px-2">Tournée</th>
                      <th className="text-right py-2 px-2">Distance</th>
                      <th className="text-right py-2 px-2">Coût total</th>
                      <th className="text-right py-2 px-2">€/km</th>
                      <th className="text-right py-2 px-2">Revenu</th>
                      <th className="text-right py-2 px-2">Marge</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparedTours.map(tour => {
                      const costPerKm = tour.total_cost / tour.distance_km;
                      return (
                        <tr key={tour.id} className="border-b border-border/50">
                          <td className="py-2 px-2">
                            <div className="font-medium truncate max-w-[200px]">
                              {tour.name}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {format(new Date(tour.created_at), 'dd MMM yyyy', { locale: dateLocale })}
                            </div>
                          </td>
                          <td className="text-right py-2 px-2">{tour.distance_km.toFixed(0)} km</td>
                          <td className="text-right py-2 px-2">{tour.total_cost.toFixed(2)} €</td>
                          <td className="text-right py-2 px-2">{costPerKm.toFixed(2)} €</td>
                          <td className="text-right py-2 px-2">{tour.revenue?.toFixed(2) || '-'} €</td>
                          <td className="text-right py-2 px-2">
                            {tour.profit_margin !== null ? (
                              <span className={tour.profit_margin >= 0 ? 'text-success' : 'text-destructive'}>
                                {tour.profit_margin.toFixed(1)}%
                              </span>
                            ) : '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="font-medium bg-muted/30">
                      <td className="py-2 px-2">Moyenne</td>
                      <td className="text-right py-2 px-2">
                        {(comparedTours.reduce((s, t) => s + t.distance_km, 0) / comparedTours.length).toFixed(0)} km
                      </td>
                      <td className="text-right py-2 px-2">
                        {(comparedTours.reduce((s, t) => s + t.total_cost, 0) / comparedTours.length).toFixed(2)} €
                      </td>
                      <td className="text-right py-2 px-2">
                        {(comparedTours.reduce((s, t) => s + t.total_cost / t.distance_km, 0) / comparedTours.length).toFixed(2)} €
                      </td>
                      <td className="text-right py-2 px-2">
                        {comparedTours.filter(t => t.revenue).length > 0 
                          ? (comparedTours.filter(t => t.revenue).reduce((s, t) => s + (t.revenue || 0), 0) / comparedTours.filter(t => t.revenue).length).toFixed(2) 
                          : '-'} €
                      </td>
                      <td className="text-right py-2 px-2">
                        {comparedTours.filter(t => t.profit_margin !== null).length > 0
                          ? (comparedTours.filter(t => t.profit_margin !== null).reduce((s, t) => s + (t.profit_margin || 0), 0) / comparedTours.filter(t => t.profit_margin !== null).length).toFixed(1)
                          : '-'}%
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {loading ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
              Chargement...
            </CardContent>
          </Card>
        ) : filteredTours.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              {searchTerm || clientFilter !== 'all' 
                ? 'Aucune tournée trouvée' 
                : 'Aucune tournée enregistrée. Sauvegardez vos calculs depuis la page Itinéraire.'}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredTours.map(tour => {
              const clientName = getClientName(tour.client_id);
              const driverNames = getDriverNames(tour.drivers_data);
              const costPerKm = tour.total_cost / tour.distance_km;
              const isProfitable = tour.profit !== null && tour.profit > 0;
              
              return (
                <Card key={tour.id} className="hover:border-primary/30 transition-colors">
                  <CardContent className="py-4">
                    <div className="flex items-start gap-4">
                      {compareMode && (
                        <Checkbox 
                          checked={selectedTours.includes(tour.id)}
                          onCheckedChange={() => toggleSelect(tour.id)}
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <div className="font-medium text-foreground">{tour.name}</div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap mt-1">
                              <span className="truncate">
                                {tour.origin_address.split(',')[0]}
                              </span>
                              <span>→</span>
                              <span className="truncate">
                                {tour.destination_address.split(',')[0]}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground flex-wrap">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {format(new Date(tour.created_at), 'dd MMM yyyy', { locale: dateLocale })}
                              </span>
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {tour.distance_km.toFixed(0)} km
                              </span>
                              {clientName && (
                                <Badge variant="secondary" className="text-xs">
                                  {clientName}
                                </Badge>
                              )}
                              {driverNames && (
                                <Badge variant="outline" className="text-xs">
                                  <Users className="w-3 h-3 mr-1" />
                                  {driverNames}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="text-right">
                              <div className="font-semibold">{tour.total_cost.toFixed(2)} €</div>
                              <div className="text-xs text-muted-foreground">{costPerKm.toFixed(2)} €/km</div>
                            </div>
                            {tour.profit !== null && (
                              <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                                isProfitable ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
                              }`}>
                                {isProfitable ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                {tour.profit.toFixed(0)}€
                              </div>
                            )}
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => {
                                exportTourDetailedPDF(tour, { includeAIAnalysis: true, includeVehicleDetails: true, includeDriverDetails: true });
                                toast({ title: "PDF exporté avec succès" });
                              }}
                              title="Exporter en PDF détaillé"
                            >
                              <FileText className="w-4 h-4 text-primary" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => openEditDialog(tour)}>
                              <Edit2 className="w-4 h-4 text-primary" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(tour.id)}>
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                        
                        {/* Cost breakdown */}
                        <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                          {tour.fuel_cost > 0 && (
                            <span className="flex items-center gap-1">
                              <Fuel className="w-3 h-3" /> Carburant: {tour.fuel_cost.toFixed(2)}€
                            </span>
                          )}
                          {tour.toll_cost > 0 && (
                            <span>Péages: {tour.toll_cost.toFixed(2)}€</span>
                          )}
                          {tour.driver_cost > 0 && (
                            <span>Conducteur: {tour.driver_cost.toFixed(2)}€</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Edit Tour Dialog */}
        <Dialog open={!!editingTour} onOpenChange={(open) => !open && setEditingTour(null)}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-primary" />
                Modifier la tournée
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Adresse de départ</Label>
                <Input
                  value={editForm.origin_address || ''}
                  onChange={(e) => setEditForm(prev => ({ ...prev, origin_address: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Adresse d'arrivée</Label>
                <Input
                  value={editForm.destination_address || ''}
                  onChange={(e) => setEditForm(prev => ({ ...prev, destination_address: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Distance (km)</Label>
                  <Input
                    type="number"
                    value={editForm.distance_km ?? ''}
                    onChange={(e) => setEditForm(prev => ({ ...prev, distance_km: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Coût total (€)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editForm.total_cost ?? ''}
                    onChange={(e) => setEditForm(prev => ({ ...prev, total_cost: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Revenu (€)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editForm.revenue ?? ''}
                    onChange={(e) => setEditForm(prev => ({ ...prev, revenue: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Carburant (€)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editForm.fuel_cost ?? ''}
                    onChange={(e) => setEditForm(prev => ({ ...prev, fuel_cost: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Péages (€)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editForm.toll_cost ?? ''}
                    onChange={(e) => setEditForm(prev => ({ ...prev, toll_cost: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Conducteur (€)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editForm.driver_cost ?? ''}
                    onChange={(e) => setEditForm(prev => ({ ...prev, driver_cost: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Input
                  value={editForm.notes || ''}
                  onChange={(e) => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Notes optionnelles..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingTour(null)}>
                <X className="w-4 h-4 mr-2" />
                Annuler
              </Button>
              <Button onClick={handleSaveEdit}>
                <Check className="w-4 h-4 mr-2" />
                Enregistrer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Excel Import Dialog */}
        <ExcelImportDialog
          open={excelImportOpen}
          onOpenChange={setExcelImportOpen}
          type="tours"
          onImport={handleExcelImport}
        />
      </div>
    </FeatureGate>
  );
}