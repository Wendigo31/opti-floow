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
  Lock,
  TrendingUp,
  Truck,
  Route,
  Settings,
  EyeOff,
   UsersRound,
   CalendarDays
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLicense, FeatureKey } from '@/hooks/useLicense';
import { useTeam } from '@/hooks/useTeam';
import { useUserFeatureOverrides, FeatureKey as UserFeatureKey } from '@/hooks/useUserFeatureOverrides';
import { useSidebarContext } from '@/context/SidebarContext';
import { toast } from 'sonner';
import optiflowLogo from '@/assets/optiflow-logo.svg';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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

// Navigation labels in French
const NAV_LABELS = {
  calculator: 'Calculateur',
  itinerary: 'Itinéraire',
  tours: 'Tournées',
   planning: 'Planning',
  dashboard: 'Analyse',
  forecast: 'Prévisionnel',
  vehicles: 'Véhicules',
  drivers: 'Conducteurs',
  charges: 'Charges',
  clients: 'Clients',
  settings: 'Paramètres',
  team: 'Équipe',
};

// Type for nav items
type NavItemConfig = {
  to: string;
  icon: any;
  labelKey: keyof typeof NAV_LABELS;
  requiredFeature?: FeatureKey;
  requiredPlan?: 'pro' | 'enterprise';
  directionOnly?: boolean;
  userFeatureKey?: UserFeatureKey;
};

// Define navigation groups for a cleaner structure
const navGroups: { label: string; items: NavItemConfig[] }[] = [
  {
    label: 'Principal',
    items: [
      { to: '/calculator', icon: Calculator, labelKey: 'calculator', requiredFeature: 'page_calculator', userFeatureKey: 'page_calculator' },
      { to: '/itinerary', icon: Navigation, labelKey: 'itinerary', requiredFeature: 'page_itinerary', requiredPlan: 'pro', userFeatureKey: 'page_itinerary' },
    ]
  },
  {
    label: 'Gestion',
    items: [
      { to: '/tours', icon: Route, labelKey: 'tours', requiredFeature: 'page_tours', requiredPlan: 'pro', userFeatureKey: 'page_tours' },
       { to: '/planning', icon: CalendarDays, labelKey: 'planning', requiredPlan: 'pro' },
      { to: '/clients', icon: UserCircle, labelKey: 'clients', requiredFeature: 'page_clients', userFeatureKey: 'page_clients' },
    ]
  },
  {
    label: 'Flotte',
    items: [
      { to: '/vehicles', icon: Truck, labelKey: 'vehicles', requiredFeature: 'page_vehicles', userFeatureKey: 'page_vehicles' },
      { to: '/drivers', icon: Users, labelKey: 'drivers', requiredFeature: 'page_drivers', userFeatureKey: 'page_drivers' },
    ]
  },
  {
    label: 'Analyse',
    items: [
      { to: '/dashboard', icon: BarChart3, labelKey: 'dashboard', requiredFeature: 'page_dashboard', requiredPlan: 'pro', userFeatureKey: 'page_dashboard' },
      { to: '/forecast', icon: TrendingUp, labelKey: 'forecast', requiredFeature: 'page_forecast', requiredPlan: 'pro', directionOnly: true },
    ]
  },
  {
    label: 'Administration',
    items: [
      { to: '/charges', icon: Building2, labelKey: 'charges', requiredFeature: 'page_charges', directionOnly: true },
      { to: '/team', icon: UsersRound, labelKey: 'team', requiredPlan: 'pro' },
      { to: '/settings', icon: Settings, labelKey: 'settings', requiredFeature: 'page_settings' },
    ]
  },
];

// Flatten for MobileNav compatibility
const navItems: NavItemConfig[] = navGroups.flatMap(g => g.items as NavItemConfig[]);

