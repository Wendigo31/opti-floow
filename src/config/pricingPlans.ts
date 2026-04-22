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
  Rocket,
  Star,
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
  id: 'start' | 'pro' | 'enterprise';
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

/**
 * Shared constants — change these in ONE place to update every public plan card.
 */
export const PUBLIC_PRICE_LABEL = 'Sur devis';
export const PUBLIC_PRICE_HELPER = 'Tarif communiqué sur demande';
export const PUBLIC_CTA_LABEL = 'Nous contacter';

export const PUBLIC_PLANS: PublicPlan[] = [
  {
    id: 'start',
    name: 'Start',
    subtitle: 'Découverte',
    description:
      'Idéal pour les indépendants et petites flottes qui veulent maîtriser leurs coûts.',
    priceLabel: PUBLIC_PRICE_LABEL,
    priceHelper: PUBLIC_PRICE_HELPER,
    ctaLabel: PUBLIC_CTA_LABEL,
    icon: Rocket,
    color: 'from-emerald-500 to-teal-600',
    limits: [
      { icon: Users, label: 'Utilisateur unique' },
      { icon: Truck, label: 'Petite flotte' },
      { icon: Calculator, label: 'Calculs quotidiens' },
      { icon: Users, label: 'Portefeuille clients de base' },
      { icon: FileSpreadsheet, label: 'Tournées sauvegardées' },
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
      { label: "Gestion d'équipe", included: false },
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    subtitle: 'Croissance',
    description:
      'Pour les exploitants qui veulent optimiser leur planning et analyser leurs performances.',
    priceLabel: PUBLIC_PRICE_LABEL,
    priceHelper: PUBLIC_PRICE_HELPER,
    ctaLabel: PUBLIC_CTA_LABEL,
    icon: Star,
    popular: true,
    color: 'from-blue-500 to-indigo-600',
    limits: [
      { icon: Users, label: 'Plusieurs utilisateurs inclus' },
      { icon: Truck, label: 'Flotte intermédiaire' },
      { icon: Calculator, label: 'Calculs étendus' },
      { icon: Users, label: 'Portefeuille clients étendu' },
      { icon: FileSpreadsheet, label: 'Bibliothèque de tournées' },
    ],
    features: [
      { label: 'Tout le forfait Start', included: true, highlight: true },
      { label: 'Planning conducteurs complet', included: true },
      { label: 'Analyses IA quotidiennes', included: true },
      { label: 'Export PDF professionnel & Excel', included: true },
      { label: 'Alertes de marge en temps réel', included: true },
      { label: 'Historique des trajets', included: true },
      { label: 'Tableau de bord avancé', included: true },
      { label: 'Prévisionnel & devis intelligents', included: false },
      { label: "Gestion d'équipe & rôles", included: false },
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    subtitle: 'Performance',
    description:
      "La solution complète pour les flottes structurées avec gestion d'équipe et IA illimitée. Tarification sur devis.",
    priceLabel: PUBLIC_PRICE_LABEL,
    priceHelper: PUBLIC_PRICE_HELPER,
    ctaLabel: PUBLIC_CTA_LABEL,
    icon: Crown,
    bestValue: true,
    color: 'from-amber-500 to-orange-600',
    limits: [
      { icon: Users, label: 'Équipe étendue incluse' },
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
      { label: "Gestion d'équipe avec rôles (Direction / Exploitation)", included: true },
      { label: 'Confidentialité des métriques par rôle', included: true },
      { label: 'Multi-agences', included: true },
      { label: 'Intégration TMS / ERP', included: true },
      { label: 'Support prioritaire', included: true },
    ],
  },
];