import { useState } from 'react';
import { Plus, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import type { Driver } from '@/types';
import { cn } from '@/lib/utils';

interface DriverFormProps {
  driver?: Partial<Driver>;
  driverType: 'cdi' | 'cdd' | 'interim';
  isLoading?: boolean;
  onSave: (driver: Partial<Driver> & any, type: 'cdi' | 'cdd' | 'interim') => void;
  onCancel: () => void;
}

export function DriverForm({ driver, driverType, isLoading, onSave, onCancel }: DriverFormProps) {
  const [formData, setFormData] = useState<Partial<Driver> & any>(driver || {});

  const handleSave = () => {
    if (!formData.name) {
      alert('Le nom du conducteur est requis');
      return;
    }
    onSave(formData, driverType);
  };

  return (
    <div className="space-y-4 p-4 bg-card border rounded-lg">
      <div className="space-y-2">
        <Label>Nom Prénom</Label>
        <Input
          placeholder="Nom du conducteur"
          value={formData.name || ''}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        />
      </div>

      {driverType !== 'interim' && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Salaire de base (€/mois)</Label>
              <Input
                type="number"
                value={formData.baseSalary || ''}
                onChange={(e) => setFormData({ ...formData, baseSalary: parseFloat(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label>Taux horaire (€/h)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.hourlyRate || ''}
                onChange={(e) => setFormData({ ...formData, hourlyRate: parseFloat(e.target.value) })}
              />
            </div>
          </div>
        </>
      )}

      {driverType === 'interim' && (
        <>
          <div className="space-y-2">
            <Label>Agence</Label>
            <Input
              placeholder="Nom de l'agence intérim"
              value={(formData as any).interimAgency || ''}
              onChange={(e) => setFormData({ ...formData, interimAgency: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Taux horaire (€/h)</Label>
              <Input
                type="number"
                step="0.01"
                value={(formData as any).interimHourlyRate || ''}
                onChange={(e) => setFormData({ ...formData, interimHourlyRate: parseFloat(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label>Coefficient</Label>
              <Input
                type="number"
                step="0.01"
                value={(formData as any).interimCoefficient || 1.85}
                onChange={(e) => setFormData({ ...formData, interimCoefficient: parseFloat(e.target.value) })}
              />
            </div>
          </div>
        </>
      )}

      <div className="flex gap-2 justify-end pt-4 border-t">
        <Button variant="outline" onClick={onCancel}>
          Annuler
        </Button>
        <Button onClick={handleSave} disabled={isLoading} className="gap-2">
          {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
          {driver ? 'Mettre à jour' : 'Créer'}
        </Button>
      </div>
    </div>
  );
}
