import { useState, useCallback, useEffect } from 'react';
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
  AlertCircle, LogIn, X
} from 'lucide-react';

interface OnboardingFlowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: (companyIdentifier: string, email: string) => void;
}

type Step = 'siren' | 'user' | 'confirm';

export default function OnboardingFlow({ open, onOpenChange, onComplete }: OnboardingFlowProps) {
  const [step, setStep] = useState<Step>('siren');
  const [stripeSessionId, setStripeSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

    if (onboarding === 'success' && sessionId) {
      setStripeSessionId(sessionId);
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

  // Initialize on open - check if returning from Stripe
  useEffect(() => {
    checkStripeReturn();
  }, [checkStripeReturn]);

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
    setStep('siren');
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

  const stepIndex = ['siren', 'user', 'confirm'].indexOf(step);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetFlow(); onOpenChange(v); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Créer votre compte OptiFlow</DialogTitle>
          <DialogDescription>
            {step === 'siren' && 'Identifiez votre société (optionnel)'}
            {step === 'user' && 'Créez votre accès utilisateur'}
            {step === 'confirm' && 'Votre compte est prêt !'}
          </DialogDescription>
        </DialogHeader>

        {/* Stepper */}
        <div className="flex items-center gap-2 mb-6">
          {['Société', 'Utilisateur', 'Confirmation'].map((label, i) => (
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
              {i < 2 && <div className={`flex-1 h-0.5 ${i < stepIndex ? 'bg-primary' : 'bg-muted'}`} />}
            </div>
          ))}
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-sm text-destructive mb-4">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Step 1: SIREN */}
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

        {/* Step 2: User Info */}
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

        {/* Step 3: Confirmation */}
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
