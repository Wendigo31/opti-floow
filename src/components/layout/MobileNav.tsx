import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLicense } from '@/hooks/useLicense';
import { useTeam } from '@/hooks/useTeam';
import { useUserFeatureOverrides } from '@/hooks/useUserFeatureOverrides';
import optiflowLogo from '@/assets/optiflow-logo.svg';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { NAV_CATEGORIES, canSeeNavPage, canSeeNavCategory } from '@/config/appNavigation';
import type { TeamRole } from '@/types/team';

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const { hasFeature } = useLicense();
  const { isDirection: isDirectionFromTeam, currentUserRole } = useTeam();
  const { licenseData } = useLicense();
  const isDirection = isDirectionFromTeam || licenseData?.userRole === 'direction';
  const role = currentUserRole || (licenseData?.userRole as TeamRole | null | undefined) || null;
  const { canAccess: canAccessUserFeature } = useUserFeatureOverrides();

  const accessCtx = { hasFeature, canAccessUserFeature, isDirection, role };

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
              <span className="text-xs text-sidebar-accent-foreground">Pilotage de rentabilité</span>
            </div>
          </NavLink>
          <Button variant="ghost" size="icon" onClick={() => setOpen(false)} className="text-sidebar-foreground">
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Navigation grouped by the 5 business categories */}
        <nav className="flex-1 p-4 space-y-4 overflow-y-auto max-h-[calc(100vh-80px)]">
          {NAV_CATEGORIES.map((category) => {
            if (!canSeeNavCategory(category, accessCtx)) return null;
            const visiblePages = category.pages.filter((page) => canSeeNavPage(page, accessCtx));
            if (visiblePages.length === 0) return null;

            return (
              <div key={category.id} className="space-y-1">
                <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/50 flex items-center gap-1.5">
                  <category.icon className="w-3 h-3" />
                  {category.label}
                </p>
                {visiblePages.map((page) => {
                  const isActive = location.pathname === page.to;
                  return (
                    <NavLink
                      key={page.to}
                      to={page.to}
                      onClick={handleNavClick}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
                        isActive
                          ? "bg-sidebar-primary text-sidebar-primary-foreground"
                          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      )}
                    >
                      <page.icon className="w-5 h-5" />
                      <span>{page.label}</span>
                    </NavLink>
                  );
                })}
              </div>
            );
          })}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
