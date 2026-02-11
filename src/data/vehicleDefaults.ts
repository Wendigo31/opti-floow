// Default vehicle specs based on real manufacturer data (2024-2025)
// Sources: DAF, Scania, Iveco, MAN, Mercedes-Benz official specs

export interface VehicleDefaultSpec {
  brand: string;
  models: {
    name: string;
    type: 'tracteur' | 'porteur';
    fuelConsumption: number; // L/100km
    adBlueConsumption: number; // L/100km
    weight: number; // PTAC kg
    axles: number;
    length: number;
    width: number;
    height: number;
    expectedLifetimeKm: number;
    power?: string; // for display
  }[];
}

export const vehicleDefaults: VehicleDefaultSpec[] = [
  {
    brand: 'DAF',
    models: [
      { name: 'XF 480', type: 'tracteur', fuelConsumption: 28.5, adBlueConsumption: 1.2, weight: 44000, axles: 2, length: 6.2, width: 2.55, height: 3.95, expectedLifetimeKm: 1200000, power: '480 ch' },
      { name: 'XG 480', type: 'tracteur', fuelConsumption: 27.8, adBlueConsumption: 1.2, weight: 44000, axles: 2, length: 6.4, width: 2.55, height: 4.0, expectedLifetimeKm: 1200000, power: '480 ch' },
      { name: 'XG+ 530', type: 'tracteur', fuelConsumption: 29.5, adBlueConsumption: 1.4, weight: 44000, axles: 2, length: 6.4, width: 2.55, height: 4.0, expectedLifetimeKm: 1200000, power: '530 ch' },
      { name: 'XD 450', type: 'porteur', fuelConsumption: 26.0, adBlueConsumption: 1.1, weight: 26000, axles: 3, length: 9.5, width: 2.55, height: 3.8, expectedLifetimeKm: 1000000, power: '450 ch' },
      { name: 'LF 260', type: 'porteur', fuelConsumption: 22.0, adBlueConsumption: 0.9, weight: 19000, axles: 2, length: 8.5, width: 2.50, height: 3.5, expectedLifetimeKm: 800000, power: '260 ch' },
    ],
  },
  {
    brand: 'Scania',
    models: [
      { name: 'R 450', type: 'tracteur', fuelConsumption: 28.0, adBlueConsumption: 1.3, weight: 44000, axles: 2, length: 6.1, width: 2.55, height: 3.95, expectedLifetimeKm: 1500000, power: '450 ch' },
      { name: 'R 500 Super', type: 'tracteur', fuelConsumption: 27.5, adBlueConsumption: 1.3, weight: 44000, axles: 2, length: 6.1, width: 2.55, height: 3.95, expectedLifetimeKm: 1500000, power: '500 ch' },
      { name: 'S 530 Super', type: 'tracteur', fuelConsumption: 28.8, adBlueConsumption: 1.4, weight: 44000, axles: 2, length: 6.3, width: 2.55, height: 4.0, expectedLifetimeKm: 1500000, power: '530 ch' },
      { name: 'S 660 V8', type: 'tracteur', fuelConsumption: 33.0, adBlueConsumption: 1.6, weight: 44000, axles: 2, length: 6.3, width: 2.55, height: 4.0, expectedLifetimeKm: 1500000, power: '660 ch' },
      { name: 'P 410', type: 'porteur', fuelConsumption: 25.5, adBlueConsumption: 1.1, weight: 26000, axles: 3, length: 9.0, width: 2.55, height: 3.8, expectedLifetimeKm: 1000000, power: '410 ch' },
    ],
  },
  {
    brand: 'Iveco',
    models: [
      { name: 'S-Way 460', type: 'tracteur', fuelConsumption: 29.0, adBlueConsumption: 1.3, weight: 44000, axles: 2, length: 6.0, width: 2.55, height: 3.95, expectedLifetimeKm: 1100000, power: '460 ch' },
      { name: 'S-Way 490', type: 'tracteur', fuelConsumption: 29.8, adBlueConsumption: 1.4, weight: 44000, axles: 2, length: 6.0, width: 2.55, height: 3.95, expectedLifetimeKm: 1100000, power: '490 ch' },
      { name: 'S-Way 570', type: 'tracteur', fuelConsumption: 31.5, adBlueConsumption: 1.5, weight: 44000, axles: 2, length: 6.0, width: 2.55, height: 3.95, expectedLifetimeKm: 1100000, power: '570 ch' },
      { name: 'Eurocargo 160', type: 'porteur', fuelConsumption: 20.0, adBlueConsumption: 0.8, weight: 16000, axles: 2, length: 8.0, width: 2.50, height: 3.5, expectedLifetimeKm: 800000, power: '160 ch' },
      { name: 'X-Way 480', type: 'porteur', fuelConsumption: 28.0, adBlueConsumption: 1.2, weight: 32000, axles: 4, length: 9.5, width: 2.55, height: 3.8, expectedLifetimeKm: 1000000, power: '480 ch' },
    ],
  },
  {
    brand: 'MAN',
    models: [
      { name: 'TGX 18.470', type: 'tracteur', fuelConsumption: 28.5, adBlueConsumption: 1.3, weight: 44000, axles: 2, length: 6.0, width: 2.55, height: 3.95, expectedLifetimeKm: 1200000, power: '470 ch' },
      { name: 'TGX 18.510', type: 'tracteur', fuelConsumption: 29.5, adBlueConsumption: 1.4, weight: 44000, axles: 2, length: 6.0, width: 2.55, height: 3.95, expectedLifetimeKm: 1200000, power: '510 ch' },
      { name: 'TGX 18.640', type: 'tracteur', fuelConsumption: 33.5, adBlueConsumption: 1.6, weight: 44000, axles: 2, length: 6.2, width: 2.55, height: 4.0, expectedLifetimeKm: 1200000, power: '640 ch' },
      { name: 'TGS 26.430', type: 'porteur', fuelConsumption: 27.0, adBlueConsumption: 1.2, weight: 26000, axles: 3, length: 9.0, width: 2.55, height: 3.8, expectedLifetimeKm: 1000000, power: '430 ch' },
      { name: 'TGM 18.290', type: 'porteur', fuelConsumption: 21.0, adBlueConsumption: 0.9, weight: 18000, axles: 2, length: 8.5, width: 2.50, height: 3.5, expectedLifetimeKm: 800000, power: '290 ch' },
    ],
  },
  {
    brand: 'Mercedes-Benz',
    models: [
      { name: 'Actros 1845', type: 'tracteur', fuelConsumption: 28.0, adBlueConsumption: 1.2, weight: 44000, axles: 2, length: 6.1, width: 2.55, height: 3.95, expectedLifetimeKm: 1300000, power: '450 ch' },
      { name: 'Actros 1848', type: 'tracteur', fuelConsumption: 28.5, adBlueConsumption: 1.3, weight: 44000, axles: 2, length: 6.1, width: 2.55, height: 3.95, expectedLifetimeKm: 1300000, power: '480 ch' },
      { name: 'Actros 1853', type: 'tracteur', fuelConsumption: 30.0, adBlueConsumption: 1.4, weight: 44000, axles: 2, length: 6.1, width: 2.55, height: 3.95, expectedLifetimeKm: 1300000, power: '530 ch' },
      { name: 'Actros L 2553', type: 'tracteur', fuelConsumption: 29.0, adBlueConsumption: 1.3, weight: 44000, axles: 2, length: 6.3, width: 2.55, height: 4.0, expectedLifetimeKm: 1300000, power: '530 ch' },
      { name: 'Atego 1230', type: 'porteur', fuelConsumption: 19.0, adBlueConsumption: 0.7, weight: 12000, axles: 2, length: 7.5, width: 2.50, height: 3.3, expectedLifetimeKm: 700000, power: '231 ch' },
      { name: 'Arocs 3348', type: 'porteur', fuelConsumption: 30.0, adBlueConsumption: 1.3, weight: 33000, axles: 4, length: 9.5, width: 2.55, height: 3.8, expectedLifetimeKm: 1000000, power: '480 ch' },
    ],
  },
  {
    brand: 'Renault Trucks',
    models: [
      { name: 'T 480', type: 'tracteur', fuelConsumption: 29.0, adBlueConsumption: 1.3, weight: 44000, axles: 2, length: 6.0, width: 2.55, height: 3.95, expectedLifetimeKm: 1100000, power: '480 ch' },
      { name: 'T High 520', type: 'tracteur', fuelConsumption: 30.5, adBlueConsumption: 1.4, weight: 44000, axles: 2, length: 6.2, width: 2.55, height: 4.0, expectedLifetimeKm: 1100000, power: '520 ch' },
      { name: 'T Evolution 480', type: 'tracteur', fuelConsumption: 27.5, adBlueConsumption: 1.2, weight: 44000, axles: 2, length: 6.0, width: 2.55, height: 3.95, expectedLifetimeKm: 1200000, power: '480 ch' },
      { name: 'D 280', type: 'porteur', fuelConsumption: 22.0, adBlueConsumption: 0.9, weight: 19000, axles: 2, length: 8.5, width: 2.50, height: 3.5, expectedLifetimeKm: 800000, power: '280 ch' },
      { name: 'C 430', type: 'porteur', fuelConsumption: 28.0, adBlueConsumption: 1.2, weight: 32000, axles: 4, length: 9.5, width: 2.55, height: 3.8, expectedLifetimeKm: 1000000, power: '430 ch' },
    ],
  },
  {
    brand: 'Volvo',
    models: [
      { name: 'FH 460', type: 'tracteur', fuelConsumption: 28.0, adBlueConsumption: 1.2, weight: 44000, axles: 2, length: 6.0, width: 2.55, height: 3.95, expectedLifetimeKm: 1300000, power: '460 ch' },
      { name: 'FH 500', type: 'tracteur', fuelConsumption: 29.0, adBlueConsumption: 1.3, weight: 44000, axles: 2, length: 6.0, width: 2.55, height: 3.95, expectedLifetimeKm: 1300000, power: '500 ch' },
      { name: 'FH16 750', type: 'tracteur', fuelConsumption: 35.0, adBlueConsumption: 1.7, weight: 44000, axles: 2, length: 6.2, width: 2.55, height: 4.0, expectedLifetimeKm: 1300000, power: '750 ch' },
      { name: 'FM 420', type: 'porteur', fuelConsumption: 26.0, adBlueConsumption: 1.1, weight: 26000, axles: 3, length: 9.0, width: 2.55, height: 3.8, expectedLifetimeKm: 1000000, power: '420 ch' },
      { name: 'FL 250', type: 'porteur', fuelConsumption: 20.0, adBlueConsumption: 0.8, weight: 16000, axles: 2, length: 8.0, width: 2.50, height: 3.5, expectedLifetimeKm: 800000, power: '250 ch' },
    ],
  },
];

