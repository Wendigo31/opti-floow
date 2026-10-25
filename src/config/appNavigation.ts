/**
 * SOURCE UNIQUE de la navigation authentifiée.
 *
 * Regroupe les pages EXISTANTES par catégorie métier. Le lanceur d'accueil, la
 * barre latérale et le menu mobile consomment tous cette même configuration
 * pour rester cohérents.
 *
 * Aucune nouvelle fonctionnalité n'est créée ici : chaque entrée pointe vers
 * une route déjà existante dans src/App.tsx. Les règles d'accès réelles
 * (feature flags d'entreprise, restrictions par utilisateur, accès Direction)
 * sont conservées à l'identique.
 *
 * Ordre des catégories et des pages à l'intérieur de chacune : pensé comme un
 * flux de travail (du plus utilisé/central au plus annexe) —
 * Exploitation (le quotidien) → Géoloc (suivi en temps réel) → Gestion de
 * parc (les véhicules) → RH (les équipes) → Appels d'offres (gagner de
 * nouveaux contrats) → Comptabilité (enregistrer les coûts) → Gestion de
 * rentabilité (analyser la marge, la vue de synthèse).
 *
 * Paramètres (P.settings) n'apparaît dans AUCUN espace : l'écrou en haut à
 * droite de l'app (TopBar.tsx) donne déjà accès à /settings pour tout le
 * monde, un onglet dédié dans la Sidebar serait redondant.
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
  FileText,
  Gavel,
  ShieldCheck,
  Settings as SettingsIcon,
  type LucideIcon,
} from 'lucide-react';
import type { FeatureKey } from '@/hooks/useLicense';
import type { FeatureKey as UserFeatureKey } from '@/hooks/useUserFeatureOverrides';
import type { TeamRole } from '@/types/team';

export type NavCategoryId =
  | 'exploitation'
  | 'geoloc'
  | 'comptabilite'
  | 'rh'
  | 'parc'
  | 'appels-offres'
  | 'rentabilite';

export interface NavPageConfig {
  to: string;
  icon: LucideIcon;
  label: string;
  /** Feature flag d'entreprise (admin). */
  requiredFeature?: FeatureKey;
  /** Restriction individuelle (par utilisateur). */
  userFeatureKey?: UserFeatureKey;
  /** Visible uniquement par ces rôles métier (absent = tous les rôles). */
  allowedRoles?: TeamRole[];
}

export interface NavCategoryConfig {
  id: NavCategoryId;
  label: string;
  icon: LucideIcon;
  pages: NavPageConfig[];
  /** Espace visible uniquement par ces rôles métier (absent = tous les rôles). */
  allowedRoles?: TeamRole[];
}

