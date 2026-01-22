import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { 
  Calculator, 
  Users, 
  Building2,
  ChevronLeft,
  ChevronRight,
  Navigation,
  BarChart3,
  UserCircle,
  CreditCard,
  Lock,
  TrendingUp,
  Truck,
  Route,
  PlayCircle,
  StopCircle,
  Settings,
  EyeOff,
  CloudDownload,
  Loader2
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useLicense, FeatureKey } from '@/hooks/useLicense';
import { useLanguage } from '@/i18n/LanguageContext';
import { useDemoMode } from '@/hooks/useDemoMode';
import { toast } from 'sonner';
import optiflowLogo from '@/assets/optiflow-logo.svg';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useDataSyncActions } from '@/components/DataSyncProvider';

// Feature labels for tooltip display
const FEATURE_LABELS: Record<string, string> = {
  basic_calculator: 'Calcul de rentabilité',
  itinerary_planning: 'Planification itinéraire',
  dashboard_basic: 'Tableau de bord simplifié',
  dashboard_analytics: 'Tableau de bord analytique',
  forecast: 'Prévisionnel',
  trip_history: 'Historique des trajets',
  multi_drivers: 'Multi-chauffeurs',
  cost_analysis: 'Analyse détaillée des coûts',
  ai_optimization: 'Optimisation IA',
  ai_pdf_analysis: 'Analyse IA des PDF',
  multi_agency: 'Multi-agences',
  multi_users: 'Multi-utilisateurs',
  page_dashboard: 'Tableau de bord',
  page_calculator: 'Calculateur',
  page_itinerary: 'Itinéraire',
  page_tours: 'Tournées',
  page_clients: 'Clients',
  page_vehicles: 'Véhicules',
  page_drivers: 'Conducteurs',
  page_charges: 'Charges',
  page_forecast: 'Prévisionnel',
  page_ai_analysis: 'Analyse IA',
  btn_export_pdf: 'Export PDF',
  btn_export_excel: 'Export Excel',
  btn_ai_optimize: 'Optimisation IA',
};

// Define which features are required for each nav item
// If undefined, the item is always visible
type NavItemConfig = {
  to: string;
  icon: any;
  labelKey: keyof typeof import('@/i18n/translations').translations.fr.nav;
  requiredFeature?: FeatureKey; // Feature flag from admin panel (can completely hide)
  requiredPlan?: 'pro' | 'enterprise'; // Plan requirement (shows locked with upgrade prompt)
};

