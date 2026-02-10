import { useState, useMemo } from 'react';
import { Plus, Trash2, Edit2, User, Check, X, Lock, Sparkles, Clock, Users2, Search, Upload, LayoutGrid, List, ArrowUpDown, CheckSquare, Square, UserPlus, Phone, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import type { Driver } from '@/types';
import { cn } from '@/lib/utils';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import { useNavigate } from 'react-router-dom';
import { useCompanyData } from '@/hooks/useCompanyData';
import { SharedDataBadge } from '@/components/shared/SharedDataBadge';
import { DataOwnershipFilter, type OwnershipFilter } from '@/components/shared/DataOwnershipFilter';
import { TooltipProvider } from '@/components/ui/tooltip';
 import { ImportDriversDialog } from '@/components/drivers/ImportDriversDialog';
 import type { ExtendedParsedDriver } from '@/utils/driversExcelImport';
 import { useCloudDrivers } from '@/hooks/useCloudDrivers';
 import { useApp } from '@/context/AppContext';
import { DriverAssignmentDialog } from '@/components/drivers/DriverAssignmentDialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useLicenseContext } from '@/context/LicenseContext';
import { useUncreatedDrivers } from '@/hooks/useUncreatedDrivers';
// Extended driver type with new fields
interface ExtendedDriver extends Driver {
  isInterim?: boolean;
  interimAgency?: string;
  interimHourlyRate?: number;
  interimCoefficient?: number;
  scheduleType?: 'day' | 'night' | 'mixed';
  nightStartHour?: number;
  nightEndHour?: number;
  nightBonusPercent?: number;
  assignedClientId?: string;
  assignedCity?: string;
  assignedTourIds?: string[];
}

export default function Drivers() {
  // Use cloud drivers for shared data sync
  const { 
    cdiDrivers: cloudCdiDrivers, 
    cddDrivers: cloudCddDrivers,
    interimDrivers: cloudInterimDrivers, 
    fetchDrivers,
    createDriver: createCloudDriver, 
    updateDriver: updateCloudDriver,
    deleteDriver: deleteCloudDriver,
    loading: driversLoading 
  } = useCloudDrivers();
  
  // Still need selectedDriverIds from context for calculator integration
  const { selectedDriverIds } = useApp();
  
  const { limits, checkLimit, isUnlimited, planType } = usePlanLimits();
  const { getDriverInfo, isOwnData, isCompanyMember } = useCompanyData();
  const { licenseId } = useLicenseContext();
  const { uncreatedDrivers, removeUncreatedDriver, clearAll: clearUncreated } = useUncreatedDrivers();
  const navigate = useNavigate();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState<Partial<ExtendedDriver>>({});
  const [activeTab, setActiveTab] = useState<'cdi' | 'cdd' | 'interim' | 'uncreated'>('cdi');
  const [searchTerm, setSearchTerm] = useState('');
  const [ownershipFilter, setOwnershipFilter] = useState<OwnershipFilter>('all');
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'name' | 'contract' | 'cost'>('name');
  const [checkedDriverIds, setCheckedDriverIds] = useState<Set<string>>(new Set());
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [isDeletingBulk, setIsDeletingBulk] = useState(false);
  
  // Combined driver count for limits
  const totalDriverCount = cloudCdiDrivers.length + cloudCddDrivers.length + cloudInterimDrivers.length;
  const canAddDriver = checkLimit('maxDrivers', totalDriverCount);

  // Toggle driver selection
  const toggleDriverCheck = (id: string) => {
    setCheckedDriverIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Select all visible drivers
  const selectAllVisible = () => {
    const allIds = activeTab === 'cdi'
      ? sortedCdiDrivers.map(d => d.id)
      : activeTab === 'cdd'
        ? sortedCddDrivers.map(d => d.id)
        : sortedInterimDrivers.map(d => d.id);
    setCheckedDriverIds(new Set(allIds));
  };

  // Clear selection
  const clearSelection = () => {
    setCheckedDriverIds(new Set());
  };

  // Handle bulk delete
  const handleBulkDelete = async () => {
    if (checkedDriverIds.size === 0) return;
    
    const confirmed = window.confirm(
      `Êtes-vous sûr de vouloir supprimer ${checkedDriverIds.size} conducteur${checkedDriverIds.size > 1 ? 's' : ''} ?`
    );
    
    if (!confirmed) return;
    
    setIsDeletingBulk(true);
    
    try {
      const driverIds = Array.from(checkedDriverIds);
      let successCount = 0;
      
      for (const driverId of driverIds) {
        // Check if it's an interim or CDI driver
        const driverType: 'cdi' | 'cdd' | 'interim' = cloudInterimDrivers.some(d => d.id === driverId)
          ? 'interim'
          : cloudCddDrivers.some(d => d.id === driverId)
            ? 'cdd'
            : 'cdi';
        const success = await deleteCloudDriver(driverId, driverType);
        if (success) successCount++;
      }
      
      if (successCount === driverIds.length) {
        toast.success(`${successCount} conducteur${successCount > 1 ? 's' : ''} supprimé${successCount > 1 ? 's' : ''}`);
      } else {
        toast.warning(`${successCount}/${driverIds.length} conducteurs supprimés`);
      }
      
      clearSelection();
    } catch (error) {
      console.error('Error bulk deleting drivers:', error);
      toast.error('Erreur lors de la suppression');
    } finally {
      setIsDeletingBulk(false);
    }
  };

  // Handle assignment
  const handleAssignment = async (assignment: {
    type: 'client' | 'city' | 'tour';
    clientId?: string;
    city?: string;
    tourIds?: string[];
  }) => {
    if (!licenseId) return;
    
    const driverIds = Array.from(checkedDriverIds);
    
    try {
      // Update each driver with the assignment
      for (const driverId of driverIds) {
        const updateData: Record<string, any> = {
          synced_at: new Date().toISOString(),
        };
        
        if (assignment.type === 'client') {
          updateData.assigned_client_id = assignment.clientId;
        } else if (assignment.type === 'city') {
          updateData.assigned_city = assignment.city;
        } else if (assignment.type === 'tour') {
          updateData.assigned_tour_ids = assignment.tourIds;
        }
        
        await supabase
          .from('user_drivers')
          .update(updateData)
          .eq('license_id', licenseId)
          .eq('local_id', driverId);
      }
      
      toast.success(`${driverIds.length} conducteur${driverIds.length > 1 ? 's' : ''} assigné${driverIds.length > 1 ? 's' : ''}`);
      clearSelection();
    } catch (error) {
      console.error('Error assigning drivers:', error);
      toast.error('Erreur lors de l\'assignation');
    }
  };

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value);

  const handleAdd = () => {
    setIsAdding(true);
    const isInterim = activeTab === 'interim';
    setFormData({
      name: '',
      baseSalary: isInterim ? 0 : 2200,
      hourlyRate: isInterim ? 15 : 12.50,
      hoursPerDay: 10,
      patronalCharges: isInterim ? 0 : 45,
      mealAllowance: 15.20,
      overnightAllowance: 45,
      workingDaysPerMonth: 21,
      sundayBonus: 0,
      nightBonus: 0,
      seniorityBonus: 0,
      isInterim,
      interimAgency: '',
      interimHourlyRate: 15,
      interimCoefficient: 1.85,
      scheduleType: 'day',
      nightStartHour: 21,
      nightEndHour: 6,
      nightBonusPercent: 25,
    });
  };

  const handleEdit = (driver: ExtendedDriver, isInterim: boolean) => {
    setEditingId(driver.id);
    setFormData({ ...driver, isInterim });
  };

  const handleSave = async () => {
    const isInterim = formData.isInterim || activeTab === 'interim';
    
    if (isAdding) {
      const newDriver: ExtendedDriver = {
        id: Date.now().toString(),
        name: formData.name || 'Nouveau conducteur',
        baseSalary: formData.baseSalary || 0,
        hourlyRate: formData.hourlyRate || 0,
        hoursPerDay: formData.hoursPerDay || 10,
        patronalCharges: formData.patronalCharges || 0,
        mealAllowance: formData.mealAllowance || 0,
        overnightAllowance: formData.overnightAllowance || 0,
        workingDaysPerMonth: formData.workingDaysPerMonth || 21,
        sundayBonus: formData.sundayBonus || 0,
        nightBonus: formData.nightBonus || 0,
        seniorityBonus: formData.seniorityBonus || 0,
        isInterim,
        interimAgency: formData.interimAgency || '',
        interimHourlyRate: formData.interimHourlyRate || 15,
        interimCoefficient: formData.interimCoefficient || 1.85,
        scheduleType: formData.scheduleType || 'day',
        nightStartHour: formData.nightStartHour || 21,
        nightEndHour: formData.nightEndHour || 6,
        nightBonusPercent: formData.nightBonusPercent || 25,
      };
      
      // Save to cloud
      const driverType: 'cdi' | 'cdd' | 'interim' = isInterim ? 'interim' : (activeTab === 'cdd' ? 'cdd' : 'cdi');
      await createCloudDriver(newDriver as Driver, driverType);
      setIsAdding(false);
    } else if (editingId) {
      // Find the existing driver to merge with formData
      const existingDriver = isInterim
        ? cloudInterimDrivers.find(d => d.id === editingId)
        : activeTab === 'cdd'
          ? cloudCddDrivers.find(d => d.id === editingId)
          : cloudCdiDrivers.find(d => d.id === editingId);
      
      const updatedDriver = { ...existingDriver, ...formData, id: editingId } as ExtendedDriver;
      const driverType: 'cdi' | 'cdd' | 'interim' = isInterim ? 'interim' : (activeTab === 'cdd' ? 'cdd' : 'cdi');
      await updateCloudDriver(updatedDriver as Driver, driverType);
      setEditingId(null);
    }
    setFormData({});
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
    setFormData({});
  };

  const handleDelete = async (id: string, driverType: 'cdi' | 'cdd' | 'interim') => {
    await deleteCloudDriver(id, driverType);
  };

  const calculateInterimCost = (driver: ExtendedDriver): number => {
    const hourlyRate = driver.interimHourlyRate || 15;
    const coefficient = driver.interimCoefficient || 1.85;
    const hoursPerDay = driver.hoursPerDay || 10;
    const workingDays = driver.workingDaysPerMonth || 21;
    return hourlyRate * coefficient * hoursPerDay * workingDays;
  };

  const calculateEmployerCost = (driver: ExtendedDriver): number => {
    if (driver.isInterim) {
      return calculateInterimCost(driver);
    }
    
    const baseCost = (driver.baseSalary + (driver.sundayBonus || 0) + (driver.nightBonus || 0) + (driver.seniorityBonus || 0)) 
      * (1 + driver.patronalCharges / 100);
    
    // Add night bonus if applicable
    if (driver.scheduleType === 'night' || driver.scheduleType === 'mixed') {
      const nightBonusAmount = driver.baseSalary * ((driver.nightBonusPercent || 25) / 100);
      return baseCost + nightBonusAmount;
    }
    
    return baseCost;
  };

  const handleImportDrivers = async (importedDrivers: ExtendedParsedDriver[]): Promise<number> => {
    console.log('[Drivers] handleImportDrivers called with', importedDrivers.length, 'drivers');

    const withTimeout = async <T,>(
      p: Promise<T>,
      ms: number,
      label: string
    ): Promise<T> => {
      let timeoutId: ReturnType<typeof setTimeout> | undefined;
      try {
        return await Promise.race([
          p,
          new Promise<T>((_, reject) => {
            timeoutId = setTimeout(() => reject(new Error(`Timeout ${ms}ms: ${label}`)), ms);
          }),
        ]);
      } finally {
        if (timeoutId) clearTimeout(timeoutId);
      }
    };
    
    // Convert all drivers first
    const driversToCreate = importedDrivers.map(driver => {
      const driverType: 'cdi' | 'cdd' | 'interim' = driver.isInterim ? 'interim' : (driver.contractType === 'cdd' ? 'cdd' : 'cdi');
      const newDriver: ExtendedDriver = {
        id: driver.id,
        name: driver.name,
        baseSalary: driver.baseSalary,
        hourlyRate: driver.hourlyRate,
        hoursPerDay: driver.hoursPerDay,
        patronalCharges: driver.patronalCharges,
        mealAllowance: driver.mealAllowance,
        overnightAllowance: driver.overnightAllowance,
        workingDaysPerMonth: driver.workingDaysPerMonth,
        sundayBonus: driver.sundayBonus,
        nightBonus: driver.nightBonus,
        seniorityBonus: driver.seniorityBonus,
        isInterim: driverType === 'interim',
        interimAgency: driver.interimAgency || '',
        interimHourlyRate: 15,
        interimCoefficient: 1.85,
        scheduleType: 'day',
      };
      return { driver: newDriver as Driver, type: driverType };
    });

    // Process in parallel batches, but NEVER let one request hang the whole import.
    const BATCH_SIZE = 5;
    const PER_DRIVER_TIMEOUT_MS = 20_000;

    let count = 0;
    let failures = 0;

    for (let i = 0; i < driversToCreate.length; i += BATCH_SIZE) {
      const batch = driversToCreate.slice(i, i + BATCH_SIZE);
      console.log(
        `[Drivers] Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(driversToCreate.length / BATCH_SIZE)}`
      );

      const settled = await Promise.allSettled(
        batch.map(({ driver, type }) =>
          withTimeout(
            createCloudDriver(driver, type, { silent: true }),
            PER_DRIVER_TIMEOUT_MS,
            driver.name
          )
        )
      );

      const batchOk = settled.filter(r => r.status === 'fulfilled' && r.value === true).length;
      const batchFailures = settled.length - batchOk;
      count += batchOk;
      failures += batchFailures;

      if (batchFailures > 0) {
        console.warn('[Drivers] Import batch failures:', settled);
      }
    }

    // Refresh once at the end to reconcile (and to show imported drivers even in silent mode).
    try {
      // NOTE: fetchDrivers can hang indefinitely on bad network conditions.
      // We guard it so the import dialog can always finish and close.
      await withTimeout(fetchDrivers(), 20_000, 'fetchDrivers');
    } catch (e) {
      console.warn('[Drivers] fetchDrivers timeout/error after import:', e);
      toast.warning('Import terminé, mais le rafraîchissement a pris trop de temps. Rechargez la page si nécessaire.');
    }

    console.log('[Drivers] Import completed, total:', { count, failures });

    if (failures > 0) {
      toast.warning(`${failures} conducteur(s) non importé(s) (erreur ou timeout)`);
    }
    return count;
  };
 
  // Cast cloud drivers to ExtendedDriver for UI
  const cdiDrivers = cloudCdiDrivers as ExtendedDriver[];
  const cddDrivers = cloudCddDrivers as ExtendedDriver[];
  const interimDrivers = cloudInterimDrivers as ExtendedDriver[];

  const renderForm = () => {
    const isInterim = formData.isInterim || activeTab === 'interim';
    
    return (
      <div className="glass-card p-6 space-y-4 opacity-0 animate-scale-in" style={{ animationFillMode: 'forwards' }}>
        {/* Informations de base */}
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Informations</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nom du conducteur</Label>
              <Input
                id="name"
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Nom complet"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="workingDaysPerMonth">Jours travaillés/mois</Label>
              <Input
                id="workingDaysPerMonth"
                type="number"
                value={formData.workingDaysPerMonth || ''}
                onChange={(e) => setFormData({ ...formData, workingDaysPerMonth: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hoursPerDay">Heures/jour</Label>
              <Input
                id="hoursPerDay"
                type="number"
                step="0.5"
                value={formData.hoursPerDay || ''}
                onChange={(e) => setFormData({ ...formData, hoursPerDay: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>
        </div>

        {/* Horaires jour/nuit */}
        <div className="border-t border-border pt-4">
          <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Régime horaire
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Type d'horaire</Label>
              <div className="flex gap-2">
                <Button 
                  type="button"
                  variant={formData.scheduleType === 'day' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFormData({ ...formData, scheduleType: 'day' })}
                >
                  Jour
                </Button>
                <Button 
                  type="button"
                  variant={formData.scheduleType === 'night' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFormData({ ...formData, scheduleType: 'night' })}
                >
                  Nuit
                </Button>
                <Button 
                  type="button"
                  variant={formData.scheduleType === 'mixed' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFormData({ ...formData, scheduleType: 'mixed' })}
                >
                  Mixte
                </Button>
              </div>
            </div>
            {(formData.scheduleType === 'night' || formData.scheduleType === 'mixed') && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="nightStartHour">Début de nuit (h)</Label>
                  <Input
                    id="nightStartHour"
                    type="number"
                    min="0"
                    max="23"
                    value={formData.nightStartHour || 21}
                    onChange={(e) => setFormData({ ...formData, nightStartHour: parseInt(e.target.value) || 21 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nightEndHour">Fin de nuit (h)</Label>
                  <Input
                    id="nightEndHour"
                    type="number"
                    min="0"
                    max="23"
                    value={formData.nightEndHour || 6}
                    onChange={(e) => setFormData({ ...formData, nightEndHour: parseInt(e.target.value) || 6 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nightBonusPercent">Majoration nuit (%)</Label>
                  <Input
                    id="nightBonusPercent"
                    type="number"
                    step="1"
                    value={formData.nightBonusPercent || 25}
                    onChange={(e) => setFormData({ ...formData, nightBonusPercent: parseFloat(e.target.value) || 25 })}
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Section spécifique Intérim */}
        {isInterim && (
          <div className="border-t border-border pt-4">
            <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
              <Users2 className="w-4 h-4" />
              Intérim
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="interimAgency">Agence d'intérim</Label>
                <Input
                  id="interimAgency"
                  value={formData.interimAgency || ''}
                  onChange={(e) => setFormData({ ...formData, interimAgency: e.target.value })}
                  placeholder="Nom de l'agence"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="interimHourlyRate">Taux horaire intérim (€/h)</Label>
                <Input
                  id="interimHourlyRate"
                  type="number"
                  step="0.01"
                  value={formData.interimHourlyRate || ''}
                  onChange={(e) => setFormData({ ...formData, interimHourlyRate: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="interimCoefficient">Coefficient agence</Label>
                <Input
                  id="interimCoefficient"
                  type="number"
                  step="0.01"
                  value={formData.interimCoefficient || ''}
                  onChange={(e) => setFormData({ ...formData, interimCoefficient: parseFloat(e.target.value) || 0 })}
                  placeholder="1.85"
                />
              </div>
            </div>
          </div>
        )}

        {/* Rémunération - Seulement pour CDI */}
        {!isInterim && (
          <div className="border-t border-border pt-4">
            <h3 className="text-sm font-medium text-muted-foreground mb-3">Rémunération</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="baseSalary">Salaire brut mensuel (€)</Label>
                <Input
                  id="baseSalary"
                  type="number"
                  step="0.01"
                  value={formData.baseSalary || ''}
                  onChange={(e) => setFormData({ ...formData, baseSalary: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hourlyRate">Taux horaire brut (€/h)</Label>
                <Input
                  id="hourlyRate"
                  type="number"
                  step="0.01"
                  value={formData.hourlyRate || ''}
                  onChange={(e) => setFormData({ ...formData, hourlyRate: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="patronalCharges">Charges patronales (%)</Label>
                <Input
                  id="patronalCharges"
                  type="number"
                  step="0.1"
                  value={formData.patronalCharges || ''}
                  onChange={(e) => setFormData({ ...formData, patronalCharges: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>
          </div>
        )}

        {/* Charges & Primes - Seulement pour CDI */}
        {!isInterim && (
          <div className="border-t border-border pt-4">
            <h3 className="text-sm font-medium text-muted-foreground mb-3">Primes</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sundayBonus">Prime dimanche (€)</Label>
                <Input
                  id="sundayBonus"
                  type="number"
                  step="0.01"
                  value={formData.sundayBonus || ''}
                  onChange={(e) => setFormData({ ...formData, sundayBonus: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nightBonus">Prime nuit fixe (€)</Label>
                <Input
                  id="nightBonus"
                  type="number"
                  step="0.01"
                  value={formData.nightBonus || ''}
                  onChange={(e) => setFormData({ ...formData, nightBonus: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="seniorityBonus">Prime ancienneté (€)</Label>
                <Input
                  id="seniorityBonus"
                  type="number"
                  step="0.01"
                  value={formData.seniorityBonus || ''}
                  onChange={(e) => setFormData({ ...formData, seniorityBonus: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>
          </div>
        )}

        {/* Indemnités */}
        <div className="border-t border-border pt-4">
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Indemnités</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="mealAllowance">Indemnité repas (€)</Label>
              <Input
                id="mealAllowance"
                type="number"
                step="0.01"
                value={formData.mealAllowance || ''}
                onChange={(e) => setFormData({ ...formData, mealAllowance: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="overnightAllowance">Indemnité découcher (€)</Label>
              <Input
                id="overnightAllowance"
                type="number"
                step="0.01"
                value={formData.overnightAllowance || ''}
                onChange={(e) => setFormData({ ...formData, overnightAllowance: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4">
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
  };

  const renderDriverCard = (driver: ExtendedDriver, index: number, driverType: 'cdi' | 'cdd' | 'interim') => {
    const isInterim = driverType === 'interim';
    const driverInfo = getDriverInfo(driver.id);
    const isShared = !!driverInfo?.licenseId;
    const isOwn = driverInfo ? isOwnData(driverInfo.userId) : true;
    
    return (
      <div
        key={driver.id}
        className={cn(
          "glass-card p-6 opacity-0 animate-slide-up",
          selectedDriverIds.includes(driver.id) && "ring-2 ring-primary/50",
          checkedDriverIds.has(driver.id) && "ring-2 ring-primary"
        )}
        style={{ animationDelay: `${index * 100}ms`, animationFillMode: 'forwards' }}
      >
      {editingId === driver.id && formData.isInterim === isInterim ? (
          renderForm()
        ) : (
          <>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={checkedDriverIds.has(driver.id)}
                  onCheckedChange={() => toggleDriverCheck(driver.id)}
                  className="mr-1"
                />
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center",
                  isInterim ? "bg-orange-500/20" : "bg-purple-500/20"
                )}>
                  {isInterim ? (
                    <Users2 className="w-6 h-6 text-orange-400" />
                  ) : (
                    <User className="w-6 h-6 text-purple-400" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-foreground">
                      {driver.firstName && driver.lastName 
                        ? `${driver.firstName} ${driver.lastName}`
                        : driver.name
                      }
                    </h3>
                    {driver.scheduleType === 'night' && (
                      <span className="text-xs bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-full">Nuit</span>
                    )}
                    {driver.scheduleType === 'mixed' && (
                      <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full">Mixte</span>
                    )}
                    {isCompanyMember && (
                      <TooltipProvider>
                        <SharedDataBadge 
                          isShared={isShared}
                          isOwn={isOwn}
                          isFormerMember={driverInfo?.isFormerMember}
                          createdBy={driverInfo?.displayName}
                          createdByEmail={driverInfo?.userEmail}
                          compact
                        />
                      </TooltipProvider>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {isInterim 
                      ? `${driver.interimAgency || 'Intérim'} • ${formatCurrency(driver.interimHourlyRate || 0)}/h`
                      : `${formatCurrency(driver.baseSalary)} brut/mois`
                    }
                </p>
                {driver.phone && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Phone className="w-3 h-3" />
                    {driver.phone}
                  </p>
                )}
                {(driver as ExtendedDriver).assignedCity && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    {(driver as ExtendedDriver).assignedCity}
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); handleEdit(driver, driverType === 'interim'); }}>
                <Edit2 className="w-4 h-4" />
              </Button>
              <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); handleDelete(driver.id, driverType); }}>
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 text-sm">
            {isInterim ? (
              <>
                <div>
                  <p className="text-muted-foreground">Taux horaire</p>
                  <p className="font-medium text-foreground">{formatCurrency(driver.interimHourlyRate || 0)}/h</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Coefficient</p>
                  <p className="font-medium text-foreground">{driver.interimCoefficient || 1.85}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Heures/jour</p>
                  <p className="font-medium text-foreground">{driver.hoursPerDay || 10}h</p>
                </div>
              </>
            ) : (
              <>
                <div>
                  <p className="text-muted-foreground">Taux horaire</p>
                  <p className="font-medium text-foreground">{formatCurrency(driver.hourlyRate || 0)}/h</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Heures/jour</p>
                  <p className="font-medium text-foreground">{driver.hoursPerDay || 10}h</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Jours/mois</p>
                  <p className="font-medium text-foreground">{driver.workingDaysPerMonth}</p>
                </div>
              </>
            )}
            <div>
              <p className="text-muted-foreground">Indemnité repas</p>
              <p className="font-medium text-foreground">{formatCurrency(driver.mealAllowance)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Indemnité découcher</p>
              <p className="font-medium text-foreground">{formatCurrency(driver.overnightAllowance)}</p>
            </div>
            {!isInterim && (
              <div>
                <p className="text-muted-foreground">Charges patronales</p>
                <p className="font-medium text-foreground">{driver.patronalCharges}%</p>
              </div>
            )}
          </div>
          {!isInterim && (driver.sundayBonus > 0 || driver.nightBonus > 0 || driver.seniorityBonus > 0) && (
            <div className="grid grid-cols-3 gap-4 text-sm mt-3 pt-3 border-t border-border/30">
              {driver.sundayBonus > 0 && (
                <div>
                  <p className="text-muted-foreground">Prime dimanche</p>
                  <p className="font-medium text-success">{formatCurrency(driver.sundayBonus)}</p>
                </div>
              )}
              {driver.nightBonus > 0 && (
                <div>
                  <p className="text-muted-foreground">Prime nuit</p>
                  <p className="font-medium text-success">{formatCurrency(driver.nightBonus)}</p>
                </div>
              )}
              {driver.seniorityBonus > 0 && (
                <div>
                  <p className="text-muted-foreground">Prime ancienneté</p>
                  <p className="font-medium text-success">{formatCurrency(driver.seniorityBonus)}</p>
                </div>
              )}
            </div>
          )}
          <div className="mt-4 pt-4 border-t border-border/50">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">
                {isInterim ? 'Coût agence mensuel' : 'Coût employeur mensuel'}
              </span>
              <span className="font-bold text-primary">
                {formatCurrency(calculateEmployerCost(driver))}
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
  };

  // Filter drivers based on search and ownership
  const filteredCdiDrivers = useMemo(() => {
    let result = cdiDrivers;
    
    // Filter by search
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase().trim();
      result = result.filter(d => 
        d.name.toLowerCase().includes(search) ||
        (d.firstName && d.firstName.toLowerCase().includes(search)) ||
        (d.lastName && d.lastName.toLowerCase().includes(search))
      );
    }
    
    // Filter by ownership
    if (ownershipFilter !== 'all' && isCompanyMember) {
      result = result.filter(d => {
        const driverInfo = getDriverInfo(d.id);
        const isOwn = driverInfo ? isOwnData(driverInfo.userId) : true;
        if (ownershipFilter === 'mine') return isOwn;
        if (ownershipFilter === 'team') return !isOwn;
        return true;
      });
    }
    
    return result;
  }, [cdiDrivers, searchTerm, ownershipFilter, isCompanyMember, getDriverInfo, isOwnData]);

  const filteredCddDrivers = useMemo(() => {
    let result = cddDrivers;
    
    // Filter by search
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase().trim();
      result = result.filter(d => 
        d.name.toLowerCase().includes(search) ||
        (d.firstName && d.firstName.toLowerCase().includes(search)) ||
        (d.lastName && d.lastName.toLowerCase().includes(search))
      );
    }
    
    // Filter by ownership
    if (ownershipFilter !== 'all' && isCompanyMember) {
      result = result.filter(d => {
        const driverInfo = getDriverInfo(d.id);
        const isOwn = driverInfo ? isOwnData(driverInfo.userId) : true;
        if (ownershipFilter === 'mine') return isOwn;
        if (ownershipFilter === 'team') return !isOwn;
        return true;
      });
    }
    
    return result;
  }, [cddDrivers, searchTerm, ownershipFilter, isCompanyMember, getDriverInfo, isOwnData]);

  const filteredInterimDrivers = useMemo(() => {
    let result = interimDrivers;
    
    // Filter by search
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase().trim();
      result = result.filter(d => 
        d.name.toLowerCase().includes(search) ||
        (d.firstName && d.firstName.toLowerCase().includes(search)) ||
        (d.lastName && d.lastName.toLowerCase().includes(search))
      );
    }
    
    // Filter by ownership
    if (ownershipFilter !== 'all' && isCompanyMember) {
      result = result.filter(d => {
        const driverInfo = getDriverInfo(d.id);
        const isOwn = driverInfo ? isOwnData(driverInfo.userId) : true;
        if (ownershipFilter === 'mine') return isOwn;
        if (ownershipFilter === 'team') return !isOwn;
        return true;
      });
    }
    
    return result;
  }, [interimDrivers, searchTerm, ownershipFilter, isCompanyMember, getDriverInfo, isOwnData]);

  // Sorted drivers
  const sortedCdiDrivers = useMemo(() => {
    const drivers = [...filteredCdiDrivers];
    switch (sortBy) {
      case 'name':
        return drivers.sort((a, b) => a.name.localeCompare(b.name, 'fr'));
      case 'contract':
        return drivers.sort((a, b) => {
          const aType = a.scheduleType || 'day';
          const bType = b.scheduleType || 'day';
          return aType.localeCompare(bType);
        });
      case 'cost':
        return drivers.sort((a, b) => calculateEmployerCost(b) - calculateEmployerCost(a));
      default:
        return drivers;
    }
  }, [filteredCdiDrivers, sortBy]);

  const sortedInterimDrivers = useMemo(() => {
    const drivers = [...filteredInterimDrivers];
    switch (sortBy) {
      case 'name':
        return drivers.sort((a, b) => a.name.localeCompare(b.name, 'fr'));
      case 'contract':
        return drivers.sort((a, b) => {
          const aAgency = a.interimAgency || '';
          const bAgency = b.interimAgency || '';
          return aAgency.localeCompare(bAgency, 'fr');
        });
      case 'cost':
        return drivers.sort((a, b) => calculateEmployerCost(b) - calculateEmployerCost(a));
      default:
        return drivers;
    }
  }, [filteredInterimDrivers, sortBy]);

  const sortedCddDrivers = useMemo(() => {
    const drivers = [...filteredCddDrivers];
    switch (sortBy) {
      case 'name':
        return drivers.sort((a, b) => a.name.localeCompare(b.name, 'fr'));
      case 'contract':
        return drivers.sort((a, b) => {
          const aType = a.scheduleType || 'day';
          const bType = b.scheduleType || 'day';
          return aType.localeCompare(bType);
        });
      case 'cost':
        return drivers.sort((a, b) => calculateEmployerCost(b) - calculateEmployerCost(a));
      default:
        return drivers;
    }
  }, [filteredCddDrivers, sortBy]);

  const renderDriverRow = (driver: ExtendedDriver, driverType: 'cdi' | 'cdd' | 'interim') => {
    const isInterim = driverType === 'interim';
    const driverInfo = getDriverInfo(driver.id);
    const isShared = !!driverInfo?.licenseId;
    const isOwn = driverInfo ? isOwnData(driverInfo.userId) : true;
    
    return (
      <TableRow key={driver.id} className={cn(
        selectedDriverIds.includes(driver.id) && "bg-primary/5",
        checkedDriverIds.has(driver.id) && "bg-primary/10"
      )}>
        <TableCell>
          <div className="flex items-center gap-3">
            <Checkbox
              checked={checkedDriverIds.has(driver.id)}
              onCheckedChange={() => toggleDriverCheck(driver.id)}
            />
            <div className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center",
              isInterim ? "bg-orange-500/20" : "bg-purple-500/20"
            )}>
              {isInterim ? (
                <Users2 className="w-4 h-4 text-orange-400" />
              ) : (
                <User className="w-4 h-4 text-purple-400" />
              )}
            </div>
            <div>
              <p className="font-medium">
                {driver.firstName && driver.lastName 
                  ? `${driver.firstName} ${driver.lastName}`
                  : driver.name
                }
              </p>
              {driver.phone && (
                <span className="text-xs text-muted-foreground">{driver.phone}</span>
              )}
              {driver.scheduleType && driver.scheduleType !== 'day' && (
                <span className={cn(
                  "text-xs px-1.5 py-0.5 rounded-full",
                  driver.scheduleType === 'night' ? "bg-indigo-500/20 text-indigo-400" : "bg-amber-500/20 text-amber-400"
                )}>
                  {driver.scheduleType === 'night' ? 'Nuit' : 'Mixte'}
                </span>
              )}
            </div>
          </div>
        </TableCell>
        <TableCell>
          {isInterim ? (
            <span className="text-sm text-muted-foreground">{driver.interimAgency || 'Intérim'}</span>
          ) : (
            <span className="text-sm">CDI</span>
          )}
        </TableCell>
        <TableCell>
          {isInterim 
            ? formatCurrency(driver.interimHourlyRate || 0)
            : formatCurrency(driver.hourlyRate || 0)
          }/h
        </TableCell>
        <TableCell>{driver.hoursPerDay || 10}h</TableCell>
        <TableCell>{driver.workingDaysPerMonth} j/mois</TableCell>
        <TableCell className="text-right font-medium text-primary">
          {formatCurrency(calculateEmployerCost(driver))}
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-1 justify-end">
            {isCompanyMember && (
              <TooltipProvider>
                <SharedDataBadge 
                  isShared={isShared}
                  isOwn={isOwn}
                  isFormerMember={driverInfo?.isFormerMember}
                  createdBy={driverInfo?.displayName}
                  createdByEmail={driverInfo?.userEmail}
                  compact
                />
              </TooltipProvider>
            )}
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); handleEdit(driver, driverType === 'interim'); }}>
              <Edit2 className="w-4 h-4" />
            </Button>
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); handleDelete(driver.id, driverType); }}>
              <Trash2 className="w-4 h-4 text-destructive" />
            </Button>
          </div>
        </TableCell>
      </TableRow>
    );
  };

  const renderDriversTable = (drivers: ExtendedDriver[], driverType: 'cdi' | 'cdd' | 'interim') => (
    (() => { const isInterim = driverType === 'interim'; return (
    <div className="glass-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[300px]">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={drivers.length > 0 && drivers.every(d => checkedDriverIds.has(d.id))}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      const ids = drivers.map(d => d.id);
                      setCheckedDriverIds(prev => {
                        const next = new Set(prev);
                        ids.forEach(id => next.add(id));
                        return next;
                      });
                    } else {
                      const ids = drivers.map(d => d.id);
                      setCheckedDriverIds(prev => {
                        const next = new Set(prev);
                        ids.forEach(id => next.delete(id));
                        return next;
                      });
                    }
                  }}
                />
                Conducteur
              </div>
            </TableHead>
            <TableHead>{isInterim ? 'Agence' : 'Contrat'}</TableHead>
            <TableHead>Taux horaire</TableHead>
            <TableHead>Heures/jour</TableHead>
            <TableHead>Jours/mois</TableHead>
            <TableHead className="text-right">Coût mensuel</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {drivers.map(driver => renderDriverRow(driver, driverType))}
        </TableBody>
      </Table>
    </div>)})()
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Gestion des conducteurs</h1>
          <p className="text-muted-foreground mt-1">
            Configurez vos conducteurs et leurs coûts
          </p>
          {!isUnlimited('maxDrivers') && !canAddDriver && (
            <p className="text-xs text-warning mt-1 flex items-center gap-1">
              <Lock className="w-3 h-3" />
              Limite de conducteurs atteinte
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!isUnlimited('maxDrivers') && !canAddDriver && (
            <Button variant="outline" size="sm" onClick={() => navigate('/pricing')} className="gap-2">
              <Sparkles className="w-4 h-4" />
              Débloquer plus de conducteurs
            </Button>
          )}
         <Button variant="outline" size="sm" onClick={() => setIsImportDialogOpen(true)} className="gap-2">
           <Upload className="w-4 h-4" />
           Importer Excel
         </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un conducteur..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
          <SelectTrigger className="w-[180px]">
            <ArrowUpDown className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Trier par" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">Alphabétique</SelectItem>
            <SelectItem value="contract">Contrat / Agence</SelectItem>
            <SelectItem value="cost">Coût mensuel</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center gap-1 border rounded-md p-1">
          <Button
            variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
            size="icon"
            className="h-8 w-8"
            onClick={() => setViewMode('grid')}
          >
            <LayoutGrid className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
            size="icon"
            className="h-8 w-8"
            onClick={() => setViewMode('list')}
          >
            <List className="w-4 h-4" />
          </Button>
        </div>
        {isCompanyMember && (
          <DataOwnershipFilter
            value={ownershipFilter}
            onChange={setOwnershipFilter}
          />
        )}
      </div>

      {/* Selection Actions Bar */}
      {checkedDriverIds.size > 0 && (
        <div className="glass-card p-4 flex items-center justify-between animate-slide-up">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium">
              {checkedDriverIds.size} conducteur{checkedDriverIds.size > 1 ? 's' : ''} sélectionné{checkedDriverIds.size > 1 ? 's' : ''}
            </span>
            <Button variant="ghost" size="sm" onClick={clearSelection}>
              <X className="w-4 h-4 mr-1" />
              Annuler
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={selectAllVisible}>
              <CheckSquare className="w-4 h-4 mr-2" />
              Tout sélectionner
            </Button>
            <Button onClick={() => setIsAssignDialogOpen(true)} className="gap-2">
              <UserPlus className="w-4 h-4" />
              Assigner
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleBulkDelete}
              disabled={isDeletingBulk}
              className="gap-2"
            >
              {isDeletingBulk ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              Supprimer
            </Button>
          </div>
        </div>
      )}

      {/* Tabs CDI / Intérim */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'cdi' | 'cdd' | 'interim' | 'uncreated')}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="cdi" className="gap-2">
              <User className="w-4 h-4" />
              CDI ({filteredCdiDrivers.length})
            </TabsTrigger>
            <TabsTrigger value="cdd" className="gap-2">
              <User className="w-4 h-4" />
              CDD ({filteredCddDrivers.length})
            </TabsTrigger>
            <TabsTrigger value="interim" className="gap-2">
              <Users2 className="w-4 h-4" />
              Intérimaires ({filteredInterimDrivers.length})
            </TabsTrigger>
            {uncreatedDrivers.length > 0 && (
              <TabsTrigger value="uncreated" className="gap-2">
                <AlertTriangle className="w-4 h-4 text-warning" />
                Non créés ({uncreatedDrivers.length})
              </TabsTrigger>
            )}
          </TabsList>
          <Button 
            onClick={handleAdd} 
            disabled={isAdding || !canAddDriver}
          >
            <Plus className="w-4 h-4 mr-2" />
            {activeTab === 'interim' ? 'Ajouter un intérimaire' : 'Ajouter un conducteur'}
          </Button>
        </div>

        <TabsContent value="cdi" className="mt-6">
          {/* Add Form */}
          {isAdding && activeTab === 'cdi' && renderForm()}

          {/* CDI Drivers List or Table */}
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {sortedCdiDrivers.map((driver, index) => renderDriverCard(driver, index, 'cdi'))}
            </div>
          ) : (
            sortedCdiDrivers.length > 0 && renderDriversTable(sortedCdiDrivers, 'cdi')
          )}

          {cdiDrivers.length === 0 && !isAdding && (
            <div className="glass-card p-12 text-center">
              <User className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">Aucun conducteur CDI</h3>
              <p className="text-muted-foreground mb-4">
                Commencez par ajouter un conducteur pour calculer les coûts salariaux.
              </p>
              <Button onClick={handleAdd}>
                <Plus className="w-4 h-4 mr-2" />
                Ajouter un conducteur
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="cdd" className="mt-6">
          {/* Add Form */}
          {isAdding && activeTab === 'cdd' && renderForm()}

          {/* CDD Drivers List or Table */}
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {sortedCddDrivers.map((driver, index) => renderDriverCard(driver, index, 'cdd'))}
            </div>
          ) : (
            sortedCddDrivers.length > 0 && renderDriversTable(sortedCddDrivers, 'cdd')
          )}

          {cddDrivers.length === 0 && !isAdding && (
            <div className="glass-card p-12 text-center">
              <User className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">Aucun conducteur CDD</h3>
              <p className="text-muted-foreground mb-4">
                Ajoutez des conducteurs en contrat CDD.
              </p>
              <Button onClick={handleAdd}>
                <Plus className="w-4 h-4 mr-2" />
                Ajouter un conducteur CDD
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="interim" className="mt-6">
          {/* Add Form */}
          {isAdding && activeTab === 'interim' && renderForm()}

          {/* Interim Drivers List or Table */}
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {sortedInterimDrivers.map((driver, index) => renderDriverCard(driver, index, 'interim'))}
            </div>
          ) : (
            sortedInterimDrivers.length > 0 && renderDriversTable(sortedInterimDrivers, 'interim')
          )}

          {interimDrivers.length === 0 && !isAdding && (
            <div className="glass-card p-12 text-center">
              <Users2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">Aucun intérimaire</h3>
              <p className="text-muted-foreground mb-4">
                Ajoutez des conducteurs intérimaires avec leur coût agence.
              </p>
              <Button onClick={handleAdd}>
                <Plus className="w-4 h-4 mr-2" />
                Ajouter un intérimaire
              </Button>
            </div>
          )}
        </TabsContent>
        <TabsContent value="uncreated" className="mt-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Ces conducteurs ont été détectés lors de l'import du planning mais n'existent pas encore dans votre base.
              </p>
              <Button variant="outline" size="sm" onClick={clearUncreated}>
                <Trash2 className="w-4 h-4 mr-2" />
                Tout effacer
              </Button>
            </div>
            <div className="glass-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom du conducteur</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Détecté le</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {uncreatedDrivers.map((d, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{d.name}</TableCell>
                      <TableCell className="text-muted-foreground">{d.source}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(d.detectedAt).toLocaleDateString('fr-FR')}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center gap-2 justify-end">
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => {
                              setActiveTab('cdi');
                              setIsAdding(true);
                              setFormData({ name: d.name, baseSalary: 2200, hourlyRate: 12.50, hoursPerDay: 10, patronalCharges: 45, mealAllowance: 15.20, overnightAllowance: 45, workingDaysPerMonth: 21, sundayBonus: 0, nightBonus: 0, seniorityBonus: 0 });
                              removeUncreatedDriver(d.name);
                            }}
                          >
                            <Plus className="w-4 h-4 mr-1" />
                            Créer CDI
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setActiveTab('interim');
                              setIsAdding(true);
                              setFormData({ name: d.name, isInterim: true, baseSalary: 0, hourlyRate: 15, hoursPerDay: 10, patronalCharges: 0, mealAllowance: 15.20, overnightAllowance: 45, workingDaysPerMonth: 21, sundayBonus: 0, nightBonus: 0, seniorityBonus: 0, interimAgency: '', interimHourlyRate: 15, interimCoefficient: 1.85 });
                              removeUncreatedDriver(d.name);
                            }}
                          >
                            <Plus className="w-4 h-4 mr-1" />
                            Créer Intérim
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => removeUncreatedDriver(d.name)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>
      </Tabs>
       
       <ImportDriversDialog
         open={isImportDialogOpen}
         onOpenChange={setIsImportDialogOpen}
         onImport={handleImportDrivers}
       />
       
       <DriverAssignmentDialog
         open={isAssignDialogOpen}
         onOpenChange={setIsAssignDialogOpen}
         selectedDriverIds={Array.from(checkedDriverIds)}
         onAssign={handleAssignment}
       />
    </div>
  );
}
