import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CreditCard, Loader2, ShoppingCart, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useLicense } from '@/hooks/useLicense';
import { toast } from 'sonner';
import { PlansOverview } from '@/components/plans/PlansOverview';
import { PLAN_INFO, asPlanKey, includedText, optionsFor, type PlanOption } from '@/lib/planCatalog';

const eur = (n: number) => n.toLocaleString('fr-FR', { maximumFractionDigits: 2 });

/**
 * Paramètres › Votre forfait : forfait de la société, les trois forfaits et les options à ajouter
 * (catalogue d'OptiCentral). Une demande part dans OptiCentral › Demandes ; acceptée, l'option et
 * ses onglets sont ouverts et ajoutés au prélèvement mensuel.
 */
export function AddonMarketplace() {
  const { licenseData } = useLicense();
  const [cart, setCart] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const planKey = asPlanKey(licenseData?.planName);
  const plan = PLAN_INFO[planKey];
  const features = (licenseData?.customFeatures ?? {}) as Record<string, unknown>;
  const isActive = (o: PlanOption) => o.features.length > 0 && o.features.every((f) => features[f] === true);
  const options = optionsFor(planKey);
  const chosen = options.filter((o) => cart.includes(o.key));
  const total = chosen.reduce((s, o) => s + o.monthly, 0);

  const request = async () => {
    if (!chosen.length) return;
    setLoading(true);
    try {
      const { error } = await supabase.rpc('create_access_request', {
        p_requested_features: chosen.flatMap((o) => [`option:${o.key}`, ...o.pages.map((p) => `page:${p}`)]),
        p_message: `Options demandées : ${chosen.map((o) => `${o.label} (${eur(o.monthly)} € HT/mois)`).join(', ')}`,
      });
      if (error) throw new Error(error.message);
      setCart([]);
      setSent(true);
      toast.success("Demande envoyée : OptiGroup active les options et les ajoute à votre prochain prélèvement.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur lors de l'envoi de la demande");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <CreditCard className="w-4 h-4 text-primary" /> Votre forfait : {plan.label}
        </CardTitle>
        <CardDescription>{plan.description} — {includedText(plan)}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <PlansOverview current={planKey} appName="OptiFlow" contactUrl="https://opti-group.fr/contact?produit=optiflow" compact />
        {options.length > 0 && (
          <>
            <Separator />
            <div>
              <h4 className="font-semibold text-sm flex items-center gap-2"><Sparkles className="w-4 h-4 text-primary" /> Options à ajouter à votre forfait</h4>
              <p className="text-xs text-muted-foreground">Prix hors taxes, ajoutés à votre prélèvement mensuel.</p>
            </div>
            {sent && <p className="text-sm rounded-lg border border-primary/20 bg-primary/5 p-3">Demande envoyée à OptiGroup. Dès qu'elle est validée, rechargez la page pour accéder aux nouvelles fonctions.</p>}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {options.map((o) => {
                const owned = isActive(o);
                const inCart = cart.includes(o.key);
                return (
                  <button
                    key={o.key}
                    type="button"
                    disabled={owned}
                    onClick={() => setCart((c) => (c.includes(o.key) ? c.filter((k) => k !== o.key) : [...c, o.key]))}
                    className={`text-left rounded-xl border-2 p-4 transition-all ${owned ? 'border-primary/30 bg-primary/5 opacity-80' : inCart ? 'border-primary bg-primary/5 ring-2 ring-primary/20' : 'border-border hover:border-primary/40'}`}
                  >
                    <div className="flex items-center gap-2">
                      <h5 className="font-semibold text-sm">{o.label}</h5>
                      {owned && <Badge className="bg-primary/10 text-primary text-[10px]">Actif</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{o.description}</p>
                    <div className="mt-2 flex items-center justify-between text-sm">
                      <span className="font-bold">{eur(o.monthly)} € <span className="text-muted-foreground font-normal text-xs">HT/mois</span></span>
                      {!owned && <span className={`text-xs ${inCart ? 'text-primary font-medium' : 'text-muted-foreground'}`}>{inCart ? '✓ Sélectionnée' : 'Ajouter'}</span>}
                    </div>
                  </button>
                );
              })}
            </div>
            {chosen.length > 0 && (
              <Button onClick={request} className="w-full gap-2" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingCart className="h-4 w-4" />}
                Demander {chosen.length > 1 ? 'ces options' : 'cette option'} ({eur(total)} € HT/mois)
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
