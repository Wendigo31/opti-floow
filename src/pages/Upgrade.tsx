import { useState, useEffect } from 'react';
import { 
  Zap, 
  Rocket, 
  Building2, 
  Check, 
  Package, 
  Euro, 
  ArrowRight,
  ExternalLink,
  Loader2,
  Crown,
  Plus,
  X,
  Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { useLicense } from '@/hooks/useLicense';
import { 
  PRICING_PLANS, 
  ADD_ONS, 
  getAddOnsForPlan,
  calculateTotalPrice,
  type AddOn,
} from '@/types/pricing';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

const planIcons = {
  start: Zap,
  pro: Rocket,
  enterprise: Building2,
};

const planColors = {
  start: 'blue',
  pro: 'orange',
  enterprise: 'red',
} as const;

const colorClasses = {
  blue: {
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/50',
    text: 'text-blue-500',
    button: 'bg-blue-500 hover:bg-blue-600 text-white',
  },
  orange: {
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/50',
    text: 'text-orange-500',
    button: 'bg-orange-500 hover:bg-orange-600 text-white',
  },
  red: {
    bg: 'bg-red-500/10',
    border: 'border-red-500/50',
    text: 'text-red-500',
    button: 'bg-red-500 hover:bg-red-600 text-white',
  },
};

const addonIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  Brain: () => <Package className="w-5 h-5" />,
  Building: Building2,
  FileText: () => <Package className="w-5 h-5" />,
  Plug: () => <Package className="w-5 h-5" />,
  Users: () => <Package className="w-5 h-5" />,
  TrendingUp: () => <Package className="w-5 h-5" />,
  FileSpreadsheet: () => <Package className="w-5 h-5" />,
  Truck: () => <Package className="w-5 h-5" />,
  UserPlus: () => <Package className="w-5 h-5" />,
  Route: () => <Package className="w-5 h-5" />,
  Infinity: () => <Package className="w-5 h-5" />,
  Headphones: () => <Package className="w-5 h-5" />,
  Shield: () => <Package className="w-5 h-5" />,
  GraduationCap: () => <Package className="w-5 h-5" />,
};

