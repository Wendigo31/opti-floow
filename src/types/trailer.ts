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
  type: 'tautliner' | 'frigo' | 'benne' | 'citerne' | 'porte-conteneur' | 'plateau' | 'savoyarde' | 'caisse' | 'other';
  
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

export const trailerTypes = [
  { value: 'tautliner', label: 'Tautliner' },
  { value: 'frigo', label: 'Frigorifique' },
  { value: 'benne', label: 'Benne' },
  { value: 'citerne', label: 'Citerne' },
  { value: 'porte-conteneur', label: 'Porte-conteneur' },
  { value: 'plateau', label: 'Plateau' },
  { value: 'savoyarde', label: 'Savoyarde' },
  { value: 'caisse', label: 'Caisse' },
  { value: 'other', label: 'Autre' },
] as const;

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
