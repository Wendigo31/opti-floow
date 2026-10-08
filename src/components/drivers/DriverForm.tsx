import { Check, X, Clock, Users2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { DriverContractType, ExtendedDriver } from '@/types/driver';

interface DriverFormProps {
  formData: Partial<ExtendedDriver>;
  setFormData: (data: Partial<ExtendedDriver>) => void;
  formContractType: DriverContractType;
  setFormContractType: (type: DriverContractType) => void;
  /** Direction uniquement : masque les champs de paie pour les autres rôles. */
  canViewFinancialData: boolean;
  onCancel: () => void;
  onSave: () => void | Promise<void>;
}

/**
 * Formulaire d'ajout/édition d'un conducteur (CDI/CDD/Intérim/Joker/Autre).
 * Extrait de src/pages/Drivers.tsx pour alléger ce fichier — comportement
 * identique, y compris le masquage des champs de paie par rôle.
 */
export function DriverForm({
  formData,
  setFormData,
  formContractType,
  setFormContractType,
  canViewFinancialData,
  onCancel,
  onSave,
}: DriverFormProps) {
  const isInterim = formContractType === 'interim';
  const isAutre = formContractType === 'autre';

  return (
    <div className="glass-card p-6 space-y-4 opacity-0 animate-scale-in" style={{ animationFillMode: 'forwards' }}>
      {/* Informations de base */}
      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-3">Informations</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
            <Label>Type de contrat</Label>
            <Select value={formContractType} onValueChange={(v) => {
              const val = v as DriverContractType;
              setFormContractType(val);
              setFormData({ ...formData, isInterim: val === 'interim' });
            }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cdi">CDI</SelectItem>
                <SelectItem value="cdd">CDD</SelectItem>
                <SelectItem value="interim">Intérim</SelectItem>
                <SelectItem value="joker">Joker / Polyvalent</SelectItem>
                <SelectItem value="autre">Autre</SelectItem>
              </SelectContent>
            </Select>
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
            {canViewFinancialData && (
              <>
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
              </>
            )}
          </div>
        </div>
      )}

      {/* Rémunération - Seulement pour CDI/CDD */}
      {!isInterim && !isAutre && canViewFinancialData && (
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

      {/* Charges & Primes - Seulement pour CDI/CDD */}
      {!isInterim && !isAutre && canViewFinancialData && (
        <div className="border-t border-border pt-4">
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Primes</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
            <div className="space-y-2">
              <Label htmlFor="unloadingBonus">Prime décaissage (€)</Label>
              <Input
                id="unloadingBonus"
                type="number"
                step="0.01"
                value={formData.unloadingBonus || ''}
                onChange={(e) => setFormData({ ...formData, unloadingBonus: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>
        </div>
      )}

      {/* Indemnités */}
      {canViewFinancialData && (
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
      )}

      {!canViewFinancialData && (
        <div className="border-t border-border pt-4">
          <p className="text-sm text-muted-foreground">
            Les éléments de rémunération sont réservés à la Direction. Ils sont conservés
            automatiquement lorsque vous enregistrez cette fiche.
          </p>
        </div>
      )}

      <div className="flex justify-end gap-3 pt-4">
        <Button variant="outline" onClick={onCancel}>
          <X className="w-4 h-4 mr-2" />
          Annuler
        </Button>
        <Button variant="gradient" onClick={onSave}>
          <Check className="w-4 h-4 mr-2" />
          Enregistrer
        </Button>
      </div>
    </div>
  );
}
