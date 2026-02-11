// Drive Profit - Line Optimizer Types
export interface Driver {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  baseSalary: number;
  hourlyRate: number; // Taux horaire brut
  hoursPerDay: number; // Heures travaillées par jour
  patronalCharges: number; // percentage
  mealAllowance: number;
  overnightAllowance: number;
  workingDaysPerMonth: number;
  sundayBonus: number; // Prime dimanche
  nightBonus: number; // Prime nuit
  seniorityBonus: number; // Prime ancienneté
}

export interface FixedCharge {
  id: string;
  name: string;
  amount: number;
  isHT: boolean; // true = HT, false = TTC
  periodicity: 'daily' | 'monthly' | 'yearly';
  category: 'insurance' | 'leasing' | 'administrative' | 'maintenance' | 'other';
}

export interface TripCalculation {
  distance: number;
  tollCost: number;
  tollIsHT: boolean;
  tollClass: 1 | 2 | 3;
  pricingMode: 'km' | 'fixed' | 'auto' | 'hourly' | 'km_stops';
  pricePerKm: number;
  fixedPrice: number;
  targetMargin: number;
  hourlyRate: number; // Pour le mode horaire
  estimatedHours: number; // Pour le mode horaire
  pricePerStop: number; // Pour le mode km + stops
  numberOfStops: number; // Pour le mode km + stops
}

export interface VehicleParams {
  fuelConsumption: number; // L/100km
  fuelPriceHT: number;
  fuelPriceIsHT: boolean;
  adBlueConsumption: number; // L/100km
  adBluePriceHT: number;
  adBluePriceIsHT: boolean;
}

export interface CostBreakdown {
  fuel: number;
  adBlue: number;
  tolls: number;
  driverCost: number;
  driverBonuses: number;
  driverAllowances: number;
  structureCost: number;
  vehicleCost: number;
  trailerCost: number;
  totalCost: number;
  costPerKm: number;
  suggestedPrice: number;
  suggestedPricePerKm: number;
  revenue: number;
  profit: number;
  profitMargin: number;
}

export interface AppSettings {
  workingDaysPerMonth: number;
  workingDaysPerYear: number;
  tomtomApiKey: string;
  companyName: string;
  tvaRate: number; // TVA rate in percentage (default 20)
  defaultDownloadPath: string; // Chemin par défaut pour les téléchargements
}

export interface AppProfile {
  version: string;
  exportDate: string;
  drivers: Driver[];
  charges: FixedCharge[];
  vehicle: VehicleParams;
  trip: TripCalculation;
  settings: AppSettings;
  selectedDriverIds: string[];
}
