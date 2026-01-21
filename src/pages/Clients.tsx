import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Plus, Building2, Phone, Mail, MapPin, Trash2, Edit2, Search, Eye, BarChart3, Users, Route, Link2, Target } from 'lucide-react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useClients, type ClientWithCreator } from '@/hooks/useClients';
import type { LocalClientReport } from '@/types/local';
import { ClientDetailDialog } from '@/components/clients/ClientDetailDialog';
import { ClientsDashboard } from '@/components/clients/ClientsDashboard';
import { SharedTractionsDialog } from '@/components/clients/SharedTractionsDialog';
import { ToxicClientsAnalysis } from '@/components/clients/ToxicClientsAnalysis';
import { SharedDataBadge } from '@/components/shared/SharedDataBadge';
import { useLanguage } from '@/i18n/LanguageContext';
import { FeatureGate } from '@/components/license/FeatureGate';

export default function Clients() {
  const { t } = useLanguage();
  const { toast } = useToast();
  
  // Use the synced clients hook instead of local storage
  const { clients, addresses, loading, createClient, updateClient, deleteClient, getClientAddresses } = useClients();
  
  const [reports] = useLocalStorage<LocalClientReport[]>('optiflow_client_reports', []);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchMode, setSearchMode] = useState<'clients' | 'tours'>('clients');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientWithCreator | null>(null);
  const [detailClient, setDetailClient] = useState<ClientWithCreator | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('clients');
  const [sharedTractionsOpen, setSharedTractionsOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '', company: '', email: '', phone: '',
    address: '', city: '', postal_code: '', siret: '', notes: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingClient) {
      await updateClient(editingClient.id, formData);
      toast({ title: "Client mis à jour" });
    } else {
      await createClient({
        name: formData.name,
        company: formData.company || null,
        email: formData.email || null,
        phone: formData.phone || null,
        address: formData.address || null,
        city: formData.city || null,
        postal_code: formData.postal_code || null,
        siret: formData.siret || null,
        notes: formData.notes || null,
      });
    }
    
    setDialogOpen(false);
    resetForm();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce client ?')) return;
    await deleteClient(id);
  };

  const resetForm = () => {
    setFormData({ name: '', company: '', email: '', phone: '', address: '', city: '', postal_code: '', siret: '', notes: '' });
    setEditingClient(null);
  };
  const openEdit = (client: ClientWithCreator) => {
    setEditingClient(client);
    setFormData({
      name: client.name,
      company: client.company || '',
      email: client.email || '',
      phone: client.phone || '',
      address: client.address || '',
      city: client.city || '',
      postal_code: client.postal_code || '',
      siret: client.siret || '',
      notes: client.notes || ''
    });
    setDialogOpen(true);
  };

  const getClientAddressesLocal = (clientId: string) => {
    return getClientAddresses(clientId);
  };

  // Filter clients by name/company
  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.company?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Filter clients by tour name/address
  const getClientsByTourSearch = () => {
    if (!searchTerm) return [];
    const lowerSearch = searchTerm.toLowerCase();
    const itineraryReports = reports.filter(r => r.report_type === 'itinerary');
    
    // Find matching reports
    const matchingReports = itineraryReports.filter(r =>
      r.title.toLowerCase().includes(lowerSearch) ||
      r.data.origin_address?.toLowerCase().includes(lowerSearch) ||
      r.data.destination_address?.toLowerCase().includes(lowerSearch)
    );
    
    // Get unique client IDs and their matching reports
    const clientReportsMap = new Map<string, LocalClientReport[]>();
    matchingReports.forEach(r => {
      const existing = clientReportsMap.get(r.client_id) || [];
      clientReportsMap.set(r.client_id, [...existing, r]);
    });
    
    return Array.from(clientReportsMap.entries()).map(([clientId, reports]) => ({
      client: clients.find(c => c.id === clientId),
      reports
    })).filter(item => item.client);
  };

  const tourSearchResults = searchMode === 'tours' ? getClientsByTourSearch() : [];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t.clients.title}</h1>
          <p className="text-muted-foreground">{t.clients.subtitle}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setSharedTractionsOpen(true)}>
            <Link2 className="w-4 h-4 mr-2" />
            Relais multi-clients
          </Button>
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="btn-primary">
                <Plus className="w-4 h-4 mr-2" />
                Nouveau client
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingClient ? 'Modifier le client' : 'Nouveau client'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nom *</Label>
                    <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Société</Label>
                    <Input value={formData.company} onChange={e => setFormData({...formData, company: e.target.value})} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Téléphone</Label>
                    <Input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Adresse</Label>
                  <Input value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Ville</Label>
                    <Input value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Code postal</Label>
                    <Input value={formData.postal_code} onChange={e => setFormData({...formData, postal_code: e.target.value})} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>SIRET</Label>
                  <Input value={formData.siret} onChange={e => setFormData({...formData, siret: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} />
                </div>
                <Button type="submit" className="w-full btn-primary">
                  {editingClient ? 'Mettre à jour' : 'Ajouter'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-lg grid-cols-3">
          <TabsTrigger value="clients" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Répertoire
          </TabsTrigger>
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Statistiques
          </TabsTrigger>
          <TabsTrigger value="analysis" className="flex items-center gap-2">
            <Target className="w-4 h-4" />
            Rentabilité
          </TabsTrigger>
        </TabsList>

        <TabsContent value="clients" className="mt-6 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder={searchMode === 'clients' ? "Rechercher un client..." : "Rechercher une tournée..."}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-10 input-field"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={searchMode === 'clients' ? 'default' : 'outline'}
                size="sm"
                onClick={() => { setSearchMode('clients'); setSearchTerm(''); }}
              >
                <Users className="w-4 h-4 mr-1" />
                Clients
              </Button>
              <Button
                variant={searchMode === 'tours' ? 'default' : 'outline'}
                size="sm"
                onClick={() => { setSearchMode('tours'); setSearchTerm(''); }}
              >
                <Route className="w-4 h-4 mr-1" />
                Tournées
              </Button>
            </div>
          </div>

          {/* Tour search results */}
          {searchMode === 'tours' && searchTerm && (
            <div className="space-y-4">
              {tourSearchResults.length === 0 ? (
                <Card className="glass-card">
                  <CardContent className="py-8 text-center text-muted-foreground">
                    Aucune tournée trouvée pour "{searchTerm}"
                  </CardContent>
                </Card>
              ) : (
                tourSearchResults.map(({ client, reports: matchingReports }) => (
                  <Card key={client!.id} className="glass-card">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">{client!.name}</CardTitle>
                          {client!.company && (
                            <p className="text-sm text-muted-foreground">{client!.company}</p>
                          )}
                        </div>
                        <Button variant="outline" size="sm" onClick={() => { setDetailClient(client!); setDetailOpen(true); }}>
                          <Eye className="w-4 h-4 mr-1" />
                          Voir fiche
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">Tournées correspondantes:</p>
                      {matchingReports.map(report => (
                        <div key={report.id} className="p-2 bg-muted/30 rounded-md text-sm">
                          <p className="font-medium">{report.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {report.data.origin_address?.split(',')[0]} → {report.data.destination_address?.split(',')[0]}
                          </p>
                          <div className="flex gap-3 mt-1 text-xs">
                            <span>{report.data.distance_km} km</span>
                            {report.data.total_cost && <span>Coût: {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(report.data.total_cost)}</span>}
                            {report.data.profit !== undefined && (
                              <span className={report.data.profit >= 0 ? 'text-success' : 'text-destructive'}>
                                Bénéfice: {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(report.data.profit)}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}

          {/* Normal client list */}
          {searchMode === 'clients' && (
            filteredClients.length === 0 ? (
              <Card className="glass-card">
                <CardContent className="py-12 text-center text-muted-foreground">
                  {loading ? 'Chargement...' : searchTerm ? 'Aucun client trouvé' : 'Aucun client. Créez votre premier client !'}
                </CardContent>
              </Card>
            ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredClients.map(client => {
                const clientAddresses = getClientAddressesLocal(client.id);
                const isShared = !!client.license_id;
                
                return (
                  <Card key={client.id} className="glass-card hover:border-primary/30 transition-colors">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <CardTitle className="text-lg truncate">{client.name}</CardTitle>
                            {isShared && (
                              <SharedDataBadge
                                isShared={isShared}
                                createdBy={client.creator_display_name}
                                createdByEmail={client.creator_email}
                                isOwn={client.is_own}
                                isFormerMember={client.is_former_member}
                                compact
                              />
                            )}
                          </div>
                          {client.company && (
                            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                              <Building2 className="w-3 h-3" /> {client.company}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => { setDetailClient(client); setDetailOpen(true); }}>
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => openEdit(client)}>
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(client.id)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      {client.email && (
                        <p className="flex items-center gap-2 text-muted-foreground">
                          <Mail className="w-3 h-3" /> {client.email}
                        </p>
                      )}
                      {client.phone && (
                        <p className="flex items-center gap-2 text-muted-foreground">
                          <Phone className="w-3 h-3" /> {client.phone}
                        </p>
                      )}
                      {client.address && (
                        <p className="flex items-center gap-2 text-muted-foreground">
                          <MapPin className="w-3 h-3" /> {client.address}, {client.city}
                        </p>
                      )}
                      {clientAddresses.length > 0 && (
                        <div className="pt-2 border-t border-border mt-2">
                          <p className="text-xs font-medium text-foreground mb-1">Adresses fréquentes:</p>
                          {clientAddresses.slice(0, 3).map(addr => (
                            <p key={addr.id} className="text-xs text-muted-foreground truncate">
                              • {addr.label}: {addr.address}
                            </p>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            )
          )}
        </TabsContent>

        <TabsContent value="dashboard" className="mt-6">
          <ClientsDashboard />
        </TabsContent>

        <TabsContent value="analysis" className="mt-6">
          <FeatureGate feature="client_analysis">
            <ToxicClientsAnalysis />
          </FeatureGate>
        </TabsContent>
      </Tabs>

      <ClientDetailDialog 
        client={detailClient} 
        open={detailOpen} 
        onOpenChange={setDetailOpen} 
      />
      
      <SharedTractionsDialog
        open={sharedTractionsOpen}
        onOpenChange={setSharedTractionsOpen}
      />
    </div>
  );
}