const navItems: NavItemConfig[] = [
  // Core calculation tools (Calculator now includes History via tabs)
  { to: '/calculator', icon: Calculator, labelKey: 'calculator', requiredFeature: 'page_calculator' },
  { to: '/itinerary', icon: Navigation, labelKey: 'itinerary', requiredFeature: 'page_itinerary', requiredPlan: 'pro' },
  { to: '/tours', icon: Route, labelKey: 'tours', requiredFeature: 'page_tours', requiredPlan: 'pro' },
  
  // Analysis & Reports (AI analysis integrated into dashboard)
  { to: '/dashboard', icon: BarChart3, labelKey: 'dashboard', requiredFeature: 'page_dashboard', requiredPlan: 'pro' },
  { to: '/forecast', icon: TrendingUp, labelKey: 'forecast', requiredFeature: 'page_forecast', requiredPlan: 'pro' },
  
  // Resource Management (Vehicle Reports now integrated in Vehicles page)
  { to: '/vehicles', icon: Truck, labelKey: 'vehicles', requiredFeature: 'page_vehicles' },
  { to: '/drivers', icon: Users, labelKey: 'drivers', requiredFeature: 'page_drivers' },
  { to: '/charges', icon: Building2, labelKey: 'charges', requiredFeature: 'page_charges' },
  { to: '/clients', icon: UserCircle, labelKey: 'clients', requiredFeature: 'page_clients' },
  
  // Settings & Subscription
  { to: '/settings', icon: Settings, labelKey: 'settings', requiredFeature: 'page_settings' },
  { to: '/pricing', icon: CreditCard, labelKey: 'pricing' },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { planType, hasFeature, licenseData } = useLicense();
  const { t, language } = useLanguage();
  const { isActive: isDemoActive, getCurrentSession, deactivateDemo } = useDemoMode();
  const currentDemoSession = getCurrentSession();
  const { forceSync, isSyncing } = useDataSyncActions();

  // Get restricted features (user-specific overrides that are disabled)
  const restrictedFeatures = licenseData?.userFeatureOverrides?.filter(o => !o.enabled) || [];
  const restrictedFeaturesCount = restrictedFeatures.length;
  
  // Get labels for restricted features
  const getRestrictedFeatureLabels = () => {
    return restrictedFeatures.map(o => 
      FEATURE_LABELS[o.feature_key] || o.feature_key.replace(/_/g, ' ')
    );
  };

  // Check if plan meets requirement
  const isPlanSufficient = (requiredPlan?: 'pro' | 'enterprise') => {
    if (!requiredPlan) return true;
    if (requiredPlan === 'pro') {
      return planType === 'pro' || planType === 'enterprise';
    }
    if (requiredPlan === 'enterprise') {
      return planType === 'enterprise';
    }
    return true;
  };

  const getLockedTitle = (requiredPlan: string) => {
    if (language === 'en') return `${requiredPlan.toUpperCase()} plan required`;
    if (language === 'es') return `Plan ${requiredPlan.toUpperCase()} requerido`;
    return `Forfait ${requiredPlan.toUpperCase()} requis`;
  };

  const handleLockedClick = (e: React.MouseEvent, label: string, requiredPlan: string) => {
    e.preventDefault();
    const planLabel = requiredPlan.toUpperCase();
    
    if (language === 'en') {
      toast.info(`"${label}" requires ${planLabel} plan`, {
        description: 'Upgrade your subscription to access this feature.',
        action: {
          label: 'View plans',
          onClick: () => navigate('/pricing')
        }
      });
    } else if (language === 'es') {
      toast.info(`"${label}" requiere el plan ${planLabel}`, {
        description: 'Actualiza tu suscripción para acceder a esta función.',
        action: {
          label: 'Ver planes',
          onClick: () => navigate('/pricing')
        }
      });
    } else {
      toast.info(`"${label}" nécessite le forfait ${planLabel}`, {
        description: 'Passez à un forfait supérieur pour accéder à cette fonctionnalité.',
        action: {
          label: 'Voir les forfaits',
          onClick: () => navigate('/pricing')
        }
      });
    }
  };

  const getCollapseLabel = () => {
    if (language === 'en') return 'Collapse';
    if (language === 'es') return 'Reducir';
    return 'Réduire';
  };

  return (
    <aside 
      className={cn(
        "fixed left-0 top-0 h-screen bg-sidebar border-r border-sidebar-border flex flex-col transition-all duration-300 z-50 no-print",
        collapsed ? "w-20" : "w-64"
      )}
    >
      {/* Logo - Clickable to go home */}
      <div className="p-6 border-b border-sidebar-border">
        <NavLink to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <img 
            src={optiflowLogo} 
            alt="OptiFlow" 
            className="w-10 h-10 object-contain"
          />
          {!collapsed && (
            <div className="animate-fade-in">
              <h1 className="font-bold text-lg text-foreground">OptiFlow</h1>
              <span className="text-xs text-muted-foreground">Line Optimizer</span>
            </div>
          )}
        </NavLink>
      </div>

      {/* Demo Mode Indicator */}
      {isDemoActive && currentDemoSession && (
        <div className={cn(
          "mx-4 mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30",
          collapsed && "mx-2 p-2"
        )}>
          <div className="flex items-center gap-2">
            <PlayCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-amber-700 dark:text-amber-400 truncate">
                  Mode Démo
                </p>
                <p className="text-xs text-amber-600/80 truncate">
                  {currentDemoSession.planType.toUpperCase()}
                </p>
              </div>
            )}
          </div>
          {!collapsed && (
            <button
              onClick={deactivateDemo}
              className="mt-2 w-full flex items-center justify-center gap-1 px-2 py-1 text-xs rounded bg-amber-600/20 hover:bg-amber-600/30 text-amber-700 dark:text-amber-400 transition-colors"
            >
              <StopCircle className="w-3 h-3" />
              Quitter
            </button>
          )}
        </div>
      )}

      {/* Restricted Features Indicator */}
      {restrictedFeaturesCount > 0 && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <NavLink
                to="/my-restrictions"
                className={cn(
                  "block mx-4 mt-4 p-3 rounded-lg bg-destructive/10 border border-destructive/30 cursor-pointer hover:bg-destructive/20 transition-colors",
                  collapsed && "mx-2 p-2",
                  isDemoActive && "mt-2"
                )}
              >
                <div className="flex items-center gap-2">
                  <EyeOff className="w-4 h-4 text-destructive flex-shrink-0" />
                  {!collapsed && (
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-destructive truncate">
                        {restrictedFeaturesCount} restriction{restrictedFeaturesCount > 1 ? 's' : ''}
                      </p>
                      <p className="text-xs text-destructive/70 truncate">
                        {language === 'fr' ? 'Cliquez pour voir' : language === 'es' ? 'Clic para ver' : 'Click to view'}
                      </p>
                    </div>
                  )}
                </div>
              </NavLink>
            </TooltipTrigger>
            <TooltipContent side="right" className="max-w-xs">
              <div className="space-y-2">
                <p className="font-medium text-sm">
                  {language === 'fr' ? 'Fonctionnalités restreintes' : language === 'es' ? 'Funciones restringidas' : 'Restricted features'}
                </p>
                <ul className="text-xs space-y-1">
                  {getRestrictedFeatureLabels().map((label, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <Lock className="w-3 h-3 text-destructive" />
                      <span>{label}</span>
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-muted-foreground pt-1 border-t border-border">
                  {language === 'fr' 
                    ? 'Cliquez pour demander un accès'
                    : language === 'es'
                    ? 'Haga clic para solicitar acceso'
                    : 'Click to request access'}
                </p>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.to;
          const label = t.nav[item.labelKey];
          
          // Check if feature is disabled via admin panel - completely hide if disabled
          if (item.requiredFeature && !hasFeature(item.requiredFeature)) {
            return null; // Hidden by admin
          }
          
          // Check if plan is insufficient - show locked state with upgrade prompt
          const isLocked = !isPlanSufficient(item.requiredPlan);
          
          if (isLocked) {
            return (
              <button
                key={item.to}
                onClick={(e) => handleLockedClick(e, label, item.requiredPlan!)}
                className="nav-item-locked w-full text-left upgrade-shimmer"
                title={getLockedTitle(item.requiredPlan!)}
              >
                <item.icon className="w-5 h-5 flex-shrink-0 opacity-60" />
                {!collapsed && (
                  <span className="truncate flex-1 opacity-60">{label}</span>
                )}
                {!collapsed && (
                  <Lock className="lock-icon w-4 h-4 text-muted-foreground" />
                )}
                {collapsed && (
                  <Lock className="lock-icon w-3 h-3 absolute bottom-0 right-0 text-muted-foreground" />
                )}
              </button>
            );
          }

          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={cn(
                "nav-item",
                isActive && "active"
              )}
              title={label}
            >
              <item.icon className={cn("w-5 h-5 flex-shrink-0", isActive && "text-primary")} />
              {!collapsed && (
                <span className="truncate flex-1">{label}</span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Cloud Sync Button */}
      <div className="px-4 pb-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={async () => {
                  await forceSync();
                  toast.success(
                    language === 'fr' ? 'Synchronisation terminée' :
                    language === 'es' ? 'Sincronización completada' :
                    'Sync completed'
                  );
                }}
                disabled={isSyncing}
                className={cn(
                  "w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg transition-colors",
                  "bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20",
                  isSyncing && "opacity-70 cursor-wait"
                )}
              >
                {isSyncing ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <CloudDownload className="w-5 h-5" />
                )}
                {!collapsed && (
                  <span className="font-medium text-sm">
                    {language === 'fr' ? 'Recharger Cloud' :
                     language === 'es' ? 'Recargar Cloud' :
                     'Reload Cloud'}
                  </span>
                )}
              </button>
            </TooltipTrigger>
            {collapsed && (
              <TooltipContent side="right">
                {language === 'fr' ? 'Recharger Cloud' :
                 language === 'es' ? 'Recargar Cloud' :
                 'Reload Cloud'}
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Collapse Toggle */}
      <div className="p-4 border-t border-sidebar-border">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-muted-foreground hover:bg-sidebar-accent hover:text-foreground transition-colors"
        >
          {collapsed ? (
            <ChevronRight className="w-5 h-5" />
          ) : (
            <>
              <ChevronLeft className="w-5 h-5" />
              <span>{getCollapseLabel()}</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
