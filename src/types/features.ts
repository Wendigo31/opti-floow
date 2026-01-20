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
  
  // Navigation/Pages features - control which pages/tabs are visible
  page_dashboard: boolean;
  page_calculator: boolean;
  page_itinerary: boolean;
  page_tours: boolean;
  page_clients: boolean;
  page_vehicles: boolean;
  page_drivers: boolean;
  page_charges: boolean;
  page_forecast: boolean;
  page_trip_history: boolean;
  page_ai_analysis: boolean;
  page_toxic_clients: boolean;
  page_vehicle_reports: boolean;
  page_team: boolean;
  page_settings: boolean;
  
  // UI Component features - control specific buttons/sections
  btn_export_pdf: boolean;
  btn_export_excel: boolean;
  btn_save_tour: boolean;
  btn_load_tour: boolean;
  btn_ai_optimize: boolean;
  btn_map_preview: boolean;
  btn_contact_support: boolean;
  // Add/Create buttons
  btn_add_client: boolean;
  btn_add_vehicle: boolean;
  btn_add_driver: boolean;
  btn_add_charge: boolean;
  btn_add_trailer: boolean;
  btn_add_trip: boolean;
  btn_add_quote: boolean;
  // Edit/Delete buttons
  btn_edit_client: boolean;
  btn_delete_client: boolean;
  btn_edit_vehicle: boolean;
  btn_delete_vehicle: boolean;
  btn_edit_driver: boolean;
  btn_delete_driver: boolean;
  btn_edit_charge: boolean;
  btn_delete_charge: boolean;
  // Sections
  section_cost_breakdown: boolean;
  section_margin_alerts: boolean;
  section_charts: boolean;
  section_client_stats: boolean;
  section_vehicle_stats: boolean;
  section_driver_stats: boolean;
  
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
    // Navigation/Pages - START: limited pages
    page_dashboard: true,
    page_calculator: true,
    page_itinerary: false,
    page_tours: false,
    page_clients: true,
    page_vehicles: true,
    page_drivers: true,
    page_charges: true,
    page_forecast: false,
    page_trip_history: false,
    page_ai_analysis: false,
    page_toxic_clients: false,
    page_vehicle_reports: false,
    page_team: false,
    page_settings: true,
    // UI Components - START: basic only
    btn_export_pdf: false,
    btn_export_excel: false,
    btn_save_tour: false,
    btn_load_tour: false,
    btn_ai_optimize: false,
    btn_map_preview: true,
    btn_contact_support: true,
    section_cost_breakdown: true,
    section_margin_alerts: false,
    section_charts: false,
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
    // Navigation/Pages - PRO: most pages
    page_dashboard: true,
    page_calculator: true,
    page_itinerary: true,
    page_tours: true,
    page_clients: true,
    page_vehicles: true,
    page_drivers: true,
    page_charges: true,
    page_forecast: true,
    page_trip_history: true,
    page_ai_analysis: false,
    page_toxic_clients: false,
    page_vehicle_reports: true,
    page_team: true,
    page_settings: true,
    // UI Components - PRO: most features
    btn_export_pdf: true,
    btn_export_excel: true,
    btn_save_tour: true,
    btn_load_tour: true,
    btn_ai_optimize: false,
    btn_map_preview: true,
    btn_contact_support: true,
    section_cost_breakdown: true,
    section_margin_alerts: true,
    section_charts: true,
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
    // Navigation/Pages - ENTERPRISE: all pages
    page_dashboard: true,
    page_calculator: true,
    page_itinerary: true,
    page_tours: true,
    page_clients: true,
    page_vehicles: true,
    page_drivers: true,
    page_charges: true,
    page_forecast: true,
    page_trip_history: true,
    page_ai_analysis: true,
    page_toxic_clients: true,
    page_vehicle_reports: true,
    page_team: true,
    page_settings: true,
    // UI Components - ENTERPRISE: all features
    btn_export_pdf: true,
    btn_export_excel: true,
    btn_save_tour: true,
    btn_load_tour: true,
    btn_ai_optimize: true,
    btn_map_preview: true,
    btn_contact_support: true,
    section_cost_breakdown: true,
    section_margin_alerts: true,
    section_charts: true,
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
  {
    name: '📱 Navigation & Pages',
    nameEn: '📱 Navigation & Pages',
    nameEs: '📱 Navegación y Páginas',
    features: [
      {
        key: 'page_dashboard',
        label: 'Page Tableau de bord',
        labelEn: 'Dashboard Page',
        labelEs: 'Página Panel',
        description: 'Accès au tableau de bord',
        descriptionEn: 'Access to dashboard',
        descriptionEs: 'Acceso al panel',
        defaultPlan: 'start',
      },
      {
        key: 'page_calculator',
        label: 'Page Calculateur',
        labelEn: 'Calculator Page',
        labelEs: 'Página Calculadora',
        description: 'Accès au calculateur de trajets',
        descriptionEn: 'Access to trip calculator',
        descriptionEs: 'Acceso a la calculadora',
        defaultPlan: 'start',
      },
      {
        key: 'page_itinerary',
        label: 'Page Itinéraire',
        labelEn: 'Itinerary Page',
        labelEs: 'Página Itinerario',
        description: 'Planification d\'itinéraires',
        descriptionEn: 'Itinerary planning',
        descriptionEs: 'Planificación de itinerarios',
        defaultPlan: 'pro',
      },
      {
        key: 'page_tours',
        label: 'Page Tournées',
        labelEn: 'Tours Page',
        labelEs: 'Página Rutas',
        description: 'Gestion des tournées sauvegardées',
        descriptionEn: 'Saved tours management',
        descriptionEs: 'Gestión de rutas guardadas',
        defaultPlan: 'pro',
      },
      {
        key: 'page_clients',
        label: 'Page Clients',
        labelEn: 'Clients Page',
        labelEs: 'Página Clientes',
        description: 'Gestion des clients',
        descriptionEn: 'Client management',
        descriptionEs: 'Gestión de clientes',
        defaultPlan: 'start',
      },
      {
        key: 'page_vehicles',
        label: 'Page Véhicules',
        labelEn: 'Vehicles Page',
        labelEs: 'Página Vehículos',
        description: 'Gestion de la flotte',
        descriptionEn: 'Fleet management',
        descriptionEs: 'Gestión de flota',
        defaultPlan: 'start',
      },
      {
        key: 'page_drivers',
        label: 'Page Conducteurs',
        labelEn: 'Drivers Page',
        labelEs: 'Página Conductores',
        description: 'Gestion des conducteurs',
        descriptionEn: 'Driver management',
        descriptionEs: 'Gestión de conductores',
        defaultPlan: 'start',
      },
      {
        key: 'page_charges',
        label: 'Page Charges',
        labelEn: 'Charges Page',
        labelEs: 'Página Gastos',
        description: 'Gestion des charges fixes',
        descriptionEn: 'Fixed charges management',
        descriptionEs: 'Gestión de gastos fijos',
        defaultPlan: 'start',
      },
      {
        key: 'page_forecast',
        label: 'Page Prévisionnel',
        labelEn: 'Forecast Page',
        labelEs: 'Página Previsión',
        description: 'Prévisions financières',
        descriptionEn: 'Financial forecasts',
        descriptionEs: 'Previsiones financieras',
        defaultPlan: 'pro',
      },
      {
        key: 'page_trip_history',
        label: 'Page Historique',
        labelEn: 'Trip History Page',
        labelEs: 'Página Historial',
        description: 'Historique des trajets',
        descriptionEn: 'Trip history',
        descriptionEs: 'Historial de viajes',
        defaultPlan: 'pro',
      },
      {
        key: 'page_ai_analysis',
        label: 'Page Analyse IA',
        labelEn: 'AI Analysis Page',
        labelEs: 'Página Análisis IA',
        description: 'Analyse par intelligence artificielle',
        descriptionEn: 'AI-powered analysis',
        descriptionEs: 'Análisis con inteligencia artificial',
        defaultPlan: 'enterprise',
      },
      {
        key: 'page_toxic_clients',
        label: 'Page Clients toxiques',
        labelEn: 'Toxic Clients Page',
        labelEs: 'Página Clientes tóxicos',
        description: 'Analyse des clients non rentables',
        descriptionEn: 'Unprofitable client analysis',
        descriptionEs: 'Análisis de clientes no rentables',
        defaultPlan: 'enterprise',
      },
      {
        key: 'page_vehicle_reports',
        label: 'Page Rapports véhicules',
        labelEn: 'Vehicle Reports Page',
        labelEs: 'Página Informes vehículos',
        description: 'Rapports détaillés par véhicule',
        descriptionEn: 'Detailed vehicle reports',
        descriptionEs: 'Informes detallados por vehículo',
        defaultPlan: 'pro',
      },
      {
        key: 'page_team',
        label: 'Page Équipe',
        labelEn: 'Team Page',
        labelEs: 'Página Equipo',
        description: 'Gestion de l\'équipe',
        descriptionEn: 'Team management',
        descriptionEs: 'Gestión del equipo',
        defaultPlan: 'pro',
      },
      {
        key: 'page_settings',
        label: 'Page Paramètres',
        labelEn: 'Settings Page',
        labelEs: 'Página Ajustes',
        description: 'Configuration de l\'application',
        descriptionEn: 'App configuration',
        descriptionEs: 'Configuración de la aplicación',
        defaultPlan: 'start',
      },
    ],
  },
  {
    name: '🎛️ Boutons Export',
    nameEn: '🎛️ Export Buttons',
    nameEs: '🎛️ Botones de Exportación',
    features: [
      {
        key: 'btn_export_pdf',
        label: 'Bouton Export PDF',
        labelEn: 'PDF Export Button',
        labelEs: 'Botón Exportar PDF',
        description: 'Permet l\'export en PDF',
        descriptionEn: 'Enable PDF export',
        descriptionEs: 'Habilitar exportación PDF',
        defaultPlan: 'pro',
      },
      {
        key: 'btn_export_excel',
        label: 'Bouton Export Excel',
        labelEn: 'Excel Export Button',
        labelEs: 'Botón Exportar Excel',
        description: 'Permet l\'export en Excel',
        descriptionEn: 'Enable Excel export',
        descriptionEs: 'Habilitar exportación Excel',
        defaultPlan: 'pro',
      },
    ],
  },
  {
    name: '➕ Boutons Ajout',
    nameEn: '➕ Add Buttons',
    nameEs: '➕ Botones de Agregar',
    features: [
      {
        key: 'btn_add_client',
        label: 'Ajouter client',
        labelEn: 'Add Client',
        labelEs: 'Agregar cliente',
        description: 'Permet d\'ajouter des clients',
        descriptionEn: 'Enable adding clients',
        descriptionEs: 'Habilitar agregar clientes',
        defaultPlan: 'start',
      },
      {
        key: 'btn_add_vehicle',
        label: 'Ajouter véhicule',
        labelEn: 'Add Vehicle',
        labelEs: 'Agregar vehículo',
        description: 'Permet d\'ajouter des véhicules',
        descriptionEn: 'Enable adding vehicles',
        descriptionEs: 'Habilitar agregar vehículos',
        defaultPlan: 'start',
      },
      {
        key: 'btn_add_driver',
        label: 'Ajouter conducteur',
        labelEn: 'Add Driver',
        labelEs: 'Agregar conductor',
        description: 'Permet d\'ajouter des conducteurs',
        descriptionEn: 'Enable adding drivers',
        descriptionEs: 'Habilitar agregar conductores',
        defaultPlan: 'start',
      },
      {
        key: 'btn_add_charge',
        label: 'Ajouter charge',
        labelEn: 'Add Charge',
        labelEs: 'Agregar gasto',
        description: 'Permet d\'ajouter des charges',
        descriptionEn: 'Enable adding charges',
        descriptionEs: 'Habilitar agregar gastos',
        defaultPlan: 'start',
      },
      {
        key: 'btn_add_trailer',
        label: 'Ajouter remorque',
        labelEn: 'Add Trailer',
        labelEs: 'Agregar remolque',
        description: 'Permet d\'ajouter des remorques',
        descriptionEn: 'Enable adding trailers',
        descriptionEs: 'Habilitar agregar remolques',
        defaultPlan: 'start',
      },
      {
        key: 'btn_add_trip',
        label: 'Ajouter trajet',
        labelEn: 'Add Trip',
        labelEs: 'Agregar viaje',
        description: 'Permet d\'ajouter des trajets',
        descriptionEn: 'Enable adding trips',
        descriptionEs: 'Habilitar agregar viajes',
        defaultPlan: 'pro',
      },
      {
        key: 'btn_add_quote',
        label: 'Ajouter devis',
        labelEn: 'Add Quote',
        labelEs: 'Agregar presupuesto',
        description: 'Permet de créer des devis',
        descriptionEn: 'Enable creating quotes',
        descriptionEs: 'Habilitar crear presupuestos',
        defaultPlan: 'pro',
      },
    ],
  },
  {
    name: '✏️ Boutons Modification',
    nameEn: '✏️ Edit Buttons',
    nameEs: '✏️ Botones de Edición',
    features: [
      {
        key: 'btn_edit_client',
        label: 'Modifier client',
        labelEn: 'Edit Client',
        labelEs: 'Editar cliente',
        description: 'Permet de modifier les clients',
        descriptionEn: 'Enable editing clients',
        descriptionEs: 'Habilitar editar clientes',
        defaultPlan: 'start',
      },
      {
        key: 'btn_edit_vehicle',
        label: 'Modifier véhicule',
        labelEn: 'Edit Vehicle',
        labelEs: 'Editar vehículo',
        description: 'Permet de modifier les véhicules',
        descriptionEn: 'Enable editing vehicles',
        descriptionEs: 'Habilitar editar vehículos',
        defaultPlan: 'start',
      },
      {
        key: 'btn_edit_driver',
        label: 'Modifier conducteur',
        labelEn: 'Edit Driver',
        labelEs: 'Editar conductor',
        description: 'Permet de modifier les conducteurs',
        descriptionEn: 'Enable editing drivers',
        descriptionEs: 'Habilitar editar conductores',
        defaultPlan: 'start',
      },
      {
        key: 'btn_edit_charge',
        label: 'Modifier charge',
        labelEn: 'Edit Charge',
        labelEs: 'Editar gasto',
        description: 'Permet de modifier les charges',
        descriptionEn: 'Enable editing charges',
        descriptionEs: 'Habilitar editar gastos',
        defaultPlan: 'start',
      },
    ],
  },
  {
    name: '🗑️ Boutons Suppression',
    nameEn: '🗑️ Delete Buttons',
    nameEs: '🗑️ Botones de Eliminación',
    features: [
      {
        key: 'btn_delete_client',
        label: 'Supprimer client',
        labelEn: 'Delete Client',
        labelEs: 'Eliminar cliente',
        description: 'Permet de supprimer les clients',
        descriptionEn: 'Enable deleting clients',
        descriptionEs: 'Habilitar eliminar clientes',
        defaultPlan: 'start',
      },
      {
        key: 'btn_delete_vehicle',
        label: 'Supprimer véhicule',
        labelEn: 'Delete Vehicle',
        labelEs: 'Eliminar vehículo',
        description: 'Permet de supprimer les véhicules',
        descriptionEn: 'Enable deleting vehicles',
        descriptionEs: 'Habilitar eliminar vehículos',
        defaultPlan: 'start',
      },
      {
        key: 'btn_delete_driver',
        label: 'Supprimer conducteur',
        labelEn: 'Delete Driver',
        labelEs: 'Eliminar conductor',
        description: 'Permet de supprimer les conducteurs',
        descriptionEn: 'Enable deleting drivers',
        descriptionEs: 'Habilitar eliminar conductores',
        defaultPlan: 'start',
      },
      {
        key: 'btn_delete_charge',
        label: 'Supprimer charge',
        labelEn: 'Delete Charge',
        labelEs: 'Eliminar gasto',
        description: 'Permet de supprimer les charges',
        descriptionEn: 'Enable deleting charges',
        descriptionEs: 'Habilitar eliminar gastos',
        defaultPlan: 'start',
      },
    ],
  },
  {
    name: '🔘 Autres boutons',
    nameEn: '🔘 Other Buttons',
    nameEs: '🔘 Otros Botones',
    features: [
      {
        key: 'btn_save_tour',
        label: 'Sauvegarder tournée',
        labelEn: 'Save Tour',
        labelEs: 'Guardar ruta',
        description: 'Permet de sauvegarder les tournées',
        descriptionEn: 'Enable tour saving',
        descriptionEs: 'Habilitar guardado de rutas',
        defaultPlan: 'pro',
      },
      {
        key: 'btn_load_tour',
        label: 'Charger tournée',
        labelEn: 'Load Tour',
        labelEs: 'Cargar ruta',
        description: 'Permet de charger les tournées',
        descriptionEn: 'Enable tour loading',
        descriptionEs: 'Habilitar carga de rutas',
        defaultPlan: 'pro',
      },
      {
        key: 'btn_ai_optimize',
        label: 'Optimisation IA',
        labelEn: 'AI Optimize',
        labelEs: 'Optimización IA',
        description: 'Active l\'optimisation IA',
        descriptionEn: 'Enable AI optimization',
        descriptionEs: 'Habilitar optimización IA',
        defaultPlan: 'enterprise',
      },
      {
        key: 'btn_map_preview',
        label: 'Aperçu carte',
        labelEn: 'Map Preview',
        labelEs: 'Vista previa del mapa',
        description: 'Affiche l\'aperçu carte',
        descriptionEn: 'Show map preview',
        descriptionEs: 'Mostrar vista previa del mapa',
        defaultPlan: 'start',
      },
      {
        key: 'btn_contact_support',
        label: 'Contact support',
        labelEn: 'Contact Support',
        labelEs: 'Contactar soporte',
        description: 'Permet de contacter le support',
        descriptionEn: 'Enable support contact',
        descriptionEs: 'Habilitar contacto de soporte',
        defaultPlan: 'start',
      },
    ],
  },
  {
    name: '📊 Sections UI',
    nameEn: '📊 UI Sections',
    nameEs: '📊 Secciones UI',
    features: [
      {
        key: 'section_cost_breakdown',
        label: 'Répartition des coûts',
        labelEn: 'Cost Breakdown',
        labelEs: 'Desglose de costos',
        description: 'Affiche la répartition des coûts',
        descriptionEn: 'Show cost breakdown',
        descriptionEs: 'Mostrar desglose de costos',
        defaultPlan: 'start',
      },
      {
        key: 'section_margin_alerts',
        label: 'Alertes marge',
        labelEn: 'Margin Alerts',
        labelEs: 'Alertas de margen',
        description: 'Affiche les alertes de marge',
        descriptionEn: 'Show margin alerts',
        descriptionEs: 'Mostrar alertas de margen',
        defaultPlan: 'pro',
      },
      {
        key: 'section_charts',
        label: 'Graphiques',
        labelEn: 'Charts',
        labelEs: 'Gráficos',
        description: 'Affiche les graphiques',
        descriptionEn: 'Show charts',
        descriptionEs: 'Mostrar gráficos',
        defaultPlan: 'pro',
      },
      {
        key: 'section_client_stats',
        label: 'Statistiques clients',
        labelEn: 'Client Statistics',
        labelEs: 'Estadísticas de clientes',
        description: 'Affiche les statistiques clients',
        descriptionEn: 'Show client statistics',
        descriptionEs: 'Mostrar estadísticas de clientes',
        defaultPlan: 'start',
      },
      {
        key: 'section_vehicle_stats',
        label: 'Statistiques véhicules',
        labelEn: 'Vehicle Statistics',
        labelEs: 'Estadísticas de vehículos',
        description: 'Affiche les statistiques véhicules',
        descriptionEn: 'Show vehicle statistics',
        descriptionEs: 'Mostrar estadísticas de vehículos',
        defaultPlan: 'start',
      },
      {
        key: 'section_driver_stats',
        label: 'Statistiques conducteurs',
        labelEn: 'Driver Statistics',
        labelEs: 'Estadísticas de conductores',
        description: 'Affiche les statistiques conducteurs',
        descriptionEn: 'Show driver statistics',
        descriptionEs: 'Mostrar estadísticas de conductores',
        defaultPlan: 'start',
      },
    ],
  },
  {
    name: '👥 Gestion Société',
    nameEn: '👥 Company Management',
    nameEs: '👥 Gestión de Empresa',
    features: [
      {
        key: 'company_invite_members',
        label: 'Inviter des membres',
        labelEn: 'Invite Members',
        labelEs: 'Invitar miembros',
        description: 'Permet d\'inviter des membres',
        descriptionEn: 'Allow member invitations',
        descriptionEs: 'Permitir invitar miembros',
        defaultPlan: 'pro',
      },
      {
        key: 'company_remove_members',
        label: 'Supprimer des membres',
        labelEn: 'Remove Members',
        labelEs: 'Eliminar miembros',
        description: 'Permet de supprimer des membres',
        descriptionEn: 'Allow member removal',
        descriptionEs: 'Permitir eliminar miembros',
        defaultPlan: 'pro',
      },
      {
        key: 'company_change_roles',
        label: 'Modifier les rôles',
        labelEn: 'Change Roles',
        labelEs: 'Cambiar roles',
        description: 'Permet de modifier les rôles',
        descriptionEn: 'Allow role changes',
        descriptionEs: 'Permitir cambiar roles',
        defaultPlan: 'pro',
      },
      {
        key: 'company_view_activity',
        label: 'Voir l\'activité',
        labelEn: 'View Activity',
        labelEs: 'Ver actividad',
        description: 'Permet de voir l\'activité',
        descriptionEn: 'Allow activity viewing',
        descriptionEs: 'Permitir ver actividad',
        defaultPlan: 'pro',
      },
      {
        key: 'company_manage_settings',
        label: 'Gérer les paramètres',
        labelEn: 'Manage Settings',
        labelEs: 'Gestionar ajustes',
        description: 'Permet de gérer les paramètres',
        descriptionEn: 'Allow settings management',
        descriptionEs: 'Permitir gestionar ajustes',
        defaultPlan: 'pro',
      },
      {
        key: 'company_data_sharing',
        label: 'Partage de données',
        labelEn: 'Data Sharing',
        labelEs: 'Compartir datos',
        description: 'Active le partage de données',
        descriptionEn: 'Enable data sharing',
        descriptionEs: 'Habilitar compartir datos',
        defaultPlan: 'pro',
      },
      {
        key: 'realtime_notifications',
        label: 'Notifications temps réel',
        labelEn: 'Real-time Notifications',
        labelEs: 'Notificaciones en tiempo real',
        description: 'Active les notifications temps réel',
        descriptionEn: 'Enable real-time notifications',
        descriptionEs: 'Habilitar notificaciones en tiempo real',
        defaultPlan: 'pro',
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
