import type { ElementType } from 'react';
import {
  BarChart3,
  BriefcaseBusiness,
  Building2,
  Calculator,
  CalendarDays,
  ChartNoAxesCombined,
  FileBarChart,
  Layers,
  MapPinned,
  Navigation,
  Route,
  Sparkles,
  Truck,
  UserCircle,
  Users,
  UsersRound,
} from 'lucide-react';
import type { FeatureKey as LicenseFeatureKey } from '@/hooks/useLicense';
import type { FeatureKey as UserFeatureKey } from '@/hooks/useUserFeatureOverrides';

export interface AppNavigationItem {
  label: string;
  to: string;
  icon: ElementType;
  requiredFeature?: LicenseFeatureKey;
  userFeatureKey?: UserFeatureKey;
  directionOnly?: boolean;
  aliases?: string[];
}

export interface AppNavigationCategory {
  id: 'operations' | 'geolocation' | 'accounting' | 'hr' | 'profitability';
  label: string;
  description: string;
  icon: ElementType;
  items: AppNavigationItem[];
}

export const APP_NAVIGATION: AppNavigationCategory[] = [
  {
    id: 'operations',
    label: 'Exploitation',
    description: 'Organiser les tournées, les ressources et les clients',
    icon: BriefcaseBusiness,
    items: [
      { label: 'Calculateur', to: '/calculator', aliases: ['/history'], icon: Calculator, requiredFeature: 'page_calculator', userFeatureKey: 'page_calculator' },
      { label: 'Itinéraire', to: '/itinerary', icon: Navigation, requiredFeature: 'page_itinerary', userFeatureKey: 'page_itinerary' },
      { label: 'Planning', to: '/planning', icon: CalendarDays },
      { label: 'Tournées', to: '/tours', icon: Route, requiredFeature: 'page_tours', userFeatureKey: 'page_tours' },
      { label: 'Création de ligne', to: '/line-montage', icon: Layers },
      { label: 'Clients', to: '/clients', icon: UserCircle, requiredFeature: 'page_clients', userFeatureKey: 'page_clients' },
      { label: 'Véhicules et remorques', to: '/vehicles', icon: Truck, requiredFeature: 'page_vehicles', userFeatureKey: 'page_vehicles' },
      { label: 'Conducteurs', to: '/drivers', icon: Users, requiredFeature: 'page_drivers', userFeatureKey: 'page_drivers' },
      { label: 'Rapports véhicules', to: '/vehicle-reports', icon: FileBarChart, requiredFeature: 'page_vehicle_reports' },
    ],
  },
  {
    id: 'geolocation',
    label: 'Géoloc',
    description: 'Préparer et optimiser les itinéraires',
    icon: MapPinned,
    items: [
      { label: 'Itinéraire', to: '/itinerary', icon: Navigation, requiredFeature: 'page_itinerary', userFeatureKey: 'page_itinerary' },
      { label: 'Analyse par IA', to: '/ai-analysis', icon: Sparkles, requiredFeature: 'page_ai_analysis' },
    ],
  },
  {
    id: 'accounting',
    label: 'Comptabilité',
    description: 'Consulter les charges fixes existantes',
    icon: Building2,
    items: [
      { label: 'Charges fixes', to: '/charges', icon: Building2, requiredFeature: 'page_charges', userFeatureKey: 'page_charges', directionOnly: true },
    ],
  },
  {
    id: 'hr',
    label: 'RH',
    description: 'Gérer les conducteurs, absences et droits',
    icon: UsersRound,
    items: [
      { label: 'Conducteurs et absences', to: '/drivers', icon: Users, requiredFeature: 'page_drivers', userFeatureKey: 'page_drivers' },
      { label: 'Équipe et droits', to: '/team', icon: UsersRound, requiredFeature: 'page_team' },
    ],
  },
  {
    id: 'profitability',
    label: 'Gestion de rentabilité',
    description: 'Calculer, analyser et prévoir la rentabilité',
    icon: ChartNoAxesCombined,
    items: [
      { label: 'Calculateur et historique', to: '/calculator', aliases: ['/history'], icon: Calculator, requiredFeature: 'page_calculator', userFeatureKey: 'page_calculator' },
      { label: 'Analyse & graphiques', to: '/dashboard', icon: BarChart3, requiredFeature: 'page_dashboard', userFeatureKey: 'page_dashboard' },
      { label: 'Prévisionnel', to: '/forecast', icon: ChartNoAxesCombined, requiredFeature: 'page_forecast', userFeatureKey: 'page_forecast', directionOnly: true },
      { label: 'Rapports véhicules', to: '/vehicle-reports', icon: FileBarChart, requiredFeature: 'page_vehicle_reports' },
    ],
  },
];

export function isNavigationItemActive(item: AppNavigationItem, pathname: string) {
  return item.to === pathname || item.aliases?.includes(pathname) === true;
}

export function getNavigationCategory(pathname: string) {
  return APP_NAVIGATION.find((category) => category.items.some((item) => isNavigationItemActive(item, pathname)));
}