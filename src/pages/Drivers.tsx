import { useState, useMemo, useCallback } from 'react';
import { Plus, Trash2, Edit2, User, Check, X, Lock, Sparkles, Clock, Users2, Search, Upload, LayoutGrid, List, ArrowUpDown, CheckSquare, Square, UserPlus, Phone, Loader2, AlertTriangle, Merge, Copy, CalendarOff } from 'lucide-react';
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
import { useRolePermissions } from '@/hooks/useRolePermissions';
import { SharedDataBadge } from '@/components/shared/SharedDataBadge';
import { DataOwnershipFilter, type OwnershipFilter } from '@/components/shared/DataOwnershipFilter';
import { TooltipProvider } from '@/components/ui/tooltip';
 import { ImportDriversDialog } from '@/components/drivers/ImportDriversDialog';
 import { DriverImportProgress, type DriverImportProgressState } from '@/components/drivers/DriverImportProgress';
 import type { ExtendedParsedDriver } from '@/utils/driversExcelImport';
 import { useCloudDrivers } from '@/hooks/useCloudDrivers';
 import { useApp } from '@/context/AppContext';
import { DriverAssignmentDialog } from '@/components/drivers/DriverAssignmentDialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useLicenseContext } from '@/context/LicenseContext';
import { useUncreatedDrivers } from '@/hooks/useUncreatedDrivers';
import { MergeDialog } from '@/components/shared/MergeDialog';
import { DuplicateDetectionBanner } from '@/components/shared/DuplicateDetectionBanner';
import { DriverAbsencesTab } from '@/components/drivers/DriverAbsencesTab';
import { DeclareAbsenceDialog } from '@/components/drivers/DeclareAbsenceDialog';
import { DriverForm } from '@/components/drivers/DriverForm';
import { DriverCategoryTab } from '@/components/drivers/DriverCategoryTab';
import { PAY_FIELDS, type DriverContractType, type ExtendedDriver } from '@/types/driver';

