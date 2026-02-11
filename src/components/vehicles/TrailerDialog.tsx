import { useState } from 'react';
import {
  Truck,
  Plus,
  Save,
  X,
  Wrench,
  CircleDollarSign
} from 'lucide-react';
import { toast } from 'sonner';
import { getTrailerBrands, getTrailerModels } from '@/data/vehicleDefaults';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { Trailer, TrailerMaintenance, TrailerTire } from '@/types/trailer';
import {
  defaultTrailer,
  trailerTypes,
  trailerMaintenanceTypes,
  trailerTirePositions,
  generateTrailerId,
  trailerDepreciationMethods
} from '@/types/trailer';

interface TrailerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trailer?: Trailer | null;
  onSave: (trailer: Trailer) => void;
}

export function TrailerDialog({ open, onOpenChange, trailer, onSave }: TrailerDialogProps) {
  const isEditing = !!trailer;
  const [activeTab, setActiveTab] = useState('info');
  const [formData, setFormData] = useState<Partial<Trailer>>(() =>
    trailer || {
      ...defaultTrailer,
      maintenances: [
        {
          id: crypto.randomUUID(),
          type: 'mines',
          name: 'Contrôle technique',
          intervalKm: 100000,
          lastKm: 0,
          lastDate: new Date().toISOString().split('T')[0],
          cost: 180,
        },
      ],
      tires: [],
    }
  );

  const handleSave = () => {
    const now = new Date().toISOString();
    const savedTrailer: Trailer = {
      id: trailer?.id || generateTrailerId(),
      name: formData.name || 'Nouvelle remorque',
      licensePlate: formData.licensePlate || '',
      brand: formData.brand || '',
      model: formData.model || '',
      year: formData.year || new Date().getFullYear(),
      type: formData.type || 'tautliner',
      length: formData.length || 13.6,
      width: formData.width || 2.48,
      height: formData.height || 2.7,
      weight: formData.weight || 7500,
      payload: formData.payload || 26500,
      axles: formData.axles || 3,
      volume: formData.volume || 90,
      purchasePrice: formData.purchasePrice || 0,
      monthlyLeasing: formData.monthlyLeasing || 0,
      insuranceCost: formData.insuranceCost || 0,
      depreciationYears: formData.depreciationYears || 7,
      residualValue: formData.residualValue || 0,
      depreciationMethod: formData.depreciationMethod || 'linear',
      expectedLifetimeKm: formData.expectedLifetimeKm || 800000,
      maintenances: formData.maintenances || [],
      tires: formData.tires || [],
      currentKm: formData.currentKm || 0,
      createdAt: trailer?.createdAt || now,
      updatedAt: now,
      isActive: formData.isActive ?? true,
      notes: formData.notes || '',
    };
    onSave(savedTrailer);
    onOpenChange(false);
  };

  const addMaintenance = () => {
    const newMaintenance: TrailerMaintenance = {
      id: crypto.randomUUID(),
      type: 'other',
      name: '',
      intervalKm: 50000,
      lastKm: formData.currentKm || 0,
      lastDate: new Date().toISOString().split('T')[0],
      cost: 0,
    };
    setFormData({
      ...formData,
      maintenances: [...(formData.maintenances || []), newMaintenance],
    });
  };

  const updateMaintenance = (id: string, updates: Partial<TrailerMaintenance>) => {
    setFormData({
      ...formData,
      maintenances: formData.maintenances?.map(m =>
        m.id === id ? { ...m, ...updates } : m
      ),
    });
  };

  const removeMaintenance = (id: string) => {
    setFormData({
      ...formData,
      maintenances: formData.maintenances?.filter(m => m.id !== id),
    });
  };

  const addTire = () => {
    const newTire: TrailerTire = {
      brand: '',
      model: '',
      size: '385/65 R22.5',
      position: 'arriere',
      pricePerUnit: 350,
      quantity: 2,
      durabilityKm: 150000,
      lastChangeKm: formData.currentKm || 0,
      lastChangeDate: new Date().toISOString().split('T')[0],
    };
    setFormData({
      ...formData,
      tires: [...(formData.tires || []), newTire],
    });
  };

  const updateTire = (index: number, updates: Partial<TrailerTire>) => {
    const newTires = [...(formData.tires || [])];
    newTires[index] = { ...newTires[index], ...updates };
    setFormData({ ...formData, tires: newTires });
  };

  const removeTire = (index: number) => {
    setFormData({
      ...formData,
      tires: formData.tires?.filter((_, i) => i !== index),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-primary" />
            {isEditing ? 'Modifier la remorque' : 'Ajouter une remorque'}
          </DialogTitle>
          <DialogDescription>
            Gérez les informations de votre semi-remorque
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="info">Informations</TabsTrigger>
            <TabsTrigger value="maintenance">Entretiens</TabsTrigger>
            <TabsTrigger value="tires">Pneus</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-4 mt-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Nom</Label>
                <Input
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Remorque 1"
                />
              </div>
              <div className="space-y-2">
                <Label>Immatriculation</Label>
                <Input
                  value={formData.licensePlate || ''}
                  onChange={(e) => setFormData({ ...formData, licensePlate: e.target.value.toUpperCase() })}
                  placeholder="AA-123-BB"
                />
              </div>
              <div className="space-y-2">
                <Label>Type de remorque</Label>
                <Select
                  value={formData.type || 'tautliner'}
                  onValueChange={(value: Trailer['type']) => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {trailerTypes.map(type => (
                      <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Marque</Label>
                <Select 
                  value={formData.brand || ''} 
                  onValueChange={(value) => {
                    setFormData({ ...formData, brand: value, model: '' });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    {getTrailerBrands().map(brand => (
                      <SelectItem key={brand} value={brand}>{brand}</SelectItem>
                    ))}
                    <SelectItem value="__other">Autre</SelectItem>
                  </SelectContent>
                </Select>
                {formData.brand === '__other' && (
                  <Input
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    placeholder="Saisir la marque"
                    className="mt-1"
                  />
                )}
              </div>
              <div className="space-y-2">
                <Label>Modèle</Label>
                {formData.brand && formData.brand !== '__other' && getTrailerModels(formData.brand).length > 0 ? (
                  <Select 
                    value={formData.model || ''} 
                    onValueChange={(value) => {
                      const models = getTrailerModels(formData.brand || '');
                      const selected = models.find(m => m.name === value);
                      if (selected) {
                        setFormData({ 
                          ...formData, 
                          model: selected.name,
                          type: selected.type,
                          length: selected.length,
                          width: selected.width,
                          height: selected.height,
                          weight: selected.weight,
                          payload: selected.payload,
                          axles: selected.axles,
                          volume: selected.volume,
                          expectedLifetimeKm: selected.expectedLifetimeKm,
                          name: formData.name || `${formData.brand} ${selected.name}`,
                        });
                        toast.success(`Données par défaut appliquées`);
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      {getTrailerModels(formData.brand).map(model => (
                        <SelectItem key={model.name} value={model.name}>
                          {model.name} — {model.payload.toLocaleString()} kg
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={formData.model || ''}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    placeholder="Ex: Profi Liner"
                  />
                )}
              </div>
              <div className="space-y-2">
                <Label>Année</Label>
                <Input
                  type="number"
                  value={formData.year || ''}
                  onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Kilométrage actuel</Label>
                <Input
                  type="number"
                  value={formData.currentKm || ''}
                  onChange={(e) => setFormData({ ...formData, currentKm: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div className="border-t border-border pt-4">
              <h3 className="text-sm font-medium text-muted-foreground mb-3">Dimensions & Poids</h3>
              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Longueur (m)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.length || ''}
                    onChange={(e) => setFormData({ ...formData, length: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Largeur (m)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.width || ''}
                    onChange={(e) => setFormData({ ...formData, width: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Hauteur int. (m)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.height || ''}
                    onChange={(e) => setFormData({ ...formData, height: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Volume (m³)</Label>
                  <Input
                    type="number"
                    value={formData.volume || ''}
                    onChange={(e) => setFormData({ ...formData, volume: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 mt-4">
                <div className="space-y-2">
                  <Label>PTC (kg)</Label>
                  <Input
                    type="number"
                    value={formData.weight || ''}
                    onChange={(e) => setFormData({ ...formData, weight: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Charge utile (kg)</Label>
                  <Input
                    type="number"
                    value={formData.payload || ''}
                    onChange={(e) => setFormData({ ...formData, payload: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Essieux</Label>
                  <Input
                    type="number"
                    value={formData.axles || ''}
                    onChange={(e) => setFormData({ ...formData, axles: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-border pt-4">
              <h3 className="text-sm font-medium text-muted-foreground mb-3">Coûts</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Prix d'achat (€)</Label>
                  <Input
                    type="number"
                    value={formData.purchasePrice || ''}
                    onChange={(e) => setFormData({ ...formData, purchasePrice: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Leasing mensuel (€)</Label>
                  <Input
                    type="number"
                    value={formData.monthlyLeasing || ''}
                    onChange={(e) => setFormData({ ...formData, monthlyLeasing: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Assurance annuelle (€)</Label>
                  <Input
                    type="number"
                    value={formData.insuranceCost || ''}
                    onChange={(e) => setFormData({ ...formData, insuranceCost: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>
            </div>

            {/* Section Amortissement */}
            <div className="border-t border-border pt-4">
              <h3 className="text-sm font-medium text-muted-foreground mb-3">Amortissement</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Méthode</Label>
                  <Select 
                    value={formData.depreciationMethod || 'linear'} 
                    onValueChange={(value: Trailer['depreciationMethod']) => setFormData({ ...formData, depreciationMethod: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {trailerDepreciationMethods.map(method => (
                        <SelectItem key={method.value} value={method.value}>
                          {method.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Durée (années)</Label>
                  <Input
                    type="number"
                    min="1"
                    max="20"
                    value={formData.depreciationYears || 7}
                    onChange={(e) => setFormData({ ...formData, depreciationYears: parseInt(e.target.value) || 7 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Valeur résiduelle (€)</Label>
                  <Input
                    type="number"
                    value={formData.residualValue || 0}
                    onChange={(e) => setFormData({ ...formData, residualValue: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Durée de vie (km)</Label>
                  <Input
                    type="number"
                    step="10000"
                    value={formData.expectedLifetimeKm || 800000}
                    onChange={(e) => setFormData({ ...formData, expectedLifetimeKm: parseInt(e.target.value) || 800000 })}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {trailerDepreciationMethods.find(m => m.value === (formData.depreciationMethod || 'linear'))?.description}
              </p>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={formData.notes || ''}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Notes additionnelles..."
                rows={2}
              />
            </div>
          </TabsContent>

          <TabsContent value="maintenance" className="space-y-4 mt-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-medium">Entretiens</h3>
              <Button variant="outline" size="sm" onClick={addMaintenance}>
                <Plus className="w-4 h-4 mr-2" />
                Ajouter
              </Button>
            </div>

            {formData.maintenances?.map((maintenance) => (
              <div key={maintenance.id} className="border border-border rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1 grid grid-cols-4 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Type</Label>
                      <Select
                        value={maintenance.type}
                        onValueChange={(v) => updateMaintenance(maintenance.id, { type: v as TrailerMaintenance['type'] })}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {trailerMaintenanceTypes.map(type => (
                            <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Intervalle (km)</Label>
                      <Input
                        type="number"
                        className="h-8"
                        value={maintenance.intervalKm}
                        onChange={(e) => updateMaintenance(maintenance.id, { intervalKm: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Dernier (km)</Label>
                      <Input
                        type="number"
                        className="h-8"
                        value={maintenance.lastKm}
                        onChange={(e) => updateMaintenance(maintenance.id, { lastKm: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Coût (€)</Label>
                      <Input
                        type="number"
                        className="h-8"
                        value={maintenance.cost}
                        onChange={(e) => updateMaintenance(maintenance.id, { cost: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={() => removeMaintenance(maintenance.id)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="tires" className="space-y-4 mt-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-medium">Pneus</h3>
              <Button variant="outline" size="sm" onClick={addTire}>
                <Plus className="w-4 h-4 mr-2" />
                Ajouter
              </Button>
            </div>

            {formData.tires?.map((tire, index) => (
              <div key={index} className="border border-border rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1 grid grid-cols-4 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Position</Label>
                      <Select
                        value={tire.position}
                        onValueChange={(v) => updateTire(index, { position: v as TrailerTire['position'] })}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {trailerTirePositions.map(pos => (
                            <SelectItem key={pos.value} value={pos.value}>{pos.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Quantité</Label>
                      <Input
                        type="number"
                        className="h-8"
                        value={tire.quantity}
                        onChange={(e) => updateTire(index, { quantity: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Prix unitaire (€)</Label>
                      <Input
                        type="number"
                        className="h-8"
                        value={tire.pricePerUnit}
                        onChange={(e) => updateTire(index, { pricePerUnit: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Durabilité (km)</Label>
                      <Input
                        type="number"
                        className="h-8"
                        value={tire.durabilityKm}
                        onChange={(e) => updateTire(index, { durabilityKm: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={() => removeTire(index)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleSave}>
            <Save className="w-4 h-4 mr-2" />
            {isEditing ? 'Enregistrer' : 'Ajouter'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
