import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Loader2, CheckCircle2, XCircle, AlertCircle, FileText, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import optiflowLogo from '@/assets/optiflow-logo-full.svg';

const eur = (n: number) => n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
const dateFr = (iso: string) => new Date(iso + (iso.length === 10 ? 'T00:00' : '')).toLocaleDateString('fr-FR');

interface QuoteSummary {
  quoteNumber: string;
  originAddress: string;
  destinationAddress: string;
  distanceKm: number;
  priceTtc: number;
  validUntil: string | null;
  notes: string | null;
}

interface QuoteLinkData {
  companyName: string;
  clientName: string | null;
  quote: QuoteSummary;
  expired: boolean;
  alreadyResponded: boolean;
  response: { type: 'accepted' | 'refused'; signedName: string; respondedAt: string; comment: string | null } | null;
}

/**
 * Page publique, non authentifiée : le client arrive ici depuis le lien
 * reçu par email (edge function quote-public-link, action "generate",
 * déclenchée depuis src/pages/Tenders.tsx) pour accepter ou refuser un
 * devis, en signant d'un nom tapé (pas de signature électronique certifiée
 * par un tiers — scope validé explicitement par l'utilisateur le 24/10).
 *
 * Route spéciale, en dehors du flux normal (licence requise) : voir
 * src/App.tsx (isAcceptQuoteRoute, comme /accept-invite).
 */
