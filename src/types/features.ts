// Feature definitions for granular plan management
// Re-exports from new pricing system for backward compatibility
import { 
  PRICING_PLANS, 
  ADD_ONS, 
  FEATURE_DEFINITIONS as NEW_FEATURE_DEFINITIONS,
  getPlanById,
  type PricingPlan,
  type AddOn,
  type PlanLimits,
} from './pricing';

export interface LicenseFeatures {
  // Core features (Start)
  basic_calculator: boolean;
  itinerary_planning: boolean;
  dashboard_basic: boolean;
  cost_analysis_basic: boolean;
  auto_pricing_basic: boolean;
  
  // Pro features
  dashboard_analytics: boolean;
  forecast: boolean;
  trip_history: boolean;
  multi_drivers: boolean;
  cost_analysis: boolean;
  margin_alerts: boolean;
  dynamic_charts: boolean;
  pdf_export_pro: boolean;
  excel_export: boolean;
  monthly_tracking: boolean;
  auto_pricing: boolean;
  saved_tours: boolean;
  client_analysis_basic: boolean;
  
  // Enterprise features
  ai_optimization: boolean;
  ai_pdf_analysis: boolean;
  multi_agency: boolean;
  tms_erp_integration: boolean;
  multi_users: boolean;
  unlimited_vehicles: boolean;
  client_analysis: boolean;
  smart_quotes: boolean;
  
  // Company/User management features
  company_invite_members: boolean;
  company_remove_members: boolean;
  company_change_roles: boolean;
  company_view_activity: boolean;
  company_manage_settings: boolean;
  company_data_sharing: boolean;
  realtime_notifications: boolean;
  
  // Limits
  max_drivers: number | null;
  max_clients: number | null;
  max_vehicles: number | null;
  max_daily_charges: number | null;
  max_monthly_charges: number | null;
  max_yearly_charges: number | null;
  max_saved_tours: number | null;
  max_company_users: number | null;
}

// Active add-ons for a license
export interface LicenseAddOns {
  activeAddOns: string[]; // IDs des add-ons actifs
  addOnPricing: {
    monthly: number;
    yearly: number;
  };
}

export interface FeatureCategory {
  name: string;
  nameEn: string;
  nameEs: string;
  features: FeatureDefinition[];
}

export interface FeatureDefinition {
  key: keyof LicenseFeatures;
  label: string;
  labelEn: string;
  labelEs: string;
  description: string;
  descriptionEn: string;
  descriptionEs: string;
  defaultPlan: 'start' | 'pro' | 'enterprise';
  isLimit?: boolean;
  isAddonAvailable?: boolean;
  addonId?: string;
  addonPrice?: { monthly: number; yearly: number };
}

// Helper to convert new pricing system to old format
function convertPlanToFeatures(planId: 'start' | 'pro' | 'enterprise'): Partial<LicenseFeatures> {
  const plan = getPlanById(planId);
  const features: Partial<LicenseFeatures> = {};
  
  // Set all boolean features based on plan features array
  NEW_FEATURE_DEFINITIONS.forEach(f => {
    const key = f.key as keyof LicenseFeatures;
    if (typeof (features as any)[key] !== 'number') {
      (features as any)[key] = plan.features.includes(f.key);
    }
  });
  
  // Set limits
  features.max_vehicles = plan.limits.maxVehicles;
  features.max_drivers = plan.limits.maxDrivers;
  features.max_clients = plan.limits.maxClients;
  features.max_saved_tours = plan.limits.maxSavedTours;
  features.max_daily_charges = plan.limits.maxDailyCharges;
  features.max_monthly_charges = plan.limits.maxMonthlyCharges;
  features.max_yearly_charges = plan.limits.maxYearlyCharges;
  
  return features;
}

