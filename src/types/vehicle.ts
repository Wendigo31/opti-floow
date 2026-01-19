// Vehicle types for the fleet management
export interface VehicleMaintenance {
  id: string;
  type: 'mines' | 'revision' | 'vidange' | 'pneumatiques' | 'freinage' | 'other';
  name: string;
  intervalKm: number; // Kilométrage entre chaque entretien
  lastKm: number; // Dernier kilométrage effectué
  lastDate: string; // Date du dernier entretien
  cost: number; // Coût moyen de l'entretien
  notes?: string;
}

export interface VehicleTire {
  brand: string;
  model: string;
  size: string;
  position: 'avant' | 'arriere' | 'remorque';
  pricePerUnit: number;
  quantity: number;
  durabilityKm: number; // Durée de vie en km
  lastChangeKm: number;
  lastChangeDate: string;
}

export interface Vehicle {
  id: string;
  name: string;
  licensePlate: string;
  brand: string;
  model: string;
  year: number;
  type: 'porteur' | 'tracteur' | 'fourgon' | 'other';
  
  // Dimensions
  length: number; // mètres
  width: number; // mètres
  height: number; // mètres
  weight: number; // kg (PTAC)
  axles: number;
  
  // Consommation
  fuelConsumption: number; // L/100km
  fuelType: 'diesel' | 'b100' | 'gnv' | 'electric';
  adBlueConsumption: number; // L/100km
  
  // Kilométrage
  currentKm: number;
  
  // Coûts
  purchasePrice: number;
  monthlyLeasing: number;
  insuranceCost: number; // Annuel
  sinisterCharge: number; // Charge sinistre annuelle
  
  // Amortissement (optionnel pour compatibilité)
  depreciationYears?: number; // Durée d'amortissement en années (0 = pas d'amortissement)
  residualValue?: number; // Valeur résiduelle en €
  depreciationMethod?: 'linear' | 'degressive' | 'km'; // Méthode d'amortissement
  expectedLifetimeKm?: number; // Durée de vie estimée en km (pour méthode km)
  
  // Entretiens
  maintenances: VehicleMaintenance[];
  
  // Pneus
  tires: VehicleTire[];
  
  // Méta
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  notes?: string;
}

export const defaultVehicle: Omit<Vehicle, 'id' | 'createdAt' | 'updatedAt'> = {
  name: '',
  licensePlate: '',
  brand: '',
  model: '',
  year: new Date().getFullYear(),
  type: 'tracteur',
  length: 16.5,
  width: 2.55,
  height: 4,
  weight: 44000,
  axles: 5,
  fuelConsumption: 32,
  fuelType: 'diesel',
  adBlueConsumption: 1.5,
  currentKm: 0,
  purchasePrice: 0,
  monthlyLeasing: 0,
  insuranceCost: 0,
  sinisterCharge: 0,
  depreciationYears: 5,
  residualValue: 0,
  depreciationMethod: 'linear',
  expectedLifetimeKm: 600000,
  maintenances: [],
  tires: [],
  isActive: true,
  notes: '',
};

export const depreciationMethods = [
  { value: 'linear', label: 'Linéaire', description: 'Amortissement constant chaque année' },
  { value: 'degressive', label: 'Dégressif', description: 'Amortissement plus élevé les premières années' },
  { value: 'km', label: 'Par kilomètre', description: 'Basé sur le kilométrage parcouru' },
] as const;

export const maintenanceTypes = [
  { value: 'mines', label: 'Contrôle technique (MINES)' },
  { value: 'revision', label: 'Révision complète' },
  { value: 'vidange', label: 'Vidange moteur' },
  { value: 'pneumatiques', label: 'Pneumatiques' },
  { value: 'freinage', label: 'Système de freinage' },
  { value: 'other', label: 'Autre' },
] as const;

// Vehicle types - Trailers are now managed separately
export const vehicleTypes = [
  { value: 'tracteur', label: 'Tracteur' },
  { value: 'porteur', label: 'Porteur' },
  { value: 'fourgon', label: 'Fourgon' },
  { value: 'other', label: 'Autre' },
] as const;

export const fuelTypes = [
  { value: 'diesel', label: 'Gazole' },
  { value: 'b100', label: 'Bio-Gazole (B100)' },
  { value: 'gnv', label: 'GNV (Gaz)' },
  { value: 'electric', label: 'Électrique' },
] as const;

export const tirePositions = [
  { value: 'avant', label: 'Essieu avant' },
  { value: 'arriere', label: 'Essieux arrière' },
  { value: 'remorque', label: 'Remorque' },
] as const;

export function generateVehicleId(): string {
  return `veh_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
