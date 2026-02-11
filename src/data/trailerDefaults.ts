// Default trailer specs based on real manufacturer data
// Sources: Krone, Schmitz Cargobull, Fruehauf, Lamberet, Chereau, Benalu, Wielton

export interface TrailerDefaultSpec {
  brand: string;
  models: {
    name: string;
    type: 'tautliner' | 'frigo' | 'benne' | 'citerne' | 'porte-conteneur' | 'plateau' | 'savoyarde' | 'caisse' | 'other';
    length: number; // mètres
    width: number; // mètres
    height: number; // mètres intérieur
    weight: number; // kg (PTC)
    payload: number; // kg (charge utile)
    axles: number;
    volume: number; // m³
    expectedLifetimeKm: number;
    years?: string;
  }[];
}

export const trailerDefaults: TrailerDefaultSpec[] = [
  {
    brand: 'Krone',
    models: [
      // Tautliner
      { name: 'Profi Liner', type: 'tautliner', length: 13.6, width: 2.48, height: 2.7, weight: 34000, payload: 26500, axles: 3, volume: 90, expectedLifetimeKm: 1200000, years: '2015+' },
      { name: 'Mega Liner', type: 'tautliner', length: 13.6, width: 2.48, height: 3.0, weight: 34000, payload: 26000, axles: 3, volume: 100, expectedLifetimeKm: 1200000, years: '2015+' },
      { name: 'Coil Liner', type: 'tautliner', length: 13.6, width: 2.48, height: 2.7, weight: 34000, payload: 27000, axles: 3, volume: 90, expectedLifetimeKm: 1200000, years: '2018+' },
      // Frigo
      { name: 'Cool Liner', type: 'frigo', length: 13.6, width: 2.48, height: 2.6, weight: 34000, payload: 24500, axles: 3, volume: 85, expectedLifetimeKm: 1000000, years: '2015+' },
      { name: 'Cool Liner Duoplex', type: 'frigo', length: 13.6, width: 2.48, height: 2.6, weight: 34000, payload: 23500, axles: 3, volume: 85, expectedLifetimeKm: 1000000, years: '2018+' },
      // Caisse
      { name: 'Dry Liner', type: 'caisse', length: 13.6, width: 2.48, height: 2.7, weight: 34000, payload: 26000, axles: 3, volume: 90, expectedLifetimeKm: 1200000, years: '2015+' },
      { name: 'Box Liner', type: 'caisse', length: 13.6, width: 2.48, height: 2.7, weight: 34000, payload: 25500, axles: 3, volume: 90, expectedLifetimeKm: 1200000, years: '2018+' },
      // Plateau
      { name: 'Flat Liner', type: 'plateau', length: 13.6, width: 2.48, height: 0, weight: 34000, payload: 28000, axles: 3, volume: 0, expectedLifetimeKm: 1500000, years: '2015+' },
      // Porte-conteneur
      { name: 'Container Carrier', type: 'porte-conteneur', length: 13.6, width: 2.55, height: 0, weight: 34000, payload: 27500, axles: 3, volume: 0, expectedLifetimeKm: 1500000, years: '2015+' },
    ],
  },
  {
    brand: 'Schmitz Cargobull',
    models: [
      // Tautliner
      { name: 'S.CS Tautliner', type: 'tautliner', length: 13.6, width: 2.48, height: 2.7, weight: 34000, payload: 26500, axles: 3, volume: 90, expectedLifetimeKm: 1200000, years: '2015+' },
      { name: 'S.CS Mega', type: 'tautliner', length: 13.6, width: 2.48, height: 3.0, weight: 34000, payload: 26000, axles: 3, volume: 100, expectedLifetimeKm: 1200000, years: '2015+' },
      { name: 'S.CS POWER', type: 'tautliner', length: 13.6, width: 2.48, height: 2.7, weight: 34000, payload: 27000, axles: 3, volume: 90, expectedLifetimeKm: 1300000, years: '2020+' },
      // Frigo
      { name: 'S.KO COOL', type: 'frigo', length: 13.6, width: 2.48, height: 2.6, weight: 34000, payload: 24500, axles: 3, volume: 85, expectedLifetimeKm: 1000000, years: '2015+' },
      { name: 'S.KO COOL SMART', type: 'frigo', length: 13.6, width: 2.48, height: 2.6, weight: 34000, payload: 24000, axles: 3, volume: 85, expectedLifetimeKm: 1000000, years: '2020+' },
      // Caisse
      { name: 'S.BO CARGO', type: 'caisse', length: 13.6, width: 2.48, height: 2.7, weight: 34000, payload: 26000, axles: 3, volume: 90, expectedLifetimeKm: 1200000, years: '2015+' },
      { name: 'S.BO EXPRESS', type: 'caisse', length: 13.6, width: 2.48, height: 2.7, weight: 34000, payload: 25500, axles: 3, volume: 90, expectedLifetimeKm: 1200000, years: '2018+' },
      // Benne
      { name: 'S.KI HEAVY', type: 'benne', length: 10.5, width: 2.48, height: 1.8, weight: 34000, payload: 25000, axles: 3, volume: 46, expectedLifetimeKm: 800000, years: '2015+' },
      { name: 'S.KI LIGHT', type: 'benne', length: 10.5, width: 2.48, height: 1.5, weight: 34000, payload: 26000, axles: 3, volume: 38, expectedLifetimeKm: 900000, years: '2018+' },
      // Citerne
      { name: 'S.TC', type: 'citerne', length: 12.0, width: 2.55, height: 2.5, weight: 34000, payload: 26000, axles: 3, volume: 38, expectedLifetimeKm: 1000000, years: '2015+' },
      // Plateau
      { name: 'S.PL PLATEAU', type: 'plateau', length: 13.6, width: 2.48, height: 0, weight: 34000, payload: 28000, axles: 3, volume: 0, expectedLifetimeKm: 1500000, years: '2015+' },
      // Porte-conteneur
      { name: 'S.CF Container', type: 'porte-conteneur', length: 13.6, width: 2.55, height: 0, weight: 34000, payload: 27500, axles: 3, volume: 0, expectedLifetimeKm: 1500000, years: '2015+' },
    ],
  },
  {
    brand: 'Fruehauf',
    models: [
      { name: 'Tautliner Standard', type: 'tautliner', length: 13.6, width: 2.48, height: 2.7, weight: 34000, payload: 26500, axles: 3, volume: 90, expectedLifetimeKm: 1100000, years: '2015+' },
      { name: 'Tautliner Mega', type: 'tautliner', length: 13.6, width: 2.48, height: 3.0, weight: 34000, payload: 25500, axles: 3, volume: 100, expectedLifetimeKm: 1100000, years: '2015+' },
      { name: 'Fourgon Caisse', type: 'caisse', length: 13.6, width: 2.48, height: 2.7, weight: 34000, payload: 25500, axles: 3, volume: 90, expectedLifetimeKm: 1100000, years: '2015+' },
      { name: 'Benne TP', type: 'benne', length: 10.0, width: 2.48, height: 1.7, weight: 34000, payload: 25000, axles: 3, volume: 42, expectedLifetimeKm: 800000, years: '2015+' },
      { name: 'Plateau Standard', type: 'plateau', length: 13.6, width: 2.48, height: 0, weight: 34000, payload: 28000, axles: 3, volume: 0, expectedLifetimeKm: 1400000, years: '2015+' },
    ],
  },
  {
    brand: 'Lamberet',
    models: [
      { name: 'SR2 HD', type: 'frigo', length: 13.6, width: 2.48, height: 2.6, weight: 34000, payload: 24500, axles: 3, volume: 85, expectedLifetimeKm: 1000000, years: '2015+' },
      { name: 'SR2 Green Liner', type: 'frigo', length: 13.6, width: 2.48, height: 2.6, weight: 34000, payload: 24000, axles: 3, volume: 85, expectedLifetimeKm: 1000000, years: '2020+' },
      { name: 'SR2 Bi-Température', type: 'frigo', length: 13.6, width: 2.48, height: 2.6, weight: 34000, payload: 23500, axles: 3, volume: 80, expectedLifetimeKm: 1000000, years: '2018+' },
    ],
  },
  {
    brand: 'Chereau',
    models: [
      { name: 'Inogam', type: 'frigo', length: 13.6, width: 2.48, height: 2.6, weight: 34000, payload: 24500, axles: 3, volume: 85, expectedLifetimeKm: 1000000, years: '2015+' },
      { name: 'Reefer 2025', type: 'frigo', length: 13.6, width: 2.48, height: 2.6, weight: 34000, payload: 24000, axles: 3, volume: 85, expectedLifetimeKm: 1000000, years: '2020+' },
    ],
  },
  {
    brand: 'Benalu',
    models: [
      { name: 'BulkLiner', type: 'benne', length: 10.2, width: 2.48, height: 1.8, weight: 34000, payload: 27000, axles: 3, volume: 45, expectedLifetimeKm: 900000, years: '2015+' },
      { name: 'MultiRunner', type: 'benne', length: 10.5, width: 2.48, height: 2.0, weight: 34000, payload: 26000, axles: 3, volume: 52, expectedLifetimeKm: 900000, years: '2018+' },
      { name: 'SideLiner', type: 'benne', length: 13.6, width: 2.48, height: 1.5, weight: 34000, payload: 26500, axles: 3, volume: 50, expectedLifetimeKm: 1000000, years: '2015+' },
    ],
  },
  {
    brand: 'Wielton',
    models: [
      { name: 'NS 3 Tautliner', type: 'tautliner', length: 13.6, width: 2.48, height: 2.7, weight: 34000, payload: 26500, axles: 3, volume: 90, expectedLifetimeKm: 1000000, years: '2018+' },
      { name: 'NS 3 Mega', type: 'tautliner', length: 13.6, width: 2.48, height: 3.0, weight: 34000, payload: 25500, axles: 3, volume: 100, expectedLifetimeKm: 1000000, years: '2018+' },
      { name: 'NW 3 Caisse', type: 'caisse', length: 13.6, width: 2.48, height: 2.7, weight: 34000, payload: 25500, axles: 3, volume: 90, expectedLifetimeKm: 1000000, years: '2018+' },
      { name: 'NW 3 Benne', type: 'benne', length: 10.5, width: 2.48, height: 1.8, weight: 34000, payload: 25000, axles: 3, volume: 46, expectedLifetimeKm: 800000, years: '2018+' },
    ],
  },
  {
    brand: 'Lecitrailer',
    models: [
      { name: 'Tautliner Plus', type: 'tautliner', length: 13.6, width: 2.48, height: 2.7, weight: 34000, payload: 26500, axles: 3, volume: 90, expectedLifetimeKm: 1100000, years: '2015+' },
      { name: 'Fourgon Caisse', type: 'caisse', length: 13.6, width: 2.48, height: 2.7, weight: 34000, payload: 25500, axles: 3, volume: 90, expectedLifetimeKm: 1100000, years: '2015+' },
      { name: 'Plateau Alu', type: 'plateau', length: 13.6, width: 2.48, height: 0, weight: 34000, payload: 28500, axles: 3, volume: 0, expectedLifetimeKm: 1400000, years: '2018+' },
    ],
  },
];
