import { useMemo } from 'react';
import { getVisibleNavCategories } from '@/config/appNavigation';
import { useLicense } from '@/hooks/useLicense';
import { useTeam } from '@/hooks/useTeam';
import { useUserFeatureOverrides } from '@/hooks/useUserFeatureOverrides';

export function useVisibleNavigation() {
  const { hasFeature, licenseData } = useLicense();
  const { isDirection: isDirectionFromTeam } = useTeam();
  const { canAccess } = useUserFeatureOverrides();
  const isDirection = isDirectionFromTeam || licenseData?.userRole === 'direction';

  return useMemo(
    () =>
      getVisibleNavCategories({
        hasFeature,
        canAccessUserFeature: canAccess,
        isDirection,
      }),
    [canAccess, hasFeature, isDirection]
  );
}
