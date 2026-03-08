import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ShoppingCart, Route, Truck, Users2, UserPlus, Brain, 
  Shield, Check, Loader2, RefreshCw, Sparkles, X
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useLicense } from '@/hooks/useLicense';
import { useLicenseContext } from '@/context/LicenseContext';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

interface Addon {
  id: string;
  name: string;
  description: string;
  price: number;
  priceId: string;
  icon: React.ElementType;
  category: 'feature' | 'capacity';
}

// Features included by plan - used to hide already-included add-ons
const PLAN_INCLUDED_FEATURES: Record<string, string[]> = {
  start: ['itinerary_planning'],
  pro: ['itinerary_planning', 'monthly_tracking', 'ai_optimization'],
  enterprise: ['itinerary_planning', 'monthly_tracking', 'ai_optimization', 'multi_users'],
};

const ADDONS: Addon[] = [
  {
    id: 'ai_analysis',
    name: 'Analyse IA (3/jour)',
    description: 'Analyses avancées par intelligence artificielle pour optimiser vos coûts. Réservé au forfait Start.',
    price: 14.99,
    priceId: 'price_1T8pHS0uHa1YT0odE2QHlcn9',
    icon: Brain,
    category: 'feature',
  },
  {
    id: 'team',
    name: 'Équipe & Confidentialité',
    description: "Gestion d'équipe avec rôles et confidentialité des données financières.",
    price: 19.99,
    priceId: 'price_1T8pHT0uHa1YT0odG5KtcsQc',
    icon: Shield,
    category: 'feature',
  },
  {
    id: 'extra_tours',
    name: '+10 Tournées',
    description: '10 tournées supplémentaires pour votre forfait.',
    price: 4.99,
    priceId: 'price_1T8pX80uHa1YT0odiz1jfTAh',
    icon: Route,
    category: 'capacity',
  },
  {
    id: 'extra_vehicles',
    name: '+10 Véhicules',
    description: '10 véhicules supplémentaires à gérer dans votre flotte.',
    price: 9.99,
    priceId: 'price_1T8pX50uHa1YT0odFmezVKaV',
    icon: Truck,
    category: 'capacity',
  },
  {
    id: 'extra_drivers',
    name: '+10 Conducteurs',
    description: '10 conducteurs supplémentaires à enregistrer.',
    price: 9.99,
    priceId: 'price_1T8pX60uHa1YT0odlbLxTVFt',
    icon: UserPlus,
    category: 'capacity',
  },
  {
    id: 'extra_clients',
    name: '+10 Clients',
    description: '10 clients supplémentaires dans votre carnet.',
    price: 4.99,
    priceId: 'price_1T8pX70uHa1YT0odiCwaIHsO',
    icon: Users2,
    category: 'capacity',
  },
];

