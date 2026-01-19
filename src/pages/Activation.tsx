import { useState } from 'react';
import { Key, Mail, Loader2, AlertCircle, CheckCircle2, HelpCircle, ExternalLink, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLicense } from '@/hooks/useLicense';
import { z } from 'zod';
import optiflowLogo from '@/assets/optiflow-logo.svg';
import { useLanguage } from '@/i18n/LanguageContext';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { PricingPlansPage } from '@/components/settings/PricingPlansPage';
export default function Activation() {
  const {
    t
  } = useLanguage();
  const [showPricing, setShowPricing] = useState(false);
  const activationSchema = z.object({
    code: z.string().min(1, t.settings.licenseCode),
    email: z.string().email(t.errors.validationError).min(1, t.clients.email)
  });
  const {
    validateLicense
  } = useLicense();
  const [code, setCode] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    const validation = activationSchema.safeParse({
      code,
      email
    });
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
        setError(result.error || 'Erreur d\'activation');
      }
    } catch (e) {
      setError('Erreur de connexion au serveur');
    } finally {
      setLoading(false);
    }
  };
  if (showPricing) {
    return <PricingPlansPage onBack={() => setShowPricing(false)} />;
  }
  return <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <img src={optiflowLogo} alt="OptiFlow Logo" className="w-64 h-64 mx-auto mb-4 object-contain" />
          <h1 className="text-3xl font-bold text-foreground">Line Optimizer </h1>
          
        </div>

        {/* Activation Card */}
        <div className="glass-card p-8">
          <div className="text-center mb-6">
            <h2 className="text-xl font-semibold text-foreground">Connexion à votre compte</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Entrez vos identifiants pour accéder à votre espace
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code" className="flex items-center gap-2">
                <Key className="w-4 h-4 text-primary" />
                Code de licence
              </Label>
              <Input id="code" type="text" value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="XXXX-XXXX-XXXX-XXXX" className="font-mono text-center tracking-wider" disabled={loading || success} />
              <p className="text-xs text-muted-foreground">
                Votre code de licence vous a été envoyé par email lors de votre achat.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-primary" />
                Email associé à la licence
              </Label>
              <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="votre@email.com" disabled={loading || success} />
            </div>

            {error && <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>}

            {success && <div className="flex items-center gap-2 p-3 bg-success/10 border border-success/30 rounded-lg text-success text-sm">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                Connexion réussie ! Redirection en cours...
              </div>}

            <Button type="submit" variant="gradient" className="w-full" size="lg" disabled={loading || success}>
              {loading ? <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Connexion...
                </> : success ? <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Connecté
                </> : <>
                  <Key className="w-4 h-4 mr-2" />
                  Se connecter
                </>}
            </Button>
          </form>

          {/* Pricing button */}
          <div className="mt-4">
            <Button variant="outline" className="w-full" onClick={() => setShowPricing(true)}>
              <CreditCard className="w-4 h-4 mr-2" />
              Voir les forfaits
            </Button>
          </div>

          {/* Help Section */}
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
                  <div className="space-y-2">
                    <p className="font-medium text-foreground">Où trouver mon code de licence ?</p>
                    <p className="text-muted-foreground">
                      Votre code de licence vous a été envoyé par email lors de votre achat. 
                      Vérifiez vos spams si vous ne le trouvez pas.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="font-medium text-foreground">Je n'ai pas reçu mon code</p>
                    <p className="text-muted-foreground">
                      Contactez notre support à l'adresse{' '}
                      <a href="mailto:support@optiflow.fr" className="text-primary hover:underline">
                        support@optiflow.fr
                      </a>
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="font-medium text-foreground">Je souhaite acheter une licence</p>
                    <Button variant="outline" size="sm" className="w-full mt-1" asChild>
                      <a href="https://optiflow.fr/tarifs" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                        <ExternalLink className="w-4 h-4" />
                        Voir les tarifs
                      </a>
                    </Button>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </div>

        <p className="text-xs text-center text-muted-foreground mt-6">
          © {new Date().getFullYear()} OptiFlow - Tous droits réservés
        </p>
      </div>
    </div>;
}