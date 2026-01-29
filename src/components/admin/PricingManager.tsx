import { useMemo } from 'react';
import {
  Package,
  Zap,
  Star,
  Crown,
  Check,
  X,
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
  TrendingUp,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { PRICING_PLANS, ADD_ONS, type AddOn, type PricingPlan } from '@/types/pricing';

interface PricingManagerProps {
  licenseId: string;
  planType: 'start' | 'pro' | 'enterprise';
  activeAddOns: string[];
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

// All features to display in comparison
const FEATURE_COMPARISON = [
  { key: 'basic_calculator', label: 'Calcul de rentabilité', icon: 'Calculator' },
  { key: 'itinerary_planning', label: 'Planification itinéraire', icon: 'Route' },
  { key: 'dashboard_basic', label: 'Tableau de bord simplifié', icon: 'BarChart3' },
  { key: 'dashboard_analytics', label: 'Tableau de bord analytique', icon: 'BarChart3' },
  { key: 'forecast', label: 'Prévisionnel', icon: 'TrendingUp' },
  { key: 'trip_history', label: 'Historique des trajets', icon: 'History' },
  { key: 'saved_tours', label: 'Tournées sauvegardées', icon: 'Bookmark' },
  { key: 'multi_drivers', label: 'Multi-conducteurs', icon: 'Users' },
  { key: 'cost_analysis', label: 'Analyse des coûts avancée', icon: 'Calculator' },
  { key: 'cost_analysis_basic', label: 'Analyse des coûts basique', icon: 'Calculator' },
  { key: 'margin_alerts', label: 'Alertes de marge', icon: 'AlertTriangle' },
  { key: 'auto_pricing', label: 'Tarification automatique avancée', icon: 'Calculator' },
  { key: 'auto_pricing_basic', label: 'Tarification automatique', icon: 'Calculator' },
  { key: 'pdf_export_basic', label: 'Export PDF basique', icon: 'FileText' },
  { key: 'pdf_export_pro', label: 'Export PDF avancé', icon: 'FileText' },
  { key: 'excel_export', label: 'Export Excel/CSV', icon: 'FileSpreadsheet' },
  { key: 'client_analysis_basic', label: 'Analyse clients', icon: 'Users' },
  { key: 'client_analysis', label: 'Analyse clients avancée', icon: 'Users' },
  { key: 'ai_optimization', label: 'Optimisation IA', icon: 'Brain' },
  { key: 'ai_pdf_analysis', label: 'Analyse IA des PDF', icon: 'Brain' },
  { key: 'multi_agency', label: 'Multi-agences', icon: 'Building' },
  { key: 'multi_users', label: 'Multi-utilisateurs', icon: 'Users' },
  { key: 'tms_erp_integration', label: 'Intégration TMS/ERP', icon: 'Plug' },
  { key: 'smart_quotes', label: 'Devis intelligents', icon: 'FileText' },
  { key: 'fleet_basic', label: 'Gestion flotte basique', icon: 'Truck' },
  { key: 'fleet_management', label: 'Gestion flotte avancée', icon: 'Truck' },
  { key: 'dynamic_charts', label: 'Graphiques dynamiques', icon: 'BarChart3' },
  { key: 'monthly_tracking', label: 'Suivi mensuel', icon: 'BarChart3' },
];

export function PricingManager({
  licenseId,
  planType,
  activeAddOns,
}: PricingManagerProps) {
  const currentPlan = useMemo(
    () => PRICING_PLANS.find((p) => p.id === planType)!,
    [planType]
  );

  // Get all active features (from plan + add-ons)
  const activeFeatures = useMemo(() => {
    const planFeatures = new Set(currentPlan.features);
    
    // Add features from active add-ons
    activeAddOns.forEach(addonId => {
      const addon = ADD_ONS.find(a => a.id === addonId);
      if (addon?.featureKey) {
        planFeatures.add(addon.featureKey);
      }
    });
    
    return planFeatures;
  }, [currentPlan, activeAddOns]);

  // Check if feature is available in a plan
  const isFeatureInPlan = (featureKey: string, plan: PricingPlan) => {
    return plan.features.includes(featureKey);
  };

  // Check if feature is available as add-on for a plan
  const isFeatureAddOnFor = (featureKey: string, planId: string) => {
    return ADD_ONS.some(addon => 
      addon.featureKey === featureKey && addon.availableFor.includes(planId as any)
    );
  };

  // Group add-ons by category
  const addOnsByCategory = useMemo(() => {
    const categories: Record<string, AddOn[]> = {
      feature: [],
      limit: [],
      support: [],
    };

    ADD_ONS.forEach((addon) => {
      categories[addon.category].push(addon);
    });

    // Sort by price descending
    Object.values(categories).forEach((cat) => {
      cat.sort((a, b) => b.monthlyPrice - a.monthlyPrice);
    });

    return categories;
  }, []);

  const PlanIcon = planIcons[planType];

  return (
    <Card className="border-2">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className={cn('p-2.5 rounded-xl', planColors[planType].bg)}>
            <PlanIcon className={cn('w-6 h-6', planColors[planType].text)} />
          </div>
          <div>
            <CardTitle className="flex items-center gap-2 flex-wrap">
              Comparatif des fonctionnalités
              <Badge variant="outline" className={cn('text-xs', planColors[planType].text)}>
                {currentPlan.name}
              </Badge>
            </CardTitle>
            <CardDescription>
              Vue des fonctionnalités et add-ons selon les versions
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Current plan status */}
        <div className="p-4 rounded-xl bg-gradient-to-br from-muted/50 to-muted/30 border">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Forfait actuel</p>
              <p className="text-xl font-bold flex items-center gap-2">
                <PlanIcon className={cn('w-5 h-5', planColors[planType].text)} />
                {currentPlan.name}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Add-ons actifs</p>
              <p className="text-xl font-bold text-success">{activeAddOns.length}</p>
            </div>
          </div>
        </div>

        <Tabs defaultValue="features" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="features" className="flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Fonctionnalités
            </TabsTrigger>
            <TabsTrigger value="addons" className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              Add-ons
              {activeAddOns.length > 0 && (
                <Badge className="bg-success/20 text-success text-xs">{activeAddOns.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Features Comparison Tab */}
          <TabsContent value="features" className="mt-0">
            <ScrollArea className="h-[500px] pr-4">
              <div className="space-y-1">
                {/* Header */}
                <div className="grid grid-cols-4 gap-2 p-3 bg-muted/50 rounded-lg sticky top-0 z-10 border-b">
                  <div className="font-semibold text-sm">Fonctionnalité</div>
                  {PRICING_PLANS.map(plan => {
                    const Icon = planIcons[plan.id];
                    return (
                      <div 
                        key={plan.id} 
                        className={cn(
                          "text-center font-semibold text-sm flex items-center justify-center gap-1",
                          plan.id === planType && planColors[plan.id].text
                        )}
                      >
                        <Icon className="w-4 h-4" />
                        {plan.id.toUpperCase()}
                      </div>
                    );
                  })}
                </div>

                {/* Feature rows */}
                {FEATURE_COMPARISON.map((feature) => {
                  const IconComponent = addonIconMap[feature.icon] || Zap;
                  const isActive = activeFeatures.has(feature.key);
                  
                  return (
                    <div 
                      key={feature.key}
                      className={cn(
                        "grid grid-cols-4 gap-2 p-3 rounded-lg transition-colors",
                        isActive ? "bg-success/5 border border-success/20" : "hover:bg-muted/30"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <IconComponent className={cn(
                          "w-4 h-4 flex-shrink-0",
                          isActive ? "text-success" : "text-muted-foreground"
                        )} />
                        <span className={cn(
                          "text-sm",
                          isActive && "font-medium text-foreground"
                        )}>
                          {feature.label}
                        </span>
                        {isActive && (
                          <Badge className="bg-success/20 text-success text-[10px] px-1.5 py-0">
                            Actif
                          </Badge>
                        )}
                      </div>
                      
                      {PRICING_PLANS.map(plan => {
                        const included = isFeatureInPlan(feature.key, plan);
                        const asAddon = isFeatureAddOnFor(feature.key, plan.id);
                        const isPlanActive = plan.id === planType;
                        
                        return (
                          <div 
                            key={plan.id} 
                            className={cn(
                              "flex items-center justify-center",
                              isPlanActive && "font-semibold"
                            )}
                          >
                            {included ? (
                              <div className={cn(
                                "flex items-center gap-1 px-2 py-0.5 rounded-full text-xs",
                                isPlanActive 
                                  ? "bg-success/20 text-success" 
                                  : "bg-muted text-muted-foreground"
                              )}>
                                <Check className="w-3.5 h-3.5" />
                                Inclus
                              </div>
                            ) : asAddon ? (
                              <div className={cn(
                                "flex items-center gap-1 px-2 py-0.5 rounded-full text-xs",
                                isPlanActive 
                                  ? "bg-primary/20 text-primary" 
                                  : "bg-muted/50 text-muted-foreground"
                              )}>
                                <Package className="w-3.5 h-3.5" />
                                Add-on
                              </div>
                            ) : (
                              <X className="w-4 h-4 text-muted-foreground/40" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Add-ons Tab */}
          <TabsContent value="addons" className="mt-0">
            <ScrollArea className="h-[500px] pr-4">
              <div className="space-y-6">
                {(['feature', 'limit', 'support'] as const).map((category) => {
                  const addons = addOnsByCategory[category];
                  const CategoryIcon = categoryIcons[category];
                  const categoryLabels = {
                    feature: 'Fonctionnalités',
                    limit: 'Extensions de limites',
                    support: 'Support & Services',
                  };
                  
                  if (addons.length === 0) return null;

                  return (
                    <div key={category}>
                      <div className="flex items-center gap-2 mb-3">
                        <CategoryIcon className="w-4 h-4 text-primary" />
                        <h3 className="font-semibold text-sm">{categoryLabels[category]}</h3>
                        <Badge variant="secondary" className="text-xs">{addons.length}</Badge>
                      </div>
                      
                      {/* Header */}
                      <div className="grid grid-cols-5 gap-2 p-2 bg-muted/50 rounded-lg mb-2 text-xs font-medium">
                        <div className="col-span-2">Add-on</div>
                        {PRICING_PLANS.map(plan => (
                          <div key={plan.id} className="text-center">
                            {plan.id.toUpperCase()}
                          </div>
                        ))}
                      </div>

                      {/* Add-on rows */}
                      <div className="space-y-1">
                        {addons.map((addon) => {
                          const IconComponent = addonIconMap[addon.icon] || Package;
                          const isActive = activeAddOns.includes(addon.id);
                          
                          return (
                            <div 
                              key={addon.id}
                              className={cn(
                                "grid grid-cols-5 gap-2 p-3 rounded-lg transition-colors",
                                isActive 
                                  ? "bg-success/10 border border-success/30" 
                                  : "hover:bg-muted/30 border border-transparent"
                              )}
                            >
                              <div className="col-span-2 flex items-start gap-2">
                                <div className={cn(
                                  "p-1.5 rounded-lg flex-shrink-0",
                                  isActive ? "bg-success/20" : "bg-muted"
                                )}>
                                  <IconComponent className={cn(
                                    "w-4 h-4",
                                    isActive ? "text-success" : "text-muted-foreground"
                                  )} />
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className={cn(
                                      "text-sm font-medium truncate",
                                      isActive && "text-success"
                                    )}>
                                      {addon.name}
                                    </span>
                                    {isActive && (
                                      <Badge className="bg-success text-success-foreground text-[10px] px-1.5 py-0">
                                        Actif
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                                    {addon.description}
                                  </p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                      {addon.monthlyPrice > 0 ? `${addon.monthlyPrice}€/mois` : `${addon.yearlyPrice}€ (one-time)`}
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                              
                              {PRICING_PLANS.map(plan => {
                                const available = addon.availableFor.includes(plan.id);
                                const isPlanActive = plan.id === planType;
                                const isActiveForThisPlan = isPlanActive && isActive;
                                
                                return (
                                  <div 
                                    key={plan.id} 
                                    className="flex items-center justify-center"
                                  >
                                    {available ? (
                                      isActiveForThisPlan ? (
                                        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-success/20 text-success text-xs">
                                          <Check className="w-3.5 h-3.5" />
                                          Actif
                                        </div>
                                      ) : (
                                        <Check className={cn(
                                          "w-4 h-4",
                                          isPlanActive ? planColors[plan.id].text : "text-muted-foreground"
                                        )} />
                                      )
                                    ) : (
                                      <X className="w-4 h-4 text-muted-foreground/40" />
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        {/* Legend */}
        <div className="flex items-center gap-4 flex-wrap p-3 bg-muted/30 rounded-lg text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-success/20 border border-success/40" />
            <span className="text-muted-foreground">Actif sur cette licence</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">Inclus dans le forfait</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Package className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">Disponible en add-on</span>
          </div>
          <div className="flex items-center gap-1.5">
            <X className="w-3.5 h-3.5 text-muted-foreground/40" />
            <span className="text-muted-foreground">Non disponible</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
