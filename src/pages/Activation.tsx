import { useState, useEffect } from 'react';
import { Key, Mail, Loader2, AlertCircle, CheckCircle2, HelpCircle, Users } from 'lucide-react';
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


export default function Activation() {
  const activationSchema = z.object({
    code: z.string().min(1, 'Code licence requis'),
    email: z.string().email('Email invalide').min(1, 'Email requis')
  });

  const { validateLicense } = useLicense();
  const [code, setCode] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showLegal, setShowLegal] = useState(false);

  // Check if returning from Stripe checkout
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('onboarding') === 'success' && params.get('session_id')) {
      setShowOnboarding(true);
    }
  }, []);

  const handleOnboardingComplete = (companyIdentifier: string, userEmail: string) => {
    setCode(companyIdentifier);
    setEmail(userEmail);
    setShowOnboarding(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    const validation = activationSchema.safeParse({ code, email });
    if (!validation.success) {
      setError(validation.error.errors[0].message);
      return;
    }

    setLoading(true);
    try {
      const result = await validateLicense(code, email);
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
            <h2 className="text-xl font-semibold text-foreground">Connexion</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Entrez vos identifiants pour accéder à votre espace
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
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
                disabled={loading || success} />
              
            </div>

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

      {/* Detailed Pricing Section */}
      <PricingSection onChoosePlan={() => setShowOnboarding(true)} />


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