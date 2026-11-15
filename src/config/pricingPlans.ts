/**
 * Forfaits affichés publiquement (page d'activation, présentation, export /pricing-export).
 *
 * ⚠️ DÉCISION COMMERCIALE — aucun montant sur les pages publiques : « Sur devis ».
 * Vérifié par src/test/marketing-no-prices.test.ts.
 *
 * Contenu repris du catalogue des forfaits (src/lib/planCatalog.ts, copie d'OptiCentral) :
 * les trois forfaits Essentiel, Pro et Entreprise, mêmes noms dans les trois logiciels.
 */
import { Crown, Star, Zap, Users, Truck, type LucideIcon } from 'lucide-react';
import { PLAN_INFO, PLAN_ORDER } from '@/lib/planCatalog';
import type { PlanKey } from '@/lib/plans';

export interface PublicPlanLimit {
  icon: LucideIcon;
  label: string;
}

export interface PublicPlanFeature {
  label: string;
  included: boolean;
  highlight?: boolean;
}

export interface PublicPlan {
  id: PlanKey;
  name: string;
  subtitle: string;
  description: string;
  /** Toujours le texte affiché, jamais un nombre. */
  priceLabel: string;
  priceHelper: string;
  ctaLabel: string;
  icon: LucideIcon;
  color: string;
  popular?: boolean;
  bestValue?: boolean;
  limits: PublicPlanLimit[];
  features: PublicPlanFeature[];
}

export const PUBLIC_PRICE_LABEL = 'Sur devis';
export const PUBLIC_PRICE_HELPER = 'Tarif communiqué sur demande';
export const PUBLIC_CTA_LABEL = 'Nous contacter';

const ICONS: Record<PlanKey, LucideIcon> = { start: Star, pro: Zap, enterprise: Crown };
const COLORS: Record<PlanKey, string> = {
  start: 'from-sky-500 to-blue-600',
  pro: 'from-orange-500 to-amber-600',
  enterprise: 'from-amber-500 to-orange-600',
};

const allAdds = PLAN_ORDER.flatMap((k) => PLAN_INFO[k].adds.map((label) => ({ label, plan: k })));

export const PUBLIC_PLANS: PublicPlan[] = PLAN_ORDER.map((key, i) => {
  const p = PLAN_INFO[key];
  return {
    id: key,
    name: p.label,
    subtitle: i === 0 ? "L'essentiel pour démarrer" : i === 1 ? 'Pour les PME' : 'Tout inclus',
    description: p.description,
    priceLabel: PUBLIC_PRICE_LABEL,
    priceHelper: PUBLIC_PRICE_HELPER,
    ctaLabel: PUBLIC_CTA_LABEL,
    icon: ICONS[key],
    color: COLORS[key],
    bestValue: key === 'enterprise',
    limits: [
      { icon: Truck, label: p.vehicles == null ? 'Véhicules illimités' : `${p.vehicles} véhicules inclus` },
      { icon: Users, label: p.users == null ? 'Accès illimités' : `${p.users} accès inclus` },
    ],
    features: allAdds.map((a) => ({
      label: a.label,
      included: PLAN_ORDER.indexOf(a.plan) <= i,
      highlight: a.plan === key && i > 0,
    })),
  };
});