// Default features by plan - Generated from new pricing system
export const PLAN_DEFAULTS: Record<'start' | 'pro' | 'enterprise', Partial<LicenseFeatures>> = {
  start: {
    // Base - 29€/mois : Essentiel pour les artisans (features restreintes)
    basic_calculator: true,
    itinerary_planning: false, // Add-on
    dashboard_basic: true,
    dashboard_analytics: false,
    forecast: false,
    trip_history: false, // Add-on
    multi_drivers: false,
    cost_analysis: false,
    cost_analysis_basic: true,
    margin_alerts: false,
    dynamic_charts: false,
    pdf_export_pro: false,
    excel_export: false,
    monthly_tracking: false,
    auto_pricing: false,
    auto_pricing_basic: false, // Add-on
    saved_tours: false, // Add-on
    client_analysis_basic: false,
    ai_optimization: false,
    ai_pdf_analysis: false,
    multi_agency: false,
    tms_erp_integration: false,
    multi_users: false,
    unlimited_vehicles: false,
    client_analysis: false,
    smart_quotes: false,
    // Company features - START: basic only
    company_invite_members: false,
    company_remove_members: false,
    company_change_roles: false,
    company_view_activity: false,
    company_manage_settings: false,
    company_data_sharing: false,
    realtime_notifications: false,
    // Limites START
    max_drivers: 2,
    max_clients: 15,
    max_vehicles: 2,
    max_daily_charges: 10,
    max_monthly_charges: 10,
    max_yearly_charges: 5,
    max_saved_tours: 0, // Add-on requis
    max_company_users: 1,
  },
  pro: {
    // Pro - 79€/mois : Pour les PME
    basic_calculator: true,
    itinerary_planning: true,
    dashboard_basic: true,
    dashboard_analytics: true,
    forecast: true,
    trip_history: true,
    multi_drivers: true,
    cost_analysis: true,
    cost_analysis_basic: true,
    margin_alerts: true,
    dynamic_charts: true,
    pdf_export_pro: true,
    excel_export: true,
    monthly_tracking: true,
    auto_pricing: true,
    auto_pricing_basic: true,
    saved_tours: true,
    client_analysis_basic: true,
    ai_optimization: false,
    ai_pdf_analysis: false,
    multi_agency: false,
    tms_erp_integration: false,
    multi_users: false,
    unlimited_vehicles: false,
    client_analysis: false,
    smart_quotes: false,
    // Company features - PRO: team features
    company_invite_members: true,
    company_remove_members: true,
    company_change_roles: true,
    company_view_activity: true,
    company_manage_settings: true,
    company_data_sharing: true,
    realtime_notifications: true,
    // Limites PRO
    max_drivers: 15,
    max_clients: 100,
    max_vehicles: 50,
    max_daily_charges: 50,
    max_monthly_charges: 50,
    max_yearly_charges: 25,
    max_saved_tours: 200,
    max_company_users: 5,
  },
  enterprise: {
    // Enterprise - 199€/mois : Pour les grands comptes
    basic_calculator: true,
    itinerary_planning: true,
    dashboard_basic: true,
    dashboard_analytics: true,
    forecast: true,
    trip_history: true,
    multi_drivers: true,
    cost_analysis: true,
    cost_analysis_basic: true,
    margin_alerts: true,
    dynamic_charts: true,
    pdf_export_pro: true,
    excel_export: true,
    monthly_tracking: true,
    auto_pricing: true,
    auto_pricing_basic: true,
    saved_tours: true,
    client_analysis_basic: true,
    ai_optimization: true,
    ai_pdf_analysis: true,
    multi_agency: true,
    tms_erp_integration: true,
    multi_users: true,
    unlimited_vehicles: true,
    client_analysis: true,
    smart_quotes: true,
    // Company features - ENTERPRISE: full features
    company_invite_members: true,
    company_remove_members: true,
    company_change_roles: true,
    company_view_activity: true,
    company_manage_settings: true,
    company_data_sharing: true,
    realtime_notifications: true,
    // Tout illimité
    max_drivers: null,
    max_clients: null,
    max_vehicles: null,
    max_daily_charges: null,
    max_monthly_charges: null,
    max_yearly_charges: null,
    max_saved_tours: null,
    max_company_users: null,
  },
};

// Re-export pricing system for easy access
export { PRICING_PLANS, ADD_ONS, getPlanById, type PricingPlan, type AddOn, type PlanLimits };

