import { useState, useMemo, lazy, Suspense, useRef, useCallback, useEffect } from 'react';
import { 
  Truck, 
  Plus, 
  Edit2, 
  Trash2, 
  Wrench,
  CircleDollarSign,
  Fuel,
  Gauge,
  Calendar,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Check,
  X,
  Settings2,
  Calculator,
  TrendingUp,
  Container,
  TrendingDown,
  Clock,
  Search,
  FileBarChart,
  Upload,
  Download,
  Filter,
  Lock,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useApp } from '@/context/AppContext';
import { useLicense } from '@/hooks/useLicense';
import { useCompanyData } from '@/hooks/useCompanyData';
import { useCloudVehicles } from '@/hooks/useCloudVehicles';
import { useCloudTrailers } from '@/hooks/useCloudTrailers';
import { SharedDataBadge } from '@/components/shared/SharedDataBadge';
import { DataOwnershipFilter, type OwnershipFilter } from '@/components/shared/DataOwnershipFilter';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import type { 
  Vehicle, 
  VehicleMaintenance, 
  VehicleTire,
} from '@/types/vehicle';
import { 
  defaultVehicle, 
  maintenanceTypes, 
  vehicleTypes, 
  fuelTypes, 
  tirePositions,
  generateVehicleId,
  depreciationMethods
} from '@/types/vehicle';
import type { Trailer } from '@/types/trailer';
import type { FixedCharge } from '@/types';
import { TrailerDialog } from '@/components/vehicles/TrailerDialog';
import { DepreciationReport } from '@/components/vehicles/DepreciationReport';
import { calculateVehicleCosts, calculateTrailerCosts, formatCostPerKm, getCostPerKmColor } from '@/hooks/useVehicleCost';
import { toast } from 'sonner';
import { parseExcelFile } from '@/utils/excelImport';
import * as XLSX from 'xlsx';
import { FeatureGate } from '@/components/license/FeatureGate';

// Lazy load VehicleReports
const VehicleReportsContent = lazy(() => import('./VehicleReports'));

