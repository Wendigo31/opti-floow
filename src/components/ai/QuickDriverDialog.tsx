import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useCloudDrivers } from '@/hooks/useCloudDrivers';
import { useToast } from '@/hooks/use-toast';
import { Loader2, UserPlus, Clock, Sparkles } from 'lucide-react';
import type { Driver } from '@/types';

interface QuickDriverDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Heures de traction calculées depuis loadingTime/deliveryTime (forfait synchronisé) */
  tractionHoursPerDay: number;
  /** Jours travaillés/mois — déduits de la fréquence */
  tractionDaysPerMonth: number;
  onCreated?: (driverId: string) => void;
}

type ContractType = 'cdi' | 'cdd' | 'interim';

const CONTRACT_DEFAULTS: Record<ContractType, Partial<Driver>> = {
  cdi: {
    baseSalary: 2200,
    hourlyRate: 14.5,
    patronalCharges: 42,
    mealAllowance: 15.96,
    overnightAllowance: 50,
    sundayBonus: 0,
    nightBonus: 0,
    seniorityBonus: 0,
    unloadingBonus: 0,
  },
  cdd: {
    baseSalary: 2100,
    hourlyRate: 14,
    patronalCharges: 45,
    mealAllowance: 15.96,
    overnightAllowance: 50,
    sundayBonus: 0,
    nightBonus: 0,
    seniorityBonus: 0,
    unloadingBonus: 0,
  },
  interim: {
    baseSalary: 0,
    hourlyRate: 16,
    patronalCharges: 0,
    mealAllowance: 15.96,
    overnightAllowance: 50,
    sundayBonus: 0,
    nightBonus: 0,
    seniorityBonus: 0,
    unloadingBonus: 0,
    interimAgency: '',
    interimHourlyRate: 16,
    interimCoefficient: 1.85,
  },
};