// Feature categories for admin UI - reorganized for better clarity
export const FEATURE_CATEGORIES: FeatureCategory[] = [
  {
    name: '🧮 Calcul & Navigation',
    nameEn: '🧮 Calculation & Navigation',
    nameEs: '🧮 Cálculo y Navegación',
    features: [
      {
        key: 'basic_calculator',
        label: 'Calculateur de trajet',
        labelEn: 'Trip Calculator',
        labelEs: 'Calculadora de viaje',
        description: 'Calcul des coûts et rentabilité',
        descriptionEn: 'Cost and profitability calculation',
        descriptionEs: 'Cálculo de costes y rentabilidad',
        defaultPlan: 'start',
      },
      {
        key: 'itinerary_planning',
        label: 'Planification itinéraire',
        labelEn: 'Itinerary Planning',
        labelEs: 'Planificación de itinerario',
        description: 'Carte interactive avec calcul de route',
        descriptionEn: 'Interactive map with route calculation',
        descriptionEs: 'Mapa interactivo con cálculo de ruta',
        defaultPlan: 'start',
      },
      {
        key: 'auto_pricing',
        label: 'Tarification automatique',
        labelEn: 'Auto Pricing',
        labelEs: 'Tarificación automática',
        description: 'Calcul automatique du prix selon marge',
        descriptionEn: 'Automatic price calculation based on margin',
        descriptionEs: 'Cálculo automático de precio según margen',
        defaultPlan: 'pro',
      },
    ],
  },
  {
    name: '📊 Analyse & Tableaux de bord',
    nameEn: '📊 Analysis & Dashboards',
    nameEs: '📊 Análisis y Paneles',
    features: [
      {
        key: 'dashboard_analytics',
        label: 'Tableau de bord analytique',
        labelEn: 'Analytics Dashboard',
        labelEs: 'Panel de análisis',
        description: 'Graphiques et statistiques détaillées',
        descriptionEn: 'Charts and detailed statistics',
        descriptionEs: 'Gráficos y estadísticas detalladas',
        defaultPlan: 'pro',
      },
      {
        key: 'cost_analysis',
        label: 'Analyse des coûts',
        labelEn: 'Cost Analysis',
        labelEs: 'Análisis de costes',
        description: 'Répartition détaillée des coûts',
        descriptionEn: 'Detailed cost breakdown',
        descriptionEs: 'Desglose detallado de costes',
        defaultPlan: 'pro',
      },
      {
        key: 'dynamic_charts',
        label: 'Graphiques dynamiques',
        labelEn: 'Dynamic Charts',
        labelEs: 'Gráficos dinámicos',
        description: 'Visualisations interactives',
        descriptionEn: 'Interactive visualizations',
        descriptionEs: 'Visualizaciones interactivas',
        defaultPlan: 'pro',
      },
      {
        key: 'margin_alerts',
        label: 'Alertes de marge',
        labelEn: 'Margin Alerts',
        labelEs: 'Alertas de margen',
        description: 'Notifications si marge trop basse',
        descriptionEn: 'Notifications if margin too low',
        descriptionEs: 'Notificaciones si el margen es demasiado bajo',
        defaultPlan: 'pro',
      },
    ],
  },
  {
    name: '📅 Historique & Prévisions',
    nameEn: '📅 History & Forecasts',
    nameEs: '📅 Historial y Previsiones',
    features: [
      {
        key: 'trip_history',
        label: 'Historique des trajets',
        labelEn: 'Trip History',
        labelEs: 'Historial de viajes',
        description: 'Suivi des trajets effectués',
        descriptionEn: 'Track completed trips',
        descriptionEs: 'Seguimiento de viajes completados',
        defaultPlan: 'pro',
      },
      {
        key: 'forecast',
        label: 'Prévisionnel',
        labelEn: 'Forecast',
        labelEs: 'Previsión',
        description: 'Projections mensuelles de revenus',
        descriptionEn: 'Monthly revenue projections',
        descriptionEs: 'Proyecciones de ingresos mensuales',
        defaultPlan: 'pro',
      },
      {
        key: 'monthly_tracking',
        label: 'Suivi mensuel',
        labelEn: 'Monthly Tracking',
        labelEs: 'Seguimiento mensual',
        description: 'Rapports mensuels automatiques',
        descriptionEn: 'Automatic monthly reports',
        descriptionEs: 'Informes mensuales automáticos',
        defaultPlan: 'pro',
      },
      {
        key: 'saved_tours',
        label: 'Sauvegarde des tournées',
        labelEn: 'Saved Tours',
        labelEs: 'Guardado de rutas',
        description: 'Enregistrer et gérer les tournées',
        descriptionEn: 'Save and manage tours',
        descriptionEs: 'Guardar y gestionar rutas',
        defaultPlan: 'pro',
      },
    ],
  },
  {
    name: '👥 Gestion Flotte & Personnel',
    nameEn: '👥 Fleet & Personnel Management',
    nameEs: '👥 Gestión de Flota y Personal',
    features: [
      {
        key: 'multi_drivers',
        label: 'Multi-conducteurs',
        labelEn: 'Multi-drivers',
        labelEs: 'Multi-conductores',
        description: 'Gestion de plusieurs conducteurs',
        descriptionEn: 'Manage multiple drivers',
        descriptionEs: 'Gestionar varios conductores',
        defaultPlan: 'pro',
      },
      {
        key: 'unlimited_vehicles',
        label: 'Véhicules illimités',
        labelEn: 'Unlimited Vehicles',
        labelEs: 'Vehículos ilimitados',
        description: 'Aucune limite de véhicules',
        descriptionEn: 'No vehicle limit',
        descriptionEs: 'Sin límite de vehículos',
        defaultPlan: 'enterprise',
      },
      {
        key: 'client_analysis',
        label: 'Analyse clients',
        labelEn: 'Client Analysis',
        labelEs: 'Análisis de clientes',
        description: 'Détection clients toxiques/rentables',
        descriptionEn: 'Toxic/profitable client detection',
        descriptionEs: 'Detección de clientes tóxicos/rentables',
        defaultPlan: 'enterprise',
      },
    ],
  },
  {
    name: '📤 Export & Import',
    nameEn: '📤 Export & Import',
    nameEs: '📤 Exportar e Importar',
    features: [
      {
        key: 'pdf_export_pro',
        label: 'Export PDF avancé',
        labelEn: 'Advanced PDF Export',
        labelEs: 'Exportación PDF avanzada',
        description: 'Rapports PDF détaillés',
        descriptionEn: 'Detailed PDF reports',
        descriptionEs: 'Informes PDF detallados',
        defaultPlan: 'pro',
      },
      {
        key: 'excel_export',
        label: 'Export Excel',
        labelEn: 'Excel Export',
        labelEs: 'Exportación Excel',
        description: 'Export des données en Excel/CSV',
        descriptionEn: 'Export data to Excel/CSV',
        descriptionEs: 'Exportar datos a Excel/CSV',
        defaultPlan: 'pro',
      },
      {
        key: 'smart_quotes',
        label: 'Devis intelligent',
        labelEn: 'Smart Quotes',
        labelEs: 'Presupuestos inteligentes',
        description: 'Générateur de devis avec prix optimaux',
        descriptionEn: 'Quote generator with optimal pricing',
        descriptionEs: 'Generador de presupuestos con precios óptimos',
        defaultPlan: 'enterprise',
      },
    ],
  },
  {
    name: '🤖 Intelligence Artificielle',
    nameEn: '🤖 Artificial Intelligence',
    nameEs: '🤖 Inteligencia Artificial',
    features: [
      {
        key: 'ai_optimization',
        label: 'Optimisation IA',
        labelEn: 'AI Optimization',
        labelEs: 'Optimización IA',
        description: 'Analyse IA des trajets et recommandations',
        descriptionEn: 'AI trip analysis and recommendations',
        descriptionEs: 'Análisis IA de viajes y recomendaciones',
        defaultPlan: 'enterprise',
      },
      {
        key: 'ai_pdf_analysis',
        label: 'Analyse IA des PDF',
        labelEn: 'AI PDF Analysis',
        labelEs: 'Análisis IA de PDF',
        description: 'Analyse de rentabilité IA dans les exports',
        descriptionEn: 'AI profitability analysis in exports',
        descriptionEs: 'Análisis de rentabilidad IA en exportaciones',
        defaultPlan: 'enterprise',
      },
    ],
  },
  {
    name: '🏢 Entreprise & Intégrations',
    nameEn: '🏢 Enterprise & Integrations',
    nameEs: '🏢 Empresa e Integraciones',
    features: [
      {
        key: 'multi_agency',
        label: 'Multi-agences',
        labelEn: 'Multi-agency',
        labelEs: 'Multi-agencia',
        description: 'Gestion de plusieurs agences',
        descriptionEn: 'Manage multiple agencies',
        descriptionEs: 'Gestionar varias agencias',
        defaultPlan: 'enterprise',
      },
      {
        key: 'multi_users',
        label: 'Multi-utilisateurs',
        labelEn: 'Multi-users',
        labelEs: 'Multi-usuarios',
        description: 'Plusieurs comptes par licence',
        descriptionEn: 'Multiple accounts per license',
        descriptionEs: 'Múltiples cuentas por licencia',
        defaultPlan: 'enterprise',
      },
      {
        key: 'tms_erp_integration',
        label: 'Intégration TMS/ERP',
        labelEn: 'TMS/ERP Integration',
        labelEs: 'Integración TMS/ERP',
        description: 'Connexion aux systèmes externes',
        descriptionEn: 'Connect to external systems',
        descriptionEs: 'Conexión a sistemas externos',
        defaultPlan: 'enterprise',
      },
    ],
  },
];

