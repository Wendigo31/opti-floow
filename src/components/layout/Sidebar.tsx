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
  Info,
  CreditCard,
  Lock,
  TrendingUp,
  Truck,
  Route,
  PlayCircle,
  StopCircle,
  Settings,
  EyeOff
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useLicense, FeatureKey } from '@/hooks/useLicense';
import { useLanguage } from '@/i18n/LanguageContext';
import { useDemoMode } from '@/hooks/useDemoMode';
import { toast } from 'sonner';
import optiflowLogo from '@/assets/optiflow-logo.svg';

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
  { to: '/info', icon: Info, labelKey: 'info' },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { planType, hasFeature, licenseData } = useLicense();
  const { t, language } = useLanguage();
  const { isActive: isDemoActive, getCurrentSession, deactivateDemo } = useDemoMode();
  const currentDemoSession = getCurrentSession();

  // Count restricted features (user-specific overrides that are disabled)
  const restrictedFeaturesCount = licenseData?.userFeatureOverrides?.filter(o => !o.enabled).length || 0;

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
        <div className={cn(
          "mx-4 mt-4 p-3 rounded-lg bg-destructive/10 border border-destructive/30",
          collapsed && "mx-2 p-2",
          isDemoActive && "mt-2"
        )}>
          <div className="flex items-center gap-2">
            <EyeOff className="w-4 h-4 text-destructive flex-shrink-0" />
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-destructive truncate">
                  {restrictedFeaturesCount} restriction{restrictedFeaturesCount > 1 ? 's' : ''}
                </p>
                <p className="text-xs text-destructive/70 truncate">
                  {language === 'fr' ? 'Accès limité' : language === 'es' ? 'Acceso limitado' : 'Limited access'}
                </p>
              </div>
            )}
          </div>
        </div>
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