export function QuickDriverDialog({
  open,
  onOpenChange,
  tractionHoursPerDay,
  tractionDaysPerMonth,
  onCreated,
}: QuickDriverDialogProps) {
  const { toast } = useToast();
  const { createDriver } = useCloudDrivers();

  const [contractType, setContractType] = useState<ContractType>('cdi');
  const [name, setName] = useState('');
  const [hourlyRate, setHourlyRate] = useState(CONTRACT_DEFAULTS.cdi.hourlyRate || 14.5);
  const [baseSalary, setBaseSalary] = useState(CONTRACT_DEFAULTS.cdi.baseSalary || 2200);
  const [patronalCharges, setPatronalCharges] = useState(CONTRACT_DEFAULTS.cdi.patronalCharges || 42);
  const [interimAgency, setInterimAgency] = useState('');
  const [interimCoeff, setInterimCoeff] = useState(1.85);
  const [saving, setSaving] = useState(false);

  // Apply contract defaults when type changes
  useEffect(() => {
    const def = CONTRACT_DEFAULTS[contractType];
    setHourlyRate(def.hourlyRate || 14);
    setBaseSalary(def.baseSalary || 2000);
    setPatronalCharges(def.patronalCharges || 42);
    if (contractType === 'interim') {
      setInterimCoeff(def.interimCoefficient || 1.85);
    }
  }, [contractType]);

  // Auto-recalculate base salary when traction hours change (CDI/CDD only)
  // Forfait = hourlyRate * tractionHoursPerDay * tractionDaysPerMonth
  useEffect(() => {
    if (contractType !== 'interim' && tractionHoursPerDay > 0 && tractionDaysPerMonth > 0) {
      const computedSalary = Math.round(hourlyRate * tractionHoursPerDay * tractionDaysPerMonth);
      setBaseSalary(computedSalary);
    }
  }, [tractionHoursPerDay, tractionDaysPerMonth, hourlyRate, contractType]);

  // Estimated daily employer cost preview
  const estimatedDailyCost = (() => {
    if (contractType === 'interim') {
      return hourlyRate * interimCoeff * tractionHoursPerDay;
    }
    const monthlyEmployer = baseSalary * (1 + patronalCharges / 100);
    return monthlyEmployer / Math.max(tractionDaysPerMonth, 1);
  })();

  const handleCreate = async () => {
    if (!name.trim()) {
      toast({ title: 'Nom requis', description: 'Entrez le nom du conducteur', variant: 'destructive' });
      return;
    }

    setSaving(true);
    const def = CONTRACT_DEFAULTS[contractType];
    const driver: Driver = {
      id: crypto.randomUUID(),
      name: name.trim(),
      contractType,
      hourlyRate,
      baseSalary,
      patronalCharges,
      hoursPerDay: tractionHoursPerDay || 8,
      workingDaysPerMonth: tractionDaysPerMonth || 21,
      mealAllowance: def.mealAllowance || 15.96,
      overnightAllowance: def.overnightAllowance || 50,
      sundayBonus: 0,
      nightBonus: 0,
      seniorityBonus: 0,
      unloadingBonus: 0,
      ...(contractType === 'interim' && {
        interimAgency: interimAgency || 'Agence',
        interimHourlyRate: hourlyRate,
        interimCoefficient: interimCoeff,
      }),
    };

    try {
      const ok = await createDriver(driver, contractType);
      if (ok) {
        toast({ title: 'Conducteur créé', description: `${name} ajouté avec forfait synchronisé` });
        onCreated?.(driver.id);
        // Reset
        setName('');
        setInterimAgency('');
        onOpenChange(false);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary" />
            Créer un conducteur rapide
          </DialogTitle>
          <DialogDescription>
            Forfait automatiquement synchronisé avec les heures de la traction
          </DialogDescription>
        </DialogHeader>

        {/* Synced traction summary */}
        <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-sm space-y-1">
          <div className="flex items-center gap-2 text-primary font-semibold">
            <Sparkles className="w-3.5 h-3.5" /> Forfait synchronisé
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{tractionHoursPerDay.toFixed(1)} h/jour</span>
            </div>
            <div>{tractionDaysPerMonth} jours/mois</div>
          </div>
        </div>

        <div className="space-y-3">
          {/* Contract type */}
          <div>
            <Label>Type de contrat</Label>
            <Select value={contractType} onValueChange={(v: ContractType) => setContractType(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cdi">CDI — Contrat à durée indéterminée</SelectItem>
                <SelectItem value="cdd">CDD — Contrat à durée déterminée</SelectItem>
                <SelectItem value="interim">Intérim — Mission temporaire</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Name */}
          <div>
            <Label>Nom complet</Label>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ex: Jean Dupont"
              autoFocus
            />
          </div>

          {/* Hourly rate */}
          <div>
            <Label>
              Taux horaire brut (€/h)
              {contractType !== 'interim' && (
                <span className="text-xs text-muted-foreground ml-1">— recalcule le forfait</span>
              )}
            </Label>
            <Input
              type="number"
              step="0.01"
              value={hourlyRate}
              onChange={e => setHourlyRate(Number(e.target.value))}
            />
          </div>

          {contractType !== 'interim' ? (
            <>
              <div>
                <Label className="flex items-center justify-between">
                  <span>Forfait mensuel brut (€)</span>
                  <Badge variant="secondary" className="text-xs gap-1">
                    <Sparkles className="w-2.5 h-2.5" /> Auto
                  </Badge>
                </Label>
                <Input
                  type="number"
                  value={baseSalary}
                  onChange={e => setBaseSalary(Number(e.target.value))}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  = {hourlyRate}€ × {tractionHoursPerDay.toFixed(1)}h × {tractionDaysPerMonth}j
                </p>
              </div>
              <div>
                <Label>Charges patronales (%)</Label>
                <Input
                  type="number"
                  value={patronalCharges}
                  onChange={e => setPatronalCharges(Number(e.target.value))}
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <Label>Agence d'intérim</Label>
                <Input
                  value={interimAgency}
                  onChange={e => setInterimAgency(e.target.value)}
                  placeholder="Ex: Manpower"
                />
              </div>
              <div>
                <Label>Coefficient agence</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={interimCoeff}
                  onChange={e => setInterimCoeff(Number(e.target.value))}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Coût horaire facturé = {hourlyRate}€ × {interimCoeff} = {(hourlyRate * interimCoeff).toFixed(2)}€/h
                </p>
              </div>
            </>
          )}

          {/* Daily cost preview */}
          <div className="p-3 rounded-lg bg-muted/40 text-sm">
            <div className="text-muted-foreground text-xs">Coût employeur estimé / jour de traction</div>
            <div className="text-lg font-semibold text-foreground">
              {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(estimatedDailyCost)}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Annuler
          </Button>
          <Button onClick={handleCreate} disabled={saving || !name.trim()}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <UserPlus className="w-4 h-4 mr-2" />}
            Créer et sélectionner
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
