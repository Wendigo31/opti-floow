import { useMemo, useState } from 'react';
import { ScrollText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CATEGORY_INFO, COEFFICIENTS, contractPreset, type Coefficient, type ContractPreset, type DriverCategory } from '@/lib/driverContract';

const eur = (n: number) => n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });

/**
 * Création d'une fiche conducteur : modèle de contrat selon la convention collective
 * (catégorie, coefficient, ancienneté). Remplit heures, taux et salaire minimum ; la
 * société peut ensuite payer plus. Composant identique dans les 3 logiciels.
 */
export function ContractPresetPicker({ onApply, defaultCategory = 'longue_distance', defaultCoefficient = '150M' }: {
  onApply: (preset: ContractPreset, hireDate: string) => void;
  defaultCategory?: DriverCategory;
  defaultCoefficient?: Coefficient;
}) {
  const [category, setCategory] = useState<DriverCategory>(defaultCategory);
  const [coefficient, setCoefficient] = useState<Coefficient>(defaultCoefficient);
  const [hireDate, setHireDate] = useState(() => new Date().toISOString().slice(0, 10));
  const preset = useMemo(() => contractPreset(category, coefficient, hireDate), [category, coefficient, hireDate]);

  return (
    <div className="space-y-3 rounded-lg border border-primary/30 bg-primary/5 p-3">
      <p className="flex items-center gap-2 text-sm font-semibold"><ScrollText className="h-4 w-4 text-primary" /> Modèle de contrat (convention collective transports routiers)</p>
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <Label className="text-xs">Catégorie</Label>
          <Select value={category} onValueChange={(v) => setCategory(v as DriverCategory)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {(Object.keys(CATEGORY_INFO) as DriverCategory[]).map((k) => <SelectItem key={k} value={k}>{CATEGORY_INFO[k].label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Coefficient</Label>
          <Select value={coefficient} onValueChange={(v) => setCoefficient(v as Coefficient)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {(Object.keys(COEFFICIENTS) as Coefficient[]).map((k) => <SelectItem key={k} value={k}>{COEFFICIENTS[k].label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Date d'embauche (ancienneté)</Label>
          <Input type="date" value={hireDate} onChange={(e) => setHireDate(e.target.value)} />
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>
          {CATEGORY_INFO[category].hint} · {preset.weeklyHours} h/semaine ({preset.monthlyHours} h/mois
          {preset.equivalenceHours ? `, dont ${preset.equivalenceHours} h d'équivalence à +25 %` : ''}) · taux minimum <b className="text-foreground">{preset.hourlyRate.toFixed(2)} €/h</b>
          {preset.usesSmic ? ' (SMIC)' : preset.seniorityYears >= 2 ? ` (ancienneté ${preset.seniorityYears} ans)` : ''} · salaire minimum <b className="text-foreground">{eur(preset.baseSalary)}</b> brut
        </span>
        <Button type="button" size="sm" variant="outline" onClick={() => onApply(preset, hireDate)}>Appliquer au contrat</Button>
      </div>
    </div>
  );
}