// Limit definitions - reorganized with categories
export const LIMIT_CATEGORIES = [
  {
    name: '👥 Personnel',
    nameEn: 'Personnel',
    limits: ['max_drivers'],
  },
  {
    name: '🚛 Flotte',
    nameEn: 'Fleet',
    limits: ['max_vehicles'],
  },
  {
    name: '👤 Clients',
    nameEn: 'Clients',
    limits: ['max_clients'],
  },
  {
    name: '💰 Charges',
    nameEn: 'Charges',
    limits: ['max_daily_charges', 'max_monthly_charges', 'max_yearly_charges'],
  },
  {
    name: '📍 Tournées',
    nameEn: 'Tours',
    limits: ['max_saved_tours'],
  },
];

export const LIMIT_DEFINITIONS: FeatureDefinition[] = [
  {
    key: 'max_drivers',
    label: 'Conducteurs max',
    labelEn: 'Max Drivers',
    labelEs: 'Conductores máx',
    description: 'Nombre maximum de conducteurs',
    descriptionEn: 'Maximum number of drivers',
    descriptionEs: 'Número máximo de conductores',
    defaultPlan: 'start',
    isLimit: true,
  },
  {
    key: 'max_clients',
    label: 'Clients max',
    labelEn: 'Max Clients',
    labelEs: 'Clientes máx',
    description: 'Nombre maximum de clients',
    descriptionEn: 'Maximum number of clients',
    descriptionEs: 'Número máximo de clientes',
    defaultPlan: 'start',
    isLimit: true,
  },
  {
    key: 'max_vehicles',
    label: 'Véhicules max',
    labelEn: 'Max Vehicles',
    labelEs: 'Vehículos máx',
    description: 'Nombre maximum de véhicules',
    descriptionEn: 'Maximum number of vehicles',
    descriptionEs: 'Número máximo de vehículos',
    defaultPlan: 'start',
    isLimit: true,
  },
  {
    key: 'max_saved_tours',
    label: 'Tournées sauvegardées max',
    labelEn: 'Max Saved Tours',
    labelEs: 'Rutas guardadas máx',
    description: 'Nombre maximum de tournées sauvegardées',
    descriptionEn: 'Maximum number of saved tours',
    descriptionEs: 'Número máximo de rutas guardadas',
    defaultPlan: 'start',
    isLimit: true,
  },
  {
    key: 'max_daily_charges',
    label: 'Charges journalières max',
    labelEn: 'Max Daily Charges',
    labelEs: 'Cargos diarios máx',
    description: 'Nombre maximum de charges journalières',
    descriptionEn: 'Maximum number of daily charges',
    descriptionEs: 'Número máximo de cargos diarios',
    defaultPlan: 'start',
    isLimit: true,
  },
  {
    key: 'max_monthly_charges',
    label: 'Charges mensuelles max',
    labelEn: 'Max Monthly Charges',
    labelEs: 'Cargos mensuales máx',
    description: 'Nombre maximum de charges mensuelles',
    descriptionEn: 'Maximum number of monthly charges',
    descriptionEs: 'Número máximo de cargos mensuales',
    defaultPlan: 'start',
    isLimit: true,
  },
  {
    key: 'max_yearly_charges',
    label: 'Charges annuelles max',
    labelEn: 'Max Yearly Charges',
    labelEs: 'Cargos anuales máx',
    description: 'Nombre maximum de charges annuelles',
    descriptionEn: 'Maximum number of yearly charges',
    descriptionEs: 'Número máximo de cargos anuales',
    defaultPlan: 'start',
    isLimit: true,
  },
];
