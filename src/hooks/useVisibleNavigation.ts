import { useMemo } from 'react';
import { getVisibleNavCategories } from '@/config/appNavigation';
import { useLicense } from '@/hooks/useLicense';
import { useTeam } from '@/hooks/useTeam';
import { useUserFeatureOverrides } from '@/hooks/useUserFeatureOverrides';

export function useVisibleNavigation() {
  const { hasFeature } = useLicense();
  // Seule la source serveur (company_users, via useTeam) fait foi pour le rôle :
  // un repli sur licenseData.userRole (mis en cache dans localStorage) serait
  // modifiable à la main par n'importe quel utilisateur et contournerait les
  // restrictions d'accès par espace (Comptabilité/RH visibles pour tout le
  // monde en modifiant une simple clé localStorage).
  const { isDirection, currentUserRole: role } = useTeam();
  const { canAccess } = useUserFeatureOverrides();

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
