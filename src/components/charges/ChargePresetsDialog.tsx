import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  Save, 
  Download, 
  Copy, 
  Trash2, 
  Edit2, 
  Check, 
  X, 
  Clock, 
  Package,
  Calendar,
  CalendarDays,
  CalendarRange,
  Loader2,
  Plus
} from 'lucide-react';
import { useChargePresets, type ChargePreset } from '@/hooks/useChargePresets';
import { useApp } from '@/context/AppContext';
import type { FixedCharge } from '@/types';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface ChargePresetsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ChargePresetsDialog({ open, onOpenChange }: ChargePresetsDialogProps) {
  const { charges, setCharges } = useApp();
  const { presets, loading, createPreset, updatePreset, deletePreset, duplicatePreset } = useChargePresets();
  
  const [mode, setMode] = useState<'list' | 'create' | 'edit'>('list');
  const [editingPreset, setEditingPreset] = useState<ChargePreset | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [saving, setSaving] = useState(false);

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value);

  const getChargeStats = (chargesList: FixedCharge[]) => {
    const daily = chargesList.filter(c => c.periodicity === 'daily').length;
    const monthly = chargesList.filter(c => c.periodicity === 'monthly').length;
    const yearly = chargesList.filter(c => c.periodicity === 'yearly').length;
    const total = chargesList.reduce((sum, c) => sum + c.amount, 0);
    return { daily, monthly, yearly, total };
  };

  const handleCreatePreset = async () => {
    if (!formData.name.trim()) return;
    
    setSaving(true);
    const success = await createPreset(formData.name, charges, formData.description || undefined);
    setSaving(false);
    
    if (success) {
      setFormData({ name: '', description: '' });
      setMode('list');
    }
  };

  const handleUpdatePreset = async () => {
    if (!editingPreset || !formData.name.trim()) return;
    
    setSaving(true);
    const success = await updatePreset(editingPreset.id, {
      name: formData.name,
      description: formData.description || undefined,
    });
    setSaving(false);
    
    if (success) {
      setFormData({ name: '', description: '' });
      setEditingPreset(null);
      setMode('list');
    }
  };

  const handleApplyPreset = (preset: ChargePreset) => {
    // Merge with existing charges, replacing by name or adding new ones
    const existingByName = new Map(charges.map(c => [c.name, c]));
    const newCharges: FixedCharge[] = [];
    
    for (const presetCharge of preset.charges) {
      const existing = existingByName.get(presetCharge.name);
      if (existing) {
        // Update existing charge
        newCharges.push({
          ...existing,
          amount: presetCharge.amount,
          isHT: presetCharge.isHT,
          periodicity: presetCharge.periodicity,
          category: presetCharge.category,
        });
        existingByName.delete(presetCharge.name);
      } else {
        // Add new charge with new ID
        newCharges.push({
          ...presetCharge,
          id: `preset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        });
      }
    }
    
    // Keep remaining existing charges
    existingByName.forEach(charge => newCharges.push(charge));
    
    setCharges(newCharges);
    onOpenChange(false);
  };

  const handleReplaceWithPreset = (preset: ChargePreset) => {
    // Replace all charges with preset charges
    const newCharges = preset.charges.map(c => ({
      ...c,
      id: `preset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    }));
    setCharges(newCharges);
    onOpenChange(false);
  };

  const handleSaveCurrentAsUpdate = async (preset: ChargePreset) => {
    setSaving(true);
    await updatePreset(preset.id, { charges });
    setSaving(false);
  };

  const handleEditClick = (preset: ChargePreset) => {
    setEditingPreset(preset);
    setFormData({ name: preset.name, description: preset.description || '' });
    setMode('edit');
  };

  const handleCancelEdit = () => {
    setEditingPreset(null);
    setFormData({ name: '', description: '' });
    setMode('list');
  };

  const renderPresetCard = (preset: ChargePreset) => {
    const stats = getChargeStats(preset.charges);
    
    return (
      <div key={preset.id} className="glass-card p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-foreground truncate">{preset.name}</h3>
            {preset.description && (
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{preset.description}</p>
            )}
          </div>
          <div className="flex gap-1 shrink-0">
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleEditClick(preset)} title="Modifier">
              <Edit2 className="w-3.5 h-3.5" />
            </Button>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => duplicatePreset(preset)} title="Dupliquer">
              <Copy className="w-3.5 h-3.5" />
            </Button>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => deletePreset(preset.id)} title="Supprimer">
              <Trash2 className="w-3.5 h-3.5 text-destructive" />
            </Button>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-1.5">
          {stats.daily > 0 && (
            <Badge variant="secondary" className="text-xs gap-1">
              <Calendar className="w-3 h-3" />
              {stats.daily} J
            </Badge>
          )}
          {stats.monthly > 0 && (
            <Badge variant="secondary" className="text-xs gap-1">
              <CalendarDays className="w-3 h-3" />
              {stats.monthly} M
            </Badge>
          )}
          {stats.yearly > 0 && (
            <Badge variant="secondary" className="text-xs gap-1">
              <CalendarRange className="w-3 h-3" />
              {stats.yearly} A
            </Badge>
          )}
          <Badge variant="outline" className="text-xs">
            {formatCurrency(stats.total)}
          </Badge>
        </div>
        
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {format(new Date(preset.updated_at), 'dd MMM yyyy HH:mm', { locale: fr })}
          </span>
        </div>
        
        <div className="flex gap-2 pt-2 border-t border-border/50">
          <Button 
            size="sm" 
            variant="outline" 
            className="flex-1 text-xs h-8"
            onClick={() => handleApplyPreset(preset)}
          >
            <Download className="w-3 h-3 mr-1" />
            Fusionner
          </Button>
          <Button 
            size="sm" 
            variant="default" 
            className="flex-1 text-xs h-8"
            onClick={() => handleReplaceWithPreset(preset)}
          >
            <Check className="w-3 h-3 mr-1" />
            Remplacer
          </Button>
          <Button 
            size="sm" 
            variant="secondary" 
            className="text-xs h-8"
            onClick={() => handleSaveCurrentAsUpdate(preset)}
            disabled={saving}
            title="Mettre à jour avec les charges actuelles"
          >
            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
          </Button>
        </div>
      </div>
    );
  };

  const renderForm = () => {
    const isEdit = mode === 'edit';
    const currentStats = getChargeStats(charges);
    
    return (
      <div className="space-y-4">
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="preset-name">Nom du preset</Label>
            <Input
              id="preset-name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: Charges hiver 2024"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="preset-desc">Description (optionnel)</Label>
            <Textarea
              id="preset-desc"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Notes sur ce preset..."
              rows={2}
            />
          </div>
        </div>
        
        {!isEdit && (
          <div className="glass-card p-3 bg-muted/50">
            <p className="text-xs text-muted-foreground mb-2">Ce preset contiendra :</p>
            <div className="flex flex-wrap gap-1.5">
              <Badge variant="secondary" className="text-xs">{charges.length} charge(s)</Badge>
              {currentStats.daily > 0 && <Badge variant="outline" className="text-xs">{currentStats.daily} journalière(s)</Badge>}
              {currentStats.monthly > 0 && <Badge variant="outline" className="text-xs">{currentStats.monthly} mensuelle(s)</Badge>}
              {currentStats.yearly > 0 && <Badge variant="outline" className="text-xs">{currentStats.yearly} annuelle(s)</Badge>}
            </div>
          </div>
        )}
        
        <div className="flex gap-2 pt-2">
          <Button variant="outline" onClick={handleCancelEdit} className="flex-1">
            <X className="w-4 h-4 mr-2" />
            Annuler
          </Button>
          <Button 
            variant="gradient" 
            onClick={isEdit ? handleUpdatePreset : handleCreatePreset}
            className="flex-1"
            disabled={saving || !formData.name.trim()}
          >
            {saving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            {isEdit ? 'Mettre à jour' : 'Enregistrer'}
          </Button>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Presets de charges
          </DialogTitle>
          <DialogDescription>
            Sauvegardez et réappliquez des configurations de charges
          </DialogDescription>
        </DialogHeader>
        
        {mode === 'list' ? (
          <div className="space-y-4">
            <Button 
              variant="outline" 
              className="w-full gap-2"
              onClick={() => {
                setFormData({ name: '', description: '' });
                setMode('create');
              }}
              disabled={charges.length === 0}
            >
              <Plus className="w-4 h-4" />
              Créer un preset avec les charges actuelles
            </Button>
            
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : presets.length === 0 ? (
              <div className="text-center py-8">
                <Package className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">Aucun preset sauvegardé</p>
                <p className="text-muted-foreground text-xs mt-1">
                  Créez des presets pour sauvegarder vos configurations de charges
                </p>
              </div>
            ) : (
              <ScrollArea className="max-h-[400px]">
                <div className="space-y-3 pr-3">
                  {presets.map(renderPresetCard)}
                </div>
              </ScrollArea>
            )}
          </div>
        ) : (
          renderForm()
        )}
      </DialogContent>
    </Dialog>
  );
}
