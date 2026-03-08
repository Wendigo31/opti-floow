import { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useSireneLookup } from '@/hooks/useSireneLookup';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import {
  Loader2, Search, Building2, User, CheckCircle2, Copy, ArrowRight, ArrowLeft,
  Rocket, Star, Crown, AlertCircle, LogIn, X, Check
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';

const PLANS = [
  {
    id: 'start',
    name: 'Start',
    monthlyPrice: 29.99,
    yearlyPrice: 359.88,
    monthlyPriceId: 'price_1T8p4v0uHa1YT0odgsK4Qkmx',
    yearlyPriceId: 'price_1T8p4x0uHa1YT0odm57ZUl9h',
    icon: Rocket,
    features: [
      { label: '2 calculs par jour', included: true },
      { label: 'Itinéraire', included: false },
      { label: 'Tournées', included: false },
      { label: 'Planning', included: false },
      { label: 'Analyse', included: false },
      { label: '2 véhicules max', included: true },
      { label: '2 conducteurs max', included: true },
      { label: '2 clients max', included: true },
      { label: 'Équipe & confidentialité', included: false },
    ],
    color: 'from-emerald-500 to-teal-600',
  },
  {
    id: 'pro',
    name: 'Pro',
    monthlyPrice: 79.99,
    yearlyPrice: 959.88,
    monthlyPriceId: 'price_1T8p4y0uHa1YT0od8ORpx0f5',
    yearlyPriceId: 'price_1T8p4z0uHa1YT0odmWpzApAh',
    icon: Star,
    popular: true,
    features: [
      { label: '10 calculs par jour', included: true },
      { label: 'Itinéraire', included: false },
      { label: '5 tournées max', included: true },
      { label: 'Planning', included: false },
      { label: '1 analyse par jour', included: true },
      { label: '5 véhicules max', included: true },
      { label: '5 conducteurs max', included: true },
      { label: '5 clients max', included: true },
      { label: 'Équipe & confidentialité', included: false },
    ],
    color: 'from-blue-500 to-indigo-600',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    monthlyPrice: 149.99,
    yearlyPrice: 1799.88,
    monthlyPriceId: 'price_1T8p500uHa1YT0odBcqW2Xw8',
    yearlyPriceId: 'price_1T8p510uHa1YT0odfc0Zlsl0',
    icon: Crown,
    features: [
      { label: 'Calculs illimités', included: true },
      { label: 'Itinéraire complet', included: true },
      { label: 'Tournées illimitées', included: true },
      { label: 'Planning complet', included: true },
      { label: 'Analyses illimitées', included: true },
      { label: 'Véhicules illimités', included: true },
      { label: 'Conducteurs illimités', included: true },
      { label: 'Clients illimités', included: true },
      { label: 'Équipe & confidentialité', included: true },
    ],
    color: 'from-amber-500 to-orange-600',
  },
];

interface OnboardingFlowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: (companyIdentifier: string, email: string) => void;
}

type Step = 'plan' | 'siren' | 'user' | 'confirm';