export function Sidebar() {
  const { collapsed, toggleSidebar } = useSidebarContext();
  const location = useLocation();
  const navigate = useNavigate();
  const { planType, hasFeature, licenseData } = useLicense();
  const { isDirection: isDirectionFromTeam } = useTeam();
  // Fallback: use userRole from cached license data when auth session isn't ready
  const isDirection = isDirectionFromTeam || licenseData?.userRole === 'direction';
  const { canAccess: canAccessUserFeature } = useUserFeatureOverrides();

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
    // If planType is not yet loaded, don't hide items — show them by default
    if (!planType) return true;
    if (requiredPlan === 'pro') {
      return planType === 'pro' || planType === 'enterprise';
    }
    if (requiredPlan === 'enterprise') {
      return planType === 'enterprise';
    }
    return true;
  };

  const handleLockedClick = (e: React.MouseEvent, label: string, requiredPlan: string) => {
    e.preventDefault();
    const planLabel = requiredPlan.toUpperCase();
    toast.info(`"${label}" nécessite le forfait ${planLabel}`, {
      description: 'Passez à un forfait supérieur pour accéder à cette fonctionnalité.',
      action: {
        label: 'Voir les forfaits',
        onClick: () => navigate('/pricing')
      }
    });
  };

  return (
    <aside 
      className={cn(
        "fixed left-0 top-0 h-screen bg-sidebar border-r border-sidebar-border flex flex-col transition-all duration-300 z-50 no-print",
        collapsed ? "w-20" : "w-64"
      )}
    >
      {/* Logo */}
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

      {/* Restricted Features Indicator */}
      {restrictedFeaturesCount > 0 && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <NavLink
                to="/my-restrictions"
                className={cn(
                  "block mx-4 mt-4 p-3 rounded-lg bg-destructive/10 border border-destructive/30 cursor-pointer hover:bg-destructive/20 transition-colors",
                  collapsed && "mx-2 p-2"
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
                        Cliquez pour voir
                      </p>
                    </div>
                  )}
                </div>
              </NavLink>
            </TooltipTrigger>
            <TooltipContent side="right" className="max-w-xs">
              <div className="space-y-2">
                <p className="font-medium text-sm">Fonctionnalités restreintes</p>
                <ul className="text-xs space-y-1">
                  {getRestrictedFeatureLabels().map((label, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <Lock className="w-3 h-3 text-destructive" />
                      <span>{label}</span>
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-muted-foreground pt-1 border-t border-border">
                  Cliquez pour demander un accès
                </p>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-4 overflow-y-auto">
        {navGroups.map((group, groupIndex) => {
          // Filter visible items in this group
          const visibleItems = group.items.filter((item) => {
            if (item.requiredFeature && !hasFeature(item.requiredFeature)) return false;
            if (item.directionOnly && !isDirection) return false;
            if (item.userFeatureKey && !canAccessUserFeature(item.userFeatureKey)) return false;
            return true;
          });

          // Don't render empty groups
          if (visibleItems.length === 0) return null;

          return (
            <div key={group.label} className="space-y-1">
              {!collapsed && (
                <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">
                  {group.label}
                </p>
              )}
              {visibleItems.map((item) => {
                const isActive = location.pathname === item.to;
                const label = NAV_LABELS[item.labelKey];
                const isLocked = !isPlanSufficient(item.requiredPlan);

                if (isLocked) {
                  return (
                    <button
                      key={item.to}
                      onClick={(e) => handleLockedClick(e, label, item.requiredPlan!)}
                      className="nav-item-locked w-full text-left upgrade-shimmer"
                      title={`Forfait ${item.requiredPlan!.toUpperCase()} requis`}
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
            </div>
          );
        })}
      </nav>

      {/* Collapse Toggle */}
      <div className="p-4 border-t border-sidebar-border">
        <button
          onClick={toggleSidebar}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-muted-foreground hover:bg-sidebar-accent hover:text-foreground transition-colors"
        >
          {collapsed ? (
            <ChevronRight className="w-5 h-5" />
          ) : (
            <>
              <ChevronLeft className="w-5 h-5" />
              <span>Réduire</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
