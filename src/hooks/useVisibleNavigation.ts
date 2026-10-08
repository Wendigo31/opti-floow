import { useMemo } from 'react';
import { APP_NAVIGATION } from '@/config/appNavigation';
import { useLicense } from '@/hooks/useLicense';
import { useTeam } from '@/hooks/useTeam';
import { useUserFeatureOverrides } from '@/hooks/useUserFeatureOverrides';

export function useVisibleNavigation() {
  const { hasFeature, licenseData } = useLicense();
  const { isDirection: isDirectionFromTeam } = useTeam();
  const { canAccess } = useUserFeatureOverrides();
  const isDirection = isDirectionFromTeam || licenseData?.userRole === 'direction';

  return useMemo(() => APP_NAVIGATION.map((category) => ({
    ...category,
    items: category.items.filter((item) => {
      if (item.requiredFeature && !hasFeature(item.requiredFeature)) return false;
      if (item.userFeatureKey && !canAccess(item.userFeatureKey)) return false;
      return !item.directionOnly || isDirection;
    }),
  })), [canAccess, hasFeature, isDirection]);
}