// Default trailer specs by type and brand
export interface TrailerDefaultSpec {
  brand: string;
  models: {
    name: string;
    type: 'tautliner' | 'frigo' | 'benne' | 'citerne' | 'porte-conteneur' | 'plateau' | 'savoyarde' | 'other';
    length: number;
    width: number;
    height: number; // inner
    weight: number; // PTC
    payload: number;
    axles: number;
    volume: number;
    expectedLifetimeKm: number;
  }[];
}

export const trailerDefaults: TrailerDefaultSpec[] = [
  {
    brand: 'Krone',
    models: [
      { name: 'Profi Liner', type: 'tautliner', length: 13.62, width: 2.48, height: 2.70, weight: 7200, payload: 27300, axles: 3, volume: 91, expectedLifetimeKm: 1200000 },
      { name: 'Cool Liner', type: 'frigo', length: 13.62, width: 2.48, height: 2.60, weight: 8500, payload: 26000, axles: 3, volume: 87, expectedLifetimeKm: 1000000 },
      { name: 'Mega Liner', type: 'tautliner', length: 13.62, width: 2.48, height: 3.00, weight: 7400, payload: 27100, axles: 3, volume: 100, expectedLifetimeKm: 1200000 },
      { name: 'Container Liner', type: 'porte-conteneur', length: 13.62, width: 2.55, height: 2.60, weight: 5200, payload: 29300, axles: 3, volume: 0, expectedLifetimeKm: 1500000 },
    ],
  },
  {
    brand: 'Schmitz Cargobull',
    models: [
      { name: 'S.CS Universal', type: 'tautliner', length: 13.62, width: 2.48, height: 2.70, weight: 7100, payload: 27400, axles: 3, volume: 91, expectedLifetimeKm: 1200000 },
      { name: 'S.KO Cool', type: 'frigo', length: 13.62, width: 2.48, height: 2.60, weight: 8200, payload: 26300, axles: 3, volume: 87, expectedLifetimeKm: 1000000 },
      { name: 'S.KI Tipper', type: 'benne', length: 9.60, width: 2.48, height: 1.80, weight: 6800, payload: 27700, axles: 3, volume: 42, expectedLifetimeKm: 800000 },
      { name: 'S.CF Platform', type: 'plateau', length: 13.62, width: 2.55, height: 0, weight: 5500, payload: 29000, axles: 3, volume: 0, expectedLifetimeKm: 1500000 },
    ],
  },
  {
    brand: 'Lamberet',
    models: [
      { name: 'SR2 SuperBeef', type: 'frigo', length: 13.62, width: 2.48, height: 2.58, weight: 8600, payload: 25900, axles: 3, volume: 86, expectedLifetimeKm: 1000000 },
      { name: 'SR2 Green Liner', type: 'frigo', length: 13.62, width: 2.48, height: 2.60, weight: 8300, payload: 26200, axles: 3, volume: 87, expectedLifetimeKm: 1000000 },
    ],
  },
  {
    brand: 'Fruehauf',
    models: [
      { name: 'Tautliner', type: 'tautliner', length: 13.62, width: 2.48, height: 2.70, weight: 7300, payload: 27200, axles: 3, volume: 91, expectedLifetimeKm: 1100000 },
      { name: 'Savoyarde', type: 'savoyarde', length: 13.62, width: 2.48, height: 2.70, weight: 7100, payload: 27400, axles: 3, volume: 91, expectedLifetimeKm: 1100000 },
      { name: 'Plateau', type: 'plateau', length: 13.62, width: 2.55, height: 0, weight: 5600, payload: 28900, axles: 3, volume: 0, expectedLifetimeKm: 1400000 },
    ],
  },
  {
    brand: 'Chereau',
    models: [
      { name: 'Inogam', type: 'frigo', length: 13.62, width: 2.48, height: 2.60, weight: 8400, payload: 26100, axles: 3, volume: 87, expectedLifetimeKm: 1000000 },
      { name: 'Optigam', type: 'frigo', length: 13.62, width: 2.48, height: 2.55, weight: 8100, payload: 26400, axles: 3, volume: 85, expectedLifetimeKm: 1000000 },
    ],
  },
  {
    brand: 'Benalu',
    models: [
      { name: 'BulkLiner', type: 'benne', length: 10.20, width: 2.48, height: 1.90, weight: 5800, payload: 28700, axles: 3, volume: 48, expectedLifetimeKm: 800000 },
      { name: 'SideLiner', type: 'benne', length: 9.60, width: 2.48, height: 1.70, weight: 5500, payload: 29000, axles: 3, volume: 40, expectedLifetimeKm: 800000 },
    ],
  },
  {
    brand: 'Maisonneuve',
    models: [
      { name: 'Citerne Alimentaire', type: 'citerne', length: 12.50, width: 2.55, height: 3.80, weight: 7500, payload: 27000, axles: 3, volume: 30000, expectedLifetimeKm: 1200000 },
      { name: 'Citerne Chimique', type: 'citerne', length: 12.00, width: 2.55, height: 3.80, weight: 8000, payload: 26500, axles: 3, volume: 25000, expectedLifetimeKm: 1200000 },
    ],
  },
  {
    brand: 'Lecitrailer',
    models: [
      { name: 'Tautliner', type: 'tautliner', length: 13.62, width: 2.48, height: 2.70, weight: 7000, payload: 27500, axles: 3, volume: 91, expectedLifetimeKm: 1100000 },
      { name: 'Mega Tautliner', type: 'tautliner', length: 13.62, width: 2.48, height: 3.00, weight: 7200, payload: 27300, axles: 3, volume: 100, expectedLifetimeKm: 1100000 },
    ],
  },
];

// Get all available vehicle brands
export function getVehicleBrands(): string[] {
  return vehicleDefaults.map(v => v.brand);
}

// Get models for a specific brand
export function getVehicleModels(brand: string) {
  return vehicleDefaults.find(v => v.brand.toLowerCase() === brand.toLowerCase())?.models || [];
}

// Get all available trailer brands
export function getTrailerBrands(): string[] {
  return trailerDefaults.map(t => t.brand);
}

// Get trailer models for a specific brand
export function getTrailerModels(brand: string) {
  return trailerDefaults.find(t => t.brand.toLowerCase() === brand.toLowerCase())?.models || [];
}
