import { Lock, Plus, Trash2, Check, X, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import type { Vehicle, VehicleMaintenance, VehicleTire } from '@/types/vehicle';
import {
  maintenanceTypes,
  vehicleTypes,
  fuelTypes,
  tirePositions,
  depreciationMethods,
} from '@/types/vehicle';
import { getVehicleBrands, getVehicleModels } from '@/data/vehicleDefaults';

export type VehicleFormTab = 'info' | 'consumption' | 'maintenance' | 'tires';

interface VehicleFormProps {
  formData: Partial<Vehicle>;
  setFormData: (data: Partial<Vehicle>) => void;
  activeFormTab: VehicleFormTab;
  setActiveFormTab: (tab: VehicleFormTab) => void;
  /** Toujours vrai avec le forfait unique OptiFlow ; conservé pour permettre une restriction par add-on à l'avenir. */
  hasFleetManagement: boolean;
  onCancel: () => void;
  onSave: () => void | Promise<void>;
  addMaintenance: () => void;
  updateMaintenance: (id: string, updates: Partial<VehicleMaintenance>) => void;
  removeMaintenance: (id: string) => void;
  addTire: () => void;
  updateTire: (index: number, updates: Partial<VehicleTire>) => void;
  removeTire: (index: number) => void;
}

/**
 * Formulaire d'ajout/édition d'un véhicule (4 onglets : infos générales,
 * consommation, entretiens, pneus). Extrait de src/pages/Vehicles.tsx pour
 * alléger ce fichier — comportement identique, aucune logique modifiée.
 */
export function VehicleForm({
  formData,
  setFormData,
  activeFormTab,
  setActiveFormTab,
  hasFleetManagement,
  onCancel,
  onSave,
  addMaintenance,
  updateMaintenance,
  removeMaintenance,
  addTire,
  updateTire,
  removeTire,
}: VehicleFormProps) {
  const navigate = useNavigate();

  return (
    <div className="glass-card p-6 space-y-6 opacity-0 animate-scale-in" style={{ animationFillMode: 'forwards' }}>
      {/* Upgrade banner for Start users */}
      {!hasFleetManagement && (
        <Alert className="border-amber-500/30 bg-amber-500/10">
          <Lock className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-700 dark:text-amber-400">
            <span className="font-medium">Version Start :</span> Les fonctionnalités avancées (amortissement, entretien, pneus, consommation) sont disponibles avec l'add-on Gestion flotte avancée.{' '}
            <Button variant="link" className="p-0 h-auto text-amber-600" onClick={() => navigate('/pricing')}>
              Voir les options →
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <Tabs value={activeFormTab} onValueChange={(tab) => {
        // Block access to restricted tabs for Start users
        if (!hasFleetManagement && ['consumption', 'maintenance', 'tires'].includes(tab)) {
          toast.error('Cette fonctionnalité nécessite l\'add-on Gestion flotte avancée');
          return;
        }
        setActiveFormTab(tab as VehicleFormTab);
      }}>
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="info">Infos générales</TabsTrigger>
          <TabsTrigger value="consumption" disabled={!hasFleetManagement} className={!hasFleetManagement ? 'opacity-50' : ''}>
            {!hasFleetManagement && <Lock className="w-3 h-3 mr-1" />}
            Consommation
          </TabsTrigger>
          <TabsTrigger value="maintenance" disabled={!hasFleetManagement} className={!hasFleetManagement ? 'opacity-50' : ''}>
            {!hasFleetManagement && <Lock className="w-3 h-3 mr-1" />}
            Entretiens
          </TabsTrigger>
          <TabsTrigger value="tires" disabled={!hasFleetManagement} className={!hasFleetManagement ? 'opacity-50' : ''}>
            {!hasFleetManagement && <Lock className="w-3 h-3 mr-1" />}
            Pneus
          </TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Nom du véhicule</Label>
              <Input
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Tracteur 1"
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
              <Label>Type de véhicule</Label>
              <Select
                value={formData.type || 'semi-remorque'}
                onValueChange={(value: Vehicle['type']) => setFormData({ ...formData, type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {vehicleTypes.map(type => (
                    <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Marque</Label>
              <Select
                value={formData.brand || ''}
                onValueChange={(value) => {
                  setFormData({ ...formData, brand: value, model: '' });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une marque" />
                </SelectTrigger>
                <SelectContent>
                  {getVehicleBrands().map(brand => (
                    <SelectItem key={brand} value={brand}>{brand}</SelectItem>
                  ))}
                  <SelectItem value="__other">Autre</SelectItem>
                </SelectContent>
              </Select>
              {formData.brand === '__other' && (
                <Input
                  value={formData.brand === '__other' ? '' : formData.brand || ''}
                  onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                  placeholder="Saisir la marque"
                  className="mt-1"
                />
              )}
            </div>
            <div className="space-y-2">
              <Label>Modèle</Label>
              {formData.brand && formData.brand !== '__other' && getVehicleModels(formData.brand).length > 0 ? (
                <Select
                  value={formData.model || ''}
                  onValueChange={(value) => {
                    const models = getVehicleModels(formData.brand || '');
                    const selected = models.find(m => m.name === value);
                    if (selected) {
                      setFormData({
                        ...formData,
                        model: selected.name,
                        type: selected.type,
                        fuelConsumption: selected.fuelConsumption,
                        adBlueConsumption: selected.adBlueConsumption,
                        weight: selected.weight,
                        axles: selected.axles,
                        length: selected.length,
                        width: selected.width,
                        height: selected.height,
                        expectedLifetimeKm: selected.expectedLifetimeKm,
                        name: formData.name || `${formData.brand} ${selected.name}`,
                      });
                      toast.success(`Données par défaut du ${formData.brand} ${selected.name} appliquées`);
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un modèle" />
                  </SelectTrigger>
                  <SelectContent>
                    {getVehicleModels(formData.brand).map(model => (
                      <SelectItem key={model.name} value={model.name}>
                        {model.name} {model.power ? `(${model.power})` : ''} — {model.fuelConsumption} L/100km
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  value={formData.model || ''}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  placeholder="Ex: T480"
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
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
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
                <Label>Hauteur (m)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.height || ''}
                  onChange={(e) => setFormData({ ...formData, height: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>PTAC (kg)</Label>
                <Input
                  type="number"
                  value={formData.weight || ''}
                  onChange={(e) => setFormData({ ...formData, weight: parseInt(e.target.value) || 0 })}
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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
              <div className="space-y-2">
                <Label>Charge sinistre annuelle (€)</Label>
                <Input
                  type="number"
                  value={formData.sinisterCharge || ''}
                  onChange={(e) => setFormData({ ...formData, sinisterCharge: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>
          </div>

          {/* Section Amortissement - Locked for Start users */}
          {hasFleetManagement ? (
            <div className="border-t border-border pt-4">
              <h3 className="text-sm font-medium text-muted-foreground mb-3">Amortissement</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Méthode d'amortissement</Label>
                  <Select
                    value={formData.depreciationMethod || 'linear'}
                    onValueChange={(value: Vehicle['depreciationMethod']) => setFormData({ ...formData, depreciationMethod: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {depreciationMethods.map(method => (
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
                    value={formData.depreciationYears || 5}
                    onChange={(e) => setFormData({ ...formData, depreciationYears: parseInt(e.target.value) || 5 })}
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
                    value={formData.expectedLifetimeKm || 600000}
                    onChange={(e) => setFormData({ ...formData, expectedLifetimeKm: parseInt(e.target.value) || 600000 })}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {depreciationMethods.find(m => m.value === (formData.depreciationMethod || 'linear'))?.description}
              </p>
            </div>
          ) : (
            <div className="border-t border-border pt-4 relative">
              <div className="absolute inset-0 bg-background/80 backdrop-blur-[2px] flex items-center justify-center z-10 rounded-lg">
                <div className="text-center space-y-2 p-4">
                  <Lock className="w-8 h-8 text-muted-foreground mx-auto" />
                  <p className="text-sm font-medium">Amortissement</p>
                  <p className="text-xs text-muted-foreground">Add-on Gestion flotte avancée requis</p>
                  <Button variant="outline" size="sm" onClick={() => navigate('/pricing')}>
                    <Sparkles className="w-3 h-3 mr-1" />
                    Débloquer
                  </Button>
                </div>
              </div>
              <h3 className="text-sm font-medium text-muted-foreground mb-3 opacity-30">Amortissement</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 opacity-30 pointer-events-none">
                <div className="space-y-2">
                  <Label>Méthode d'amortissement</Label>
                  <Select value="linear" disabled>
                    <SelectTrigger><SelectValue placeholder="Linéaire" /></SelectTrigger>
                    <SelectContent><SelectItem value="linear">Linéaire</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Durée (années)</Label>
                  <Input type="number" value={5} disabled />
                </div>
                <div className="space-y-2">
                  <Label>Valeur résiduelle (€)</Label>
                  <Input type="number" value={0} disabled />
                </div>
                <div className="space-y-2">
                  <Label>Durée de vie (km)</Label>
                  <Input type="number" value={600000} disabled />
                </div>
              </div>
            </div>
          )}

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

        <TabsContent value="consumption" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Type de carburant</Label>
              <Select
                value={formData.fuelType || 'diesel'}
                onValueChange={(value: Vehicle['fuelType']) => setFormData({ ...formData, fuelType: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {fuelTypes.map(type => (
                    <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Consommation carburant (L/100km)</Label>
              <Input
                type="number"
                step="0.1"
                value={formData.fuelConsumption || ''}
                onChange={(e) => setFormData({ ...formData, fuelConsumption: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label>Consommation AdBlue (L/100km)</Label>
              <Input
                type="number"
                step="0.1"
                value={formData.adBlueConsumption || ''}
                onChange={(e) => setFormData({ ...formData, adBlueConsumption: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="maintenance" className="space-y-4 mt-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-medium">Entretiens kilométriques</h3>
            <Button variant="outline" size="sm" onClick={addMaintenance}>
              <Plus className="w-4 h-4 mr-2" />
              Ajouter un entretien
            </Button>
          </div>

          <div className="space-y-4">
            {formData.maintenances?.map((maintenance) => (
              <div key={maintenance.id} className="border border-border rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Type</Label>
                      <Select
                        value={maintenance.type}
                        onValueChange={(value: VehicleMaintenance['type']) => updateMaintenance(maintenance.id, { type: value })}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {maintenanceTypes.map(type => (
                            <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Nom</Label>
                      <Input
                        className="h-9"
                        value={maintenance.name}
                        onChange={(e) => updateMaintenance(maintenance.id, { name: e.target.value })}
                        placeholder="Nom de l'entretien"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Intervalle (km)</Label>
                      <Input
                        className="h-9"
                        type="number"
                        value={maintenance.intervalKm}
                        onChange={(e) => updateMaintenance(maintenance.id, { intervalKm: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Coût moyen (€)</Label>
                      <Input
                        className="h-9"
                        type="number"
                        value={maintenance.cost}
                        onChange={(e) => updateMaintenance(maintenance.id, { cost: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="ml-2 text-destructive"
                    onClick={() => removeMaintenance(maintenance.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Dernier km effectué</Label>
                    <Input
                      className="h-9"
                      type="number"
                      value={maintenance.lastKm}
                      onChange={(e) => updateMaintenance(maintenance.id, { lastKm: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Date du dernier entretien</Label>
                    <Input
                      className="h-9"
                      type="date"
                      value={maintenance.lastDate}
                      onChange={(e) => updateMaintenance(maintenance.id, { lastDate: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="tires" className="space-y-4 mt-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-medium">Gestion des pneumatiques</h3>
            <Button variant="outline" size="sm" onClick={addTire}>
              <Plus className="w-4 h-4 mr-2" />
              Ajouter des pneus
            </Button>
          </div>

          <div className="space-y-4">
            {formData.tires?.map((tire, index) => (
              <div key={index} className="border border-border rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Marque</Label>
                      <Input
                        className="h-9"
                        value={tire.brand}
                        onChange={(e) => updateTire(index, { brand: e.target.value })}
                        placeholder="Michelin, Continental..."
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Modèle</Label>
                      <Input
                        className="h-9"
                        value={tire.model}
                        onChange={(e) => updateTire(index, { model: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Dimension</Label>
                      <Input
                        className="h-9"
                        value={tire.size}
                        onChange={(e) => updateTire(index, { size: e.target.value })}
                        placeholder="315/80 R22.5"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Position</Label>
                      <Select
                        value={tire.position}
                        onValueChange={(value: VehicleTire['position']) => updateTire(index, { position: value })}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {tirePositions.map(pos => (
                            <SelectItem key={pos.value} value={pos.value}>{pos.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="ml-2 text-destructive"
                    onClick={() => removeTire(index)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Prix unitaire (€)</Label>
                    <Input
                      className="h-9"
                      type="number"
                      value={tire.pricePerUnit}
                      onChange={(e) => updateTire(index, { pricePerUnit: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Quantité</Label>
                    <Input
                      className="h-9"
                      type="number"
                      value={tire.quantity}
                      onChange={(e) => updateTire(index, { quantity: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Durabilité (km)</Label>
                    <Input
                      className="h-9"
                      type="number"
                      value={tire.durabilityKm}
                      onChange={(e) => updateTire(index, { durabilityKm: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Dernier changement (km)</Label>
                    <Input
                      className="h-9"
                      type="number"
                      value={tire.lastChangeKm}
                      onChange={(e) => updateTire(index, { lastChangeKm: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end gap-3 pt-4 border-t border-border">
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