const P = {
  planning: { to: '/planning', icon: CalendarDays, label: 'Planning' },
  tours: { to: '/tours', icon: Route, label: 'Tournées', requiredFeature: 'page_tours', userFeatureKey: 'page_tours' },
  lineMontage: { to: '/line-montage', icon: Layers, label: 'Création de ligne' },
  clients: { to: '/clients', icon: UserCircle, label: 'Clients', requiredFeature: 'page_clients', userFeatureKey: 'page_clients' },
  vehicles: { to: '/vehicles', icon: Truck, label: 'Véhicules', requiredFeature: 'page_vehicles', userFeatureKey: 'page_vehicles' },
  itinerary: { to: '/itinerary', icon: Navigation, label: 'Itinéraire', requiredFeature: 'page_itinerary', userFeatureKey: 'page_itinerary' },
  aiAnalysis: { to: '/ai-analysis', icon: Sparkles, label: 'Analyse par IA', requiredFeature: 'page_ai_analysis' },
  charges: { to: '/charges', icon: Building2, label: 'Charges fixes', requiredFeature: 'page_charges', allowedRoles: ['direction', 'comptabilite'] },
  drivers: { to: '/drivers', icon: Users, label: 'Conducteurs', requiredFeature: 'page_drivers', userFeatureKey: 'page_drivers' },
  team: { to: '/team', icon: UsersRound, label: 'Équipe', allowedRoles: ['direction', 'rh'] },
  restrictions: { to: '/my-restrictions', icon: ShieldCheck, label: 'Mes accès' },
  calculator: { to: '/calculator', icon: Calculator, label: 'Calculateur', requiredFeature: 'page_calculator', userFeatureKey: 'page_calculator' },
  dashboard: { to: '/dashboard', icon: BarChart3, label: 'Analyse', requiredFeature: 'page_dashboard', userFeatureKey: 'page_dashboard', allowedRoles: ['direction', 'comptabilite'] },
  forecast: { to: '/forecast', icon: TrendingUp, label: 'Prévisionnel', requiredFeature: 'page_forecast', allowedRoles: ['direction', 'comptabilite'] },
  vehicleReports: { to: '/vehicle-reports', icon: FileSpreadsheet, label: 'Rapports véhicules', requiredFeature: 'page_vehicle_reports' },
  history: { to: '/history', icon: History, label: 'Historique des trajets', requiredFeature: 'page_calculator', userFeatureKey: 'page_calculator' },
  install: { to: '/install', icon: Download, label: "Installer l'application" },
  tenders: { to: '/tenders', icon: FileText, label: 'Devis par client' },
  settings: { to: '/settings', icon: SettingsIcon, label: 'Paramètres', requiredFeature: 'page_settings' },
} satisfies Record<string, NavPageConfig>;

/** Une même page peut figurer dans plusieurs espaces quand elle sert à plusieurs métiers. */
export const NAV_CATEGORIES: NavCategoryConfig[] = [
  {
    id: 'exploitation', label: 'Exploitation', icon: Boxes,
    allowedRoles: ['direction', 'exploitation'],
    // Planifier (Planning) → monter une ligne → gérer les tournées → calculer un trajet →
    // consulter l'historique → données de référence (clients/véhicules/conducteurs).
    // Pas d'onglet Paramètres ici : l'écrou en haut à droite de l'app y donne déjà accès.
    pages: [P.planning, P.tours, P.lineMontage, P.itinerary, P.calculator, P.history, P.clients, P.vehicles, P.drivers],
  },
  {
    id: 'geoloc', label: 'Géoloc', icon: MapPinned,
    allowedRoles: ['direction', 'exploitation'],
    // Calculer un itinéraire → l'optimiser par IA → le retrouver dans les tournées.
    // Planning retiré d'ici : réservé à Exploitation / RH / Gestion de parc.
    // Pas d'onglet Paramètres nulle part : l'écrou en haut à droite de l'app y donne déjà accès.
    pages: [P.itinerary, P.aiAnalysis, P.tours],
  },
  {
    id: 'parc', label: 'Gestion de parc', icon: Warehouse,
    allowedRoles: ['direction', 'exploitation'],
    // Le parc de véhicules → planifier leurs missions (sert à terme à repérer les véhicules
    // indisponibles - entretien, accident...) → ses rapports → les conducteurs qui les utilisent → installer l'appli.
    pages: [P.vehicles, P.planning, P.vehicleReports, P.drivers, P.install],
  },
  {
    id: 'rh', label: 'RH', icon: Users,
    allowedRoles: ['direction', 'rh'],
    // Les conducteurs → l'équipe → leur planning → mes propres accès.
    pages: [P.drivers, P.team, P.planning, P.restrictions],
  },
  {
    id: 'appels-offres', label: "Appels d'offres", icon: Gavel,
    allowedRoles: ['direction', 'exploitation'],
    // Le devis (outil principal) → le client → l'itinéraire → le prix → comparaison avec les tournées passées.
    // Planning retiré d'ici : réservé à Exploitation / RH / Gestion de parc.
    pages: [P.tenders, P.clients, P.itinerary, P.calculator, P.tours],
  },
  {
    id: 'comptabilite', label: 'Comptabilité', icon: Building2,
    allowedRoles: ['direction', 'comptabilite'],
    // Les charges fixes (base de coût) → calculer → historiser → analyser → prévoir → clients.
    // Planning retiré d'ici : réservé à Exploitation / RH / Gestion de parc.
    pages: [P.charges, P.calculator, P.history, P.dashboard, P.forecast, P.clients],
  },
  {
    id: 'rentabilite', label: 'Gestion de rentabilité', icon: TrendingUp,
    allowedRoles: ['direction', 'comptabilite'],
    // La vue de synthèse (Analyse) en premier → IA → prévisionnel → données sources qui l'alimentent (tournées, charges, parc).
    // Planning retiré d'ici : réservé à Exploitation / RH / Gestion de parc.
    pages: [P.dashboard, P.aiAnalysis, P.forecast, P.calculator, P.history, P.tours, P.charges, P.vehicleReports],
  },
];

