/**
 * SOURCE UNIQUE de la navigation authentifiée.
 *
 * Regroupe les pages EXISTANTES sous 5 catégories métier (Exploitation, Géoloc,
 * Comptabilité, RH, Gestion de rentabilité). Le lanceur d'accueil, la barre
 * latérale et le menu mobile consomment tous cette même configuration pour
 * rester cohérents.
 *
 * Aucune nouvelle fonctionnalité n'est créée ici : chaque entrée pointe vers
 * une route déjà existante dans src/App.tsx. Les règles d'accès réelles
 * (feature flags d'entreprise, restrictions par utilisateur, accès Direction)
 * sont conservées à l'identique.
 */
import {
  Calculator,
  Navigation,
  Route,
  CalendarDays,
  Layers,
  UserCircle,
  Truck,
  Users,
  UsersRound,
  Building2,
  BarChart3,
  TrendingUp,
  Sparkles,
  FileSpreadsheet,
  Boxes,
  MapPinned,
  History,
  Download,
  Warehouse,
  ShieldCheck,
  Settings as SettingsIcon,
  type LucideIcon,
} from 'lucide-react';
import type { FeatureKey } from '@/hooks/useLicense';
import type { FeatureKey as UserFeatureKey } from '@/hooks/useUserFeatureOverrides';

export type NavCategoryId =
  | 'exploitation'
  | 'geoloc'
  | 'comptabilite'
  | 'rh'
  | 'parc'
  | 'rentabilite';

export interface NavPageConfig {
  to: string;
  icon: LucideIcon;
  label: string;
  /** Feature flag d'entreprise (admin). */
  requiredFeature?: FeatureKey;
  /** Restriction individuelle (par utilisateur). */
  userFeatureKey?: UserFeatureKey;
  /** Visible uniquement par le rôle Direction. */
  directionOnly?: boolean;
}

export interface NavCategoryConfig {
  id: NavCategoryId;
  label: string;
  icon: LucideIcon;
  pages: NavPageConfig[];
}

const P = {
  planning: { to: '/planning', icon: CalendarDays, label: 'Planning' },
  tours: { to: '/tours', icon: Route, label: 'Tournées', requiredFeature: 'page_tours', userFeatureKey: 'page_tours' },
  lineMontage: { to: '/line-montage', icon: Layers, label: 'Création de ligne' },
  clients: { to: '/clients', icon: UserCircle, label: 'Clients', requiredFeature: 'page_clients', userFeatureKey: 'page_clients' },
  vehicles: { to: '/vehicles', icon: Truck, label: 'Véhicules', requiredFeature: 'page_vehicles', userFeatureKey: 'page_vehicles' },
  itinerary: { to: '/itinerary', icon: Navigation, label: 'Itinéraire', requiredFeature: 'page_itinerary', userFeatureKey: 'page_itinerary' },
  aiAnalysis: { to: '/ai-analysis', icon: Sparkles, label: 'Analyse par IA', requiredFeature: 'page_ai_analysis' },
  charges: { to: '/charges', icon: Building2, label: 'Charges fixes', requiredFeature: 'page_charges', directionOnly: true },
  drivers: { to: '/drivers', icon: Users, label: 'Conducteurs', requiredFeature: 'page_drivers', userFeatureKey: 'page_drivers' },
  team: { to: '/team', icon: UsersRound, label: 'Équipe' },
  restrictions: { to: '/my-restrictions', icon: ShieldCheck, label: 'Mes accès' },
  calculator: { to: '/calculator', icon: Calculator, label: 'Calculateur', requiredFeature: 'page_calculator', userFeatureKey: 'page_calculator' },
  dashboard: { to: '/dashboard', icon: BarChart3, label: 'Analyse', requiredFeature: 'page_dashboard', userFeatureKey: 'page_dashboard' },
  forecast: { to: '/forecast', icon: TrendingUp, label: 'Prévisionnel', requiredFeature: 'page_forecast', directionOnly: true },
  vehicleReports: { to: '/vehicle-reports', icon: FileSpreadsheet, label: 'Rapports véhicules', requiredFeature: 'page_vehicle_reports' },
  history: { to: '/history', icon: History, label: 'Historique des trajets', requiredFeature: 'page_calculator', userFeatureKey: 'page_calculator' },
  install: { to: '/install', icon: Download, label: "Installer l'application" },
  settings: { to: '/settings', icon: SettingsIcon, label: 'Paramètres', requiredFeature: 'page_settings' },
} satisfies Record<string, NavPageConfig>;

