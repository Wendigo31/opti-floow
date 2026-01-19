import { Check, X, Zap, Rocket, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface PlanFeature {
  text: string;
  included: boolean;
}

interface Plan {
  name: string;
  tagline: string;
  target: string;
  priceMonthly: string;
  priceYearly: string;
  color: 'blue' | 'orange' | 'red';
  icon: React.ReactNode;
  features: PlanFeature[];
  notIncluded?: string[];
  promise: string;
  popular?: boolean;
}

const plans: Plan[] = [
  {
    name: 'OptiFlow START',
    tagline: 'Comprendre sa rentabilité, simplement',
    target: 'Artisans transport, auto-entrepreneurs, petites flottes (1 à 3 véhicules)',
    priceMonthly: '29 €',
    priceYearly: '299 €',
    color: 'blue',
    icon: <Zap className="w-6 h-6" />,
    features: [
      { text: 'Calcul de rentabilité €/km & €/jour', included: true },
      { text: 'Gestion des coûts fixes / variables', included: true },
      { text: 'Indexation carburant manuelle', included: true },
      { text: 'Marge brute & nette', included: true },
      { text: 'Simulation simple de tournée', included: true },
      { text: 'Tableau de synthèse clair', included: true },
      { text: 'Export PDF basique', included: true },
      { text: 'Sauvegarde des données', included: true },
    ],
    notIncluded: [
      'Optimisation automatique',
      'Multi-chauffeurs avancé',
      'RSE / temps de conduite',
      'APIs externes',
    ],
    promise: 'Savoir si tu gagnes ou perds de l\'argent, rapidement.',
  },
  {
    name: 'OptiFlow PRO',
    tagline: 'Optimiser, comparer, décider',
    target: 'PME transport, flottes VL / PL (3 à 30 véhicules)',
    priceMonthly: '79 €',
    priceYearly: '799 €',
    color: 'orange',
    icon: <Rocket className="w-6 h-6" />,
    popular: true,
    features: [
      { text: 'Tout START inclus', included: true },
      { text: 'Indexation carburant automatique (API)', included: true },
      { text: 'Calculs RSE & temps de conduite', included: true },
      { text: 'Multi-chauffeurs / relais', included: true },
      { text: 'Comparaison plusieurs scénarios de tournées', included: true },
      { text: 'Analyse détaillée des postes de coûts', included: true },
      { text: 'Alertes marge basse / négative', included: true },
      { text: 'Graphiques dynamiques', included: true },
      { text: 'Export PDF pro + Excel', included: true },
      { text: 'Historique & suivi mensuel', included: true },
      { text: 'Support prioritaire', included: true },
    ],
    promise: 'Optimiser chaque tournée pour gagner plus, sans rouler plus.',
  },
  {
    name: 'OptiFlow ENTERPRISE',
    tagline: 'Piloter une flotte comme un directeur financier',
    target: 'Gros transporteurs, messagerie, express, e-commerce, groupes logistiques',
    priceMonthly: 'Sur devis',
    priceYearly: 'SaaS + setup personnalisé',
    color: 'red',
    icon: <Building2 className="w-6 h-6" />,
    features: [
      { text: 'Tout PRO inclus', included: true },
      { text: 'Nombre illimité de véhicules & chauffeurs', included: true },
      { text: 'Moteur d\'optimisation avancé / IA', included: true },
      { text: 'Multi-agences / multi-clients', included: true },
      { text: 'Connexion TMS / ERP / comptabilité', included: true },
      { text: 'Tarification automatique (km / colis / tournée)', included: true },
      { text: 'Tableaux de bord direction', included: true },
      { text: 'Accès multi-utilisateurs & rôles', included: true },
      { text: 'Hébergement dédié / cloud privé', included: true },
      { text: 'SLA & support dédié', included: true },
      { text: 'Développements sur mesure', included: true },
    ],
    promise: 'Transformer la donnée transport en avantage stratégique.',
  },
];

const colorClasses = {
  blue: {
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30 hover:border-blue-500/50',
    icon: 'bg-blue-500/20 text-blue-500',
    badge: 'bg-blue-500 text-white',
    button: 'bg-blue-500 hover:bg-blue-600 text-white',
  },
  orange: {
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/30 hover:border-orange-500/50',
    icon: 'bg-orange-500/20 text-orange-500',
    badge: 'bg-orange-500 text-white',
    button: 'bg-orange-500 hover:bg-orange-600 text-white',
  },
  red: {
    bg: 'bg-red-500/10',
    border: 'border-red-500/30 hover:border-red-500/50',
    icon: 'bg-red-500/20 text-red-500',
    badge: 'bg-red-500 text-white',
    button: 'bg-red-500 hover:bg-red-600 text-white',
  },
};

export default function PricingPlans() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-foreground mb-2">Choisissez votre forfait</h2>
        <p className="text-muted-foreground">
          Des solutions adaptées à chaque taille de flotte
        </p>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {plans.map((plan, index) => {
          const colors = colorClasses[plan.color];
          
          return (
            <div
              key={plan.name}
              className={`
                relative glass-card p-6 transition-all duration-300 
                ${colors.border} border-2
                opacity-0 animate-slide-up
                ${plan.popular ? 'lg:scale-105 lg:-mt-2 lg:mb-2' : ''}
              `}
              style={{ animationDelay: `${(index + 1) * 100}ms`, animationFillMode: 'forwards' }}
            >
              {plan.popular && (
                <Badge className={`absolute -top-3 left-1/2 -translate-x-1/2 ${colors.badge}`}>
                  Le plus populaire
                </Badge>
              )}

              {/* Plan Header */}
              <div className="text-center mb-6">
                <div className={`w-14 h-14 rounded-xl ${colors.icon} flex items-center justify-center mx-auto mb-4`}>
                  {plan.icon}
                </div>
                <h3 className="text-xl font-bold text-foreground">{plan.name}</h3>
                <p className="text-sm text-muted-foreground italic mt-1">"{plan.tagline}"</p>
              </div>

              {/* Target */}
              <div className={`${colors.bg} rounded-lg p-3 mb-4`}>
                <p className="text-xs font-medium text-foreground/80">
                  <span className="font-semibold">Cible :</span> {plan.target}
                </p>
              </div>

              {/* Pricing */}
              <div className="text-center mb-6">
                <div className="text-3xl font-bold text-foreground">
                  {plan.priceMonthly}
                  {plan.priceMonthly !== 'Sur devis' && (
                    <span className="text-sm font-normal text-muted-foreground"> / mois / véhicule</span>
                  )}
                </div>
                {plan.priceMonthly !== 'Sur devis' && (
                  <p className="text-sm text-muted-foreground mt-1">
                    ou <span className="font-semibold">{plan.priceYearly}</span> / an
                  </p>
                )}
                {plan.priceMonthly === 'Sur devis' && (
                  <p className="text-sm text-muted-foreground mt-1">{plan.priceYearly}</p>
                )}
              </div>

              {/* Features */}
              <div className="space-y-2 mb-6">
                <p className="text-sm font-semibold text-foreground mb-3">Inclus :</p>
                {plan.features.map((feature, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-success flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-foreground/80">{feature.text}</span>
                  </div>
                ))}
              </div>

              {/* Not Included */}
              {plan.notIncluded && plan.notIncluded.length > 0 && (
                <div className="space-y-2 mb-6 pt-4 border-t border-border">
                  <p className="text-sm font-semibold text-muted-foreground mb-3">Non inclus :</p>
                  {plan.notIncluded.map((item, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <X className="w-4 h-4 text-muted-foreground/50 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-muted-foreground/70">{item}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Promise */}
              <div className={`${colors.bg} rounded-lg p-4 mb-6`}>
                <p className="text-sm text-center">
                  <span className="font-semibold">🎯 Promesse :</span>{' '}
                  <span className="text-foreground/80">{plan.promise}</span>
                </p>
              </div>

              {/* CTA Button */}
              <Button className={`w-full ${colors.button}`}>
                {plan.priceMonthly === 'Sur devis' ? 'Demander un devis' : 'Choisir ce forfait'}
              </Button>
            </div>
          );
        })}
      </div>

      {/* Footer Note */}
      <div className="text-center text-sm text-muted-foreground">
        <p>Tous les prix sont HT. Engagement annuel recommandé pour bénéficier du meilleur tarif.</p>
        <p className="mt-1">Besoin d'une solution personnalisée ? <span className="text-primary cursor-pointer hover:underline">Contactez-nous</span></p>
      </div>
    </div>
  );
}
