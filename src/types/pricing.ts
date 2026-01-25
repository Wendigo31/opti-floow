// ============= PRICING SYSTEM =============
// Centralized pricing configuration for OptiFlow

export interface PricingPlan {
  id: 'start' | 'pro' | 'enterprise';
  name: string;
  tagline: string;
  target: string;
  monthlyPrice: number; // En euros HT (0 = sur devis)
  yearlyPrice: number; // En euros HT (avec réduction)
  yearlyDiscount: number; // Pourcentage de réduction
  color: 'blue' | 'orange' | 'red';
  icon: string;
  popular?: boolean;
  isCustomPricing?: boolean; // true = prix sur devis
  limits: PlanLimits;
  features: string[]; // Keys des fonctionnalités incluses
  promise: string;
}

export interface PlanLimits {
  maxVehicles: number | null; // null = illimité
  maxDrivers: number | null;
  maxClients: number | null;
  maxSavedTours: number | null;
  maxDailyCharges: number | null;
  maxMonthlyCharges: number | null;
  maxYearlyCharges: number | null;
}

export interface AddOn {
  id: string;
  name: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  icon: string;
  category: 'feature' | 'limit' | 'support';
  availableFor: ('start' | 'pro' | 'enterprise')[];
  // Pour les add-ons de type limit
  limitIncrease?: {
    key: keyof PlanLimits;
    amount: number | null; // null = illimité
  };
  // Pour les add-ons de type feature
  featureKey?: string;
}

// ============= PLANS CONFIGURATION =============
export const PRICING_PLANS: PricingPlan[] = [
  {
    id: 'start',
    name: 'OptiFlow START',
    tagline: "L'essentiel pour démarrer",
    target: 'Artisans, auto-entrepreneurs (1-2 véhicules)',
    monthlyPrice: 29,
    yearlyPrice: 290, // 12 mois au prix de 10
    yearlyDiscount: 17,
    color: 'blue',
    icon: 'Zap',
    limits: {
      maxVehicles: 2,
      maxDrivers: 2,
      maxClients: 5,
      maxSavedTours: 0, // Disponible en add-on
      maxDailyCharges: 10,
      maxMonthlyCharges: 10,
      maxYearlyCharges: 5,
    },
    features: [
      'basic_calculator',
      'dashboard_basic',
      'cost_analysis_basic',
      'pdf_export_basic',
      'fleet_basic', // Gestion basique flotte (sans amortissement, entretien, pneus, conso)
    ],
    promise: "Savoir si tu gagnes ou perds de l'argent, en 5 minutes.",
  },
  {
    id: 'pro',
    name: 'OptiFlow PRO',
    tagline: 'Optimiser, comparer, décider',
    target: 'PME transport (jusqu\'à 15 véhicules)',
    monthlyPrice: 79,
    yearlyPrice: 790,
    yearlyDiscount: 17,
    color: 'orange',
    icon: 'Rocket',
    popular: true,
    limits: {
      maxVehicles: 10,
      maxDrivers: 5,
      maxClients: 20,
      maxSavedTours: 5,
      maxDailyCharges: 50,
      maxMonthlyCharges: 50,
      maxYearlyCharges: 25,
    },
    features: [
      // Tout START + add-ons inclus
      'basic_calculator',
      'itinerary_planning',
      'dashboard_basic',
      'cost_analysis_basic',
      'auto_pricing_basic',
      'saved_tours',
      'pdf_export_basic',
      'fleet_management', // Gestion flotte avancée incluse
      // Pro exclusif
      'dashboard_analytics',
      'forecast',
      'trip_history',
      'multi_drivers',
      'cost_analysis',
      'margin_alerts',
      'dynamic_charts',
      'pdf_export_pro',
      'monthly_tracking',
      'auto_pricing',
      'client_analysis_basic',
    ],
    promise: 'Optimiser chaque tournée pour gagner plus.',
  },
  {
    id: 'enterprise',
    name: 'OptiFlow ENTERPRISE',
    tagline: 'Piloter comme un directeur financier',
    target: 'Grandes flottes, groupes logistiques',
    monthlyPrice: 0, // Sur devis
    yearlyPrice: 0, // Sur devis
    yearlyDiscount: 0,
    color: 'red',
    icon: 'Building2',
    isCustomPricing: true, // Indique que le prix est sur devis
    limits: {
      maxVehicles: null,
      maxDrivers: null,
      maxClients: null,
      maxSavedTours: null,
      maxDailyCharges: null,
      maxMonthlyCharges: null,
      maxYearlyCharges: null,
    },
    features: [
      // Tout PRO
      'basic_calculator',
      'itinerary_planning',
      'dashboard_basic',
      'cost_analysis_basic',
      'auto_pricing_basic',
      'saved_tours',
      'pdf_export_basic',
      'dashboard_analytics',
      'forecast',
      'trip_history',
      'multi_drivers',
      'cost_analysis',
      'margin_alerts',
      'dynamic_charts',
      'pdf_export_pro',
      'excel_export',
      'monthly_tracking',
      'auto_pricing',
      'client_analysis_basic',
      // Enterprise exclusif
      'ai_optimization',
      'ai_pdf_analysis',
      'multi_agency',
      'tms_erp_integration',
      'multi_users',
      'unlimited_vehicles',
      'client_analysis',
      'smart_quotes',
    ],
    promise: 'Transformer la donnée transport en avantage stratégique.',
  },
];

