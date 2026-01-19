import { useState } from 'react';
import { 
  Sparkles,
  Star,
  Crown,
  Save,
  RotateCcw,
  ChevronRight,
  Shield,
  Zap,
  Info,
  Euro,
  Package,
  Truck,
  Users,
  Brain,
  FileText,
  Plug,
  TrendingUp,
  FileSpreadsheet,
  UserPlus,
  Route,
  Infinity,
  Headphones,
  GraduationCap,
  Building,
  Plus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { 
  LicenseFeatures, 
  PLAN_DEFAULTS, 
  PRICING_PLANS,
  ADD_ONS,
  FEATURE_CATEGORIES as FULL_FEATURE_CATEGORIES,
  type AddOn,
} from '@/types/features';

interface FeatureEditorProps {
  planType: 'start' | 'pro' | 'enterprise';
  currentFeatures: Partial<LicenseFeatures> | null;
  activeAddOns?: string[];
  onSave: (features: Partial<LicenseFeatures>, addOns: string[]) => Promise<void>;
  saving?: boolean;
}

const planIcons = {
  start: Sparkles,
  pro: Star,
  enterprise: Crown,
};

const planColors = {
  start: 'text-blue-500',
  pro: 'text-orange-500',
  enterprise: 'text-amber-500',
};

const planBgColors = {
  start: 'bg-blue-500/10 border-blue-500/30',
  pro: 'bg-orange-500/10 border-orange-500/30',
  enterprise: 'bg-amber-500/10 border-amber-500/30',
};

const planLabels = {
  start: 'Start - 29€/mois',
  pro: 'Pro - 79€/mois',
  enterprise: 'Enterprise - 199€/mois',
};

const addonIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  Brain,
  Building,
  FileText,
  Plug,
  Users,
  TrendingUp,
  FileSpreadsheet,
  Truck,
  UserPlus,
  Route,
  Infinity,
  Headphones,
  Shield,
  GraduationCap,
};

// Use the full feature categories from features.ts which includes pages, buttons, and company management
// Each category has { name, nameEn, features: [...] } structure from features.ts
const FEATURE_CATEGORIES = FULL_FEATURE_CATEGORIES.map(cat => ({
  categoryName: cat.name, // This is the display name like "📱 Navigation & Pages"
  features: cat.features.filter(f => !f.isLimit), // Exclude limit features (they have isLimit: true)
})).filter(c => c.features.length > 0);

// Limit definitions for admin UI - ALL limits including company users
const LIMIT_DEFINITIONS = [
  { key: 'max_vehicles' as keyof LicenseFeatures, label: 'Véhicules max', category: 'fleet', icon: '🚛' },
  { key: 'max_drivers' as keyof LicenseFeatures, label: 'Conducteurs max', category: 'personnel', icon: '👤' },
  { key: 'max_clients' as keyof LicenseFeatures, label: 'Clients max', category: 'clients', icon: '🧑‍💼' },
  { key: 'max_saved_tours' as keyof LicenseFeatures, label: 'Tournées sauvegardées', category: 'tours', icon: '📍' },
  { key: 'max_daily_charges' as keyof LicenseFeatures, label: 'Charges journalières', category: 'charges', icon: '📅' },
  { key: 'max_monthly_charges' as keyof LicenseFeatures, label: 'Charges mensuelles', category: 'charges', icon: '📆' },
  { key: 'max_yearly_charges' as keyof LicenseFeatures, label: 'Charges annuelles', category: 'charges', icon: '📅' },
  { key: 'max_company_users' as keyof LicenseFeatures, label: 'Utilisateurs société max', category: 'company', icon: '👥' },
];

