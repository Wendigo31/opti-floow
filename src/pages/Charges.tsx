import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Building2, Shield, Car, FileText, Wrench, MoreHorizontal, Check, X, Calendar, CalendarDays, CalendarRange, Copy, Lock, Upload, Package, EyeOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useApp } from '@/context/AppContext';
import { useCloudCharges } from '@/hooks/useCloudCharges';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import { useLicense } from '@/hooks/useLicense';
import { useNavigate } from 'react-router-dom';
import type { FixedCharge } from '@/types';
import { cn } from '@/lib/utils';
import { ExcelImportDialog } from '@/components/import/ExcelImportDialog';
import { toast } from 'sonner';
import { FeatureGate } from '@/components/license/FeatureGate';
import { ChargePresetsDialog } from '@/components/charges/ChargePresetsDialog';
import { useTeam } from '@/hooks/useTeam';

const categoryIcons = {
  insurance: Shield,
  leasing: Car,
  administrative: FileText,
  maintenance: Wrench,
  other: MoreHorizontal,
};

const categoryLabels = {
  insurance: 'Assurance',
  leasing: 'Crédit-bail',
  administrative: 'Administratif',
  maintenance: 'Entretien',
  other: 'Autre',
};

const periodicityLabels = {
  daily: 'Journalier',
  monthly: 'Mensuel',
  yearly: 'Annuel',
};

