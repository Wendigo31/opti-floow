import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  History, 
  Eye, 
  Monitor, 
  Smartphone, 
  Tablet,
  CheckCircle,
  XCircle,
  RefreshCw,
  Save,
  Globe,
  BarChart3,
  Route,
  Truck,
  Users,
  Receipt,
  FileText,
  Car,
  Fuel,
  Calendar,
  DollarSign,
  Package,
  Sparkles,
  Plus,
  Pencil,
  ClipboardList,
  Settings,
  UserCog,
  Trash2,
  Power,
  Building2,
  MapPin,
  Briefcase
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
// Pricing/Add-ons imports removed - custom pricing handled externally
import { CreateCompanyDialog } from './CreateCompanyDialog';
import type { PlanType } from '@/hooks/useLicense';

interface LoginHistoryEntry {
  id: string;
  login_at: string;
  ip_address: string | null;
  user_agent: string | null;
  device_type: string | null;
  location: string | null;
  success: boolean;
}

interface UserStats {
  savedTours: number;
  trips: number;
  clients: number;
  quotes: number;
  vehicles: number;
  drivers: number;
  charges: number;
}

interface VehicleData {
  id: string;
  name: string;
  brand?: string;
  model?: string;
  license_plate?: string;
  fuel_type?: string;
  fuel_consumption?: number;
  vehicle_type?: string;
  is_active?: boolean;
  current_km?: number;
  synced_at: string;
}

interface DriverData {
  id: string;
  name: string;
  driver_type?: string;
  hourly_rate?: number;
  base_salary?: number;
  synced_at: string;
}

interface ChargeData {
  id: string;
  name: string;
  amount: number;
  periodicity?: string;
  category?: string;
  is_ht?: boolean;
  synced_at: string;
}

interface LicenseAddon {
  id: string;
  license_id: string;
  addon_id: string;
  activated_at: string;
  billing_period: string;
  monthly_price: number;
  is_active: boolean;
}

interface AuditLogEntry {
  id: string;
  admin_email: string;
  action: string;
  target_id: string | null;
  details: Record<string, any> | null;
  ip_address: string | null;
  created_at: string;
}

interface License {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  company_name: string | null;
  plan_type?: string;
  show_user_info?: boolean;
  show_company_info?: boolean;
  show_address_info?: boolean;
  show_license_info?: boolean;
  // SIREN data
  siren?: string | null;
  address?: string | null;
  city?: string | null;
  postal_code?: string | null;
  company_status?: string | null;
  employee_count?: number | null;
}

interface UserDetailDialogProps {
  license: License | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  adminToken: string;
  onUpdate?: () => void;
}