// ============= ADD-ONS CONFIGURATION =============
// STRATÉGIE TARIFAIRE: 
// - START: Add-ons essentiels à bas prix pour créer dépendance + upsell vers PRO
// - PRO: Add-ons premium à prix moyen pour maximiser ARPU avant upgrade ENTERPRISE  
// - ENTERPRISE: Tout inclus, add-ons pour services/support uniquement

export const ADD_ONS: AddOn[] = [
  // ╔══════════════════════════════════════════════════════════════════╗
  // ║                    ADD-ONS FORFAIT START                         ║
  // ║  Objectif: Créer le besoin, prix d'appel, conversion vers PRO   ║
  // ╚══════════════════════════════════════════════════════════════════╝
  
  // --- Fonctionnalités essentielles (prix d'appel) ---
  {
    id: 'addon_saved_tours',
    name: 'Sauvegarde tournées',
    description: "Enregistrer et réutiliser vos tournées favorites (50 max)",
    monthlyPrice: 7,
    yearlyPrice: 70,
    icon: 'Bookmark',
    category: 'feature',
    availableFor: ['start'],
    featureKey: 'saved_tours',
  },
  {
    id: 'addon_itinerary',
    name: 'Planification itinéraire',
    description: "Carte interactive avec calcul de route et péages",
    monthlyPrice: 9,
    yearlyPrice: 90,
    icon: 'Route',
    category: 'feature',
    availableFor: ['start'],
    featureKey: 'itinerary_planning',
  },
  {
    id: 'addon_trip_history',
    name: 'Historique calculateur',
    description: "Conservez l'historique de tous vos calculs de trajets",
    monthlyPrice: 9,
    yearlyPrice: 90,
    icon: 'History',
    category: 'feature',
    availableFor: ['start'],
    featureKey: 'trip_history',
  },
  
  // --- Fonctionnalités avancées (marge plus élevée) ---
  {
    id: 'addon_auto_pricing',
    name: 'Tarification automatique',
    description: "Calcul automatique du prix avec marge cible optimale",
    monthlyPrice: 14,
    yearlyPrice: 140,
    icon: 'Calculator',
    category: 'feature',
    availableFor: ['start'],
    featureKey: 'auto_pricing_basic',
  },
  {
    id: 'addon_margin_alerts',
    name: 'Alertes de marge',
    description: "Notifications automatiques si la marge est trop basse",
    monthlyPrice: 12,
    yearlyPrice: 120,
    icon: 'AlertTriangle',
    category: 'feature',
    availableFor: ['start'],
    featureKey: 'margin_alerts',
  },
  {
    id: 'addon_dashboard_analytics',
    name: 'Tableau de bord analytique',
    description: "Graphiques et statistiques avancées de votre activité",
    monthlyPrice: 19,
    yearlyPrice: 190,
    icon: 'BarChart3',
    category: 'feature',
    availableFor: ['start'],
    featureKey: 'dashboard_analytics',
  },
  
  // --- Fonctionnalités premium (incitation upgrade PRO) ---
  {
    id: 'addon_fleet_advanced',
    name: 'Gestion flotte avancée',
    description: "Amortissement, entretien, pneus et suivi de consommation",
    monthlyPrice: 19,
    yearlyPrice: 190,
    icon: 'Truck',
    category: 'feature',
    availableFor: ['start'],
    featureKey: 'fleet_management',
  },
  {
    id: 'addon_forecast_start',
    name: 'Prévisionnel',
    description: "Projections de revenus sur 3, 6 et 12 mois avec tendances",
    monthlyPrice: 24,
    yearlyPrice: 240,
    icon: 'TrendingUp',
    category: 'feature',
    availableFor: ['start'],
    featureKey: 'forecast',
  },
  {
    id: 'addon_excel_export_start',
    name: 'Export Excel/CSV',
    description: "Exportez toutes vos données en Excel ou CSV",
    monthlyPrice: 12,
    yearlyPrice: 120,
    icon: 'FileSpreadsheet',
    category: 'feature',
    availableFor: ['start'],
    featureKey: 'excel_export',
  },

  // --- Limites START (revenus récurrents) ---
  {
    id: 'addon_extra_vehicles_5_start',
    name: '+5 véhicules',
    description: "Ajoutez 5 véhicules supplémentaires à votre quota",
    monthlyPrice: 12,
    yearlyPrice: 120,
    icon: 'Truck',
    category: 'limit',
    availableFor: ['start'],
    limitIncrease: { key: 'maxVehicles', amount: 5 },
  },
  {
    id: 'addon_extra_drivers_3_start',
    name: '+3 conducteurs',
    description: "Ajoutez 3 conducteurs supplémentaires",
    monthlyPrice: 9,
    yearlyPrice: 90,
    icon: 'UserPlus',
    category: 'limit',
    availableFor: ['start'],
    limitIncrease: { key: 'maxDrivers', amount: 3 },
  },
  {
    id: 'addon_extra_clients_25_start',
    name: '+25 clients',
    description: "Ajoutez 25 clients supplémentaires",
    monthlyPrice: 9,
    yearlyPrice: 90,
    icon: 'UserCog',
    category: 'limit',
    availableFor: ['start'],
    limitIncrease: { key: 'maxClients', amount: 25 },
  },

  // --- Support START ---
  {
    id: 'addon_priority_support_start',
    name: 'Support prioritaire',
    description: "Temps de réponse garanti sous 4h ouvrées",
    monthlyPrice: 19,
    yearlyPrice: 190,
    icon: 'Headphones',
    category: 'support',
    availableFor: ['start'],
  },

  // ╔══════════════════════════════════════════════════════════════════╗
  // ║                     ADD-ONS FORFAIT PRO                          ║
  // ║  Objectif: Maximiser ARPU, add-ons premium avant ENTERPRISE     ║
  // ╚══════════════════════════════════════════════════════════════════╝
  
  // --- Fonctionnalités IA & Avancées (haute valeur) ---
  {
    id: 'addon_ai_optimization',
    name: 'Pack Intelligence Artificielle',
    description: "Optimisation IA des trajets + Analyse IA dans les exports PDF",
    monthlyPrice: 59,
    yearlyPrice: 590,
    icon: 'Brain',
    category: 'feature',
    availableFor: ['pro'],
    featureKey: 'ai_optimization',
  },
  {
    id: 'addon_client_analysis',
    name: 'Analyse clients avancée',
    description: "Détection des clients toxiques et rentables avec statistiques",
    monthlyPrice: 29,
    yearlyPrice: 290,
    icon: 'Users',
    category: 'feature',
    availableFor: ['pro'],
    featureKey: 'client_analysis',
  },
  {
    id: 'addon_smart_quotes',
    name: 'Devis intelligent',
    description: "Générateur de devis automatique avec prix optimaux calculés",
    monthlyPrice: 39,
    yearlyPrice: 390,
    icon: 'FileText',
    category: 'feature',
    availableFor: ['pro'],
    featureKey: 'smart_quotes',
  },
  
  // --- Fonctionnalités Enterprise en preview (incitation upgrade) ---
  {
    id: 'addon_multi_users',
    name: 'Multi-utilisateurs',
    description: "Ajoutez jusqu'à 5 comptes utilisateurs sur votre licence",
    monthlyPrice: 35,
    yearlyPrice: 350,
    icon: 'Users',
    category: 'feature',
    availableFor: ['pro'],
    featureKey: 'multi_users',
  },
  {
    id: 'addon_multi_agency',
    name: 'Multi-agences',
    description: "Gérez plusieurs sites/agences avec tableaux de bord consolidés",
    monthlyPrice: 49,
    yearlyPrice: 490,
    icon: 'Building',
    category: 'feature',
    availableFor: ['pro'],
    featureKey: 'multi_agency',
  },
  {
    id: 'addon_tms_erp',
    name: 'Intégration TMS/ERP',
    description: "Connectez OptiFlow à vos systèmes existants (API, webhooks)",
    monthlyPrice: 79,
    yearlyPrice: 790,
    icon: 'Plug',
    category: 'feature',
    availableFor: ['pro'],
    featureKey: 'tms_erp_integration',
  },

  // --- Limites PRO (revenus récurrents, plus généreux) ---
  {
    id: 'addon_extra_vehicles_15',
    name: '+15 véhicules',
    description: "Ajoutez 15 véhicules supplémentaires à votre quota",
    monthlyPrice: 25,
    yearlyPrice: 250,
    icon: 'Truck',
    category: 'limit',
    availableFor: ['pro'],
    limitIncrease: { key: 'maxVehicles', amount: 15 },
  },
  {
    id: 'addon_extra_drivers_10',
    name: '+10 conducteurs',
    description: "Ajoutez 10 conducteurs supplémentaires",
    monthlyPrice: 19,
    yearlyPrice: 190,
    icon: 'UserPlus',
    category: 'limit',
    availableFor: ['pro'],
    limitIncrease: { key: 'maxDrivers', amount: 10 },
  },
  {
    id: 'addon_extra_clients_100',
    name: '+100 clients',
    description: "Ajoutez 100 clients supplémentaires",
    monthlyPrice: 19,
    yearlyPrice: 190,
    icon: 'UserCog',
    category: 'limit',
    availableFor: ['pro'],
    limitIncrease: { key: 'maxClients', amount: 100 },
  },
  {
    id: 'addon_extra_tours_200',
    name: '+200 tournées',
    description: "Ajoutez 200 tournées sauvegardées",
    monthlyPrice: 15,
    yearlyPrice: 150,
    icon: 'Route',
    category: 'limit',
    availableFor: ['pro'],
    limitIncrease: { key: 'maxSavedTours', amount: 200 },
  },
  {
    id: 'addon_unlimited_limits',
    name: 'Limites illimitées',
    description: "Passez en illimité sur tous les quotas (véhicules, conducteurs, clients, tournées)",
    monthlyPrice: 69,
    yearlyPrice: 690,
    icon: 'Infinity',
    category: 'limit',
    availableFor: ['pro'],
    limitIncrease: { key: 'maxVehicles', amount: null },
  },

  // --- Support PRO ---
  {
    id: 'addon_dedicated_support',
    name: 'Support dédié',
    description: "Account manager dédié + SLA 2h garanti",
    monthlyPrice: 129,
    yearlyPrice: 1290,
    icon: 'Shield',
    category: 'support',
    availableFor: ['pro'],
  },

  // ╔══════════════════════════════════════════════════════════════════╗
  // ║                   ADD-ONS FORFAIT ENTERPRISE                     ║
  // ║  Objectif: Services premium, tout est déjà inclus               ║
  // ╚══════════════════════════════════════════════════════════════════╝
  
  // --- Services & Support uniquement ---
  {
    id: 'addon_onboarding_enterprise',
    name: 'Onboarding personnalisé',
    description: "Formation 4h en visio + configuration complète + import données",
    monthlyPrice: 0,
    yearlyPrice: 499,
    icon: 'GraduationCap',
    category: 'support',
    availableFor: ['enterprise'],
  },
  {
    id: 'addon_custom_dev',
    name: 'Développements sur mesure',
    description: "Fonctionnalités personnalisées selon vos besoins spécifiques",
    monthlyPrice: 0,
    yearlyPrice: 0, // Sur devis
    icon: 'Code',
    category: 'support',
    availableFor: ['enterprise'],
  },
  {
    id: 'addon_premium_sla',
    name: 'SLA Premium',
    description: "Garantie de disponibilité 99.9% + Réponse sous 1h",
    monthlyPrice: 199,
    yearlyPrice: 1990,
    icon: 'ShieldCheck',
    category: 'support',
    availableFor: ['enterprise'],
  },
  {
    id: 'addon_dedicated_infra',
    name: 'Infrastructure dédiée',
    description: "Hébergement dédié / cloud privé avec isolation complète",
    monthlyPrice: 299,
    yearlyPrice: 2990,
    icon: 'Server',
    category: 'support',
    availableFor: ['enterprise'],
  },

  // ╔══════════════════════════════════════════════════════════════════╗
  // ║                    ONBOARDING TOUS FORFAITS                      ║
  // ╚══════════════════════════════════════════════════════════════════╝
  {
    id: 'addon_onboarding_start',
    name: 'Onboarding express',
    description: "Formation 1h en visio + configuration initiale",
    monthlyPrice: 0,
    yearlyPrice: 149,
    icon: 'GraduationCap',
    category: 'support',
    availableFor: ['start'],
  },
  {
    id: 'addon_onboarding_pro',
    name: 'Onboarding complet',
    description: "Formation 2h en visio + configuration + import données",
    monthlyPrice: 0,
    yearlyPrice: 299,
    icon: 'GraduationCap',
    category: 'support',
    availableFor: ['pro'],
  },
];