export default function Charges() {
  // Local context only for settings
  const { settings } = useApp();
  
  // Cloud charges hook for shared data sync
  const {
    charges,
    loading: chargesLoading,
    fetchCharges,
    createCharge: createCloudCharge,
    updateCharge: updateCloudCharge,
    deleteCharge: deleteCloudCharge,
  } = useCloudCharges();
  
  const { limits, checkLimit, isUnlimited } = usePlanLimits();
  const { licenseData } = useLicense();
  const { isDirection: isDirectionFromTeam, isLoading: isTeamLoading } = useTeam();
  const isDirection = isDirectionFromTeam || licenseData?.userRole === 'direction';
  const navigate = useNavigate();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [addingPeriodicity, setAddingPeriodicity] = useState<'daily' | 'monthly' | 'yearly' | null>(null);
  const [formData, setFormData] = useState<Partial<FixedCharge>>({});
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [presetsDialogOpen, setPresetsDialogOpen] = useState(false);
  
  // Fetch charges on mount if not already loaded
  useEffect(() => {
    if (charges.length === 0 && !chargesLoading) {
      fetchCharges();
    }
  }, []);
  
  // Only direction role can view and modify charges
  // Default to showing charges while team role is loading (avoid flash of "access denied")
  const canViewCharges = isTeamLoading ? true : isDirection;
  const canModifyCharges = isTeamLoading ? true : isDirection;
  
  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value);

  // Convert to HT for calculation
  const toHT = (amount: number, isHT: boolean) => {
    if (isHT) return amount;
    return amount / (1 + settings.tvaRate / 100);
  };

  const getDailyAmountHT = (charge: FixedCharge) => {
    const amountHT = toHT(charge.amount, charge.isHT);
    switch (charge.periodicity) {
      case 'yearly':
        return amountHT / settings.workingDaysPerYear;
      case 'monthly':
        return amountHT / settings.workingDaysPerMonth;
      case 'daily':
        return amountHT;
    }
  };

  const totalDailyCostHT = charges.reduce((sum, charge) => sum + getDailyAmountHT(charge), 0);

  // Filter charges by periodicity
  const dailyCharges = charges.filter(c => c.periodicity === 'daily');
  const monthlyCharges = charges.filter(c => c.periodicity === 'monthly');
  const yearlyCharges = charges.filter(c => c.periodicity === 'yearly');

  // Check limits per periodicity
  const canAddDaily = checkLimit('maxDailyCharges', dailyCharges.length);
  const canAddMonthly = checkLimit('maxMonthlyCharges', monthlyCharges.length);
  const canAddYearly = checkLimit('maxYearlyCharges', yearlyCharges.length);

  const handleAdd = (periodicity: 'daily' | 'monthly' | 'yearly') => {
    // Check limits before allowing add
    const canAdd = periodicity === 'daily' ? canAddDaily : periodicity === 'monthly' ? canAddMonthly : canAddYearly;
    if (!canAdd) {
      toast.info('Limite atteinte pour votre forfait', {
        description: 'Passez à un forfait supérieur pour ajouter plus de charges.',
      });
      return;
    }
    
    setIsAdding(true);
    setAddingPeriodicity(periodicity);
    setFormData({
      name: '',
      amount: 0,
      isHT: false,
      periodicity,
      category: 'other',
    });
  };

  const handleEdit = (charge: FixedCharge) => {
    setEditingId(charge.id);
    setFormData(charge);
  };

  const handleSave = async () => {
    if (isAdding) {
      const newCharge: FixedCharge = {
        id: Date.now().toString(),
        name: formData.name || 'Nouvelle charge',
        amount: formData.amount || 0,
        isHT: formData.isHT ?? false,
        periodicity: formData.periodicity as 'daily' | 'monthly' | 'yearly' || 'monthly',
        category: formData.category as FixedCharge['category'] || 'other',
      };
      await createCloudCharge(newCharge);
      setIsAdding(false);
      setAddingPeriodicity(null);
    } else if (editingId) {
      const updatedCharge = { ...charges.find(c => c.id === editingId), ...formData, id: editingId } as FixedCharge;
      await updateCloudCharge(updatedCharge);
      setEditingId(null);
    }
    setFormData({});
  };

  const handleCancel = () => {
    setIsAdding(false);
    setAddingPeriodicity(null);
    setEditingId(null);
    setFormData({});
  };

  const handleDelete = async (id: string) => {
    await deleteCloudCharge(id);
  };

  const handleDuplicate = (charge: FixedCharge) => {
    const duplicatedCharge: FixedCharge = {
      ...charge,
      id: Date.now().toString(),
      name: `${charge.name} (copie)`,
    };
    void createCloudCharge(duplicatedCharge);
  };

  const handleImportCharges = async (importedCharges: Partial<FixedCharge>[]) => {
    // Create charges one by one in cloud
    for (let index = 0; index < importedCharges.length; index++) {
      const c = importedCharges[index];
      const newCharge: FixedCharge = {
        id: `imported_${Date.now()}_${index}`,
        name: c.name || 'Charge importée',
        amount: c.amount || 0,
        isHT: c.isHT ?? false,
        periodicity: (c.periodicity || 'monthly') as 'daily' | 'monthly' | 'yearly',
        category: (c.category || 'other') as FixedCharge['category'],
      };
      await createCloudCharge(newCharge);
    }
    toast.success(`${importedCharges.length} charge(s) importée(s)`);
  };

  const renderForm = () => (
    <div className="glass-card p-6 space-y-4 opacity-0 animate-scale-in" style={{ animationFillMode: 'forwards' }}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Nom de la charge</Label>
          <Input
            id="name"
            value={formData.name || ''}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Ex: Assurance véhicule"
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="amount">Montant (€)</Label>
            <div className="flex items-center gap-2">
              <span className={cn("text-xs", formData.isHT ? "text-muted-foreground" : "font-medium text-foreground")}>TTC</span>
              <Switch
                checked={formData.isHT ?? false}
                onCheckedChange={(checked) => setFormData({ ...formData, isHT: checked })}
              />
              <span className={cn("text-xs", formData.isHT ? "font-medium text-foreground" : "text-muted-foreground")}>HT</span>
            </div>
          </div>
          <Input
            id="amount"
            type="number"
            step="0.01"
            value={formData.amount || ''}
            onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="category">Catégorie</Label>
          <Select
            value={formData.category}
            onValueChange={(value) => setFormData({ ...formData, category: value as FixedCharge['category'] })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="insurance">Assurance</SelectItem>
              <SelectItem value="leasing">Crédit-bail</SelectItem>
              <SelectItem value="administrative">Administratif</SelectItem>
              <SelectItem value="maintenance">Entretien</SelectItem>
              <SelectItem value="other">Autre</SelectItem>
            </SelectContent>
          </Select>
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

  const renderChargeCard = (charge: FixedCharge, index: number) => {
    const Icon = categoryIcons[charge.category];
    const dailyAmountHT = getDailyAmountHT(charge);
    
    return (
      <div
        key={charge.id}
        className="glass-card p-5 opacity-0 animate-slide-up"
        style={{ animationDelay: `${(index + 1) * 50}ms`, animationFillMode: 'forwards' }}
      >
        {editingId === charge.id ? (
          renderForm()
        ) : (
          <>
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
                  <Icon className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="font-medium text-foreground text-sm">{charge.name}</h3>
                  <p className="text-xs text-muted-foreground">
                    {categoryLabels[charge.category]}
                  </p>
                </div>
              </div>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleDuplicate(charge)} title="Dupliquer">
                  <Copy className="w-3.5 h-3.5" />
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleEdit(charge)} title="Modifier">
                  <Edit2 className="w-3.5 h-3.5" />
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleDelete(charge.id)} title="Supprimer">
                  <Trash2 className="w-3.5 h-3.5 text-destructive" />
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Montant</span>
                <span className="font-medium text-foreground text-sm">
                  {formatCurrency(charge.amount)}
                  <span className="text-xs text-muted-foreground ml-1">
                    {charge.isHT ? 'HT' : 'TTC'}
                  </span>
                </span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-border/50">
                <span className="text-xs text-muted-foreground">Coût journalier HT</span>
                <span className="font-bold text-primary text-sm">
                  {formatCurrency(dailyAmountHT)}
                </span>
              </div>
            </div>
          </>
        )}
      </div>
    );
  };

  const renderPeriodicitySection = (
    title: string, 
    icon: React.ReactNode, 
    periodicity: 'daily' | 'monthly' | 'yearly',
    chargesList: FixedCharge[],
    color: string
  ) => {
    const total = chargesList.reduce((sum, c) => sum + c.amount, 0);
    const dailyTotalHT = chargesList.reduce((sum, c) => sum + getDailyAmountHT(c), 0);
    
    const limitKey = periodicity === 'daily' ? 'maxDailyCharges' : periodicity === 'monthly' ? 'maxMonthlyCharges' : 'maxYearlyCharges';
    const canAdd = checkLimit(limitKey, chargesList.length);
    const maxLimit = limits[limitKey];
    
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", color)}>
              {icon}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">{title}</h2>
              <p className="text-sm text-muted-foreground">
                {chargesList.length}{!isUnlimited(limitKey) && `/${maxLimit}`} charge(s) • Total: {formatCurrency(total)}
              </p>
            </div>
          </div>
          {canAdd ? (
            <Button size="sm" variant="outline" onClick={() => handleAdd(periodicity)}>
              <Plus className="w-4 h-4 mr-1" />
              Ajouter
            </Button>
          ) : (
            <Button size="sm" variant="outline" onClick={() => toast.info('Limite atteinte pour votre forfait', { description: 'Passez à un forfait supérieur pour ajouter plus de charges.' })} className="gap-1">
              <Lock className="w-3 h-3" />
              Limite atteinte
            </Button>
          )}
        </div>
        
        {isAdding && addingPeriodicity === periodicity && renderForm()}
        
        {chargesList.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {chargesList.map((charge, index) => renderChargeCard(charge, index))}
          </div>
        ) : (
          <div className="glass-card p-8 text-center">
            <p className="text-muted-foreground text-sm">Aucune charge {periodicityLabels[periodicity].toLowerCase()}</p>
          </div>
        )}
        
        {chargesList.length > 0 && (
          <div className="flex justify-end">
            <div className="text-sm text-muted-foreground">
              Impact journalier HT: <span className="font-medium text-foreground">{formatCurrency(dailyTotalHT)}</span>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Show access denied message for non-direction users
  // Only show loading for charges data, not team role check (default to showing content)
  if (chargesLoading && charges.length === 0) {
    return (
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Gestion des charges fixes</h1>
            <p className="text-muted-foreground mt-1">Chargement...</p>
          </div>
        </div>
        <div className="glass-card p-12 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }
  
  if (!canViewCharges) {
    return (
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Gestion des charges fixes</h1>
            <p className="text-muted-foreground mt-1">
              Configurez vos charges récurrentes
            </p>
          </div>
        </div>
        
        <div className="glass-card p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <EyeOff className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold text-foreground mb-2">Accès restreint</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            Les charges fixes sont réservées aux utilisateurs avec le rôle <span className="font-medium text-foreground">Direction</span>.
            Contactez la direction de votre entreprise si vous avez besoin d'accéder à ces informations.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Gestion des charges fixes</h1>
          <p className="text-muted-foreground mt-1">
            Configurez vos charges récurrentes
          </p>
        </div>
        {canModifyCharges && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setPresetsDialogOpen(true)} className="gap-2">
              <Package className="w-4 h-4" />
              Presets
            </Button>
            <FeatureGate feature="btn_export_excel" showLockedIndicator={false}>
              <Button variant="outline" onClick={() => setImportDialogOpen(true)} className="gap-2">
                <Upload className="w-4 h-4" />
                Importer Excel
              </Button>
            </FeatureGate>
          </div>
        )}
      </div>
      
      <ChargePresetsDialog
        open={presetsDialogOpen}
        onOpenChange={setPresetsDialogOpen}
      />

      <ExcelImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        type="charges"
        onImport={handleImportCharges}
      />
      {/* Summary Card */}
      <div className="glass-card p-6 opacity-0 animate-slide-up" style={{ animationDelay: '100ms', animationFillMode: 'forwards' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-destructive/20 flex items-center justify-center">
              <Building2 className="w-6 h-6 text-destructive" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Coût de structure journalier HT</p>
              <p className="text-2xl font-bold text-foreground">{formatCurrency(totalDailyCostHT)}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Mensuel estimé HT</p>
            <p className="text-lg font-medium text-muted-foreground">
              {formatCurrency(totalDailyCostHT * settings.workingDaysPerMonth)}
            </p>
          </div>
        </div>
      </div>

      {/* Daily Charges */}
      <div className="opacity-0 animate-slide-up" style={{ animationDelay: '150ms', animationFillMode: 'forwards' }}>
        {renderPeriodicitySection(
          'Charges Journalières',
          <Calendar className="w-5 h-5 text-blue-400" />,
          'daily',
          dailyCharges,
          'bg-blue-500/20'
        )}
      </div>

      {/* Monthly Charges */}
      <div className="opacity-0 animate-slide-up" style={{ animationDelay: '200ms', animationFillMode: 'forwards' }}>
        {renderPeriodicitySection(
          'Charges Mensuelles',
          <CalendarDays className="w-5 h-5 text-purple-400" />,
          'monthly',
          monthlyCharges,
          'bg-purple-500/20'
        )}
      </div>

      {/* Yearly Charges */}
      <div className="opacity-0 animate-slide-up" style={{ animationDelay: '250ms', animationFillMode: 'forwards' }}>
        {renderPeriodicitySection(
          'Charges Annuelles',
          <CalendarRange className="w-5 h-5 text-amber-400" />,
          'yearly',
          yearlyCharges,
          'bg-amber-500/20'
        )}
      </div>

      {charges.length === 0 && !isAdding && canModifyCharges && (
        <div className="glass-card p-12 text-center">
          <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">Aucune charge fixe</h3>
          <p className="text-muted-foreground mb-4">
            Ajoutez vos frais de structure pour un calcul complet du coût de revient.
          </p>
        </div>
      )}
    </div>
  );
}
