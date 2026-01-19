import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Building2, FileText, Save, RotateCcw } from 'lucide-react';
import { PLAN_LIMITS } from '@/hooks/usePlanLimits';
import type { PlanType } from '@/hooks/useLicense';

interface LicenseLimits {
  maxDrivers: number | null;
  maxClients: number | null;
  maxDailyCharges: number | null;
  maxMonthlyCharges: number | null;
  maxYearlyCharges: number | null;
}

interface LicenseLimitsEditorProps {
  planType: PlanType;
  currentLimits: LicenseLimits;
  onSave: (limits: LicenseLimits) => void;
  isSaving?: boolean;
}

export function LicenseLimitsEditor({
  planType,
  currentLimits,
  onSave,
  isSaving = false,
}: LicenseLimitsEditorProps) {
  const [limits, setLimits] = useState<LicenseLimits>(currentLimits);
  const defaults = PLAN_LIMITS[planType];

  const handleReset = () => {
    setLimits({
      maxDrivers: null,
      maxClients: null,
      maxDailyCharges: null,
      maxMonthlyCharges: null,
      maxYearlyCharges: null,
    });
  };

  const handleChange = (key: keyof LicenseLimits, value: string) => {
    const numValue = value === '' ? null : parseInt(value, 10);
    setLimits(prev => ({ ...prev, [key]: isNaN(numValue!) ? null : numValue }));
  };

  const getEffectiveValue = (key: keyof LicenseLimits): number => {
    return limits[key] ?? (defaults[key as keyof typeof defaults] as number);
  };

  return (
    <Card className="border-dashed">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <span>Limites personnalisées</span>
          <Button variant="ghost" size="sm" onClick={handleReset} className="h-7 text-xs">
            <RotateCcw className="w-3 h-3 mr-1" />
            Réinitialiser
          </Button>
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Laissez vide pour utiliser les valeurs par défaut du forfait {planType.toUpperCase()}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {/* Drivers */}
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1">
              <Users className="w-3 h-3" />
              Conducteurs max
            </Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={1}
                placeholder={String(defaults.maxDrivers === Infinity ? '∞' : defaults.maxDrivers)}
                value={limits.maxDrivers ?? ''}
                onChange={(e) => handleChange('maxDrivers', e.target.value)}
                className="h-8 text-sm"
              />
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                = {getEffectiveValue('maxDrivers') === Infinity ? '∞' : getEffectiveValue('maxDrivers')}
              </span>
            </div>
          </div>

          {/* Clients */}
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1">
              <Building2 className="w-3 h-3" />
              Clients max
            </Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={1}
                placeholder={String(defaults.maxClients === Infinity ? '∞' : defaults.maxClients)}
                value={limits.maxClients ?? ''}
                onChange={(e) => handleChange('maxClients', e.target.value)}
                className="h-8 text-sm"
              />
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                = {getEffectiveValue('maxClients') === Infinity ? '∞' : getEffectiveValue('maxClients')}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {/* Daily charges */}
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1">
              <FileText className="w-3 h-3" />
              Charges/jour
            </Label>
            <Input
              type="number"
              min={1}
              placeholder={String(defaults.maxDailyCharges === Infinity ? '∞' : defaults.maxDailyCharges)}
              value={limits.maxDailyCharges ?? ''}
              onChange={(e) => handleChange('maxDailyCharges', e.target.value)}
              className="h-8 text-sm"
            />
          </div>

          {/* Monthly charges */}
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1">
              <FileText className="w-3 h-3" />
              Charges/mois
            </Label>
            <Input
              type="number"
              min={1}
              placeholder={String(defaults.maxMonthlyCharges === Infinity ? '∞' : defaults.maxMonthlyCharges)}
              value={limits.maxMonthlyCharges ?? ''}
              onChange={(e) => handleChange('maxMonthlyCharges', e.target.value)}
              className="h-8 text-sm"
            />
          </div>

          {/* Yearly charges */}
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1">
              <FileText className="w-3 h-3" />
              Charges/an
            </Label>
            <Input
              type="number"
              min={1}
              placeholder={String(defaults.maxYearlyCharges === Infinity ? '∞' : defaults.maxYearlyCharges)}
              value={limits.maxYearlyCharges ?? ''}
              onChange={(e) => handleChange('maxYearlyCharges', e.target.value)}
              className="h-8 text-sm"
            />
          </div>
        </div>

        <Button
          onClick={() => onSave(limits)}
          disabled={isSaving}
          size="sm"
          className="w-full"
        >
          <Save className="w-3 h-3 mr-1" />
          {isSaving ? 'Enregistrement...' : 'Enregistrer les limites'}
        </Button>
      </CardContent>
    </Card>
  );
}