// ============= FEATURE DEFINITIONS =============
export interface FeatureDefinition {
  key: string;
  name: string;
  description: string;
  category: FeatureCategory;
  defaultPlan: 'start' | 'pro' | 'enterprise';
  isAddonAvailable?: boolean;
  addonId?: string;
}

export type FeatureCategory = 
  | 'calculation'
  | 'navigation'
  | 'analytics'
  | 'history'
  | 'fleet'
  | 'export'
  | 'ai'
  | 'enterprise';

export const FEATURE_DEFINITIONS: FeatureDefinition[] = [
  // === Calcul & Navigation (START) ===
  { key: 'basic_calculator', name: 'Calculateur de trajet', description: 'Calcul des coûts et rentabilité €/km', category: 'calculation', defaultPlan: 'start' },
  { key: 'dashboard_basic', name: 'Tableau de bord simplifié', description: 'Vue essentielle de vos données', category: 'analytics', defaultPlan: 'start' },
  { key: 'cost_analysis_basic', name: 'Analyse des coûts', description: 'Répartition des coûts fixes/variables', category: 'analytics', defaultPlan: 'start' },
  { key: 'pdf_export_basic', name: 'Export PDF basique', description: 'Exporter un résumé de calcul en PDF', category: 'export', defaultPlan: 'start' },
  { key: 'fleet_basic', name: 'Gestion flotte basique', description: 'Fiche véhicule sans calculs avancés', category: 'fleet', defaultPlan: 'start' },
  
  // === START Add-ons (disponibles en option) ===
  { key: 'itinerary_planning', name: 'Planification itinéraire', description: 'Carte interactive avec calcul de route', category: 'navigation', defaultPlan: 'pro', isAddonAvailable: true, addonId: 'addon_itinerary' },
  { key: 'saved_tours', name: 'Sauvegarde tournées', description: 'Enregistrer et réutiliser vos tournées', category: 'navigation', defaultPlan: 'pro', isAddonAvailable: true, addonId: 'addon_saved_tours' },
  { key: 'trip_history', name: 'Historique trajets', description: 'Suivi et analyse des trajets effectués', category: 'history', defaultPlan: 'pro', isAddonAvailable: true, addonId: 'addon_trip_history' },
  { key: 'auto_pricing_basic', name: 'Prix suggéré', description: 'Calcul automatique du prix avec marge cible', category: 'calculation', defaultPlan: 'pro', isAddonAvailable: true, addonId: 'addon_auto_pricing' },
  { key: 'fleet_management', name: 'Gestion flotte avancée', description: 'Amortissement, entretien, pneus, consommation', category: 'fleet', defaultPlan: 'pro', isAddonAvailable: true, addonId: 'addon_fleet_advanced' },

  // === PRO Features ===
  { key: 'dashboard_analytics', name: 'Tableau de bord analytique', description: 'Graphiques et statistiques avancées', category: 'analytics', defaultPlan: 'pro' },
  { key: 'forecast', name: 'Prévisionnel', description: 'Projections 3/6/12 mois', category: 'analytics', defaultPlan: 'pro', isAddonAvailable: true, addonId: 'addon_forecast' },
  { key: 'multi_drivers', name: 'Multi-conducteurs', description: 'Gérer plusieurs conducteurs', category: 'fleet', defaultPlan: 'pro' },
  { key: 'cost_analysis', name: 'Analyse coûts avancée', description: 'Répartition détaillée par poste', category: 'analytics', defaultPlan: 'pro' },
  { key: 'margin_alerts', name: 'Alertes de marge', description: 'Notification si marge trop basse', category: 'analytics', defaultPlan: 'pro' },
  { key: 'dynamic_charts', name: 'Graphiques dynamiques', description: 'Visualisations interactives', category: 'analytics', defaultPlan: 'pro' },
  { key: 'pdf_export_pro', name: 'Export PDF pro', description: 'Rapports PDF complets et personnalisés', category: 'export', defaultPlan: 'pro' },
  { key: 'excel_export', name: 'Export Excel/CSV', description: 'Exporter toutes vos données', category: 'export', defaultPlan: 'pro', isAddonAvailable: true, addonId: 'addon_excel_export' },
  { key: 'monthly_tracking', name: 'Suivi mensuel', description: 'Rapports mensuels automatiques', category: 'history', defaultPlan: 'pro' },
  { key: 'auto_pricing', name: 'Tarification avancée', description: 'Calcul prix optimal avec multi-paramètres', category: 'calculation', defaultPlan: 'pro' },
  { key: 'client_analysis_basic', name: 'Analyse clients', description: 'Voir la rentabilité par client', category: 'analytics', defaultPlan: 'pro' },

  // === ENTERPRISE Features ===
  { key: 'ai_optimization', name: 'Optimisation IA', description: 'Analyse IA des trajets et recommandations', category: 'ai', defaultPlan: 'enterprise', isAddonAvailable: true, addonId: 'addon_ai_optimization' },
  { key: 'ai_pdf_analysis', name: 'Analyse IA PDF', description: 'Insights IA dans les exports PDF', category: 'ai', defaultPlan: 'enterprise' },
  { key: 'multi_agency', name: 'Multi-agences', description: 'Gestion de plusieurs sites', category: 'enterprise', defaultPlan: 'enterprise', isAddonAvailable: true, addonId: 'addon_multi_agency' },
  { key: 'tms_erp_integration', name: 'Intégration TMS/ERP', description: 'Connexion aux systèmes externes', category: 'enterprise', defaultPlan: 'enterprise', isAddonAvailable: true, addonId: 'addon_tms_erp' },
  { key: 'multi_users', name: 'Multi-utilisateurs', description: 'Plusieurs comptes par licence', category: 'enterprise', defaultPlan: 'enterprise', isAddonAvailable: true, addonId: 'addon_multi_users' },
  { key: 'unlimited_vehicles', name: 'Véhicules illimités', description: 'Aucune limite de véhicules', category: 'fleet', defaultPlan: 'enterprise' },
  { key: 'client_analysis', name: 'Analyse clients avancée', description: 'Détection clients toxiques/rentables', category: 'analytics', defaultPlan: 'enterprise' },
  { key: 'smart_quotes', name: 'Devis intelligent', description: 'Générateur de devis avec prix optimaux', category: 'enterprise', defaultPlan: 'enterprise', isAddonAvailable: true, addonId: 'addon_smart_quotes' },
];