export default function Drivers() {
  // Use cloud drivers for shared data sync
  const { 
    cdiDrivers: cloudCdiDrivers, 
    cddDrivers: cloudCddDrivers,
    interimDrivers: cloudInterimDrivers,
    autreDrivers: cloudAutreDrivers,
    jokerDrivers: cloudJokerDrivers,
    fetchDrivers,
    createDriver: createCloudDriver,
    createDriversBatch,
    updateDriver: updateCloudDriver,
    deleteDriver: deleteCloudDriver,
    loading: driversLoading 
  } = useCloudDrivers();
  
  // Still need selectedDriverIds from context for calculator integration
  const { selectedDriverIds } = useApp();
  
  const { limits, checkLimit, isUnlimited, planType } = usePlanLimits();
  const { canViewFinancialData } = useRolePermissions();
  const { getDriverInfo, isOwnData, isCompanyMember } = useCompanyData();
  const { licenseId } = useLicenseContext();
  const { uncreatedDrivers, removeUncreatedDriver, clearAll: clearUncreated } = useUncreatedDrivers();
  const navigate = useNavigate();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState<Partial<ExtendedDriver>>({});
  const [formContractType, setFormContractType] = useState<'cdi' | 'cdd' | 'interim' | 'autre' | 'joker'>('cdi');
  const [activeTab, setActiveTab] = useState<'cdi' | 'cdd' | 'interim' | 'autre' | 'joker' | 'uncreated' | 'absences'>('cdi');
  const [searchTerm, setSearchTerm] = useState('');
  const [ownershipFilter, setOwnershipFilter] = useState<OwnershipFilter>('all');
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'name' | 'contract' | 'cost'>('name');
  const [checkedDriverIds, setCheckedDriverIds] = useState<Set<string>>(new Set());
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [isDeletingBulk, setIsDeletingBulk] = useState(false);
  const [mergeOpen, setMergeOpen] = useState(false);
  const [isDeclareAbsenceOpen, setIsDeclareAbsenceOpen] = useState(false);
  // Combined driver count for limits
  const totalDriverCount = cloudCdiDrivers.length + cloudCddDrivers.length + cloudInterimDrivers.length + cloudAutreDrivers.length + cloudJokerDrivers.length;
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

  // Toggle select-all for a given list of driver ids (used by the table header checkbox)
  const handleToggleSelectAll = (ids: string[], select: boolean) => {
    setCheckedDriverIds(prev => {
      const next = new Set(prev);
      if (select) {
        ids.forEach(id => next.add(id));
      } else {
        ids.forEach(id => next.delete(id));
      }
      return next;
    });
  };

  // True when this driver's inline edit form should be shown in place of its card/row.
  // Mirrors the original `editingId === driver.id && formData.isInterim === isInterim`
  // check, where `isInterim` came from the category tab being rendered (driverType),
  // not from the driver itself.
  const isEditingDriver = (driver: ExtendedDriver, driverType: DriverContractType) =>
    editingId === driver.id && formData.isInterim === (driverType === 'interim');

  // Select all visible drivers
  const selectAllVisible = () => {
    const allIds = activeTab === 'cdi'
      ? sortedCdiDrivers.map(d => d.id)
      : activeTab === 'cdd'
        ? sortedCddDrivers.map(d => d.id)
        : activeTab === 'autre'
          ? sortedAutreDrivers.map(d => d.id)
          : activeTab === 'joker'
            ? sortedJokerDrivers.map(d => d.id)
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
        // Check driver type
        const driverType: 'cdi' | 'cdd' | 'interim' | 'autre' | 'joker' = cloudInterimDrivers.some(d => d.id === driverId)
          ? 'interim'
          : cloudCddDrivers.some(d => d.id === driverId)
            ? 'cdd'
            : cloudAutreDrivers.some(d => d.id === driverId)
              ? 'autre'
              : cloudJokerDrivers.some(d => d.id === driverId)
                ? 'joker'
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

  const handleDuplicate = async () => {
    if (checkedDriverIds.size === 0) return;
    const driverIds = Array.from(checkedDriverIds);
    for (const driverId of driverIds) {
      const driverType: 'cdi' | 'cdd' | 'interim' | 'autre' | 'joker' = cloudInterimDrivers.some(d => d.id === driverId)
        ? 'interim'
        : cloudCddDrivers.some(d => d.id === driverId)
          ? 'cdd'
          : cloudAutreDrivers.some(d => d.id === driverId)
            ? 'autre'
            : cloudJokerDrivers.some(d => d.id === driverId)
              ? 'joker'
              : 'cdi';
      const driver = [...cloudCdiDrivers, ...cloudCddDrivers, ...cloudInterimDrivers, ...cloudAutreDrivers, ...cloudJokerDrivers].find(d => d.id === driverId);
      if (driver) {
        await createCloudDriver({ ...driver, name: `${driver.name} (copie)`, id: crypto.randomUUID() } as Driver, driverType);
      }
    }
    toast.success(`${driverIds.length} conducteur(s) dupliqué(s)`);
    clearSelection();
  };

  const handleMergeDrivers = async (keepId: string, mergeIds: string[]): Promise<boolean> => {
    try {
      for (const oldId of mergeIds) {
        // Update planning_entries driver references
        await supabase.from('planning_entries').update({ driver_id: keepId }).eq('driver_id', oldId);
        await supabase.from('planning_entries').update({ relay_driver_id: keepId }).eq('relay_driver_id', oldId);
        // Delete the duplicate driver
        const driverType: 'cdi' | 'cdd' | 'interim' | 'autre' | 'joker' = cloudInterimDrivers.some(d => d.id === oldId)
          ? 'interim'
          : cloudCddDrivers.some(d => d.id === oldId)
            ? 'cdd'
            : cloudAutreDrivers.some(d => d.id === oldId)
              ? 'autre'
              : cloudJokerDrivers.some(d => d.id === oldId)
                ? 'joker'
                : 'cdi';
        await deleteCloudDriver(oldId, driverType);
      }
      toast.success(`${mergeIds.length} conducteur(s) fusionné(s)`);
      clearSelection();
      return true;
    } catch (e) {
      console.error('Merge drivers error:', e);
      toast.error('Erreur lors de la fusion');
      return false;
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
      const typedDrivers: { driver: Driver; type: 'cdi' | 'cdd' | 'interim' | 'autre' | 'joker' }[] = [
        ...cloudCdiDrivers.map(d => ({ driver: d as Driver, type: 'cdi' as const })),
        ...cloudCddDrivers.map(d => ({ driver: d as Driver, type: 'cdd' as const })),
        ...cloudInterimDrivers.map(d => ({ driver: d as Driver, type: 'interim' as const })),
        ...cloudAutreDrivers.map(d => ({ driver: d as Driver, type: 'autre' as const })),
        ...cloudJokerDrivers.map(d => ({ driver: d as Driver, type: 'joker' as const })),
      ];

      // Assignment is stored inside the driver payload (no dedicated columns)
      for (const driverId of driverIds) {
        const entry = typedDrivers.find(d => d.driver.id === driverId);
        if (!entry) continue;

        const updated: ExtendedDriver = { ...(entry.driver as ExtendedDriver) };
        if (assignment.type === 'client') {
          updated.assignedClientId = assignment.clientId;
        } else if (assignment.type === 'city') {
          updated.assignedCity = assignment.city;
        } else if (assignment.type === 'tour') {
          updated.assignedTourIds = assignment.tourIds;
        }

        await updateCloudDriver(updated as Driver, entry.type);
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
    const currentType = activeTab === 'autre' ? 'autre' : activeTab === 'interim' ? 'interim' : activeTab === 'cdd' ? 'cdd' : 'cdi';
    setFormContractType(currentType);
    const isInterim = activeTab === 'interim';
    const isAutre = activeTab === 'autre';
    setFormData({
      name: '',
      baseSalary: isInterim || isAutre ? 0 : 2200,
      hourlyRate: isInterim ? 15 : isAutre ? 0 : 12.50,
      hoursPerDay: isAutre ? 0 : 10,
      patronalCharges: isInterim || isAutre ? 0 : 45,
      mealAllowance: isAutre ? 0 : 15.20,
      overnightAllowance: isAutre ? 0 : 45,
      workingDaysPerMonth: isAutre ? 0 : 21,
      sundayBonus: 0,
      nightBonus: 0,
      seniorityBonus: 0,
      unloadingBonus: 0,
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
    // Detect current contract type from tab
    const currentType: 'cdi' | 'cdd' | 'interim' | 'autre' = isInterim ? 'interim' : activeTab === 'cdd' ? 'cdd' : activeTab === 'autre' ? 'autre' : 'cdi';
    setFormContractType(currentType);
  };

  const handleSave = async () => {
    const isInterim = formContractType === 'interim';
    const isAutre = formContractType === 'autre';
    
    if (isAdding) {
      const newDriver: ExtendedDriver = {
        id: crypto.randomUUID(),
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
        unloadingBonus: formData.unloadingBonus || 0,
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
      await createCloudDriver(newDriver as Driver, formContractType);
      setIsAdding(false);
    } else if (editingId) {
      // Find the existing driver to merge with formData
      const allDrivers = [...cloudCdiDrivers, ...cloudCddDrivers, ...cloudInterimDrivers, ...cloudAutreDrivers, ...cloudJokerDrivers];
      const existingDriver = allDrivers.find(d => d.id === editingId);
      
      const mergedForm = { ...formData };
      if (!canViewFinancialData) {
        // Ce membre travaille sur une fiche sans données de paie : on ne renvoie
        // aucune valeur de rémunération pour ne pas écraser celles enregistrées.
        for (const key of PAY_FIELDS) {
          delete (mergedForm as Record<string, unknown>)[key];
        }
      }
      const updatedDriver = { ...existingDriver, ...mergedForm, id: editingId } as ExtendedDriver;
      await updateCloudDriver(updatedDriver as Driver, formContractType);
      setEditingId(null);
    }
    setFormData({});
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
    setFormData({});
  };

  const handleDelete = async (id: string, driverType: 'cdi' | 'cdd' | 'interim' | 'autre' | 'joker') => {
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

  const [importProgress, setImportProgress] = useState<DriverImportProgressState>({
    active: false, done: 0, total: 0, label: '', finished: false,
  });

  const dismissImportProgress = useCallback(() => {
    setImportProgress(p => ({ ...p, active: false }));
  }, []);

  const handleImportDrivers = useCallback((importedDrivers: ExtendedParsedDriver[]) => {
    console.log('[Drivers] handleImportDrivers called with', importedDrivers.length, 'drivers');

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
        unloadingBonus: driver.unloadingBonus || 0,
        isInterim: driverType === 'interim',
        interimAgency: driver.interimAgency || '',
        interimHourlyRate: 15,
        interimCoefficient: 1.85,
        scheduleType: 'day',
      };
      return { driver: newDriver as Driver, type: driverType };
    });

    // Show progress bar immediately
    setImportProgress({
      active: true,
      done: 0,
      total: driversToCreate.length,
      label: `Import de ${driversToCreate.length} conducteur(s)...`,
      finished: false,
    });

    // Run import in background (not awaited)
    (async () => {
      try {
        const count = await createDriversBatch(driversToCreate, (done, total) => {
          setImportProgress(p => ({ ...p, done, total }));
        });

        // Refresh to reconcile
        try { await fetchDrivers(); } catch (e) {
          console.warn('[Drivers] fetchDrivers error after import:', e);
        }

        setImportProgress(p => ({
          ...p,
          done: driversToCreate.length,
          finished: true,
          label: `${count} conducteur(s) importé(s) ✓`,
        }));

        toast.success(`${count} conducteur(s) importé(s) avec succès`);

        if (count < driversToCreate.length) {
          const failures = driversToCreate.length - count;
          toast.warning(`${failures} conducteur(s) non importé(s) (erreur ou doublon)`);
        }

        // Auto-dismiss after 4s
        setTimeout(() => {
          setImportProgress(p => ({ ...p, active: false }));
        }, 4000);
      } catch (err) {
        console.error('[Drivers] Background import error:', err);
        setImportProgress(p => ({
          ...p,
          finished: true,
          label: 'Erreur lors de l\'import',
          error: err instanceof Error ? err.message : 'Erreur inconnue',
        }));
      }
    })();
  }, [createDriversBatch, fetchDrivers]);
 
  // Cast cloud drivers to ExtendedDriver for UI
  const cdiDrivers = cloudCdiDrivers as ExtendedDriver[];
  const cddDrivers = cloudCddDrivers as ExtendedDriver[];
  const interimDrivers = cloudInterimDrivers as ExtendedDriver[];
  const autreDrivers = cloudAutreDrivers as ExtendedDriver[];
  const jokerDrivers = cloudJokerDrivers as ExtendedDriver[];


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

  const filteredAutreDrivers = useMemo(() => {
    let result = autreDrivers;
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase().trim();
      result = result.filter(d => d.name.toLowerCase().includes(search));
    }
    return result;
  }, [autreDrivers, searchTerm]);

  const sortedAutreDrivers = useMemo(() => {
    const drivers = [...filteredAutreDrivers];
    return drivers.sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  }, [filteredAutreDrivers]);

  const filteredJokerDrivers = useMemo(() => {
    let result = jokerDrivers;
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase().trim();
      result = result.filter(d => d.name.toLowerCase().includes(search));
    }
    return result;
  }, [jokerDrivers, searchTerm]);

  const sortedJokerDrivers = useMemo(() => {
    const drivers = [...filteredJokerDrivers];
    return drivers.sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  }, [filteredJokerDrivers]);

  // Shared add/edit form, rendered inside the active category tab (grid card slot or
  // top-of-list add slot) — identical component/props regardless of which tab shows it.
  const driverFormSlot = (
    <DriverForm
      formData={formData}
      setFormData={setFormData}
      formContractType={formContractType}
      setFormContractType={setFormContractType}
      canViewFinancialData={canViewFinancialData}
      onCancel={handleCancel}
      onSave={handleSave}
    />
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
         <Button variant="outline" size="sm" onClick={() => setIsDeclareAbsenceOpen(true)} className="gap-2">
           <CalendarOff className="w-4 h-4 text-amber-500" />
           Déclarer une absence
         </Button>
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
            {checkedDriverIds.size >= 2 && (
              <Button variant="outline" size="sm" onClick={() => setMergeOpen(true)} className="gap-2">
                <Merge className="w-4 h-4" />
                Fusionner
              </Button>
            )}
            <Button onClick={() => setIsAssignDialogOpen(true)} className="gap-2">
              <UserPlus className="w-4 h-4" />
              Assigner
            </Button>
            <Button variant="outline" size="sm" onClick={handleDuplicate} className="gap-2">
              <Copy className="w-4 h-4" />
              Dupliquer
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
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'cdi' | 'cdd' | 'interim' | 'autre' | 'joker' | 'uncreated' | 'absences')}>
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
            <TabsTrigger value="joker" className="gap-2">
              <Sparkles className="w-4 h-4" />
              Joker / Polyvalents ({filteredJokerDrivers?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="autre" className="gap-2">
              <User className="w-4 h-4" />
              Autres ({filteredAutreDrivers.length})
            </TabsTrigger>
            <TabsTrigger value="absences" className="gap-2">
              <CalendarOff className="w-4 h-4" />
              <span className="hidden sm:inline">Absences</span>
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
            {activeTab === 'interim' ? 'Ajouter un intérimaire' : activeTab === 'autre' ? 'Ajouter un profil' : activeTab === 'joker' ? 'Ajouter un joker' : 'Ajouter un conducteur'}
          </Button>
        </div>

        {/* Duplicate detection banner */}
        <DuplicateDetectionBanner
          items={[...cloudCdiDrivers, ...cloudCddDrivers, ...cloudInterimDrivers, ...cloudJokerDrivers].map(d => ({
            id: d.id,
            name: d.firstName && d.lastName ? `${d.firstName} ${d.lastName}` : d.name,
            extra: cloudInterimDrivers.some(i => i.id === d.id) ? 'Intérim' : cloudCddDrivers.some(c => c.id === d.id) ? 'CDD' : cloudJokerDrivers.some(j => j.id === d.id) ? 'Joker' : 'CDI',
          }))}
          entityLabel="conducteurs"
          onMerge={handleMergeDrivers}
        />

        <TabsContent value="cdi" className="mt-6">
          <DriverCategoryTab
            driverType="cdi"
            drivers={sortedCdiDrivers}
            hasAnyDriver={cdiDrivers.length > 0}
            viewMode={viewMode}
            showAddForm={isAdding && activeTab === 'cdi'}
            isAddingAnywhere={isAdding}
            formSlot={driverFormSlot}
            emptyState={{
              icon: User,
              title: 'Aucun conducteur CDI',
              description: 'Commencez par ajouter un conducteur pour calculer les coûts salariaux.',
              ctaLabel: 'Ajouter un conducteur',
            }}
            onAdd={handleAdd}
            isEditingDriver={isEditingDriver}
            selectedDriverIds={selectedDriverIds}
            checkedDriverIds={checkedDriverIds}
            onToggleCheck={toggleDriverCheck}
            onToggleSelectAll={handleToggleSelectAll}
            onEdit={handleEdit}
            onDelete={handleDelete}
            formatCurrency={formatCurrency}
            calculateEmployerCost={calculateEmployerCost}
            isCompanyMember={isCompanyMember}
            getDriverInfo={getDriverInfo}
            isOwnData={isOwnData}
          />
        </TabsContent>

        <TabsContent value="cdd" className="mt-6">
          <DriverCategoryTab
            driverType="cdd"
            drivers={sortedCddDrivers}
            hasAnyDriver={cddDrivers.length > 0}
            viewMode={viewMode}
            showAddForm={isAdding && activeTab === 'cdd'}
            isAddingAnywhere={isAdding}
            formSlot={driverFormSlot}
            emptyState={{
              icon: User,
              title: 'Aucun conducteur CDD',
              description: 'Ajoutez des conducteurs en contrat CDD.',
              ctaLabel: 'Ajouter un conducteur CDD',
            }}
            onAdd={handleAdd}
            isEditingDriver={isEditingDriver}
            selectedDriverIds={selectedDriverIds}
            checkedDriverIds={checkedDriverIds}
            onToggleCheck={toggleDriverCheck}
            onToggleSelectAll={handleToggleSelectAll}
            onEdit={handleEdit}
            onDelete={handleDelete}
            formatCurrency={formatCurrency}
            calculateEmployerCost={calculateEmployerCost}
            isCompanyMember={isCompanyMember}
            getDriverInfo={getDriverInfo}
            isOwnData={isOwnData}
          />
        </TabsContent>

        <TabsContent value="interim" className="mt-6">
          <DriverCategoryTab
            driverType="interim"
            drivers={sortedInterimDrivers}
            hasAnyDriver={interimDrivers.length > 0}
            viewMode={viewMode}
            showAddForm={isAdding && activeTab === 'interim'}
            isAddingAnywhere={isAdding}
            formSlot={driverFormSlot}
            emptyState={{
              icon: Users2,
              title: 'Aucun intérimaire',
              description: 'Ajoutez des conducteurs intérimaires avec leur coût agence.',
              ctaLabel: 'Ajouter un intérimaire',
            }}
            onAdd={handleAdd}
            isEditingDriver={isEditingDriver}
            selectedDriverIds={selectedDriverIds}
            checkedDriverIds={checkedDriverIds}
            onToggleCheck={toggleDriverCheck}
            onToggleSelectAll={handleToggleSelectAll}
            onEdit={handleEdit}
            onDelete={handleDelete}
            formatCurrency={formatCurrency}
            calculateEmployerCost={calculateEmployerCost}
            isCompanyMember={isCompanyMember}
            getDriverInfo={getDriverInfo}
            isOwnData={isOwnData}
          />
        </TabsContent>

        <TabsContent value="autre" className="mt-6">
          <DriverCategoryTab
            driverType="autre"
            drivers={sortedAutreDrivers}
            hasAnyDriver={autreDrivers.length > 0}
            viewMode={viewMode}
            showAddForm={isAdding && activeTab === 'autre'}
            isAddingAnywhere={isAdding}
            formSlot={driverFormSlot}
            emptyState={{
              icon: User,
              title: 'Aucun profil "Autre"',
              description: 'Ajoutez des profils non-conducteurs à utiliser dans le planning (ex: responsable, accompagnateur).',
              ctaLabel: 'Ajouter un profil',
            }}
            onAdd={handleAdd}
            isEditingDriver={isEditingDriver}
            selectedDriverIds={selectedDriverIds}
            checkedDriverIds={checkedDriverIds}
            onToggleCheck={toggleDriverCheck}
            onToggleSelectAll={handleToggleSelectAll}
            onEdit={handleEdit}
            onDelete={handleDelete}
            formatCurrency={formatCurrency}
            calculateEmployerCost={calculateEmployerCost}
            isCompanyMember={isCompanyMember}
            getDriverInfo={getDriverInfo}
            isOwnData={isOwnData}
          />
        </TabsContent>

        <TabsContent value="joker" className="mt-6">
          <DriverCategoryTab
            driverType="joker"
            drivers={sortedJokerDrivers}
            hasAnyDriver={jokerDrivers.length > 0}
            viewMode={viewMode}
            showAddForm={isAdding && activeTab === 'joker'}
            isAddingAnywhere={isAdding}
            formSlot={driverFormSlot}
            emptyState={{
              icon: Sparkles,
              title: 'Aucun joker / polyvalent',
              description: 'Ajoutez des conducteurs polyvalents pouvant remplacer sur différentes lignes.',
              ctaLabel: 'Ajouter un joker',
            }}
            onAdd={handleAdd}
            isEditingDriver={isEditingDriver}
            selectedDriverIds={selectedDriverIds}
            checkedDriverIds={checkedDriverIds}
            onToggleCheck={toggleDriverCheck}
            onToggleSelectAll={handleToggleSelectAll}
            onEdit={handleEdit}
            onDelete={handleDelete}
            formatCurrency={formatCurrency}
            calculateEmployerCost={calculateEmployerCost}
            isCompanyMember={isCompanyMember}
            getDriverInfo={getDriverInfo}
            isOwnData={isOwnData}
          />
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

        <TabsContent value="absences" className="mt-6">
          <DriverAbsencesTab allDrivers={[...cloudCdiDrivers, ...cloudCddDrivers, ...cloudInterimDrivers, ...cloudAutreDrivers, ...cloudJokerDrivers] as Driver[]} />
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
      <MergeDialog
        open={mergeOpen}
        onOpenChange={setMergeOpen}
        items={[...cloudCdiDrivers, ...cloudCddDrivers, ...cloudInterimDrivers]
          .filter(d => checkedDriverIds.has(d.id))
          .map(d => ({
            id: d.id,
            name: d.firstName && d.lastName ? `${d.firstName} ${d.lastName}` : d.name,
            extra: cloudInterimDrivers.some(i => i.id === d.id) ? 'Intérim' : cloudCddDrivers.some(c => c.id === d.id) ? 'CDD' : 'CDI',
          }))}
        entityLabel="conducteurs"
        onMerge={handleMergeDrivers}
        allItems={[...cloudCdiDrivers, ...cloudCddDrivers, ...cloudInterimDrivers].map(d => ({
          id: d.id,
          name: d.firstName && d.lastName ? `${d.firstName} ${d.lastName}` : d.name,
          extra: cloudInterimDrivers.some(i => i.id === d.id) ? 'Intérim' : cloudCddDrivers.some(c => c.id === d.id) ? 'CDD' : 'CDI',
        }))}
      />

      <DriverImportProgress progress={importProgress} onDismiss={dismissImportProgress} />

      <DeclareAbsenceDialog
        open={isDeclareAbsenceOpen}
        onOpenChange={setIsDeclareAbsenceOpen}
        allDrivers={[...cloudCdiDrivers, ...cloudCddDrivers, ...cloudInterimDrivers, ...cloudAutreDrivers, ...cloudJokerDrivers]}
      />
    </div>
  );
}
