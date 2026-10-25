import { useState, useEffect } from 'react';
import { Key, Mail, Loader2, AlertCircle, CheckCircle2, HelpCircle, Users, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useLicense } from '@/hooks/useLicense';
import { z } from 'zod';
import optiflowLogo from '@/assets/optiflow-logo.svg';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import OnboardingFlow from '@/components/onboarding/OnboardingFlow';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import LegalTabs from '@/components/settings/LegalTabs';
import { currentCompanySlug, forgetCompanySlug, resolveCompanyLink, type LinkedCompany } from '@/lib/companyLink';


export default function Activation() {
  const activationSchema = z.object({
    code: z.string().min(1, 'Code licence requis'),
    email: z.string().email('Email invalide').min(1, 'Email requis')
  });

  const { validateLicense, loginWithPassword } = useLicense();
  // Connexion habituelle : email (ou identifiant) + mot de passe ; l'identifiant société reste possible.
  const [mode, setMode] = useState<'password' | 'code'>('password');
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showLegal, setShowLegal] = useState(false);

  // Page ouverte depuis le lien de la société (?societe=…) : connexion à son
  // nom, sans identifiant société à saisir.
  const [companySlug, setCompanySlug] = useState<string | null>(() => currentCompanySlug());
  const [company, setCompany] = useState<LinkedCompany | null>(null);
  const [companyStatus, setCompanyStatus] = useState<'none' | 'loading' | 'found' | 'not-found'>(companySlug ? 'loading' : 'none');
  useEffect(() => {
    if (!companySlug) return;
    let cancelled = false;
    resolveCompanyLink(companySlug)
      .then((c) => {
        if (cancelled) return;
        setCompany(c);
        setCompanyStatus(c ? 'found' : 'not-found');
      })
      .catch(() => !cancelled && setCompanyStatus('not-found'));
    return () => {
      cancelled = true;
    };
  }, [companySlug]);
  const linkedCompany = companyStatus === 'found' && company ? company : null;

  const leaveCompanyLink = () => {
    forgetCompanySlug();
    setCompanySlug(null);
    setCompany(null);
    setCompanyStatus('none');
  };

  // Check if returning from Stripe checkout
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('onboarding') === 'success' && params.get('session_id')) {
      setShowOnboarding(true);
    }
  }, []);

  const handleOnboardingComplete = (companyIdentifier: string, userEmail: string) => {
    leaveCompanyLink();
    setCode(companyIdentifier);
    setEmail(userEmail);
    setShowOnboarding(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (mode === 'password') {
      if (!login.trim() || !password) {
        setError('Saisissez votre email (ou identifiant) et votre mot de passe');
        return;
      }
      setLoading(true);
      try {
        const result = await loginWithPassword(login, password);
        if (result.success) {
          setSuccess(true);
          setTimeout(() => window.location.reload(), 600);
        } else {
          setError(result.error || 'Connexion impossible');
        }
      } finally {
        setLoading(false);
      }
      return;
    }

    const validation = activationSchema.safeParse({ code: linkedCompany ? linkedCompany.slug : code, email });
    if (!validation.success) {
      setError(validation.error.errors[0].message);
      return;
    }

    setLoading(true);
    try {
      const result = linkedCompany
        ? await validateLicense('', email, linkedCompany.slug)
        : await validateLicense(code, email);
      if (result.success) {
        setSuccess(true);
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        setError(result.error || "Erreur d'activation");
      }
    } catch (e) {
      setError('Erreur de connexion au serveur');
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-start p-4 pt-8 gap-8 pb-16">
      {/* Logo */}
      <div className="text-center">
        <img src={optiflowLogo} alt="OptiFlow Logo" className="w-48 h-48 mx-auto mb-2 object-contain" />
        
      </div>

      {/* Main content */}
      <div className="w-full max-w-5xl flex flex-col items-center gap-8">
        
        {/* Login Card */}
        <div className="glass-card p-8 w-full max-w-md">
          <div className="text-center mb-6">
            {linkedCompany && (
              <div className="flex items-center justify-center gap-2 text-sm font-medium text-primary mb-1">
                <Building2 className="w-4 h-4" />
                <span>{linkedCompany.name}</span>
              </div>
            )}
            <h2 className="text-xl font-semibold text-foreground">Connexion</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Entrez vos identifiants pour accéder à votre espace
            </p>
          </div>

          {companyStatus === 'not-found' && (
            <div className="flex items-start gap-2 p-3 mb-4 rounded-lg text-sm bg-muted text-muted-foreground">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>Ce lien de société n'est pas reconnu : saisissez votre identifiant société.</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'password' ? (
            <>
            <div className="space-y-2">
              <Label htmlFor="login" className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-primary" />
                Email ou identifiant
              </Label>
              <Input
                id="login"
                type="text"
                autoCapitalize="none"
                autoComplete="username"
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                placeholder="votre@email.com ou identifiant"
                disabled={loading || success} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="flex items-center gap-2">
                <Key className="w-4 h-4 text-primary" />
                Mot de passe
              </Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading || success} />
              <p className="text-xs text-muted-foreground">
                Pas encore de mot de passe ? Demandez-le à votre direction ou à vos RH.
              </p>
            </div>
            </>
            ) : (
            <>
            {linkedCompany ? (
            <p className="text-xs text-center text-muted-foreground">
              Pas votre société ?{' '}
              <button type="button" onClick={leaveCompanyLink} className="text-primary hover:underline">
                Saisir un autre identifiant
              </button>
            </p>
            ) : (
            <div className="space-y-2">
              <Label htmlFor="code" className="flex items-center gap-2">
                <Key className="w-4 h-4 text-primary" />
                Identifiant société
              </Label>
              <Input
                id="code"
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="TRANSPORT-MARTIN"
                className="font-mono text-center tracking-wider"
                disabled={loading || success || companyStatus === 'loading'} />
              
            </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-primary" />
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="votre@email.com"
                disabled={loading || success} />
              
            </div>
            </>
            )}

            {error &&
            <div className={`flex items-start gap-2 p-3 rounded-lg text-sm ${
            error.includes('simultanée') ?
            'bg-warning/10 border border-warning/30 text-warning-foreground' :
            'bg-destructive/10 border border-destructive/30 text-destructive'}`
            }>
                {error.includes('simultanée') ?
              <Users className="w-4 h-4 flex-shrink-0 mt-0.5 text-warning" /> :

              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              }
                <div>
                  <p className="font-medium">{error.includes('simultanée') ? 'Connexion simultanée détectée' : 'Erreur'}</p>
                  <p className="text-xs mt-1 opacity-80">{error}</p>
                </div>
              </div>
            }

            {success &&
            <div className="flex items-center gap-2 p-3 bg-success/10 border border-success/30 rounded-lg text-success text-sm">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                Connexion réussie !
              </div>
            }

            <div className="flex items-start gap-2">
              <Checkbox
                id="terms"
                checked={acceptedTerms}
                onCheckedChange={(checked) => setAcceptedTerms(checked === true)}
                disabled={loading || success} />
              
              <label htmlFor="terms" className="text-xs text-muted-foreground leading-tight cursor-pointer">
                J'accepte les{' '}
                <button
                  type="button"
                  onClick={() => setShowLegal(true)}
                  className="text-primary hover:underline font-medium">
                  
                  Conditions Générales de Vente et d'Utilisation (CGVU)
                </button>
                {' '}et la{' '}
                <button
                  type="button"
                  onClick={() => setShowLegal(true)}
                  className="text-primary hover:underline font-medium">
                  
                  Politique de Confidentialité
                </button>
              </label>
            </div>

            <Button type="submit" variant="gradient" className="w-full" size="lg" disabled={loading || success || !acceptedTerms}>
              {loading ?
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Connexion...</> :
              success ?
              <><CheckCircle2 className="w-4 h-4 mr-2" />Connecté</> :

              <><Key className="w-4 h-4 mr-2" />Se connecter</>
              }
            </Button>
          </form>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            <button type="button" className="hover:underline" onClick={() => { setMode(mode === 'password' ? 'code' : 'password'); setError(null); }}>
              {mode === 'password' ? 'Connexion avec un identifiant société (ancienne méthode)' : '← Connexion avec email et mot de passe'}
            </button>
          </p>

          <div className="mt-6 pt-6 border-t border-border">
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="help" className="border-none">
                <AccordionTrigger className="text-sm text-muted-foreground hover:text-foreground py-2 hover:no-underline">
                  <div className="flex items-center gap-2">
                    <HelpCircle className="w-4 h-4" />
                    Besoin d'aide ?
                  </div>
                </AccordionTrigger>
                <AccordionContent className="text-sm space-y-3 pt-2">
                  <p className="text-muted-foreground">
                    Contactez votre administrateur ou{' '}
                    <a href="mailto:support@opti-group.fr" className="text-primary hover:underline">support@opti-group.fr</a>
                  </p>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </div>
      </div>

      <p className="text-xs text-center text-muted-foreground">
        © {new Date().getFullYear()} OptiFlow - Tous droits réservés
      </p>

      <OnboardingFlow
        open={showOnboarding}
        onOpenChange={setShowOnboarding}
        onComplete={handleOnboardingComplete} />
      

      <Dialog open={showLegal} onOpenChange={setShowLegal}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Conditions Générales & Politique de Confidentialité</DialogTitle>
          </DialogHeader>
          <LegalTabs />
        </DialogContent>
      </Dialog>
    </div>);

}