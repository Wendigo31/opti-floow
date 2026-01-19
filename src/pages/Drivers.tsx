import { useState, useMemo } from 'react';
import { Plus, Trash2, Edit2, User, Check, X, Lock, Sparkles, Clock, Users2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { useApp } from '@/context/AppContext';
import type { Driver } from '@/types';
import { cn } from '@/lib/utils';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useCompanyData } from '@/hooks/useCompanyData';
import { SharedDataBadge } from '@/components/shared/SharedDataBadge';
import { DataOwnershipFilter, type OwnershipFilter } from '@/components/shared/DataOwnershipFilter';
import { TooltipProvider } from '@/components/ui/tooltip';

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
}

export default function Drivers() {
  const { t } = useLanguage();
  const { drivers, setDrivers, selectedDriverIds } = useApp();
  const { limits, checkLimit, isUnlimited, planType } = usePlanLimits();
  const { getDriverInfo, isOwnData, isCompanyMember } = useCompanyData();
  const navigate = useNavigate();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState<Partial<ExtendedDriver>>({});
  const [activeTab, setActiveTab] = useState<'cdi' | 'interim'>('cdi');
  const [searchTerm, setSearchTerm] = useState('');
  const [ownershipFilter, setOwnershipFilter] = useState<OwnershipFilter>('all');
  
  // Store interim drivers separately
  const [interimDrivers, setInterimDrivers] = useLocalStorage<ExtendedDriver[]>('optiflow_interim_drivers', []);
  
  const canAddDriver = checkLimit('maxDrivers', drivers.length + interimDrivers.length);

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

  const handleEdit = (driver: ExtendedDriver) => {
    setEditingId(driver.id);
    setFormData(driver);
  };

  const handleSave = () => {
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
      
      if (isInterim) {
        setInterimDrivers([...interimDrivers, newDriver]);
      } else {
        setDrivers([...drivers, newDriver as Driver]);
      }
      setIsAdding(false);
    } else if (editingId) {
      if (formData.isInterim) {
        setInterimDrivers(interimDrivers.map(d => 
          d.id === editingId 
            ? { ...d, ...formData } as ExtendedDriver
            : d
        ));
      } else {
        setDrivers(drivers.map(d => 
          d.id === editingId 
            ? { ...d, ...formData } as Driver
            : d
        ));
      }
      setEditingId(null);
    }
    setFormData({});
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
    setFormData({});
  };

  const handleDelete = (id: string, isInterim: boolean) => {
    if (isInterim) {
      setInterimDrivers(interimDrivers.filter(d => d.id !== id));
    } else {
      setDrivers(drivers.filter(d => d.id !== id));
    }
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

  const renderDriverCard = (driver: ExtendedDriver, index: number, isInterim: boolean) => {
    const driverInfo = getDriverInfo(driver.id);
    const isShared = !!driverInfo?.licenseId;
    const isOwn = driverInfo ? isOwnData(driverInfo.userId) : true;
    
    return (
      <div
        key={driver.id}
        className={cn(
          "glass-card p-6 opacity-0 animate-slide-up",
          selectedDriverIds.includes(driver.id) && "ring-2 ring-primary/50"
        )}
        style={{ animationDelay: `${index * 100}ms`, animationFillMode: 'forwards' }}
      >
        {editingId === driver.id ? (
          renderForm()
        ) : (
          <>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
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
                    <h3 className="text-lg font-semibold text-foreground">{driver.name}</h3>
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
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="icon" variant="ghost" onClick={() => handleEdit(driver)}>
                <Edit2 className="w-4 h-4" />
              </Button>
              <Button size="icon" variant="ghost" onClick={() => handleDelete(driver.id, isInterim)}>
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
    let result = (drivers as ExtendedDriver[]).filter(d => !d.isInterim);
    
    // Filter by search
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase().trim();
      result = result.filter(d => d.name.toLowerCase().includes(search));
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
  }, [drivers, searchTerm, ownershipFilter, isCompanyMember, getDriverInfo, isOwnData]);

  const filteredInterimDrivers = useMemo(() => {
    let result = interimDrivers;
    
    // Filter by search
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase().trim();
      result = result.filter(d => d.name.toLowerCase().includes(search));
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

  const cdiDrivers = (drivers as ExtendedDriver[]).filter(d => !d.isInterim);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t.drivers.title}</h1>
          <p className="text-muted-foreground mt-1">
            {t.drivers.subtitle}
          </p>
          {!isUnlimited('maxDrivers') && !canAddDriver && (
            <p className="text-xs text-warning mt-1 flex items-center gap-1">
              <Lock className="w-3 h-3" />
              {t.drivers.limitReached}
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
        {isCompanyMember && (
          <DataOwnershipFilter
            value={ownershipFilter}
            onChange={setOwnershipFilter}
          />
        )}
      </div>

      {/* Tabs CDI / Intérim */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'cdi' | 'interim')}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="cdi" className="gap-2">
              <User className="w-4 h-4" />
              CDI ({filteredCdiDrivers.length})
            </TabsTrigger>
            <TabsTrigger value="interim" className="gap-2">
              <Users2 className="w-4 h-4" />
              Intérimaires ({filteredInterimDrivers.length})
            </TabsTrigger>
          </TabsList>
          <Button 
            onClick={handleAdd} 
            disabled={isAdding || !canAddDriver}
          >
            <Plus className="w-4 h-4 mr-2" />
            {activeTab === 'cdi' ? 'Ajouter un conducteur' : 'Ajouter un intérimaire'}
          </Button>
        </div>

        <TabsContent value="cdi" className="mt-6">
          {/* Add Form */}
          {isAdding && activeTab === 'cdi' && renderForm()}

          {/* CDI Drivers List */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredCdiDrivers.map((driver, index) => renderDriverCard(driver, index, false))}
          </div>

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

        <TabsContent value="interim" className="mt-6">
          {/* Add Form */}
          {isAdding && activeTab === 'interim' && renderForm()}

          {/* Interim Drivers List */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredInterimDrivers.map((driver, index) => renderDriverCard(driver, index, true))}
          </div>

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
      </Tabs>
    </div>
  );
}
