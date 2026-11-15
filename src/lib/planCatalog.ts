/**
 * Les forfaits OptiFlow tels qu'ils sont vendus — copie du catalogue d'OptiCentral
 * (opti-suite-central, src/lib/pricing.ts, entrée « optiflow »). Une seule source pour tout
 * ce qui est affiché : nom des forfaits, contenu, véhicules et accès inclus, options.
 * Les blocages eux-mêmes sont appliqués par la base (license_features, hidden_pages).
 * À tenir à jour avec le catalogue d'OptiCentral (test : plan-catalog.test.ts).
 */
import { PLAN_LABELS, type PlanKey } from '@/lib/plans';

export interface PlanInfo {
  key: PlanKey;
  label: string;
  description: string;
  /** Inclus dans l'abonnement ; null = illimité. Au-delà : facturé à l'unité. */
  vehicles: number | null;
  users: number | null;
  /** Ce que ce forfait ajoute au précédent. */
  adds: string[];
  /** Onglets fermés par ce forfait. */
  hiddenPages: string[];
}

export interface PlanOption {
  key: string;
  label: string;
  description: string;
  /** Prix HT par mois quand l'option est prise en plus du forfait. */
  monthly: number;
  includedIn: PlanKey[];
  /** Fonctions de la licence ouvertes par l'option. */
  features: string[];
  /** Onglets ouverts par l'option. */
  pages: string[];
}

export const PLAN_ORDER: PlanKey[] = ['start', 'pro', 'enterprise'];

export const PLAN_INFO: Record<PlanKey, PlanInfo> = {
  start: {
    key: 'start',
    label: PLAN_LABELS.start,
    description: 'Coûts de revient, calculateur et historique des trajets',
    vehicles: 5,
    users: 2,
    adds: [
      'Calculateur de coût de revient et historique des trajets',
      'Itinéraires poids lourd (péages, restrictions)',
      'Planning, tournées, clients et palettes',
      'Véhicules, conducteurs et équipe',
      'Facturation Factur-X, charges fixes et analyse de marge',
    ],
    hiddenPages: ['/ai-analysis', '/forecast', '/vehicle-reports', '/tenders', '/line-montage'],
  },
  pro: {
    key: 'pro',
    label: PLAN_LABELS.pro,
    description: "Analyses, prévisionnel, devis et appels d'offres",
    vehicles: 15,
    users: 5,
    adds: [
      'Prévisionnel et analyses avancées (alertes de marge, clients peu rentables)',
      'Rapports par véhicule',
      'Devis par client et tarification automatique',
      'Création de ligne et optimisation des tournées',
    ],
    hiddenPages: ['/ai-analysis'],
  },
  enterprise: {
    key: 'enterprise',
    label: PLAN_LABELS.enterprise,
    description: 'Tout OptiFlow : IA, multi-agences, intégrations, accès illimités',
    vehicles: 40,
    users: null,
    adds: ['Analyse par IA de vos documents', 'Multi-agences', 'Intégration TMS / ERP', 'Accès illimités'],
    hiddenPages: [],
  },
};

const PE: PlanKey[] = ['pro', 'enterprise'];
const E: PlanKey[] = ['enterprise'];

export const PLAN_OPTIONS: PlanOption[] = [
  { key: 'analytics', label: 'Analyses avancées et prévisionnel', description: 'Prévisionnel, alertes de marge, clients peu rentables, rapports véhicules', monthly: 79, includedIn: PE, features: ['dashboard_analytics', 'forecast', 'page_forecast', 'monthly_tracking', 'dynamic_charts', 'margin_alerts', 'cost_analysis', 'client_analysis', 'page_vehicle_reports', 'page_toxic_clients'], pages: ['/forecast', '/vehicle-reports'] },
  { key: 'pricing', label: 'Tarification automatique et devis', description: 'Devis par client avec la grille tarifaire appliquée', monthly: 59, includedIn: PE, features: ['auto_pricing', 'smart_quotes', 'pdf_export_pro'], pages: ['/tenders'] },
  { key: 'line_montage', label: 'Création de ligne et optimisation des tournées', description: 'Construire et optimiser vos lignes', monthly: 49, includedIn: PE, features: ['ai_optimization', 'btn_ai_optimize'], pages: ['/line-montage'] },
  { key: 'ai', label: 'Analyse par IA des documents', description: "Lecture de vos documents et prédictions par l'IA", monthly: 99, includedIn: E, features: ['ai_pdf_analysis', 'page_ai_analysis'], pages: ['/ai-analysis'] },
  { key: 'multi_agency', label: 'Multi-agences', description: 'Plusieurs agences dans une même société', monthly: 129, includedIn: E, features: ['multi_agency'], pages: [] },
  { key: 'tms', label: 'Intégration TMS / ERP', description: 'Échanges avec vos autres logiciels', monthly: 199, includedIn: E, features: ['tms_erp_integration'], pages: [] },
];

/** Prix HT par mois d'un accès et d'un véhicule au-delà de ceux inclus. */
export const EXTRA_UNIT = { user: 15, vehicle: { start: 19, pro: 15, enterprise: 12 } as Record<PlanKey, number> };

export const asPlanKey = (k: string | null | undefined): PlanKey =>
  k === 'start' || k === 'pro' || k === 'enterprise' ? k : 'enterprise';

export const nextPlan = (k: string | null | undefined): PlanInfo | null => {
  const i = PLAN_ORDER.indexOf(asPlanKey(k));
  return i >= 0 && i < PLAN_ORDER.length - 1 ? PLAN_INFO[PLAN_ORDER[i + 1]] : null;
};

/** Options qu'on peut ajouter à ce forfait (celles qu'il n'inclut pas déjà). */
export const optionsFor = (k: string | null | undefined): PlanOption[] =>
  PLAN_OPTIONS.filter((o) => !o.includedIn.includes(asPlanKey(k)));

/** « 3 véhicules et 3 accès inclus » ; « accès illimités ». */
export function includedText(p: PlanInfo): string {
  const v = p.vehicles == null ? 'véhicules illimités' : `${p.vehicles} véhicule${p.vehicles > 1 ? 's' : ''}`;
  const u = p.users == null ? 'accès illimités' : `${p.users} accès`;
  return `${v} et ${u} inclus`;
}
