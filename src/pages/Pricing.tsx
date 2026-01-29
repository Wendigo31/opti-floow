import { useState, useEffect } from 'react';
import { 
  Check, 
  X, 
  Zap, 
  Rocket, 
  Building2, 
  HelpCircle, 
  Calculator, 
  Truck, 
  FileText, 
  Shield, 
  Video,
  Package,
  Brain,
  Building,
  Plug,
  Users,
  TrendingUp,
  FileSpreadsheet,
  UserPlus,
  Route,
  Infinity,
  Headphones,
  GraduationCap,
  Plus,
  Euro,
  Sparkles,
  ExternalLink,
  Crown,
  ArrowRight,
  Loader2,
  Info,
  Send,
  Phone,
  Mail,
  User,
  MessageSquare,
  Lock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useLicense } from '@/hooks/useLicense';
import { useTeam } from '@/hooks/useTeam';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  PRICING_PLANS, 
  ADD_ONS, 
  FEATURE_DEFINITIONS,
  CATEGORY_LABELS,
  calculateTotalPrice,
  getAddOnsForPlan,
  type AddOn,
  type PricingPlan,
} from '@/types/pricing';

const planIcons = {
  start: Zap,
  pro: Rocket,
  enterprise: Building2,
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
  Package,
  Calculator,
  Bookmark: Route,
  History: Calculator,
  AlertTriangle: Shield,
  BarChart3: TrendingUp,
};

const planColorMap = {
  start: 'blue',
  pro: 'orange',
  enterprise: 'red',
} as const;

const colorClasses = {
  blue: {
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30 hover:border-blue-500/50',
    icon: 'bg-blue-500/20 text-blue-500',
    badge: 'bg-blue-500 text-white',
    button: 'bg-blue-500 hover:bg-blue-600 text-white',
    header: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  },
  orange: {
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/30 hover:border-orange-500/50',
    icon: 'bg-orange-500/20 text-orange-500',
    badge: 'bg-orange-500 text-white',
    button: 'bg-orange-500 hover:bg-orange-600 text-white',
    header: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
  },
  red: {
    bg: 'bg-red-500/10',
    border: 'border-red-500/30 hover:border-red-500/50',
    icon: 'bg-red-500/20 text-red-500',
    badge: 'bg-red-500 text-white',
    button: 'bg-red-500 hover:bg-red-600 text-white',
    header: 'bg-red-500/10 text-red-600 dark:text-red-400',
  },
};

// Feature comparison data derived from FEATURE_DEFINITIONS
const allFeatures = [
  { 
    category: 'Calculs & Rentabilité', 
    features: FEATURE_DEFINITIONS.filter(f => f.category === 'calculation').map(f => ({
      name: f.name,
      start: PRICING_PLANS[0].features.includes(f.key),
      pro: PRICING_PLANS[1].features.includes(f.key),
      enterprise: PRICING_PLANS[2].features.includes(f.key),
    }))
  },
  { 
    category: 'Itinéraires & Tournées', 
    features: FEATURE_DEFINITIONS.filter(f => f.category === 'navigation').map(f => ({
      name: f.name,
      start: PRICING_PLANS[0].features.includes(f.key),
      pro: PRICING_PLANS[1].features.includes(f.key),
      enterprise: PRICING_PLANS[2].features.includes(f.key),
    }))
  },
  { 
    category: 'Analyse & Tableaux de bord', 
    features: FEATURE_DEFINITIONS.filter(f => f.category === 'analytics').map(f => ({
      name: f.name,
      start: PRICING_PLANS[0].features.includes(f.key),
      pro: PRICING_PLANS[1].features.includes(f.key),
      enterprise: PRICING_PLANS[2].features.includes(f.key),
    }))
  },
  { 
    category: 'Historique & Prévisions', 
    features: FEATURE_DEFINITIONS.filter(f => f.category === 'history').map(f => ({
      name: f.name,
      start: PRICING_PLANS[0].features.includes(f.key),
      pro: PRICING_PLANS[1].features.includes(f.key),
      enterprise: PRICING_PLANS[2].features.includes(f.key),
    }))
  },
  { 
    category: 'Gestion Flotte', 
    features: [
      ...FEATURE_DEFINITIONS.filter(f => f.category === 'fleet').map(f => ({
        name: f.name,
        start: PRICING_PLANS[0].features.includes(f.key),
        pro: PRICING_PLANS[1].features.includes(f.key),
        enterprise: PRICING_PLANS[2].features.includes(f.key),
      })),
      { name: 'Véhicules', start: '2', pro: '15', enterprise: '∞' },
      { name: 'Conducteurs', start: '2', pro: '15', enterprise: '∞' },
      { name: 'Clients', start: '15', pro: '100', enterprise: '∞' },
      { name: 'Tournées sauvegardées', start: 'Add-on', pro: '200', enterprise: '∞' },
    ]
  },
  { 
    category: 'Export & Documents', 
    features: FEATURE_DEFINITIONS.filter(f => f.category === 'export').map(f => ({
      name: f.name,
      start: PRICING_PLANS[0].features.includes(f.key),
      pro: PRICING_PLANS[1].features.includes(f.key),
      enterprise: PRICING_PLANS[2].features.includes(f.key),
    }))
  },
  { 
    category: 'Intelligence Artificielle', 
    features: FEATURE_DEFINITIONS.filter(f => f.category === 'ai').map(f => ({
      name: f.name,
      start: PRICING_PLANS[0].features.includes(f.key),
      pro: PRICING_PLANS[1].features.includes(f.key),
      enterprise: PRICING_PLANS[2].features.includes(f.key),
    }))
  },
  { 
    category: 'Entreprise & Intégrations', 
    features: FEATURE_DEFINITIONS.filter(f => f.category === 'enterprise').map(f => ({
      name: f.name,
      start: PRICING_PLANS[0].features.includes(f.key),
      pro: PRICING_PLANS[1].features.includes(f.key),
      enterprise: PRICING_PLANS[2].features.includes(f.key),
    }))
  },
  { 
    category: 'Support', 
    features: [
      { name: 'Support email', start: true, pro: true, enterprise: true },
      { name: 'Support prioritaire', start: false, pro: true, enterprise: true },
      { name: 'Support dédié & SLA', start: false, pro: false, enterprise: true },
    ]
  },
];

