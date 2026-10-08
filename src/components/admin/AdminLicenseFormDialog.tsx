import { CheckCircle, Copy, Building2, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { License, LicenseFormData } from '@/types/admin';

interface AdminLicenseFormDialogProps {
  dialogOpen: boolean;
  resetDialog: () => void;
  dialogMode: 'create' | 'edit';
  createdLicense: { code: string; email: string } | null;
  formData: LicenseFormData;
  setFormData: React.Dispatch<React.SetStateAction<LicenseFormData>>;
  licenses: License[];
  saving: boolean;
  handleSave: () => void;
  copyToClipboard: (text: string) => void;
}

/**
 * Dialogue de création / modification d'une licence, et son écran de
 * confirmation après création. Extrait de src/pages/Admin.tsx pour
 * alléger ce fichier — comportement identique.
 */
export function AdminLicenseFormDialog({
  dialogOpen,
  resetDialog,
  dialogMode,
  createdLicense,
  formData,
  setFormData,
  licenses,
  saving,
  handleSave,
  copyToClipboard,
}: AdminLicenseFormDialogProps) {
  return (
    <Dialog open={dialogOpen} onOpenChange={(open) => !open && resetDialog()}>
      <DialogContent className="sm:max-w-[500px]">
        {createdLicense ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-green-600">
                <CheckCircle className="w-5 h-5" />
                Licence créée
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="p-4 bg-green-500/10 rounded-lg space-y-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Code</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="flex-1 bg-background px-3 py-2 rounded border font-mono">{createdLicense.code}</code>
                    <Button size="icon" variant="outline" onClick={() => copyToClipboard(createdLicense.code)}>
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Email</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="flex-1 bg-background px-3 py-2 rounded border text-sm">{createdLicense.email}</code>
                    <Button size="icon" variant="outline" onClick={() => copyToClipboard(createdLicense.email)}>
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={resetDialog}>Fermer</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{dialogMode === 'create' ? 'Nouvelle licence' : 'Modifier licence'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {dialogMode === 'create' && (
                <div className="p-3 rounded-lg border bg-muted/50 space-y-3">
                  <Label className="flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    Assigner à une société
                  </Label>
                  <Select
                    value={formData.assignToCompanyId || 'none'}
                    onValueChange={(v) => setFormData(prev => ({ ...prev, assignToCompanyId: v === 'none' ? null : v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Nouvelle licence" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nouvelle licence</SelectItem>
                      {licenses.filter(l => l.company_name).map(license => (
                        <SelectItem key={license.id} value={license.id}>
                          {license.company_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formData.assignToCompanyId && (
                    <Select
                      value={formData.userRole}
                      onValueChange={(v: any) => setFormData(prev => ({ ...prev, userRole: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="member">Membre</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="owner">Propriétaire</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>
              )}
              <div className="space-y-2">
                <Label>Email *</Label>
                <Input
                  type="email"
                  placeholder="email@exemple.com"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                />
              </div>
              {!formData.assignToCompanyId && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Prénom</Label>
                      <Input value={formData.firstName} onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Nom</Label>
                      <Input value={formData.lastName} onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Société</Label>
                    <Input value={formData.companyName} onChange={(e) => setFormData(prev => ({ ...prev, companyName: e.target.value }))} />
                  </div>
                </>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={resetDialog}>Annuler</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {dialogMode === 'create' ? 'Créer' : 'Enregistrer'}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
