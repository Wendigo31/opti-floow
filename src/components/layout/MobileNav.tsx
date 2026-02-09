import { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { 
  Calculator, 
  Users, 
  Building2,
  Navigation,
  BarChart3,
  UserCircle,
  CreditCard,
  Lock,
  TrendingUp,
  Truck,
  Route,
  Settings,
  Menu,
  X,
  UsersRound,
  CalendarDays
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLicense, FeatureKey } from '@/hooks/useLicense';
import { useTeam } from '@/hooks/useTeam';
import { useUserFeatureOverrides, FeatureKey as UserFeatureKey } from '@/hooks/useUserFeatureOverrides';
import { toast } from 'sonner';
import optiflowLogo from '@/assets/optiflow-logo.svg';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';

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
  pricing: 'Tarifs',
};

type NavItemConfig = {
  to: string;
  icon: any;
  labelKey: keyof typeof NAV_LABELS;
  requiredFeature?: FeatureKey;
  requiredPlan?: 'pro' | 'enterprise';
  directionOnly?: boolean;
  userFeatureKey?: UserFeatureKey;
};

const navItems: NavItemConfig[] = [
  { to: '/calculator', icon: Calculator, labelKey: 'calculator', requiredFeature: 'page_calculator', userFeatureKey: 'page_calculator' },
  { to: '/itinerary', icon: Navigation, labelKey: 'itinerary', requiredFeature: 'page_itinerary', requiredPlan: 'pro', userFeatureKey: 'page_itinerary' },
  { to: '/tours', icon: Route, labelKey: 'tours', requiredFeature: 'page_tours', requiredPlan: 'pro', userFeatureKey: 'page_tours' },
  { to: '/planning', icon: CalendarDays, labelKey: 'planning', requiredPlan: 'pro' },
  { to: '/dashboard', icon: BarChart3, labelKey: 'dashboard', requiredFeature: 'page_dashboard', requiredPlan: 'pro', userFeatureKey: 'page_dashboard' },
  { to: '/forecast', icon: TrendingUp, labelKey: 'forecast', requiredFeature: 'page_forecast', requiredPlan: 'pro', directionOnly: true },
  { to: '/vehicles', icon: Truck, labelKey: 'vehicles', requiredFeature: 'page_vehicles', userFeatureKey: 'page_vehicles' },
  { to: '/drivers', icon: Users, labelKey: 'drivers', requiredFeature: 'page_drivers', userFeatureKey: 'page_drivers' },
  { to: '/charges', icon: Building2, labelKey: 'charges', requiredFeature: 'page_charges', directionOnly: true },
  { to: '/clients', icon: UserCircle, labelKey: 'clients', requiredFeature: 'page_clients', userFeatureKey: 'page_clients' },
  { to: '/settings', icon: Settings, labelKey: 'settings', requiredFeature: 'page_settings' },
  { to: '/team', icon: UsersRound, labelKey: 'team', requiredPlan: 'pro' },
  { to: '/pricing', icon: CreditCard, labelKey: 'pricing', directionOnly: true },
];

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { planType, hasFeature, licenseData } = useLicense();
  const { isDirection: isDirectionFromTeam } = useTeam();
  const isDirection = isDirectionFromTeam || licenseData?.userRole === 'direction';
  const { canAccess: canAccessUserFeature } = useUserFeatureOverrides();

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

  const handleLockedClick = (label: string, requiredPlan: string) => {
    const planLabel = requiredPlan.toUpperCase();
    toast.info(`"${label}" nécessite le forfait ${planLabel}`, {
      description: 'Passez à un forfait supérieur pour accéder à cette fonctionnalité.',
      action: {
        label: 'Voir les forfaits',
        onClick: () => {
          setOpen(false);
          navigate('/pricing');
        }
      }
    });
  };

  const handleNavClick = () => {
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden">
          <Menu className="h-6 w-6" />
          <span className="sr-only">Menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 p-0 bg-sidebar border-sidebar-border">
        <VisuallyHidden>
          <SheetTitle>Menu de navigation</SheetTitle>
        </VisuallyHidden>
        {/* Header */}
        <div className="p-4 border-b border-sidebar-border flex items-center justify-between">
          <NavLink to="/" onClick={handleNavClick} className="flex items-center gap-3">
            <img src={optiflowLogo} alt="OptiFlow" className="w-8 h-8 object-contain" />
            <div>
              <h1 className="font-bold text-sidebar-foreground">OptiFlow</h1>
              <span className="text-xs text-sidebar-accent-foreground">Line Optimizer</span>
            </div>
          </NavLink>
          <Button variant="ghost" size="icon" onClick={() => setOpen(false)} className="text-sidebar-foreground">
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto max-h-[calc(100vh-80px)]">
          {navItems.map((item) => {
            const isActive = location.pathname === item.to;
            const label = NAV_LABELS[item.labelKey];
            
            if (item.requiredFeature && !hasFeature(item.requiredFeature)) {
              return null;
            }
            
            if (item.directionOnly && !isDirection) {
              return null;
            }
            
            // Check user-specific feature override
            if (item.userFeatureKey && !canAccessUserFeature(item.userFeatureKey)) {
              return null;
            }
            
            const isLocked = !isPlanSufficient(item.requiredPlan);
            
            if (isLocked) {
              return (
                <button
                  key={item.to}
                  onClick={() => handleLockedClick(label, item.requiredPlan!)}
                  className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sidebar-foreground/60 hover:bg-sidebar-accent transition-colors"
                >
                  <item.icon className="w-5 h-5" />
                  <span className="flex-1 text-left">{label}</span>
                  <Lock className="w-4 h-4" />
                </button>
              );
            }

            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={handleNavClick}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
                  isActive 
                    ? "bg-sidebar-primary text-sidebar-primary-foreground" 
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <item.icon className="w-5 h-5" />
                <span>{label}</span>
              </NavLink>
            );
          })}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
