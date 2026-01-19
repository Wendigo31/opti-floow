import { Check, Crown, Sparkles, Star, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface PricingPlansPageProps {
  onBack?: () => void;
}

const plans = [
  {
    name: 'Start',
    price: '29',
    description: 'Idéal pour les artisans et indépendants',
    icon: Sparkles,
    color: 'border-blue-500/50',
    iconColor: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    features: [
      'Calculateur de coût de revient',
      'Planification d\'itinéraire',
      'Tarification automatique',
      'Jusqu\'à 2 conducteurs',
      'Jusqu\'à 5 véhicules',
      '10 tournées sauvegardées',
      'Support par email',
    ],
  },
  {
    name: 'Pro',
    price: '79',
    description: 'Pour les PME en croissance',
    icon: Star,
    color: 'border-orange-500/50',
    iconColor: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
    popular: true,
    features: [
      'Tout Start inclus',
      'Tableau de bord analytique',
      'Historique des trajets',
      'Export PDF & Excel avancés',
      'Jusqu\'à 15 conducteurs',
      'Jusqu\'à 50 véhicules',
      '200 tournées sauvegardées',
      'Alertes de marge',
      'Support prioritaire',
    ],
  },
  {
    name: 'Enterprise',
    price: '199',
    description: 'Pour les grandes entreprises',
    icon: Crown,
    color: 'border-amber-500/50',
    iconColor: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
    features: [
      'Tout Pro inclus',
      'Intelligence artificielle',
      'Analyse clients avancée',
      'Multi-agences',
      'Multi-utilisateurs',
      'Véhicules illimités',
      'Tournées illimitées',
      'Intégration TMS/ERP',
      'Account manager dédié',
    ],
  },
];

export function PricingPlansPage({ onBack }: PricingPlansPageProps) {
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {plans.map((plan) => {
            const Icon = plan.icon;
            return (
              <Card 
                key={plan.name}
                className={cn(
                  "relative overflow-hidden transition-all hover:scale-[1.02]",
                  plan.color,
                  plan.popular && "ring-2 ring-orange-500"
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
                  <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center mb-4", plan.bgColor)}>
                    <Icon className={cn("w-6 h-6", plan.iconColor)} />
                  </div>
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                  <div className="mt-4">
                    <span className="text-4xl font-bold text-foreground">{plan.price}€</span>
                    <span className="text-muted-foreground">/mois HT</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <Check className={cn("w-5 h-5 flex-shrink-0 mt-0.5", plan.iconColor)} />
                        <span className="text-sm text-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button 
                    className="w-full mt-6" 
                    variant={plan.popular ? "default" : "outline"}
                    asChild
                  >
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
                </CardContent>
              </Card>
            );
          })}
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
              <CardTitle className="text-lg">Comment obtenir une licence ?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Après votre souscription sur notre site, vous recevrez votre code de licence 
                par email sous quelques minutes.
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
