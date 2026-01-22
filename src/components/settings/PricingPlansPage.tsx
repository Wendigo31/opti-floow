import { Check, Crown, Sparkles, Star, ExternalLink, Zap, Rocket, Building2, Plus, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { PRICING_PLANS, getAddOnsByCategory, ADDON_CATEGORY_LABELS } from '@/types/pricing';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

interface PricingPlansPageProps {
  onBack?: () => void;
}

const planIcons = {
  start: Zap,
  pro: Rocket,
  enterprise: Building2,
};

const planColors = {
  blue: {
    border: 'border-blue-500/50',
    bg: 'bg-blue-500/10',
    icon: 'text-blue-500',
    badge: 'bg-blue-500',
  },
  orange: {
    border: 'border-orange-500/50',
    bg: 'bg-orange-500/10',
    icon: 'text-orange-500',
    badge: 'bg-orange-500',
  },
  red: {
    border: 'border-red-500/50',
    bg: 'bg-red-500/10',
    icon: 'text-red-500',
    badge: 'bg-red-500',
  },
};

export function PricingPlansPage({ onBack }: PricingPlansPageProps) {
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-4">
            Choisissez votre forfait OptiFlow
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Optimisez vos coûts de transport avec la solution adaptée à votre activité
          </p>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
          {PRICING_PLANS.map((plan) => {
            const Icon = planIcons[plan.id];
            const colors = planColors[plan.color];
            const addOnsByCategory = getAddOnsByCategory(plan.id);
            const totalAddOns = Object.values(addOnsByCategory).flat().length;
            
            return (
              <Card 
                key={plan.id}
                className={cn(
                  "relative overflow-hidden transition-all hover:scale-[1.02]",
                  colors.border,
                  plan.popular && "ring-2 ring-orange-500 lg:scale-105"
                )}
              >
                {plan.popular && (
                  <div className="absolute top-0 right-0">
                    <Badge className="rounded-none rounded-bl-lg bg-orange-500 text-white">
                      Le plus populaire
                    </Badge>
                  </div>
                )}
                <CardHeader>
                  <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center mb-4", colors.bg)}>
                    <Icon className={cn("w-6 h-6", colors.icon)} />
                  </div>
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <CardDescription className="italic">"{plan.tagline}"</CardDescription>
                  
                  {/* Target */}
                  <div className={cn("rounded-lg p-2 mt-2", colors.bg)}>
                    <p className="text-xs text-foreground/80">
                      <span className="font-semibold">Cible :</span> {plan.target}
                    </p>
                  </div>
                  
                  {/* Pricing */}
                  <div className="mt-4">
                    {plan.isCustomPricing ? (
                      <>
                        <span className="text-3xl font-bold text-foreground">Sur devis</span>
                        <p className="text-sm text-muted-foreground mt-1">SaaS + setup personnalisé</p>
                      </>
                    ) : (
                      <>
                        <span className="text-4xl font-bold text-foreground">{plan.monthlyPrice}€</span>
                        <span className="text-muted-foreground">/mois HT</span>
                        <p className="text-sm text-muted-foreground mt-1">
                          ou <span className="font-semibold">{plan.yearlyPrice}€</span>/an 
                          <Badge variant="secondary" className="ml-2 text-xs">-{plan.yearlyDiscount}%</Badge>
                        </p>
                      </>
                    )}
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {/* Limites */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-muted/50 rounded p-2">
                      <span className="font-semibold">{plan.limits.maxVehicles ?? '∞'}</span> véhicules
                    </div>
                    <div className="bg-muted/50 rounded p-2">
                      <span className="font-semibold">{plan.limits.maxDrivers ?? '∞'}</span> conducteurs
                    </div>
                    <div className="bg-muted/50 rounded p-2">
                      <span className="font-semibold">{plan.limits.maxClients ?? '∞'}</span> clients
                    </div>
                    <div className="bg-muted/50 rounded p-2">
                      <span className="font-semibold">{plan.limits.maxSavedTours ?? '∞'}</span> tournées
                    </div>
                  </div>
                  
                  {/* Promise */}
                  <div className={cn("rounded-lg p-3", colors.bg)}>
                    <p className="text-sm text-center">
                      <span className="font-semibold">🎯 Promesse :</span>{' '}
                      <span className="text-foreground/80">{plan.promise}</span>
                    </p>
                  </div>

                  {/* Add-ons disponibles */}
                  {totalAddOns > 0 && (
                    <Accordion type="single" collapsible className="w-full">
                      <AccordionItem value="addons" className="border-none">
                        <AccordionTrigger className="text-sm py-2 hover:no-underline">
                          <div className="flex items-center gap-2">
                            <Plus className="w-4 h-4" />
                            <span>{totalAddOns} add-ons disponibles</span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="space-y-3 pt-2">
                          {Object.entries(addOnsByCategory).map(([category, addons]) => {
                            if (addons.length === 0) return null;
                            const categoryLabel = ADDON_CATEGORY_LABELS[category as keyof typeof ADDON_CATEGORY_LABELS];
                            return (
                              <div key={category}>
                                <p className="text-xs font-semibold text-muted-foreground mb-1">
                                  {categoryLabel.fr}
                                </p>
                                <div className="space-y-1">
                                  {addons.slice(0, 3).map((addon) => (
                                    <div key={addon.id} className="flex justify-between text-xs">
                                      <span className="text-foreground/80">{addon.name}</span>
                                      <span className="font-medium">
                                        {addon.monthlyPrice > 0 ? `+${addon.monthlyPrice}€/mois` : 'Inclus'}
                                      </span>
                                    </div>
                                  ))}
                                  {addons.length > 3 && (
                                    <p className="text-xs text-muted-foreground">
                                      +{addons.length - 3} autres options...
                                    </p>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  )}
                  
                  {/* CTA */}
                  <Button 
                    className="w-full" 
                    variant={plan.popular ? "default" : "outline"}
                    asChild
                  >
                    <a 
                      href="https://optiflow.fr/tarifs" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-2"
                    >
                      {plan.isCustomPricing ? 'Demander un devis' : 'Souscrire'}
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Upsell message */}
        <div className="bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/20 rounded-xl p-6 mb-12 text-center">
          <h3 className="text-lg font-semibold mb-2">💡 Maximisez votre rentabilité</h3>
          <p className="text-muted-foreground">
            Chaque add-on vous permet de personnaliser votre expérience. 
            <span className="font-medium text-foreground"> L'abonnement annuel vous fait économiser jusqu'à 2 mois</span> sur votre forfait !
          </p>
        </div>

        {/* FAQ Section */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-4">Questions fréquentes</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-12">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Puis-je changer de forfait ?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Oui, vous pouvez passer à un forfait supérieur à tout moment. 
                Le changement est immédiat et vous ne payez que la différence au prorata.
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Y a-t-il un engagement ?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Non, tous nos forfaits sont sans engagement. 
                Vous pouvez résilier à tout moment depuis votre espace client.
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Les add-ons sont-ils permanents ?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Vous pouvez activer ou désactiver vos add-ons à tout moment.
                Ils sont facturés mensuellement ou inclus dans votre abonnement annuel.
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Un essai gratuit est-il disponible ?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Contactez-nous pour bénéficier d'une démo personnalisée gratuite 
                et découvrir toutes les fonctionnalités d'OptiFlow.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Back Button */}
        {onBack && (
          <div className="text-center">
            <Button variant="outline" onClick={onBack}>
              Retour à la connexion
            </Button>
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-12 text-sm text-muted-foreground">
          <p>
            Des questions ? Contactez-nous à{' '}
            <a href="mailto:contact@optiflow.fr" className="text-primary hover:underline">
              contact@optiflow.fr
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