export default function Upgrade() {
  const { licenseData, isLicensed } = useLicense();
  const currentPlanId = (licenseData?.planType || 'start') as 'start' | 'pro' | 'enterprise';
  const currentPlan = PRICING_PLANS.find(p => p.id === currentPlanId)!;
  
  const [activeAddOns, setActiveAddOns] = useState<string[]>([]);
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Fetch active add-ons from database
  useEffect(() => {
    const fetchAddOns = async () => {
      if (!licenseData) return;
      
      try {
        const { data, error } = await supabase
          .from('license_addons')
          .select('addon_id')
          .eq('is_active', true);

        if (!error && data) {
          const addOnIds = data.map((a: any) => a.addon_id);
          setActiveAddOns(addOnIds);
          setSelectedAddOns(addOnIds);
        }
      } catch (err) {
        console.error('Error fetching add-ons:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAddOns();
  }, [licenseData]);

  const availableAddOns = getAddOnsForPlan(currentPlanId);
  
  // Calculate pricing
  const currentMonthlyTotal = currentPlan.monthlyPrice + activeAddOns.reduce((sum, id) => {
    const addon = ADD_ONS.find(a => a.id === id);
    return sum + (addon?.monthlyPrice || 0);
  }, 0);

  const newMonthlyTotal = currentPlan.monthlyPrice + selectedAddOns.reduce((sum, id) => {
    const addon = ADD_ONS.find(a => a.id === id);
    return sum + (addon?.monthlyPrice || 0);
  }, 0);

  const hasChanges = JSON.stringify(activeAddOns.sort()) !== JSON.stringify(selectedAddOns.sort());
  const priceDifference = newMonthlyTotal - currentMonthlyTotal;

  const toggleAddOn = (addonId: string) => {
    setSelectedAddOns(prev => 
      prev.includes(addonId) 
        ? prev.filter(id => id !== addonId)
        : [...prev, addonId]
    );
  };

  const handleSaveAddOns = async () => {
    setSaving(true);
    try {
      // Call edge function to update add-ons
      const { data, error } = await supabase.functions.invoke('validate-license', {
        body: {
          action: 'update-addons',
          licenseCode: licenseData?.code,
          email: licenseData?.email,
          addOns: selectedAddOns,
        },
      });

      if (error) throw error;

      setActiveAddOns(selectedAddOns);
      toast({
        title: 'Options mises à jour',
        description: 'Vos options ont été enregistrées avec succès.',
      });
    } catch (err) {
      console.error('Error saving add-ons:', err);
      toast({
        title: 'Erreur',
        description: 'Impossible de mettre à jour vos options.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (!isLicensed) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Veuillez vous connecter pour accéder à cette page.</p>
      </div>
    );
  }

  const Icon = planIcons[currentPlanId];
  const colors = colorClasses[planColors[currentPlanId]];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Mon abonnement</h1>
        <p className="text-muted-foreground mt-1">
          Gérez votre forfait et vos options
        </p>
      </div>

      {/* Current Plan Card */}
      <Card className={cn("border-2", colors.border)}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={cn("p-3 rounded-xl", colors.bg)}>
                <Icon className={cn("w-8 h-8", colors.text)} />
              </div>
              <div>
                <CardTitle className="text-2xl">{currentPlan.name}</CardTitle>
                <CardDescription>{currentPlan.tagline}</CardDescription>
              </div>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-foreground">{currentMonthlyTotal}€</p>
              <p className="text-sm text-muted-foreground">HT / mois</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/30 rounded-lg">
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">
                {currentPlan.limits.maxVehicles ?? '∞'}
              </p>
              <p className="text-sm text-muted-foreground">véhicules</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">
                {currentPlan.limits.maxDrivers ?? '∞'}
              </p>
              <p className="text-sm text-muted-foreground">conducteurs</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">
                {currentPlan.limits.maxClients ?? '∞'}
              </p>
              <p className="text-sm text-muted-foreground">clients</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">
                {currentPlan.limits.maxSavedTours ?? '∞'}
              </p>
              <p className="text-sm text-muted-foreground">tournées</p>
            </div>
          </div>

          {activeAddOns.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-medium mb-2">Options actives :</p>
              <div className="flex flex-wrap gap-2">
                {activeAddOns.map(id => {
                  const addon = ADD_ONS.find(a => a.id === id);
                  if (!addon) return null;
                  return (
                    <Badge key={id} variant="secondary" className="bg-success/20 text-success">
                      <Check className="w-3 h-3 mr-1" />
                      {addon.name}
                    </Badge>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="addons" className="w-full">
        <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
          <TabsTrigger value="addons" className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            Options
          </TabsTrigger>
          <TabsTrigger value="upgrade" className="flex items-center gap-2">
            <Crown className="w-4 h-4" />
            Changer de forfait
          </TabsTrigger>
        </TabsList>

        {/* Add-ons Tab */}
        <TabsContent value="addons" className="mt-6 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {availableAddOns.length === 0 ? (
                <Alert>
                  <Info className="w-4 h-4" />
                  <AlertDescription>
                    Toutes les fonctionnalités sont déjà incluses dans votre forfait {currentPlan.name}.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="grid gap-6 lg:grid-cols-3">
                  {/* Add-ons List */}
                  <div className="lg:col-span-2 space-y-4">
                    <h3 className="text-lg font-semibold">Options disponibles</h3>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {availableAddOns.map(addon => {
                        const isActive = selectedAddOns.includes(addon.id);
                        const wasActive = activeAddOns.includes(addon.id);
                        const IconComp = addonIcons[addon.icon] || Package;
                        
                        return (
                          <Card 
                            key={addon.id}
                            className={cn(
                              "cursor-pointer transition-all",
                              isActive 
                                ? "border-success bg-success/5" 
                                : "hover:border-primary/50"
                            )}
                            onClick={() => toggleAddOn(addon.id)}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-start gap-3">
                                <Checkbox checked={isActive} />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h4 className="font-medium text-sm">{addon.name}</h4>
                                    {wasActive && (
                                      <Badge variant="outline" className="text-xs border-success/50 text-success">
                                        Actif
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {addon.description}
                                  </p>
                                  <Badge 
                                    variant="outline" 
                                    className="mt-2 border-primary/50 text-primary"
                                  >
                                    +{addon.monthlyPrice}€/mois
                                  </Badge>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>

                  {/* Summary */}
                  <div className="lg:sticky lg:top-6 h-fit">
                    <Card className="border-2">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Euro className="w-5 h-5 text-primary" />
                          Récapitulatif
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Forfait {currentPlan.name}</span>
                          <span className="font-medium">{currentPlan.monthlyPrice}€</span>
                        </div>
                        
                        {selectedAddOns.length > 0 && (
                          <>
                            <Separator />
                            <div className="space-y-2">
                              {selectedAddOns.map(id => {
                                const addon = ADD_ONS.find(a => a.id === id);
                                if (!addon) return null;
                                return (
                                  <div key={id} className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">{addon.name}</span>
                                    <span className="text-success">+{addon.monthlyPrice}€</span>
                                  </div>
                                );
                              })}
                            </div>
                          </>
                        )}

                        <Separator />
                        
                        <div className="flex justify-between items-center">
                          <span className="font-bold">Total mensuel</span>
                          <span className="text-2xl font-bold text-primary">{newMonthlyTotal}€</span>
                        </div>

                        {hasChanges && priceDifference !== 0 && (
                          <Badge 
                            className={cn(
                              "w-full justify-center",
                              priceDifference > 0 
                                ? "bg-orange-500/20 text-orange-600" 
                                : "bg-success/20 text-success"
                            )}
                          >
                            {priceDifference > 0 ? '+' : ''}{priceDifference}€/mois
                          </Badge>
                        )}

                        <Button 
                          className="w-full" 
                          disabled={!hasChanges || saving}
                          onClick={handleSaveAddOns}
                        >
                          {saving ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Enregistrement...
                            </>
                          ) : (
                            <>
                              Mettre à jour
                              <ArrowRight className="w-4 h-4 ml-2" />
                            </>
                          )}
                        </Button>

                        <p className="text-xs text-muted-foreground text-center">
                          Les modifications seront effectives immédiatement.
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}
            </>
          )}
        </TabsContent>

        {/* Upgrade Tab */}
        <TabsContent value="upgrade" className="mt-6">
          <div className="grid gap-6 md:grid-cols-3">
            {PRICING_PLANS.map(plan => {
              const Icon = planIcons[plan.id];
              const colors = colorClasses[planColors[plan.id]];
              const isCurrent = plan.id === currentPlanId;
              const isUpgrade = PRICING_PLANS.findIndex(p => p.id === plan.id) > 
                               PRICING_PLANS.findIndex(p => p.id === currentPlanId);
              
              return (
                <Card 
                  key={plan.id}
                  className={cn(
                    "relative transition-all",
                    isCurrent && "border-2 border-primary",
                    !isCurrent && "hover:border-primary/50"
                  )}
                >
                  {isCurrent && (
                    <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary">
                      Forfait actuel
                    </Badge>
                  )}
                  {plan.popular && !isCurrent && (
                    <Badge className={cn("absolute -top-3 left-1/2 -translate-x-1/2", colors.button)}>
                      Le plus populaire
                    </Badge>
                  )}
                  
                  <CardHeader className="text-center">
                    <div className={cn("w-12 h-12 rounded-xl mx-auto mb-3", colors.bg)}>
                      <Icon className={cn("w-12 h-12 p-2.5", colors.text)} />
                    </div>
                    <CardTitle>{plan.name}</CardTitle>
                    <CardDescription>{plan.tagline}</CardDescription>
                    <div className="mt-4">
                      <span className="text-3xl font-bold">{plan.monthlyPrice}€</span>
                      <span className="text-muted-foreground">/mois</span>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="text-center p-2 bg-muted/30 rounded">
                        <p className="font-bold">{plan.limits.maxVehicles ?? '∞'}</p>
                        <p className="text-xs text-muted-foreground">véhicules</p>
                      </div>
                      <div className="text-center p-2 bg-muted/30 rounded">
                        <p className="font-bold">{plan.limits.maxDrivers ?? '∞'}</p>
                        <p className="text-xs text-muted-foreground">conducteurs</p>
                      </div>
                    </div>

                    <Button 
                      className={cn("w-full", isCurrent ? "opacity-50" : colors.button)}
                      disabled={isCurrent}
                      asChild={!isCurrent}
                    >
                      {isCurrent ? (
                        <span>Forfait actuel</span>
                      ) : (
                        <a 
                          href="https://optiflow.fr/tarifs" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-2"
                        >
                          {isUpgrade ? 'Passer à ce forfait' : 'Contacter le support'}
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Alert className="mt-6">
            <Info className="w-4 h-4" />
            <AlertDescription>
              Pour changer de forfait ou pour toute question sur votre abonnement, 
              contactez-nous à <a href="mailto:contact@optiflow.fr" className="text-primary hover:underline">contact@optiflow.fr</a>
            </AlertDescription>
          </Alert>
        </TabsContent>
      </Tabs>
    </div>
  );
}
