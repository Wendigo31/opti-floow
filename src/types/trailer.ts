// Trailer types for semi-trailers management
export interface TrailerMaintenance {
  id: string;
  type: 'mines' | 'revision' | 'freinage' | 'pneumatiques' | 'other';
  name: string;
  intervalKm: number;
  lastKm: number;
  lastDate: string;
  cost: number;
  notes?: string;
}

export interface TrailerTire {
  brand: string;
  model: string;
  size: string;
  position: 'avant' | 'milieu' | 'arriere';
  pricePerUnit: number;
  quantity: number;
  durabilityKm: number;
  lastChangeKm: number;
  lastChangeDate: string;
}

export interface Trailer {
  id: string;
  name: string;
  licensePlate: string;
  brand: string;
  model: string;
  year: number;
  type: TrailerTypeValue;
  /** Libellé libre quand le type est « Sur mesure / autre » (remorque spéciale). */
  customType?: string;
  
  // Dimensions
  length: number; // mètres
  width: number; // mètres
  height: number; // mètres interne
  weight: number; // kg (PTC)
  payload: number; // kg (charge utile)
  axles: number;
  volume: number; // m³
  
  // Coûts
  purchasePrice: number;
  monthlyLeasing: number;
  insuranceCost: number;
  
  // Amortissement (optionnel pour compatibilité)
  depreciationYears?: number;
  residualValue?: number;
  depreciationMethod?: 'linear' | 'degressive' | 'km';
  expectedLifetimeKm?: number;
  
  // Entretiens
  maintenances: TrailerMaintenance[];
  
  // Pneus
  tires: TrailerTire[];
  
  // Kilométrage
  currentKm: number;
  
  // Méta
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  notes?: string;
}

export const defaultTrailer: Omit<Trailer, 'id' | 'createdAt' | 'updatedAt'> = {
  name: '',
  licensePlate: '',
  brand: '',
  model: '',
  year: new Date().getFullYear(),
  type: 'tautliner',
  length: 13.6,
  width: 2.48,
  height: 2.7,
  weight: 7500,
  payload: 26500,
  axles: 3,
  volume: 90,
  purchasePrice: 0,
  monthlyLeasing: 0,
  insuranceCost: 0,
  depreciationYears: 7,
  residualValue: 0,
  depreciationMethod: 'linear',
  expectedLifetimeKm: 800000,
  maintenances: [],
  tires: [],
  currentKm: 0,
  isActive: true,
  notes: '',
};

export const trailerDepreciationMethods = [
  { value: 'linear', label: 'Linéaire', description: 'Amortissement constant chaque année' },
  { value: 'degressive', label: 'Dégressif', description: 'Amortissement plus élevé les premières années' },
  { value: 'km', label: 'Par kilomètre', description: 'Basé sur le kilométrage parcouru' },
] as const;

// Tous types de remorques et semi-remorques (demande nov. 2026), et « Sur mesure » avec un libellé libre.
export const trailerTypes = [
  { value: 'tautliner', label: 'Tautliner (rideaux coulissants)' },
  { value: 'savoyarde', label: 'Savoyarde' },
  { value: 'fourgon', label: 'Fourgon / caisse sèche' },
  { value: 'caisse', label: 'Caisse mobile' },
  { value: 'frigo', label: 'Frigorifique' },
  { value: 'frigo-multitemp', label: 'Frigorifique multi-température' },
  { value: 'mega', label: 'Méga / volume (3 m)' },
  { value: 'double-plancher', label: 'Double plancher' },
  { value: 'plateau', label: 'Plateau' },
  { value: 'plateau-extensible', label: 'Plateau extensible' },
  { value: 'porte-engins', label: 'Porte-engins / surbaissée' },
  { value: 'porte-voitures', label: 'Porte-voitures' },
  { value: 'porte-conteneur', label: 'Porte-conteneur' },
  { value: 'benne', label: 'Benne' },
  { value: 'benne-tp', label: 'Benne TP / enrochement' },
  { value: 'fond-mouvant', label: 'Fond mouvant' },
  { value: 'citerne', label: 'Citerne' },
  { value: 'citerne-alimentaire', label: 'Citerne alimentaire' },
  { value: 'citerne-adr', label: 'Citerne ADR (matières dangereuses)' },
  { value: 'pulverulent', label: 'Citerne pulvérulent' },
  { value: 'bachee', label: 'Bâchée / ridelles' },
  { value: 'grumiere', label: 'Grumière' },
  { value: 'betaillere', label: 'Bétaillère' },
  { value: 'tombereau', label: 'Tombereau' },
  { value: 'remorque', label: 'Remorque (attelage porteur)' },
  { value: 'other', label: 'Sur mesure / autre' },
] as const;
export type TrailerTypeValue = (typeof trailerTypes)[number]['value'];
/** Libellé à afficher (le libellé libre pour une remorque sur mesure). */
export const trailerTypeLabel = (t: { type?: string; customType?: string }) =>
  (t.type === 'other' && t.customType?.trim()) || trailerTypes.find((x) => x.value === t.type)?.label || 'Remorque';

export const trailerMaintenanceTypes = [
  { value: 'mines', label: 'Contrôle technique (MINES)' },
  { value: 'revision', label: 'Révision complète' },
  { value: 'freinage', label: 'Système de freinage' },
  { value: 'pneumatiques', label: 'Pneumatiques' },
  { value: 'other', label: 'Autre' },
] as const;

export const trailerTirePositions = [
  { value: 'avant', label: 'Essieu avant' },
  { value: 'milieu', label: 'Essieu milieu' },
  { value: 'arriere', label: 'Essieu arrière' },
] as const;

export function generateTrailerId(): string {
  return `trl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