// ============= UTILITY FUNCTIONS =============
export function getPlanById(id: 'start' | 'pro' | 'enterprise'): PricingPlan {
  return PRICING_PLANS.find(p => p.id === id)!;
}

/**
 * Récupère les add-ons pour un forfait, triés par catégorie puis par prix décroissant
 * Stratégie: Afficher les add-ons les plus rentables en premier
 */
export function getAddOnsForPlan(planId: 'start' | 'pro' | 'enterprise'): AddOn[] {
  const addons = ADD_ONS.filter(addon => addon.availableFor.includes(planId));
  
  // Ordre de priorité des catégories (features premium en premier)
  const categoryOrder: Record<AddOn['category'], number> = {
    feature: 1,
    limit: 2,
    support: 3,
  };
  
  return addons.sort((a, b) => {
    // D'abord par catégorie
    const catDiff = categoryOrder[a.category] - categoryOrder[b.category];
    if (catDiff !== 0) return catDiff;
    
    // Ensuite par prix mensuel décroissant (plus rentable en premier)
    return b.monthlyPrice - a.monthlyPrice;
  });
}

/**
 * Récupère les add-ons par catégorie pour un forfait donné
 */
export function getAddOnsByCategory(planId: 'start' | 'pro' | 'enterprise'): Record<AddOn['category'], AddOn[]> {
  const addons = getAddOnsForPlan(planId);
  return {
    feature: addons.filter(a => a.category === 'feature'),
    limit: addons.filter(a => a.category === 'limit'),
    support: addons.filter(a => a.category === 'support'),
  };
}

