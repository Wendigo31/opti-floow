import { useMemo } from 'react';
import { getVisibleNavCategories } from '@/config/appNavigation';
import { useLicense } from '@/hooks/useLicense';
import { useTeam } from '@/hooks/useTeam';
import { useUserFeatureOverrides } from '@/hooks/useUserFeatureOverrides';
import type { TeamRole } from '@/types/team';

export function useVisibleNavigation() {
  const { hasFeature, licenseData } = useLicense();
  const { isDirection: isDirectionFromTeam, currentUserRole } = useTeam();
  const { canAccess } = useUserFeatureOverrides();
  const isDirection = isDirectionFromTeam || licenseData?.userRole === 'direction';
  const role = currentUserRole || (licenseData?.userRole as TeamRole | null | undefined) || null;

  return useMemo(
    () =>
      getVisibleNavCategories({
        hasFeature,
        canAccessUserFeature: canAccess,
        isDirection,
        role,
      }),
    [canAccess, hasFeature, isDirection, role]
  );
}