/** Une même page peut figurer dans plusieurs espaces quand elle sert à plusieurs métiers. */
export const NAV_CATEGORIES: NavCategoryConfig[] = [
  {
    id: 'exploitation', label: 'Exploitation', icon: Boxes,
    pages: [P.planning, P.tours, P.lineMontage, P.itinerary, P.calculator, P.history, P.clients, P.vehicles, P.drivers, P.settings],
  },
  {
    id: 'geoloc', label: 'Géoloc', icon: MapPinned,
    pages: [P.itinerary, P.aiAnalysis, P.tours, P.planning, P.settings],
  },
  {
    id: 'comptabilite', label: 'Comptabilité', icon: Building2,
    pages: [P.charges, P.calculator, P.history, P.dashboard, P.forecast, P.clients, P.settings],
  },
  {
    id: 'rh', label: 'RH', icon: Users,
    pages: [P.drivers, P.team, P.planning, P.restrictions, P.settings],
  },
  {
    id: 'parc', label: 'Gestion de parc', icon: Warehouse,
    pages: [P.vehicles, P.vehicleReports, P.drivers, P.settings, P.install],
  },
  {
    id: 'rentabilite', label: 'Gestion de rentabilité', icon: TrendingUp,
    pages: [P.calculator, P.history, P.dashboard, P.forecast, P.vehicleReports, P.tours, P.charges, P.aiAnalysis, P.settings],
  },
];

interface NavAccessContext {
  hasFeature: (feature: FeatureKey) => boolean;
  canAccessUserFeature: (feature: UserFeatureKey) => boolean;
  isDirection: boolean;
}

/** Vrai si la page doit être visible pour l'utilisateur courant. */
export function canSeeNavPage(page: NavPageConfig, ctx: NavAccessContext): boolean {
  if (page.requiredFeature && !ctx.hasFeature(page.requiredFeature)) return false;
  if (page.userFeatureKey && !ctx.canAccessUserFeature(page.userFeatureKey)) return false;
  if (page.directionOnly && !ctx.isDirection) return false;
  return true;
}

/** Catégories avec uniquement leurs pages visibles ; les catégories vides sont omises. */
export function getVisibleNavCategories(ctx: NavAccessContext): (NavCategoryConfig & { pages: NavPageConfig[] })[] {
  return NAV_CATEGORIES
    .map((category) => ({
      ...category,
      pages: category.pages.filter((page) => canSeeNavPage(page, ctx)),
    }))
    .filter((category) => category.pages.length > 0);
}

/** Alias de routes : une même page peut être joignable par plusieurs chemins. */
const PATH_ALIASES: Record<string, string> = {
  
};

/**
 * Catégorie active pour un chemin donné.
 * - `/espace/:categoryId` → la catégorie de l'espace ouvert.
 * - Route directe d'une page (ex. `/tours`) → la catégorie qui la contient.
 * - Accueil `/` et pages transversales (settings, etc.) → null (pas de barre latérale).
 */
export function getCategoryIdForPath(pathname: string): NavCategoryId | null {
  if (pathname.startsWith('/espace/')) {
    const id = pathname.split('/')[2] as NavCategoryId;
    return NAV_CATEGORIES.some((c) => c.id === id) ? id : null;
  }
  const target = PATH_ALIASES[pathname] ?? pathname;
  const category = NAV_CATEGORIES.find((c) => c.pages.some((p) => p.to === target));
  return category ? category.id : null;
}
