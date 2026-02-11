import { useState, useEffect } from 'react';
import {
  Route,
  Search,
  Download,
  Star,
  StarOff,
  Trash2,
  Eye,
  Pencil,
  MapPin,
  Euro,
  TrendingUp,
  Sparkles,
  EyeOff,
  Copy,
  UserCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Checkbox } from '@/components/ui/checkbox';
import { useSavedTours } from '@/hooks/useSavedTours';
import { useClients as useCloudClients } from '@/hooks/useClients';
import { useCloudVehicles } from '@/hooks/useCloudVehicles';
import { useCloudTrailers } from '@/hooks/useCloudTrailers';
import { useCloudDrivers } from '@/hooks/drivers';
import { useLicense } from '@/hooks/useLicense';
import { useCompanyData } from '@/hooks/useCompanyData';
import { useRolePermissions } from '@/hooks/useRolePermissions';
import { EditTourDialog } from '@/components/tours/EditTourDialog';
import { SharedDataBadge } from '@/components/shared/SharedDataBadge';
import { DataOwnershipFilter, type OwnershipFilter } from '@/components/shared/DataOwnershipFilter';
import { BulkActionsBar } from '@/components/shared/BulkActionsBar';
import { DuplicateDetectionBanner } from '@/components/shared/DuplicateDetectionBanner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';
import type { SavedTour } from '@/types/savedTour';
import jsPDF from 'jspdf';
import { FeatureGate } from '@/components/license/FeatureGate';

