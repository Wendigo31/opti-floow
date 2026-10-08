import { Users } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export interface LimitsFormState {
  maxDrivers: number | null;
  maxClients: number | null;
  maxDailyCharges: number | null;
  maxMonthlyCharges: number | null;
  maxYearlyCharges: number | null;
  maxUsers: number | null;
}

interface AdminLimitsDialogProps {
  editingLimitsId: string | null;
  setEditingLimitsId: (id: string | null) => void;
  limitsForm: LimitsFormState;
  setLimitsForm: React.Dispatch<React.SetStateAction<LimitsFormState>>;
  saveLimits: () => void;
}

/**
 * Dialogue d'édition des limites d'une licence (utilisateurs,
 * conducteurs, clients, charges). Extrait de src/pages/Admin.tsx pour
 * alléger ce fichier — comportement identique.
 */
export function AdminLimitsDialog({
  editingLimitsId,
  setEditingLimitsId,
  limitsForm,
  setLimitsForm,
  saveLimits,
}: AdminLimitsDialogProps) {
  return (
    <Dialog open={!!editingLimitsId} onOpenChange={(open) => !open && setEditingLimitsId(null)}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Modifier les limites</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 py-4">
          <div className="col-span-2 p-3 rounded-lg border bg-primary/5">
            <Label className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4" />
              Utilisateurs
            </Label>
            <Input
              type="number"
              min="1"
              placeholder="Illimité"
              value={limitsForm.maxUsers ?? ''}
              onChange={(e) => setLimitsForm(prev => ({ ...prev, maxUsers: e.target.value ? parseInt(e.target.value) : null }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Conducteurs</Label>
            <Input
              type="number"
              placeholder="Défaut"
              value={limitsForm.maxDrivers ?? ''}
              onChange={(e) => setLimitsForm(prev => ({ ...prev, maxDrivers: e.target.value ? parseInt(e.target.value) : null }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Clients</Label>
            <Input
              type="number"
              placeholder="Défaut"
              value={limitsForm.maxClients ?? ''}
              onChange={(e) => setLimitsForm(prev => ({ ...prev, maxClients: e.target.value ? parseInt(e.target.value) : null }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Charges/jour</Label>
            <Input
              type="number"
              placeholder="Défaut"
              value={limitsForm.maxDailyCharges ?? ''}
              onChange={(e) => setLimitsForm(prev => ({ ...prev, maxDailyCharges: e.target.value ? parseInt(e.target.value) : null }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Charges/mois</Label>
            <Input
              type="number"
              placeholder="Défaut"
              value={limitsForm.maxMonthlyCharges ?? ''}
              onChange={(e) => setLimitsForm(prev => ({ ...prev, maxMonthlyCharges: e.target.value ? parseInt(e.target.value) : null }))}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setEditingLimitsId(null)}>Annuler</Button>
          <Button onClick={saveLimits}>Enregistrer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