export function FeatureEditor({ 
  planType, 
  currentFeatures, 
  activeAddOns = [],
  onSave, 
  saving = false 
}: FeatureEditorProps) {
  const defaults = PLAN_DEFAULTS[planType];
  const plan = PRICING_PLANS.find(p => p.id === planType)!;
  // Show ALL add-ons regardless of plan type - admin should be able to manage everything
  const availableAddOns = ADD_ONS;
  
  const [features, setFeatures] = useState<Partial<LicenseFeatures>>(() => ({
    ...defaults,
    ...currentFeatures,
  }));
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>(activeAddOns);
  const [hasChanges, setHasChanges] = useState(false);
  const [openCategories, setOpenCategories] = useState<string[]>(
    FEATURE_CATEGORIES.map(c => c.categoryName)
  );

  const handleToggle = (key: string) => {
    setFeatures(prev => ({
      ...prev,
      [key]: !(prev as any)[key],
    }));
    setHasChanges(true);
  };

  const handleLimitChange = (key: keyof LicenseFeatures, value: string) => {
    const numValue = value === '' ? null : parseInt(value, 10);
    setFeatures(prev => ({
      ...prev,
      [key]: isNaN(numValue as number) ? null : numValue,
    }));
    setHasChanges(true);
  };

  const handleAddonToggle = (addonId: string) => {
    setSelectedAddOns(prev => {
      if (prev.includes(addonId)) {
        return prev.filter(id => id !== addonId);
      } else {
        return [...prev, addonId];
      }
    });
    setHasChanges(true);
  };

  const handleReset = () => {
    setFeatures({ ...defaults });
    setSelectedAddOns([]);
    setHasChanges(true);
  };

  const handleSave = async () => {
    await onSave(features, selectedAddOns);
    setHasChanges(false);
  };

  const toggleCategory = (catName: string) => {
    setOpenCategories(prev => 
      prev.includes(catName) 
        ? prev.filter(c => c !== catName)
        : [...prev, catName]
    );
  };

  const PlanIcon = planIcons[planType];

  // Calculate addon pricing
  const addonsMonthlyTotal = selectedAddOns.reduce((sum, id) => {
    const addon = ADD_ONS.find(a => a.id === id);
    return sum + (addon?.monthlyPrice || 0);
  }, 0);

  // Count modifications - use all features from all categories
  const allFeatures = FULL_FEATURE_CATEGORIES.flatMap(cat => cat.features);
  const totalFeatureModifications = allFeatures.filter(f => {
    const key = f.key as keyof LicenseFeatures;
    return (features[key] as boolean) !== (defaults[key] as boolean);
  }).length;
  
  const totalLimitModifications = LIMIT_DEFINITIONS
    .filter(l => (features[l.key] as number | null) !== (defaults[l.key] as number | null)).length;

  const totalAddOnChanges = selectedAddOns.filter(id => !activeAddOns.includes(id)).length +
    activeAddOns.filter(id => !selectedAddOns.includes(id)).length;

  return (
    <Card className="border-2">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className={cn("p-2 rounded-lg", planBgColors[planType])}>
              <PlanIcon className={cn("w-5 h-5", planColors[planType])} />
            </div>
            <div>
              <CardTitle className="flex items-center gap-2 flex-wrap">
                Configuration de la licence
                <Badge variant="outline" className={cn("text-xs", planColors[planType])}>
                  {planLabels[planType]}
                </Badge>
              </CardTitle>
              <CardDescription>
                Personnalisez les fonctionnalités, limites et add-ons
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {(totalFeatureModifications + totalLimitModifications + totalAddOnChanges) > 0 && (
              <Badge variant="secondary" className="bg-primary/10 text-primary">
                {totalFeatureModifications + totalLimitModifications + totalAddOnChanges} modification(s)
              </Badge>
            )}
            {addonsMonthlyTotal > 0 && (
              <Badge className="bg-success/20 text-success border-success/30">
                <Euro className="w-3 h-3 mr-1" />
                +{addonsMonthlyTotal}€/mois
              </Badge>
            )}
            <Button variant="outline" size="sm" onClick={handleReset} disabled={saving}>
              <RotateCcw className="w-4 h-4 mr-1" />
              Défaut
            </Button>
            <Button size="sm" variant="gradient" onClick={handleSave} disabled={!hasChanges || saving}>
              <Save className="w-4 h-4 mr-1" />
              {saving ? 'Sauvegarde...' : 'Sauvegarder'}
            </Button>
          </div>
        </div>

        {/* Pricing summary */}
        <div className="mt-4 p-4 bg-muted/30 rounded-lg border">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-xs text-muted-foreground">Forfait de base</p>
              <p className="text-lg font-bold">{plan.monthlyPrice}€<span className="text-xs font-normal">/mois</span></p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Add-ons actifs</p>
              <p className="text-lg font-bold text-success">+{addonsMonthlyTotal}€<span className="text-xs font-normal">/mois</span></p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total mensuel</p>
              <p className="text-lg font-bold text-primary">{plan.monthlyPrice + addonsMonthlyTotal}€<span className="text-xs font-normal">/mois</span></p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total annuel</p>
              <p className="text-lg font-bold">{Math.round((plan.monthlyPrice + addonsMonthlyTotal) * 10)}€<span className="text-xs font-normal">/an (-17%)</span></p>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <Tabs defaultValue="addons" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="addons" className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              Add-ons
              {selectedAddOns.length > 0 && (
                <Badge variant="secondary" className="text-xs ml-1 bg-success/20 text-success">{selectedAddOns.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="features" className="flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Fonctionnalités
              {totalFeatureModifications > 0 && (
                <Badge variant="secondary" className="text-xs ml-1">{totalFeatureModifications}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="limits" className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Limites
              {totalLimitModifications > 0 && (
                <Badge variant="secondary" className="text-xs ml-1">{totalLimitModifications}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* ADD-ONS TAB */}
          <TabsContent value="addons" className="mt-0 space-y-4">
            <div className="flex items-start gap-2 p-3 bg-blue-500/10 rounded-lg border border-blue-500/30">
              <Info className="w-4 h-4 text-blue-500 mt-0.5" />
              <p className="text-sm text-foreground/80">
                Les add-ons permettent d'ajouter des fonctionnalités premium à cette licence. 
                Le prix s'ajoute au forfait de base.
              </p>
            </div>

            {availableAddOns.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Aucun add-on disponible.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Feature Add-ons */}
                {availableAddOns.filter(a => a.category === 'feature').length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                      <Zap className="w-4 h-4 text-primary" />
                      Fonctionnalités supplémentaires
                    </h4>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {availableAddOns.filter(a => a.category === 'feature').map((addon) => (
                        <AddonCard 
                          key={addon.id} 
                          addon={addon} 
                          isActive={selectedAddOns.includes(addon.id)}
                          onToggle={() => handleAddonToggle(addon.id)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Limit Add-ons */}
                {availableAddOns.filter(a => a.category === 'limit').length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                      <Shield className="w-4 h-4 text-orange-500" />
                      Extensions de limites
                    </h4>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {availableAddOns.filter(a => a.category === 'limit').map((addon) => (
                        <AddonCard 
                          key={addon.id} 
                          addon={addon} 
                          isActive={selectedAddOns.includes(addon.id)}
                          onToggle={() => handleAddonToggle(addon.id)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Support Add-ons */}
                {availableAddOns.filter(a => a.category === 'support').length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                      <Headphones className="w-4 h-4 text-green-500" />
                      Support & Services
                    </h4>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {availableAddOns.filter(a => a.category === 'support').map((addon) => (
                        <AddonCard 
                          key={addon.id} 
                          addon={addon} 
                          isActive={selectedAddOns.includes(addon.id)}
                          onToggle={() => handleAddonToggle(addon.id)}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          {/* FEATURES TAB */}
          <TabsContent value="features" className="mt-0 space-y-3">
            {FEATURE_CATEGORIES.map(({ categoryName, features: categoryFeatures }) => {
              const enabledCount = categoryFeatures.filter(f => (features as any)[f.key]).length;
              const modifiedCount = categoryFeatures.filter(f => 
                (features as any)[f.key] !== (defaults as any)[f.key]
              ).length;
              const isOpen = openCategories.includes(categoryName);
              
              return (
                <Collapsible 
                  key={categoryName} 
                  open={isOpen}
                  onOpenChange={() => toggleCategory(categoryName)}
                  className="border rounded-lg overflow-hidden"
                >
                  <CollapsibleTrigger className="flex items-center justify-between w-full p-3 hover:bg-muted/50 transition-colors bg-muted/20">
                    <div className="flex items-center gap-3">
                      <ChevronRight className={cn(
                        "w-4 h-4 text-muted-foreground transition-transform duration-200",
                        isOpen && "rotate-90"
                      )} />
                      <span className="font-medium text-sm">{categoryName}</span>
                      <Badge variant="secondary" className="text-xs">
                        {enabledCount}/{categoryFeatures.length}
                      </Badge>
                      {modifiedCount > 0 && (
                        <Badge className="text-xs bg-primary/20 text-primary border-primary/30">
                          {modifiedCount} modifiée(s)
                        </Badge>
                      )}
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="border-t">
                    <div className="divide-y">
                      {categoryFeatures.map((feature) => {
                        const isEnabled = (features as any)[feature.key] ?? false;
                        const isDefault = (defaults as any)[feature.key];
                        const isOverridden = isEnabled !== isDefault;
                        const hasAddon = feature.isAddonAvailable;
                        const addonActive = feature.addonId ? selectedAddOns.includes(feature.addonId) : false;

                        return (
                          <div 
                            key={feature.key} 
                            className={cn(
                              "flex items-center justify-between p-3 transition-colors",
                              isOverridden && "bg-primary/5",
                              addonActive && "bg-success/5"
                            )}
                          >
                            <div className="flex-1 pr-4">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium text-sm">{feature.label}</span>
                                {isOverridden && (
                                  <Badge variant="outline" className="text-xs border-primary/50 text-primary">
                                    Modifié
                                  </Badge>
                                )}
                                {addonActive && (
                                  <Badge className="text-xs bg-success/20 text-success border-success/30">
                                    Add-on actif
                                  </Badge>
                                )}
                                {hasAddon && !addonActive && (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger>
                                        <Badge variant="outline" className="text-xs border-orange-500/50 text-orange-500">
                                          <Plus className="w-3 h-3 mr-1" />
                                          Add-on dispo
                                        </Badge>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>Disponible en add-on payant</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                )}
                                <Badge 
                                  variant="secondary" 
                                  className={cn(
                                    "text-xs",
                                    feature.defaultPlan === 'start' && "bg-blue-500/20 text-blue-600",
                                    feature.defaultPlan === 'pro' && "bg-orange-500/20 text-orange-600",
                                    feature.defaultPlan === 'enterprise' && "bg-amber-500/20 text-amber-600",
                                  )}
                                >
                                  {feature.defaultPlan}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5">{feature.description}</p>
                            </div>
                            <Switch
                              checked={isEnabled || addonActive}
                              onCheckedChange={() => handleToggle(feature.key)}
                              disabled={addonActive}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </TabsContent>

          {/* LIMITS TAB */}
          <TabsContent value="limits" className="mt-0 space-y-4">
            <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg border">
              <Info className="w-4 h-4 text-muted-foreground mt-0.5" />
              <p className="text-sm text-muted-foreground">
                Laissez vide pour illimité. Ces limites s'appliquent au nombre maximum d'éléments que l'utilisateur peut créer.
              </p>
            </div>
            
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {LIMIT_DEFINITIONS.map((limit) => {
                const value = features[limit.key] as number | null;
                const defaultValue = defaults[limit.key] as number | null;
                const isOverridden = value !== defaultValue;

                return (
                  <div key={limit.key} className={cn(
                    "space-y-2 p-4 rounded-lg border transition-all",
                    isOverridden 
                      ? "border-primary/50 bg-primary/5 shadow-sm" 
                      : "border-border/50 bg-muted/30"
                  )}>
                    <div className="flex items-center justify-between">
                      <Label htmlFor={limit.key} className="text-sm font-medium flex items-center gap-2">
                        <span>{limit.icon}</span>
                        {limit.label}
                      </Label>
                      {isOverridden && (
                        <Badge variant="outline" className="text-xs border-primary/50 text-primary">
                          Modifié
                        </Badge>
                      )}
                    </div>
                    <Input
                      id={limit.key}
                      type="number"
                      min="0"
                      value={value ?? ''}
                      onChange={(e) => handleLimitChange(limit.key, e.target.value)}
                      placeholder={defaultValue !== null ? `${defaultValue}` : '∞ illimité'}
                      className={cn(
                        "w-full transition-colors",
                        isOverridden && "border-primary/50"
                      )}
                    />
                    <p className="text-xs text-muted-foreground">
                      Défaut forfait: <strong>{defaultValue !== null ? defaultValue : '∞'}</strong>
                    </p>
                  </div>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

// Addon Card Component
function AddonCard({ 
  addon, 
  isActive, 
  onToggle 
}: { 
  addon: AddOn; 
  isActive: boolean; 
  onToggle: () => void;
}) {
  const IconComponent = addonIcons[addon.icon] || Package;
  
  return (
    <div 
      onClick={onToggle}
      className={cn(
        "p-4 rounded-lg border-2 cursor-pointer transition-all",
        isActive 
          ? "border-success bg-success/10 shadow-md" 
          : "border-border hover:border-primary/50 hover:bg-muted/50"
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn(
          "p-2 rounded-lg",
          isActive ? "bg-success/20" : "bg-muted"
        )}>
          <IconComponent className={cn(
            "w-5 h-5",
            isActive ? "text-success" : "text-muted-foreground"
          )} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h5 className="font-medium text-sm truncate">{addon.name}</h5>
            <Checkbox checked={isActive} onCheckedChange={onToggle} />
          </div>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
            {addon.description}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="outline" className={cn(
              "text-xs",
              addon.monthlyPrice === 0 
                ? "border-success/50 text-success" 
                : "border-primary/50 text-primary"
            )}>
              {addon.monthlyPrice === 0 
                ? `${addon.yearlyPrice}€ (one-time)` 
                : `+${addon.monthlyPrice}€/mois`
              }
            </Badge>
            {addon.monthlyPrice > 0 && (
              <span className="text-xs text-muted-foreground">
                ou {addon.yearlyPrice}€/an
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
