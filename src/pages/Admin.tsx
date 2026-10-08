import { useState, useEffect } from 'react';
import { Crown, Star, Sparkles, Loader2 } from 'lucide-react';
import { UserDetailDialog } from '@/components/admin/UserDetailDialog';
import { AdminLoginScreen } from '@/components/admin/AdminLoginScreen';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { AdminLicensesTab } from '@/components/admin/AdminLicensesTab';
import { AdminCompaniesTab } from '@/components/admin/AdminCompaniesTab';
import { AdminFeaturesTab } from '@/components/admin/AdminFeaturesTab';
import { PricingConfigManager } from '@/components/admin/PricingConfigManager';
import { AdminLicenseFormDialog } from '@/components/admin/AdminLicenseFormDialog';
import { AdminLimitsDialog, type LimitsFormState } from '@/components/admin/AdminLimitsDialog';
import type { LicenseFeatures } from '@/types/features';
import { supabase } from '@/integrations/supabase/client';
import { useLicense, PlanType } from '@/hooks/useLicense';
import { toast } from 'sonner';
import { License, LicenseFormData, emptyFormData, type AdminTab } from '@/types/admin';

const ADMIN_AUTH_FUNCTION = 'admin-auth';
const ADMIN_AUTH_STORAGE_KEY = 'optiflow_admin_auth_v2';
const ADMIN_TOKEN_STORAGE_KEY = 'optiflow_admin_token_v2';

