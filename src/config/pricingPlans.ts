/**
 * SINGLE SOURCE OF TRUTH for pricing plans displayed publicly.
 *
 * ⚠️ STRATEGIC DECISION — DO NOT REVERT WITHOUT BUSINESS APPROVAL ⚠️
 *
 * Public/marketing pages (Activation, Presentation, PricingSection) MUST NEVER
 * display monetary amounts. Pricing is intentionally hidden from competitors
 * and communicated only on demand ("Sur devis").
 *
 * Rules enforced by `src/test/marketing-no-prices.test.ts`:
 *   - No `€`, `EUR`, `USD`, `$` followed by digits
 *   - No `\d+ /mois`, `/an`, `HT`, `TTC` patterns
 *
 * If you need real amounts for billing/invoicing logic, keep them in:
 *   - Edge functions (server-side only)
 *   - `src/types/team.ts` constants used by authenticated billing flows
 * — never inline them into a marketing component.
 */

import {
  Crown,
  Users,
  Truck,
  Calculator,
  FileSpreadsheet,
  type LucideIcon,
} from 'lucide-react';

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
  id: 'optiflow';
  name: string;
  subtitle: string;
  description: string;
  /** Always the literal string shown publicly. Never a number. */
  priceLabel: string;
  /** Helper text shown under the price label. */
  priceHelper: string;
  /** CTA shown on every public plan card. */
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

/** Single all-inclusive plan. Every feature is included. */
export const PUBLIC_PLANS: PublicPlan[] = [
  {
    id: 'optiflow',
    name: 'OptiFlow',
    subtitle: 'Tout inclus',
    description:
      'Un forfait unique avec toutes les fonctionnalités : coûts, itinéraires, planning, IA, équipe et analyses.',
    priceLabel: PUBLIC_PRICE_LABEL,
    priceHelper: PUBLIC_PRICE_HELPER,
    ctaLabel: PUBLIC_CTA_LABEL,
    icon: Crown,
    bestValue: true,
    color: 'from-amber-500 to-orange-600',
    limits: [
      { icon: Users, label: 'Équipe illimitée' },
      { icon: Truck, label: 'Véhicules & conducteurs illimités' },
      { icon: Calculator, label: 'Calculs illimités' },
      { icon: Users, label: 'Clients illimités' },
      { icon: FileSpreadsheet, label: 'Tournées illimitées' },
    ],
    features: [
      { label: 'Calculateur de coûts complet', included: true },
      { label: 'Itinéraire poids lourd (péages, restrictions)', included: true },
      { label: 'Suivi des charges (journalières, mensuelles, annuelles)', included: true },
      { label: 'Planning conducteurs complet', included: true },
      { label: 'Analyses IA illimitées', included: true },
      { label: 'Export PDF professionnel & Excel', included: true },
      { label: 'Alertes de marge en temps réel', included: true },
      { label: 'Historique des trajets & tableau de bord avancé', included: true },
      { label: 'Prévisionnel de coûts & devis intelligents', included: true },
      { label: "Gestion d'équipe avec rôles (Direction / Exploitation)", included: true },
      { label: 'Confidentialité des métriques par rôle', included: true },
      { label: 'Multi-agences', included: true },
      { label: 'Intégration TMS / ERP', included: true },
      { label: 'Support prioritaire', included: true },
    ],
  },
];