export default function OnboardingFlow({ open, onOpenChange, onComplete }: OnboardingFlowProps) {
  const [step, setStep] = useState<Step>('plan');
  const [selectedPlan, setSelectedPlan] = useState<typeof PLANS[0] | null>(null);
  const [stripeSessionId, setStripeSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [yearly, setYearly] = useState(false);

  // SIREN step
  const { lookup, loading: sirenLoading, error: sirenError, company, reset: resetSiren } = useSireneLookup();
  const [sirenInput, setSirenInput] = useState('');
  const [skipSiren, setSkipSiren] = useState(false);

  // User step
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');

  // Confirm step
  const [companyIdentifier, setCompanyIdentifier] = useState('');
  const [copied, setCopied] = useState(false);

  // Check if returning from Stripe
  const checkStripeReturn = useCallback(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session_id');
    const onboarding = params.get('onboarding');
    const plan = params.get('plan');

    if (onboarding === 'success' && sessionId) {
      setStripeSessionId(sessionId);
      const foundPlan = PLANS.find(p => p.id === plan);
      if (foundPlan) setSelectedPlan(foundPlan);
      setStep('siren');
      // Clean URL
      const url = new URL(window.location.href);
      url.searchParams.delete('session_id');
      url.searchParams.delete('onboarding');
      url.searchParams.delete('plan');
      window.history.replaceState({}, '', url.pathname);
      return true;
    }
    return false;
  }, []);

  // Initialize on open
  useState(() => {
    checkStripeReturn();
  });

  const handleSelectPlan = async (plan: typeof PLANS[0]) => {
    setSelectedPlan(plan);
    setError(null);
    setLoading(true);

    try {
      // We need an email for Stripe checkout - ask for it first or use a temp approach
      // For simplicity, go to Stripe directly with the plan
      const { data, error: invokeError } = await supabase.functions.invoke('create-checkout', {
        body: {
          priceId: yearly ? plan.yearlyPriceId : plan.monthlyPriceId,
          email: email || `onboarding-${Date.now()}@temp.optiflow.fr`,
          planType: plan.id,
        },
      });

      if (invokeError) throw new Error(invokeError.message);
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error('URL de paiement non reçue');
      }
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la création de la session de paiement');
      setLoading(false);
    }
  };

  const handleSirenSearch = async () => {
    if (!sirenInput.trim()) return;
    await lookup(sirenInput);
  };

  const handleSkipSiren = () => {
    setSkipSiren(true);
    setStep('user');
  };

  const handleContinueFromSiren = () => {
    setStep('user');
  };

  const handleRegister = async () => {
    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      setError('Tous les champs sont requis');
      return;
    }

    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Email invalide');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke('self-register', {
        body: {
          stripe_session_id: stripeSessionId,
          siren: company?.siren || null,
          companyName: company?.companyName || null,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim().toLowerCase(),
          planType: selectedPlan?.id || 'start',
          address: company?.address || null,
          city: company?.city || null,
          postalCode: company?.postalCode || null,
          employeeCount: company?.employeeCount || null,
          companyStatus: company?.legalStatus || null,
        },
      });

      if (invokeError) throw new Error(invokeError.message);

      if (data?.success) {
        setCompanyIdentifier(data.company_identifier);
        setStep('confirm');
      } else {
        throw new Error(data?.error || "Erreur lors de l'inscription");
      }
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la création du compte');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(companyIdentifier);
    setCopied(true);
    toast({ title: 'Copié !', description: 'Identifiant copié dans le presse-papier' });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleConnect = () => {
    onOpenChange(false);
    onComplete?.(companyIdentifier, email);
  };

  const resetFlow = () => {
    setStep('plan');
    setSelectedPlan(null);
    setStripeSessionId(null);
    setLoading(false);
    setError(null);
    resetSiren();
    setSirenInput('');
    setSkipSiren(false);
    setFirstName('');
    setLastName('');
    setEmail('');
    setCompanyIdentifier('');
    setCopied(false);
  };

  const stepIndex = ['plan', 'siren', 'user', 'confirm'].indexOf(step);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetFlow(); onOpenChange(v); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Créer votre compte OptiFlow</DialogTitle>
          <DialogDescription>
            {step === 'plan' && 'Choisissez votre forfait pour commencer'}
            {step === 'siren' && 'Identifiez votre société (optionnel)'}
            {step === 'user' && 'Créez votre accès utilisateur'}
            {step === 'confirm' && 'Votre compte est prêt !'}
          </DialogDescription>
        </DialogHeader>

        {/* Stepper */}
        <div className="flex items-center gap-2 mb-6">
          {['Forfait', 'Société', 'Utilisateur', 'Confirmation'].map((label, i) => (
            <div key={label} className="flex items-center gap-2 flex-1">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold transition-colors ${
                i <= stepIndex
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              }`}>
                {i < stepIndex ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
              </div>
              <span className={`text-xs hidden sm:block ${i <= stepIndex ? 'text-foreground' : 'text-muted-foreground'}`}>
                {label}
              </span>
              {i < 3 && <div className={`flex-1 h-0.5 ${i < stepIndex ? 'bg-primary' : 'bg-muted'}`} />}
            </div>
          ))}
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-sm text-destructive mb-4">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Step 1: Plan Selection */}
        {step === 'plan' && (
          <div className="space-y-4">
            {/* Billing Toggle */}
            <div className="flex items-center justify-center gap-3">
              <span className={`text-sm ${!yearly ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>Mensuel</span>
              <Switch checked={yearly} onCheckedChange={setYearly} />
              <span className={`text-sm ${yearly ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>Annuel</span>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {PLANS.map((plan) => {
                const Icon = plan.icon;
                const displayPrice = yearly ? plan.yearlyPrice : plan.monthlyPrice;
                const period = yearly ? '/an' : '/mois';
                return (
                  <Card
                    key={plan.id}
                    className={`relative cursor-pointer transition-all hover:scale-[1.02] hover:shadow-lg ${
                      selectedPlan?.id === plan.id ? 'ring-2 ring-primary' : ''
                    }`}
                    onClick={() => handleSelectPlan(plan)}
                  >
                    {plan.popular && (
                      <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 bg-primary">
                        Populaire
                      </Badge>
                    )}
                    <CardHeader className="text-center pb-2">
                      <div className={`w-12 h-12 rounded-xl mx-auto mb-2 flex items-center justify-center bg-gradient-to-br ${plan.color} text-white`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <CardTitle className="text-lg">{plan.name}</CardTitle>
                      <CardDescription>
                        <span className="text-2xl font-bold text-foreground">{displayPrice.toFixed(2)}€</span>
                        <span className="text-muted-foreground"> TTC{period}</span>
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <ul className="space-y-1 text-xs">
                        {plan.features.map((f) => (
                          <li key={f.label} className={`flex items-center gap-1 ${f.included ? 'text-muted-foreground' : 'text-muted-foreground/50 line-through'}`}>
                            {f.included ? (
                              <Check className="w-3 h-3 text-primary flex-shrink-0" />
                            ) : (
                              <X className="w-3 h-3 text-destructive/50 flex-shrink-0" />
                            )}
                            {f.label}
                          </li>
                        ))}
                      </ul>
                      <Button
                        variant="gradient"
                        className="w-full mt-4"
                        size="sm"
                        disabled={loading}
                      >
                        {loading && selectedPlan?.id === plan.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>Choisir</>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
              );
            })}
          </div>
        )}

        {/* Step 2: SIREN */}
        {step === 'siren' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="siren" className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-primary" />
                Numéro SIREN ou SIRET
              </Label>
              <div className="flex gap-2">
                <Input
                  id="siren"
                  value={sirenInput}
                  onChange={(e) => setSirenInput(e.target.value)}
                  placeholder="123 456 789 ou 123 456 789 00012"
                  disabled={sirenLoading}
                />
                <Button onClick={handleSirenSearch} disabled={sirenLoading || !sirenInput.trim()}>
                  {sirenLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                </Button>
              </div>
              {sirenError && (
                <p className="text-sm text-destructive">{sirenError}</p>
              )}
            </div>

            {company && (
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-primary" />
                    <span className="font-semibold text-foreground">{company.companyName}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                    <div><span className="font-medium">SIREN:</span> {company.siren}</div>
                    {company.siret && <div><span className="font-medium">SIRET:</span> {company.siret}</div>}
                    <div><span className="font-medium">NAF:</span> {company.naf} - {company.nafLabel}</div>
                    <div><span className="font-medium">Statut:</span> {company.legalStatus}</div>
                    <div className="col-span-2">
                      <span className="font-medium">Adresse:</span> {company.address}, {company.postalCode} {company.city}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex justify-between pt-4">
              <Button variant="ghost" onClick={handleSkipSiren}>
                Passer cette étape
              </Button>
              <Button onClick={handleContinueFromSiren} disabled={!company && !skipSiren}>
                Continuer
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: User Info */}
        {step === 'user' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName" className="flex items-center gap-2">
                  <User className="w-4 h-4 text-primary" />
                  Prénom
                </Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Jean"
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Nom</Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Dupont"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="regEmail" className="flex items-center gap-2">
                Email professionnel
              </Label>
              <Input
                id="regEmail"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jean.dupont@transport-martin.fr"
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                Cet email sera associé à votre licence et servira pour vous connecter.
              </p>
            </div>

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep('siren')} disabled={loading}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour
              </Button>
              <Button onClick={handleRegister} disabled={loading || !firstName || !lastName || !email} variant="gradient">
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Création en cours...
                  </>
                ) : (
                  <>
                    Créer mon compte
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Confirmation */}
        {step === 'confirm' && (
          <div className="text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8 text-primary" />
            </div>

            <div>
              <h3 className="text-lg font-semibold text-foreground mb-1">Compte créé avec succès !</h3>
              <p className="text-sm text-muted-foreground">
                Votre identifiant société pour vous connecter :
              </p>
            </div>

            <div className="bg-muted/50 border-2 border-primary/30 rounded-xl p-6">
              <p className="text-2xl font-mono font-bold text-primary tracking-wider">
                {companyIdentifier}
              </p>
              <Button variant="outline" size="sm" className="mt-3" onClick={handleCopy}>
                <Copy className="w-4 h-4 mr-2" />
                {copied ? 'Copié !' : 'Copier'}
              </Button>
            </div>

            <div className="bg-muted/30 rounded-lg p-4 text-left space-y-2 text-sm">
              <p className="font-medium text-foreground">Pour vous connecter :</p>
              <ul className="space-y-1 text-muted-foreground">
                <li>• <strong>Identifiant société :</strong> {companyIdentifier}</li>
                <li>• <strong>Email :</strong> {email}</li>
              </ul>
              <p className="text-xs text-muted-foreground mt-2">
                ⚠️ Conservez bien votre identifiant société, il vous sera demandé à chaque connexion.
              </p>
            </div>

            <Button variant="gradient" size="lg" className="w-full" onClick={handleConnect}>
              <LogIn className="w-4 h-4 mr-2" />
              Se connecter maintenant
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