export default function Admin() {
  const { isLoading } = useLicense();

  // Core state
  const [licenses, setLicenses] = useState<License[]>([]);
  const [companyUserCounts, setCompanyUserCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  // Dialog state
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [createdLicense, setCreatedLicense] = useState<{ code: string; email: string } | null>(null);
  const [editingLicenseId, setEditingLicenseId] = useState<string | null>(null);
  const [formData, setFormData] = useState<LicenseFormData>(emptyFormData);

  // Limits editor
  const [editingLimitsId, setEditingLimitsId] = useState<string | null>(null);
  const [limitsForm, setLimitsForm] = useState<LimitsFormState>({
    maxDrivers: null,
    maxClients: null,
    maxDailyCharges: null,
    maxMonthlyCharges: null,
    maxYearlyCharges: null,
    maxUsers: null,
  });

  // Feature editor
  const [selectedLicenseForFeatures, setSelectedLicenseForFeatures] = useState<License | null>(null);
  const [savingFeatures, setSavingFeatures] = useState(false);
  const [adminActiveTab, setAdminActiveTab] = useState<AdminTab>('licenses');

  // User detail dialog
  const [selectedLicenseForDetail, setSelectedLicenseForDetail] = useState<License | null>(null);
  const [userDetailOpen, setUserDetailOpen] = useState(false);

  // Admin auth
  const [adminCode, setAdminCode] = useState('');
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [adminLoginError, setAdminLoginError] = useState('');
  const [adminLoginLoading, setAdminLoginLoading] = useState(false);

  // Restore admin session from sessionStorage (more secure)
  useEffect(() => {
    try {
      const rawSession = sessionStorage.getItem(ADMIN_AUTH_STORAGE_KEY);
      const token = sessionStorage.getItem(ADMIN_TOKEN_STORAGE_KEY);
      if (!rawSession || !token) {
        sessionStorage.removeItem(ADMIN_AUTH_STORAGE_KEY);
        sessionStorage.removeItem(ADMIN_TOKEN_STORAGE_KEY);
        // Also clear legacy localStorage keys
        localStorage.removeItem('optiflow_admin_auth_v1');
        localStorage.removeItem('optiflow_admin_token_v1');
        return;
      }
      const session = JSON.parse(rawSession);
      if (session.expiresAt && Date.now() < session.expiresAt) {
        setIsAdminAuthenticated(true);
      } else {
        sessionStorage.removeItem(ADMIN_AUTH_STORAGE_KEY);
        sessionStorage.removeItem(ADMIN_TOKEN_STORAGE_KEY);
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
        sessionStorage.setItem(ADMIN_TOKEN_STORAGE_KEY, data.token);
        sessionStorage.setItem(
          ADMIN_AUTH_STORAGE_KEY,
          JSON.stringify({ expiresAt: Date.now() + (data.expiresIn || 2 * 3600) * 1000 })
        );
        toast.success('Connexion admin réussie (session de 2h)');
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
    return sessionStorage.getItem(ADMIN_TOKEN_STORAGE_KEY);
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
      planType: 'optiflow',
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
      // IMPORTANT:
      // We must obtain a fresh auth session for the target user, otherwise the app can
      // keep the previous authenticated identity and appear "stuck" on the first user.
      await supabase.auth.signOut();

      const { data: validateData, error: validateError } = await supabase.functions.invoke('validate-license', {
        body: {
          action: 'validate',
          licenseCode: license.license_code,
          email: license.email,
        },
      });

      if (validateError) throw validateError;
      if (!validateData?.success) throw new Error(validateData?.error || 'Validation impossible');

      if (validateData.session) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: validateData.session.access_token,
          refresh_token: validateData.session.refresh_token,
        });
        if (sessionError) {
          console.error('Admin impersonation: setSession failed:', sessionError);
        }
      }

      // Persist the same shape expected by useLicense
      const licenseData = {
        code: validateData.licenseData?.code || license.license_code,
        email: validateData.licenseData?.email || license.email,
        activatedAt: validateData.licenseData?.activatedAt || new Date().toISOString(),
        planType: validateData.licenseData?.planType || 'optiflow',
        firstName: validateData.licenseData?.firstName ?? license.first_name,
        lastName: validateData.licenseData?.lastName ?? license.last_name,
        companyName: validateData.licenseData?.companyName ?? license.company_name,
        siren: validateData.licenseData?.siren ?? license.siren,
        address: validateData.licenseData?.address ?? license.address,
        city: validateData.licenseData?.city ?? license.city,
        postalCode: validateData.licenseData?.postalCode ?? license.postal_code,
        maxDrivers: validateData.licenseData?.maxDrivers ?? license.max_drivers,
        maxClients: validateData.licenseData?.maxClients ?? license.max_clients,
        maxDailyCharges: validateData.licenseData?.maxDailyCharges ?? license.max_daily_charges,
        maxMonthlyCharges: validateData.licenseData?.maxMonthlyCharges ?? license.max_monthly_charges,
        maxYearlyCharges: validateData.licenseData?.maxYearlyCharges ?? license.max_yearly_charges,
        customFeatures: validateData.customFeatures ?? license.features,
        userFeatureOverrides: validateData.userFeatureOverrides ?? null,
        companyUserId: validateData.companyUserId ?? null,
        userRole: validateData.userRole ?? null,
        showUserInfo: validateData.licenseData?.showUserInfo ?? true,
        showCompanyInfo: validateData.licenseData?.showCompanyInfo ?? true,
        showAddressInfo: validateData.licenseData?.showAddressInfo ?? true,
        showLicenseInfo: validateData.licenseData?.showLicenseInfo ?? true,
      };

      localStorage.setItem('optiflow-license', JSON.stringify(licenseData));
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      localStorage.setItem('optiflow-license-cache', JSON.stringify({
        data: licenseData,
        lastValidated: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
      }));

      // Notify any in-memory listeners (same tab) that the license has changed.
      // This prevents some screens from still showing a stale plan until a full reload.
      try {
        window.dispatchEvent(new CustomEvent('optiflow:license-updated', { detail: licenseData }));
      } catch {
        // noop
      }

      toast.success(`Connexion en tant que ${license.email}`);
      window.location.href = '/';
    } catch (error) {
      console.error('Login as user error:', error);
      toast.error('Erreur de connexion');
    }
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
      <AdminLoginScreen
        adminCode={adminCode}
        setAdminCode={setAdminCode}
        adminLoginError={adminLoginError}
        adminLoginLoading={adminLoginLoading}
        handleAdminLogin={handleAdminLogin}
      />
    );
  }

  return (
    <div className="flex h-screen bg-background">
      <AdminSidebar
        adminActiveTab={adminActiveTab}
        setAdminActiveTab={setAdminActiveTab}
        setIsAdminAuthenticated={setIsAdminAuthenticated}
      />

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="p-6 w-full space-y-6">

          {adminActiveTab === 'licenses' && (
            <AdminLicensesTab
              licenses={licenses}
              companyUserCounts={companyUserCounts}
              loading={loading}
              fetchLicenses={fetchLicenses}
              openCreateDialog={openCreateDialog}
              setSelectedLicenseForDetail={setSelectedLicenseForDetail}
              setUserDetailOpen={setUserDetailOpen}
              loginAsUser={loginAsUser}
              openLimitsEditor={openLimitsEditor}
              openEditDialog={openEditDialog}
              toggleLicenseStatus={toggleLicenseStatus}
              deleteLicense={deleteLicense}
              getPlanIcon={getPlanIcon}
              getPlanBadgeClass={getPlanBadgeClass}
            />
          )}

          {adminActiveTab === 'companies' && (
            <AdminCompaniesTab getAdminToken={getAdminToken} fetchLicenses={fetchLicenses} />
          )}

          {adminActiveTab === 'features' && (
            <AdminFeaturesTab
              licenses={licenses}
              selectedLicenseForFeatures={selectedLicenseForFeatures}
              setSelectedLicenseForFeatures={setSelectedLicenseForFeatures}
              handleSaveFeatures={handleSaveFeatures}
              savingFeatures={savingFeatures}
              getAdminToken={getAdminToken}
              getPlanIcon={getPlanIcon}
            />
          )}

          {adminActiveTab === 'pricing' && (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-semibold">Tarification interne</h2>
                <p className="text-sm text-muted-foreground">
                  Configuration confidentielle des forfaits, planchers, remises et add-ons.
                </p>
              </div>
              <PricingConfigManager />
            </div>
          )}

        </div>
      </main>

      {/* Dialogs */}
      <AdminLicenseFormDialog
        dialogOpen={dialogOpen}
        resetDialog={resetDialog}
        dialogMode={dialogMode}
        createdLicense={createdLicense}
        formData={formData}
        setFormData={setFormData}
        licenses={licenses}
        saving={saving}
        handleSave={handleSave}
        copyToClipboard={copyToClipboard}
      />

      <AdminLimitsDialog
        editingLimitsId={editingLimitsId}
        setEditingLimitsId={setEditingLimitsId}
        limitsForm={limitsForm}
        setLimitsForm={setLimitsForm}
        saveLimits={saveLimits}
      />

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
