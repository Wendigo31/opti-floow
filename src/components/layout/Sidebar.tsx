import { ChevronDown, ChevronLeft, ChevronRight, EyeOff, Lock } from 'lucide-react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useLicense } from '@/hooks/useLicense';
import { useVisibleNavigation } from '@/hooks/useVisibleNavigation';
import { useSidebarContext } from '@/context/SidebarContext';
import { isNavigationItemActive, type AppNavigationCategory } from '@/config/appNavigation';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import optiflowLogo from '@/assets/optiflow-logo.svg';

const FEATURE_LABELS: Record<string, string> = {
  page_dashboard: 'Tableau de bord', page_calculator: 'Calculateur', page_itinerary: 'Itinéraire',
  page_tours: 'Tournées', page_clients: 'Clients', page_vehicles: 'Véhicules',
  page_drivers: 'Conducteurs', page_charges: 'Charges', page_forecast: 'Prévisionnel',
  page_ai_analysis: 'Analyse IA', btn_export_pdf: 'Export PDF', btn_export_excel: 'Export Excel',
  btn_ai_optimize: 'Optimisation IA',
};

export function Sidebar() {
  const { collapsed, toggleSidebar } = useSidebarContext();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { licenseData } = useLicense();
  const categories = useVisibleNavigation();
  const [openCategories, setOpenCategories] = useState<Set<AppNavigationCategory['id']>>(() => new Set(categories.filter((category) => category.items.some((item) => isNavigationItemActive(item, pathname))).map((category) => category.id)));
  const restrictedFeatures = licenseData?.userFeatureOverrides?.filter((override) => !override.enabled) ?? [];

  const toggleCategory = (id: AppNavigationCategory['id'], open: boolean) => setOpenCategories((current) => {
    const next = new Set(current);
    open ? next.add(id) : next.delete(id);
    return next;
  });

  return (
    <aside className={cn('fixed left-0 top-0 z-50 flex h-screen flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300 no-print', collapsed ? 'w-20' : 'w-64')}>
      <div className="border-b border-sidebar-border p-5">
        <NavLink to="/" className="flex items-center gap-3 text-sidebar-foreground transition-opacity hover:opacity-80">
          <img src={optiflowLogo} alt="OptiFlow" className="h-10 w-10 object-contain" />
          {!collapsed && <div><h1 className="font-bold">OptiFlow</h1><span className="text-xs text-sidebar-foreground/60">Pilotage de rentabilité</span></div>}
        </NavLink>
      </div>

      {restrictedFeatures.length > 0 && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <NavLink to="/my-restrictions" className={cn('mx-3 mt-3 flex items-center gap-2 border border-destructive/30 bg-destructive/10 p-3 text-destructive', collapsed && 'justify-center p-2')}>
                <EyeOff className="h-4 w-4 shrink-0" />
                {!collapsed && <span className="text-xs font-medium">{restrictedFeatures.length} restriction{restrictedFeatures.length > 1 ? 's' : ''}</span>}
              </NavLink>
            </TooltipTrigger>
            <TooltipContent side="right" className="max-w-xs">
              <p className="mb-2 font-medium">Fonctionnalités restreintes</p>
              {restrictedFeatures.map((override) => <p key={override.feature_key} className="flex gap-2 text-xs"><Lock className="h-3 w-3" />{FEATURE_LABELS[override.feature_key] ?? override.feature_key.replace(/_/g, ' ')}</p>)}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      <nav className="flex-1 space-y-2 overflow-y-auto p-3">
        {categories.map((category) => {
          if (category.items.length === 0) return null;
          const active = category.items.some((item) => isNavigationItemActive(item, pathname));
          const open = collapsed || active || openCategories.has(category.id);
          return (
            <Collapsible key={category.id} open={open} onOpenChange={(value) => toggleCategory(category.id, value)}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className={cn('w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground', collapsed ? 'px-0' : 'px-3', active && 'text-sidebar-primary')} title={category.label} onClick={() => { if (collapsed) navigate(category.items[0].to); }}>
                  <category.icon className="h-5 w-5 shrink-0" />
                  {!collapsed && <><span className="min-w-0 flex-1 truncate text-left text-xs font-semibold">{category.label}</span><ChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} /></>}
                </Button>
              </CollapsibleTrigger>
              {!collapsed && <CollapsibleContent className="ml-4 border-l border-sidebar-border pl-2">
                {category.items.map((item) => {
                  const itemActive = isNavigationItemActive(item, pathname);
                  return <NavLink key={item.to} to={item.to} className={cn('mt-1 flex min-h-9 items-center gap-2 px-3 py-2 text-sm text-sidebar-foreground/75 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground', itemActive && 'bg-sidebar-accent text-sidebar-primary')}><item.icon className="h-4 w-4" /><span>{item.label}</span></NavLink>;
                })}
              </CollapsibleContent>}
            </Collapsible>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <Button variant="ghost" onClick={toggleSidebar} className="w-full text-sidebar-foreground hover:bg-sidebar-accent" aria-label={collapsed ? 'Agrandir le menu' : 'Réduire le menu'}>
          {collapsed ? <ChevronRight /> : <><ChevronLeft /><span>Réduire</span></>}
        </Button>
      </div>
    </aside>
  );
}