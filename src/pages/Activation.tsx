import { useState } from 'react';
import { Key, Mail, Loader2, AlertCircle, CheckCircle2, HelpCircle, ExternalLink, CreditCard, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLicense } from '@/hooks/useLicense';
import { z } from 'zod';
import optiflowLogo from '@/assets/optiflow-logo.svg';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { PricingPlansPage } from '@/components/settings/PricingPlansPage';

export default function Activation() {
  const [showPricing, setShowPricing] = useState(false);
  
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
  
  if (showPricing) {
    return <PricingPlansPage onBack={() => setShowPricing(false)} />;
  }
  
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <img src={optiflowLogo} alt="OptiFlow Logo" className="w-64 h-64 mx-auto mb-4 object-contain" />
          <h1 className="text-3xl font-bold text-foreground">Line Optimizer</h1>
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
                Identifiant société
              </Label>
              <Input 
                id="code" 
                type="text" 
                value={code} 
                onChange={e => setCode(e.target.value.toUpperCase())} 
                placeholder="TRANSPORT-MARTIN" 
                className="font-mono text-center tracking-wider" 
                disabled={loading || success} 
              />
              <p className="text-xs text-muted-foreground">
                L'identifiant de votre société vous a été communiqué par votre administrateur.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-primary" />
                Email associé à la licence
              </Label>
              <Input 
                id="email" 
                type="email" 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                placeholder="votre@email.com" 
                disabled={loading || success} 
              />
            </div>

            {error && (
              <div className={`flex items-start gap-2 p-3 rounded-lg text-sm ${
                error.includes('simultanée') 
                  ? 'bg-warning/10 border border-warning/30 text-warning-foreground' 
                  : 'bg-destructive/10 border border-destructive/30 text-destructive'
              }`}>
                {error.includes('simultanée') ? (
                  <Users className="w-4 h-4 flex-shrink-0 mt-0.5 text-warning" />
                ) : (
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                )}
                <div>
                  <p className="font-medium">{error.includes('simultanée') ? 'Connexion simultanée détectée' : 'Erreur'}</p>
                  <p className="text-xs mt-1 opacity-80">{error}</p>
                </div>
              </div>
            )}

            {success && (
              <div className="flex items-center gap-2 p-3 bg-success/10 border border-success/30 rounded-lg text-success text-sm">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                Connexion réussie ! Redirection en cours...
              </div>
            )}

            <Button type="submit" variant="gradient" className="w-full" size="lg" disabled={loading || success}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Connexion...
                </>
              ) : success ? (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Connecté
                </>
              ) : (
                <>
                  <Key className="w-4 h-4 mr-2" />
                  Se connecter
                </>
              )}
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
                    <p className="font-medium text-foreground">Où trouver mon identifiant société ?</p>
                    <p className="text-muted-foreground">
                      Votre identifiant société vous a été communiqué par votre administrateur. 
                      Si vous ne l'avez pas, contactez la direction de votre entreprise.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="font-medium text-foreground">Je n'ai pas reçu mon identifiant</p>
                    <p className="text-muted-foreground">
                      Contactez votre administrateur ou notre support à l'adresse{' '}
                      <a href="mailto:support@opti-group.fr" className="text-primary hover:underline">
                        support@opti-group.fr
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
    </div>
  );
}
