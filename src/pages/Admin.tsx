import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { 
  Shield, 
  Users, 
  Search, 
  RefreshCw, 
  CheckCircle, 
  XCircle,
  Crown,
  Star,
  Sparkles,
  Calendar,
  Mail,
  Building2,
  Edit,
  Save,
  X,
  Plus,
  Copy,
  User,
  Trash2,
  MapPin,
  FileText,
  Settings,
  Settings2,
  Bell,
  LogIn,
  LogOut,
  PlayCircle,
  StopCircle,
  Loader2,
  Eye,
  ChevronRight,
  Database,
  Lock
} from 'lucide-react';
import { GitMerge } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FeatureEditor } from '@/components/admin/FeatureEditor';
import { PWAUpdatesManager } from '@/components/admin/PWAUpdatesManager';
import { UserDetailDialog } from '@/components/admin/UserDetailDialog';
import { SchemaSyncManager } from '@/components/admin/SchemaSyncManager';
import { CompanyUsersManager } from '@/components/admin/CompanyUsersManager';
import { CompanyDataStats } from '@/components/admin/CompanyDataStats';
import { CreateCompanyDialog } from '@/components/admin/CreateCompanyDialog';
import { UserFeatureOverrides } from '@/components/admin/UserFeatureOverrides';
import { AccessRequestsManager } from '@/components/admin/AccessRequestsManager';
import { CompanyDetailPanel } from '@/components/admin/CompanyDetailPanel';
import { CompanyMergeManager } from '@/components/admin/CompanyMergeManager';
import type { LicenseFeatures } from '@/types/features';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from '@/integrations/supabase/client';
import { useLicense, PlanType } from '@/hooks/useLicense';
import { useDemoMode } from '@/hooks/useDemoMode';
import { useSireneLookup } from '@/hooks/useSireneLookup';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const ADMIN_AUTH_FUNCTION = 'admin-auth';
const ADMIN_AUTH_STORAGE_KEY = 'optiflow_admin_auth_v1';
const ADMIN_TOKEN_STORAGE_KEY = 'optiflow_admin_token_v1';

interface License {
  id: string;
  license_code: string;
  max_drivers: number | null;
  max_clients: number | null;
  max_daily_charges: number | null;
  max_monthly_charges: number | null;
  max_yearly_charges: number | null;
  max_users: number | null;
  email: string;
  is_active: boolean;
  plan_type: string | null;
  activated_at: string | null;
  last_used_at: string | null;
  created_at: string;
  first_name: string | null;
  last_name: string | null;
  company_name: string | null;
  siren: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  features?: Partial<LicenseFeatures> | null;
  show_user_info?: boolean;
  show_company_info?: boolean;
  show_address_info?: boolean;
  show_license_info?: boolean;
}

interface LicenseFormData {
  email: string;
  planType: PlanType;
  firstName: string;
  lastName: string;
  companyName: string;
  siren: string;
  address: string;
  city: string;
  postalCode: string;
  assignToCompanyId: string | null;
  userRole: 'owner' | 'admin' | 'member';
}

const emptyFormData: LicenseFormData = {
  email: '',
  planType: 'start',
  firstName: '',
  lastName: '',
  companyName: '',
  siren: '',
  address: '',
  city: '',
  postalCode: '',
  assignToCompanyId: null,
  userRole: 'member',
};

// Sidebar navigation items
const ADMIN_NAV = [
  { id: 'licenses', label: 'Licences', icon: Users, description: 'Gérer les licences' },
  { id: 'companies', label: 'Sociétés', icon: Building2, description: 'Gérer les sociétés' },
  { id: 'merge', label: 'Fusion', icon: GitMerge, description: 'Déduplication SIREN' },
  { id: 'access', label: 'Accès', icon: Lock, description: 'Permissions utilisateurs' },
  { id: 'features', label: 'Fonctionnalités', icon: Settings2, description: 'Configurer les features' },
  { id: 'requests', label: 'Demandes', icon: Bell, description: 'Demandes d\'accès' },
  { id: 'data', label: 'Données', icon: Database, description: 'Statistiques' },
  { id: 'updates', label: 'Mises à jour', icon: RefreshCw, description: 'Versions PWA' },
  { id: 'demo', label: 'Démo', icon: PlayCircle, description: 'Mode démonstration' },
] as const;