function PlanCards() {
  return (
    <div className="space-y-8">
      {/* Plans Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {PRICING_PLANS.map((plan, index) => {
          const colors = colorClasses[plan.color];
          const Icon = planIcons[plan.id];
          
          return (
            <div
              key={plan.id}
              className={cn(
                "relative glass-card p-6 transition-all duration-300",
                colors.border,
                "border-2 opacity-0 animate-slide-up",
                plan.popular && "lg:scale-105 lg:-mt-2 lg:mb-2"
              )}
              style={{ animationDelay: `${(index + 1) * 100}ms`, animationFillMode: 'forwards' }}
            >
              {plan.popular && (
                <Badge className={cn("absolute -top-3 left-1/2 -translate-x-1/2", colors.badge)}>
                  Le plus populaire
                </Badge>
              )}

              {/* Plan Header */}
              <div className="text-center mb-6">
                <div className={cn("w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-4", colors.icon)}>
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-foreground">{plan.name}</h3>
                <p className="text-sm text-muted-foreground italic mt-1">"{plan.tagline}"</p>
              </div>

              {/* Target */}
              <div className={cn("rounded-lg p-3 mb-4", colors.bg)}>
                <p className="text-xs font-medium text-foreground/80">
                  <span className="font-semibold">Cible :</span> {plan.target}
                </p>
              </div>

              {/* Pricing */}
              <div className="text-center mb-6">
                {plan.isCustomPricing ? (
                  <>
                    <div className="text-3xl font-bold text-foreground">
                      Sur devis
                    </div>
                    <p className="text-sm text-muted-foreground">Tarification personnalisée</p>
                  </>
                ) : (
                  <>
                    <div className="text-3xl font-bold text-foreground">
                      {plan.monthlyPrice}€
                    </div>
                    <p className="text-sm text-muted-foreground">HT / mois</p>
                    <p className="text-xs text-success mt-2 font-medium">
                      {plan.yearlyPrice}€/an (-{plan.yearlyDiscount}%)
                    </p>
                  </>
                )}
              </div>

              {/* Limits */}
              <div className="grid grid-cols-2 gap-2 mb-4 p-3 bg-muted/30 rounded-lg">
                <div className="text-center">
                  <p className="text-lg font-bold text-foreground">
                    {plan.limits.maxVehicles ?? '∞'}
                  </p>
                  <p className="text-xs text-muted-foreground">véhicules</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-foreground">
                    {plan.limits.maxDrivers ?? '∞'}
                  </p>
                  <p className="text-xs text-muted-foreground">conducteurs</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-foreground">
                    {plan.limits.maxClients ?? '∞'}
                  </p>
                  <p className="text-xs text-muted-foreground">clients</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-foreground">
                    {plan.limits.maxSavedTours ?? '∞'}
                  </p>
                  <p className="text-xs text-muted-foreground">tournées</p>
                </div>
              </div>

              {/* Key Features */}
              <div className="space-y-2 mb-6">
                <p className="text-sm font-semibold text-foreground mb-3">Inclus :</p>
                {getKeyFeaturesForPlan(plan.id).map((feature, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-success flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-foreground/80">{feature}</span>
                  </div>
                ))}
              </div>

              {/* Promise */}
              <div className={cn("rounded-lg p-4 mb-6", colors.bg)}>
                <p className="text-sm text-center">
                  <span className="font-semibold">🎯 Promesse :</span>{' '}
                  <span className="text-foreground/80">{plan.promise}</span>
                </p>
              </div>

              {/* CTA Button */}
              {plan.isCustomPricing ? (
                <EnterpriseQuoteForm />
              ) : (
                <Button className={cn("w-full", colors.button)} asChild>
                  <a 
                    href="https://optiflow.fr/tarifs" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2"
                  >
                    Souscrire
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </Button>
              )}
            </div>
          );
        })}
      </div>

      {/* Add-ons Section */}
      <div className="glass-card p-6 opacity-0 animate-slide-up" style={{ animationDelay: '400ms', animationFillMode: 'forwards' }}>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
            <Package className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Options & Add-ons</h2>
            <p className="text-sm text-muted-foreground">Personnalisez votre forfait avec des fonctionnalités supplémentaires</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {ADD_ONS.filter(a => a.monthlyPrice > 0).slice(0, 9).map((addon) => {
            const IconComponent = addonIcons[addon.icon] || Package;
            return (
              <Card key={addon.id} className="border hover:border-primary/50 transition-colors">
                <CardHeader className="pb-2">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-muted">
                      <IconComponent className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-sm font-medium">{addon.name}</CardTitle>
                      <p className="text-xs text-muted-foreground mt-1">{addon.description}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="border-primary/50 text-primary">
                      +{addon.monthlyPrice}€/mois
                    </Badge>
                    <div className="flex flex-wrap gap-1">
                      {addon.availableFor.map(planId => (
                        <Badge 
                          key={planId} 
                          variant="secondary" 
                          className={cn(
                            "text-xs",
                            planId === 'start' && "bg-blue-500/20 text-blue-600",
                            planId === 'pro' && "bg-orange-500/20 text-orange-600",
                            planId === 'enterprise' && "bg-red-500/20 text-red-600",
                          )}
                        >
                          {planId}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <p className="text-sm text-muted-foreground text-center mt-6">
          💡 Les add-ons sont disponibles selon votre forfait et s'ajoutent au prix mensuel de base.
        </p>
      </div>
    </div>
  );
}

function getKeyFeaturesForPlan(planId: 'start' | 'pro' | 'enterprise'): string[] {
  switch (planId) {
    case 'start':
      return [
        'Calcul de rentabilité €/km complet',
        'Planification itinéraire avec carte',
        'Tableau de bord simplifié',
        'Prix suggéré avec marge cible',
        'Sauvegarde de 10 tournées',
        'Export PDF basique',
      ];
    case 'pro':
      return [
        'Tout START inclus',
        'Prévisionnel 3/6/12 mois',
        'Historique & suivi des trajets',
        'Multi-conducteurs (jusqu\'à 15)',
        'Alertes marge basse',
        'Export PDF pro + Excel',
        'Analyse clients',
        'Support prioritaire',
      ];
    case 'enterprise':
      return [
        'Tout PRO inclus',
        'Véhicules & conducteurs illimités',
        'Optimisation IA des trajets',
        'Multi-agences / multi-sites',
        'Accès multi-utilisateurs',
        'Générateur de devis intelligent',
        'Connexion TMS / ERP',
        'Support dédié & SLA',
      ];
  }
}

function ComparisonTable() {
  return (
    <div className="glass-card p-6 opacity-0 animate-slide-up overflow-x-auto" style={{ animationDelay: '100ms', animationFillMode: 'forwards' }}>
      <Table>
        <TableHeader>
          <TableRow className="border-b-2 border-border">
            <TableHead className="w-[300px] font-bold text-foreground">Fonctionnalités</TableHead>
            <TableHead className={cn("text-center font-bold rounded-t-lg", colorClasses.blue.header)}>
              <div className="flex flex-col items-center gap-1 py-2">
                <Zap className="w-5 h-5" />
                <span>START</span>
                <span className="text-xs font-normal opacity-80">29€/mois</span>
              </div>
            </TableHead>
            <TableHead className={cn("text-center font-bold rounded-t-lg", colorClasses.orange.header)}>
              <div className="flex flex-col items-center gap-1 py-2">
                <Rocket className="w-5 h-5" />
                <span>PRO</span>
                <span className="text-xs font-normal opacity-80">79€/mois</span>
              </div>
            </TableHead>
            <TableHead className={cn("text-center font-bold rounded-t-lg", colorClasses.red.header)}>
              <div className="flex flex-col items-center gap-1 py-2">
                <Building2 className="w-5 h-5" />
                <span>ENTERPRISE</span>
                <span className="text-xs font-normal opacity-80">Sur devis</span>
              </div>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {allFeatures.map((category, catIndex) => (
            <>
              <TableRow key={`cat-${catIndex}`} className="bg-muted/30">
                <TableCell colSpan={4} className="font-semibold text-foreground py-3">
                  {category.category}
                </TableCell>
              </TableRow>
              {category.features.map((feature, featIndex) => {
                const renderValue = (value: boolean | string) => {
                  if (typeof value === 'string') {
                    return <span className="font-medium text-foreground">{value}</span>;
                  }
                  return value ? (
                    <Check className="w-5 h-5 text-success mx-auto" />
                  ) : (
                    <X className="w-5 h-5 text-muted-foreground/30 mx-auto" />
                  );
                };

                return (
                  <TableRow key={`feat-${catIndex}-${featIndex}`} className="hover:bg-muted/20">
                    <TableCell className="text-foreground/80">{feature.name}</TableCell>
                    <TableCell className="text-center">{renderValue(feature.start)}</TableCell>
                    <TableCell className="text-center">{renderValue(feature.pro)}</TableCell>
                    <TableCell className="text-center">{renderValue(feature.enterprise)}</TableCell>
                  </TableRow>
                );
              })}
            </>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// FAQ Data
const faqItems = [
  {
    question: "Comment fonctionne la facturation ?",
    answer: "La facturation est mensuelle ou annuelle selon votre choix. L'abonnement annuel vous fait bénéficier de 17% de réduction. Tous les prix sont HT, la TVA (20%) est ajoutée lors de la facturation."
  },
  {
    question: "Puis-je changer de forfait à tout moment ?",
    answer: "Oui, vous pouvez upgrader votre forfait à tout moment. Le changement prend effet immédiatement et la différence est calculée au prorata. Pour un downgrade, le changement s'appliquera à la prochaine période de facturation."
  },
  {
    question: "Comment fonctionnent les add-ons ?",
    answer: "Les add-ons sont des fonctionnalités supplémentaires que vous pouvez ajouter à votre forfait. Leur prix mensuel s'ajoute au prix de base. Par exemple, l'add-on 'Pack IA' à 49€/mois peut être ajouté au forfait PRO pour bénéficier de l'optimisation IA."
  },
  {
    question: "Puis-je ajouter des add-ons plus tard ?",
    answer: "Oui, vous pouvez ajouter ou retirer des add-ons à tout moment depuis votre espace client. L'ajout est effectif immédiatement, le retrait à la fin de la période de facturation en cours."
  },
  {
    question: "Y a-t-il une période d'essai gratuite ?",
    answer: "Nous ne proposons pas de période d'essai, mais nous offrons une démonstration personnalisée en visioconférence. Cette démo vous permet de découvrir toutes les fonctionnalités avec un de nos experts."
  },
  {
    question: "Que se passe-t-il si je dépasse mes limites ?",
    answer: "Si vous atteignez vos limites (véhicules, conducteurs, etc.), vous recevrez une notification vous invitant à upgrader votre forfait ou à ajouter un add-on d'extension de limites."
  },
  {
    question: "Les prix affichés sont-ils HT ou TTC ?",
    answer: "Tous les prix affichés sont Hors Taxes (HT). La TVA applicable (20%) sera ajoutée lors de la facturation pour les clients français et européens assujettis."
  },
  {
    question: "Comment puis-je résilier mon abonnement ?",
    answer: "La résiliation est possible à tout moment avec un préavis de 1 mois. La demande doit être effectuée par écrit. L'accès reste actif jusqu'à la fin du préavis."
  },
];

function PriceSimulator() {
  const [selectedPlan, setSelectedPlan] = useState<'start' | 'pro' | 'enterprise'>('pro');
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>([]);
  const [isYearly, setIsYearly] = useState(false);

  const availableAddOns = getAddOnsForPlan(selectedPlan);
  const pricing = calculateTotalPrice(selectedPlan, selectedAddOns, isYearly);
  const plan = PRICING_PLANS.find(p => p.id === selectedPlan)!;

  const toggleAddOn = (addonId: string) => {
    setSelectedAddOns(prev => 
      prev.includes(addonId) 
        ? prev.filter(id => id !== addonId)
        : [...prev, addonId]
    );
  };

  return (
    <div className="glass-card p-6 opacity-0 animate-slide-up" style={{ animationDelay: '100ms', animationFillMode: 'forwards' }}>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
          <Calculator className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">Simulateur de prix</h2>
          <p className="text-sm text-muted-foreground">Composez votre forfait sur mesure</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Left: Configuration */}
        <div className="space-y-6">
          {/* Plan Selection */}
          <div>
            <Label className="text-foreground font-medium mb-3 block">Choisissez votre forfait</Label>
            <div className="grid grid-cols-3 gap-3">
              {PRICING_PLANS.map(p => {
                const Icon = planIcons[p.id];
                const colors = colorClasses[p.color];
                return (
                  <button
                    key={p.id}
                    onClick={() => {
                      setSelectedPlan(p.id);
                      setSelectedAddOns([]);
                    }}
                    className={cn(
                      "p-4 rounded-lg border-2 transition-all text-center",
                      selectedPlan === p.id 
                        ? `${colors.border} ${colors.bg}` 
                        : "border-border hover:border-primary/30"
                    )}
                  >
                    <Icon className={cn("w-6 h-6 mx-auto mb-2", selectedPlan === p.id && colors.icon.split(' ')[1])} />
                    <p className="font-medium text-sm">{p.id.toUpperCase()}</p>
                    <p className="text-xs text-muted-foreground">{p.monthlyPrice}€/mois</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Billing Toggle */}
          <div>
            <Label className="text-foreground font-medium mb-3 block">Période de facturation</Label>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsYearly(false)}
                className={cn(
                  "px-4 py-2 rounded-lg transition-all",
                  !isYearly 
                    ? 'bg-primary text-primary-foreground font-medium' 
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                )}
              >
                Mensuel
              </button>
              <button
                onClick={() => setIsYearly(true)}
                className={cn(
                  "px-4 py-2 rounded-lg transition-all flex items-center gap-2",
                  isYearly 
                    ? 'bg-primary text-primary-foreground font-medium' 
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                )}
              >
                Annuel
                <Badge className="bg-success text-success-foreground text-xs">-17%</Badge>
              </button>
            </div>
          </div>

          {/* Add-ons Selection */}
          {availableAddOns.length > 0 && (
            <div>
              <Label className="text-foreground font-medium mb-3 block">
                Options disponibles ({availableAddOns.length})
              </Label>
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                {availableAddOns.map(addon => {
                  const IconComponent = addonIcons[addon.icon] || Package;
                  const isSelected = selectedAddOns.includes(addon.id);
                  return (
                    <div
                      key={addon.id}
                      onClick={() => toggleAddOn(addon.id)}
                      className={cn(
                        "p-3 rounded-lg border cursor-pointer transition-all flex items-center gap-3",
                        isSelected 
                          ? "border-success bg-success/10" 
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      <Checkbox checked={isSelected} />
                      <IconComponent className={cn(
                        "w-5 h-5",
                        isSelected ? "text-success" : "text-muted-foreground"
                      )} />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{addon.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{addon.description}</p>
                      </div>
                      <Badge variant="outline" className="text-primary border-primary/50 shrink-0">
                        +{isYearly ? addon.yearlyPrice : addon.monthlyPrice}€
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right: Summary */}
        <div className="lg:sticky lg:top-6 h-fit">
          <Card className="border-2 border-primary/30">
            <CardHeader className="bg-primary/5">
              <CardTitle className="flex items-center gap-2">
                <Euro className="w-5 h-5 text-primary" />
                Récapitulatif
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              {/* Base Plan */}
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium">{plan.name}</p>
                  <p className="text-xs text-muted-foreground">Forfait de base</p>
                </div>
                <p className="font-bold text-lg">
                  {isYearly ? plan.yearlyPrice : plan.monthlyPrice}€
                </p>
              </div>

              {/* Selected Add-ons */}
              {selectedAddOns.length > 0 && (
                <>
                  <div className="border-t pt-4">
                    <p className="text-sm font-medium mb-2">Add-ons sélectionnés :</p>
                    {selectedAddOns.map(id => {
                      const addon = ADD_ONS.find(a => a.id === id);
                      if (!addon) return null;
                      return (
                        <div key={id} className="flex justify-between text-sm py-1">
                          <span className="text-muted-foreground">{addon.name}</span>
                          <span className="text-success">+{isYearly ? addon.yearlyPrice : addon.monthlyPrice}€</span>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              {/* Total */}
              <div className="border-t pt-4">
                <div className="flex justify-between items-center">
                  <p className="font-bold text-lg">Total {isYearly ? 'annuel' : 'mensuel'}</p>
                  <p className="font-bold text-2xl text-primary">{pricing.total}€</p>
                </div>
                <p className="text-xs text-muted-foreground text-right">HT</p>
                {isYearly && pricing.savings && (
                  <p className="text-sm text-success text-right mt-1">
                    Économie : {pricing.savings}€/an
                  </p>
                )}
              </div>

              {/* Limits Summary */}
              <div className="bg-muted/30 rounded-lg p-4">
                <p className="text-sm font-medium mb-2">Limites incluses :</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Véhicules :</span>
                    <span className="font-medium ml-1">{plan.limits.maxVehicles ?? '∞'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Conducteurs :</span>
                    <span className="font-medium ml-1">{plan.limits.maxDrivers ?? '∞'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Clients :</span>
                    <span className="font-medium ml-1">{plan.limits.maxClients ?? '∞'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Tournées :</span>
                    <span className="font-medium ml-1">{plan.limits.maxSavedTours ?? '∞'}</span>
                  </div>
                </div>
              </div>

              <Button className="w-full" size="lg" asChild>
                <a 
                  href="https://optiflow.fr/tarifs" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2"
                >
                  Souscrire maintenant
                  <ExternalLink className="w-4 h-4" />
                </a>
              </Button>
            </CardContent>
          </Card>

          {/* Demo CTA */}
          <div className="mt-4 p-4 bg-primary/10 rounded-lg border border-primary/30 flex items-center gap-4">
            <Video className="w-8 h-8 text-primary shrink-0" />
            <div className="flex-1">
              <p className="font-medium text-sm">Pas sûr(e) ? Demandez une démo !</p>
              <p className="text-xs text-muted-foreground">30 min avec un expert, gratuit</p>
            </div>
            <Button variant="outline" size="sm">Réserver</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function FAQ() {
  return (
    <div className="glass-card p-6 opacity-0 animate-slide-up" style={{ animationDelay: '100ms', animationFillMode: 'forwards' }}>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
          <HelpCircle className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">Questions fréquentes</h2>
          <p className="text-sm text-muted-foreground">Tout ce que vous devez savoir sur nos forfaits</p>
        </div>
      </div>
      
      <Accordion type="single" collapsible className="w-full">
        {faqItems.map((item, index) => (
          <AccordionItem key={index} value={`item-${index}`}>
            <AccordionTrigger className="text-left text-foreground hover:text-primary">
              {item.question}
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground">
              {item.answer}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}

function LegalTerms() {
  return (
    <div className="glass-card p-6 opacity-0 animate-slide-up" style={{ animationDelay: '100ms', animationFillMode: 'forwards' }}>
      <Tabs defaultValue="cgv" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="cgv" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            CGV
          </TabsTrigger>
          <TabsTrigger value="cgu" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            CGU
          </TabsTrigger>
        </TabsList>

        <TabsContent value="cgv">
          <ScrollArea className="h-[500px] pr-4">
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <h2 className="text-xl font-bold text-foreground mb-4">Conditions Générales de Vente</h2>
              <p className="text-sm text-muted-foreground mb-6">Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}</p>

              <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">Article 1 - Tarification</h3>
              <p className="text-muted-foreground mb-2">Les tarifs sont exprimés en euros HT :</p>
              <ul className="list-disc list-inside text-muted-foreground mb-4 ml-4">
                <li>Forfait START : 29€ HT/mois (jusqu'à 2 véhicules)</li>
                <li>Forfait PRO : 79€ HT/mois (jusqu'à 15 véhicules)</li>
                <li>Forfait ENTERPRISE : Sur devis (véhicules illimités)</li>
              </ul>
              <p className="text-muted-foreground mb-4">Une réduction de 17% est accordée pour un engagement annuel.</p>

              <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">Article 2 - Add-ons</h3>
              <p className="text-muted-foreground mb-4">
                Des options payantes (add-ons) peuvent être ajoutées aux forfaits. Leur prix mensuel s'ajoute au forfait de base.
              </p>

              <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">Article 3 - Résiliation</h3>
              <p className="text-muted-foreground mb-4">
                Préavis de 1 mois calendaire. Aucun remboursement pour la période restante.
              </p>
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="cgu">
          <ScrollArea className="h-[500px] pr-4">
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <h2 className="text-xl font-bold text-foreground mb-4">Conditions Générales d'Utilisation</h2>
              <p className="text-sm text-muted-foreground mb-6">Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}</p>

              <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">Article 1 - Accès au Service</h3>
              <p className="text-muted-foreground mb-4">
                L'accès est réservé aux professionnels ayant un abonnement valide. Les identifiants sont personnels et confidentiels.
              </p>

              <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">Article 2 - Données</h3>
              <p className="text-muted-foreground mb-4">
                Le Client reste propriétaire de ses données. Export possible pendant 30 jours après résiliation.
              </p>

              <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">Article 3 - Sécurité</h3>
              <p className="text-muted-foreground mb-4">
                Données hébergées sur serveurs sécurisés en Union Européenne. Sauvegardes régulières.
              </p>
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Enterprise Quote Form Component
function EnterpriseQuoteForm() {
  const [formData, setFormData] = useState({
    companyName: '',
    contactName: '',
    email: '',
    phone: '',
    vehicleCount: '',
    message: '',
  });
  const [sending, setSending] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);

    try {
      const { error } = await supabase.functions.invoke('send-contact-email', {
        body: {
          subject: `[Demande de devis Enterprise] ${formData.companyName}`,
          message: `
Demande de devis Enterprise

Entreprise: ${formData.companyName}
Contact: ${formData.contactName}
Email: ${formData.email}
Téléphone: ${formData.phone}
Nombre de véhicules: ${formData.vehicleCount}

Message:
${formData.message}
          `,
          from: formData.email,
          name: formData.contactName,
        },
      });

      if (error) throw error;

      toast.success('Demande de devis envoyée avec succès !');
      setDialogOpen(false);
      setFormData({
        companyName: '',
        contactName: '',
        email: '',
        phone: '',
        vehicleCount: '',
        message: '',
      });
    } catch (err) {
      console.error('Error sending quote request:', err);
      toast.error('Erreur lors de l\'envoi. Veuillez réessayer.');
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button className="w-full bg-red-500 hover:bg-red-600 text-white">
          <MessageSquare className="w-4 h-4 mr-2" />
          Demander un devis
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-red-500" />
            Demande de devis Enterprise
          </DialogTitle>
          <DialogDescription>
            Complétez ce formulaire et notre équipe commerciale vous contactera sous 24h.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="companyName">Entreprise *</Label>
              <Input
                id="companyName"
                placeholder="Nom de l'entreprise"
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vehicleCount">Nb. véhicules *</Label>
              <Input
                id="vehicleCount"
                placeholder="Ex: 50"
                value={formData.vehicleCount}
                onChange={(e) => setFormData({ ...formData, vehicleCount: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="contactName">Nom du contact *</Label>
            <Input
              id="contactName"
              placeholder="Prénom Nom"
              value={formData.contactName}
              onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="contact@entreprise.fr"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Téléphone</Label>
              <Input
                id="phone"
                placeholder="06 XX XX XX XX"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Votre projet</Label>
            <Textarea
              id="message"
              placeholder="Décrivez vos besoins, votre activité, les fonctionnalités souhaitées..."
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              rows={4}
            />
          </div>

          <Button type="submit" className="w-full" disabled={sending}>
            {sending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Envoi en cours...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Envoyer la demande
              </>
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// My Subscription Component
function MySubscription() {
  const { licenseData, isLicensed } = useLicense();
  const currentPlanId = (licenseData?.planType || 'start') as 'start' | 'pro' | 'enterprise';
  const currentPlan = PRICING_PLANS.find(p => p.id === currentPlanId)!;
  
  const [activeAddOns, setActiveAddOns] = useState<string[]>([]);
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
  
  const currentMonthlyTotal = (currentPlan.isCustomPricing ? 0 : currentPlan.monthlyPrice) + activeAddOns.reduce((sum, id) => {
    const addon = ADD_ONS.find(a => a.id === id);
    return sum + (addon?.monthlyPrice || 0);
  }, 0);

  const newMonthlyTotal = (currentPlan.isCustomPricing ? 0 : currentPlan.monthlyPrice) + selectedAddOns.reduce((sum, id) => {
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
      toast.success('Options mises à jour avec succès');
    } catch (err) {
      console.error('Error saving add-ons:', err);
      toast.error('Impossible de mettre à jour vos options');
    } finally {
      setSaving(false);
    }
  };

  if (!isLicensed) {
    return (
      <div className="glass-card p-8 text-center">
        <Crown className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
        <h3 className="text-lg font-semibold mb-2">Connectez-vous pour voir votre abonnement</h3>
        <p className="text-muted-foreground">
          Activez votre licence pour accéder à la gestion de votre abonnement.
        </p>
      </div>
    );
  }

  const Icon = planIcons[currentPlanId];
  const colors = colorClasses[planColorMap[currentPlanId]];

  return (
    <div className="space-y-6">
      {/* Current Plan Card */}
      <Card className={cn("border-2", colors.border)}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={cn("p-3 rounded-xl", colors.bg)}>
                <Icon className={cn("w-8 h-8", colors.icon.split(' ')[1])} />
              </div>
              <div>
                <CardTitle className="text-2xl">{currentPlan.name}</CardTitle>
                <CardDescription>{currentPlan.tagline}</CardDescription>
              </div>
            </div>
            <div className="text-right">
              {currentPlan.isCustomPricing ? (
                <p className="text-xl font-bold text-foreground">Sur devis</p>
              ) : (
                <>
                  <p className="text-3xl font-bold text-foreground">{currentMonthlyTotal}€</p>
                  <p className="text-sm text-muted-foreground">HT / mois</p>
                </>
              )}
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

      {/* Add-ons Management */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : availableAddOns.length === 0 ? (
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
                  <span className="font-medium">
                    {currentPlan.isCustomPricing ? 'Sur devis' : `${currentPlan.monthlyPrice}€`}
                  </span>
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
                  <span className="text-2xl font-bold text-primary">
                    {currentPlan.isCustomPricing ? 'Sur devis' : `${newMonthlyTotal}€`}
                  </span>
                </div>

                {hasChanges && priceDifference !== 0 && !currentPlan.isCustomPricing && (
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

      {/* Upgrade Section */}
      <div className="mt-8">
        <h3 className="text-lg font-semibold mb-4">Changer de forfait</h3>
        <div className="grid gap-4 md:grid-cols-3">
          {PRICING_PLANS.map(plan => {
            const PlanIcon = planIcons[plan.id];
            const planColors = colorClasses[plan.color];
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
                
                <CardHeader className="text-center">
                  <div className={cn("w-12 h-12 rounded-xl mx-auto mb-3", planColors.bg)}>
                    <PlanIcon className={cn("w-12 h-12 p-2.5", planColors.icon.split(' ')[1])} />
                  </div>
                  <CardTitle>{plan.name}</CardTitle>
                  <CardDescription>{plan.tagline}</CardDescription>
                  <div className="mt-4">
                    {plan.isCustomPricing ? (
                      <span className="text-2xl font-bold">Sur devis</span>
                    ) : (
                      <>
                        <span className="text-3xl font-bold">{plan.monthlyPrice}€</span>
                        <span className="text-muted-foreground">/mois</span>
                      </>
                    )}
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

                  {isCurrent ? (
                    <Button className="w-full opacity-50" disabled>
                      Forfait actuel
                    </Button>
                  ) : plan.isCustomPricing ? (
                    <EnterpriseQuoteForm />
                  ) : (
                    <Button 
                      className={cn("w-full", planColors.button)}
                      asChild
                    >
                      <a 
                        href="https://optiflow.fr/tarifs" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-2"
                      >
                        {isUpgrade ? 'Passer à ce forfait' : 'Contacter le support'}
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Alert className="mt-6">
          <Info className="w-4 h-4" />
          <AlertDescription>
            Pour changer de forfait ou pour toute question sur votre abonnement, 
            contactez-nous à <a href="mailto:support@opti-group.fr" className="text-primary hover:underline">support@opti-group.fr</a>
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}

export default function Pricing() {
  const { isLicensed } = useLicense();
  const { isDirection, isLoading: isTeamLoading } = useTeam();
  
  // Only Direction can access this page when logged in
  if (isLicensed && !isTeamLoading && !isDirection) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
          <Lock className="w-8 h-8 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-semibold text-foreground">Accès restreint</h2>
        <p className="text-muted-foreground text-center max-w-md">
          La gestion des tarifs est réservée aux utilisateurs avec le rôle Direction.
          Contactez votre administrateur pour obtenir l'accès.
        </p>
      </div>
    );
  }
  
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Forfaits OptiFlow</h1>
        <p className="text-muted-foreground mt-1">
          Des solutions adaptées à chaque taille de flotte
        </p>
      </div>

      <Tabs defaultValue={isLicensed ? "subscription" : "cards"} className="w-full">
        <TabsList className="grid w-full grid-cols-6 lg:w-[900px]">
          {isLicensed && (
            <TabsTrigger value="subscription" className="flex items-center gap-2">
              <Crown className="w-4 h-4" />
              Mon abonnement
            </TabsTrigger>
          )}
          <TabsTrigger value="cards">Forfaits</TabsTrigger>
          <TabsTrigger value="comparison">Comparatif</TabsTrigger>
          <TabsTrigger value="simulator">Simulateur</TabsTrigger>
          <TabsTrigger value="faq">FAQ</TabsTrigger>
          <TabsTrigger value="legal">CGV / CGU</TabsTrigger>
        </TabsList>

        {isLicensed && (
          <TabsContent value="subscription" className="mt-6">
            <MySubscription />
          </TabsContent>
        )}

        <TabsContent value="cards" className="mt-6">
          <PlanCards />
        </TabsContent>

        <TabsContent value="comparison" className="mt-6">
          <ComparisonTable />
        </TabsContent>

        <TabsContent value="simulator" className="mt-6">
          <PriceSimulator />
        </TabsContent>

        <TabsContent value="faq" className="mt-6">
          <FAQ />
        </TabsContent>

        <TabsContent value="legal" className="mt-6">
          <LegalTerms />
        </TabsContent>
      </Tabs>

      {/* Footer Note */}
      <div className="text-center text-sm text-muted-foreground glass-card p-4">
        <p>Tous les prix sont HT. Engagement annuel recommandé pour bénéficier du meilleur tarif (-17%).</p>
        <p className="mt-1">
          Besoin d'une solution personnalisée ?{' '}
          <a href="mailto:support@opti-group.fr" className="text-primary hover:underline">
            Contactez-nous
          </a>
        </p>
      </div>
    </div>
  );
}
