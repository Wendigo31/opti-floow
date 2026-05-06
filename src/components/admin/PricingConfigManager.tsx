import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Loader2, Plus, Trash2, CheckCircle2, AlertCircle, Save } from 'lucide-react';
import { logger } from '@/utils/productionLogger';

type PlanRow = { name: string; monthly: number; yearly: number; floor: number; annualDiscountPct: number };
type DiscountRow = { label: string; maxPct: number };
type AddonRow = { id: string; name: string; monthly: number; yearly: number };

interface PricingConfigState {
  plans: Record<string, PlanRow>;
  discounts: Record<string, DiscountRow>;
  addons: AddonRow[];
  stripe_prices: Record<string, string>;
}

const DEFAULT_STATE: PricingConfigState = {
  plans: {},
  discounts: {},
  addons: [],
  stripe_prices: {},
};

export function PricingConfigManager() {
  const [state, setState] = useState<PricingConfigState>(DEFAULT_STATE);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const debounceRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from('pricing_config').select('*');
      if (error) {
        logger.error('[PricingConfigManager] load', error);
        toast.error('Impossible de charger la configuration tarifaire');
        setLoading(false);
        return;
      }
      const next: PricingConfigState = { ...DEFAULT_STATE };
      data?.forEach((row: any) => {
        (next as any)[row.config_key] = row.config_data;
      });
      setState(next);
      setLoading(false);
    })();
  }, []);

  const persist = useCallback(async (key: keyof PricingConfigState, data: any) => {
    setSavingKey(key);
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase
      .from('pricing_config')
      .upsert(
        { config_key: key, config_data: data, updated_by: userData.user?.id },
        { onConflict: 'config_key' }
      );
    setSavingKey(null);
    if (error) {
      logger.error('[PricingConfigManager] save', error);
      toast.error(`Erreur de sauvegarde (${key})`);
      return;
    }
    setSavedKey(key);
    setTimeout(() => setSavedKey((k) => (k === key ? null : k)), 1500);
  }, []);

  const scheduleSave = useCallback(
    (key: keyof PricingConfigState, data: any) => {
      if (debounceRef.current[key]) clearTimeout(debounceRef.current[key]);
      debounceRef.current[key] = setTimeout(() => persist(key, data), 600);
    },
    [persist]
  );

  const updatePlan = (id: string, patch: Partial<PlanRow>) => {
    const next = { ...state.plans, [id]: { ...state.plans[id], ...patch } };
    setState((s) => ({ ...s, plans: next }));
    scheduleSave('plans', next);
  };

  const updateDiscount = (id: string, patch: Partial<DiscountRow>) => {
    const next = { ...state.discounts, [id]: { ...state.discounts[id], ...patch } };
    setState((s) => ({ ...s, discounts: next }));
    scheduleSave('discounts', next);
  };

  const updateAddon = (idx: number, patch: Partial<AddonRow>) => {
    const next = state.addons.map((a, i) => (i === idx ? { ...a, ...patch } : a));
    setState((s) => ({ ...s, addons: next }));
    scheduleSave('addons', next);
  };

  const addAddon = () => {
    const next = [
      ...state.addons,
      { id: `addon_${Date.now()}`, name: 'Nouvel add-on', monthly: 0, yearly: 0 },
    ];
    setState((s) => ({ ...s, addons: next }));
    scheduleSave('addons', next);
  };

  const removeAddon = (idx: number) => {
    const next = state.addons.filter((_, i) => i !== idx);
    setState((s) => ({ ...s, addons: next }));
    scheduleSave('addons', next);
  };

  const updateStripePrice = (key: string, value: string) => {
    const next = { ...state.stripe_prices, [key]: value };
    setState((s) => ({ ...s, stripe_prices: next }));
    scheduleSave('stripe_prices', next);
  };

  const SaveBadge = ({ k }: { k: keyof PricingConfigState }) => {
    if (savingKey === k) return <Badge variant="secondary"><Loader2 className="w-3 h-3 mr-1 animate-spin" />Sauvegarde...</Badge>;
    if (savedKey === k) return <Badge variant="secondary" className="bg-green-100 text-green-700"><CheckCircle2 className="w-3 h-3 mr-1" />Enregistré</Badge>;
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 p-3 rounded-md bg-amber-50 border border-amber-200 text-amber-900 text-sm">
        <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <div>
          <strong>Configuration interne confidentielle.</strong> Les modifications sont sauvegardées
          automatiquement et impactent immédiatement les checkouts Stripe et les outils commerciaux.
          Ne pas exposer ces montants en façade publique.
        </div>
      </div>

      <Tabs defaultValue="plans">
        <TabsList>
          <TabsTrigger value="plans">Forfaits & planchers</TabsTrigger>
          <TabsTrigger value="discounts">Remises commerciales</TabsTrigger>
          <TabsTrigger value="addons">Add-ons</TabsTrigger>
          <TabsTrigger value="stripe">IDs Stripe</TabsTrigger>
        </TabsList>

        <TabsContent value="plans" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Forfaits</CardTitle>
                <CardDescription>Prix HT mensuels, annuels et planchers de négociation</CardDescription>
              </div>
              <SaveBadge k="plans" />
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(state.plans).map(([id, plan]) => (
                <div key={id} className="grid grid-cols-12 gap-2 items-end p-3 rounded-md border">
                  <div className="col-span-2">
                    <Label className="text-xs">Forfait</Label>
                    <Input value={plan.name} onChange={(e) => updatePlan(id, { name: e.target.value })} />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">Mensuel (€)</Label>
                    <Input type="number" value={plan.monthly} onChange={(e) => updatePlan(id, { monthly: Number(e.target.value) })} />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">Annuel (€)</Label>
                    <Input type="number" value={plan.yearly} onChange={(e) => updatePlan(id, { yearly: Number(e.target.value) })} />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">Plancher (€)</Label>
                    <Input type="number" value={plan.floor} onChange={(e) => updatePlan(id, { floor: Number(e.target.value) })} />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">Remise annuelle (%)</Label>
                    <Input type="number" value={plan.annualDiscountPct} onChange={(e) => updatePlan(id, { annualDiscountPct: Number(e.target.value) })} />
                  </div>
                  <div className="col-span-2 text-xs text-muted-foreground">
                    Marge plancher: {plan.monthly > 0 ? Math.round(((plan.monthly - plan.floor) / plan.monthly) * 100) : 0}%
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="discounts" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Remises maximales par profil</CardTitle>
                <CardDescription>Plafonds de négociation autorisés</CardDescription>
              </div>
              <SaveBadge k="discounts" />
            </CardHeader>
            <CardContent className="space-y-3">
              {Object.entries(state.discounts).map(([id, d]) => (
                <div key={id} className="grid grid-cols-12 gap-2 items-end p-3 rounded-md border">
                  <div className="col-span-2 text-xs font-mono text-muted-foreground self-center">{id}</div>
                  <div className="col-span-7">
                    <Label className="text-xs">Libellé</Label>
                    <Input value={d.label} onChange={(e) => updateDiscount(id, { label: e.target.value })} />
                  </div>
                  <div className="col-span-3">
                    <Label className="text-xs">Remise max (%)</Label>
                    <Input type="number" value={d.maxPct} onChange={(e) => updateDiscount(id, { maxPct: Number(e.target.value) })} />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="addons" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Add-ons</CardTitle>
                <CardDescription>Modules et capacités additionnels facturables</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <SaveBadge k="addons" />
                <Button size="sm" variant="outline" onClick={addAddon}>
                  <Plus className="w-4 h-4 mr-1" />Ajouter
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {state.addons.map((a, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-end p-3 rounded-md border">
                  <div className="col-span-3">
                    <Label className="text-xs">ID</Label>
                    <Input value={a.id} onChange={(e) => updateAddon(idx, { id: e.target.value })} />
                  </div>
                  <div className="col-span-5">
                    <Label className="text-xs">Nom</Label>
                    <Input value={a.name} onChange={(e) => updateAddon(idx, { name: e.target.value })} />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">Mensuel (€)</Label>
                    <Input type="number" value={a.monthly} onChange={(e) => updateAddon(idx, { monthly: Number(e.target.value) })} />
                  </div>
                  <div className="col-span-1">
                    <Label className="text-xs">An (€)</Label>
                    <Input type="number" value={a.yearly} onChange={(e) => updateAddon(idx, { yearly: Number(e.target.value) })} />
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <Button size="icon" variant="ghost" onClick={() => removeAddon(idx)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
              {state.addons.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">Aucun add-on configuré.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stripe" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Identifiants Stripe (Live)</CardTitle>
                <CardDescription>price_xxx utilisés par les checkouts</CardDescription>
              </div>
              <SaveBadge k="stripe_prices" />
            </CardHeader>
            <CardContent className="space-y-2">
              {Object.entries(state.stripe_prices).map(([key, value]) => (
                <div key={key} className="grid grid-cols-12 gap-2 items-center">
                  <Label className="col-span-4 text-xs font-mono">{key}</Label>
                  <Input
                    className="col-span-8 font-mono text-xs"
                    value={value}
                    onChange={(e) => updateStripePrice(key, e.target.value)}
                    placeholder="price_..."
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}