/**
 * Calcule le revenu potentiel maximum si un client prend tous les add-ons
 */
export function getMaxPotentialRevenue(planId: 'start' | 'pro' | 'enterprise', isYearly: boolean): number {
  const plan = getPlanById(planId);
  const basePrice = isYearly ? plan.yearlyPrice : plan.monthlyPrice;
  
  const addons = getAddOnsForPlan(planId);
  const addonsTotal = addons.reduce((sum, addon) => {
    return sum + (isYearly ? addon.yearlyPrice : addon.monthlyPrice);
  }, 0);
  
  return basePrice + addonsTotal;
}

export function getFeaturesByPlan(planId: 'start' | 'pro' | 'enterprise'): FeatureDefinition[] {
  const plan = getPlanById(planId);
  return FEATURE_DEFINITIONS.filter(f => plan.features.includes(f.key));
}

export function isFeatureInPlan(featureKey: string, planId: 'start' | 'pro' | 'enterprise'): boolean {
  const plan = getPlanById(planId);
  return plan.features.includes(featureKey);
}

export function calculateTotalPrice(
  planId: 'start' | 'pro' | 'enterprise',
  selectedAddOns: string[],
  isYearly: boolean
): { base: number; addons: number; total: number; savings?: number; monthlyEquivalent: number } {
  const plan = getPlanById(planId);
  const basePrice = isYearly ? plan.yearlyPrice : plan.monthlyPrice;
  
  let addonsPrice = 0;
  selectedAddOns.forEach(addonId => {
    const addon = ADD_ONS.find(a => a.id === addonId);
    if (addon && addon.availableFor.includes(planId)) {
      addonsPrice += isYearly ? addon.yearlyPrice : addon.monthlyPrice;
    }
  });

  const total = basePrice + addonsPrice;
  const monthlyEquivalent = isYearly ? total / 12 : total;
  
  // Économie si passage en annuel
  let savings: number | undefined;
  if (isYearly) {
    const monthlyTotal = plan.monthlyPrice * 12;
    const monthlyAddonsTotal = selectedAddOns.reduce((sum, addonId) => {
      const addon = ADD_ONS.find(a => a.id === addonId);
      if (addon && addon.availableFor.includes(planId)) {
        return sum + addon.monthlyPrice * 12;
      }
      return sum;
    }, 0);
    savings = (monthlyTotal + monthlyAddonsTotal) - total;
  }

  return { base: basePrice, addons: addonsPrice, total, savings, monthlyEquivalent };
}

