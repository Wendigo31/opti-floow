import { useMemo } from 'react';
import { getVisibleNavCategories } from '@/config/appNavigation';
import { useLicense } from '@/hooks/useLicense';
import { useTeam } from '@/hooks/useTeam';
import { useUserFeatureOverrides } from '@/hooks/useUserFeatureOverrides';
import { useLicenseContext } from '@/context/LicenseContext';
import { useCompanyAccess } from '@/lib/companyAccess';

/** Contexte d'accès commun au menu et au contrôle des routes. */
export function useNavAccessContext() {
  const { hasFeature } = useLicense();
  const { isDirection, currentUserRole: role, isLoading } = useTeam();
  const { canAccess } = useUserFeatureOverrides();
  const { licenseId } = useLicenseContext();
  const { access, loading } = useCompanyAccess(licenseId);
  const hiddenPaths = access.hidden_pages;
  const ctx = useMemo(
    () => ({ hasFeature, canAccessUserFeature: canAccess, isDirection, role, hiddenPaths }),
    [canAccess, hasFeature, isDirection, role, hiddenPaths],
  );
  return { ctx, access, licenseId, loading: loading || isLoading };
}

export function useVisibleNavigation() {
  const { hasFeature } = useLicense();
  // Seule la source serveur (company_users, via useTeam) fait foi pour le rôle :
  // un repli sur licenseData.userRole (mis en cache dans localStorage) serait
  // modifiable à la main par n'importe quel utilisateur et contournerait les
  // restrictions d'accès par espace (Comptabilité/RH visibles pour tout le
  // monde en modifiant une simple clé localStorage).
  const { isDirection, currentUserRole: role } = useTeam();
  const { canAccess } = useUserFeatureOverrides();
  const { licenseId } = useLicenseContext();
  const { access } = useCompanyAccess(licenseId);
  const hiddenPaths = access.hidden_pages;

  return useMemo(
    () =>
      getVisibleNavCategories({
        hasFeature,
        canAccessUserFeature: canAccess,
        isDirection,
        role,
        hiddenPaths,
      }),
    [canAccess, hasFeature, isDirection, role, hiddenPaths]
  );
}
