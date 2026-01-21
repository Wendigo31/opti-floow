import { useState } from 'react';
import { 
  RefreshCw, 
  Shield, 
  Check, 
  X, 
  AlertTriangle, 
  Users, 
  ChevronDown,
  ChevronUp,
  Calculator,
  Map,
  Route,
  BarChart3,
  TrendingUp,
  FileText,
  FileSpreadsheet,
  Brain,
  Building2,
  UserCog,
  Truck,
  Users2,
  Bell,
  PieChart,
  Clock,
  Wallet,
  Star,
  Sparkles,
  Lock,
  Send,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useLicense, FeatureKey } from '@/hooks/useLicense';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

// Feature categories with their features
const FEATURE_CATEGORIES = [
  {
    name: 'Calculs & Itinéraires',
    icon: Calculator,
    features: [
      { key: 'basic_calculator', label: 'Calculateur de coûts', description: 'Calcul des coûts de transport', plans: ['start', 'pro', 'enterprise'] },
      { key: 'itinerary_planning', label: 'Planification itinéraire', description: 'Création d\'itinéraires avec arrêts', plans: ['pro', 'enterprise'] },
      { key: 'saved_tours', label: 'Tournées sauvegardées', description: 'Enregistrement des tournées', plans: ['pro', 'enterprise'] },
      { key: 'auto_pricing_basic', label: 'Tarification automatique', description: 'Calcul automatique des prix', plans: ['pro', 'enterprise'] },
      { key: 'auto_pricing', label: 'Tarification avancée', description: 'Marges dynamiques et prix clients', plans: ['pro', 'enterprise'] },
    ],
  },
  {
    name: 'Dashboard & Analytics',
    icon: BarChart3,
    features: [
      { key: 'dashboard_basic', label: 'Dashboard basique', description: 'Vue d\'ensemble des activités', plans: ['start', 'pro', 'enterprise'] },
      { key: 'dashboard_analytics', label: 'Analytics avancés', description: 'Graphiques et statistiques détaillés', plans: ['pro', 'enterprise'] },
      { key: 'dynamic_charts', label: 'Graphiques dynamiques', description: 'Visualisations interactives', plans: ['pro', 'enterprise'] },
      { key: 'forecast', label: 'Prévisionnel', description: 'Projections et tendances', plans: ['pro', 'enterprise'] },
      { key: 'trip_history', label: 'Historique trajets', description: 'Suivi des trajets passés', plans: ['pro', 'enterprise'] },
      { key: 'monthly_tracking', label: 'Suivi mensuel', description: 'Rapports mensuels', plans: ['pro', 'enterprise'] },
    ],
  },
  {
    name: 'Analyse des coûts',
    icon: TrendingUp,
    features: [
      { key: 'cost_analysis_basic', label: 'Analyse coûts basique', description: 'Répartition des coûts', plans: ['start', 'pro', 'enterprise'] },
      { key: 'cost_analysis', label: 'Analyse coûts avancée', description: 'Analyse détaillée et comparaisons', plans: ['pro', 'enterprise'] },
      { key: 'margin_alerts', label: 'Alertes marges', description: 'Notifications sur marges faibles', plans: ['pro', 'enterprise'] },
    ],
  },
  {
    name: 'Clients & Devis',
    icon: Users2,
    features: [
      { key: 'client_analysis_basic', label: 'Gestion clients', description: 'Liste et fiches clients', plans: ['pro', 'enterprise'] },
      { key: 'client_analysis', label: 'Analyse clients avancée', description: 'Rentabilité par client', plans: ['enterprise'] },
      { key: 'smart_quotes', label: 'Devis intelligents', description: 'Génération automatique de devis', plans: ['enterprise'] },
    ],
  },
  {
    name: 'Flotte & Conducteurs',
    icon: Truck,
    features: [
      { key: 'fleet_basic', label: 'Gestion flotte basique', description: 'Liste des véhicules', plans: ['start', 'pro', 'enterprise'] },
      { key: 'fleet_management', label: 'Gestion flotte avancée', description: 'Suivi kilométrique et coûts', plans: ['pro', 'enterprise'] },
      { key: 'multi_drivers', label: 'Multi-conducteurs', description: 'Gestion de plusieurs conducteurs', plans: ['pro', 'enterprise'] },
      { key: 'unlimited_vehicles', label: 'Véhicules illimités', description: 'Pas de limite de véhicules', plans: ['enterprise'] },
    ],
  },
  {
    name: 'Exports',
    icon: FileText,
    features: [
      { key: 'pdf_export_basic', label: 'Export PDF basique', description: 'Export simple en PDF', plans: ['start', 'pro', 'enterprise'] },
      { key: 'pdf_export_pro', label: 'Export PDF Pro', description: 'PDF personnalisés avec logo', plans: ['pro', 'enterprise'] },
      { key: 'excel_export', label: 'Export Excel', description: 'Export des données en Excel', plans: ['pro', 'enterprise'] },
    ],
  },
  {
    name: 'Intelligence Artificielle',
    icon: Brain,
    features: [
      { key: 'ai_optimization', label: 'Optimisation IA', description: 'Optimisation des trajets par IA', plans: ['enterprise'] },
      { key: 'ai_pdf_analysis', label: 'Analyse PDF IA', description: 'Extraction de données depuis PDF', plans: ['enterprise'] },
    ],
  },
  {
    name: 'Équipe & Entreprise',
    icon: Building2,
    features: [
      { key: 'multi_users', label: 'Multi-utilisateurs', description: 'Plusieurs comptes utilisateurs', plans: ['enterprise'] },
      { key: 'multi_agency', label: 'Multi-agences', description: 'Gestion de plusieurs agences', plans: ['enterprise'] },
      { key: 'company_invite_members', label: 'Inviter des membres', description: 'Ajouter des collaborateurs', plans: ['pro', 'enterprise'] },
      { key: 'company_data_sharing', label: 'Partage de données', description: 'Données partagées entre membres', plans: ['pro', 'enterprise'] },
      { key: 'realtime_notifications', label: 'Notifications temps réel', description: 'Alertes instantanées', plans: ['pro', 'enterprise'] },
      { key: 'tms_erp_integration', label: 'Intégration TMS/ERP', description: 'Connexion aux systèmes externes', plans: ['enterprise'] },
    ],
  },
] as const;