type AdminTab = typeof ADMIN_NAV[number]['id'];

export default function Admin() {
  const navigate = useNavigate();
  const { isLicensed, isLoading, licenseData } = useLicense();
  const { isActive: isDemoActive, currentSessionId, availableSessions, activateDemo, deactivateDemo, getCurrentSession } = useDemoMode();
  
  // Core state
  const [licenses, setLicenses] = useState<License[]>([]);
  const [companyUserCounts, setCompanyUserCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [filterPlan, setFilterPlan] = useState<'all' | PlanType>('all');
  
  // Dialog state
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [createdLicense, setCreatedLicense] = useState<{ code: string; email: string } | null>(null);
  const [editingLicenseId, setEditingLicenseId] = useState<string | null>(null);
  const [formData, setFormData] = useState<LicenseFormData>(emptyFormData);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [editingPlan, setEditingPlan] = useState<PlanType>('start');

  // Limits editor
  const [editingLimitsId, setEditingLimitsId] = useState<string | null>(null);
  const [limitsForm, setLimitsForm] = useState({
    maxDrivers: null as number | null,
    maxClients: null as number | null,
    maxDailyCharges: null as number | null,
    maxMonthlyCharges: null as number | null,
    maxYearlyCharges: null as number | null,
    maxUsers: null as number | null,
  });

  // Feature editor
  const [selectedLicenseForFeatures, setSelectedLicenseForFeatures] = useState<License | null>(null);
  const [savingFeatures, setSavingFeatures] = useState(false);
  const [adminActiveTab, setAdminActiveTab] = useState<AdminTab>('licenses');

  // User detail dialog
  const [selectedLicenseForDetail, setSelectedLicenseForDetail] = useState<License | null>(null);
  const [userDetailOpen, setUserDetailOpen] = useState(false);

  // Create company dialog
  const [createCompanyOpen, setCreateCompanyOpen] = useState(false);

  // SIRENE lookup
  const { lookup: sireneLookup, loading: sireneLoading, error: sireneError } = useSireneLookup();

  // Admin auth
  const [adminCode, setAdminCode] = useState('');
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [adminLoginError, setAdminLoginError] = useState('');
  const [adminLoginLoading, setAdminLoginLoading] = useState(false);

  // Restore admin session
  useEffect(() => {
    try {
      const rawSession = localStorage.getItem(ADMIN_AUTH_STORAGE_KEY);
      const token = localStorage.getItem(ADMIN_TOKEN_STORAGE_KEY);
      if (!rawSession || !token) {
        localStorage.removeItem(ADMIN_AUTH_STORAGE_KEY);
        localStorage.removeItem(ADMIN_TOKEN_STORAGE_KEY);
        return;
      }
      const session = JSON.parse(rawSession);
      if (session.expiresAt && Date.now() < session.expiresAt) {
        setIsAdminAuthenticated(true);
      } else {
        localStorage.removeItem(ADMIN_AUTH_STORAGE_KEY);
        localStorage.removeItem(ADMIN_TOKEN_STORAGE_KEY);
      }
    } catch { }
  }, []);

  const isAdmin = isAdminAuthenticated;

  const handleAdminLogin = async () => {
    if (!adminCode.trim() || adminLoginLoading) return;
    setAdminLoginError('');
    setAdminLoginLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke(ADMIN_AUTH_FUNCTION, {
        body: { code: adminCode },
      });

      if (error) {
        setAdminLoginError('Code secret incorrect');
        return;
      }

      if (data?.ok && data?.token) {
        setIsAdminAuthenticated(true);
        localStorage.setItem(ADMIN_TOKEN_STORAGE_KEY, data.token);
        localStorage.setItem(
          ADMIN_AUTH_STORAGE_KEY,
          JSON.stringify({ expiresAt: Date.now() + (data.expiresIn || 12 * 3600) * 1000 })
        );
        toast.success('Connexion admin réussie');
        return;
      }

      setAdminLoginError(data?.error || 'Code secret incorrect');
    } catch (error: any) {
      setAdminLoginError('Code secret incorrect');
    } finally {
      setAdminLoginLoading(false);
    }
  };

  const getAdminToken = (): string | null => {
    return localStorage.getItem(ADMIN_TOKEN_STORAGE_KEY);
  };

  // Fetch licenses
  const fetchLicenses = async () => {
    setLoading(true);
    try {
      const token = getAdminToken();
      if (!token) return;

      const { data, error } = await supabase.functions.invoke('validate-license', {
        body: { action: 'list-all', adminToken: token },
      });

      if (error) throw error;
      if (data?.licenses) {
        setLicenses(data.licenses);
        
        // Build user counts from API response
        const counts: Record<string, number> = {};
        for (const license of data.licenses) {
          counts[license.id] = license.user_count || 0;
        }
        setCompanyUserCounts(counts);
      }
    } catch (error) {
      console.error('Error fetching licenses:', error);
      toast.error('Erreur lors du chargement des licences');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchLicenses();
    }
  }, [isAdmin]);

  // License operations
  const toggleLicenseStatus = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase.functions.invoke('validate-license', {
        body: { action: 'toggle-status', licenseId: id, adminToken: getAdminToken() },
      });
      if (error) throw error;
      setLicenses(prev => prev.map(l => l.id === id ? { ...l, is_active: !currentStatus } : l));
      toast.success(`Licence ${!currentStatus ? 'activée' : 'désactivée'}`);
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const updatePlanType = async (id: string, newPlan: PlanType) => {
    try {
      const { error } = await supabase.functions.invoke('validate-license', {
        body: { action: 'update-plan', licenseId: id, planType: newPlan, adminToken: getAdminToken() },
      });
      if (error) throw error;
      setLicenses(prev => prev.map(l => l.id === id ? { ...l, plan_type: newPlan } : l));
      setEditingPlanId(null);
      toast.success('Forfait mis à jour');
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const deleteLicense = async (id: string) => {
    try {
      const { error } = await supabase.functions.invoke('validate-license', {
        body: { action: 'delete-license', licenseId: id, adminToken: getAdminToken() },
      });
      if (error) throw error;
      setLicenses(prev => prev.filter(l => l.id !== id));
      toast.success('Licence supprimée');
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const openLimitsEditor = (license: License) => {
    setEditingLimitsId(license.id);
    setLimitsForm({
      maxDrivers: license.max_drivers,
      maxClients: license.max_clients,
      maxDailyCharges: license.max_daily_charges,
      maxMonthlyCharges: license.max_monthly_charges,
      maxYearlyCharges: license.max_yearly_charges,
      maxUsers: license.max_users,
    });
  };

  const saveLimits = async () => {
    if (!editingLimitsId) return;
    try {
      const { error } = await supabase.functions.invoke('validate-license', {
        body: { 
          action: 'update-limits', 
          licenseId: editingLimitsId,
          adminToken: getAdminToken(),
          ...limitsForm,
        },
      });
      if (error) throw error;
      setLicenses(prev => prev.map(l => l.id === editingLimitsId ? { 
        ...l, 
        max_drivers: limitsForm.maxDrivers,
        max_clients: limitsForm.maxClients,
        max_daily_charges: limitsForm.maxDailyCharges,
        max_monthly_charges: limitsForm.maxMonthlyCharges,
        max_yearly_charges: limitsForm.maxYearlyCharges,
        max_users: limitsForm.maxUsers,
      } : l));
      setEditingLimitsId(null);
      toast.success('Limites mises à jour');
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const handleSaveFeatures = async (features: Partial<LicenseFeatures>) => {
    if (!selectedLicenseForFeatures) return;
    setSavingFeatures(true);
    try {
      const { error } = await supabase.functions.invoke('validate-license', {
        body: { 
          action: 'update-features', 
          licenseId: selectedLicenseForFeatures.id,
          adminToken: getAdminToken(),
          features,
        },
      });
      if (error) throw error;
      setLicenses(prev => prev.map(l => 
        l.id === selectedLicenseForFeatures.id ? { ...l, features } : l
      ));
      setSelectedLicenseForFeatures(prev => prev ? { ...prev, features } : null);
      toast.success('Fonctionnalités mises à jour');
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setSavingFeatures(false);
    }
  };

  const openCreateDialog = () => {
    setDialogMode('create');
    setFormData(emptyFormData);
    setCreatedLicense(null);
    setEditingLicenseId(null);
    setDialogOpen(true);
  };

  const openEditDialog = (license: License) => {
    setDialogMode('edit');
    setEditingLicenseId(license.id);
    setFormData({
      email: license.email,
      planType: (license.plan_type as PlanType) || 'start',
      firstName: license.first_name || '',
      lastName: license.last_name || '',
      companyName: license.company_name || '',
      siren: license.siren || '',
      address: license.address || '',
      city: license.city || '',
      postalCode: license.postal_code || '',
      assignToCompanyId: null,
      userRole: 'member',
    });
    setCreatedLicense(null);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.email) {
      toast.error('Email requis');
      return;
    }
    setSaving(true);
    try {
      // If assigning to existing company, the backend handles adding as company_user
      const action = dialogMode === 'create' ? 'create-license' : 'update-license';
      const { data, error } = await supabase.functions.invoke('validate-license', {
        body: { 
          action,
          adminToken: getAdminToken(),
          licenseId: editingLicenseId,
          email: formData.email,
          planType: formData.planType,
          firstName: formData.firstName,
          lastName: formData.lastName,
          companyName: formData.companyName,
          siren: formData.siren,
          address: formData.address,
          city: formData.city,
          postalCode: formData.postalCode,
          assignToCompanyId: formData.assignToCompanyId,
          userRole: formData.userRole,
        },
      });
      if (error) throw error;
      
      // Check if user was added to existing company
      if (dialogMode === 'create' && data?.assignedToCompany) {
        toast.success(`Utilisateur ${formData.email} ajouté à la société`);
        setDialogOpen(false);
        fetchLicenses();
      } else if (dialogMode === 'create' && data?.license_code) {
        setCreatedLicense({ code: data.license_code, email: formData.email });
        fetchLicenses();
      } else if (dialogMode === 'edit') {
        setDialogOpen(false);
        toast.success('Licence mise à jour');
        fetchLicenses();
      }
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const resetDialog = () => {
    setDialogOpen(false);
    setCreatedLicense(null);
    setFormData(emptyFormData);
    setEditingLicenseId(null);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copié !');
  };

  const loginAsUser = async (license: License) => {
    try {
      localStorage.setItem('optiflow_license', JSON.stringify({
        code: license.license_code,
        email: license.email,
        validatedAt: new Date().toISOString(),
        planType: license.plan_type || 'start',
        firstName: license.first_name,
        lastName: license.last_name,
        companyName: license.company_name,
        siren: license.siren,
        address: license.address,
        city: license.city,
        postalCode: license.postal_code,
        maxDrivers: license.max_drivers,
        maxClients: license.max_clients,
        maxDailyCharges: license.max_daily_charges,
        maxMonthlyCharges: license.max_monthly_charges,
        maxYearlyCharges: license.max_yearly_charges,
        customFeatures: license.features,
      }));
      toast.success(`Connexion en tant que ${license.email}`);
      navigate('/');
    } catch (error) {
      toast.error('Erreur de connexion');
    }
  };

  // Filters
  const filteredLicenses = licenses.filter(license => {
    const matchesSearch = 
      license.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      license.license_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (license.company_name || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'active' && license.is_active) || 
      (filterStatus === 'inactive' && !license.is_active);
    const matchesPlan = filterPlan === 'all' || license.plan_type === filterPlan;
    return matchesSearch && matchesStatus && matchesPlan;
  });

  // Stats
  const stats = {
    total: licenses.length,
    active: licenses.filter(l => l.is_active).length,
    start: licenses.filter(l => l.plan_type === 'start').length,
    pro: licenses.filter(l => l.plan_type === 'pro').length,
    enterprise: licenses.filter(l => l.plan_type === 'enterprise').length,
  };

  const getPlanIcon = (plan: string | null) => {
    switch (plan) {
      case 'enterprise': return <Crown className="w-4 h-4 text-amber-500" />;
      case 'pro': return <Star className="w-4 h-4 text-blue-500" />;
      default: return <Sparkles className="w-4 h-4 text-emerald-500" />;
    }
  };

  const getPlanBadgeClass = (plan: string | null) => {
    switch (plan) {
      case 'enterprise': return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
      case 'pro': return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      default: return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Admin login
  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Shield className="w-8 h-8 text-primary" />
            </div>
            <CardTitle>Administration</CardTitle>
            <CardDescription>Entrez le code secret pour accéder</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="admin-code">Code secret</Label>
              <Input
                id="admin-code"
                type="password"
                placeholder="••••••••"
                value={adminCode}
                disabled={adminLoginLoading}
                onChange={(e) => setAdminCode(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAdminLogin()}
              />
            </div>
            {adminLoginError && (
              <p className="text-sm text-destructive">{adminLoginError}</p>
            )}
            <Button className="w-full" onClick={handleAdminLogin} disabled={adminLoginLoading || !adminCode.trim()}>
              {adminLoginLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Accéder
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => navigate('/')}>
              Retour
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-card flex flex-col">
        <div className="p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="font-semibold">Admin</h1>
              <p className="text-xs text-muted-foreground">Panneau de contrôle</p>
            </div>
          </div>
        </div>
        
        <ScrollArea className="flex-1 p-3">
          <nav className="space-y-1">
            {ADMIN_NAV.map((item) => (
              <button
                key={item.id}
                onClick={() => setAdminActiveTab(item.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors",
                  adminActiveTab === item.id 
                    ? "bg-primary text-primary-foreground" 
                    : "hover:bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                <item.icon className="w-4 h-4" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.label}</p>
                </div>
              </button>
            ))}
          </nav>
        </ScrollArea>

        <div className="p-3 border-t">
          <Button
            variant="ghost"
            className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={() => {
              setIsAdminAuthenticated(false);
              localStorage.removeItem(ADMIN_AUTH_STORAGE_KEY);
              localStorage.removeItem(ADMIN_TOKEN_STORAGE_KEY);
              toast.success('Déconnexion réussie');
              navigate('/');
            }}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Déconnexion
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="p-6 max-w-7xl mx-auto space-y-6">
          
          {/* Licenses Tab */}
          {adminActiveTab === 'licenses' && (
            <>
              {/* Stats */}
              <div className="grid grid-cols-5 gap-4">
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-2xl font-bold">{stats.total}</div>
                    <p className="text-xs text-muted-foreground">Total licences</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-2xl font-bold text-green-600">{stats.active}</div>
                    <p className="text-xs text-muted-foreground">Actives</p>
                  </CardContent>
                </Card>
                <Card className="border-emerald-500/20">
                  <CardContent className="pt-4 flex items-center gap-3">
                    <Sparkles className="w-5 h-5 text-emerald-500" />
                    <div>
                      <div className="text-xl font-bold">{stats.start}</div>
                      <p className="text-xs text-muted-foreground">Start</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-blue-500/20">
                  <CardContent className="pt-4 flex items-center gap-3">
                    <Star className="w-5 h-5 text-blue-500" />
                    <div>
                      <div className="text-xl font-bold">{stats.pro}</div>
                      <p className="text-xs text-muted-foreground">Pro</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-amber-500/20">
                  <CardContent className="pt-4 flex items-center gap-3">
                    <Crown className="w-5 h-5 text-amber-500" />
                    <div>
                      <div className="text-xl font-bold">{stats.enterprise}</div>
                      <p className="text-xs text-muted-foreground">Enterprise</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Filters & Actions */}
              <div className="flex items-center gap-3">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as any)}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous</SelectItem>
                    <SelectItem value="active">Actifs</SelectItem>
                    <SelectItem value="inactive">Inactifs</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterPlan} onValueChange={(v) => setFilterPlan(v as any)}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous</SelectItem>
                    <SelectItem value="start">Start</SelectItem>
                    <SelectItem value="pro">Pro</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="icon" onClick={fetchLicenses} disabled={loading}>
                  <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
                </Button>
                <Button onClick={openCreateDialog}>
                  <Plus className="w-4 h-4 mr-2" />
                  Nouvelle licence
                </Button>
              </div>

              {/* Table */}
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Licence</TableHead>
                      <TableHead>Société</TableHead>
                      <TableHead>Forfait</TableHead>
                      <TableHead>Utilisateurs</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                        </TableCell>
                      </TableRow>
                    ) : filteredLicenses.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          Aucune licence trouvée
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredLicenses.map((license) => (
                        <TableRow key={license.id}>
                          <TableCell>
                            <div>
                              <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{license.license_code}</code>
                              <p className="text-xs text-muted-foreground mt-1">{license.email}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <p className="font-medium">{license.company_name || '-'}</p>
                            {license.city && <p className="text-xs text-muted-foreground">{license.city}</p>}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={cn("gap-1", getPlanBadgeClass(license.plan_type))}>
                              {getPlanIcon(license.plan_type)}
                              {(license.plan_type || 'start').toUpperCase()}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">
                              {companyUserCounts[license.id] || 0}/{license.max_users || '∞'}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge variant={license.is_active ? "default" : "secondary"}>
                              {license.is_active ? 'Actif' : 'Inactif'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setSelectedLicenseForDetail(license); setUserDetailOpen(true); }}>
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => loginAsUser(license)}>
                                <LogIn className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openLimitsEditor(license)}>
                                <Settings className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(license)}>
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleLicenseStatus(license.id, license.is_active)}>
                                {license.is_active ? <XCircle className="w-4 h-4 text-orange-500" /> : <CheckCircle className="w-4 h-4 text-green-500" />}
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Supprimer la licence ?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Cette action est irréversible. La licence <strong>{license.license_code}</strong> sera supprimée.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => deleteLicense(license.id)} className="bg-destructive text-destructive-foreground">
                                      Supprimer
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </Card>
            </>
          )}

          {/* Companies Tab */}
          {adminActiveTab === 'companies' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-semibold">Gestion des Sociétés</h2>
                  <p className="text-sm text-muted-foreground">Créez et gérez les sociétés et leurs utilisateurs</p>
                </div>
                <Button onClick={() => setCreateCompanyOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Créer une société
                </Button>
              </div>
              <CompanyDetailPanel getAdminToken={getAdminToken} />
              <CompanyUsersManager getAdminToken={getAdminToken} />
              <CreateCompanyDialog 
                open={createCompanyOpen}
                onOpenChange={setCreateCompanyOpen}
                getAdminToken={getAdminToken}
                onCompanyCreated={fetchLicenses}
              />
            </div>
          )}

          {/* Merge Tab */}
          {adminActiveTab === 'merge' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold">Fusion / Déduplication</h2>
                <p className="text-sm text-muted-foreground">Détectez et fusionnez les sociétés en double (même SIREN)</p>
              </div>
              <CompanyMergeManager getAdminToken={getAdminToken} />
            </div>
          )}

          {/* Access Tab */}
          {adminActiveTab === 'access' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold">Gestion des Accès</h2>
                <p className="text-sm text-muted-foreground">Activez ou désactivez des fonctionnalités pour chaque utilisateur</p>
              </div>
              <UserFeatureOverrides getAdminToken={getAdminToken} />
            </div>
          )}

          {/* Features Tab */}
          {adminActiveTab === 'features' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold">Fonctionnalités par licence</h2>
                <p className="text-sm text-muted-foreground">Personnalisez les fonctionnalités disponibles pour chaque licence</p>
              </div>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Sélectionner une licence</CardTitle>
                </CardHeader>
                <CardContent>
                  <Select 
                    value={selectedLicenseForFeatures?.id || ''} 
                    onValueChange={(id) => setSelectedLicenseForFeatures(licenses.find(l => l.id === id) || null)}
                  >
                    <SelectTrigger className="max-w-md">
                      <SelectValue placeholder="Choisir une licence..." />
                    </SelectTrigger>
                    <SelectContent>
                      {licenses.map(license => (
                        <SelectItem key={license.id} value={license.id}>
                          <div className="flex items-center gap-2">
                            {getPlanIcon(license.plan_type)}
                            <span>{license.company_name || license.email}</span>
                            <Badge variant="outline" className="ml-2 text-xs">
                              {(license.plan_type || 'start').toUpperCase()}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>

              {selectedLicenseForFeatures ? (
                <FeatureEditor
                  planType={(selectedLicenseForFeatures.plan_type as 'start' | 'pro' | 'enterprise') || 'start'}
                  currentFeatures={selectedLicenseForFeatures.features || null}
                  onSave={handleSaveFeatures}
                  saving={savingFeatures}
                />
              ) : (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Settings2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Sélectionnez une licence pour personnaliser ses fonctionnalités</p>
                  </CardContent>
                </Card>
              )}

              <SchemaSyncManager adminToken={getAdminToken() || undefined} />
            </div>
          )}

          {/* Requests Tab */}
          {adminActiveTab === 'requests' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold">Demandes d'accès</h2>
                <p className="text-sm text-muted-foreground">Gérez les demandes d'accès des utilisateurs</p>
              </div>
              <AccessRequestsManager getAdminToken={getAdminToken} />
            </div>
          )}

          {/* Data Tab */}
          {adminActiveTab === 'data' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold">Statistiques des Données</h2>
                <p className="text-sm text-muted-foreground">Visualisez les données de chaque société</p>
              </div>
              <CompanyDataStats getAdminToken={getAdminToken} />
            </div>
          )}

          {/* Updates Tab */}
          {adminActiveTab === 'updates' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold">Mises à jour PWA</h2>
                <p className="text-sm text-muted-foreground">Gérez les versions et mises à jour de l'application</p>
              </div>
              <PWAUpdatesManager />
            </div>
          )}

          {/* Demo Tab */}
          {adminActiveTab === 'demo' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold">Mode Démonstration</h2>
                <p className="text-sm text-muted-foreground">Activez une session de démo pour vos présentations</p>
              </div>

              {isDemoActive && getCurrentSession() && (
                <Card className="border-amber-500/30 bg-amber-500/5">
                  <CardContent className="flex items-center justify-between py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-amber-500 animate-pulse" />
                      <div>
                        <p className="font-medium">Mode démo actif : {getCurrentSession()?.name}</p>
                        <p className="text-sm text-muted-foreground">{getCurrentSession()?.description}</p>
                      </div>
                    </div>
                    <Button variant="outline" onClick={() => { deactivateDemo(); navigate('/'); }}>
                      <StopCircle className="w-4 h-4 mr-2" />
                      Quitter
                    </Button>
                  </CardContent>
                </Card>
              )}

              <div className="grid gap-4 md:grid-cols-3">
                {availableSessions.map((session) => (
                  <Card key={session.id} className={cn(
                    "transition-all",
                    currentSessionId === session.id && "ring-2 ring-amber-500"
                  )}>
                    <CardHeader>
                      <div className="flex items-center gap-2">
                        {session.planType === 'enterprise' && <Crown className="w-5 h-5 text-amber-500" />}
                        {session.planType === 'pro' && <Star className="w-5 h-5 text-blue-500" />}
                        {session.planType === 'start' && <Sparkles className="w-5 h-5 text-emerald-500" />}
                        <CardTitle className="text-base">{session.name}</CardTitle>
                      </div>
                      <CardDescription>{session.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-1 text-xs text-muted-foreground mb-4">
                        <p>• {session.drivers.length} conducteur(s)</p>
                        <p>• {session.clients.length} client(s)</p>
                        <p>• {session.trips.length} trajet(s)</p>
                      </div>
                      <Button
                        className="w-full"
                        variant={currentSessionId === session.id ? "outline" : "default"}
                        onClick={() => {
                          if (currentSessionId === session.id) {
                            deactivateDemo();
                          } else {
                            activateDemo(session.planType);
                            navigate('/');
                          }
                        }}
                      >
                        {currentSessionId === session.id ? 'Désactiver' : 'Activer'}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Dialogs */}
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
                    <div className="space-y-2">
                      <Label>Forfait</Label>
                      <Select value={formData.planType} onValueChange={(v: PlanType) => setFormData(prev => ({ ...prev, planType: v }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="start">Start</SelectItem>
                          <SelectItem value="pro">Pro</SelectItem>
                          <SelectItem value="enterprise">Enterprise</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
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

      {/* Limits Dialog */}
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

      {/* User Detail Dialog */}
      <UserDetailDialog
        license={selectedLicenseForDetail}
        open={userDetailOpen}
        onOpenChange={setUserDetailOpen}
        adminToken={getAdminToken() || ''}
        onUpdate={async () => {
          await fetchLicenses();
          // Update the selected license with fresh data from the updated licenses list
          if (selectedLicenseForDetail) {
            const token = getAdminToken();
            if (token) {
              const { data } = await supabase.functions.invoke('validate-license', {
                body: { action: 'list-all', adminToken: token },
              });
              if (data?.licenses) {
                const updatedLicense = data.licenses.find((l: License) => l.id === selectedLicenseForDetail.id);
                if (updatedLicense) {
                  setSelectedLicenseForDetail(updatedLicense);
                }
              }
            }
          }
        }}
      />
    </div>
  );
}
