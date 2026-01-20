import { ReactNode } from 'react';
import { useLicense, FeatureKey, PlanType } from '@/hooks/useLicense';
import { Lock, Sparkles, Crown, Star, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import type { LicenseFeatures } from '@/types/features';

interface FeatureGateProps {
  feature: FeatureKey;
  children: ReactNode;
  fallback?: ReactNode;
  showUpgradePrompt?: boolean;
  showLockedIndicator?: boolean;
  mode?: 'hide' | 'blur' | 'badge' | 'tooltip';
  className?: string;
}

const FEATURE_LABELS: Record<FeatureKey, string> = {
  basic_calculator: 'Calcul de rentabilité',
  itinerary_planning: 'Planification itinéraire',
  dashboard_basic: 'Tableau de bord simplifié',
  dashboard_analytics: 'Tableau de bord analytique',
  forecast: 'Prévisionnel',
  trip_history: 'Historique des trajets',
  multi_drivers: 'Multi-chauffeurs',
  cost_analysis: 'Analyse détaillée des coûts',
  cost_analysis_basic: 'Analyse des coûts basique',
  margin_alerts: 'Alertes marge',
  dynamic_charts: 'Graphiques dynamiques',
  pdf_export_basic: 'Export PDF basique',
  pdf_export_pro: 'Export PDF professionnel',
  excel_export: 'Export Excel',
  monthly_tracking: 'Suivi mensuel',
  auto_pricing: 'Tarification automatique',
  auto_pricing_basic: 'Tarification automatique basique',
  saved_tours: 'Sauvegarde des tournées',
  ai_optimization: 'Optimisation IA',
  ai_pdf_analysis: 'Analyse IA des PDF',
  multi_agency: 'Multi-agences',
  tms_erp_integration: 'Intégration TMS/ERP',
  multi_users: 'Multi-utilisateurs',
  unlimited_vehicles: 'Véhicules illimités',
  client_analysis: 'Analyse clients avancée',
  client_analysis_basic: 'Analyse clients',
  smart_quotes: 'Devis intelligent',
  fleet_basic: 'Gestion flotte basique',
  fleet_management: 'Gestion flotte avancée',
  // Company/User management features
  company_invite_members: 'Inviter des membres',
  company_remove_members: 'Supprimer des membres',
  company_change_roles: 'Modifier les rôles',
  company_view_activity: 'Voir l\'activité',
  company_manage_settings: 'Gérer les paramètres',
  company_data_sharing: 'Partage de données',
  realtime_notifications: 'Notifications temps réel',
  // Navigation/Pages features
  page_dashboard: 'Page Tableau de bord',
  page_calculator: 'Page Calculateur',
  page_itinerary: 'Page Itinéraire',
  page_tours: 'Page Tournées',
  page_clients: 'Page Clients',
  page_vehicles: 'Page Véhicules',
  page_drivers: 'Page Conducteurs',
  page_charges: 'Page Charges',
  page_forecast: 'Page Prévisionnel',
  page_trip_history: 'Page Historique trajets',
  page_ai_analysis: 'Page Analyse IA',
  page_toxic_clients: 'Page Clients toxiques',
  page_vehicle_reports: 'Page Rapports véhicules',
  page_team: 'Page Équipe',
  page_settings: 'Page Paramètres',
  // UI Component features - Buttons
  btn_export_pdf: 'Bouton Export PDF',
  btn_export_excel: 'Bouton Export Excel',
  btn_save_tour: 'Bouton Sauvegarder tournée',
  btn_load_tour: 'Bouton Charger tournée',
  btn_ai_optimize: 'Bouton Optimisation IA',
  btn_map_preview: 'Aperçu carte',
  btn_contact_support: 'Bouton Contact support',
  // Add/Create buttons
  btn_add_client: 'Bouton Ajouter client',
  btn_add_vehicle: 'Bouton Ajouter véhicule',
  btn_add_driver: 'Bouton Ajouter conducteur',
  btn_add_charge: 'Bouton Ajouter charge',
  btn_add_trailer: 'Bouton Ajouter remorque',
  btn_add_trip: 'Bouton Ajouter trajet',
  btn_add_quote: 'Bouton Ajouter devis',
  // Edit/Delete buttons
  btn_edit_client: 'Bouton Modifier client',
  btn_delete_client: 'Bouton Supprimer client',
  btn_edit_vehicle: 'Bouton Modifier véhicule',
  btn_delete_vehicle: 'Bouton Supprimer véhicule',
  btn_edit_driver: 'Bouton Modifier conducteur',
  btn_delete_driver: 'Bouton Supprimer conducteur',
  btn_edit_charge: 'Bouton Modifier charge',
  btn_delete_charge: 'Bouton Supprimer charge',
  // Sections
  section_cost_breakdown: 'Section Répartition des coûts',
  section_margin_alerts: 'Section Alertes marge',
  section_charts: 'Section Graphiques',
  section_client_stats: 'Section Statistiques clients',
  section_vehicle_stats: 'Section Statistiques véhicules',
  section_driver_stats: 'Section Statistiques conducteurs',
};

const REQUIRED_PLAN: Record<FeatureKey, PlanType> = {
  // START features
  basic_calculator: 'start',
  dashboard_basic: 'start',
  cost_analysis_basic: 'start',
  pdf_export_basic: 'start',
  fleet_basic: 'start',
  page_dashboard: 'start',
  page_calculator: 'start',
  page_clients: 'start',
  page_vehicles: 'start',
  page_drivers: 'start',
  page_charges: 'start',
  page_settings: 'start',
  btn_map_preview: 'start',
  btn_contact_support: 'start',
  section_cost_breakdown: 'start',
  // Add/Edit/Delete - basic CRUD for start
  btn_add_client: 'start',
  btn_add_vehicle: 'start',
  btn_add_driver: 'start',
  btn_add_charge: 'start',
  btn_add_trailer: 'start',
  btn_edit_client: 'start',
  btn_delete_client: 'start',
  btn_edit_vehicle: 'start',
  btn_delete_vehicle: 'start',
  btn_edit_driver: 'start',
  btn_delete_driver: 'start',
  btn_edit_charge: 'start',
  btn_delete_charge: 'start',
  section_client_stats: 'start',
  section_vehicle_stats: 'start',
  section_driver_stats: 'start',
  // PRO features
  itinerary_planning: 'pro',
  saved_tours: 'pro',
  trip_history: 'pro',
  auto_pricing_basic: 'pro',
  fleet_management: 'pro',
  dashboard_analytics: 'pro',
  forecast: 'pro',
  multi_drivers: 'pro',
  cost_analysis: 'pro',
  margin_alerts: 'pro',
  dynamic_charts: 'pro',
  pdf_export_pro: 'pro',
  excel_export: 'pro',
  monthly_tracking: 'pro',
  auto_pricing: 'pro',
  client_analysis_basic: 'pro',
  page_itinerary: 'pro',
  page_tours: 'pro',
  page_forecast: 'pro',
  page_trip_history: 'pro',
  page_vehicle_reports: 'pro',
  page_team: 'pro',
  btn_export_pdf: 'pro',
  btn_export_excel: 'pro',
  btn_save_tour: 'pro',
  btn_load_tour: 'pro',
  btn_add_trip: 'pro',
  btn_add_quote: 'pro',
  section_margin_alerts: 'pro',
  section_charts: 'pro',
  // Company/User management - PRO
  company_invite_members: 'pro',
  company_remove_members: 'pro',
  company_change_roles: 'pro',
  company_view_activity: 'pro',
  company_manage_settings: 'pro',
  company_data_sharing: 'pro',
  realtime_notifications: 'pro',
  // ENTERPRISE features
  ai_optimization: 'enterprise',
  ai_pdf_analysis: 'enterprise',
  multi_agency: 'enterprise',
  tms_erp_integration: 'enterprise',
  multi_users: 'enterprise',
  unlimited_vehicles: 'enterprise',
  client_analysis: 'enterprise',
  smart_quotes: 'enterprise',
  page_ai_analysis: 'enterprise',
  page_toxic_clients: 'enterprise',
  btn_ai_optimize: 'enterprise',
};

const PLAN_LABELS: Record<PlanType, string> = {
  start: 'OptiFlow START',
  pro: 'OptiFlow PRO',
  enterprise: 'OptiFlow ENTERPRISE',
};

const PLAN_ICONS: Record<PlanType, typeof Sparkles> = {
  start: Sparkles,
  pro: Star,
  enterprise: Crown,
};

export function FeatureGate({ 
  feature, 
  children, 
  fallback, 
  showUpgradePrompt = false,
  showLockedIndicator = true,
  mode = 'hide',
  className
}: FeatureGateProps) {
  const { hasFeature, planType } = useLicense();
  const navigate = useNavigate();

  if (hasFeature(feature)) {
    return <>{children}</>;
  }

  const requiredPlan = REQUIRED_PLAN[feature];
  const featureLabel = FEATURE_LABELS[feature];
  const planLabel = PLAN_LABELS[requiredPlan];
  const PlanIcon = PLAN_ICONS[requiredPlan];

  // Mode: tooltip - show children with a tooltip indicating locked
  if (mode === 'tooltip') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn("opacity-50 cursor-not-allowed", className)}>
              {children}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <div className="flex items-center gap-2">
              <Lock className="w-3 h-3" />
              <span>Forfait {planLabel} requis</span>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Mode: badge - show children with a locked badge
  if (mode === 'badge') {
    return (
      <div className={cn("relative", className)}>
        <div className="opacity-50 pointer-events-none">
          {children}
        </div>
        <Badge 
          variant="secondary" 
          className="absolute top-2 right-2 gap-1 text-xs"
        >
          <Lock className="w-3 h-3" />
          {requiredPlan.toUpperCase()}
        </Badge>
      </div>
    );
  }

  // Mode: blur - show blurred content with overlay
  if (mode === 'blur') {
    return (
      <div className={cn("relative", className)}>
        <div className="blur-sm pointer-events-none select-none">
          {children}
        </div>
        <div className="absolute inset-0 flex items-center justify-center bg-background/50">
          <div className="text-center space-y-2 p-4">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mx-auto">
              <Lock className="w-5 h-5 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground font-medium">
              {featureLabel}
            </p>
            <Badge variant="outline" className="gap-1">
              <PlanIcon className="w-3 h-3" />
              {planLabel}
            </Badge>
          </div>
        </div>
      </div>
    );
  }

  // Mode: hide - show locked indicator or nothing
  if (showLockedIndicator) {
    return (
      <div className={cn(
        "relative glass-card p-6 border-dashed border-2 border-border/50",
        className
      )}>
        <div className="text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6 text-muted-foreground" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">{featureLabel}</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Cette fonctionnalité nécessite le forfait <span className="font-medium text-primary">{planLabel}</span>
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/pricing')}
            className="gap-2"
          >
            <Sparkles className="w-4 h-4" />
            Voir les forfaits
          </Button>
        </div>
      </div>
    );
  }

  // If no indicator and no prompt, hide completely
  if (!showUpgradePrompt) {
    return null;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  return null;
}

interface LockedOverlayProps {
  feature: FeatureKey;
  children: ReactNode;
  className?: string;
}

export function LockedOverlay({ feature, children, className }: LockedOverlayProps) {
  const { hasFeature } = useLicense();
  const navigate = useNavigate();

  const isLocked = !hasFeature(feature);
  const requiredPlan = REQUIRED_PLAN[feature];
  const planLabel = PLAN_LABELS[requiredPlan];

  return (
    <div className={cn("relative", className)}>
      {children}
      {isLocked && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-10 rounded-lg">
          <div className="text-center space-y-3 p-4">
            <Lock className="w-8 h-8 text-muted-foreground mx-auto" />
            <p className="text-sm text-muted-foreground">
              Forfait <span className="font-medium text-primary">{planLabel}</span> requis
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/pricing')}
            >
              Mettre à niveau
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// Inline locked button variant
interface LockedButtonProps {
  feature: FeatureKey;
  children: ReactNode;
  onClick?: () => void;
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

export function LockedButton({ 
  feature, 
  children, 
  onClick, 
  variant = 'default',
  size = 'default',
  className 
}: LockedButtonProps) {
  const { hasFeature } = useLicense();
  const navigate = useNavigate();

  const isLocked = !hasFeature(feature);
  const requiredPlan = REQUIRED_PLAN[feature];
  const planLabel = PLAN_LABELS[requiredPlan];

  if (isLocked) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant={variant} 
              size={size} 
              className={cn("gap-2 opacity-60", className)}
              onClick={() => navigate('/pricing')}
            >
              <Lock className="w-4 h-4" />
              {children}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Forfait {planLabel} requis</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Button variant={variant} size={size} className={className} onClick={onClick}>
      {children}
    </Button>
  );
}

// Plan badge component
interface PlanBadgeProps {
  plan?: PlanType;
  showCurrent?: boolean;
  className?: string;
}

export function PlanBadge({ plan, showCurrent = false, className }: PlanBadgeProps) {
  const { planType } = useLicense();
  const displayPlan = plan || planType;
  const PlanIcon = PLAN_ICONS[displayPlan];

  const colorClasses = {
    start: 'bg-blue-500/20 text-blue-500 border-blue-500/30',
    pro: 'bg-orange-500/20 text-orange-500 border-orange-500/30',
    enterprise: 'bg-amber-500/20 text-amber-500 border-amber-500/30',
  };

  return (
    <Badge 
      variant="outline" 
      className={cn("gap-1", colorClasses[displayPlan], className)}
    >
      <PlanIcon className="w-3 h-3" />
      {PLAN_LABELS[displayPlan]}
      {showCurrent && displayPlan === planType && (
        <span className="text-xs opacity-70">(actuel)</span>
      )}
    </Badge>
  );
}

// Limit check hook
interface UseLimitCheckResult {
  isWithinLimit: boolean;
  current: number;
  limit: number | null;
  remaining: number | null;
  percentage: number;
}

export function useLimitCheck(
  limitKey: keyof LicenseFeatures,
  currentCount: number
): UseLimitCheckResult {
  const { getFeatureValue, licenseData } = useLicense();
  
  // First check custom feature value
  const customLimit = getFeatureValue(limitKey) as number | null | undefined;
  
  // Fall back to license data limits
  const licenseLimit = (() => {
    switch (limitKey) {
      case 'max_drivers': return licenseData?.maxDrivers;
      case 'max_clients': return licenseData?.maxClients;
      case 'max_daily_charges': return licenseData?.maxDailyCharges;
      case 'max_monthly_charges': return licenseData?.maxMonthlyCharges;
      case 'max_yearly_charges': return licenseData?.maxYearlyCharges;
      default: return null;
    }
  })();

  const limit = customLimit ?? licenseLimit ?? null;
  
  // 0 or null means unlimited
  const isUnlimited = limit === null || limit === 0;
  const isWithinLimit = isUnlimited || currentCount < limit;
  const remaining = isUnlimited ? null : Math.max(0, limit - currentCount);
  const percentage = isUnlimited ? 0 : Math.min(100, (currentCount / limit) * 100);

  return {
    isWithinLimit,
    current: currentCount,
    limit,
    remaining,
    percentage,
  };
}

// Limit warning component
interface LimitWarningProps {
  limitKey: keyof LicenseFeatures;
  currentCount: number;
  entityName: string;
  className?: string;
}

export function LimitWarning({ limitKey, currentCount, entityName, className }: LimitWarningProps) {
  const { isWithinLimit, limit, remaining, percentage } = useLimitCheck(limitKey, currentCount);
  const navigate = useNavigate();

  if (limit === null || limit === 0) return null; // Unlimited
  if (percentage < 80) return null; // Not near limit

  const isAtLimit = !isWithinLimit;

  return (
    <div className={cn(
      "flex items-center gap-2 p-3 rounded-lg text-sm",
      isAtLimit 
        ? "bg-destructive/10 text-destructive border border-destructive/20" 
        : "bg-amber-500/10 text-amber-600 border border-amber-500/20",
      className
    )}>
      <AlertCircle className="w-4 h-4 flex-shrink-0" />
      <div className="flex-1">
        {isAtLimit ? (
          <span>Limite atteinte : {currentCount}/{limit} {entityName}</span>
        ) : (
          <span>Attention : {remaining} {entityName} restant(s) ({currentCount}/{limit})</span>
        )}
      </div>
      <Button 
        variant="ghost" 
        size="sm" 
        className="h-7 text-xs"
        onClick={() => navigate('/pricing')}
      >
        Augmenter
      </Button>
    </div>
  );
}

export function useFeatureCheck() {
  const { hasFeature, planType, getFeatureValue, licenseData } = useLicense();
  
  return {
    hasFeature,
    getFeatureValue,
    planType,
    isProOrAbove: planType === 'pro' || planType === 'enterprise',
    isEnterprise: planType === 'enterprise',
    customFeatures: licenseData?.customFeatures,
  };
}