type PlanType = 'start' | 'pro' | 'enterprise';

export function LicenseSyncSettings() {
  const { toast } = useToast();
  const { licenseData, planType, refreshLicense, isOffline, hasFeature } = useLicense();
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['Calculs & Itinéraires']);
  
  // Access request state
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [selectedFeatureForRequest, setSelectedFeatureForRequest] = useState<{ key: string; label: string } | null>(null);
  const [requestMessage, setRequestMessage] = useState('');
  const [sendingRequest, setSendingRequest] = useState(false);

  const handleSyncLicense = async () => {
    if (isOffline) {
      toast({
        title: "Mode hors-ligne",
        description: "Synchronisation impossible sans connexion internet",
        variant: "destructive",
      });
      return;
    }

    setSyncing(true);
    try {
      await refreshLicense();
      
      const channel = new BroadcastChannel('optiflow-license-sync');
      channel.postMessage({ action: 'refresh' });
      channel.close();
      
      setLastSync(new Date());
      
      toast({
        title: "Licence synchronisée",
        description: "Vos fonctionnalités ont été mises à jour",
      });
    } catch (error) {
      console.error('Sync error:', error);
      toast({
        title: "Erreur de synchronisation",
        description: "Impossible de synchroniser la licence",
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleSyncAllCompanyUsers = async () => {
    if (isOffline) {
      toast({
        title: "Mode hors-ligne",
        description: "Synchronisation impossible sans connexion internet",
        variant: "destructive",
      });
      return;
    }

    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('validate-license', {
        body: { 
          action: 'sync-company',
          licenseCode: licenseData?.code,
          email: licenseData?.email,
        },
      });

      if (error) throw error;

      await refreshLicense();
      setLastSync(new Date());
      
      toast({
        title: "Synchronisation entreprise",
        description: `${data?.syncedCount || 0} utilisateurs notifiés de la mise à jour`,
      });
    } catch (error) {
      console.error('Company sync error:', error);
      toast({
        title: "Erreur de synchronisation",
        description: "Impossible de synchroniser l'entreprise",
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  };

  const toggleCategory = (categoryName: string) => {
    setExpandedCategories(prev => 
      prev.includes(categoryName) 
        ? prev.filter(c => c !== categoryName)
        : [...prev, categoryName]
    );
  };

  const handleOpenRequestDialog = (featureKey: string, featureLabel: string) => {
    setSelectedFeatureForRequest({ key: featureKey, label: featureLabel });
    setRequestMessage('');
    setRequestDialogOpen(true);
  };

  const handleSendAccessRequest = async () => {
    if (!selectedFeatureForRequest) return;
    
    setSendingRequest(true);
    try {
      const { data, error } = await supabase.rpc('create_access_request', {
        p_requested_features: [selectedFeatureForRequest.key],
        p_message: requestMessage || null,
      });

      if (error) throw error;

      toast({
        title: "Demande envoyée",
        description: "Votre administrateur a été notifié de votre demande.",
      });
      
      setRequestDialogOpen(false);
      setSelectedFeatureForRequest(null);
      setRequestMessage('');
    } catch (err: any) {
      console.error('Error sending request:', err);
      toast({
        title: "Erreur",
        description: err.message || "Impossible d'envoyer la demande",
        variant: "destructive",
      });
    } finally {
      setSendingRequest(false);
    }
  };

  const getPlanBadge = () => {
    switch (planType) {
      case 'enterprise':
        return <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">Enterprise</Badge>;
      case 'pro':
        return <Badge className="bg-primary text-primary-foreground">Pro</Badge>;
      default:
        return <Badge variant="secondary">Start</Badge>;
    }
  };

  const isFeatureAvailable = (featurePlans: readonly string[]) => {
    return featurePlans.includes(planType);
  };

  const getFeatureStatus = (featureKey: string, featurePlans: readonly string[]) => {
    const planHasFeature = featurePlans.includes(planType);
    const actuallyEnabled = hasFeature(featureKey as FeatureKey);
    
    if (actuallyEnabled) return 'enabled';
    if (planHasFeature && !actuallyEnabled) return 'disabled-by-admin';
    return 'not-in-plan';
  };

  // Count features
  const totalFeatures = FEATURE_CATEGORIES.reduce((sum, cat) => sum + cat.features.length, 0);
  const enabledFeatures = FEATURE_CATEGORIES.reduce((sum, cat) => 
    sum + cat.features.filter(f => hasFeature(f.key as FeatureKey)).length, 0
  );

  return (
    <div className="space-y-6">
      {/* License Info Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Shield className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Licence & Fonctionnalités</CardTitle>
                <CardDescription>Synchronisez votre licence pour mettre à jour vos fonctionnalités</CardDescription>
              </div>
            </div>
            {getPlanBadge()}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* License Info */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-secondary/30 rounded-lg">
            <div>
              <p className="text-xs text-muted-foreground">Email</p>
              <p className="font-medium truncate">{licenseData?.email || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Entreprise</p>
              <p className="font-medium truncate">{licenseData?.companyName || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Forfait</p>
              <p className="font-medium capitalize">{planType}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Fonctionnalités</p>
              <p className="font-medium">{enabledFeatures} / {totalFeatures}</p>
            </div>
          </div>

          {/* Offline Warning */}
          {isOffline && (
            <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-600">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm">Mode hors-ligne - Synchronisation impossible</span>
            </div>
          )}

          {/* Sync Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={handleSyncLicense}
              disabled={syncing || isOffline}
              variant="outline"
              className="flex-1 gap-2"
            >
              {syncing ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              Synchroniser ma licence
            </Button>
            
            {(planType === 'pro' || planType === 'enterprise') && (
              <Button
                onClick={handleSyncAllCompanyUsers}
                disabled={syncing || isOffline}
                variant="gradient"
                className="flex-1 gap-2"
              >
                {syncing ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Users className="w-4 h-4" />
                )}
                Synchroniser toute l'entreprise
              </Button>
            )}
          </div>

          {lastSync && (
            <p className="text-xs text-muted-foreground text-center">
              Dernière synchronisation : {lastSync.toLocaleTimeString('fr-FR')}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Features List Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Liste des fonctionnalités</CardTitle>
              <CardDescription>
                Toutes les fonctionnalités disponibles selon votre forfait
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Legend */}
          <div className="flex flex-wrap gap-4 p-3 bg-secondary/30 rounded-lg text-xs">
            <div className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-success" />
              <span>Activé</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-amber-500" />
              <span>Désactivé par admin</span>
            </div>
            <div className="flex items-center gap-1.5">
              <X className="w-3.5 h-3.5 text-muted-foreground" />
              <span>Non inclus dans le forfait</span>
            </div>
          </div>

          {/* Categories */}
          <div className="space-y-2">
            {FEATURE_CATEGORIES.map((category) => {
              const CategoryIcon = category.icon;
              const isExpanded = expandedCategories.includes(category.name);
              const categoryEnabledCount = category.features.filter(f => 
                hasFeature(f.key as FeatureKey)
              ).length;
              
              return (
                <div key={category.name} className="border border-border/50 rounded-lg overflow-hidden">
                  <button
                    onClick={() => toggleCategory(category.name)}
                    className="w-full flex items-center justify-between p-3 hover:bg-secondary/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <CategoryIcon className="w-4 h-4 text-primary" />
                      <span className="font-medium">{category.name}</span>
                      <Badge variant="secondary" className="text-xs">
                        {categoryEnabledCount}/{category.features.length}
                      </Badge>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    )}
                  </button>
                  
                  {isExpanded && (
                    <div className="border-t border-border/50 divide-y divide-border/30">
                      {category.features.map((feature) => {
                        const status = getFeatureStatus(feature.key, feature.plans);
                        
                        return (
                          <div
                            key={feature.key}
                            className={cn(
                              "flex items-center justify-between p-3 pl-10",
                              status === 'not-in-plan' && "opacity-50"
                            )}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm">{feature.label}</span>
                                {feature.plans.includes('enterprise') && !feature.plans.includes('pro') && (
                                  <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-[10px] px-1.5 py-0">
                                    Enterprise
                                  </Badge>
                                )}
                                {feature.plans.includes('pro') && !feature.plans.includes('start') && (
                                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                    Pro+
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground truncate">
                                {feature.description}
                              </p>
                            </div>
                            
                            <div className="ml-3 flex items-center gap-2">
                              {status === 'enabled' && (
                                <div className="flex items-center gap-1 text-success">
                                  <Check className="w-4 h-4" />
                                </div>
                              )}
                              {status === 'disabled-by-admin' && (
                                <div className="flex items-center gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-xs gap-1 border-amber-500/50 text-amber-600 hover:bg-amber-500/10 hover:text-amber-700"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenRequestDialog(feature.key, feature.label);
                                    }}
                                  >
                                    <Send className="w-3 h-3" />
                                    Demander
                                  </Button>
                                  <Lock className="w-4 h-4 text-amber-500" />
                                </div>
                              )}
                              {status === 'not-in-plan' && (
                                <div className="flex items-center gap-1 text-muted-foreground">
                                  <X className="w-4 h-4" />
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Access Request Dialog */}
      <Dialog open={requestDialogOpen} onOpenChange={setRequestDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="w-5 h-5 text-primary" />
              Demander l'accès
            </DialogTitle>
            <DialogDescription>
              Envoyez une demande à votre administrateur pour activer cette fonctionnalité.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {selectedFeatureForRequest && (
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                <p className="text-sm font-medium text-primary">
                  Fonctionnalité demandée
                </p>
                <p className="text-sm text-foreground mt-1">
                  {selectedFeatureForRequest.label}
                </p>
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="request-message">Message (optionnel)</Label>
              <Textarea
                id="request-message"
                placeholder="Expliquez pourquoi vous avez besoin de cette fonctionnalité..."
                value={requestMessage}
                onChange={(e) => setRequestMessage(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRequestDialogOpen(false)}
              disabled={sendingRequest}
            >
              Annuler
            </Button>
            <Button
              onClick={handleSendAccessRequest}
              disabled={sendingRequest}
              className="gap-2"
            >
              {sendingRequest ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Envoi...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Envoyer la demande
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
