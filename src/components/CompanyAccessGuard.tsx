import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useLicense } from '@/hooks/useLicense';
import { useNavAccessContext } from '@/hooks/useVisibleNavigation';
import { canAccessPath } from '@/config/appNavigation';
import { CompanyContactGate } from '@/components/CompanyContactGate';
import { CentralBanner } from '@/components/CentralBanner';
import { ForcedPasswordChange } from '@/components/accounts/ForcedPasswordChange';

/**
 * Même contrôle que dans OptiFret et OptiXpress :
 * 1. Première connexion : tant que la Direction n'a pas saisi le téléphone et
 *    l'email de la société, toute la société est bloquée ;
 * 2. Une page hors du rôle de l'utilisateur, ou désactivée pour la société
 *    depuis OptiCentral, renvoie à l'accueil (y compris par lien direct).
 */
export function CompanyAccessGuard({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { licenseData, clearLicense, markPasswordChanged } = useLicense();
  const { ctx, access, licenseId, loading } = useNavAccessContext();

  if (licenseId && loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  // Mot de passe provisoire donné par la Direction / les RH : à remplacer d'abord.
  if (licenseData?.mustChangePassword) {
    return <ForcedPasswordChange name={licenseData.email} onDone={markPasswordChanged} onLogout={clearLicense} />;
  }

  if (licenseId && !access.contact_complete) {
    return (
      <>
        <CentralBanner licenseId={licenseId} />
        <CompanyContactGate
        licenseId={licenseId}
        companyName={access.company_name ?? licenseData?.companyName}
        isDirection={ctx.isDirection}
        code={licenseData?.code}
        userEmail={licenseData?.email}
        onLogout={clearLicense}
      />
      </>
    );
  }

  // Tant que le rôle n'est pas connu, on ne renvoie personne à tort.
  if ((ctx.role || ctx.isDirection) && !canAccessPath(location.pathname, ctx)) {
    return <Navigate to="/" replace />;
  }

  return (
    <>
      <CentralBanner licenseId={licenseId} />
      {children}
    </>
  );
}
