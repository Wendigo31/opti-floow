import { useState, useEffect } from 'react';
import { Key, Mail, Loader2, AlertCircle, CheckCircle2, HelpCircle, ExternalLink, Users, CreditCard, Check, X, Rocket, Star, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLicense } from '@/hooks/useLicense';
import { z } from 'zod';
import optiflowLogo from '@/assets/optiflow-logo.svg';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import OnboardingFlow from '@/components/onboarding/OnboardingFlow';

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

  const plans = [
    {
      name: 'Start',
      icon: Rocket,
      price: '49,99€',
      period: '/mois TTC',
      yearly: '549€/an (-8%)',
      color: 'from-emerald-500 to-teal-600',
      subtitle: 'Découverte',
      description: 'Pour tester les bases du calcul de coûts.',
      limitations: ['Limité à 5 calculs/jour', 'Pas de planning ni d\'IA', 'Pas de gestion d\'équipe'],
      features: {
        calculs: '5 / jour',
        itineraire: 'Basique',
        tournees: '5 max',
        planning: false,
        analyse: false,
        vehicules: '5 max',
        conducteurs: '5 max',
        clients: '10 max',
        devis: false,
        equipe: false,
        previsions: false,
        exportPdf: false,
      },
    },
    {
      name: 'Pro',
      icon: Star,
      price: '132,99€',
      period: '/mois TTC',
      yearly: '1 399€/an (-12%)',
      color: 'from-blue-500 to-indigo-600',
      popular: true,
      subtitle: 'Croissance',
      description: 'Pour les PME qui veulent optimiser leurs coûts.',
      limitations: ['Limité à 25 calculs/jour', '15 véhicules max', 'Pas de gestion d\'équipe'],
      features: {
        calculs: '25 / jour',
        itineraire: 'Complet',
        tournees: '20 max',
        planning: true,
        analyse: '5 / jour',
        vehicules: '15 max',
        conducteurs: '15 max',
        clients: '30 max',
        devis: false,
        equipe: false,
        previsions: false,
        exportPdf: true,
      },
    },
    {
      name: 'Enterprise',
      icon: Crown,
      price: '249€',
      period: '/mois TTC',
      yearly: '2 199€/an (-27%)',
      color: 'from-amber-500 to-orange-600',
      bestValue: true,
      subtitle: 'Performance maximale',
      description: 'Tout illimité. L\'outil complet pour piloter votre rentabilité.',
      limitations: [],
      features: {
        calculs: 'Illimité',
        itineraire: 'Complet + PL',
        tournees: 'Illimité',
        planning: true,
        analyse: 'Illimité',
        vehicules: 'Illimité',
        conducteurs: 'Illimité',
        clients: 'Illimité',
        devis: true,
        equipe: true,
        previsions: true,
        exportPdf: true,
      },
    },
  ];

  const featureLabels: Record<string, string> = {
    calculs: 'Calculs de coûts',
    itineraire: 'Itinéraire PL',
    tournees: 'Tournées sauvegardées',
    planning: 'Planning conducteurs',
    analyse: 'Analyse IA',
    vehicules: 'Véhicules',
    conducteurs: 'Conducteurs',
    clients: 'Clients',
    devis: 'Devis & facturation',
    equipe: 'Multi-utilisateurs & équipe',
    previsions: 'Prévisions & forecast',
    exportPdf: 'Export PDF avancé',
  };

  const renderFeatureValue = (value: string | boolean) => {
    if (value === true) return <Check className="w-4 h-4 text-primary mx-auto" />;
    if (value === false) return <X className="w-4 h-4 text-destructive/50 mx-auto" />;
    return <span className="text-sm font-medium text-foreground">{value}</span>;
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-start p-4 pt-8 gap-8">
      {/* Logo */}
      <div className="text-center">
        <img src={optiflowLogo} alt="OptiFlow Logo" className="w-48 h-48 mx-auto mb-2 object-contain" />
        <h1 className="text-3xl font-bold text-foreground">Line Optimizer</h1>
      </div>

      {/* Main grid: Login + Comparison */}
      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-8 items-start">
        
        {/* Login Card */}
        <div className="glass-card p-8">
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
                onChange={e => setCode(e.target.value.toUpperCase())} 
                placeholder="TRANSPORT-MARTIN" 
                className="font-mono text-center tracking-wider" 
                disabled={loading || success} 
              />
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
                Connexion réussie !
              </div>
            )}

            <Button type="submit" variant="gradient" className="w-full" size="lg" disabled={loading || success}>
              {loading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Connexion...</>
              ) : success ? (
                <><CheckCircle2 className="w-4 h-4 mr-2" />Connecté</>
              ) : (
                <><Key className="w-4 h-4 mr-2" />Se connecter</>
              )}
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

        {/* Plans Comparison */}
        <div className="glass-card p-6">
          <div className="text-center mb-6">
            <h2 className="text-xl font-semibold text-foreground">Comparez nos forfaits</h2>
            <p className="text-sm text-muted-foreground mt-1">Investissez dans la rentabilité de votre flotte</p>
          </div>

          {/* Plan headers with descriptions */}
          <div className="grid grid-cols-[1fr_repeat(3,minmax(0,1fr))] gap-0">
            {/* Empty top-left */}
            <div />
            {plans.map((plan) => {
              const Icon = plan.icon;
              return (
                <div key={plan.name} className={`text-center pb-4 relative px-2 ${plan.bestValue ? 'bg-primary/5 rounded-t-xl border-t-2 border-x border-primary/20' : ''}`}>
                  {plan.popular && (
                    <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[10px] font-semibold bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                      Populaire
                    </span>
                  )}
                  {plan.bestValue && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-bold bg-gradient-to-r from-amber-500 to-orange-500 text-white px-3 py-1 rounded-full whitespace-nowrap shadow-md">
                      🏆 Meilleur choix
                    </span>
                  )}
                  <div className={`w-10 h-10 rounded-lg mx-auto mb-2 mt-3 flex items-center justify-center bg-gradient-to-br ${plan.color} text-white`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <p className="font-bold text-foreground">{plan.name}</p>
                  <p className="text-[10px] font-medium text-muted-foreground mb-1">{plan.subtitle}</p>
                  <p className="text-lg font-bold text-foreground">{plan.price}</p>
                  <p className="text-[10px] text-muted-foreground">{plan.period}</p>
                  <p className={`text-[10px] font-semibold ${plan.bestValue ? 'text-primary' : 'text-muted-foreground'}`}>
                    ou {plan.yearly}
                  </p>
                  <p className="text-[9px] text-muted-foreground mt-1 leading-tight px-1">{plan.description}</p>
                  {plan.limitations && plan.limitations.length > 0 && (
                    <div className="mt-2 space-y-0.5">
                      {plan.limitations.map((lim, i) => (
                        <p key={i} className="text-[9px] text-destructive/70 leading-tight">⚠ {lim}</p>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Feature rows */}
            {Object.entries(featureLabels).map(([key, label], i) => (
              <>
                <div key={`label-${key}`} className={`flex items-center text-sm text-muted-foreground py-2.5 px-2 ${i % 2 === 0 ? 'bg-muted/30' : ''} rounded-l-md`}>
                  {label}
                </div>
                {plans.map((plan) => (
                  <div key={`${plan.name}-${key}`} className={`flex items-center justify-center py-2.5 ${i % 2 === 0 ? 'bg-muted/30' : ''} ${plan.bestValue ? 'bg-primary/5' : ''} ${plan.name === 'Enterprise' ? 'rounded-r-md' : ''}`}>
                    {renderFeatureValue(plan.features[key as keyof typeof plan.features])}
                  </div>
                ))}
              </>
            ))}
          </div>

          {/* CTA - push Enterprise */}
          <div className="mt-6 pt-4 border-t border-border">
            <div className="text-center mb-3">
              <p className="text-sm font-medium text-foreground">🚀 87% de nos clients choisissent Enterprise</p>
              <p className="text-xs text-muted-foreground">Pas de limites = pas de surprises. Concentrez-vous sur votre activité.</p>
            </div>
            <Button
              variant="gradient"
              size="lg"
              className="w-full"
              onClick={() => setShowOnboarding(true)}
            >
              <CreditCard className="w-4 h-4 mr-2" />
              Prendre un abonnement Enterprise
            </Button>
            <p className="text-[10px] text-center text-muted-foreground mt-2">
              Économisez jusqu'à 27% avec l'abonnement annuel
            </p>
          </div>
        </div>
      </div>

      <p className="text-xs text-center text-muted-foreground">
        © {new Date().getFullYear()} OptiFlow - Tous droits réservés
      </p>

      <OnboardingFlow
        open={showOnboarding}
        onOpenChange={setShowOnboarding}
        onComplete={handleOnboardingComplete}
      />
    </div>
  );
}
