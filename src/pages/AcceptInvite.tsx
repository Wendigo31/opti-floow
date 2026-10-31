import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Loader2, CheckCircle2, AlertCircle, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useLicense } from '@/hooks/useLicense';
import optiflowLogo from '@/assets/optiflow-logo-full.svg';

/**
 * Page d'activation d'une invitation envoyée par invite-teammate (édge
 * function) : la personne arrive ici depuis le lien d'activation reçu par
 * email (Supabase a déjà établi une session à partir du jeton dans l'URL au
 * chargement de la page), choisit son mot de passe, puis l'activation se
 * termine en rebranchant sur le même chemin (validateLicense) que les
 * membres déjà présents — le code de licence nécessaire est passé par
 * l'edge function dans l'URL de redirection (`?lc=...`), la personne n'a
 * rien à ressaisir.
 *
 * Route spéciale, en dehors du flux normal (licence requise) : voir
 * src/App.tsx (isAcceptInviteRoute, comme /presentation et /admin).
 */
export default function AcceptInvite() {
  const [searchParams] = useSearchParams();
  const licenseCode = searchParams.get('lc');
  const { validateLicense } = useLicense();

  const [step, setStep] = useState<'checking' | 'form' | 'activating' | 'done' | 'error'>('checking');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Supabase traite le jeton d'invitation présent dans l'URL (hash) au
  // chargement de la page et établit automatiquement une session — on
  // attend juste qu'elle soit disponible avant d'afficher le formulaire.
  useEffect(() => {
    let isMounted = true;

    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!isMounted) return;
      if (session?.user) {
        setStep('form');
        return;
      }
      setStep('error');
      setErrorMessage("Ce lien d'invitation est invalide ou a expiré. Demandez à votre entreprise de vous envoyer une nouvelle invitation.");
    };

    void check();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;
      if (event === 'SIGNED_IN' && session?.user) {
        setStep((current) => (current === 'checking' ? 'form' : current));
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (password.length < 8) {
      setErrorMessage('Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Les mots de passe ne correspondent pas.');
      return;
    }
    if (!licenseCode) {
      setErrorMessage("Lien d'invitation incomplet (code de licence manquant). Demandez à votre entreprise de vous envoyer une nouvelle invitation.");
      return;
    }

    setSubmitting(true);
    try {
      const { data: { user }, error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError || !user?.email) {
        setErrorMessage("Impossible de définir le mot de passe. Réessayez ou demandez une nouvelle invitation.");
        setSubmitting(false);
        return;
      }

      setStep('activating');
      const result = await validateLicense(licenseCode, user.email);
      if (!result.success) {
        setErrorMessage(result.error || "Votre mot de passe a été défini, mais l'activation de votre accès a échoué. Contactez votre entreprise.");
        setStep('form');
        setSubmitting(false);
        return;
      }

      setStep('done');
      // Rechargement complet (plutôt qu'une navigation interne) pour que
      // useLicense() se réinitialise proprement depuis le localStorage que
      // validateLicense vient de remplir, en dehors de cette route spéciale.
      window.setTimeout(() => {
        window.location.href = '/';
      }, 1200);
    } catch {
      setErrorMessage('Erreur inattendue. Réessayez.');
      setStep('form');
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <img src={optiflowLogo} alt="OptiFlow" className="h-12" />
        </div>

        <div className="bg-card border border-border rounded-xl p-8 shadow-sm">
          {step === 'checking' && (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground">Vérification de votre invitation...</p>
            </div>
          )}

          {step === 'form' && (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="text-center mb-2">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <Lock className="h-6 w-6 text-primary" />
                </div>
                <h1 className="text-xl font-semibold text-foreground">Choisissez votre mot de passe</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Dernière étape pour accéder à OptiFlow.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Mot de passe</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="8 caractères minimum"
                  autoComplete="new-password"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                />
              </div>

              {errorMessage && (
                <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/30">
                  <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                  <p className="text-sm text-destructive">{errorMessage}</p>
                </div>
              )}

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Activer mon accès'}
              </Button>
            </form>
          )}

          {step === 'activating' && (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground">Activation de votre accès...</p>
            </div>
          )}

          {step === 'done' && (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
              <p className="text-foreground font-medium">Votre accès est activé</p>
              <p className="text-sm text-muted-foreground">Redirection vers OptiFlow...</p>
            </div>
          )}

          {step === 'error' && (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <AlertCircle className="h-10 w-10 text-destructive" />
              <p className="text-foreground font-medium">Lien d'invitation invalide</p>
              {errorMessage && <p className="text-sm text-muted-foreground">{errorMessage}</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
