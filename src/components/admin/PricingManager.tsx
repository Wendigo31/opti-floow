import { useState, useMemo } from 'react';
import {
  CreditCard,
  Package,
  Settings2,
  Zap,
  Star,
  Crown,
  Euro,
  Plus,
  Minus,
  Check,
  X,
  TrendingUp,
  Users,
  Truck,
  FileText,
  Brain,
  Plug,
  Shield,
  Headphones,
  GraduationCap,
  Building,
  Calculator,
  Route,
  BarChart3,
  History,
  AlertTriangle,
  FileSpreadsheet,
  UserPlus,
  UserCog,
  Bookmark,
  Infinity,
  Save,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Info,
  Edit3,
  DollarSign,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { PRICING_PLANS, ADD_ONS, type AddOn, type PricingPlan } from '@/types/pricing';

interface PricingManagerProps {
  licenseId: string;
  planType: 'start' | 'pro' | 'enterprise';
  activeAddOns: string[];
  customPricing?: {
    basePrice?: number;
    addonsTotal?: number;
    billingPeriod?: 'monthly' | 'yearly';
  };
  onSave: (data: {
    planType: string;
    addOns: string[];
    customPricing?: {
      basePrice: number;
      addonsTotal: number;
      billingPeriod: 'monthly' | 'yearly';
    };
  }) => Promise<void>;
  saving?: boolean;
}

const planIcons = {
  start: Zap,
  pro: Star,
  enterprise: Crown,
};

const planColors = {
  start: { text: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/30' },
  pro: { text: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/30' },
  enterprise: { text: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/30' },
};

const categoryIcons: Record<string, React.ElementType> = {
  feature: Zap,
  limit: Shield,
  support: Headphones,
};

const addonIconMap: Record<string, React.ElementType> = {
  Bookmark: Bookmark,
  Route: Route,
  History: History,
  Calculator: Calculator,
  AlertTriangle: AlertTriangle,
  BarChart3: BarChart3,
  Truck: Truck,
  TrendingUp: TrendingUp,
  FileSpreadsheet: FileSpreadsheet,
  UserPlus: UserPlus,
  UserCog: UserCog,
  Headphones: Headphones,
  Brain: Brain,
  Users: Users,
  FileText: FileText,
  Building: Building,
  Plug: Plug,
  Shield: Shield,
  Infinity: Infinity,
  GraduationCap: GraduationCap,
};

export function PricingManager({
  licenseId,
  planType: initialPlanType,
  activeAddOns: initialActiveAddOns,
  customPricing,
  onSave,
  saving = false,
}: PricingManagerProps) {
  const [selectedPlan, setSelectedPlan] = useState(initialPlanType);
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>(initialActiveAddOns);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>(
    customPricing?.billingPeriod || 'monthly'
  );
  const [customBasePrice, setCustomBasePrice] = useState<number | null>(
    customPricing?.basePrice ?? null
  );
  const [hasChanges, setHasChanges] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['feature', 'limit', 'support']);

  // Get current plan details
  const currentPlan = useMemo(
    () => PRICING_PLANS.find((p) => p.id === selectedPlan)!,
    [selectedPlan]
  );

  // Filter add-ons by plan (show all but mark unavailable)
  const addOnsByCategory = useMemo(() => {
    const categories: Record<string, { available: AddOn[]; unavailable: AddOn[] }> = {
      feature: { available: [], unavailable: [] },
      limit: { available: [], unavailable: [] },
      support: { available: [], unavailable: [] },
    };

    ADD_ONS.forEach((addon) => {
      if (addon.availableFor.includes(selectedPlan)) {
        categories[addon.category].available.push(addon);
      } else {
        categories[addon.category].unavailable.push(addon);
      }
    });

    // Sort by price descending for profitability
    Object.values(categories).forEach((cat) => {
      cat.available.sort((a, b) => b.monthlyPrice - a.monthlyPrice);
      cat.unavailable.sort((a, b) => b.monthlyPrice - a.monthlyPrice);
    });

    return categories;
  }, [selectedPlan]);

  // Calculate pricing
  const pricing = useMemo(() => {
    const baseMonthly = customBasePrice ?? currentPlan.monthlyPrice;
    const baseYearly = customBasePrice ? customBasePrice * 10 : currentPlan.yearlyPrice;

    const addonsMonthly = selectedAddOns.reduce((sum, id) => {
      const addon = ADD_ONS.find((a) => a.id === id);
      return sum + (addon?.monthlyPrice || 0);
    }, 0);

    const addonsYearly = selectedAddOns.reduce((sum, id) => {
      const addon = ADD_ONS.find((a) => a.id === id);
      return sum + (addon?.yearlyPrice || 0);
    }, 0);

    return {
      baseMonthly,
      baseYearly,
      addonsMonthly,
      addonsYearly,
      totalMonthly: baseMonthly + addonsMonthly,
      totalYearly: baseYearly + addonsYearly,
      yearlySavings: (baseMonthly + addonsMonthly) * 12 - (baseYearly + addonsYearly),
    };
  }, [selectedPlan, selectedAddOns, customBasePrice, currentPlan]);

  // Handlers
  const handlePlanChange = (planId: string) => {
    setSelectedPlan(planId as typeof selectedPlan);
    // Reset add-ons not available for new plan
    setSelectedAddOns((prev) =>
      prev.filter((id) => ADD_ONS.find((a) => a.id === id)?.availableFor.includes(planId as any))
    );
    setHasChanges(true);
  };

  const toggleAddOn = (addonId: string) => {
    setSelectedAddOns((prev) =>
      prev.includes(addonId) ? prev.filter((id) => id !== addonId) : [...prev, addonId]
    );
    setHasChanges(true);
  };

  const handleReset = () => {
    setSelectedPlan(initialPlanType);
    setSelectedAddOns(initialActiveAddOns);
    setBillingPeriod(customPricing?.billingPeriod || 'monthly');
    setCustomBasePrice(customPricing?.basePrice ?? null);
    setHasChanges(false);
  };

  const handleSave = async () => {
    await onSave({
      planType: selectedPlan,
      addOns: selectedAddOns,
      customPricing: {
        basePrice: customBasePrice ?? currentPlan.monthlyPrice,
        addonsTotal: pricing.addonsMonthly,
        billingPeriod,
      },
    });
    setHasChanges(false);
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]
    );
  };

  const PlanIcon = planIcons[selectedPlan];

  return (
    <Card className="border-2">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className={cn('p-2.5 rounded-xl', planColors[selectedPlan].bg)}>
              <PlanIcon className={cn('w-6 h-6', planColors[selectedPlan].text)} />
            </div>
            <div>
              <CardTitle className="flex items-center gap-2 flex-wrap">
                Tarification & Add-ons
                <Badge variant="outline" className={cn('text-xs', planColors[selectedPlan].text)}>
                  {currentPlan.name}
                </Badge>
              </CardTitle>
              <CardDescription>Contrôle total sur le forfait et les options</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {hasChanges && (
              <Badge variant="secondary" className="bg-warning/20 text-warning">
                Modifications non sauvegardées
              </Badge>
            )}
            <Button variant="outline" size="sm" onClick={handleReset} disabled={saving || !hasChanges}>
              <RotateCcw className="w-4 h-4 mr-1" />
              Annuler
            </Button>
            <Button
              size="sm"
              variant="gradient"
              onClick={handleSave}
              disabled={!hasChanges || saving}
            >
              <Save className="w-4 h-4 mr-1" />
              {saving ? 'Sauvegarde...' : 'Sauvegarder'}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Pricing Summary Card */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-muted/50 to-muted/30 border">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-primary" />
              Résumé facturation
            </h3>
            <div className="flex items-center gap-2">
              <Button
                variant={billingPeriod === 'monthly' ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setBillingPeriod('monthly');
                  setHasChanges(true);
                }}
              >
                Mensuel
              </Button>
              <Button
                variant={billingPeriod === 'yearly' ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setBillingPeriod('yearly');
                  setHasChanges(true);
                }}
              >
                Annuel
                <Badge className="ml-1.5 bg-success/20 text-success text-[10px] px-1.5">-17%</Badge>
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 rounded-xl bg-background/50">
              <p className="text-xs text-muted-foreground mb-1">Forfait de base</p>
              <p className="text-2xl font-bold">
                {billingPeriod === 'monthly' ? pricing.baseMonthly : pricing.baseYearly}€
              </p>
              <p className="text-xs text-muted-foreground">
                {billingPeriod === 'monthly' ? '/mois' : '/an'}
              </p>
            </div>
            <div className="text-center p-3 rounded-xl bg-success/5 border border-success/20">
              <p className="text-xs text-success mb-1">Add-ons actifs ({selectedAddOns.length})</p>
              <p className="text-2xl font-bold text-success">
                +{billingPeriod === 'monthly' ? pricing.addonsMonthly : pricing.addonsYearly}€
              </p>
              <p className="text-xs text-muted-foreground">
                {billingPeriod === 'monthly' ? '/mois' : '/an'}
              </p>
            </div>
            <div className="text-center p-3 rounded-xl bg-primary/5 border border-primary/20">
              <p className="text-xs text-primary mb-1">Total facturé</p>
              <p className="text-2xl font-bold text-primary">
                {billingPeriod === 'monthly' ? pricing.totalMonthly : pricing.totalYearly}€
              </p>
              <p className="text-xs text-muted-foreground">
                {billingPeriod === 'monthly' ? '/mois' : '/an'}
              </p>
            </div>
            <div className="text-center p-3 rounded-xl bg-background/50">
              <p className="text-xs text-muted-foreground mb-1">CA annuel estimé</p>
              <p className="text-2xl font-bold">
                {billingPeriod === 'monthly'
                  ? pricing.totalMonthly * 12
                  : pricing.totalYearly}
                €
              </p>
              {billingPeriod === 'yearly' && pricing.yearlySavings > 0 && (
                <p className="text-xs text-success">
                  Économie: {pricing.yearlySavings}€
                </p>
              )}
            </div>
          </div>

          {/* Custom price override */}
          <div className="mt-4 pt-4 border-t flex items-center gap-4">
            <div className="flex-1">
              <Label htmlFor="customPrice" className="text-xs text-muted-foreground">
                Prix de base personnalisé (optionnel)
              </Label>
              <div className="flex items-center gap-2 mt-1">
                <Input
                  id="customPrice"
                  type="number"
                  min="0"
                  value={customBasePrice ?? ''}
                  onChange={(e) => {
                    const val = e.target.value === '' ? null : parseFloat(e.target.value);
                    setCustomBasePrice(val);
                    setHasChanges(true);
                  }}
                  placeholder={`${currentPlan.monthlyPrice}€ (défaut)`}
                  className="w-32"
                />
                <span className="text-sm text-muted-foreground">€/mois</span>
                {customBasePrice !== null && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setCustomBasePrice(null);
                      setHasChanges(true);
                    }}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        <Tabs defaultValue="plan" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="plan" className="flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              Forfait
            </TabsTrigger>
            <TabsTrigger value="addons" className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              Add-ons
              {selectedAddOns.length > 0 && (
                <Badge className="bg-success/20 text-success text-xs">{selectedAddOns.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Plan Selection Tab */}
          <TabsContent value="plan" className="mt-0">
            <div className="grid gap-4 md:grid-cols-3">
              {PRICING_PLANS.map((plan) => {
                const Icon = planIcons[plan.id];
                const isSelected = selectedPlan === plan.id;
                const colors = planColors[plan.id];

                return (
                  <div
                    key={plan.id}
                    onClick={() => handlePlanChange(plan.id)}
                    className={cn(
                      'p-5 rounded-2xl border-2 cursor-pointer transition-all duration-300',
                      isSelected
                        ? `${colors.border} ${colors.bg} shadow-lg`
                        : 'border-border/50 hover:border-primary/30 bg-card'
                    )}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className={cn('p-2 rounded-xl', isSelected ? colors.bg : 'bg-muted')}>
                        <Icon className={cn('w-5 h-5', isSelected ? colors.text : 'text-muted-foreground')} />
                      </div>
                      {isSelected && <Check className={cn('w-5 h-5', colors.text)} />}
                      {plan.popular && !isSelected && (
                        <Badge className="bg-orange-500/20 text-orange-600 text-xs">Populaire</Badge>
                      )}
                    </div>
                    <h4 className="font-bold text-base">{plan.name}</h4>
                    <p className="text-xs text-muted-foreground mt-1">{plan.tagline}</p>
                    <div className="mt-3">
                      {plan.isCustomPricing ? (
                        <p className="text-lg font-bold">Sur devis</p>
                      ) : (
                        <>
                          <p className="text-2xl font-bold">
                            {plan.monthlyPrice}€<span className="text-sm font-normal">/mois</span>
                          </p>
                          <p className="text-xs text-muted-foreground">
                            ou {plan.yearlyPrice}€/an (-{plan.yearlyDiscount}%)
                          </p>
                        </>
                      )}
                    </div>
                    <div className="mt-3 pt-3 border-t border-border/50">
                      <p className="text-xs text-muted-foreground line-clamp-2">{plan.target}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Plan Limits Preview */}
            <div className="mt-6 p-4 rounded-xl bg-muted/30 border">
              <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary" />
                Limites du forfait {currentPlan.name}
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                {Object.entries(currentPlan.limits).map(([key, value]) => {
                  const labels: Record<string, string> = {
                    maxVehicles: 'Véhicules',
                    maxDrivers: 'Conducteurs',
                    maxClients: 'Clients',
                    maxSavedTours: 'Tournées',
                    maxDailyCharges: 'Charges/jour',
                    maxMonthlyCharges: 'Charges/mois',
                    maxYearlyCharges: 'Charges/an',
                  };
                  return (
                    <div key={key} className="flex items-center justify-between p-2 rounded-lg bg-background/50">
                      <span className="text-muted-foreground">{labels[key] || key}</span>
                      <span className="font-semibold">{value === null ? '∞' : value}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </TabsContent>

          {/* Add-ons Tab */}
          <TabsContent value="addons" className="mt-0 space-y-4">
            <div className="flex items-start gap-2 p-3 bg-blue-500/10 rounded-xl border border-blue-500/30">
              <Info className="w-4 h-4 text-blue-500 mt-0.5" />
              <div className="text-sm">
                <p className="text-foreground/80">
                  Les add-ons grisés ne sont pas disponibles pour le forfait{' '}
                  <span className={cn('font-semibold', planColors[selectedPlan].text)}>
                    {currentPlan.name}
                  </span>
                  . Changez de forfait pour y accéder.
                </p>
              </div>
            </div>

            {/* Add-on Categories */}
            {(['feature', 'limit', 'support'] as const).map((category) => {
              const { available, unavailable } = addOnsByCategory[category];
              const CategoryIcon = categoryIcons[category];
              const categoryLabels = {
                feature: 'Fonctionnalités',
                limit: 'Extensions de limites',
                support: 'Support & Services',
              };
              const isExpanded = expandedCategories.includes(category);
              const activeInCategory = available.filter((a) => selectedAddOns.includes(a.id)).length;

              return (
                <Collapsible
                  key={category}
                  open={isExpanded}
                  onOpenChange={() => toggleCategory(category)}
                >
                  <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-xl hover:bg-muted/50 transition-colors bg-muted/20 border">
                    <div className="flex items-center gap-3">
                      <CategoryIcon className="w-4 h-4 text-primary" />
                      <span className="font-semibold text-sm">{categoryLabels[category]}</span>
                      <Badge variant="secondary" className="text-xs">
                        {available.length + unavailable.length}
                      </Badge>
                      {activeInCategory > 0 && (
                        <Badge className="bg-success/20 text-success text-xs">
                          {activeInCategory} actif(s)
                        </Badge>
                      )}
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    )}
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      {/* Available add-ons */}
                      {available.map((addon) => (
                        <AddOnCard
                          key={addon.id}
                          addon={addon}
                          isActive={selectedAddOns.includes(addon.id)}
                          onToggle={() => toggleAddOn(addon.id)}
                          disabled={false}
                        />
                      ))}
                      {/* Unavailable add-ons */}
                      {unavailable.map((addon) => (
                        <AddOnCard
                          key={addon.id}
                          addon={addon}
                          isActive={false}
                          onToggle={() => {}}
                          disabled={true}
                          unavailableFor={selectedPlan}
                        />
                      ))}
                    </div>
                    {available.length === 0 && unavailable.length === 0 && (
                      <p className="text-center text-sm text-muted-foreground py-4">
                        Aucun add-on dans cette catégorie
                      </p>
                    )}
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

// Add-on Card Component
function AddOnCard({
  addon,
  isActive,
  onToggle,
  disabled,
  unavailableFor,
}: {
  addon: AddOn;
  isActive: boolean;
  onToggle: () => void;
  disabled: boolean;
  unavailableFor?: string;
}) {
  const IconComponent = addonIconMap[addon.icon] || Package;

  return (
    <div
      onClick={!disabled ? onToggle : undefined}
      className={cn(
        'p-4 rounded-xl border-2 transition-all duration-200',
        disabled
          ? 'border-border/30 bg-muted/20 opacity-50 cursor-not-allowed'
          : isActive
          ? 'border-success bg-success/10 shadow-md cursor-pointer'
          : 'border-border/50 hover:border-primary/40 hover:bg-muted/30 cursor-pointer'
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'p-2.5 rounded-xl flex-shrink-0',
            disabled ? 'bg-muted/50' : isActive ? 'bg-success/20' : 'bg-muted'
          )}
        >
          <IconComponent
            className={cn(
              'w-5 h-5',
              disabled ? 'text-muted-foreground/50' : isActive ? 'text-success' : 'text-muted-foreground'
            )}
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h5 className={cn('font-semibold text-sm truncate', disabled && 'text-muted-foreground')}>
              {addon.name}
            </h5>
            {!disabled && <Checkbox checked={isActive} onCheckedChange={onToggle} />}
          </div>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{addon.description}</p>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {addon.monthlyPrice === 0 ? (
              <Badge variant="outline" className="text-xs border-success/50 text-success">
                {addon.yearlyPrice}€ (one-time)
              </Badge>
            ) : (
              <>
                <Badge
                  variant="outline"
                  className={cn(
                    'text-xs',
                    disabled ? 'border-muted text-muted-foreground' : 'border-primary/50 text-primary'
                  )}
                >
                  +{addon.monthlyPrice}€/mois
                </Badge>
                <span className="text-xs text-muted-foreground">ou {addon.yearlyPrice}€/an</span>
              </>
            )}
            {disabled && unavailableFor && (
              <Badge variant="secondary" className="text-xs">
                Non dispo. ({unavailableFor})
              </Badge>
            )}
          </div>
          {addon.availableFor.length < 3 && !disabled && (
            <div className="mt-2">
              <span className="text-[10px] text-muted-foreground">
                Dispo. pour:{' '}
                {addon.availableFor.map((p) => (
                  <Badge key={p} variant="secondary" className="text-[10px] mr-1 px-1.5 py-0">
                    {p}
                  </Badge>
                ))}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
