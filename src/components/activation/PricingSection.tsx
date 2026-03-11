import { useState } from 'react';
import { Check, X, Rocket, Star, Crown, Zap, Truck, Users, Calculator, Route, Brain, FileSpreadsheet, BarChart3, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

const PLANS = [
  {
    id: 'start',
    name: 'Start',
    subtitle: 'Découverte',
    description: 'Idéal pour les indépendants et petites flottes qui veulent maîtriser leurs coûts.',
    monthlyPrice: 49.99,
    yearlyPrice: 549,
    yearlyMonthly: 45.75,
    yearlyDiscount: '-8%',
    icon: Rocket,
    color: 'from-emerald-500 to-teal-600',
    limits: [
      { icon: Users, label: '1 utilisateur' },
      { icon: Truck, label: '5 véhicules / conducteurs' },
      { icon: Calculator, label: '5 calculs / jour' },
      { icon: Users, label: '10 clients' },
      { icon: FileSpreadsheet, label: '5 tournées sauvegardées' },
    ],
    features: [
      { label: 'Calculateur de coûts complet', included: true },
      { label: 'Itinéraire poids lourd (péages, restrictions)', included: true },
      { label: 'Suivi des charges (journalières, mensuelles, annuelles)', included: true },
      { label: 'Export PDF basique', included: true },
      { label: 'Planning conducteurs', included: false },
      { label: 'Analyses IA', included: false },
      { label: 'Export Excel', included: false },
      { label: 'Prévisionnel & devis', included: false },
      { label: 'Gestion d\'équipe', included: false },
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    subtitle: 'Croissance',
    description: 'Pour les exploitants qui veulent optimiser leur planning et analyser leurs performances.',
    monthlyPrice: 132.99,
    yearlyPrice: 1399,
    yearlyMonthly: 116.58,
    yearlyDiscount: '-12%',
    icon: Star,
    popular: true,
    color: 'from-blue-500 to-indigo-600',
    limits: [
      { icon: Users, label: '3 utilisateurs inclus (+2,50\u20AC/utilisateur suppl.)' },
      { icon: Truck, label: '15 véhicules / conducteurs' },
      { icon: Calculator, label: '25 calculs / jour' },
      { icon: Users, label: '30 clients' },
      { icon: FileSpreadsheet, label: '20 tournées sauvegardées' },
    ],
    features: [
      { label: 'Tout le forfait Start', included: true, highlight: true },
      { label: 'Planning conducteurs complet', included: true },
      { label: '5 analyses IA par jour', included: true },
      { label: 'Export PDF professionnel & Excel', included: true },
      { label: 'Alertes de marge en temps réel', included: true },
      { label: 'Historique des trajets', included: true },
      { label: 'Tableau de bord avancé', included: true },
      { label: 'Prévisionnel & devis intelligents', included: false },
      { label: 'Gestion d\'équipe & rôles', included: false },
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    subtitle: 'Performance',
    description: 'La solution complète pour les flottes structurées avec gestion d\'équipe et IA illimitée. Tarification sur devis.',
    monthlyPrice: 249,
    yearlyPrice: 2199,
    yearlyMonthly: 183.25,
    yearlyDiscount: '-27%',
    isCustomPricing: true,
    icon: Crown,
    bestValue: true,
    color: 'from-amber-500 to-orange-600',
    limits: [
      { icon: Users, label: '5 utilisateurs inclus (+2,50\u20AC/utilisateur suppl.)' },
      { icon: Truck, label: 'Véhicules & conducteurs illimités' },
      { icon: Calculator, label: 'Calculs illimités' },
      { icon: Users, label: 'Clients illimités' },
      { icon: FileSpreadsheet, label: 'Tournées illimitées' },
    ],
    features: [
      { label: 'Tout le forfait Pro', included: true, highlight: true },
      { label: 'Analyses IA illimitées', included: true },
      { label: 'Prévisionnel de coûts avancé', included: true },
      { label: 'Devis intelligents (auto-pricing)', included: true },
      { label: 'Gestion d\'équipe avec rôles (Direction / Exploitation)', included: true },
      { label: 'Confidentialité des métriques par rôle', included: true },
      { label: 'Multi-agences', included: true },
      { label: 'Intégration TMS / ERP', included: true },
      { label: 'Support prioritaire', included: true },
    ],
  },
];

interface PricingSectionProps {
  onChoosePlan: () => void;
}

export default function PricingSection({ onChoosePlan }: PricingSectionProps) {
  const [isYearly, setIsYearly] = useState(false);

  return (
    <section className="w-full max-w-6xl">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-foreground mb-2">Nos forfaits</h2>
        <p className="text-muted-foreground max-w-lg mx-auto">
          Choisissez le forfait adapté à votre flotte. Évoluez à tout moment.
        </p>

        {/* Toggle mensuel / annuel */}
        <div className="flex items-center justify-center gap-3 mt-6">
          <span className={cn("text-sm font-medium", !isYearly ? "text-foreground" : "text-muted-foreground")}>Mensuel</span>
          <Switch checked={isYearly} onCheckedChange={setIsYearly} />
          <span className={cn("text-sm font-medium", isYearly ? "text-foreground" : "text-muted-foreground")}>
            Annuel
          </span>
          {isYearly && (
            <Badge variant="secondary" className="text-xs">Économisez jusqu'à 27%</Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {PLANS.map((plan) => {
          const Icon = plan.icon;
          const price = isYearly ? plan.yearlyMonthly : plan.monthlyPrice;
          const isBest = plan.bestValue;
          const isPopular = plan.popular;
          const isCustom = plan.isCustomPricing;

          return (
            <div
              key={plan.id}
              className={cn(
                "glass-card relative flex flex-col p-6 transition-all hover:scale-[1.02]",
                isBest && "ring-2 ring-secondary shadow-lg shadow-secondary/10",
                isPopular && "ring-2 ring-primary shadow-lg shadow-primary/10"
              )}
            >
              {/* Badges */}
              {isBest && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-gradient-to-r from-amber-500 to-orange-600 text-white border-0 shadow-md">
                    ⭐ Meilleur rapport qualité-prix
                  </Badge>
                </div>
              )}
              {isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white border-0 shadow-md">
                    🔥 Le plus populaire
                  </Badge>
                </div>
              )}

              {/* Header */}
              <div className="text-center mb-4 mt-2">
                <div className={cn("w-12 h-12 rounded-xl bg-gradient-to-br mx-auto flex items-center justify-center mb-3", plan.color)}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-bold text-foreground">{plan.name}</h3>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{plan.subtitle}</p>
              </div>

              {/* Price */}
              <div className="text-center mb-4">
                <div className="flex items-baseline justify-center gap-1">
                  {isCustom && (
                    <span className="text-sm font-medium text-muted-foreground mr-1">À partir de</span>
                  )}
                  <span className="text-3xl font-extrabold text-foreground">
                    {price.toFixed(2).replace('.', ',')}€
                  </span>
                  <span className="text-sm text-muted-foreground">/mois</span>
                </div>
                {isYearly && !isCustom && (
                  <div className="flex items-center justify-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground line-through">
                      {plan.monthlyPrice.toFixed(2).replace('.', ',')}€/mois
                    </span>
                    <Badge variant="outline" className="text-xs text-secondary border-secondary/40">
                      {plan.yearlyDiscount}
                    </Badge>
                  </div>
                )}
                {isYearly && !isCustom && (
                  <p className="text-xs text-muted-foreground mt-1">
                    soit {plan.yearlyPrice.toFixed(0)}€ facturé annuellement
                  </p>
                )}
                {isCustom && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Tarification personnalisée sur devis
                  </p>
                )}
              </div>

              {/* Description */}
              <p className="text-sm text-muted-foreground text-center mb-4 min-h-[40px]">
                {plan.description}
              </p>

              {/* CTA */}
              <Button
                variant={isBest || isPopular ? "gradient" : "outline"}
                className="w-full mb-5"
                onClick={onChoosePlan}
              >
                Choisir {plan.name}
              </Button>

              {/* Limits */}
              <div className="space-y-2 mb-4 pb-4 border-b border-border">
                <p className="text-xs font-semibold text-foreground uppercase tracking-wider">Ressources</p>
                {plan.limits.map((limit, i) => {
                  const LimitIcon = limit.icon;
                  return (
                    <div key={i} className="flex items-center gap-2 text-sm text-foreground">
                      <LimitIcon className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                      <span>{limit.label}</span>
                    </div>
                  );
                })}
              </div>

              {/* Features */}
              <div className="space-y-2 flex-1">
                <p className="text-xs font-semibold text-foreground uppercase tracking-wider">Fonctionnalités</p>
                {plan.features.map((feature, i) => (
                  <div key={i} className={cn("flex items-start gap-2 text-sm", feature.included ? "text-foreground" : "text-muted-foreground/50")}>
                    {feature.included ? (
                      <Check className={cn("w-3.5 h-3.5 mt-0.5 flex-shrink-0", feature.highlight ? "text-secondary" : "text-primary")} />
                    ) : (
                      <X className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                    )}
                    <span className={cn(feature.highlight && "font-medium")}>{feature.label}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add-ons mention */}
      <div className="text-center mt-6 p-4 rounded-xl bg-accent/50 border border-border">
        <p className="text-sm text-foreground font-medium flex items-center justify-center gap-2">
          <Zap className="w-4 h-4 text-secondary" />
          Modules complémentaires disponibles
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          +10 ressources, IA étendue, Gestion d'équipe — activables depuis votre espace.
        </p>
      </div>
    </section>
  );
}
