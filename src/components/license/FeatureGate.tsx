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
  basic_calculator: 'optiflow',
  dashboard_basic: 'optiflow',
  cost_analysis_basic: 'optiflow',
  pdf_export_basic: 'optiflow',
  fleet_basic: 'optiflow',
  page_dashboard: 'optiflow',
  page_calculator: 'optiflow',
  page_clients: 'optiflow',
  page_vehicles: 'optiflow',
  page_drivers: 'optiflow',
  page_charges: 'optiflow',
  page_settings: 'optiflow',
  btn_map_preview: 'optiflow',
  btn_contact_support: 'optiflow',
  section_cost_breakdown: 'optiflow',
  // Add/Edit/Delete - basic CRUD for start
  btn_add_client: 'optiflow',
  btn_add_vehicle: 'optiflow',
  btn_add_driver: 'optiflow',
  btn_add_charge: 'optiflow',
  btn_add_trailer: 'optiflow',
  btn_edit_client: 'optiflow',
  btn_delete_client: 'optiflow',
  btn_edit_vehicle: 'optiflow',
  btn_delete_vehicle: 'optiflow',
  btn_edit_driver: 'optiflow',
  btn_delete_driver: 'optiflow',
  btn_edit_charge: 'optiflow',
  btn_delete_charge: 'optiflow',
  section_client_stats: 'optiflow',
  section_vehicle_stats: 'optiflow',
  section_driver_stats: 'optiflow',
  // PRO features
  itinerary_planning: 'optiflow',
  saved_tours: 'optiflow',
  trip_history: 'optiflow',
  auto_pricing_basic: 'optiflow',
  fleet_management: 'optiflow',
  dashboard_analytics: 'optiflow',
  forecast: 'optiflow',
  multi_drivers: 'optiflow',
  cost_analysis: 'optiflow',
  margin_alerts: 'optiflow',
  dynamic_charts: 'optiflow',
  pdf_export_pro: 'optiflow',
  excel_export: 'optiflow',
  monthly_tracking: 'optiflow',
  auto_pricing: 'optiflow',
  client_analysis_basic: 'optiflow',
  page_itinerary: 'optiflow',
  page_tours: 'optiflow',
  page_forecast: 'optiflow',
  page_trip_history: 'optiflow',
  page_vehicle_reports: 'optiflow',
  page_team: 'optiflow',
  btn_export_pdf: 'optiflow',
  btn_export_excel: 'optiflow',
  btn_save_tour: 'optiflow',
  btn_load_tour: 'optiflow',
  btn_add_trip: 'optiflow',
  btn_add_quote: 'optiflow',
  section_margin_alerts: 'optiflow',
  section_charts: 'optiflow',
  // Company/User management - PRO
  company_invite_members: 'optiflow',
  company_remove_members: 'optiflow',
  company_change_roles: 'optiflow',
  company_view_activity: 'optiflow',
  company_manage_settings: 'optiflow',
  company_data_sharing: 'optiflow',
  realtime_notifications: 'optiflow',
  // ENTERPRISE features
  ai_optimization: 'optiflow',
  ai_pdf_analysis: 'optiflow',
  multi_agency: 'optiflow',
  tms_erp_integration: 'optiflow',
  multi_users: 'optiflow',
  unlimited_vehicles: 'optiflow',
  client_analysis: 'optiflow',
  smart_quotes: 'optiflow',
  page_ai_analysis: 'optiflow',
  page_toxic_clients: 'optiflow',
  btn_ai_optimize: 'optiflow',
};

const PLAN_LABELS: Record<PlanType, string> = {
  optiflow: 'OptiFlow',
};

const PLAN_ICONS: Record<PlanType, typeof Sparkles> = {
  optiflow: Crown,
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
  const { hasFeature, planType, isLoading } = useLicense();
  const navigate = useNavigate();

  // CRITICAL: During license loading, allow children to render to avoid UI "flash of locked".
  // If the license is still loading, don't block the feature.
  if (isLoading) {
    return <>{children}</>;
  }

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

  // Mode: hide - always hide completely, never show locked indicator or redirect to pricing
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

  // If feature is locked, hide completely instead of showing overlay
  if (!hasFeature(feature)) {
    return null;
  }

  return (
    <div className={cn("relative", className)}>
      {children}
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

  // If feature is locked, hide the button completely
  if (!hasFeature(feature)) {
    return null;
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
    isProOrAbove: true,
    isEnterprise: true,
    customFeatures: licenseData?.customFeatures,
  };
}
