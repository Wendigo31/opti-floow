import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Loader2
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FeatureEditor } from '@/components/admin/FeatureEditor';
import { PWAUpdatesManager } from '@/components/admin/PWAUpdatesManager';
import { UserDetailDialog } from '@/components/admin/UserDetailDialog';
import { SchemaSyncManager } from '@/components/admin/SchemaSyncManager';
import { CompanyUsersManager } from '@/components/admin/CompanyUsersManager';
import { CompanyDataStats } from '@/components/admin/CompanyDataStats';
import { CreateCompanyDialog } from '@/components/admin/CreateCompanyDialog';
import type { LicenseFeatures } from '@/types/features';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
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

// Admin authentication is validated server-side via the admin-auth backend function.
// (Do not store the secret in the frontend bundle.)
const ADMIN_AUTH_FUNCTION = 'admin-auth';

// Persist admin session locally (JWT token) to avoid re-login on refresh.
// Keep this short-lived.
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
  assignToCompanyId: string | null; // ID of an existing company/license to assign this user to
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

export default function Admin() {
  const navigate = useNavigate();
  const { isLicensed, isLoading, licenseData } = useLicense();
  const { isActive: isDemoActive, currentSessionId, availableSessions, activateDemo, deactivateDemo, getCurrentSession } = useDemoMode();
  const [licenses, setLicenses] = useState<License[]>([]);
  const [companyUserCounts, setCompanyUserCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [filterPlan, setFilterPlan] = useState<'all' | PlanType>('all');
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [editingPlan, setEditingPlan] = useState<PlanType>('start');
  
  // Create/Edit license dialog
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [createdLicense, setCreatedLicense] = useState<{ code: string; email: string } | null>(null);
  const [editingLicenseId, setEditingLicenseId] = useState<string | null>(null);
  const [formData, setFormData] = useState<LicenseFormData>(emptyFormData);

  // Admin login state (code secret seulement)
  const [adminCode, setAdminCode] = useState('');
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [adminLoginError, setAdminLoginError] = useState('');
  const [adminLoginLoading, setAdminLoginLoading] = useState(false);

  // Restore prior admin session (short-lived) so the UI doesn't "bounce" back to login on refresh.
  // IMPORTANT: we require BOTH the session marker and the JWT token.
  useEffect(() => {
    try {
      const rawSession = localStorage.getItem(ADMIN_AUTH_STORAGE_KEY);
      const token = localStorage.getItem(ADMIN_TOKEN_STORAGE_KEY);

      // If one is missing, clear both to avoid a "half-authenticated" state (token=null => 403).
      if (!rawSession || !token) {
        localStorage.removeItem(ADMIN_AUTH_STORAGE_KEY);
        localStorage.removeItem(ADMIN_TOKEN_STORAGE_KEY);
        return;
      }

      const parsed = JSON.parse(rawSession) as { expiresAt?: number };
      if (parsed?.expiresAt && Date.now() < parsed.expiresAt) {
        setIsAdminAuthenticated(true);
      } else {
        localStorage.removeItem(ADMIN_AUTH_STORAGE_KEY);
        localStorage.removeItem(ADMIN_TOKEN_STORAGE_KEY);
      }
    } catch {
      localStorage.removeItem(ADMIN_AUTH_STORAGE_KEY);
      localStorage.removeItem(ADMIN_TOKEN_STORAGE_KEY);
    }
  }, []);
  
  // Editing limits
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
  const [adminActiveTab, setAdminActiveTab] = useState<'licenses' | 'companies' | 'data' | 'features' | 'updates' | 'demo'>('licenses');

  // User detail dialog
  const [selectedLicenseForDetail, setSelectedLicenseForDetail] = useState<License | null>(null);
  const [userDetailOpen, setUserDetailOpen] = useState(false);

  // Create company dialog
  const [createCompanyOpen, setCreateCompanyOpen] = useState(false);

  // SIRENE lookup
  const { lookup: sireneLookup, loading: sireneLoading, error: sireneError } = useSireneLookup();

  // L'utilisateur est admin via code secret
  const isAdmin = isAdminAuthenticated;

  const handleAdminLogin = async () => {
    if (!adminCode.trim() || adminLoginLoading) return;

    setAdminLoginError('');
    setAdminLoginLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke(ADMIN_AUTH_FUNCTION, {
        body: { code: adminCode },
      });

      // supabase-js surfaces non-2xx as `error` (and sometimes throws).
      // Make sure we surface the server error message instead of a generic 401 message.
      if (error) {
        try {
          const resp = (error as any)?.context?.response;
          if (resp && typeof resp.json === 'function') {
            const body = await resp.json().catch(() => null);
            setAdminLoginError(body?.error || 'Code secret incorrect');
            return;
          }
        } catch {
          // ignore parsing issues
        }

        setAdminLoginError('Code secret incorrect');
        return;
      }

      if (data?.ok && data?.token) {
        setIsAdminAuthenticated(true);
        // Store JWT token and expiry
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
      console.error('Admin login error:', error);
      if (error?.message?.includes('Failed to fetch') || error?.message?.includes('NetworkError')) {
        setAdminLoginError("Impossible de joindre le serveur. Vérifiez votre connexion internet.");
      } else {
        // If we still get a FunctionsHttpError, show a friendly message.
        setAdminLoginError('Code secret incorrect');
      }
    } finally {
      setAdminLoginLoading(false);
    }
  };

  // Get admin token for API calls
  const getAdminToken = (): string | null => {
    return localStorage.getItem(ADMIN_TOKEN_STORAGE_KEY);
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
          maxDrivers: limitsForm.maxDrivers,
          maxClients: limitsForm.maxClients,
          maxDailyCharges: limitsForm.maxDailyCharges,
          maxMonthlyCharges: limitsForm.maxMonthlyCharges,
          maxYearlyCharges: limitsForm.maxYearlyCharges,
          maxUsers: limitsForm.maxUsers,
        },
      });

      if (error) throw error;
      
      setLicenses(prev => 
        prev.map(l => l.id === editingLimitsId ? { 
          ...l, 
          max_drivers: limitsForm.maxDrivers,
          max_clients: limitsForm.maxClients,
          max_daily_charges: limitsForm.maxDailyCharges,
          max_monthly_charges: limitsForm.maxMonthlyCharges,
          max_yearly_charges: limitsForm.maxYearlyCharges,
          max_users: limitsForm.maxUsers,
        } : l)
      );
      setEditingLimitsId(null);
      toast.success('Limites mises à jour');
    } catch (error) {
      console.error('Error updating limits:', error);
      toast.error('Erreur lors de la mise à jour des limites');
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
      
      setLicenses(prev => 
        prev.map(l => l.id === selectedLicenseForFeatures.id ? { 
          ...l, 
          features: features as Partial<LicenseFeatures>,
        } : l)
      );
      toast.success('Fonctionnalités mises à jour');
    } catch (error) {
      console.error('Error updating features:', error);
      toast.error('Erreur lors de la mise à jour des fonctionnalités');
    } finally {
      setSavingFeatures(false);
    }
  };

  useEffect(() => {
    // Attendre que le chargement soit terminé
    if (isLoading) return;

    // Si déjà admin (via licence ou login) ET qu'on a un token valide, charger les données
    if (isAdmin && getAdminToken()) {
      fetchLicenses();
    }
  }, [isLicensed, isLoading, isAdmin]);

  const handleAuthError = () => {
    // Clear admin session and force re-login
    localStorage.removeItem(ADMIN_AUTH_STORAGE_KEY);
    localStorage.removeItem(ADMIN_TOKEN_STORAGE_KEY);
    setIsAdminAuthenticated(false);
    toast.error('Session expirée. Veuillez vous reconnecter.');
  };

  const fetchLicenses = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('validate-license', {
        body: { action: 'list-all', adminToken: getAdminToken() },
      });

      // Check for 403 auth error in data response
      if (data?.error === 'Accès non autorisé' || data?.success === false) {
        handleAuthError();
        return;
      }

      if (error) throw error;
      if (data?.licenses) {
        setLicenses(data.licenses);
        
        // Fetch user counts for each company
        const licenseIds = data.licenses.map((l: License) => l.id);
        if (licenseIds.length > 0) {
          const { data: usersData } = await supabase
            .from('company_users')
            .select('license_id')
            .in('license_id', licenseIds);
          
          // Count users per license
          const counts: Record<string, number> = {};
          (usersData || []).forEach((u: { license_id: string }) => {
            counts[u.license_id] = (counts[u.license_id] || 0) + 1;
          });
          setCompanyUserCounts(counts);
        }
      }
    } catch (error: any) {
      console.error('Error fetching licenses:', error);
      // Check if it's a 403 error
      if (error?.status === 403 || error?.message?.includes('403')) {
        handleAuthError();
        return;
      }
      toast.error('Erreur lors du chargement des licences');
    } finally {
      setLoading(false);
    }
  };

  const toggleLicenseStatus = async (licenseId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase.functions.invoke('validate-license', {
        body: { 
          action: 'toggle-status', 
          licenseId, 
          isActive: !currentStatus,
          adminToken: getAdminToken() 
        },
      });

      if (error) throw error;
      
      setLicenses(prev => 
        prev.map(l => l.id === licenseId ? { ...l, is_active: !currentStatus } : l)
      );
      toast.success(`Licence ${!currentStatus ? 'activée' : 'désactivée'}`);
    } catch (error) {
      console.error('Error toggling license:', error);
      toast.error('Erreur lors de la modification');
    }
  };

  const updatePlanType = async (licenseId: string) => {
    try {
      const { error } = await supabase.functions.invoke('validate-license', {
        body: { 
          action: 'update-plan', 
          licenseId, 
          planType: editingPlan,
          adminToken: getAdminToken() 
        },
      });

      if (error) throw error;
      
      setLicenses(prev => 
        prev.map(l => l.id === licenseId ? { ...l, plan_type: editingPlan } : l)
      );
      setEditingPlanId(null);
      toast.success('Forfait mis à jour');
    } catch (error) {
      console.error('Error updating plan:', error);
      toast.error('Erreur lors de la mise à jour');
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
    setEditingLicenseId(license.id);
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
      if (dialogMode === 'create') {
        // If assigning to existing company, just add user to company_users
        if (formData.assignToCompanyId) {
          const selectedCompany = licenses.find(l => l.id === formData.assignToCompanyId);
          
          // Check max users limit
          const { data: existingUsers } = await supabase
            .from('company_users')
            .select('id')
            .eq('license_id', formData.assignToCompanyId);
          
          const currentCount = existingUsers?.length || 0;
          const maxUsers = selectedCompany?.max_users || 999;
          
          if (currentCount >= maxUsers) {
            toast.error(`Cette société est limitée à ${maxUsers} utilisateur(s)`);
            setSaving(false);
            return;
          }

          // Add user to company_users
          const { error: userError } = await supabase
            .from('company_users')
            .insert({
              license_id: formData.assignToCompanyId,
              user_id: crypto.randomUUID(),
              email: formData.email.toLowerCase().trim(),
              role: formData.userRole,
              display_name: formData.firstName && formData.lastName 
                ? `${formData.firstName} ${formData.lastName}`.trim() 
                : formData.firstName || formData.lastName || null,
              is_active: true,
              accepted_at: new Date().toISOString(),
            });

          if (userError) throw userError;

          toast.success(`Utilisateur ajouté à ${selectedCompany?.company_name || 'la société'}`);
          setDialogOpen(false);
          setFormData(emptyFormData);
        } else {
          // Create new license (standalone)
          const { data, error } = await supabase.functions.invoke('validate-license', {
            body: { 
              action: 'create-license',
              adminToken: getAdminToken(),
              email: formData.email,
              planType: formData.planType,
              firstName: formData.firstName || null,
              lastName: formData.lastName || null,
              companyName: formData.companyName || null,
              siren: formData.siren || null,
              address: formData.address || null,
              city: formData.city || null,
              postalCode: formData.postalCode || null,
            },
          });

          if (error) throw error;
          
          if (data?.success) {
            setCreatedLicense({
              code: data.licenseCode,
              email: formData.email,
            });
            toast.success('Licence créée avec succès');
            fetchLicenses();
          } else {
            throw new Error(data?.error || 'Erreur lors de la création');
          }
        }
      } else {
        // Edit existing license
        const { error } = await supabase.functions.invoke('validate-license', {
          body: { 
            action: 'update-license',
            adminToken: getAdminToken(),
            licenseId: editingLicenseId,
            email: formData.email,
            planType: formData.planType,
            firstName: formData.firstName || null,
            lastName: formData.lastName || null,
            companyName: formData.companyName || null,
            siren: formData.siren || null,
            address: formData.address || null,
            city: formData.city || null,
            postalCode: formData.postalCode || null,
          },
        });

        if (error) throw error;
        
        toast.success('Licence mise à jour');
        fetchLicenses();
        setDialogOpen(false);
      }
    } catch (error: any) {
      console.error('Error saving license:', error);
      toast.error(error.message || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copié dans le presse-papier');
  };

  const deleteLicense = async (licenseId: string) => {
    try {
      const { error } = await supabase.functions.invoke('validate-license', {
        body: { 
          action: 'delete-license', 
          licenseId,
          adminToken: getAdminToken() 
        },
      });

      if (error) throw error;
      
      setLicenses(prev => prev.filter(l => l.id !== licenseId));
      toast.success('Licence supprimée définitivement');
    } catch (error) {
      console.error('Error deleting license:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  // Login as user (impersonation from admin)
  const loginAsUser = async (license: License) => {
    if (!license.is_active) {
      toast.error('Impossible de se connecter : licence inactive');
      return;
    }
    
    try {
      // Normalize email and license code to match server-side validation
      const normalizedEmail = license.email.trim().toLowerCase();
      const normalizedCode = license.license_code.trim().toUpperCase();
      
      // We directly set the license data in localStorage to impersonate
      const licenseDataToStore = {
        code: normalizedCode,
        email: normalizedEmail,
        activatedAt: license.activated_at || new Date().toISOString(),
        planType: (license.plan_type as PlanType) || 'start',
        firstName: license.first_name || undefined,
        lastName: license.last_name || undefined,
        companyName: license.company_name || undefined,
        siren: license.siren || undefined,
        address: license.address || undefined,
        city: license.city || undefined,
        postalCode: license.postal_code || undefined,
        maxDrivers: license.max_drivers ?? null,
        maxClients: license.max_clients ?? null,
        maxDailyCharges: license.max_daily_charges ?? null,
        maxMonthlyCharges: license.max_monthly_charges ?? null,
        maxYearlyCharges: license.max_yearly_charges ?? null,
        customFeatures: license.features || null,
      };
      
      localStorage.setItem('optiflow-license', JSON.stringify(licenseDataToStore));
      
      // Also update the cache for offline support
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      const newCache = {
        data: licenseDataToStore,
        lastValidated: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
      };
      localStorage.setItem('optiflow-license-cache', JSON.stringify(newCache));
      
      toast.success(`Connecté en tant que ${normalizedEmail}`);
      
      // Navigate to home and refresh to apply the new license
      navigate('/');
      window.location.reload();
    } catch (error) {
      console.error('Error logging in as user:', error);
      toast.error('Erreur lors de la connexion');
    }
  };

  const resetDialog = () => {
    setFormData(emptyFormData);
    setCreatedLicense(null);
    setEditingLicenseId(null);
    setDialogOpen(false);
  };

  const filteredLicenses = licenses.filter(license => {
    const matchesSearch = 
      license.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      license.license_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      license.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      license.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      license.last_name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = 
      filterStatus === 'all' || 
      (filterStatus === 'active' && license.is_active) ||
      (filterStatus === 'inactive' && !license.is_active);

    const matchesPlan = 
      filterPlan === 'all' || 
      license.plan_type === filterPlan;

    return matchesSearch && matchesStatus && matchesPlan;
  });

  const stats = {
    total: licenses.length,
    active: licenses.filter(l => l.is_active).length,
    start: licenses.filter(l => l.plan_type === 'start').length,
    pro: licenses.filter(l => l.plan_type === 'pro').length,
    enterprise: licenses.filter(l => l.plan_type === 'enterprise').length,
  };

  const getPlanIcon = (plan: string | null) => {
    switch (plan) {
      case 'enterprise': return <Crown className="w-4 h-4" />;
      case 'pro': return <Star className="w-4 h-4" />;
      default: return <Sparkles className="w-4 h-4" />;
    }
  };

  const getPlanBadgeVariant = (plan: string | null) => {
    switch (plan) {
      case 'enterprise': return 'default';
      case 'pro': return 'secondary';
      default: return 'outline';
    }
  };

  // Afficher un écran de chargement pendant la vérification
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Formulaire de connexion admin si pas authentifié
  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-full max-w-md space-y-6 p-8 bg-card border border-border rounded-xl shadow-lg">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 mx-auto rounded-xl bg-primary/20 flex items-center justify-center">
              <Shield className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Administration</h1>
            <p className="text-muted-foreground">Entrez le code secret pour accéder</p>
          </div>
          
          <div className="space-y-4">
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

            <Button
              className="w-full"
              onClick={handleAdminLogin}
              disabled={adminLoginLoading || !adminCode.trim()}
            >
              {adminLoginLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Vérification...
                </>
              ) : (
                'Accéder'
              )}
            </Button>
            
            <Button 
              variant="outline"
              className="w-full" 
              onClick={() => navigate('/')}
            >
              <X className="w-4 h-4 mr-2" />
              Retour à l'application
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
            <Shield className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Administration</h1>
            <p className="text-muted-foreground">Gestion complète des licences et fonctionnalités</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={() => {
              setIsAdminAuthenticated(false);
              setAdminCode('');
              localStorage.removeItem(ADMIN_AUTH_STORAGE_KEY);
              localStorage.removeItem(ADMIN_TOKEN_STORAGE_KEY);
              toast.success('Déconnexion admin réussie');
              navigate('/');
            }}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Déconnexion
          </Button>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs value={adminActiveTab} onValueChange={(v) => setAdminActiveTab(v as 'licenses' | 'companies' | 'data' | 'features' | 'updates' | 'demo')}>
        <TabsList className="grid w-full max-w-4xl grid-cols-6">
          <TabsTrigger value="licenses" className="gap-2">
            <Users className="w-4 h-4" />
            Licences
          </TabsTrigger>
          <TabsTrigger value="companies" className="gap-2">
            <Building2 className="w-4 h-4" />
            Sociétés
          </TabsTrigger>
          <TabsTrigger value="data" className="gap-2">
            <FileText className="w-4 h-4" />
            Données
          </TabsTrigger>
          <TabsTrigger value="features" className="gap-2">
            <Settings2 className="w-4 h-4" />
            Fonctionnalités
          </TabsTrigger>
          <TabsTrigger value="updates" className="gap-2">
            <Bell className="w-4 h-4" />
            Mises à jour
          </TabsTrigger>
          <TabsTrigger value="demo" className="gap-2">
            <PlayCircle className="w-4 h-4" />
            Démo
          </TabsTrigger>
        </TabsList>

        {/* Companies Tab */}
        <TabsContent value="companies" className="space-y-6 mt-6">
          <div className="flex justify-end mb-4">
            <Button onClick={() => setCreateCompanyOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Créer une société
            </Button>
          </div>
          <CompanyUsersManager getAdminToken={getAdminToken} />
          <CreateCompanyDialog 
            open={createCompanyOpen}
            onOpenChange={setCreateCompanyOpen}
            getAdminToken={getAdminToken}
            onCompanyCreated={fetchLicenses}
          />
        </TabsContent>

        {/* Data Tab - view company data */}
        <TabsContent value="data" className="space-y-6 mt-6">
          <CompanyDataStats getAdminToken={getAdminToken} />
        </TabsContent>

        {/* Licenses Tab */}
        <TabsContent value="licenses" className="space-y-6 mt-6">
          {/* Actions */}
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <Button variant="outline" onClick={fetchLicenses} disabled={loading}>
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Actualiser
              </Button>
            </div>
            <Dialog open={dialogOpen} onOpenChange={(open) => {
              if (!open) resetDialog();
              else if (!dialogOpen) openCreateDialog();
            }}>
              <DialogTrigger asChild>
                <Button onClick={openCreateDialog}>
                  <Plus className="w-4 h-4 mr-2" />
                  Nouvelle licence
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                {createdLicense ? (
                  <>
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2 text-green-600">
                        <CheckCircle className="w-5 h-5" />
                        Licence créée avec succès
                      </DialogTitle>
                      <DialogDescription>
                        Voici les informations de la nouvelle licence
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg space-y-3">
                        <div>
                          <Label className="text-sm text-muted-foreground">Code de licence</Label>
                          <div className="flex items-center gap-2 mt-1">
                            <code className="flex-1 text-lg font-mono bg-background px-3 py-2 rounded border">
                              {createdLicense.code}
                            </code>
                            <Button 
                              size="icon" 
                              variant="outline"
                              onClick={() => copyToClipboard(createdLicense.code)}
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        <div>
                          <Label className="text-sm text-muted-foreground">Email associé</Label>
                          <div className="flex items-center gap-2 mt-1">
                            <code className="flex-1 text-sm font-mono bg-background px-3 py-2 rounded border">
                              {createdLicense.email}
                            </code>
                            <Button 
                              size="icon" 
                              variant="outline"
                              onClick={() => copyToClipboard(createdLicense.email)}
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        L'utilisateur pourra activer son compte avec ce code et cet email.
                      </p>
                    </div>
                    <DialogFooter>
                      <Button onClick={resetDialog}>
                        Fermer
                      </Button>
                    </DialogFooter>
                  </>
                ) : (
                  <>
                    <DialogHeader>
                      <DialogTitle>
                        {dialogMode === 'create' ? 'Créer une nouvelle licence' : 'Modifier la licence'}
                      </DialogTitle>
                      <DialogDescription>
                        {dialogMode === 'create' 
                          ? 'Un code de licence unique sera généré automatiquement' 
                          : 'Modifiez les informations de la licence'}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      {/* Assign to existing company (only in create mode) */}
                      {dialogMode === 'create' && (
                        <div className="p-3 rounded-lg border border-primary/30 bg-primary/5 space-y-3">
                          <div className="space-y-2">
                            <Label className="flex items-center gap-2 text-primary font-medium">
                              <Building2 className="w-4 h-4" />
                              Assigner à une société existante
                            </Label>
                            <Select 
                              value={formData.assignToCompanyId || 'none'} 
                              onValueChange={(v) => setFormData(prev => ({ 
                                ...prev, 
                                assignToCompanyId: v === 'none' ? null : v 
                              }))}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Créer une nouvelle licence" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">
                                  <div className="flex items-center gap-2">
                                    <Plus className="w-4 h-4" />
                                    Créer une nouvelle licence
                                  </div>
                                </SelectItem>
                                {licenses.filter(l => l.company_name).map(license => {
                                  const currentUsers = companyUserCounts[license.id] || 0;
                                  const maxUsers = license.max_users || 999;
                                  const isFull = currentUsers >= maxUsers && maxUsers !== 999;
                                  
                                  return (
                                    <SelectItem 
                                      key={license.id} 
                                      value={license.id}
                                      disabled={isFull}
                                    >
                                      <div className="flex items-center gap-2 w-full">
                                        <Building2 className="w-4 h-4 flex-shrink-0" />
                                        <span className="truncate">{license.company_name}</span>
                                        <Badge 
                                          variant={isFull ? "destructive" : "secondary"} 
                                          className="ml-auto text-xs flex-shrink-0"
                                        >
                                          {currentUsers}/{maxUsers === 999 ? '∞' : maxUsers}
                                        </Badge>
                                        <Badge variant="outline" className="text-xs flex-shrink-0">
                                          {license.plan_type?.toUpperCase()}
                                        </Badge>
                                      </div>
                                    </SelectItem>
                                  );
                                })}
                              </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">
                              Sélectionnez une société pour ajouter cet utilisateur comme membre
                            </p>
                          </div>
                          
                          {/* Role selector (only when assigning to company) */}
                          {formData.assignToCompanyId && (
                            <div className="space-y-2">
                              <Label>Rôle dans la société</Label>
                              <Select 
                                value={formData.userRole} 
                                onValueChange={(v: 'owner' | 'admin' | 'member') => setFormData(prev => ({ ...prev, userRole: v }))}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="member">Membre</SelectItem>
                                  <SelectItem value="admin">Administrateur</SelectItem>
                                  <SelectItem value="owner">Propriétaire</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Email */}
                      <div className="space-y-2">
                        <Label htmlFor="email">Email *</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            id="email"
                            type="email"
                            placeholder="utilisateur@exemple.com"
                            value={formData.email}
                            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                            className="pl-10"
                          />
                        </div>
                      </div>
                      
                      {/* Plan Type - hidden when assigning to company */}
                      {!formData.assignToCompanyId && (
                        <div className="space-y-2">
                          <Label htmlFor="planType">Forfait</Label>
                          <Select 
                            value={formData.planType} 
                            onValueChange={(v: PlanType) => setFormData(prev => ({ ...prev, planType: v }))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="start">
                                <div className="flex items-center gap-2">
                                  <Sparkles className="w-4 h-4" />
                                  Start
                                </div>
                              </SelectItem>
                              <SelectItem value="pro">
                                <div className="flex items-center gap-2">
                                  <Star className="w-4 h-4" />
                                  Pro
                                </div>
                              </SelectItem>
                              <SelectItem value="enterprise">
                                <div className="flex items-center gap-2">
                                  <Crown className="w-4 h-4" />
                                  Enterprise
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {/* Name */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="firstName">Prénom</Label>
                          <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                              id="firstName"
                              placeholder="Prénom"
                              value={formData.firstName}
                              onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                              className="pl-10"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="lastName">Nom</Label>
                          <Input
                            id="lastName"
                            placeholder="Nom"
                            value={formData.lastName}
                            onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                          />
                        </div>
                      </div>

                      {/* Company fields - hidden when assigning to existing company */}
                      {!formData.assignToCompanyId && (
                        <>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="companyName">Entreprise</Label>
                              <div className="relative">
                                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                  id="companyName"
                                  placeholder="Nom de l'entreprise"
                                  value={formData.companyName}
                                  onChange={(e) => setFormData(prev => ({ ...prev, companyName: e.target.value }))}
                                  className="pl-10"
                                />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="siren">SIREN / SIRET</Label>
                              <div className="flex gap-2">
                                <div className="relative flex-1">
                                  <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                  <Input
                                    id="siren"
                                    placeholder="123456789 ou 12345678901234"
                                    value={formData.siren}
                                    onChange={(e) => setFormData(prev => ({ ...prev, siren: e.target.value }))}
                                    className="pl-10"
                                  />
                                </div>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  disabled={sireneLoading || !formData.siren?.trim()}
                                  onClick={async () => {
                                    const company = await sireneLookup(formData.siren);
                                    if (company) {
                                      setFormData(prev => ({
                                        ...prev,
                                        companyName: company.companyName,
                                        address: company.address,
                                        city: company.city,
                                        postalCode: company.postalCode,
                                        siren: company.siren,
                                      }));
                                      toast.success(`Entreprise trouvée: ${company.companyName}`);
                                    }
                                  }}
                                >
                                  {sireneLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                                </Button>
                              </div>
                              {sireneError && <p className="text-xs text-destructive">{sireneError}</p>}
                            </div>
                          </div>

                          {/* Address */}
                          <div className="space-y-2">
                            <Label htmlFor="address">Adresse</Label>
                            <div className="relative">
                              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                              <Input
                                id="address"
                                placeholder="Adresse complète"
                                value={formData.address}
                                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                                className="pl-10"
                              />
                            </div>
                          </div>

                          {/* City & Postal Code */}
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="city">Ville</Label>
                              <Input
                                id="city"
                                placeholder="Ville"
                                value={formData.city}
                                onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="postalCode">Code postal</Label>
                              <Input
                                id="postalCode"
                                placeholder="31000"
                                value={formData.postalCode}
                                onChange={(e) => setFormData(prev => ({ ...prev, postalCode: e.target.value }))}
                              />
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setDialogOpen(false)}>
                        Annuler
                      </Button>
                      <Button variant="gradient" onClick={handleSave} disabled={saving || !formData.email}>
                        {saving ? (
                          <>
                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            {dialogMode === 'create' ? 'Création...' : 'Enregistrement...'}
                          </>
                        ) : (
                          <>
                            {dialogMode === 'create' ? (
                              <>
                                <Plus className="w-4 h-4 mr-2" />
                                Créer la licence
                              </>
                            ) : (
                              <>
                                <Save className="w-4 h-4 mr-2" />
                                Enregistrer
                              </>
                            )}
                          </>
                        )}
                      </Button>
                    </DialogFooter>
                  </>
                )}
              </DialogContent>
            </Dialog>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="glass-card p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Users className="w-4 h-4" />
                <span className="text-sm">Total</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{stats.total}</p>
            </div>
            <div className="glass-card p-4">
              <div className="flex items-center gap-2 text-green-500 mb-1">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm">Actives</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{stats.active}</p>
            </div>
            <div className="glass-card p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Sparkles className="w-4 h-4" />
                <span className="text-sm">Start</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{stats.start}</p>
            </div>
            <div className="glass-card p-4">
              <div className="flex items-center gap-2 text-primary mb-1">
                <Star className="w-4 h-4" />
                <span className="text-sm">Pro</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{stats.pro}</p>
            </div>
            <div className="glass-card p-4">
              <div className="flex items-center gap-2 text-amber-500 mb-1">
                <Crown className="w-4 h-4" />
                <span className="text-sm">Enterprise</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{stats.enterprise}</p>
            </div>
          </div>

          {/* Filters */}
          <div className="glass-card p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher par email, code, entreprise..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={filterStatus} onValueChange={(v: 'all' | 'active' | 'inactive') => setFilterStatus(v)}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="active">Actives</SelectItem>
                  <SelectItem value="inactive">Inactives</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterPlan} onValueChange={(v: 'all' | PlanType) => setFilterPlan(v)}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Forfait" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="start">Start</SelectItem>
                  <SelectItem value="pro">Pro</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

      {/* Licenses Table */}
      <div className="glass-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Utilisateur</TableHead>
              <TableHead>Code Licence</TableHead>
              <TableHead>Entreprise</TableHead>
              <TableHead>Forfait</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Dernière activité</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Chargement...
                </TableCell>
              </TableRow>
            ) : filteredLicenses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Aucune licence trouvée
                </TableCell>
              </TableRow>
            ) : (
              filteredLicenses.map((license) => (
                <TableRow key={license.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                        <Mail className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">
                          {license.first_name || license.last_name 
                            ? `${license.first_name || ''} ${license.last_name || ''}`.trim()
                            : 'Non renseigné'}
                        </p>
                        <p className="text-sm text-muted-foreground">{license.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                        {license.license_code}
                      </code>
                      {(license.license_code.startsWith('DEMO') || license.email.includes('demo')) && (
                        <Badge variant="outline" className="bg-violet-500/10 text-violet-600 border-violet-500/30 text-[10px] px-1.5 py-0">
                          DÉMO
                        </Badge>
                      )}
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-6 w-6"
                        onClick={() => copyToClipboard(license.license_code)}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">
                        {license.company_name || 'Non renseigné'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {editingPlanId === license.id ? (
                      <div className="flex items-center gap-2">
                        <Select value={editingPlan} onValueChange={(v: PlanType) => setEditingPlan(v)}>
                          <SelectTrigger className="w-[120px] h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="start">Start</SelectItem>
                            <SelectItem value="pro">Pro</SelectItem>
                            <SelectItem value="enterprise">Enterprise</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => updatePlanType(license.id)}>
                          <Save className="w-4 h-4 text-green-500" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingPlanId(null)}>
                          <X className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    ) : (
                      <Badge 
                        variant={getPlanBadgeVariant(license.plan_type)} 
                        className="gap-1 cursor-pointer hover:opacity-80"
                        onClick={() => {
                          setEditingPlanId(license.id);
                          setEditingPlan((license.plan_type as PlanType) || 'start');
                        }}
                      >
                        {getPlanIcon(license.plan_type)}
                        {license.plan_type?.toUpperCase() || 'START'}
                        <Edit className="w-3 h-3 ml-1" />
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {license.is_active ? (
                      <Badge variant="default" className="bg-green-500/20 text-green-500 border-green-500/30 gap-1">
                        <CheckCircle className="w-3 h-3" />
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="gap-1">
                        <XCircle className="w-3 h-3" />
                        Inactive
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      {license.last_used_at 
                        ? format(new Date(license.last_used_at), 'dd MMM yyyy', { locale: fr })
                        : 'Jamais'}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedLicenseForDetail(license);
                          setUserDetailOpen(true);
                        }}
                        title="Voir les détails et l'historique"
                      >
                        <User className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => loginAsUser(license)}
                        title="Se connecter en tant que cet utilisateur"
                        className="text-primary hover:text-primary"
                        disabled={!license.is_active}
                      >
                        <LogIn className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openLimitsEditor(license)}
                        title="Modifier les limites"
                      >
                        <Settings className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(license)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant={license.is_active ? 'destructive' : 'default'}
                        size="sm"
                        onClick={() => toggleLicenseStatus(license.id, license.is_active)}
                      >
                        {license.is_active ? 'Désactiver' : 'Activer'}
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Supprimer définitivement ?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Cette action est irréversible. La licence <strong>{license.license_code}</strong> sera 
                              définitivement supprimée de la base de données.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteLicense(license.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
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
      </div>
        </TabsContent>

        {/* Features Tab */}
        <TabsContent value="features" className="space-y-6 mt-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">Gestion des fonctionnalités par licence</h2>
                <p className="text-muted-foreground text-sm">
                  Sélectionnez une licence pour personnaliser ses fonctionnalités
                </p>
              </div>
            </div>

            {/* License Selection */}
            <div className="glass-card p-4">
              <Label className="text-sm font-medium mb-2 block">Sélectionner une licence</Label>
              <Select 
                value={selectedLicenseForFeatures?.id || ''} 
                onValueChange={(id) => {
                  const license = licenses.find(l => l.id === id);
                  setSelectedLicenseForFeatures(license || null);
                }}
              >
                <SelectTrigger className="w-full max-w-md">
                  <SelectValue placeholder="Choisir une licence..." />
                </SelectTrigger>
                <SelectContent>
                  {licenses.map(license => (
                    <SelectItem key={license.id} value={license.id}>
                      <div className="flex items-center gap-2">
                        {license.plan_type === 'enterprise' ? (
                          <Crown className="w-4 h-4 text-amber-500" />
                        ) : license.plan_type === 'pro' ? (
                          <Star className="w-4 h-4 text-orange-500" />
                        ) : (
                          <Sparkles className="w-4 h-4 text-blue-500" />
                        )}
                        <span>{license.email}</span>
                        {license.company_name && (
                          <span className="text-muted-foreground text-xs">({license.company_name})</span>
                        )}
                        <Badge variant="outline" className="ml-2">
                          {license.plan_type?.toUpperCase() || 'START'}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Feature Editor */}
            {selectedLicenseForFeatures ? (
              <FeatureEditor
                planType={(selectedLicenseForFeatures.plan_type as 'start' | 'pro' | 'enterprise') || 'start'}
                currentFeatures={selectedLicenseForFeatures.features || null}
                onSave={handleSaveFeatures}
                saving={savingFeatures}
              />
            ) : (
              <div className="glass-card p-12 text-center">
                <Settings2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">Aucune licence sélectionnée</h3>
                <p className="text-muted-foreground">
                  Sélectionnez une licence ci-dessus pour personnaliser ses fonctionnalités
                </p>
              </div>
            )}

            {/* Schema Sync Manager */}
            <div className="mt-8">
              <SchemaSyncManager adminToken={getAdminToken() || undefined} />
            </div>
          </div>
        </TabsContent>

        {/* Updates Tab */}
        <TabsContent value="updates" className="space-y-6 mt-6">
          <PWAUpdatesManager />
        </TabsContent>

        {/* Demo Tab */}
        <TabsContent value="demo" className="space-y-6 mt-6">
          <div className="glass-card p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <PlayCircle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Mode Démonstration</h2>
                <p className="text-sm text-muted-foreground">
                  Activez une session de démo pré-remplie pour vos présentations clients
                </p>
              </div>
            </div>

            {/* Current Demo Status */}
            {isDemoActive && getCurrentSession() && (
              <div className="mb-6 p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-amber-500 animate-pulse" />
                    <div>
                      <p className="font-medium text-amber-700 dark:text-amber-400">
                        Mode démo actif : {getCurrentSession()?.name}
                      </p>
                      <p className="text-sm text-amber-600/80">
                        {getCurrentSession()?.description}
                      </p>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      deactivateDemo();
                      navigate('/');
                    }}
                    className="border-amber-500/30 text-amber-700 hover:bg-amber-500/10"
                  >
                    <StopCircle className="w-4 h-4 mr-2" />
                    Quitter la démo
                  </Button>
                </div>
              </div>
            )}

            {/* Demo Sessions */}
            <div className="grid gap-4 md:grid-cols-3">
              {availableSessions.map((session) => (
                <div 
                  key={session.id}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    currentSessionId === session.id 
                      ? 'border-amber-500 bg-amber-500/5' 
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    {session.planType === 'enterprise' && <Crown className="w-5 h-5 text-amber-500" />}
                    {session.planType === 'pro' && <Star className="w-5 h-5 text-blue-500" />}
                    {session.planType === 'start' && <Sparkles className="w-5 h-5 text-green-500" />}
                    <h3 className="font-semibold">{session.name}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">{session.description}</p>
                  
                  <div className="space-y-1 text-xs text-muted-foreground mb-4">
                    <p>• {session.drivers.length} conducteur(s)</p>
                    <p>• {session.clients.length} client(s)</p>
                    <p>• {session.trips.length} trajet(s)</p>
                    <p>• {session.charges.length} charge(s) fixe(s)</p>
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
                    {currentSessionId === session.id ? (
                      <>
                        <StopCircle className="w-4 h-4 mr-2" />
                        Désactiver
                      </>
                    ) : (
                      <>
                        <PlayCircle className="w-4 h-4 mr-2" />
                        Activer cette démo
                      </>
                    )}
                  </Button>
                </div>
              ))}
            </div>

            {/* Info */}
            <div className="mt-6 p-4 rounded-lg bg-muted/50 border border-border">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                À propos du mode démo
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Les données de démo remplacent temporairement vos données actuelles</li>
                <li>• Vos données originales sont sauvegardées et restaurées à la désactivation</li>
                <li>• Idéal pour les présentations clients sans risquer vos données réelles</li>
                <li>• Le badge "Mode Démo" s'affiche dans la barre latérale pendant la session</li>
              </ul>
            </div>
          </div>
        </TabsContent>
      </Tabs>
      
      {/* Limits Editor Dialog */}
      <Dialog open={!!editingLimitsId} onOpenChange={(open) => !open && setEditingLimitsId(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Modifier les limites
            </DialogTitle>
            <DialogDescription>
              Définissez des limites personnalisées pour cette licence. Laissez vide pour utiliser les limites par défaut du forfait.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Users limit - highlighted */}
            <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
              <div className="space-y-2">
                <Label htmlFor="maxUsers" className="flex items-center gap-2 text-primary font-medium">
                  <Users className="w-4 h-4" />
                  Licences utilisateur (société)
                </Label>
                <Input
                  id="maxUsers"
                  type="number"
                  min="1"
                  placeholder="Par défaut (selon forfait)"
                  value={limitsForm.maxUsers ?? ''}
                  onChange={(e) => setLimitsForm({ 
                    ...limitsForm, 
                    maxUsers: e.target.value ? parseInt(e.target.value) : null 
                  })}
                />
                <p className="text-xs text-muted-foreground">
                  Nombre maximum d'utilisateurs pouvant rejoindre cette société
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="maxDrivers">Max conducteurs</Label>
                <Input
                  id="maxDrivers"
                  type="number"
                  min="0"
                  placeholder="Par défaut"
                  value={limitsForm.maxDrivers ?? ''}
                  onChange={(e) => setLimitsForm({ 
                    ...limitsForm, 
                    maxDrivers: e.target.value ? parseInt(e.target.value) : null 
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxClients">Max clients</Label>
                <Input
                  id="maxClients"
                  type="number"
                  min="0"
                  placeholder="Par défaut"
                  value={limitsForm.maxClients ?? ''}
                  onChange={(e) => setLimitsForm({ 
                    ...limitsForm, 
                    maxClients: e.target.value ? parseInt(e.target.value) : null 
                  })}
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="maxDailyCharges">Charges jour</Label>
                <Input
                  id="maxDailyCharges"
                  type="number"
                  min="0"
                  placeholder="Par défaut"
                  value={limitsForm.maxDailyCharges ?? ''}
                  onChange={(e) => setLimitsForm({ 
                    ...limitsForm, 
                    maxDailyCharges: e.target.value ? parseInt(e.target.value) : null 
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxMonthlyCharges">Charges mois</Label>
                <Input
                  id="maxMonthlyCharges"
                  type="number"
                  min="0"
                  placeholder="Par défaut"
                  value={limitsForm.maxMonthlyCharges ?? ''}
                  onChange={(e) => setLimitsForm({ 
                    ...limitsForm, 
                    maxMonthlyCharges: e.target.value ? parseInt(e.target.value) : null 
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxYearlyCharges">Charges an</Label>
                <Input
                  id="maxYearlyCharges"
                  type="number"
                  min="0"
                  placeholder="Par défaut"
                  value={limitsForm.maxYearlyCharges ?? ''}
                  onChange={(e) => setLimitsForm({ 
                    ...limitsForm, 
                    maxYearlyCharges: e.target.value ? parseInt(e.target.value) : null 
                  })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingLimitsId(null)}>
              Annuler
            </Button>
            <Button onClick={saveLimits}>
              <Save className="w-4 h-4 mr-2" />
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* User Detail Dialog */}
      <UserDetailDialog
        license={selectedLicenseForDetail}
        open={userDetailOpen}
        onOpenChange={setUserDetailOpen}
        adminToken={getAdminToken() || ''}
        onUpdate={fetchLicenses}
      />
    </div>
  );
}