export function UserDetailDialog({ 
  license, 
  open, 
  onOpenChange, 
  adminToken,
  onUpdate 
}: UserDetailDialogProps) {
  const [loginHistory, setLoginHistory] = useState<LoginHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [stats, setStats] = useState<UserStats | null>(null);
  
  // Add-ons data
  const [addons, setAddons] = useState<LicenseAddon[]>([]);
  const [addonsLoading, setAddonsLoading] = useState(false);
  const [addonsEditMode, setAddonsEditMode] = useState(false);
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const [addonsSaving, setAddonsSaving] = useState(false);
  
  // Details data
  const [vehicles, setVehicles] = useState<VehicleData[]>([]);
  const [drivers, setDrivers] = useState<DriverData[]>([]);
  const [charges, setCharges] = useState<ChargeData[]>([]);
  const [detailsLoading, setDetailsLoading] = useState<'vehicles' | 'drivers' | 'charges' | null>(null);
  
  // Audit logs
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [auditLogsLoading, setAuditLogsLoading] = useState(false);
  
  // Visibility settings
  const [showUserInfo, setShowUserInfo] = useState(true);
  const [showCompanyInfo, setShowCompanyInfo] = useState(true);
  const [showAddressInfo, setShowAddressInfo] = useState(true);
  const [showLicenseInfo, setShowLicenseInfo] = useState(true);
  
  // SIREN sync dialog
  const [sirenSyncOpen, setSirenSyncOpen] = useState(false);

  useEffect(() => {
    if (license && open) {
      // Initialize visibility settings from license
      setShowUserInfo(license.show_user_info ?? true);
      setShowCompanyInfo(license.show_company_info ?? true);
      setShowAddressInfo(license.show_address_info ?? true);
      setShowLicenseInfo(license.show_license_info ?? true);
      
      // Fetch data
      fetchLoginHistory();
      fetchUserStats();
      fetchAddons();
      
      // Reset details
      setVehicles([]);
      setDrivers([]);
      setCharges([]);
    }
  }, [license, open]);

  const fetchAddons = async () => {
    if (!license) return;
    
    setAddonsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('validate-license', {
        body: { 
          action: 'admin-get-addons',
          licenseId: license.id,
          adminToken
        },
      });

      if (error) throw error;
      
      if (data?.success) {
        setAddons(data.addons || []);
        // Initialize selected addons from current active addons
        setSelectedAddons((data.addons || []).filter((a: LicenseAddon) => a.is_active).map((a: LicenseAddon) => a.addon_id));
      }
    } catch (error) {
      console.error('Error fetching addons:', error);
    } finally {
      setAddonsLoading(false);
    }
  };

  const saveAddons = async () => {
    if (!license) return;
    
    setAddonsSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke('validate-license', {
        body: { 
          action: 'admin-update-addons',
          licenseId: license.id,
          addOns: selectedAddons,
          adminToken
        },
      });

      if (error) throw error;
      
      if (data?.success) {
        toast.success('Add-ons mis à jour avec succès');
        setAddonsEditMode(false);
        fetchAddons();
        onUpdate?.();
      }
    } catch (error) {
      console.error('Error saving addons:', error);
      toast.error('Erreur lors de la mise à jour des add-ons');
    } finally {
      setAddonsSaving(false);
    }
  };

  const toggleAddonSelection = (addonId: string) => {
    setSelectedAddons(prev => 
      prev.includes(addonId) 
        ? prev.filter(id => id !== addonId)
        : [...prev, addonId]
    );
  };

  const cancelEditAddons = () => {
    setAddonsEditMode(false);
    // Reset to current active addons
    setSelectedAddons(addons.filter(a => a.is_active).map(a => a.addon_id));
  };

  const fetchAuditLogs = async () => {
    if (!license) return;
    
    setAuditLogsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('validate-license', {
        body: { 
          action: 'get-audit-logs',
          licenseId: license.id,
          limit: 50,
          adminToken
        },
      });

      if (error) throw error;
      
      if (data?.success) {
        setAuditLogs(data.logs || []);
      }
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    } finally {
      setAuditLogsLoading(false);
    }
  };

  const fetchLoginHistory = async () => {
    if (!license) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('validate-license', {
        body: { 
          action: 'get-login-history',
          licenseId: license.id,
          adminToken
        },
      });

      if (error) throw error;
      
      if (data?.success) {
        setLoginHistory(data.history || []);
      }
    } catch (error) {
      console.error('Error fetching login history:', error);
      toast.error('Erreur lors du chargement de l\'historique');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserStats = async () => {
    if (!license) return;
    
    setStatsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('validate-license', {
        body: { 
          action: 'get-user-stats',
          licenseId: license.id,
          adminToken
        },
      });

      if (error) throw error;
      
      if (data?.success) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error fetching user stats:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  const fetchDetails = async (type: 'vehicles' | 'drivers' | 'charges') => {
    if (!license) return;
    
    setDetailsLoading(type);
    try {
      const { data, error } = await supabase.functions.invoke('validate-license', {
        body: { 
          action: 'get-user-details',
          licenseId: license.id,
          type,
          adminToken
        },
      });

      if (error) throw error;
      
      if (data?.success) {
        if (type === 'vehicles') setVehicles(data.data || []);
        if (type === 'drivers') setDrivers(data.data || []);
        if (type === 'charges') setCharges(data.data || []);
      }
    } catch (error) {
      console.error(`Error fetching ${type}:`, error);
      toast.error(`Erreur lors du chargement des ${type}`);
    } finally {
      setDetailsLoading(null);
    }
  };

  const saveVisibilitySettings = async () => {
    if (!license) return;
    
    setSaving(true);
    try {
      const { error } = await supabase.functions.invoke('validate-license', {
        body: { 
          action: 'update-visibility',
          licenseId: license.id,
          showUserInfo,
          showCompanyInfo,
          showAddressInfo,
          showLicenseInfo,
          adminToken
        },
      });

      if (error) throw error;
      
      toast.success('Paramètres de visibilité mis à jour');
      onUpdate?.();
    } catch (error) {
      console.error('Error saving visibility settings:', error);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const getDeviceIcon = (deviceType: string | null) => {
    switch (deviceType) {
      case 'mobile':
        return <Smartphone className="w-4 h-4" />;
      case 'tablet':
        return <Tablet className="w-4 h-4" />;
      default:
        return <Monitor className="w-4 h-4" />;
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value);
  };

  if (!license) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5" />
            Détails utilisateur
          </DialogTitle>
          <DialogDescription>
            {license.first_name || license.last_name 
              ? `${license.first_name || ''} ${license.last_name || ''}`.trim()
              : license.email}
            {license.company_name && ` - ${license.company_name}`}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="company" className="w-full">
          <TabsList className="grid w-full grid-cols-8">
            <TabsTrigger value="company" className="flex items-center gap-1 text-xs">
              <Building2 className="w-3 h-3" />
              Société
            </TabsTrigger>
            <TabsTrigger value="stats" className="flex items-center gap-1 text-xs">
              <BarChart3 className="w-3 h-3" />
              Stats
            </TabsTrigger>
            <TabsTrigger value="addons" className="flex items-center gap-1 text-xs">
              <Package className="w-3 h-3" />
              Add-ons
            </TabsTrigger>
            <TabsTrigger value="vehicles" className="flex items-center gap-1 text-xs" onClick={() => vehicles.length === 0 && fetchDetails('vehicles')}>
              <Car className="w-3 h-3" />
              Véhicules
            </TabsTrigger>
            <TabsTrigger value="drivers" className="flex items-center gap-1 text-xs" onClick={() => drivers.length === 0 && fetchDetails('drivers')}>
              <Users className="w-3 h-3" />
              Conducteurs
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-1 text-xs">
              <History className="w-3 h-3" />
              Connexions
            </TabsTrigger>
            <TabsTrigger value="audit" className="flex items-center gap-1 text-xs" onClick={() => auditLogs.length === 0 && fetchAuditLogs()}>
              <ClipboardList className="w-3 h-3" />
              Audit
            </TabsTrigger>
            <TabsTrigger value="visibility" className="flex items-center gap-1 text-xs">
              <Eye className="w-3 h-3" />
              Visibilité
            </TabsTrigger>
          </TabsList>

          {/* Company/SIREN Info Tab */}
          <TabsContent value="company" className="mt-4">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground">
                Informations de l'entreprise récupérées depuis le SIREN
              </p>
              <Button variant="outline" size="sm" onClick={() => setSirenSyncOpen(true)}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Mettre à jour via SIREN
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Société */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Informations société</CardTitle>
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground text-sm">Raison sociale</span>
                    <span className="font-medium">{license.company_name || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground text-sm">SIREN</span>
                    <span className="font-mono">{license.siren || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground text-sm">Forme juridique</span>
                    <span>{license.company_status || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground text-sm">Effectif</span>
                    <span>{license.employee_count ?? '-'}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Adresse */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Adresse</CardTitle>
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground text-sm">Adresse</span>
                    <span className="text-right max-w-[200px]">{license.address || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground text-sm">Code postal</span>
                    <span>{license.postal_code || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground text-sm">Ville</span>
                    <span>{license.city || '-'}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Forfait */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Forfait</CardTitle>
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold uppercase">{license.plan_type || 'start'}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Contact */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Contact principal</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground text-sm">Nom</span>
                    <span>{[license.first_name, license.last_name].filter(Boolean).join(' ') || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground text-sm">Email</span>
                    <span className="text-sm">{license.email}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Stats Tab */}
          <TabsContent value="stats" className="mt-4">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground">
                Données créées par l'utilisateur
              </p>
              <Button variant="outline" size="sm" onClick={fetchUserStats} disabled={statsLoading}>
                <RefreshCw className={`w-4 h-4 mr-2 ${statsLoading ? 'animate-spin' : ''}`} />
                Actualiser
              </Button>
            </div>

            {statsLoading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : stats ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-xs font-medium">Tournées</CardTitle>
                    <Route className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.savedTours}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-xs font-medium">Trajets</CardTitle>
                    <Truck className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.trips}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-xs font-medium">Clients</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.clients}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-xs font-medium">Devis</CardTitle>
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.quotes}</div>
                  </CardContent>
                </Card>

                <Card className="border-primary/30 bg-primary/5">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-xs font-medium">Véhicules</CardTitle>
                    <Car className="h-4 w-4 text-primary" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-primary">{stats.vehicles}</div>
                    <p className="text-xs text-muted-foreground">synchronisés</p>
                  </CardContent>
                </Card>

                <Card className="border-primary/30 bg-primary/5">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-xs font-medium">Conducteurs</CardTitle>
                    <Users className="h-4 w-4 text-primary" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-primary">{stats.drivers}</div>
                    <p className="text-xs text-muted-foreground">synchronisés</p>
                  </CardContent>
                </Card>

                <Card className="border-primary/30 bg-primary/5">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-xs font-medium">Charges</CardTitle>
                    <Receipt className="h-4 w-4 text-primary" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-primary">{stats.charges}</div>
                    <p className="text-xs text-muted-foreground">synchronisées</p>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Aucune donnée disponible</p>
                <p className="text-sm">L'utilisateur n'a pas encore créé de compte</p>
              </div>
            )}
          </TabsContent>

          {/* Add-ons Tab */}
          <TabsContent value="addons" className="mt-4">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground">
                Add-ons actifs ({addons.filter(a => a.is_active).length})
              </p>
              <div className="flex items-center gap-2">
                {addonsEditMode ? (
                  <>
                    <Button variant="outline" size="sm" onClick={cancelEditAddons} disabled={addonsSaving}>
                      Annuler
                    </Button>
                    <Button size="sm" onClick={saveAddons} disabled={addonsSaving}>
                      {addonsSaving ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          Enregistrement...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          Enregistrer
                        </>
                      )}
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" size="sm" onClick={fetchAddons} disabled={addonsLoading}>
                      <RefreshCw className={`w-4 h-4 mr-2 ${addonsLoading ? 'animate-spin' : ''}`} />
                      Actualiser
                    </Button>
                    <Button size="sm" onClick={() => setAddonsEditMode(true)}>
                      <Pencil className="w-4 h-4 mr-2" />
                      Modifier
                    </Button>
                  </>
                )}
              </div>
            </div>

            <ScrollArea className="h-[350px]">
              {addonsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : addonsEditMode ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>La gestion des add-ons est désactivée.</p>
                  <p className="text-sm">La tarification est gérée sur mesure.</p>
                </div>
              ) : addons.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Aucun add-on actif</p>
                  <p className="text-sm">Cliquez sur "Modifier" pour ajouter des add-ons</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {addons.map((addon) => {
                    const addonInfo = null; // ADD_ONS removed - custom pricing
                    return (
                      <Card key={addon.id} className={addon.is_active ? 'border-primary/30 bg-primary/5' : 'opacity-60'}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3">
                              <div className="p-2 rounded-lg bg-primary/10">
                                <Sparkles className="w-4 h-4 text-primary" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">
                                    {addonInfo?.name || addon.addon_id}
                                  </span>
                                  {addon.is_active ? (
                                    <Badge className="bg-green-500/20 text-green-500 border-green-500/30 text-xs">
                                      <CheckCircle className="w-3 h-3 mr-1" />
                                      Actif
                                    </Badge>
                                  ) : (
                                    <Badge variant="secondary" className="text-xs">
                                      <XCircle className="w-3 h-3 mr-1" />
                                      Inactif
                                    </Badge>
                                  )}
                                </div>
                                {addonInfo?.description && (
                                  <p className="text-sm text-muted-foreground mt-1">
                                    {addonInfo.description}
                                  </p>
                                )}
                                <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                  <div className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    Activé le {format(new Date(addon.activated_at), 'dd/MM/yyyy', { locale: fr })}
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <DollarSign className="w-3 h-3" />
                                    {formatCurrency(addon.monthly_price)}/mois
                                  </div>
                                  <Badge variant="outline" className="text-xs">
                                    {addon.billing_period === 'yearly' ? 'Annuel' : 'Mensuel'}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {addonInfo?.category === 'feature' ? 'Fonctionnalité' : 
                               addonInfo?.category === 'limit' ? 'Limite' : 
                               addonInfo?.category === 'support' ? 'Support' : 'Autre'}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}

                  {/* Total mensuel */}
                  {addons.filter(a => a.is_active).length > 0 && (
                    <Card className="border-dashed">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Total add-ons actifs</span>
                          <span className="font-semibold text-lg">
                            {formatCurrency(addons.filter(a => a.is_active).reduce((sum, a) => sum + a.monthly_price, 0))}/mois
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* Vehicles Tab */}
          <TabsContent value="vehicles" className="mt-4">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground">
                Véhicules synchronisés ({vehicles.length})
              </p>
              <Button variant="outline" size="sm" onClick={() => fetchDetails('vehicles')} disabled={detailsLoading === 'vehicles'}>
                <RefreshCw className={`w-4 h-4 mr-2 ${detailsLoading === 'vehicles' ? 'animate-spin' : ''}`} />
                Actualiser
              </Button>
            </div>

            <ScrollArea className="h-[350px]">
              {detailsLoading === 'vehicles' ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : vehicles.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Car className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Aucun véhicule synchronisé</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nom</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Immatriculation</TableHead>
                      <TableHead>Carburant</TableHead>
                      <TableHead>Conso.</TableHead>
                      <TableHead>Statut</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vehicles.map((vehicle) => (
                      <TableRow key={vehicle.id}>
                        <TableCell className="font-medium">
                          <div>
                            {vehicle.name}
                            {vehicle.brand && vehicle.model && (
                              <span className="text-xs text-muted-foreground ml-1">
                                ({vehicle.brand} {vehicle.model})
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {vehicle.vehicle_type || 'N/A'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                            {vehicle.license_plate || '-'}
                          </code>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Fuel className="w-3 h-3 text-muted-foreground" />
                            <span className="text-sm">{vehicle.fuel_type || '-'}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {vehicle.fuel_consumption ? `${vehicle.fuel_consumption} L/100km` : '-'}
                        </TableCell>
                        <TableCell>
                          {vehicle.is_active !== false ? (
                            <Badge className="bg-green-500/20 text-green-500 border-green-500/30">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Actif
                            </Badge>
                          ) : (
                            <Badge variant="secondary">
                              <XCircle className="w-3 h-3 mr-1" />
                              Inactif
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </ScrollArea>
          </TabsContent>

          {/* Drivers Tab */}
          <TabsContent value="drivers" className="mt-4">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground">
                Conducteurs synchronisés ({drivers.length})
              </p>
              <Button variant="outline" size="sm" onClick={() => fetchDetails('drivers')} disabled={detailsLoading === 'drivers'}>
                <RefreshCw className={`w-4 h-4 mr-2 ${detailsLoading === 'drivers' ? 'animate-spin' : ''}`} />
                Actualiser
              </Button>
            </div>

            <ScrollArea className="h-[350px]">
              {detailsLoading === 'drivers' ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : drivers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Aucun conducteur synchronisé</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nom</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Taux horaire</TableHead>
                      <TableHead>Salaire de base</TableHead>
                      <TableHead>Sync.</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {drivers.map((driver) => (
                      <TableRow key={driver.id}>
                        <TableCell className="font-medium">{driver.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {driver.driver_type === 'employee' ? 'Salarié' : 
                             driver.driver_type === 'owner' ? 'Gérant' : 
                             driver.driver_type || 'N/A'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {driver.hourly_rate ? (
                            <div className="flex items-center gap-1">
                              <DollarSign className="w-3 h-3 text-muted-foreground" />
                              {formatCurrency(driver.hourly_rate)}/h
                            </div>
                          ) : '-'}
                        </TableCell>
                        <TableCell>
                          {driver.base_salary ? formatCurrency(driver.base_salary) : '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="w-3 h-3" />
                            {format(new Date(driver.synced_at), 'dd/MM/yy', { locale: fr })}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </ScrollArea>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="mt-4">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground">
                50 dernières connexions
              </p>
              <Button variant="outline" size="sm" onClick={fetchLoginHistory} disabled={loading}>
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Actualiser
              </Button>
            </div>
            
            <ScrollArea className="h-[350px]">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : loginHistory.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Aucun historique de connexion
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Appareil</TableHead>
                      <TableHead>IP</TableHead>
                      <TableHead>Statut</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loginHistory.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell>
                          {format(new Date(entry.login_at), 'dd MMM yyyy à HH:mm', { locale: fr })}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getDeviceIcon(entry.device_type)}
                            <span className="capitalize">{entry.device_type || 'desktop'}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Globe className="w-3 h-3 text-muted-foreground" />
                            <code className="text-xs">{entry.ip_address || '-'}</code>
                          </div>
                        </TableCell>
                        <TableCell>
                          {entry.success ? (
                            <Badge className="bg-green-500/20 text-green-500 border-green-500/30 gap-1">
                              <CheckCircle className="w-3 h-3" />
                              Succès
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="gap-1">
                              <XCircle className="w-3 h-3" />
                              Échec
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </ScrollArea>
          </TabsContent>

          {/* Audit Tab */}
          <TabsContent value="audit" className="mt-4">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground">
                Historique des actions administrateur ({auditLogs.length})
              </p>
              <Button variant="outline" size="sm" onClick={fetchAuditLogs} disabled={auditLogsLoading}>
                <RefreshCw className={`w-4 h-4 mr-2 ${auditLogsLoading ? 'animate-spin' : ''}`} />
                Actualiser
              </Button>
            </div>
            
            <ScrollArea className="h-[350px]">
              {auditLogsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : auditLogs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <ClipboardList className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Aucune action enregistrée</p>
                  <p className="text-sm">Les modifications sur cette licence apparaîtront ici</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {auditLogs.map((log) => {
                    const getActionIcon = (action: string) => {
                      switch (action) {
                        case 'update_addons':
                          return <Package className="w-4 h-4" />;
                        case 'toggle_status':
                          return <Power className="w-4 h-4" />;
                        case 'update_plan':
                          return <Settings className="w-4 h-4" />;
                        case 'update_limits':
                          return <UserCog className="w-4 h-4" />;
                        case 'delete_license':
                          return <Trash2 className="w-4 h-4" />;
                        case 'create_license':
                          return <Plus className="w-4 h-4" />;
                        case 'update_visibility':
                          return <Eye className="w-4 h-4" />;
                        default:
                          return <ClipboardList className="w-4 h-4" />;
                      }
                    };

                    const getActionLabel = (action: string) => {
                      const labels: Record<string, string> = {
                        'update_addons': 'Modification des add-ons',
                        'toggle_status': 'Activation/Désactivation',
                        'update_plan': 'Changement de forfait',
                        'update_limits': 'Modification des limites',
                        'update_features': 'Modification des fonctionnalités',
                        'delete_license': 'Suppression de licence',
                        'create_license': 'Création de licence',
                        'update_visibility': 'Modification visibilité',
                        'list_licenses': 'Consultation liste',
                        'update_license': 'Modification licence',
                      };
                      return labels[action] || action;
                    };

                    const getActionColor = (action: string) => {
                      if (action.includes('delete')) return 'text-destructive';
                      if (action.includes('create')) return 'text-green-500';
                      if (action.includes('update') || action.includes('toggle')) return 'text-primary';
                      return 'text-muted-foreground';
                    };

                    const formatDetails = (details: Record<string, any> | null) => {
                      if (!details) return null;
                      
                      if (details.addOns) {
                        const addOnNames = (details.addOns as string[]);
                        return addOnNames.length > 0 
                          ? `Add-ons: ${addOnNames.join(', ')}`
                          : 'Tous les add-ons désactivés';
                      }
                      
                      if (details.newPlan) {
                        return `Nouveau forfait: ${details.newPlan}`;
                      }
                      
                      if (details.isActive !== undefined) {
                        return details.isActive ? 'Licence activée' : 'Licence désactivée';
                      }
                      
                      return JSON.stringify(details);
                    };

                    return (
                      <Card key={log.id} className="bg-card">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div className={`p-2 rounded-lg bg-muted ${getActionColor(log.action)}`}>
                              {getActionIcon(log.action)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-medium text-sm">
                                  {getActionLabel(log.action)}
                                </span>
                                <span className="text-xs text-muted-foreground whitespace-nowrap">
                                  {format(new Date(log.created_at), 'dd/MM/yyyy à HH:mm', { locale: fr })}
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">
                                Par: {log.admin_email}
                              </p>
                              {log.details && (
                                <p className="text-xs text-muted-foreground mt-1 truncate">
                                  {formatDetails(log.details)}
                                </p>
                              )}
                              {log.ip_address && (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                                  <Globe className="w-3 h-3" />
                                  <code>{log.ip_address}</code>
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="visibility" className="mt-4">
            <div className="space-y-6">
              <p className="text-sm text-muted-foreground">
                Contrôlez quelles sections sont visibles pour cet utilisateur dans la page "Informations &gt; Mon compte".
              </p>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
                  <div className="space-y-0.5">
                    <Label htmlFor="show-license">Licence</Label>
                    <p className="text-sm text-muted-foreground">
                      Afficher les informations de licence (code, date d'activation, statut)
                    </p>
                  </div>
                  <Switch
                    id="show-license"
                    checked={showLicenseInfo}
                    onCheckedChange={setShowLicenseInfo}
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
                  <div className="space-y-0.5">
                    <Label htmlFor="show-user">Utilisateur</Label>
                    <p className="text-sm text-muted-foreground">
                      Afficher les informations utilisateur (nom, prénom, email)
                    </p>
                  </div>
                  <Switch
                    id="show-user"
                    checked={showUserInfo}
                    onCheckedChange={setShowUserInfo}
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
                  <div className="space-y-0.5">
                    <Label htmlFor="show-company">Entreprise</Label>
                    <p className="text-sm text-muted-foreground">
                      Afficher les informations entreprise (raison sociale, SIREN, effectif)
                    </p>
                  </div>
                  <Switch
                    id="show-company"
                    checked={showCompanyInfo}
                    onCheckedChange={setShowCompanyInfo}
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
                  <div className="space-y-0.5">
                    <Label htmlFor="show-address">Adresse</Label>
                    <p className="text-sm text-muted-foreground">
                      Afficher les informations d'adresse (adresse, code postal, ville)
                    </p>
                  </div>
                  <Switch
                    id="show-address"
                    checked={showAddressInfo}
                    onCheckedChange={setShowAddressInfo}
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t">
                <Button onClick={saveVisibilitySettings} disabled={saving}>
                  {saving ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Enregistrement...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Enregistrer
                    </>
                  )}
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* SIREN Sync Dialog */}
        <CreateCompanyDialog
          open={sirenSyncOpen}
          onOpenChange={setSirenSyncOpen}
          getAdminToken={() => adminToken}
          onCompanyCreated={() => {
            setSirenSyncOpen(false);
            onUpdate?.();
          }}
          editLicenseId={license.id}
          editLicenseData={{
            companyName: license.company_name || undefined,
            siren: license.siren || undefined,
            address: license.address || undefined,
            city: license.city || undefined,
            postalCode: license.postal_code || undefined,
            companyStatus: license.company_status || undefined,
            employeeCount: license.employee_count || undefined,
            email: license.email,
            planType: (license.plan_type || 'start') as PlanType,
          }}
        />
      </DialogContent>
    </Dialog>
  );
}