export default function AcceptQuote() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [step, setStep] = useState<'loading' | 'ready' | 'submitting' | 'done' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [data, setData] = useState<QuoteLinkData | null>(null);
  const [doneAction, setDoneAction] = useState<'accept' | 'refuse' | null>(null);

  const [signedName, setSignedName] = useState('');
  const [comment, setComment] = useState('');
  const [pendingAction, setPendingAction] = useState<'accept' | 'refuse' | null>(null);

  const loadQuote = useCallback(async () => {
    if (!token) {
      setStep('error');
      setErrorMessage('Lien incomplet : aucun jeton fourni.');
      return;
    }
    try {
      const { data: result, error } = await supabase.functions.invoke('quote-public-link', {
        body: { action: 'get', token },
      });
      if (error || !result?.success) {
        setStep('error');
        setErrorMessage('Ce lien est invalide ou a expiré.');
        return;
      }
      setData(result as QuoteLinkData);
      setStep('ready');
    } catch {
      setStep('error');
      setErrorMessage('Erreur de connexion. Réessayez.');
    }
  }, [token]);

  useEffect(() => {
    void loadQuote();
  }, [loadQuote]);

  const submit = async (action: 'accept' | 'refuse') => {
    if (!token) return;
    const trimmedName = signedName.trim();
    if (trimmedName.length < 2) {
      setErrorMessage('Merci de taper votre nom pour signer.');
      return;
    }
    setErrorMessage(null);
    setPendingAction(action);
    setStep('submitting');
    try {
      const { data: result, error } = await supabase.functions.invoke('quote-public-link', {
        body: { action: 'respond', token, responseAction: action, signedName: trimmedName, comment: comment.trim() || undefined },
      });
      if (error || !result?.success) {
        // Un autre onglet/clic a peut-être déjà répondu entre-temps : on
        // recharge l'état réel plutôt que d'afficher une erreur trompeuse.
        await loadQuote();
        setStep('ready');
        setErrorMessage("Cette réponse n'a pas pu être enregistrée (le devis a peut-être déjà reçu une réponse).");
        return;
      }
      setDoneAction(action);
      setStep('done');
    } catch {
      setStep('ready');
      setErrorMessage('Erreur de connexion. Réessayez.');
    } finally {
      setPendingAction(null);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="flex justify-center mb-8">
          <img src={optiflowLogo} alt="OptiFlow" className="h-12" />
        </div>

        <div className="bg-card border border-border rounded-xl p-8 shadow-sm">
          {step === 'loading' && (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground">Chargement du devis...</p>
            </div>
          )}

          {step === 'error' && (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <AlertCircle className="h-10 w-10 text-destructive" />
              <p className="text-foreground font-medium">Lien invalide</p>
              {errorMessage && <p className="text-sm text-muted-foreground">{errorMessage}</p>}
            </div>
          )}

          {(step === 'ready' || step === 'submitting') && data && !data.alreadyResponded && !data.expired && (
            <div className="space-y-5">
              <div className="text-center mb-2">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <h1 className="text-xl font-semibold text-foreground">Devis {data.quote.quoteNumber}</h1>
                <p className="text-sm text-muted-foreground mt-1">{data.companyName}</p>
              </div>

              <div className="rounded-lg bg-muted p-4 text-sm space-y-2">
                <p className="text-foreground">{data.quote.originAddress} → {data.quote.destinationAddress}</p>
                <p className="text-muted-foreground">{Math.round(data.quote.distanceKm)} km</p>
                <p className="text-2xl font-bold text-foreground">{eur(data.quote.priceTtc)} TTC</p>
                {data.quote.validUntil && (
                  <p className="text-xs text-muted-foreground">Valable jusqu'au {dateFr(data.quote.validUntil)}</p>
                )}
                {data.quote.notes && <p className="text-xs text-muted-foreground border-t border-border pt-2">{data.quote.notes}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="signedName">Votre nom (vaut signature)</Label>
                <Input
                  id="signedName"
                  value={signedName}
                  onChange={(e) => setSignedName(e.target.value)}
                  placeholder="Prénom et nom"
                  disabled={step === 'submitting'}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="comment">Commentaire (optionnel, surtout en cas de refus)</Label>
                <Textarea
                  id="comment"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  disabled={step === 'submitting'}
                  rows={2}
                />
              </div>

              {errorMessage && (
                <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/30">
                  <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                  <p className="text-sm text-destructive">{errorMessage}</p>
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => submit('refuse')}
                  disabled={step === 'submitting'}
                >
                  {step === 'submitting' && pendingAction === 'refuse' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Refuser'}
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => submit('accept')}
                  disabled={step === 'submitting'}
                >
                  {step === 'submitting' && pendingAction === 'accept' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Accepter'}
                </Button>
              </div>
            </div>
          )}

          {(step === 'ready' || step === 'submitting') && data && data.expired && !data.alreadyResponded && (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <Clock className="h-10 w-10 text-muted-foreground" />
              <p className="text-foreground font-medium">Ce lien a expiré</p>
              <p className="text-sm text-muted-foreground">Contactez {data.companyName} pour obtenir un nouveau devis.</p>
            </div>
          )}

          {(step === 'ready' || step === 'submitting') && data?.alreadyResponded && data.response && (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              {data.response.type === 'accepted' ? (
                <CheckCircle2 className="h-10 w-10 text-green-600" />
              ) : (
                <XCircle className="h-10 w-10 text-muted-foreground" />
              )}
              <p className="text-foreground font-medium">
                Devis {data.quote.quoteNumber} {data.response.type === 'accepted' ? 'déjà accepté' : 'déjà refusé'}
              </p>
              <p className="text-sm text-muted-foreground">
                Par {data.response.signedName}, le {dateFr(data.response.respondedAt)}
              </p>
              {data.response.comment && <p className="text-sm text-muted-foreground italic">« {data.response.comment} »</p>}
            </div>
          )}

          {step === 'done' && (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              {doneAction === 'accept' ? (
                <CheckCircle2 className="h-10 w-10 text-green-600" />
              ) : (
                <XCircle className="h-10 w-10 text-muted-foreground" />
              )}
              <p className="text-foreground font-medium">
                {doneAction === 'accept' ? 'Devis accepté, merci !' : 'Devis refusé'}
              </p>
              <p className="text-sm text-muted-foreground">Votre réponse a bien été enregistrée.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