export function AddonMarketplace() {
  const { licenseData } = useLicense();
  const { licenseId } = useLicenseContext();
  const [cart, setCart] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [activating, setActivating] = useState(false);
  const [activeAddons, setActiveAddons] = useState<string[]>([]);

  // Check for successful return from Stripe
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session_id');
    const addonSuccess = params.get('addon_success');

    if (addonSuccess === 'true' && sessionId && licenseId) {
      activateAddons(sessionId);
      // Clean URL
      const url = new URL(window.location.href);
      url.searchParams.delete('session_id');
      url.searchParams.delete('addon_success');
      window.history.replaceState({}, '', url.pathname + url.search);
    }

    if (params.get('addon_cancelled') === 'true') {
      toast.error('Paiement annulé');
      const url = new URL(window.location.href);
      url.searchParams.delete('addon_cancelled');
      window.history.replaceState({}, '', url.pathname + url.search);
    }
  }, [licenseId]);

  // Fetch active addons
  useEffect(() => {
    if (!licenseId) return;
    const fetchActiveAddons = async () => {
      const { data } = await supabase
        .from('license_addons')
        .select('addon_id')
        .eq('license_id', licenseId)
        .eq('is_active', true);
      if (data) {
        setActiveAddons(data.map(a => a.addon_id));
      }
    };
    fetchActiveAddons();
  }, [licenseId]);

  const activateAddons = async (sessionId: string) => {
    setActivating(true);
    try {
      const { data, error } = await supabase.functions.invoke('addon-checkout', {
        body: {
          action: 'activate',
          license_id: licenseId,
          session_id: sessionId,
        },
      });

      if (error) throw new Error(error.message);
      if (data?.success) {
        setShowSuccess(true);
      }
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'activation");
    } finally {
      setActivating(false);
    }
  };

  const toggleCart = (addonId: string) => {
    setCart(prev => 
      prev.includes(addonId) 
        ? prev.filter(id => id !== addonId) 
        : [...prev, addonId]
    );
  };

  const cartTotal = cart.reduce((sum, id) => {
    const addon = ADDONS.find(a => a.id === id);
    return sum + (addon?.price || 0);
  }, 0);

  const handleCheckout = async () => {
    if (!cart.length || !licenseId || !licenseData?.email) return;

    setLoading(true);
    try {
      const items = cart.map(id => {
        const addon = ADDONS.find(a => a.id === id)!;
        return { addon_id: id, price_id: addon.priceId };
      });

      const { data, error } = await supabase.functions.invoke('addon-checkout', {
        body: {
          action: 'checkout',
          license_id: licenseId,
          email: licenseData.email,
          items,
          origin_url: window.location.origin,
        },
      });

      if (error) throw new Error(error.message);
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors du paiement');
    } finally {
      setLoading(false);
    }
  };

  const featureAddons = ADDONS.filter(a => a.category === 'feature');
  const capacityAddons = ADDONS.filter(a => a.category === 'capacity');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Modules complémentaires
          </h3>
          <p className="text-sm text-muted-foreground">
            Ajoutez des fonctionnalités à votre forfait actuel
          </p>
        </div>
        {cart.length > 0 && (
          <Button variant="gradient" onClick={handleCheckout} disabled={loading}>
            {loading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <ShoppingCart className="w-4 h-4 mr-2" />
            )}
            Payer {cartTotal.toFixed(2)}€/mois ({cart.length})
          </Button>
        )}
      </div>

      {activating && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="flex items-center gap-3 py-4">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
            <span className="text-sm text-foreground">Activation de vos modules en cours...</span>
          </CardContent>
        </Card>
      )}

      {/* Feature add-ons */}
      <div>
        <h4 className="text-sm font-medium text-muted-foreground mb-3">Fonctionnalités</h4>
        <div className="grid gap-3 sm:grid-cols-2">
          {featureAddons.map(addon => {
            const Icon = addon.icon;
            const inCart = cart.includes(addon.id);
            const isActive = activeAddons.includes(addon.id);

            return (
              <Card
                key={addon.id}
                className={`relative transition-all cursor-pointer hover:shadow-md ${
                  inCart ? 'ring-2 ring-primary bg-primary/5' : ''
                } ${isActive ? 'opacity-60' : ''}`}
                onClick={() => !isActive && toggleCart(addon.id)}
              >
                {isActive && (
                  <Badge className="absolute top-2 right-2 bg-success/20 text-success border-success/30">
                    <Check className="w-3 h-3 mr-1" /> Actif
                  </Badge>
                )}
                {inCart && !isActive && (
                  <Badge className="absolute top-2 right-2 bg-primary/20 text-primary border-primary/30">
                    <ShoppingCart className="w-3 h-3 mr-1" /> Panier
                  </Badge>
                )}
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{addon.name}</CardTitle>
                      <CardDescription className="text-xs">{addon.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-foreground">{addon.price.toFixed(2)}€<span className="text-xs text-muted-foreground font-normal">/mois TTC</span></span>
                    {!isActive && (
                      <Button
                        variant={inCart ? "outline" : "default"}
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); toggleCart(addon.id); }}
                      >
                        {inCart ? <><X className="w-3 h-3 mr-1" /> Retirer</> : 'Ajouter'}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Capacity add-ons */}
      <div>
        <h4 className="text-sm font-medium text-muted-foreground mb-3">Augmenter vos limites</h4>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {capacityAddons.map(addon => {
            const Icon = addon.icon;
            const inCart = cart.includes(addon.id);

            return (
              <Card
                key={addon.id}
                className={`relative transition-all cursor-pointer hover:shadow-md ${
                  inCart ? 'ring-2 ring-primary bg-primary/5' : ''
                }`}
                onClick={() => toggleCart(addon.id)}
              >
                {inCart && (
                  <Badge className="absolute top-2 right-2 bg-primary/20 text-primary border-primary/30 text-[10px]">
                    <ShoppingCart className="w-3 h-3 mr-0.5" />
                  </Badge>
                )}
                <CardContent className="pt-4 pb-3 text-center">
                  <div className="p-2 rounded-lg bg-primary/10 w-fit mx-auto mb-2">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <p className="font-semibold text-sm text-foreground">{addon.name}</p>
                  <p className="text-lg font-bold text-foreground mt-1">
                    {addon.price.toFixed(2)}€<span className="text-[10px] text-muted-foreground font-normal">/mois</span>
                  </p>
                  <Button
                    variant={inCart ? "outline" : "default"}
                    size="sm"
                    className="mt-2 w-full"
                    onClick={(e) => { e.stopPropagation(); toggleCart(addon.id); }}
                  >
                    {inCart ? 'Retirer' : 'Ajouter'}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Cart summary */}
      {cart.length > 0 && (
        <Card className="border-primary/30 bg-gradient-to-r from-primary/5 to-primary/10">
          <CardContent className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <ShoppingCart className="w-5 h-5 text-primary" />
              <div>
                <p className="font-semibold text-foreground">{cart.length} module{cart.length > 1 ? 's' : ''} sélectionné{cart.length > 1 ? 's' : ''}</p>
                <p className="text-xs text-muted-foreground">
                  {cart.map(id => ADDONS.find(a => a.id === id)?.name).join(', ')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-xl font-bold text-foreground">{cartTotal.toFixed(2)}€</p>
                <p className="text-xs text-muted-foreground">/mois TTC</p>
              </div>
              <Button variant="gradient" size="lg" onClick={handleCheckout} disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Payer maintenant'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Success dialog */}
      <Dialog open={showSuccess} onOpenChange={setShowSuccess}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Check className="w-5 h-5 text-success" />
              Modules activés avec succès !
            </DialogTitle>
            <DialogDescription>
              Vos nouveaux modules ont été ajoutés à votre licence. Veuillez rafraîchir la page pour que les changements prennent effet.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="gradient" onClick={() => window.location.reload()}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Rafraîchir maintenant
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