/**
 * Labels des catégories d'add-ons
 */
export const ADDON_CATEGORY_LABELS: Record<AddOn['category'], { fr: string; en: string; icon: string }> = {
  feature: { fr: 'Fonctionnalités', en: 'Features', icon: 'Sparkles' },
  limit: { fr: 'Capacités', en: 'Capacity', icon: 'ArrowUpCircle' },
  support: { fr: 'Support & Services', en: 'Support & Services', icon: 'Headphones' },
};

// ============= CATEGORY LABELS =============
export const CATEGORY_LABELS: Record<FeatureCategory, { fr: string; icon: string }> = {
  calculation: { fr: '🧮 Calcul & Tarification', icon: 'Calculator' },
  navigation: { fr: '🗺️ Itinéraires & Tournées', icon: 'Map' },
  analytics: { fr: '📊 Analyse & Tableaux de bord', icon: 'BarChart3' },
  history: { fr: '📅 Historique & Prévisions', icon: 'Calendar' },
  fleet: { fr: '🚛 Gestion Flotte', icon: 'Truck' },
  export: { fr: '📤 Export & Documents', icon: 'FileOutput' },
  ai: { fr: '🤖 Intelligence Artificielle', icon: 'Brain' },
  enterprise: { fr: '🏢 Entreprise', icon: 'Building2' },
};