export default function Tours() {
  const { tours, loading, fetchTours, deleteTour, toggleFavorite, saveTour, updateTour } = useSavedTours();
  const { planType } = useLicense();
  const { getTourInfo, isOwnData, isCompanyMember, currentUserId } = useCompanyData();
  const { canViewPricing, canViewFinancialData, canExportFinancialReports } = useRolePermissions();
  const { clients } = useCloudClients();
  const { vehicles } = useCloudVehicles();
  const { trailers } = useCloudTrailers();
  const { cdiDrivers, cddDrivers, interimDrivers } = useCloudDrivers();
  const allDrivers = [...cdiDrivers, ...cddDrivers, ...interimDrivers];
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClient, setFilterClient] = useState<string>('all');
  const [filterFavorite, setFilterFavorite] = useState<'all' | 'favorites'>('all');
  const [ownershipFilter, setOwnershipFilter] = useState<OwnershipFilter>('all');
  const [selectedTour, setSelectedTour] = useState<SavedTour | null>(null);
  const [editingTour, setEditingTour] = useState<SavedTour | null>(null);
  const [exporting, setExporting] = useState(false);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [assignClientOpen, setAssignClientOpen] = useState(false);
  const [assignClientId, setAssignClientId] = useState<string>('');
  
  const isEnterprise = planType === 'enterprise';

  const toggleCheck = (id: string) => {
    setCheckedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleBulkDelete = async () => {
    if (checkedIds.size === 0) return;
    if (!confirm(`Supprimer ${checkedIds.size} tournée(s) ?`)) return;
    for (const id of checkedIds) {
      await deleteTour(id);
    }
    toast.success(`${checkedIds.size} tournée(s) supprimée(s)`);
    setCheckedIds(new Set());
  };

  const handleDuplicate = async () => {
    if (checkedIds.size === 0) return;
    const toDuplicate = tours.filter(t => checkedIds.has(t.id));
    for (const tour of toDuplicate) {
      await saveTour({
        name: `${tour.name} (copie)`,
        origin_address: tour.origin_address,
        destination_address: tour.destination_address,
        distance_km: tour.distance_km,
        duration_minutes: tour.duration_minutes || 0,
        toll_cost: tour.toll_cost,
        fuel_cost: tour.fuel_cost,
        adblue_cost: tour.adblue_cost,
        driver_cost: tour.driver_cost,
        structure_cost: tour.structure_cost,
        vehicle_cost: tour.vehicle_cost,
        total_cost: tour.total_cost,
        revenue: tour.revenue || 0,
        profit: tour.profit || 0,
        profit_margin: tour.profit_margin || 0,
        client_id: tour.client_id,
        vehicle_id: tour.vehicle_id,
        driver_ids: tour.driver_ids || [],
        stops: tour.stops || [],
        notes: tour.notes,
        tags: tour.tags || [],
        pricing_mode: tour.pricing_mode || 'km',
        price_per_km: tour.price_per_km || 0,
        fixed_price: tour.fixed_price || 0,
        target_margin: tour.target_margin || 15,
        vehicle_data: tour.vehicle_data,
        drivers_data: tour.drivers_data || [],
        trailer_id: tour.trailer_id,
        trailer_data: tour.trailer_data,
      });
    }
    toast.success(`${toDuplicate.length} tournée(s) dupliquée(s)`);
    setCheckedIds(new Set());
  };

  const handleBulkAssignClient = async () => {
    if (checkedIds.size === 0 || !assignClientId) return;
    let success = 0;
    for (const id of checkedIds) {
      const ok = await updateTour(id, { client_id: assignClientId });
      if (ok) success++;
    }
    if (success > 0) {
      toast.success(`${success} tournée(s) affectée(s) au client`);
      setCheckedIds(new Set());
    }
    setAssignClientOpen(false);
    setAssignClientId('');
  };

  const handleMergeTours = async (keepId: string, mergeIds: string[]): Promise<boolean> => {
    try {
      for (const oldId of mergeIds) {
        await deleteTour(oldId);
      }
      toast.success(`${mergeIds.length} tournée(s) fusionnée(s)`);
      setCheckedIds(new Set());
      return true;
    } catch (e) {
      console.error('Merge tours error:', e);
      toast.error('Erreur lors de la fusion');
      return false;
    }
  };

  useEffect(() => {
    fetchTours();
  }, [fetchTours]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value);

  const filteredTours = tours.filter(tour => {
    const matchesSearch =
      tour.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tour.origin_address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tour.destination_address.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesClient = filterClient === 'all' || tour.client_id === filterClient;
    const matchesFavorite = filterFavorite === 'all' || tour.is_favorite;

    // Filter by ownership
    let matchesOwnership = true;
    if (ownershipFilter !== 'all' && isCompanyMember) {
      const tourInfo = getTourInfo(tour.id);
      const isOwn = tourInfo ? isOwnData(tourInfo.userId) : true;
      if (ownershipFilter === 'mine') {
        matchesOwnership = isOwn;
      } else if (ownershipFilter === 'team') {
        matchesOwnership = !isOwn;
      }
    }

    return matchesSearch && matchesClient && matchesFavorite && matchesOwnership;
  });

  const stats = {
    total: tours.length,
    favorites: tours.filter(t => t.is_favorite).length,
    totalRevenue: tours.reduce((acc, t) => acc + (t.revenue || 0), 0),
    totalProfit: tours.reduce((acc, t) => acc + (t.profit || 0), 0),
  };

  const getClientName = (clientId: string | null) => {
    if (!clientId) return 'Non assigné';
    const client = clients.find(c => c.id === clientId);
    return client?.company || client?.name || 'Client inconnu';
  };

  const exportTourToPDF = async (tour: SavedTour, includeAI: boolean = false) => {
    setExporting(true);
    try {
      const pdf = new jsPDF();
      const pageWidth = pdf.internal.pageSize.getWidth();

      // Header
      pdf.setFillColor(30, 41, 59);
      pdf.rect(0, 0, pageWidth, 35, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(20);
      pdf.text('OptiFlow - Rapport de Tournée', 14, 20);
      pdf.setFontSize(10);
      pdf.text(`Généré le ${format(new Date(), 'dd/MM/yyyy à HH:mm', { locale: fr })}`, 14, 28);

      // Reset colors
      pdf.setTextColor(0, 0, 0);
      let y = 50;

      // Tour info
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text(tour.name, 14, y);
      y += 10;

      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      
      // Route
      pdf.setFont('helvetica', 'bold');
      pdf.text('Itinéraire:', 14, y);
      pdf.setFont('helvetica', 'normal');
      y += 6;
      pdf.text(`Départ: ${tour.origin_address}`, 20, y);
      y += 5;
      pdf.text(`Arrivée: ${tour.destination_address}`, 20, y);
      y += 5;
      pdf.text(`Distance: ${tour.distance_km.toFixed(1)} km`, 20, y);
      if (tour.duration_minutes) {
        const hours = Math.floor(tour.duration_minutes / 60);
        const minutes = tour.duration_minutes % 60;
        pdf.text(`   |   Durée: ${hours}h${minutes.toString().padStart(2, '0')}`, 70, y);
      }
      y += 10;

      // Costs breakdown
      pdf.setFillColor(241, 245, 249);
      pdf.rect(14, y, pageWidth - 28, 50, 'F');
      y += 8;
      pdf.setFont('helvetica', 'bold');
      pdf.text('Détail des coûts', 20, y);
      pdf.setFont('helvetica', 'normal');
      y += 8;

      const costs = [
        { label: 'Péages', value: tour.toll_cost },
        { label: 'Carburant', value: tour.fuel_cost },
        { label: 'AdBlue', value: tour.adblue_cost },
        { label: 'Conducteur', value: tour.driver_cost },
        { label: 'Structure', value: tour.structure_cost },
        { label: 'Véhicule', value: tour.vehicle_cost },
      ];

      costs.forEach((cost, index) => {
        const x = index % 3 === 0 ? 20 : index % 3 === 1 ? 75 : 130;
        if (index > 0 && index % 3 === 0) y += 6;
        pdf.text(`${cost.label}: ${formatCurrency(cost.value)}`, x, y);
      });

      y += 15;
      pdf.setFont('helvetica', 'bold');
      pdf.text(`Coût total: ${formatCurrency(tour.total_cost)}`, 20, y);
      y += 20;

      // Financial summary
      pdf.setFillColor(34, 197, 94);
      pdf.setTextColor(255, 255, 255);
      pdf.rect(14, y, pageWidth - 28, 25, 'F');
      y += 8;
      pdf.setFontSize(12);
      pdf.text('Résumé Financier', 20, y);
      y += 10;
      pdf.setFontSize(10);
      pdf.text(`Recette: ${formatCurrency(tour.revenue || 0)}`, 20, y);
      pdf.text(`Bénéfice: ${formatCurrency(tour.profit || 0)}`, 80, y);
      pdf.text(`Marge: ${(tour.profit_margin || 0).toFixed(1)}%`, 140, y);

      // AI Analysis for Enterprise
      if (includeAI) {
        y += 25;
        pdf.setTextColor(0, 0, 0);
        pdf.setFillColor(139, 92, 246);
        pdf.setTextColor(255, 255, 255);
        pdf.rect(14, y, pageWidth - 28, 8, 'F');
        y += 6;
        pdf.setFont('helvetica', 'bold');
        pdf.text('🤖 Analyse IA Enterprise', 20, y);
        y += 12;
        
        pdf.setTextColor(0, 0, 0);
        pdf.setFont('helvetica', 'normal');
        
        const margin = tour.profit_margin || 0;
        let aiAnalysis = '';
        if (margin < 10) {
          aiAnalysis = `⚠️ Marge critique (${margin.toFixed(1)}%) - Cette tournée présente une rentabilité insuffisante. Recommandation : renégocier le tarif ou optimiser le trajet pour réduire les coûts.`;
        } else if (margin < 15) {
          aiAnalysis = `📊 Marge acceptable (${margin.toFixed(1)}%) - Rentabilité correcte mais perfectible. Possibilité d'amélioration via l'optimisation des temps de conduite.`;
        } else if (margin < 25) {
          aiAnalysis = `✅ Bonne marge (${margin.toFixed(1)}%) - Cette tournée est rentable. Considérez la fidélisation du client pour sécuriser ce revenu.`;
        } else {
          aiAnalysis = `🌟 Excellente marge (${margin.toFixed(1)}%) - Tournée très profitable. Recommandation : proposer des trajets similaires à ce client.`;
        }
        
        const lines = pdf.splitTextToSize(aiAnalysis, pageWidth - 40);
        pdf.text(lines, 20, y);
        y += lines.length * 5 + 5;
        
        // Cost optimization tips
        pdf.setFont('helvetica', 'bold');
        pdf.text('Optimisations suggérées:', 20, y);
        y += 6;
        pdf.setFont('helvetica', 'normal');
        
        const tips = [
          `• Coût carburant: ${((tour.fuel_cost / tour.total_cost) * 100).toFixed(0)}% du total - ${tour.fuel_cost > tour.total_cost * 0.4 ? 'Élevé, vérifiez la consommation' : 'Dans la norme'}`,
          `• Péages: ${((tour.toll_cost / tour.total_cost) * 100).toFixed(0)}% du total - ${tour.toll_cost > tour.total_cost * 0.15 ? 'Envisagez un itinéraire alternatif' : 'Optimisé'}`,
          `• Prix/km effectif: ${tour.distance_km > 0 ? ((tour.revenue || 0) / tour.distance_km).toFixed(2) : '0.00'} €/km`,
        ];
        
        tips.forEach(tip => {
          pdf.text(tip, 20, y);
          y += 5;
        });
      }

      // Save
      pdf.save(`tournee-${tour.name.replace(/[^a-z0-9]/gi, '_')}-${format(new Date(), 'yyyyMMdd')}.pdf`);
      toast.success('PDF exporté avec succès');
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error("Erreur lors de l'export PDF");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
            <Route className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Tournées sauvegardées</h1>
            <p className="text-muted-foreground">Gérez et exportez vos tournées</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Route className="w-4 h-4" />
              <span className="text-sm">Total tournées</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-amber-500 mb-1">
              <Star className="w-4 h-4" />
              <span className="text-sm">Favoris</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{stats.favorites}</p>
          </CardContent>
        </Card>
        {canViewFinancialData ? (
          <>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-primary mb-1">
                  <Euro className="w-4 h-4" />
                  <span className="text-sm">CA Total</span>
                </div>
                <p className="text-2xl font-bold text-foreground">{formatCurrency(stats.totalRevenue)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-green-500 mb-1">
                  <TrendingUp className="w-4 h-4" />
                  <span className="text-sm">Bénéfice Total</span>
                </div>
                <p className="text-2xl font-bold text-foreground">{formatCurrency(stats.totalProfit)}</p>
              </CardContent>
            </Card>
          </>
        ) : (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <EyeOff className="w-4 h-4" />
                <span className="text-sm">Données financières</span>
              </div>
              <p className="text-sm text-muted-foreground">Réservé Direction</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par nom, adresse..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            {isCompanyMember && (
              <DataOwnershipFilter
                value={ownershipFilter}
                onChange={setOwnershipFilter}
              />
            )}
            <Select value={filterClient} onValueChange={setFilterClient}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Tous les clients" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les clients</SelectItem>
                {clients.map(client => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.company || client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterFavorite} onValueChange={(v: 'all' | 'favorites') => setFilterFavorite(v)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="favorites">Favoris uniquement</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Duplicate detection */}
      <DuplicateDetectionBanner
        items={tours.map(t => ({ id: t.id, name: t.name, extra: getClientName(t.client_id) }))}
        entityLabel="tournées"
        onMerge={handleMergeTours}
      />

      {/* Bulk actions */}
      <BulkActionsBar
        count={checkedIds.size}
        onDelete={handleBulkDelete}
        onDuplicate={handleDuplicate}
        onClear={() => setCheckedIds(new Set())}
        extraActions={
          <Button variant="outline" size="sm" onClick={() => setAssignClientOpen(true)} className="gap-1.5">
            <UserCheck className="w-3.5 h-3.5" />
            Affecter à un client
          </Button>
        }
      />

      {/* Assign to client dialog */}
      <Dialog open={assignClientOpen} onOpenChange={(open) => { setAssignClientOpen(open); if (!open) setAssignClientId(''); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Affecter {checkedIds.size} tournée(s) à un client</DialogTitle>
            <DialogDescription>
              Les tournées sélectionnées seront regroupées sous un seul client.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Select value={assignClientId} onValueChange={setAssignClientId}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un client..." />
              </SelectTrigger>
              <SelectContent>
                {clients.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.company || c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignClientOpen(false)}>Annuler</Button>
            <Button onClick={handleBulkAssignClient} disabled={!assignClientId}>Affecter</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tours Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={filteredTours.length > 0 && filteredTours.every(t => checkedIds.has(t.id))}
                  onCheckedChange={(checked) => {
                    if (checked) setCheckedIds(new Set(filteredTours.map(t => t.id)));
                    else setCheckedIds(new Set());
                  }}
                />
              </TableHead>
              <TableHead className="w-10"></TableHead>
              <TableHead>Tournée</TableHead>
              {isCompanyMember && <TableHead>Créé par</TableHead>}
              <TableHead>Client</TableHead>
              <TableHead>Distance</TableHead>
              {canViewPricing && <TableHead>Coût</TableHead>}
              {canViewPricing && <TableHead>Recette</TableHead>}
              {canViewPricing && <TableHead>Marge</TableHead>}
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={canViewPricing ? 10 : 7} className="text-center py-8 text-muted-foreground">
                  Chargement...
                </TableCell>
              </TableRow>
            ) : filteredTours.length === 0 ? (
              <TableRow>
                <TableCell colSpan={canViewPricing ? 10 : 7} className="text-center py-8 text-muted-foreground">
                  Aucune tournée trouvée
                </TableCell>
              </TableRow>
            ) : (
              filteredTours.map(tour => (
                <TableRow key={tour.id} className={checkedIds.has(tour.id) ? 'bg-primary/10' : ''}>
                  <TableCell>
                    <Checkbox checked={checkedIds.has(tour.id)} onCheckedChange={() => toggleCheck(tour.id)} />
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => toggleFavorite(tour.id)}
                    >
                      {tour.is_favorite ? (
                        <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                      ) : (
                        <StarOff className="w-4 h-4 text-muted-foreground" />
                      )}
                    </Button>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{tour.name}</p>
                      <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                        {tour.origin_address} → {tour.destination_address}
                      </p>
                    </div>
                  </TableCell>
                  {isCompanyMember && (
                    <TableCell>
                      {(() => {
                        const tourInfo = getTourInfo(tour.id);
                        const isOwn = tourInfo ? isOwnData(tourInfo.userId) : true;
                        return (
                          <SharedDataBadge
                            isShared={!!tourInfo}
                            isOwn={isOwn}
                            isFormerMember={tourInfo?.isFormerMember}
                            createdBy={tourInfo?.displayName}
                            createdByEmail={tourInfo?.userEmail}
                            compact
                          />
                        );
                      })()}
                    </TableCell>
                  )}
                  <TableCell>
                    <Badge variant="outline">{getClientName(tour.client_id)}</Badge>
                  </TableCell>
                  <TableCell>{tour.distance_km.toFixed(0)} km</TableCell>
                  {canViewPricing && <TableCell>{formatCurrency(tour.total_cost)}</TableCell>}
                  {canViewPricing && <TableCell>{formatCurrency(tour.revenue || 0)}</TableCell>}
                  {canViewPricing && (
                    <TableCell>
                      <Badge
                        variant={(tour.profit_margin || 0) >= 15 ? 'default' : 'destructive'}
                        className={(tour.profit_margin || 0) >= 15 ? 'bg-green-500/20 text-green-500' : ''}
                      >
                        {(tour.profit_margin || 0).toFixed(1)}%
                      </Badge>
                    </TableCell>
                  )}
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {format(new Date(tour.created_at), 'dd/MM/yy', { locale: fr })}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setEditingTour(tour)}
                        title="Modifier"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setSelectedTour(tour)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <FeatureGate feature="btn_export_pdf" showLockedIndicator={false}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => exportTourToPDF(tour, false)}
                          disabled={exporting}
                          title="Export PDF standard"
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      </FeatureGate>
                      {isEnterprise && (
                        <FeatureGate feature="btn_ai_optimize" showLockedIndicator={false}>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-purple-500"
                                  onClick={() => exportTourToPDF(tour, true)}
                                  disabled={exporting}
                                >
                                  <Sparkles className="w-4 h-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Export PDF avec analyse IA</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </FeatureGate>
                      )}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Supprimer cette tournée ?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Cette action est irréversible. La tournée "{tour.name}" sera supprimée.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteTour(tour.id)}
                              className="bg-destructive text-destructive-foreground"
                            >
                              Supprimer
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Tour Detail Dialog */}
      <Dialog open={!!selectedTour} onOpenChange={(open) => !open && setSelectedTour(null)}>
        <DialogContent className="max-w-2xl">
          {selectedTour && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Route className="w-5 h-5 text-primary" />
                  {selectedTour.name}
                </DialogTitle>
                <DialogDescription>
                  Détails complets de la tournée
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="w-4 h-4" />
                      Départ
                    </div>
                    <p className="text-sm">{selectedTour.origin_address}</p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="w-4 h-4" />
                      Arrivée
                    </div>
                    <p className="text-sm">{selectedTour.destination_address}</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
                  <div>
                    <p className="text-xs text-muted-foreground">Distance</p>
                    <p className="text-lg font-semibold">{selectedTour.distance_km.toFixed(0)} km</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Durée</p>
                    <p className="text-lg font-semibold">
                      {selectedTour.duration_minutes ? `${Math.floor(selectedTour.duration_minutes / 60)}h${(selectedTour.duration_minutes % 60).toString().padStart(2, '0')}` : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Client</p>
                    <p className="text-lg font-semibold">{getClientName(selectedTour.client_id)}</p>
                  </div>
                </div>

                {canViewFinancialData ? (
                  <>
                    <div className="space-y-2">
                      <h4 className="font-medium">Détail des coûts</h4>
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <div className="flex justify-between p-2 bg-muted/30 rounded">
                          <span>Péages</span>
                          <span className="font-medium">{formatCurrency(selectedTour.toll_cost)}</span>
                        </div>
                        <div className="flex justify-between p-2 bg-muted/30 rounded">
                          <span>Carburant</span>
                          <span className="font-medium">{formatCurrency(selectedTour.fuel_cost)}</span>
                        </div>
                        <div className="flex justify-between p-2 bg-muted/30 rounded">
                          <span>AdBlue</span>
                          <span className="font-medium">{formatCurrency(selectedTour.adblue_cost)}</span>
                        </div>
                        <div className="flex justify-between p-2 bg-muted/30 rounded">
                          <span>Conducteur</span>
                          <span className="font-medium">{formatCurrency(selectedTour.driver_cost)}</span>
                        </div>
                        <div className="flex justify-between p-2 bg-muted/30 rounded">
                          <span>Structure</span>
                          <span className="font-medium">{formatCurrency(selectedTour.structure_cost)}</span>
                        </div>
                        <div className="flex justify-between p-2 bg-muted/30 rounded">
                          <span>Véhicule</span>
                          <span className="font-medium">{formatCurrency(selectedTour.vehicle_cost)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between items-center p-4 bg-primary/10 rounded-lg">
                      <div>
                        <p className="text-sm text-muted-foreground">Coût total</p>
                        <p className="text-xl font-bold">{formatCurrency(selectedTour.total_cost)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Recette</p>
                        <p className="text-xl font-bold text-primary">{formatCurrency(selectedTour.revenue || 0)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Bénéfice</p>
                        <p className="text-xl font-bold text-green-500">{formatCurrency(selectedTour.profit || 0)}</p>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="p-4 bg-muted/30 rounded-lg text-center text-muted-foreground">
                    <EyeOff className="w-5 h-5 mx-auto mb-2" />
                    <p className="text-sm">Données financières réservées à la Direction</p>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setSelectedTour(null)}>
                  Fermer
                </Button>
                <Button onClick={() => exportTourToPDF(selectedTour)} disabled={exporting}>
                  <Download className="w-4 h-4 mr-2" />
                  Exporter PDF
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Tour Dialog */}
      {editingTour && (
        <EditTourDialog
          open={!!editingTour}
          onOpenChange={(open) => !open && setEditingTour(null)}
          tour={editingTour}
          onUpdate={updateTour}
          clients={clients}
          drivers={allDrivers}
          vehicles={vehicles}
          trailers={trailers}
        />
      )}
    </div>
  );
}
