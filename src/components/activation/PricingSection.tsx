import { Check, X, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { PUBLIC_PLANS } from '@/config/pricingPlans';

/**
 * ⚠️ This component is PUBLIC (shown to non-authenticated visitors).
 * Do NOT inline prices, amounts, or "/mois" labels here.
 * All copy comes from `src/config/pricingPlans.ts`, which is enforced by
 * `src/test/marketing-no-prices.test.ts`.
 */

interface PricingSectionProps {
  onChoosePlan: () => void;
}

export default function PricingSection({ onChoosePlan }: PricingSectionProps) {
  return (
    <section className="w-full max-w-6xl">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-foreground mb-2">Nos forfaits</h2>
        <p className="text-muted-foreground max-w-lg mx-auto">
          Choisissez le forfait adapté à votre flotte. Évoluez à tout moment.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {PUBLIC_PLANS.map((plan) => {
          const Icon = plan.icon;
          const isBest = plan.bestValue;
          const isPopular = plan.popular;

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

              {/* Price (public-safe label only — see src/config/pricingPlans.ts) */}
              <div className="text-center mb-4">
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-2xl font-extrabold text-foreground">{plan.priceLabel}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {plan.priceHelper}
                </p>
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
                {plan.ctaLabel}
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
