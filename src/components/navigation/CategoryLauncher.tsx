import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useLicense } from '@/hooks/useLicense';
import { useTeam } from '@/hooks/useTeam';
import { useUserFeatureOverrides } from '@/hooks/useUserFeatureOverrides';
import { getVisibleNavCategories, type NavCategoryId } from '@/config/appNavigation';
import type { TeamRole } from '@/types/team';

/**
 * Lanceur d'accueil : 5 icônes de catégories métier qui réorganisent les
 * pages déjà existantes de l'application (aucune nouvelle fonctionnalité).
 */
export function CategoryLauncher() {
  const navigate = useNavigate();
  const { hasFeature, licenseData } = useLicense();
  const { isDirection: isDirectionFromTeam, currentUserRole } = useTeam();
  const isDirection = isDirectionFromTeam || licenseData?.userRole === 'direction';
  const role = currentUserRole || (licenseData?.userRole as TeamRole | null | undefined) || null;
  const { canAccess: canAccessUserFeature } = useUserFeatureOverrides();

  const categories = getVisibleNavCategories({ hasFeature, canAccessUserFeature, isDirection, role });
  const [selected, setSelected] = useState<NavCategoryId | null>(null);

  const selectedCategory = categories.find((c) => c.id === selected) ?? null;

  const handleSelect = (id: NavCategoryId) => {
    setSelected((current) => (current === id ? null : id));
  };

  if (categories.length === 0) return null;

  return (
    <Card className="col-span-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Accès par catégorie</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {categories.map((category) => {
            const isActive = category.id === selected;
            return (
              <button
                key={category.id}
                onClick={() => handleSelect(category.id)}
                className={cn(
                  "flex flex-col items-center gap-2 p-4 rounded-xl border transition-all hover:scale-105",
                  isActive
                    ? "border-primary bg-primary/10"
                    : "border-transparent hover:bg-muted/50"
                )}
              >
                <div
                  className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center",
                    isActive ? "bg-primary text-primary-foreground" : "bg-primary/15 text-primary"
                  )}
                >
                  <category.icon className="w-6 h-6" />
                </div>
                <span className="text-sm font-medium text-foreground text-center">
                  {category.label}
                </span>
              </button>
            );
          })}
        </div>

        {selectedCategory && (
          <div className="pt-2 border-t space-y-1 animate-fade-in">
            {selectedCategory.pages.map((page) => (
              <button
                key={page.to}
                onClick={() => navigate(page.to)}
                className="flex items-center justify-between w-full p-3 rounded-lg hover:bg-muted/50 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <page.icon className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">{page.label}</span>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
