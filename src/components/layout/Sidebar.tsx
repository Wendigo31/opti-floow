import { NavLink, useLocation, useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Lock, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLicense } from '@/hooks/useLicense';
import { useTeam } from '@/hooks/useTeam';
import { useUserFeatureOverrides } from '@/hooks/useUserFeatureOverrides';
import { useSidebarContext } from '@/context/SidebarContext';
import optiflowLogo from '@/assets/optiflow-logo.svg';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { NAV_CATEGORIES, canSeeNavPage, getCategoryIdForPath } from '@/config/appNavigation';

// Feature labels for the "restricted features" tooltip
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

export function Sidebar() {
  const { collapsed, toggleSidebar } = useSidebarContext();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { hasFeature, licenseData } = useLicense();
  const { isDirection: isDirectionFromTeam } = useTeam();
  // Fallback: use userRole from cached license data when auth session isn't ready
  const isDirection = isDirectionFromTeam || licenseData?.userRole === 'direction';
  const { canAccess: canAccessUserFeature } = useUserFeatureOverrides();

  // Get restricted features (user-specific overrides that are disabled)
  const restrictedFeatures = licenseData?.userFeatureOverrides?.filter(o => !o.enabled) || [];
  const restrictedFeaturesCount = restrictedFeatures.length;

  const getRestrictedFeatureLabels = () => {
    return restrictedFeatures.map(o =>
      FEATURE_LABELS[o.feature_key] || o.feature_key.replace(/_/g, ' ')
    );
  };

  const accessCtx = { hasFeature, canAccessUserFeature, isDirection };

  // La barre latérale n'apparaît que dans un espace (catégorie) sélectionné :
  // elle disparaît sur l'accueil et les pages transversales.
  const activeCategoryId = getCategoryIdForPath(location.pathname);
  const activeCategory = activeCategoryId
    ? NAV_CATEGORIES.find((c) => c.id === activeCategoryId)
    : null;
  const visiblePages = activeCategory
    ? activeCategory.pages.filter((page) => canSeeNavPage(page, accessCtx))
    : [];

  // Onglet actif : paramètre ?tab= dans un espace, sinon la route directe.
  const isWorkspace = location.pathname.startsWith('/espace/');
  const activePageTo = isWorkspace ? searchParams.get('tab') : location.pathname;

  if (!activeCategory || visiblePages.length === 0) return null;

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
              <span className="text-xs text-muted-foreground">Pilotage de rentabilité</span>
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

      {/* Navigation : uniquement les onglets de l'espace sélectionné */}
      <nav className="flex-1 p-3 space-y-4 overflow-y-auto">
        <div className="space-y-1">
          {!collapsed && (
            <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/50 flex items-center gap-1.5">
              <activeCategory.icon className="w-3 h-3" />
              {activeCategory.label}
            </p>
          )}
          {visiblePages.map((page) => {
            const isActive = activePageTo === page.to;
            return (
              <NavLink
                key={page.to}
                to={`/espace/${activeCategory.id}?tab=${page.to}`}
                className={cn(
                  "nav-item",
                  isActive && "active"
                )}
                title={page.label}
              >
                <page.icon className={cn("w-5 h-5 flex-shrink-0", isActive && "text-primary")} />
                {!collapsed && (
                  <span className="truncate flex-1">{page.label}</span>
                )}
              </NavLink>
            );
          })}
        </div>
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