interface NavAccessContext {
  hasFeature: (feature: FeatureKey) => boolean;
  canAccessUserFeature: (feature: UserFeatureKey) => boolean;
  /** Conservé pour compat (quelques écrans ne lisent que ce booléen). */
  isDirection: boolean;
  /** Rôle métier de l'utilisateur courant (direction/exploitation/comptabilite/rh). */
  role?: TeamRole | null;
  /** Onglets désactivés pour la société depuis OptiCentral (chemins). */
  hiddenPaths?: string[];
}

/** Vrai si le rôle courant fait partie de la liste autorisée (absente = tous les rôles). */
function isRoleAllowed(allowedRoles: TeamRole[] | undefined, ctx: NavAccessContext): boolean {
  if (!allowedRoles || allowedRoles.length === 0) return true;
  if (ctx.isDirection) return true; // Direction voit toujours tout.
  return !!ctx.role && allowedRoles.includes(ctx.role);
}

/** Vrai si la page doit être visible pour l'utilisateur courant. */
export function canSeeNavPage(page: NavPageConfig, ctx: NavAccessContext): boolean {
  if (ctx.hiddenPaths?.includes(page.to)) return false;
  if (page.requiredFeature && !ctx.hasFeature(page.requiredFeature)) return false;
  if (page.userFeatureKey && !ctx.canAccessUserFeature(page.userFeatureKey)) return false;
  if (!isRoleAllowed(page.allowedRoles, ctx)) return false;
  return true;
}

/** Vrai si l'espace (catégorie) lui-même est accessible au rôle courant. */
export function canSeeNavCategory(category: NavCategoryConfig, ctx: NavAccessContext): boolean {
  return isRoleAllowed(category.allowedRoles, ctx);
}

/** Catégories accessibles au rôle, avec uniquement leurs pages visibles ; les catégories vides ou non autorisées sont omises. */
export function getVisibleNavCategories(ctx: NavAccessContext): (NavCategoryConfig & { pages: NavPageConfig[] })[] {
  return NAV_CATEGORIES
    .filter((category) => canSeeNavCategory(category, ctx))
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

/** Toutes les pages présentes dans au moins un espace. */
const NAV_PATHS = new Set(NAV_CATEGORIES.flatMap((c) => c.pages.map((p) => p.to)));

/**
 * Vrai si l'utilisateur peut ouvrir ce chemin. Une page de navigation n'est
 * ouverte que si elle est visible dans au moins un de ses espaces (rôle,
 * fonctionnalités, onglets désactivés par l'administrateur) : un lien direct
 * ne contourne donc pas le cloisonnement. Les pages hors espaces (accueil,
 * paramètres, espaces eux-mêmes…) restent ouvertes.
 */
export function canAccessPath(pathname: string, ctx: NavAccessContext): boolean {
  const target = PATH_ALIASES[pathname] ?? pathname;
  if (!NAV_PATHS.has(target)) return true;
  return getVisibleNavCategories(ctx).some((c) => c.pages.some((p) => p.to === target));
}
