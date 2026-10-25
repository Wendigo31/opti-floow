import { useEffect, useState } from 'react';
import { useLicense } from '@/hooks/useLicense';
import optiflowLogo from '@/assets/optiflow-logo.svg';
import OnboardingFlow from '@/components/onboarding/OnboardingFlow';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import LegalTabs from '@/components/settings/LegalTabs';
import { LoginForm } from '@/components/accounts/LoginForm';

/**
 * Connexion — identique dans les 3 logiciels : logo, email / identifiant (partie de
 * l'email avant le @) et mot de passe personnel. Le compte est créé par la Direction,
 * les RH ou OptiCentral avec un mot de passe provisoire, remplacé à la première connexion.
 */
export default function Activation() {
  const { validateLicense, loginWithPassword } = useLicense();
  const [showLegal, setShowLegal] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Retour du paiement Stripe : fin de l'inscription.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('onboarding') === 'success' && params.get('session_id')) setShowOnboarding(true);
  }, []);

  // Société tout juste inscrite (pas encore de mot de passe) : connexion directe avec son identifiant.
  const handleOnboardingComplete = async (companyIdentifier: string, userEmail: string) => {
    setShowOnboarding(false);
    const r = await validateLicense(companyIdentifier, userEmail);
    if (r.success) window.location.reload();
  };

  return (
    <>
      <LoginForm
        logo={optiflowLogo}
        appName="OptiFlow"
        onSubmit={async (login, password) => {
          const r = await loginWithPassword(login, password);
          if (!r.success) return r.error || 'Connexion impossible';
          window.location.reload();
          return null;
        }}
        footer={
          <p className="text-center text-[11px] leading-tight text-muted-foreground">
            En vous connectant, vous acceptez les{' '}
            <button type="button" onClick={() => setShowLegal(true)} className="underline hover:text-foreground">
              CGVU et la politique de confidentialité
            </button>
            .
          </p>
        }
      />

      <OnboardingFlow open={showOnboarding} onOpenChange={setShowOnboarding} onComplete={handleOnboardingComplete} />

      <Dialog open={showLegal} onOpenChange={setShowLegal}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Conditions Générales & Politique de Confidentialité</DialogTitle>
          </DialogHeader>
          <LegalTabs />
        </DialogContent>
      </Dialog>
    </>
  );
}
