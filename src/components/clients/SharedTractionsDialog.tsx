import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Plus, Route, Users, Building2, MapPin, Euro, Check, X, Edit2, Trash2, 
  Clock, ChevronDown, ChevronUp, Search
} from 'lucide-react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useApp } from '@/context/AppContext';
import type { LocalClient, LocalClientReport } from '@/types/local';
import { generateId } from '@/types/local';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

export interface SharedTraction {
  id: string;
  name: string;
  origin_address: string;
  destination_address: string;
  distance_km: number;
  toll_cost: number;
  price_ht: number;
  driver_ids: string[];
  client_ids: string[];
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface SharedTractionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SharedTractionsDialog({ open, onOpenChange }: SharedTractionsDialogProps) {
  const { toast } = useToast();
  const { drivers } = useApp();
  const [clients] = useLocalStorage<LocalClient[]>('optiflow_clients', []);
  const [tractions, setTractions] = useLocalStorage<SharedTraction[]>('optiflow_shared_tractions', []);
  
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    origin_address: '',
    destination_address: '',
    distance_km: 0,
    toll_cost: 0,
    price_ht: 0,
    driver_ids: [] as string[],
    client_ids: [] as string[],
    notes: '',
  });

  const resetForm = () => {
    setFormData({
      name: '',
      origin_address: '',
      destination_address: '',
      distance_km: 0,
      toll_cost: 0,
      price_ht: 0,
      driver_ids: [],
      client_ids: [],
      notes: '',
    });
    setEditingId(null);
    setShowForm(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.client_ids.length === 0) {
      toast({ title: "Sélectionnez au moins un client", variant: "destructive" });
      return;
    }

    const now = new Date().toISOString();
    
    if (editingId) {
      setTractions(prev => prev.map(t => 
        t.id === editingId 
          ? { ...t, ...formData, updated_at: now }
          : t
      ));
      toast({ title: "Traction mise à jour" });
    } else {
      const newTraction: SharedTraction = {
        id: generateId(),
        name: formData.name,
        origin_address: formData.origin_address,
        destination_address: formData.destination_address,
        distance_km: formData.distance_km,
        toll_cost: formData.toll_cost,
        price_ht: formData.price_ht,
        driver_ids: formData.driver_ids,
        client_ids: formData.client_ids,
        notes: formData.notes || null,
        created_at: now,
        updated_at: now,
      };
      setTractions(prev => [...prev, newTraction]);
      toast({ title: "Traction créée" });
    }
    
    resetForm();
  };

  const handleEdit = (traction: SharedTraction) => {
    setFormData({
      name: traction.name,
      origin_address: traction.origin_address,
      destination_address: traction.destination_address,
      distance_km: traction.distance_km,
      toll_cost: traction.toll_cost,
      price_ht: traction.price_ht,
      driver_ids: traction.driver_ids,
      client_ids: traction.client_ids,
      notes: traction.notes || '',
    });
    setEditingId(traction.id);
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    if (!confirm('Supprimer cette traction partagée ?')) return;
    setTractions(prev => prev.filter(t => t.id !== id));
    toast({ title: "Traction supprimée" });
  };

  const toggleDriver = (driverId: string) => {
    setFormData(prev => ({
      ...prev,
      driver_ids: prev.driver_ids.includes(driverId)
        ? prev.driver_ids.filter(id => id !== driverId)
        : [...prev.driver_ids, driverId]
    }));
  };

  const toggleClient = (clientId: string) => {
    setFormData(prev => ({
      ...prev,
      client_ids: prev.client_ids.includes(clientId)
        ? prev.client_ids.filter(id => id !== clientId)
        : [...prev.client_ids, clientId]
    }));
  };

  const filteredTractions = tractions.filter(t =>
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.origin_address.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.destination_address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Route className="w-5 h-5 text-primary" />
            Relais Multi-Clients
          </DialogTitle>
          <DialogDescription>Créez des tractions partagées entre plusieurs clients pour optimiser vos tournées.</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Header Actions */}
          <div className="flex gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher une traction..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button onClick={() => { resetForm(); setShowForm(true); }}>
              <Plus className="w-4 h-4 mr-2" />
              Nouvelle traction
            </Button>
          </div>

          {/* Form or List */}
          <ScrollArea className="flex-1">
            {showForm ? (
              <form onSubmit={handleSubmit} className="space-y-6 p-1">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">
                      {editingId ? 'Modifier la traction' : 'Nouvelle traction partagée'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Basic Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Nom de la traction *</Label>
                        <Input
                          value={formData.name}
                          onChange={e => setFormData({ ...formData, name: e.target.value })}
                          placeholder="Ex: Navette Paris-Lyon"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Distance (km) *</Label>
                        <Input
                          type="number"
                          value={formData.distance_km}
                          onChange={e => setFormData({ ...formData, distance_km: parseFloat(e.target.value) || 0 })}
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Adresse de départ</Label>
                        <Input
                          value={formData.origin_address}
                          onChange={e => setFormData({ ...formData, origin_address: e.target.value })}
                          placeholder="Ex: Paris"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Adresse d'arrivée</Label>
                        <Input
                          value={formData.destination_address}
                          onChange={e => setFormData({ ...formData, destination_address: e.target.value })}
                          placeholder="Ex: Lyon"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Péages (€)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={formData.toll_cost}
                          onChange={e => setFormData({ ...formData, toll_cost: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Prix HT (€)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={formData.price_ht}
                          onChange={e => setFormData({ ...formData, price_ht: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                    </div>

                    {/* Clients Selection */}
                    <div className="space-y-3">
                      <Label className="flex items-center gap-2">
                        <Building2 className="w-4 h-4" />
                        Clients associés *
                      </Label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-40 overflow-y-auto p-2 bg-muted/20 rounded-lg">
                        {clients.length === 0 ? (
                          <p className="col-span-full text-muted-foreground text-sm text-center py-4">
                            Aucun client. Créez des clients d'abord.
                          </p>
                        ) : (
                          clients.map(client => (
                            <label
                              key={client.id}
                              className={cn(
                                "flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors",
                                formData.client_ids.includes(client.id)
                                  ? "bg-primary/10 border border-primary/30"
                                  : "bg-background hover:bg-muted/50"
                              )}
                            >
                              <Checkbox
                                checked={formData.client_ids.includes(client.id)}
                                onCheckedChange={() => toggleClient(client.id)}
                              />
                              <span className="text-sm truncate">{client.name}</span>
                            </label>
                          ))
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formData.client_ids.length} client(s) sélectionné(s)
                      </p>
                    </div>

                    {/* Drivers Selection */}
                    <div className="space-y-3">
                      <Label className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Conducteurs assignés
                      </Label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-32 overflow-y-auto p-2 bg-muted/20 rounded-lg">
                        {drivers.length === 0 ? (
                          <p className="col-span-full text-muted-foreground text-sm text-center py-4">
                            Aucun conducteur configuré.
                          </p>
                        ) : (
                          drivers.map(driver => (
                            <label
                              key={driver.id}
                              className={cn(
                                "flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors",
                                formData.driver_ids.includes(driver.id)
                                  ? "bg-purple-500/10 border border-purple-500/30"
                                  : "bg-background hover:bg-muted/50"
                              )}
                            >
                              <Checkbox
                                checked={formData.driver_ids.includes(driver.id)}
                                onCheckedChange={() => toggleDriver(driver.id)}
                              />
                              <span className="text-sm truncate">{driver.name}</span>
                            </label>
                          ))
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Notes</Label>
                      <Textarea
                        value={formData.notes}
                        onChange={e => setFormData({ ...formData, notes: e.target.value })}
                        placeholder="Notes additionnelles..."
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                      <Button type="button" variant="outline" onClick={resetForm}>
                        Annuler
                      </Button>
                      <Button type="submit">
                        {editingId ? 'Mettre à jour' : 'Créer la traction'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </form>
            ) : (
              <div className="space-y-3 p-1">
                {filteredTractions.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Route className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>Aucune traction partagée</p>
                    <p className="text-sm">Créez des tractions multi-clients pour vos relais</p>
                  </div>
                ) : (
                  filteredTractions.map(traction => {
                    const isExpanded = expandedId === traction.id;
                    const tractionClients = clients.filter(c => traction.client_ids.includes(c.id));
                    const tractionDrivers = drivers.filter(d => traction.driver_ids.includes(d.id));
                    
                    return (
                      <Card key={traction.id} className="glass-card">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-medium text-foreground">{traction.name}</h3>
                                <Badge variant="outline">{traction.distance_km} km</Badge>
                                <Badge variant="secondary" className="gap-1">
                                  <Building2 className="w-3 h-3" />
                                  {traction.client_ids.length} clients
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                <MapPin className="w-3 h-3 inline mr-1" />
                                {traction.origin_address || 'Non défini'} → {traction.destination_address || 'Non défini'}
                              </p>
                              <div className="flex gap-4 mt-2 text-sm">
                                <span className="text-muted-foreground">
                                  <Euro className="w-3 h-3 inline mr-1" />
                                  {formatCurrency(traction.price_ht)}
                                </span>
                                {traction.driver_ids.length > 0 && (
                                  <span className="text-purple-400">
                                    <Users className="w-3 h-3 inline mr-1" />
                                    {traction.driver_ids.length} conducteur(s)
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setExpandedId(isExpanded ? null : traction.id)}
                              >
                                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleEdit(traction)}>
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDelete(traction.id)}>
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </div>
                          </div>

                          {isExpanded && (
                            <div className="mt-4 pt-4 border-t border-border space-y-3">
                              <div>
                                <p className="text-xs font-medium text-muted-foreground mb-2">Clients associés:</p>
                                <div className="flex flex-wrap gap-2">
                                  {tractionClients.map(c => (
                                    <Badge key={c.id} variant="default" className="gap-1">
                                      <Building2 className="w-3 h-3" />
                                      {c.name}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                              {tractionDrivers.length > 0 && (
                                <div>
                                  <p className="text-xs font-medium text-muted-foreground mb-2">Conducteurs:</p>
                                  <div className="flex flex-wrap gap-2">
                                    {tractionDrivers.map(d => (
                                      <Badge key={d.id} variant="secondary" className="gap-1">
                                        <Users className="w-3 h-3" />
                                        {d.name}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {traction.notes && (
                                <div>
                                  <p className="text-xs font-medium text-muted-foreground mb-1">Notes:</p>
                                  <p className="text-sm text-muted-foreground">{traction.notes}</p>
                                </div>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