// Component to show locked feature overlay
function LockedFeatureOverlay({ featureName, onUpgrade }: { featureName: string; onUpgrade: () => void }) {
  return (
    <div className="relative">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-10 rounded-lg">
        <div className="text-center space-y-3 p-6">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium text-foreground">{featureName}</p>
            <p className="text-sm text-muted-foreground">
              Disponible avec l'add-on Gestion flotte avancée
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={onUpgrade} className="gap-2">
            <Sparkles className="w-4 h-4" />
            Débloquer cette fonctionnalité
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function Vehicles() {
  const navigate = useNavigate();
  const { vehicle: vehicleParams, setCharges } = useApp();
  const { hasFeature, planType } = useLicense();
  const { getVehicleInfo, getTrailerInfo, isOwnData, isCompanyMember } = useCompanyData();
  
  // Use cloud hooks instead of localStorage for team sharing
  const { vehicles, loading: vehiclesLoading, createVehicle, updateVehicle, deleteVehicle } = useCloudVehicles();
  const { trailers, loading: trailersLoading, createTrailer, updateTrailer, deleteTrailer } = useCloudTrailers();
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Vehicle>>({});
  const [activeFormTab, setActiveFormTab] = useState('info');
  const [trailerDialogOpen, setTrailerDialogOpen] = useState(false);
  const [editingTrailer, setEditingTrailer] = useState<Trailer | null>(null);
  const [mainTab, setMainTab] = useState<'vehicles' | 'trailers' | 'reports'>('vehicles');
  const [vehicleSearch, setVehicleSearch] = useState('');
  const [trailerSearch, setTrailerSearch] = useState('');
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState<string>('all');
  const [vehicleOwnershipFilter, setVehicleOwnershipFilter] = useState<OwnershipFilter>('all');
  const [trailerOwnershipFilter, setTrailerOwnershipFilter] = useState<OwnershipFilter>('all');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check if user has fleet management (depreciation, maintenance, tires, consumption)
  const hasFleetManagement = hasFeature('fleet_management') || planType === 'pro' || planType === 'enterprise';

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value);

  const formatNumber = (value: number) => 
    new Intl.NumberFormat('fr-FR').format(value);

  // Calculate costs for a vehicle
  const getVehicleCostBreakdown = (v: Vehicle) => {
    return calculateVehicleCosts(v, {
      fuelPriceHT: vehicleParams.fuelPriceHT,
      adBluePriceHT: vehicleParams.adBluePriceHT,
    });
  };

  const handleAdd = () => {
    setIsAdding(true);
    setFormData({
      ...defaultVehicle,
      maintenances: [
        {
          id: crypto.randomUUID(),
          type: 'mines',
          name: 'Contrôle technique',
          intervalKm: 100000,
          lastKm: 0,
          lastDate: new Date().toISOString().split('T')[0],
          cost: 250,
        },
        {
          id: crypto.randomUUID(),
          type: 'revision',
          name: 'Révision complète',
          intervalKm: 100000,
          lastKm: 0,
          lastDate: new Date().toISOString().split('T')[0],
          cost: 1500,
        },
        {
          id: crypto.randomUUID(),
          type: 'vidange',
          name: 'Vidange moteur',
          intervalKm: 40000,
          lastKm: 0,
          lastDate: new Date().toISOString().split('T')[0],
          cost: 400,
        },
      ],
      tires: [],
    });
    setActiveFormTab('info');
  };

  const handleEdit = (vehicle: Vehicle) => {
    setEditingId(vehicle.id);
    setFormData(vehicle);
    setActiveFormTab('info');
  };

  // Helper to add vehicle charges automatically
  const addVehicleCharges = (vehicle: Vehicle) => {
    const newCharges: FixedCharge[] = [];
    
    // Add leasing charge if > 0
    if (vehicle.monthlyLeasing > 0) {
      newCharges.push({
        id: `veh_leasing_${vehicle.id}`,
        name: `Crédit-bail ${vehicle.name}`,
        amount: vehicle.monthlyLeasing,
        isHT: false,
        periodicity: 'monthly',
        category: 'leasing',
      });
    }
    
    // Add insurance charge if > 0
    if (vehicle.insuranceCost > 0) {
      newCharges.push({
        id: `veh_insurance_${vehicle.id}`,
        name: `Assurance ${vehicle.name}`,
        amount: vehicle.insuranceCost,
        isHT: false,
        periodicity: 'yearly',
        category: 'insurance',
      });
    }
    
    // Add depreciation charge if applicable
    const costBreakdown = getVehicleCostBreakdown(vehicle);
    if (costBreakdown.depreciation && costBreakdown.depreciation.monthlyDepreciation > 0 && !costBreakdown.depreciation.isFullyDepreciated) {
      newCharges.push({
        id: `veh_depreciation_${vehicle.id}`,
        name: `Amortissement ${vehicle.name}`,
        amount: costBreakdown.depreciation.monthlyDepreciation,
        isHT: true,
        periodicity: 'monthly',
        category: 'other',
      });
    }
    
    if (newCharges.length > 0) {
      setCharges(prev => [...prev, ...newCharges]);
      toast.success(`${newCharges.length} charge(s) ajoutée(s) automatiquement`);
    }
  };

  // Helper to update vehicle charges when editing
  const updateVehicleCharges = (vehicle: Vehicle) => {
    setCharges(prev => {
      const otherCharges = prev.filter(c => 
        !c.id.startsWith(`veh_leasing_${vehicle.id}`) && 
        !c.id.startsWith(`veh_insurance_${vehicle.id}`) &&
        !c.id.startsWith(`veh_depreciation_${vehicle.id}`)
      );
      
      const newCharges: FixedCharge[] = [];
      
      if (vehicle.monthlyLeasing > 0) {
        newCharges.push({
          id: `veh_leasing_${vehicle.id}`,
          name: `Crédit-bail ${vehicle.name}`,
          amount: vehicle.monthlyLeasing,
          isHT: false,
          periodicity: 'monthly',
          category: 'leasing',
        });
      }
      
      if (vehicle.insuranceCost > 0) {
        newCharges.push({
          id: `veh_insurance_${vehicle.id}`,
          name: `Assurance ${vehicle.name}`,
          amount: vehicle.insuranceCost,
          isHT: false,
          periodicity: 'yearly',
          category: 'insurance',
        });
      }
      
      // Add depreciation charge if applicable
      const costBreakdown = getVehicleCostBreakdown(vehicle);
      if (costBreakdown.depreciation && costBreakdown.depreciation.monthlyDepreciation > 0 && !costBreakdown.depreciation.isFullyDepreciated) {
        newCharges.push({
          id: `veh_depreciation_${vehicle.id}`,
          name: `Amortissement ${vehicle.name}`,
          amount: costBreakdown.depreciation.monthlyDepreciation,
          isHT: true,
          periodicity: 'monthly',
          category: 'other',
        });
      }
      
      return [...otherCharges, ...newCharges];
    });
  };

  // Helper to remove vehicle charges when deleting
  const removeVehicleCharges = (vehicleId: string) => {
    setCharges(prev => prev.filter(c => 
      !c.id.startsWith(`veh_leasing_${vehicleId}`) && 
      !c.id.startsWith(`veh_insurance_${vehicleId}`) &&
      !c.id.startsWith(`veh_depreciation_${vehicleId}`)
    ));
  };

  const handleSave = async () => {
    if (isAdding) {
      const now = new Date().toISOString();
      const newVehicle: Vehicle = {
        id: generateVehicleId(),
        name: formData.name || 'Nouveau véhicule',
        licensePlate: formData.licensePlate || '',
        brand: formData.brand || '',
        model: formData.model || '',
        year: formData.year || new Date().getFullYear(),
        type: formData.type || 'tracteur',
        length: formData.length || 16.5,
        width: formData.width || 2.55,
        height: formData.height || 4,
        weight: formData.weight || 44000,
        axles: formData.axles || 5,
        fuelConsumption: formData.fuelConsumption || 32,
        fuelType: formData.fuelType || 'diesel',
        adBlueConsumption: formData.adBlueConsumption || 1.5,
        currentKm: formData.currentKm || 0,
        purchasePrice: formData.purchasePrice || 0,
        monthlyLeasing: formData.monthlyLeasing || 0,
        insuranceCost: formData.insuranceCost || 0,
        sinisterCharge: formData.sinisterCharge || 0,
        depreciationYears: formData.depreciationYears || 5,
        residualValue: formData.residualValue || 0,
        depreciationMethod: formData.depreciationMethod || 'linear',
        expectedLifetimeKm: formData.expectedLifetimeKm || 600000,
        maintenances: formData.maintenances || [],
        tires: formData.tires || [],
        createdAt: now,
        updatedAt: now,
        isActive: true,
        notes: formData.notes || '',
      };
      const success = await createVehicle(newVehicle);
      if (success) {
        addVehicleCharges(newVehicle);
        setIsAdding(false);
      }
    } else if (editingId) {
      const existingVehicle = vehicles.find(v => v.id === editingId);
      const updatedVehicle = { 
        ...existingVehicle,
        ...formData, 
        id: editingId, 
        updatedAt: new Date().toISOString() 
      } as Vehicle;
      const success = await updateVehicle(updatedVehicle);
      if (success) {
        updateVehicleCharges(updatedVehicle);
        setEditingId(null);
      }
    }
    setFormData({});
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
    setFormData({});
  };

  const handleDelete = async (id: string) => {
    const success = await deleteVehicle(id);
    if (success) {
      removeVehicleCharges(id);
    }
  };

  const addMaintenance = () => {
    const newMaintenance: VehicleMaintenance = {
      id: crypto.randomUUID(),
      type: 'other',
      name: '',
      intervalKm: 50000,
      lastKm: formData.currentKm || 0,
      lastDate: new Date().toISOString().split('T')[0],
      cost: 0,
    };
    setFormData({
      ...formData,
      maintenances: [...(formData.maintenances || []), newMaintenance],
    });
  };

  const updateMaintenance = (id: string, updates: Partial<VehicleMaintenance>) => {
    setFormData({
      ...formData,
      maintenances: formData.maintenances?.map(m => 
        m.id === id ? { ...m, ...updates } : m
      ),
    });
  };

  const removeMaintenance = (id: string) => {
    setFormData({
      ...formData,
      maintenances: formData.maintenances?.filter(m => m.id !== id),
    });
  };

  const addTire = () => {
    const newTire: VehicleTire = {
      brand: '',
      model: '',
      size: '315/80 R22.5',
      position: 'avant',
      pricePerUnit: 400,
      quantity: 2,
      durabilityKm: 150000,
      lastChangeKm: formData.currentKm || 0,
      lastChangeDate: new Date().toISOString().split('T')[0],
    };
    setFormData({
      ...formData,
      tires: [...(formData.tires || []), newTire],
    });
  };

  const updateTire = (index: number, updates: Partial<VehicleTire>) => {
    const newTires = [...(formData.tires || [])];
    newTires[index] = { ...newTires[index], ...updates };
    setFormData({ ...formData, tires: newTires });
  };

  const removeTire = (index: number) => {
    setFormData({
      ...formData,
      tires: formData.tires?.filter((_, i) => i !== index),
    });
  };

  const getMaintenanceProgress = (maintenance: VehicleMaintenance, currentKm: number) => {
    const kmSinceLast = currentKm - maintenance.lastKm;
    const progress = (kmSinceLast / maintenance.intervalKm) * 100;
    return Math.min(progress, 100);
  };

  const getMaintenanceStatus = (maintenance: VehicleMaintenance, currentKm: number): 'ok' | 'warning' | 'danger' => {
    const progress = getMaintenanceProgress(maintenance, currentKm);
    if (progress >= 100) return 'danger';
    if (progress >= 80) return 'warning';
    return 'ok';
  };

  const getTireProgress = (tire: VehicleTire, currentKm: number) => {
    const kmSinceLast = currentKm - tire.lastChangeKm;
    const progress = (kmSinceLast / tire.durabilityKm) * 100;
    return Math.min(progress, 100);
  };

  const renderForm = () => (
    <div className="glass-card p-6 space-y-6 opacity-0 animate-scale-in" style={{ animationFillMode: 'forwards' }}>
      {/* Upgrade banner for Start users */}
      {!hasFleetManagement && (
        <Alert className="border-amber-500/30 bg-amber-500/10">
          <Lock className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-700 dark:text-amber-400">
            <span className="font-medium">Version Start :</span> Les fonctionnalités avancées (amortissement, entretien, pneus, consommation) sont disponibles avec l'add-on Gestion flotte avancée.{' '}
            <Button variant="link" className="p-0 h-auto text-amber-600" onClick={() => navigate('/pricing')}>
              Voir les options →
            </Button>
          </AlertDescription>
        </Alert>
      )}
      
      <Tabs value={activeFormTab} onValueChange={(tab) => {
        // Block access to restricted tabs for Start users
        if (!hasFleetManagement && ['consumption', 'maintenance', 'tires'].includes(tab)) {
          toast.error('Cette fonctionnalité nécessite l\'add-on Gestion flotte avancée');
          return;
        }
        setActiveFormTab(tab);
      }}>
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="info">Infos générales</TabsTrigger>
          <TabsTrigger value="consumption" disabled={!hasFleetManagement} className={!hasFleetManagement ? 'opacity-50' : ''}>
            {!hasFleetManagement && <Lock className="w-3 h-3 mr-1" />}
            Consommation
          </TabsTrigger>
          <TabsTrigger value="maintenance" disabled={!hasFleetManagement} className={!hasFleetManagement ? 'opacity-50' : ''}>
            {!hasFleetManagement && <Lock className="w-3 h-3 mr-1" />}
            Entretiens
          </TabsTrigger>
          <TabsTrigger value="tires" disabled={!hasFleetManagement} className={!hasFleetManagement ? 'opacity-50' : ''}>
            {!hasFleetManagement && <Lock className="w-3 h-3 mr-1" />}
            Pneus
          </TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Nom du véhicule</Label>
              <Input
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Tracteur 1"
              />
            </div>
            <div className="space-y-2">
              <Label>Immatriculation</Label>
              <Input
                value={formData.licensePlate || ''}
                onChange={(e) => setFormData({ ...formData, licensePlate: e.target.value.toUpperCase() })}
                placeholder="AA-123-BB"
              />
            </div>
            <div className="space-y-2">
              <Label>Type de véhicule</Label>
              <Select 
                value={formData.type || 'semi-remorque'} 
                onValueChange={(value: Vehicle['type']) => setFormData({ ...formData, type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {vehicleTypes.map(type => (
                    <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Marque</Label>
              <Input
                value={formData.brand || ''}
                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                placeholder="Ex: Renault"
              />
            </div>
            <div className="space-y-2">
              <Label>Modèle</Label>
              <Input
                value={formData.model || ''}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                placeholder="Ex: T480"
              />
            </div>
            <div className="space-y-2">
              <Label>Année</Label>
              <Input
                type="number"
                value={formData.year || ''}
                onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label>Kilométrage actuel</Label>
              <Input
                type="number"
                value={formData.currentKm || ''}
                onChange={(e) => setFormData({ ...formData, currentKm: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <h3 className="text-sm font-medium text-muted-foreground mb-3">Dimensions & Poids</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="space-y-2">
                <Label>Longueur (m)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.length || ''}
                  onChange={(e) => setFormData({ ...formData, length: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Largeur (m)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.width || ''}
                  onChange={(e) => setFormData({ ...formData, width: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Hauteur (m)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.height || ''}
                  onChange={(e) => setFormData({ ...formData, height: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>PTAC (kg)</Label>
                <Input
                  type="number"
                  value={formData.weight || ''}
                  onChange={(e) => setFormData({ ...formData, weight: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Essieux</Label>
                <Input
                  type="number"
                  value={formData.axles || ''}
                  onChange={(e) => setFormData({ ...formData, axles: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <h3 className="text-sm font-medium text-muted-foreground mb-3">Coûts</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Prix d'achat (€)</Label>
                <Input
                  type="number"
                  value={formData.purchasePrice || ''}
                  onChange={(e) => setFormData({ ...formData, purchasePrice: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Leasing mensuel (€)</Label>
                <Input
                  type="number"
                  value={formData.monthlyLeasing || ''}
                  onChange={(e) => setFormData({ ...formData, monthlyLeasing: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Assurance annuelle (€)</Label>
                <Input
                  type="number"
                  value={formData.insuranceCost || ''}
                  onChange={(e) => setFormData({ ...formData, insuranceCost: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Charge sinistre annuelle (€)</Label>
                <Input
                  type="number"
                  value={formData.sinisterCharge || ''}
                  onChange={(e) => setFormData({ ...formData, sinisterCharge: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>
          </div>

          {/* Section Amortissement - Locked for Start users */}
          {hasFleetManagement ? (
            <div className="border-t border-border pt-4">
              <h3 className="text-sm font-medium text-muted-foreground mb-3">Amortissement</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Méthode d'amortissement</Label>
                  <Select 
                    value={formData.depreciationMethod || 'linear'} 
                    onValueChange={(value: Vehicle['depreciationMethod']) => setFormData({ ...formData, depreciationMethod: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {depreciationMethods.map(method => (
                        <SelectItem key={method.value} value={method.value}>
                          {method.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Durée (années)</Label>
                  <Input
                    type="number"
                    min="1"
                    max="20"
                    value={formData.depreciationYears || 5}
                    onChange={(e) => setFormData({ ...formData, depreciationYears: parseInt(e.target.value) || 5 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Valeur résiduelle (€)</Label>
                  <Input
                    type="number"
                    value={formData.residualValue || 0}
                    onChange={(e) => setFormData({ ...formData, residualValue: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Durée de vie (km)</Label>
                  <Input
                    type="number"
                    step="10000"
                    value={formData.expectedLifetimeKm || 600000}
                    onChange={(e) => setFormData({ ...formData, expectedLifetimeKm: parseInt(e.target.value) || 600000 })}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {depreciationMethods.find(m => m.value === (formData.depreciationMethod || 'linear'))?.description}
              </p>
            </div>
          ) : (
            <div className="border-t border-border pt-4 relative">
              <div className="absolute inset-0 bg-background/80 backdrop-blur-[2px] flex items-center justify-center z-10 rounded-lg">
                <div className="text-center space-y-2 p-4">
                  <Lock className="w-8 h-8 text-muted-foreground mx-auto" />
                  <p className="text-sm font-medium">Amortissement</p>
                  <p className="text-xs text-muted-foreground">Add-on Gestion flotte avancée requis</p>
                  <Button variant="outline" size="sm" onClick={() => navigate('/pricing')}>
                    <Sparkles className="w-3 h-3 mr-1" />
                    Débloquer
                  </Button>
                </div>
              </div>
              <h3 className="text-sm font-medium text-muted-foreground mb-3 opacity-30">Amortissement</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 opacity-30 pointer-events-none">
                <div className="space-y-2">
                  <Label>Méthode d'amortissement</Label>
                  <Select value="linear" disabled>
                    <SelectTrigger><SelectValue placeholder="Linéaire" /></SelectTrigger>
                    <SelectContent><SelectItem value="linear">Linéaire</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Durée (années)</Label>
                  <Input type="number" value={5} disabled />
                </div>
                <div className="space-y-2">
                  <Label>Valeur résiduelle (€)</Label>
                  <Input type="number" value={0} disabled />
                </div>
                <div className="space-y-2">
                  <Label>Durée de vie (km)</Label>
                  <Input type="number" value={600000} disabled />
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Notes additionnelles..."
              rows={2}
            />
          </div>
        </TabsContent>

        <TabsContent value="consumption" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Type de carburant</Label>
              <Select 
                value={formData.fuelType || 'diesel'} 
                onValueChange={(value: Vehicle['fuelType']) => setFormData({ ...formData, fuelType: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {fuelTypes.map(type => (
                    <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Consommation carburant (L/100km)</Label>
              <Input
                type="number"
                step="0.1"
                value={formData.fuelConsumption || ''}
                onChange={(e) => setFormData({ ...formData, fuelConsumption: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label>Consommation AdBlue (L/100km)</Label>
              <Input
                type="number"
                step="0.1"
                value={formData.adBlueConsumption || ''}
                onChange={(e) => setFormData({ ...formData, adBlueConsumption: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="maintenance" className="space-y-4 mt-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-medium">Entretiens kilométriques</h3>
            <Button variant="outline" size="sm" onClick={addMaintenance}>
              <Plus className="w-4 h-4 mr-2" />
              Ajouter un entretien
            </Button>
          </div>

          <div className="space-y-4">
            {formData.maintenances?.map((maintenance) => (
              <div key={maintenance.id} className="border border-border rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Type</Label>
                      <Select 
                        value={maintenance.type} 
                        onValueChange={(value: VehicleMaintenance['type']) => updateMaintenance(maintenance.id, { type: value })}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {maintenanceTypes.map(type => (
                            <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Nom</Label>
                      <Input
                        className="h-9"
                        value={maintenance.name}
                        onChange={(e) => updateMaintenance(maintenance.id, { name: e.target.value })}
                        placeholder="Nom de l'entretien"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Intervalle (km)</Label>
                      <Input
                        className="h-9"
                        type="number"
                        value={maintenance.intervalKm}
                        onChange={(e) => updateMaintenance(maintenance.id, { intervalKm: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Coût moyen (€)</Label>
                      <Input
                        className="h-9"
                        type="number"
                        value={maintenance.cost}
                        onChange={(e) => updateMaintenance(maintenance.id, { cost: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="ml-2 text-destructive"
                    onClick={() => removeMaintenance(maintenance.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Dernier km effectué</Label>
                    <Input
                      className="h-9"
                      type="number"
                      value={maintenance.lastKm}
                      onChange={(e) => updateMaintenance(maintenance.id, { lastKm: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Date du dernier entretien</Label>
                    <Input
                      className="h-9"
                      type="date"
                      value={maintenance.lastDate}
                      onChange={(e) => updateMaintenance(maintenance.id, { lastDate: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="tires" className="space-y-4 mt-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-medium">Gestion des pneumatiques</h3>
            <Button variant="outline" size="sm" onClick={addTire}>
              <Plus className="w-4 h-4 mr-2" />
              Ajouter des pneus
            </Button>
          </div>

          <div className="space-y-4">
            {formData.tires?.map((tire, index) => (
              <div key={index} className="border border-border rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Marque</Label>
                      <Input
                        className="h-9"
                        value={tire.brand}
                        onChange={(e) => updateTire(index, { brand: e.target.value })}
                        placeholder="Michelin, Continental..."
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Modèle</Label>
                      <Input
                        className="h-9"
                        value={tire.model}
                        onChange={(e) => updateTire(index, { model: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Dimension</Label>
                      <Input
                        className="h-9"
                        value={tire.size}
                        onChange={(e) => updateTire(index, { size: e.target.value })}
                        placeholder="315/80 R22.5"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Position</Label>
                      <Select 
                        value={tire.position} 
                        onValueChange={(value: VehicleTire['position']) => updateTire(index, { position: value })}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {tirePositions.map(pos => (
                            <SelectItem key={pos.value} value={pos.value}>{pos.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="ml-2 text-destructive"
                    onClick={() => removeTire(index)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Prix unitaire (€)</Label>
                    <Input
                      className="h-9"
                      type="number"
                      value={tire.pricePerUnit}
                      onChange={(e) => updateTire(index, { pricePerUnit: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Quantité</Label>
                    <Input
                      className="h-9"
                      type="number"
                      value={tire.quantity}
                      onChange={(e) => updateTire(index, { quantity: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Durabilité (km)</Label>
                    <Input
                      className="h-9"
                      type="number"
                      value={tire.durabilityKm}
                      onChange={(e) => updateTire(index, { durabilityKm: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Dernier changement (km)</Label>
                    <Input
                      className="h-9"
                      type="number"
                      value={tire.lastChangeKm}
                      onChange={(e) => updateTire(index, { lastChangeKm: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end gap-3 pt-4 border-t border-border">
        <Button variant="outline" onClick={handleCancel}>
          <X className="w-4 h-4 mr-2" />
          Annuler
        </Button>
        <Button variant="gradient" onClick={handleSave}>
          <Check className="w-4 h-4 mr-2" />
          Enregistrer
        </Button>
      </div>
    </div>
  );

  const renderVehicleCard = (vehicle: Vehicle, index: number) => {
    const isExpanded = expandedId === vehicle.id;
    const urgentMaintenances = vehicle.maintenances.filter(
      m => getMaintenanceStatus(m, vehicle.currentKm) !== 'ok'
    );
    const costBreakdown = getVehicleCostBreakdown(vehicle);
    const costColor = getCostPerKmColor(costBreakdown.totalCostPerKm);
    
    // Get shared data info
    const vehicleInfo = getVehicleInfo(vehicle.id);
    const isShared = !!vehicleInfo?.licenseId;
    const isOwn = vehicleInfo ? isOwnData(vehicleInfo.userId) : true;

    return (
      <div
        key={vehicle.id}
        className="glass-card p-6 opacity-0 animate-slide-up"
        style={{ animationDelay: `${index * 100}ms`, animationFillMode: 'forwards' }}
      >
        {editingId === vehicle.id ? (
          renderForm()
        ) : (
          <>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                  <Truck className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-foreground">{vehicle.name}</h3>
                    {isCompanyMember && (
                      <TooltipProvider>
                        <SharedDataBadge 
                          isShared={isShared}
                          isOwn={isOwn}
                          isFormerMember={vehicleInfo?.isFormerMember}
                          createdBy={vehicleInfo?.displayName}
                          createdByEmail={vehicleInfo?.userEmail}
                          compact
                        />
                      </TooltipProvider>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className="font-mono text-sm font-semibold bg-primary/10 text-primary border-primary/20">
                      {vehicle.licensePlate}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {vehicle.brand} {vehicle.model} • {vehicle.year}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {urgentMaintenances.length > 0 && (
                  <Badge variant="destructive" className="gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    {urgentMaintenances.length} entretien(s)
                  </Badge>
                )}
                <Button size="icon" variant="ghost" onClick={() => handleEdit(vehicle)}>
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => handleDelete(vehicle.id)}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </div>

            {/* Cost per KM highlight */}
            <div className="mb-4 p-3 rounded-lg bg-secondary/50 border border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-primary" />
                  <span className="font-medium">Coût kilométrique total</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "text-xl font-bold",
                    costColor === 'success' && "text-success",
                    costColor === 'warning' && "text-warning",
                    costColor === 'destructive' && "text-destructive"
                  )}>
                    {formatCostPerKm(costBreakdown.totalCostPerKm)}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mt-3 text-xs">
                <div className="text-center p-2 rounded bg-background/50">
                  <p className="text-muted-foreground">Carburant</p>
                  <p className="font-medium">{formatCostPerKm(costBreakdown.fuelCostPerKm)}</p>
                </div>
                <div className="text-center p-2 rounded bg-background/50">
                  <p className="text-muted-foreground">AdBlue</p>
                  <p className="font-medium">{formatCostPerKm(costBreakdown.adBlueCostPerKm)}</p>
                </div>
                <div className="text-center p-2 rounded bg-background/50">
                  <p className="text-muted-foreground">Entretien</p>
                  <p className="font-medium">{formatCostPerKm(costBreakdown.maintenanceCostPerKm)}</p>
                </div>
                <div className="text-center p-2 rounded bg-background/50">
                  <p className="text-muted-foreground">Pneus</p>
                  <p className="font-medium">{formatCostPerKm(costBreakdown.tireCostPerKm)}</p>
                </div>
                <div className="text-center p-2 rounded bg-background/50">
                  <p className="text-muted-foreground">Fixes</p>
                  <p className="font-medium">{formatCostPerKm(costBreakdown.fixedCostPerKm)}</p>
                </div>
              </div>
              {/* Depreciation per km */}
              {costBreakdown.depreciation && (
                <div className="text-center p-2 rounded bg-background/50">
                  <p className="text-muted-foreground">Amort.</p>
                  <p className="font-medium">{formatCostPerKm(costBreakdown.depreciationCostPerKm)}</p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
              <div className="flex items-center gap-2">
                <Gauge className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-muted-foreground">Kilométrage</p>
                  <p className="font-medium">{formatNumber(vehicle.currentKm)} km</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Fuel className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-muted-foreground">Consommation</p>
                  <p className="font-medium">{vehicle.fuelConsumption} L/100km</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-muted-foreground">Coûts annuels</p>
                  <p className="font-medium">{formatCurrency(costBreakdown.totalAnnualFixedCost)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-muted-foreground">Type</p>
                  <p className="font-medium capitalize">{vehicle.type}</p>
                </div>
              </div>
            </div>

            {/* Depreciation Details */}
            {costBreakdown.depreciation && (
              <div className="mb-4 p-3 rounded-lg bg-primary/5 border border-primary/20">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingDown className="w-4 h-4 text-primary" />
                  <span className="font-medium text-sm">Amortissement</span>
                  {costBreakdown.depreciation.isFullyDepreciated && (
                    <Badge variant="outline" className="text-xs">Amorti</Badge>
                  )}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Valeur comptable</p>
                    <p className="font-semibold text-primary">
                      {formatCurrency(costBreakdown.depreciation.currentBookValue)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Amort. annuel</p>
                    <p className="font-medium">
                      {formatCurrency(costBreakdown.depreciation.annualDepreciation)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Amort. mensuel</p>
                    <p className="font-medium">
                      {formatCurrency(costBreakdown.depreciation.monthlyDepreciation)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Années restantes</p>
                      <p className="font-medium">
                        {costBreakdown.depreciation.remainingYears} an(s)
                      </p>
                    </div>
                  </div>
                </div>
                {/* Progress bar */}
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>Progression</span>
                    <span>
                      {Math.round((costBreakdown.depreciation.totalDepreciated / (vehicle.purchasePrice - (vehicle.residualValue || 0))) * 100)}%
                    </span>
                  </div>
                  <Progress 
                    value={(costBreakdown.depreciation.totalDepreciated / (vehicle.purchasePrice - (vehicle.residualValue || 0))) * 100} 
                    className="h-2"
                  />
                </div>
              </div>
            )}

            <Button 
              variant="ghost" 
              className="w-full justify-between"
              onClick={() => setExpandedId(isExpanded ? null : vehicle.id)}
            >
              <span className="text-sm text-muted-foreground">
                {vehicle.maintenances.length} entretien(s) • {vehicle.tires.length} groupe(s) de pneus
              </span>
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>

            {isExpanded && (
              <div className="mt-4 pt-4 border-t border-border space-y-4 animate-fade-in">
                {/* Maintenances */}
                <div>
                  <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                    <Wrench className="w-4 h-4" />
                    Entretiens
                  </h4>
                  <div className="space-y-3">
                    {vehicle.maintenances.map((m) => {
                      const progress = getMaintenanceProgress(m, vehicle.currentKm);
                      const status = getMaintenanceStatus(m, vehicle.currentKm);
                      const kmRemaining = m.intervalKm - (vehicle.currentKm - m.lastKm);
                      
                      return (
                        <div key={m.id} className="flex items-center gap-3">
                          <div className="flex-1">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-sm font-medium">{m.name || maintenanceTypes.find(t => t.value === m.type)?.label}</span>
                              <span className={cn(
                                "text-xs",
                                status === 'ok' && "text-success",
                                status === 'warning' && "text-warning",
                                status === 'danger' && "text-destructive"
                              )}>
                                {kmRemaining > 0 ? `${formatNumber(kmRemaining)} km restants` : 'À effectuer'}
                              </span>
                            </div>
                            <Progress 
                              value={progress} 
                              className={cn(
                                "h-2",
                                status === 'warning' && "[&>div]:bg-warning",
                                status === 'danger' && "[&>div]:bg-destructive"
                              )}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Pneus */}
                {vehicle.tires.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Pneumatiques
                    </h4>
                    <div className="space-y-3">
                      {vehicle.tires.map((tire, idx) => {
                        const progress = getTireProgress(tire, vehicle.currentKm);
                        const kmRemaining = tire.durabilityKm - (vehicle.currentKm - tire.lastChangeKm);
                        
                        return (
                          <div key={idx} className="flex items-center gap-3">
                            <div className="flex-1">
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-sm">
                                  {tire.brand} {tire.model} ({tire.position}) - {tire.quantity}x
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {kmRemaining > 0 ? `${formatNumber(kmRemaining)} km restants` : 'À changer'}
                                </span>
                              </div>
                              <Progress 
                                value={progress} 
                                className={cn(
                                  "h-2",
                                  progress >= 80 && progress < 100 && "[&>div]:bg-warning",
                                  progress >= 100 && "[&>div]:bg-destructive"
                                )}
                              />
                              <p className="text-xs text-muted-foreground mt-1">
                                Coût: {formatCurrency(tire.pricePerUnit * tire.quantity)}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  // Helper to add trailer charges automatically
  const addTrailerCharges = (trailer: Trailer) => {
    const newCharges: FixedCharge[] = [];
    
    if (trailer.monthlyLeasing > 0) {
      newCharges.push({
        id: `trl_leasing_${trailer.id}`,
        name: `Crédit-bail ${trailer.name}`,
        amount: trailer.monthlyLeasing,
        isHT: false,
        periodicity: 'monthly',
        category: 'leasing',
      });
    }
    
    if (trailer.insuranceCost > 0) {
      newCharges.push({
        id: `trl_insurance_${trailer.id}`,
        name: `Assurance ${trailer.name}`,
        amount: trailer.insuranceCost,
        isHT: false,
        periodicity: 'yearly',
        category: 'insurance',
      });
    }
    
    // Add depreciation charge if applicable
    const costBreakdown = calculateTrailerCosts(trailer, {});
    if (costBreakdown.depreciation && costBreakdown.depreciation.monthlyDepreciation > 0 && !costBreakdown.depreciation.isFullyDepreciated) {
      newCharges.push({
        id: `trl_depreciation_${trailer.id}`,
        name: `Amortissement ${trailer.name}`,
        amount: costBreakdown.depreciation.monthlyDepreciation,
        isHT: true,
        periodicity: 'monthly',
        category: 'other',
      });
    }
    
    if (newCharges.length > 0) {
      setCharges(prev => [...prev, ...newCharges]);
      toast.success(`${newCharges.length} charge(s) ajoutée(s) automatiquement`);
    }
  };

  // Helper to update trailer charges when editing
  const updateTrailerCharges = (trailer: Trailer) => {
    setCharges(prev => {
      const otherCharges = prev.filter(c => 
        !c.id.startsWith(`trl_leasing_${trailer.id}`) && 
        !c.id.startsWith(`trl_insurance_${trailer.id}`) &&
        !c.id.startsWith(`trl_depreciation_${trailer.id}`)
      );
      
      const newCharges: FixedCharge[] = [];
      
      if (trailer.monthlyLeasing > 0) {
        newCharges.push({
          id: `trl_leasing_${trailer.id}`,
          name: `Crédit-bail ${trailer.name}`,
          amount: trailer.monthlyLeasing,
          isHT: false,
          periodicity: 'monthly',
          category: 'leasing',
        });
      }
      
      if (trailer.insuranceCost > 0) {
        newCharges.push({
          id: `trl_insurance_${trailer.id}`,
          name: `Assurance ${trailer.name}`,
          amount: trailer.insuranceCost,
          isHT: false,
          periodicity: 'yearly',
          category: 'insurance',
        });
      }
      
      // Add depreciation charge if applicable
      const costBreakdown = calculateTrailerCosts(trailer, {});
      if (costBreakdown.depreciation && costBreakdown.depreciation.monthlyDepreciation > 0 && !costBreakdown.depreciation.isFullyDepreciated) {
        newCharges.push({
          id: `trl_depreciation_${trailer.id}`,
          name: `Amortissement ${trailer.name}`,
          amount: costBreakdown.depreciation.monthlyDepreciation,
          isHT: true,
          periodicity: 'monthly',
          category: 'other',
        });
      }
      
      return [...otherCharges, ...newCharges];
    });
  };

  // Helper to remove trailer charges when deleting
  const removeTrailerCharges = (trailerId: string) => {
    setCharges(prev => prev.filter(c => 
      !c.id.startsWith(`trl_leasing_${trailerId}`) && 
      !c.id.startsWith(`trl_insurance_${trailerId}`) &&
      !c.id.startsWith(`trl_depreciation_${trailerId}`)
    ));
  };

  const handleSaveTrailer = async (trailer: Trailer) => {
    if (editingTrailer) {
      const success = await updateTrailer(trailer);
      if (success) {
        updateTrailerCharges(trailer);
      }
    } else {
      const success = await createTrailer(trailer);
      if (success) {
        addTrailerCharges(trailer);
      }
    }
    setEditingTrailer(null);
  };

  const handleEditTrailer = (trailer: Trailer) => {
    setEditingTrailer(trailer);
    setTrailerDialogOpen(true);
  };

  const handleDeleteTrailer = async (id: string) => {
    const success = await deleteTrailer(id);
    if (success) {
      removeTrailerCharges(id);
    }
  };

  // Synchronize all depreciation charges for vehicles and trailers
  const syncAllDepreciationCharges = () => {
    let chargesAdded = 0;
    let chargesUpdated = 0;
    
    setCharges(prev => {
      // Remove all existing depreciation charges
      const otherCharges = prev.filter(c => 
        !c.id.includes('_depreciation_')
      );
      
      const newDepreciationCharges: FixedCharge[] = [];
      
      // Add depreciation charges for all vehicles
      for (const v of vehicles) {
        const costBreakdown = getVehicleCostBreakdown(v);
        if (costBreakdown.depreciation && costBreakdown.depreciation.monthlyDepreciation > 0 && !costBreakdown.depreciation.isFullyDepreciated) {
          const existingCharge = prev.find(c => c.id === `veh_depreciation_${v.id}`);
          if (existingCharge) {
            chargesUpdated++;
          } else {
            chargesAdded++;
          }
          newDepreciationCharges.push({
            id: `veh_depreciation_${v.id}`,
            name: `Amortissement ${v.name}`,
            amount: costBreakdown.depreciation.monthlyDepreciation,
            isHT: true,
            periodicity: 'monthly',
            category: 'other',
          });
        }
      }
      
      // Add depreciation charges for all trailers
      for (const t of trailers) {
        const costBreakdown = calculateTrailerCosts(t, {});
        if (costBreakdown.depreciation && costBreakdown.depreciation.monthlyDepreciation > 0 && !costBreakdown.depreciation.isFullyDepreciated) {
          const existingCharge = prev.find(c => c.id === `trl_depreciation_${t.id}`);
          if (existingCharge) {
            chargesUpdated++;
          } else {
            chargesAdded++;
          }
          newDepreciationCharges.push({
            id: `trl_depreciation_${t.id}`,
            name: `Amortissement ${t.name}`,
            amount: costBreakdown.depreciation.monthlyDepreciation,
            isHT: true,
            periodicity: 'monthly',
            category: 'other',
          });
        }
      }
      
      return [...otherCharges, ...newDepreciationCharges];
    });
    
    if (chargesAdded > 0 || chargesUpdated > 0) {
      toast.success(`Synchronisation terminée : ${chargesAdded} charge(s) ajoutée(s), ${chargesUpdated} mise(s) à jour`);
    } else {
      toast.info('Aucune charge d\'amortissement à synchroniser');
    }
  };

  const formatTrailerType = (type: string) => {
    const types: Record<string, string> = {
      tautliner: 'Tautliner',
      fourgon: 'Fourgon',
      benne: 'Benne',
      frigo: 'Frigorifique',
      citerne: 'Citerne',
      plateau: 'Plateau',
      porte_engins: 'Porte-engins',
      other: 'Autre',
    };
    return types[type] || type;
  };

  // Filter vehicles and trailers based on search and type
  const filteredVehicles = useMemo(() => {
    let result = vehicles;
    
    // Filter by type
    if (vehicleTypeFilter !== 'all') {
      result = result.filter(v => v.type === vehicleTypeFilter);
    }
    
    // Filter by search
    if (vehicleSearch.trim()) {
      const search = vehicleSearch.toLowerCase().trim();
      result = result.filter(v => 
        v.licensePlate.toLowerCase().includes(search) ||
        v.name.toLowerCase().includes(search) ||
        v.brand?.toLowerCase().includes(search) ||
        v.model?.toLowerCase().includes(search)
      );
    }
    
    // Filter by ownership
    if (vehicleOwnershipFilter !== 'all' && isCompanyMember) {
      result = result.filter(v => {
        const vehicleInfo = getVehicleInfo(v.id);
        const isOwn = vehicleInfo ? isOwnData(vehicleInfo.userId) : true;
        if (vehicleOwnershipFilter === 'mine') return isOwn;
        if (vehicleOwnershipFilter === 'team') return !isOwn;
        return true;
      });
    }
    
    return result;
  }, [vehicles, vehicleSearch, vehicleTypeFilter, vehicleOwnershipFilter, isCompanyMember, getVehicleInfo, isOwnData]);

  const filteredTrailers = useMemo(() => {
    let result = trailers;
    
    // Filter by search
    if (trailerSearch.trim()) {
      const search = trailerSearch.toLowerCase().trim();
      result = result.filter(t => 
        t.licensePlate.toLowerCase().includes(search) ||
        t.name.toLowerCase().includes(search) ||
        t.brand?.toLowerCase().includes(search) ||
        t.model?.toLowerCase().includes(search)
      );
    }
    
    // Filter by ownership
    if (trailerOwnershipFilter !== 'all' && isCompanyMember) {
      result = result.filter(t => {
        const trailerInfo = getTrailerInfo(t.id);
        const isOwn = trailerInfo ? isOwnData(trailerInfo.userId) : true;
        if (trailerOwnershipFilter === 'mine') return isOwn;
        if (trailerOwnershipFilter === 'team') return !isOwn;
        return true;
      });
    }
    
    return result;
  }, [trailers, trailerSearch, trailerOwnershipFilter, isCompanyMember, getTrailerInfo, isOwnData]);

  // Vehicle statistics
  const vehicleStats = useMemo(() => {
    if (vehicles.length === 0) return null;
    
    const totalKm = vehicles.reduce((sum, v) => sum + (v.currentKm || 0), 0);
    const costs = vehicles.map(v => calculateVehicleCosts(v, {
      fuelPriceHT: vehicleParams.fuelPriceHT,
      adBluePriceHT: vehicleParams.adBluePriceHT,
    }));
    const avgCostPerKm = costs.reduce((sum, c) => sum + c.totalCostPerKm, 0) / costs.length;
    
    const maintenanceAlerts = vehicles.reduce((count, v) => {
      const urgentCount = v.maintenances.filter(m => {
        const progress = ((v.currentKm - m.lastKm) / m.intervalKm) * 100;
        return progress >= 80;
      }).length;
      return count + urgentCount;
    }, 0);
    
    const typeBreakdown = vehicleTypes.map(type => ({
      type: type.value,
      label: type.label,
      count: vehicles.filter(v => v.type === type.value).length
    })).filter(t => t.count > 0);
    
    return { totalKm, avgCostPerKm, maintenanceAlerts, typeBreakdown };
  }, [vehicles, vehicleParams.fuelPriceHT, vehicleParams.adBluePriceHT]);

  // Trailer statistics
  const trailerStats = useMemo(() => {
    if (trailers.length === 0) return null;
    
    const totalKm = trailers.reduce((sum, t) => sum + (t.currentKm || 0), 0);
    const costs = trailers.map(t => calculateTrailerCosts(t, {}));
    const avgCostPerKm = costs.reduce((sum, c) => sum + c.totalCostPerKm, 0) / costs.length;
    
    const maintenanceAlerts = trailers.reduce((count, t) => {
      const urgentCount = (t.maintenances || []).filter(m => {
        const progress = ((t.currentKm - m.lastKm) / m.intervalKm) * 100;
        return progress >= 80;
      }).length;
      return count + urgentCount;
    }, 0);
    
    return { totalKm, avgCostPerKm, maintenanceAlerts };
  }, [trailers]);

  const normalizeVehicleType = (type: string): Vehicle['type'] | null => {
    if (!type) return null;
    const lower = type.toLowerCase().trim();
    if (['tracteur', 'tractor'].includes(lower)) return 'tracteur';
    if (['porteur', 'carrier'].includes(lower)) return 'porteur';
    if (['fourgon', 'van'].includes(lower)) return 'fourgon';
    return 'other';
  };

  const normalizeFuelType = (type: string): Vehicle['fuelType'] | null => {
    if (!type) return null;
    const lower = type.toLowerCase().trim();
    if (['diesel', 'gazole'].includes(lower)) return 'diesel';
    if (['b100', 'bio'].includes(lower)) return 'b100';
    if (['gnv', 'gaz'].includes(lower)) return 'gnv';
    if (['electrique', 'electric'].includes(lower)) return 'electric';
    return 'diesel';
  };

  const downloadFleetTemplate = () => {
    const wb = XLSX.utils.book_new();
    
    // === VÉHICULES ===
    // Headers with clear French names
    const vehicleHeaders = [
      'Nom *',
      'Immatriculation *',
      'Type *',
      'Marque',
      'Modèle',
      'Année',
      'Kilométrage *',
      'Consommation (L/100km) *',
      'Carburant',
      'AdBlue (L/100km)',
      'Leasing mensuel (€)',
      'Assurance annuelle (€)',
      'Prix achat (€)',
      'Notes'
    ];
    
    // Example row for vehicles
    const vehicleExample = [
      'Mon Tracteur',
      'AB-123-CD',
      'tracteur',
      'Renault',
      'T480',
      2022,
      150000,
      32,
      'diesel',
      1.5,
      1200,
      3500,
      120000,
      ''
    ];
    
    // Empty rows for user to fill
    const vehicleData = [vehicleHeaders, vehicleExample];
    for (let i = 0; i < 20; i++) {
      vehicleData.push(['', '', '', '', '', '', '', '', '', '', '', '', '', '']);
    }
    
    const wsVehicles = XLSX.utils.aoa_to_sheet(vehicleData);
    wsVehicles['!cols'] = [
      { wch: 18 }, { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
      { wch: 8 }, { wch: 14 }, { wch: 22 }, { wch: 12 }, { wch: 18 },
      { wch: 18 }, { wch: 20 }, { wch: 16 }, { wch: 25 }
    ];

    // === REMORQUES ===
    const trailerHeaders = [
      'Nom *',
      'Immatriculation *',
      'Type *',
      'Marque',
      'Modèle',
      'Année',
      'Kilométrage *',
      'Longueur (m)',
      'Largeur (m)',
      'Hauteur (m)',
      'Charge utile (kg)',
      'Volume (m³)',
      'Leasing mensuel (€)',
      'Assurance annuelle (€)',
      'Notes'
    ];
    
    const trailerExample = [
      'Remorque 1',
      'EF-456-GH',
      'tautliner',
      'Krone',
      'Profi Liner',
      2021,
      80000,
      13.6,
      2.48,
      2.7,
      25000,
      90,
      800,
      2000,
      ''
    ];
    
    const trailerData = [trailerHeaders, trailerExample];
    for (let i = 0; i < 20; i++) {
      trailerData.push(['', '', '', '', '', '', '', '', '', '', '', '', '', '', '']);
    }
    
    const wsTrailers = XLSX.utils.aoa_to_sheet(trailerData);
    wsTrailers['!cols'] = [
      { wch: 18 }, { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 14 },
      { wch: 8 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 },
      { wch: 16 }, { wch: 14 }, { wch: 18 }, { wch: 20 }, { wch: 25 }
    ];

    // === AIDE ===
    const helpData = [
      ['GUIDE D\'UTILISATION'],
      [''],
      ['Les champs marqués d\'un * sont obligatoires'],
      [''],
      ['TYPES DE VÉHICULES :'],
      ['  tracteur, porteur, fourgon, autre'],
      [''],
      ['TYPES DE REMORQUES :'],
      ['  tautliner, fourgon, frigo, benne, citerne, plateau, autre'],
      [''],
      ['TYPES DE CARBURANT :'],
      ['  diesel, b100, gnv, electrique'],
      [''],
      ['INSTRUCTIONS :'],
      ['1. Remplissez la feuille "Véhicules" avec vos véhicules'],
      ['2. Remplissez la feuille "Remorques" avec vos remorques'],
      ['3. Une ligne d\'exemple est fournie - vous pouvez la supprimer ou la modifier'],
      ['4. Importez ce fichier dans l\'application'],
    ];
    
    const wsHelp = XLSX.utils.aoa_to_sheet(helpData);
    wsHelp['!cols'] = [{ wch: 60 }];

    XLSX.utils.book_append_sheet(wb, wsVehicles, 'Véhicules');
    XLSX.utils.book_append_sheet(wb, wsTrailers, 'Remorques');
    XLSX.utils.book_append_sheet(wb, wsHelp, 'Aide');
    
    const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'import_flotte.xlsx';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import both vehicles and trailers from Excel
  const handleFleetImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const workbook = await parseExcelFile(file);
      let vehiclesImported = 0;
      let trailersImported = 0;

      // Import vehicles
      const vehicleSheet = workbook.SheetNames.find(name => 
        name.toLowerCase().includes('véhicule') || name.toLowerCase().includes('vehicule')
      );
      
      if (vehicleSheet) {
        const sheet = workbook.Sheets[vehicleSheet];
        const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet);
        
        const importedVehicles: Vehicle[] = rows
          .filter(row => row['Nom *'] && row['Immatriculation *'])
          .map((row) => {
            const now = new Date().toISOString();
            return {
              id: generateVehicleId(),
              name: row['Nom *'] || '',
              licensePlate: (row['Immatriculation *'] || '').toUpperCase(),
              brand: row['Marque'] || '',
              model: row['Modèle'] || '',
              year: parseInt(row['Année']) || new Date().getFullYear(),
              type: normalizeVehicleType(row['Type *']) || 'tracteur',
              length: 16.5,
              width: 2.55,
              height: 4,
              weight: 44000,
              axles: 5,
              fuelConsumption: parseFloat(row['Consommation (L/100km) *']) || 32,
              fuelType: normalizeFuelType(row['Carburant']) || 'diesel',
              adBlueConsumption: parseFloat(row['AdBlue (L/100km)']) || 1.5,
              currentKm: parseInt(row['Kilométrage *']) || 0,
              purchasePrice: parseFloat(row['Prix achat (€)']) || 0,
              monthlyLeasing: parseFloat(row['Leasing mensuel (€)']) || 0,
              insuranceCost: parseFloat(row['Assurance annuelle (€)']) || 0,
              sinisterCharge: 0,
              depreciationYears: 5,
              residualValue: 0,
              depreciationMethod: 'linear',
              expectedLifetimeKm: 600000,
              maintenances: [],
              tires: [],
              createdAt: now,
              updatedAt: now,
              isActive: true,
              notes: row['Notes'] || '',
            };
          });

        if (importedVehicles.length > 0) {
          // Use cloud hooks for import
          for (const vehicle of importedVehicles) {
            await createVehicle(vehicle);
          }
          vehiclesImported = importedVehicles.length;
        }
      }

      // Import trailers
      const trailerSheet = workbook.SheetNames.find(name => 
        name.toLowerCase().includes('remorque')
      );
      
      if (trailerSheet) {
        const sheet = workbook.Sheets[trailerSheet];
        const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet);
        
        const importedTrailers: Trailer[] = rows
          .filter(row => row['Nom *'] && row['Immatriculation *'])
          .map((row) => {
            const now = new Date().toISOString();
            return {
              id: `trl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              name: row['Nom *'] || '',
              licensePlate: (row['Immatriculation *'] || '').toUpperCase(),
              brand: row['Marque'] || '',
              model: row['Modèle'] || '',
              year: parseInt(row['Année']) || new Date().getFullYear(),
              type: normalizeTrailerType(row['Type *']) || 'tautliner',
              length: parseFloat(row['Longueur (m)']) || 13.6,
              width: parseFloat(row['Largeur (m)']) || 2.48,
              height: parseFloat(row['Hauteur (m)']) || 2.7,
              weight: 8000,
              payload: parseInt(row['Charge utile (kg)']) || 25000,
              axles: 3,
              volume: parseFloat(row['Volume (m³)']) || 90,
              purchasePrice: 0,
              monthlyLeasing: parseFloat(row['Leasing mensuel (€)']) || 0,
              insuranceCost: parseFloat(row['Assurance annuelle (€)']) || 0,
              depreciationYears: 10,
              residualValue: 0,
              depreciationMethod: 'linear',
              expectedLifetimeKm: 800000,
              maintenances: [],
              tires: [],
              currentKm: parseInt(row['Kilométrage *']) || 0,
              createdAt: now,
              updatedAt: now,
              isActive: true,
              notes: row['Notes'] || '',
            };
          });

        if (importedTrailers.length > 0) {
          // Use cloud hooks for import
          for (const trailer of importedTrailers) {
            await createTrailer(trailer);
          }
          trailersImported = importedTrailers.length;
        }
      }

      if (vehiclesImported > 0 || trailersImported > 0) {
        toast.success(`Import réussi : ${vehiclesImported} véhicule(s), ${trailersImported} remorque(s)`);
      } else {
        toast.error('Aucune donnée valide trouvée. Vérifiez que les colonnes obligatoires (*) sont remplies.');
      }
    } catch (error) {
      toast.error('Erreur lors de l\'import du fichier');
    }
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const normalizeTrailerType = (type: string): Trailer['type'] | null => {
    if (!type) return null;
    const lower = type.toLowerCase().trim();
    if (['tautliner', 'bâché'].includes(lower)) return 'tautliner';
    if (['savoyarde'].includes(lower)) return 'savoyarde';
    if (['frigo', 'frigorifique', 'réfrigéré'].includes(lower)) return 'frigo';
    if (['benne', 'tipper'].includes(lower)) return 'benne';
    if (['citerne', 'tank'].includes(lower)) return 'citerne';
    if (['plateau', 'flatbed'].includes(lower)) return 'plateau';
    if (['porte-conteneur', 'conteneur', 'container'].includes(lower)) return 'porte-conteneur';
    return 'other';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Truck className="w-8 h-8 text-primary" />
            Gestion de la flotte
          </h1>
          <p className="text-muted-foreground mt-1">
            Gérez véhicules, remorques et analysez leur rentabilité
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button 
            variant="outline" 
            onClick={syncAllDepreciationCharges}
            disabled={vehicles.length === 0 && trailers.length === 0}
          >
            <TrendingDown className="w-4 h-4 mr-2" />
            Sync amortissements
          </Button>
          <DepreciationReport vehicles={vehicles} trailers={trailers} />
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs value={mainTab} onValueChange={(v) => setMainTab(v as typeof mainTab)} className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="vehicles" className="gap-2">
            <Truck className="w-4 h-4" />
            Véhicules ({vehicles.length})
          </TabsTrigger>
          <TabsTrigger value="trailers" className="gap-2">
            <Container className="w-4 h-4" />
            Remorques ({trailers.length})
          </TabsTrigger>
          <TabsTrigger value="reports" className="gap-2">
            <FileBarChart className="w-4 h-4" />
            Rapports
          </TabsTrigger>
        </TabsList>

        {/* Vehicles Tab */}
        <TabsContent value="vehicles" className="space-y-6">
          {/* Hidden file input for Excel import */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFleetImport}
            accept=".xlsx,.xls"
            className="hidden"
          />

          {/* Vehicle Stats */}
          {vehicleStats && vehicles.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="glass-card">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Gauge className="w-4 h-4 text-primary" />
                    <span className="text-xs text-muted-foreground">Kilométrage total</span>
                  </div>
                  <p className="text-xl font-bold text-foreground">{formatNumber(vehicleStats.totalKm)} km</p>
                </CardContent>
              </Card>
              <Card className="glass-card">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <CircleDollarSign className="w-4 h-4 text-success" />
                    <span className="text-xs text-muted-foreground">Coût moyen/km</span>
                  </div>
                  <p className="text-xl font-bold text-foreground">{formatCostPerKm(vehicleStats.avgCostPerKm)}</p>
                </CardContent>
              </Card>
              <Card className="glass-card">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Wrench className={cn("w-4 h-4", vehicleStats.maintenanceAlerts > 0 ? "text-warning" : "text-muted-foreground")} />
                    <span className="text-xs text-muted-foreground">Alertes entretien</span>
                  </div>
                  <p className={cn("text-xl font-bold", vehicleStats.maintenanceAlerts > 0 ? "text-warning" : "text-foreground")}>
                    {vehicleStats.maintenanceAlerts}
                  </p>
                </CardContent>
              </Card>
              <Card className="glass-card">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Truck className="w-4 h-4 text-primary" />
                    <span className="text-xs text-muted-foreground">Répartition</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {vehicleStats.typeBreakdown.map(t => (
                      <Badge key={t.type} variant="outline" className="text-xs">
                        {t.label}: {t.count}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Search, Filter and Actions */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par plaque, nom, marque..."
                value={vehicleSearch}
                onChange={(e) => setVehicleSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            {isCompanyMember && (
              <DataOwnershipFilter
                value={vehicleOwnershipFilter}
                onChange={setVehicleOwnershipFilter}
              />
            )}
            <Select value={vehicleTypeFilter} onValueChange={setVehicleTypeFilter}>
              <SelectTrigger className="w-[160px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types</SelectItem>
                {vehicleTypes.map(type => (
                  <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <FeatureGate feature="btn_export_excel" showLockedIndicator={false}>
                <Button variant="outline" onClick={downloadFleetTemplate} title="Télécharger le modèle Excel">
                  <Download className="w-4 h-4" />
                </Button>
              </FeatureGate>
              <FeatureGate feature="btn_export_excel" showLockedIndicator={false}>
                <Button variant="outline" onClick={() => fileInputRef.current?.click()} title="Importer depuis Excel">
                  <Upload className="w-4 h-4 mr-2" />
                  Import
                </Button>
              </FeatureGate>
              <Button onClick={handleAdd} disabled={isAdding}>
                <Plus className="w-4 h-4 mr-2" />
                Ajouter
              </Button>
            </div>
          </div>

          {/* Add Form */}
          {isAdding && renderForm()}

          {/* Vehicles List */}
          {filteredVehicles.length > 0 ? (
            <div className="grid grid-cols-1 gap-6">
              {filteredVehicles.map((vehicle, index) => renderVehicleCard(vehicle, index))}
            </div>
          ) : vehicles.length > 0 ? (
            <div className="glass-card p-8 text-center">
              <Search className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <h3 className="font-medium text-foreground mb-1">Aucun résultat</h3>
              <p className="text-sm text-muted-foreground">
                Aucun véhicule ne correspond aux critères de recherche
              </p>
              {(vehicleSearch || vehicleTypeFilter !== 'all') && (
                <Button variant="link" onClick={() => { setVehicleSearch(''); setVehicleTypeFilter('all'); }}>
                  Réinitialiser les filtres
                </Button>
              )}
            </div>
          ) : !isAdding && (
            <div className="glass-card p-12 text-center">
              <Truck className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">Aucun véhicule</h3>
              <p className="text-muted-foreground mb-4">
                Commencez par ajouter un véhicule ou importez depuis Excel.
              </p>
              <div className="flex justify-center gap-2">
                <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="w-4 h-4 mr-2" />
                  Importer Excel
                </Button>
                <Button onClick={handleAdd}>
                  <Plus className="w-4 h-4 mr-2" />
                  Ajouter un véhicule
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        {/* Trailers Tab */}
        <TabsContent value="trailers" className="space-y-6">
          {/* Trailer Stats */}
          {trailerStats && trailers.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Card className="glass-card">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Gauge className="w-4 h-4 text-primary" />
                    <span className="text-xs text-muted-foreground">Kilométrage total</span>
                  </div>
                  <p className="text-xl font-bold text-foreground">{formatNumber(trailerStats.totalKm)} km</p>
                </CardContent>
              </Card>
              <Card className="glass-card">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <CircleDollarSign className="w-4 h-4 text-success" />
                    <span className="text-xs text-muted-foreground">Coût moyen/km</span>
                  </div>
                  <p className="text-xl font-bold text-foreground">{formatCostPerKm(trailerStats.avgCostPerKm)}</p>
                </CardContent>
              </Card>
              <Card className="glass-card">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Wrench className={cn("w-4 h-4", trailerStats.maintenanceAlerts > 0 ? "text-warning" : "text-muted-foreground")} />
                    <span className="text-xs text-muted-foreground">Alertes entretien</span>
                  </div>
                  <p className={cn("text-xl font-bold", trailerStats.maintenanceAlerts > 0 ? "text-warning" : "text-foreground")}>
                    {trailerStats.maintenanceAlerts}
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Search and Add */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par plaque, nom, marque..."
                value={trailerSearch}
                onChange={(e) => setTrailerSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            {isCompanyMember && (
              <DataOwnershipFilter
                value={trailerOwnershipFilter}
                onChange={setTrailerOwnershipFilter}
              />
            )}
            <Button variant="outline" onClick={() => {
              setEditingTrailer(null);
              setTrailerDialogOpen(true);
            }}>
              <Plus className="w-4 h-4 mr-2" />
              Ajouter une remorque
            </Button>
          </div>

          {/* Trailers List */}
          {filteredTrailers.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTrailers.map((trailer) => (
                <Card key={trailer.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                          <Container className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <CardTitle className="text-base">{trailer.name}</CardTitle>
                            {isCompanyMember && (() => {
                              const trailerInfo = getTrailerInfo(trailer.id);
                              const isShared = !!trailerInfo;
                              const isOwn = trailerInfo ? isOwnData(trailerInfo.userId) : true;
                              return (
                                <TooltipProvider>
                                  <SharedDataBadge 
                                    isShared={isShared}
                                    isOwn={isOwn}
                                    createdBy={trailerInfo?.displayName}
                                    createdByEmail={trailerInfo?.userEmail}
                                    compact
                                  />
                                </TooltipProvider>
                              );
                            })()}
                          </div>
                          <p className="text-xs font-mono text-primary font-medium">
                            {trailer.licensePlate}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatTrailerType(trailer.type)}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleEditTrailer(trailer)}>
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleDeleteTrailer(trailer.id)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Dimensions</span>
                        <p className="font-medium">{trailer.length}m × {trailer.width}m</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Charge utile</span>
                        <p className="font-medium">{(trailer.payload / 1000).toFixed(1)} T</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Volume</span>
                        <p className="font-medium">{trailer.volume} m³</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Kilométrage</span>
                        <p className="font-medium">{formatNumber(trailer.currentKm)} km</p>
                      </div>
                    </div>
                    {trailer.brand && (
                      <Badge variant="outline" className="mt-3">
                        {trailer.brand} {trailer.model}
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : trailers.length > 0 ? (
            <div className="glass-card p-8 text-center">
              <Search className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <h3 className="font-medium text-foreground mb-1">Aucun résultat</h3>
              <p className="text-sm text-muted-foreground">
                Aucune remorque ne correspond à "{trailerSearch}"
              </p>
            </div>
          ) : (
            <div className="glass-card p-12 text-center">
              <Container className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">Aucune remorque</h3>
              <p className="text-muted-foreground mb-4">
                Commencez par ajouter une remorque pour gérer votre flotte.
              </p>
              <Button variant="outline" onClick={() => setTrailerDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Ajouter une remorque
              </Button>
            </div>
          )}
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="space-y-6">
          <Suspense fallback={
            <div className="glass-card p-12 text-center">
              <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
              <p className="text-muted-foreground">Chargement des rapports...</p>
            </div>
          }>
            <VehicleReportsContent />
          </Suspense>
        </TabsContent>
      </Tabs>

      {/* Trailer Dialog */}
      <TrailerDialog
        open={trailerDialogOpen}
        onOpenChange={setTrailerDialogOpen}
        trailer={editingTrailer}
        onSave={handleSaveTrailer}
      />
    </div>
  );
}

