// Default vehicle specs based on real manufacturer data (2015-2025)
// Sources: DAF, Scania, Iveco, MAN, Mercedes-Benz, Renault Trucks, Volvo official specs

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
    years?: string; // model years range
  }[];
}

export const vehicleDefaults: VehicleDefaultSpec[] = [
  {
    brand: 'DAF',
    models: [
      // XF (2015-2021)
      { name: 'XF 410', type: 'tracteur', fuelConsumption: 28.0, adBlueConsumption: 1.1, weight: 44000, axles: 2, length: 6.2, width: 2.55, height: 3.95, expectedLifetimeKm: 1200000, power: '410 ch', years: '2015-2021' },
      { name: 'XF 440', type: 'tracteur', fuelConsumption: 28.5, adBlueConsumption: 1.2, weight: 44000, axles: 2, length: 6.2, width: 2.55, height: 3.95, expectedLifetimeKm: 1200000, power: '440 ch', years: '2015-2021' },
      { name: 'XF 460', type: 'tracteur', fuelConsumption: 29.0, adBlueConsumption: 1.2, weight: 44000, axles: 2, length: 6.2, width: 2.55, height: 3.95, expectedLifetimeKm: 1200000, power: '460 ch', years: '2015-2021' },
      { name: 'XF 480', type: 'tracteur', fuelConsumption: 28.5, adBlueConsumption: 1.2, weight: 44000, axles: 2, length: 6.2, width: 2.55, height: 3.95, expectedLifetimeKm: 1200000, power: '480 ch', years: '2017-2021' },
      { name: 'XF 510', type: 'tracteur', fuelConsumption: 30.0, adBlueConsumption: 1.4, weight: 44000, axles: 2, length: 6.2, width: 2.55, height: 3.95, expectedLifetimeKm: 1200000, power: '510 ch', years: '2015-2021' },
      { name: 'XF 530', type: 'tracteur', fuelConsumption: 31.0, adBlueConsumption: 1.5, weight: 44000, axles: 2, length: 6.2, width: 2.55, height: 3.95, expectedLifetimeKm: 1200000, power: '530 ch', years: '2017-2021' },
      // New Generation XF/XG/XG+ (2021+)
      { name: 'XF 450 (New Gen)', type: 'tracteur', fuelConsumption: 27.5, adBlueConsumption: 1.1, weight: 44000, axles: 2, length: 6.2, width: 2.55, height: 3.95, expectedLifetimeKm: 1200000, power: '450 ch', years: '2021+' },
      { name: 'XF 480 (New Gen)', type: 'tracteur', fuelConsumption: 28.0, adBlueConsumption: 1.2, weight: 44000, axles: 2, length: 6.2, width: 2.55, height: 3.95, expectedLifetimeKm: 1200000, power: '480 ch', years: '2021+' },
      { name: 'XG 450', type: 'tracteur', fuelConsumption: 27.2, adBlueConsumption: 1.1, weight: 44000, axles: 2, length: 6.4, width: 2.55, height: 4.0, expectedLifetimeKm: 1200000, power: '450 ch', years: '2021+' },
      { name: 'XG 480', type: 'tracteur', fuelConsumption: 27.8, adBlueConsumption: 1.2, weight: 44000, axles: 2, length: 6.4, width: 2.55, height: 4.0, expectedLifetimeKm: 1200000, power: '480 ch', years: '2021+' },
      { name: 'XG+ 480', type: 'tracteur', fuelConsumption: 27.5, adBlueConsumption: 1.2, weight: 44000, axles: 2, length: 6.4, width: 2.55, height: 4.0, expectedLifetimeKm: 1200000, power: '480 ch', years: '2021+' },
      { name: 'XG+ 530', type: 'tracteur', fuelConsumption: 29.5, adBlueConsumption: 1.4, weight: 44000, axles: 2, length: 6.4, width: 2.55, height: 4.0, expectedLifetimeKm: 1200000, power: '530 ch', years: '2021+' },
      // XD (porteur)
      { name: 'XD 340', type: 'porteur', fuelConsumption: 24.0, adBlueConsumption: 1.0, weight: 26000, axles: 3, length: 9.5, width: 2.55, height: 3.8, expectedLifetimeKm: 1000000, power: '340 ch', years: '2021+' },
      { name: 'XD 400', type: 'porteur', fuelConsumption: 25.5, adBlueConsumption: 1.1, weight: 26000, axles: 3, length: 9.5, width: 2.55, height: 3.8, expectedLifetimeKm: 1000000, power: '400 ch', years: '2021+' },
      { name: 'XD 450', type: 'porteur', fuelConsumption: 26.0, adBlueConsumption: 1.1, weight: 26000, axles: 3, length: 9.5, width: 2.55, height: 3.8, expectedLifetimeKm: 1000000, power: '450 ch', years: '2021+' },
      // XB/XC (porteur léger/moyen)
      { name: 'XB 230', type: 'porteur', fuelConsumption: 18.0, adBlueConsumption: 0.7, weight: 12000, axles: 2, length: 7.5, width: 2.35, height: 3.3, expectedLifetimeKm: 700000, power: '230 ch', years: '2023+' },
      { name: 'XC 260', type: 'porteur', fuelConsumption: 20.0, adBlueConsumption: 0.8, weight: 16000, axles: 2, length: 8.0, width: 2.50, height: 3.5, expectedLifetimeKm: 800000, power: '260 ch', years: '2023+' },
      // CF (2015-2021)
      { name: 'CF 290', type: 'porteur', fuelConsumption: 22.0, adBlueConsumption: 0.9, weight: 19000, axles: 2, length: 8.5, width: 2.50, height: 3.5, expectedLifetimeKm: 900000, power: '290 ch', years: '2015-2021' },
      { name: 'CF 370', type: 'tracteur', fuelConsumption: 26.5, adBlueConsumption: 1.1, weight: 40000, axles: 2, length: 6.0, width: 2.55, height: 3.85, expectedLifetimeKm: 1100000, power: '370 ch', years: '2015-2021' },
      { name: 'CF 410', type: 'tracteur', fuelConsumption: 27.5, adBlueConsumption: 1.2, weight: 44000, axles: 2, length: 6.0, width: 2.55, height: 3.85, expectedLifetimeKm: 1100000, power: '410 ch', years: '2015-2021' },
      { name: 'CF 450', type: 'tracteur', fuelConsumption: 28.5, adBlueConsumption: 1.2, weight: 44000, axles: 2, length: 6.0, width: 2.55, height: 3.85, expectedLifetimeKm: 1100000, power: '450 ch', years: '2015-2021' },
      // LF
      { name: 'LF 180', type: 'porteur', fuelConsumption: 18.0, adBlueConsumption: 0.7, weight: 12000, axles: 2, length: 7.0, width: 2.35, height: 3.2, expectedLifetimeKm: 700000, power: '180 ch', years: '2015+' },
      { name: 'LF 230', type: 'porteur', fuelConsumption: 19.5, adBlueConsumption: 0.8, weight: 16000, axles: 2, length: 8.0, width: 2.50, height: 3.4, expectedLifetimeKm: 800000, power: '230 ch', years: '2015+' },
      { name: 'LF 260', type: 'porteur', fuelConsumption: 22.0, adBlueConsumption: 0.9, weight: 19000, axles: 2, length: 8.5, width: 2.50, height: 3.5, expectedLifetimeKm: 800000, power: '260 ch', years: '2015+' },
      { name: 'LF 310', type: 'porteur', fuelConsumption: 23.0, adBlueConsumption: 0.9, weight: 19000, axles: 2, length: 8.5, width: 2.50, height: 3.5, expectedLifetimeKm: 800000, power: '310 ch', years: '2015+' },
    ],
  },
  {
    brand: 'Scania',
    models: [
      // R-Series (tracteur)
      { name: 'R 410', type: 'tracteur', fuelConsumption: 28.5, adBlueConsumption: 1.2, weight: 44000, axles: 2, length: 6.1, width: 2.55, height: 3.95, expectedLifetimeKm: 1500000, power: '410 ch', years: '2016+' },
      { name: 'R 450', type: 'tracteur', fuelConsumption: 28.0, adBlueConsumption: 1.3, weight: 44000, axles: 2, length: 6.1, width: 2.55, height: 3.95, expectedLifetimeKm: 1500000, power: '450 ch', years: '2016+' },
      { name: 'R 500', type: 'tracteur', fuelConsumption: 29.0, adBlueConsumption: 1.3, weight: 44000, axles: 2, length: 6.1, width: 2.55, height: 3.95, expectedLifetimeKm: 1500000, power: '500 ch', years: '2016+' },
      { name: 'R 500 Super', type: 'tracteur', fuelConsumption: 27.5, adBlueConsumption: 1.3, weight: 44000, axles: 2, length: 6.1, width: 2.55, height: 3.95, expectedLifetimeKm: 1500000, power: '500 ch', years: '2020+' },
      { name: 'R 540', type: 'tracteur', fuelConsumption: 30.0, adBlueConsumption: 1.4, weight: 44000, axles: 2, length: 6.1, width: 2.55, height: 3.95, expectedLifetimeKm: 1500000, power: '540 ch', years: '2016+' },
      { name: 'R 560', type: 'tracteur', fuelConsumption: 31.0, adBlueConsumption: 1.5, weight: 44000, axles: 2, length: 6.1, width: 2.55, height: 3.95, expectedLifetimeKm: 1500000, power: '560 ch', years: '2022+' },
      // S-Series (tracteur longue distance)
      { name: 'S 450', type: 'tracteur', fuelConsumption: 27.5, adBlueConsumption: 1.2, weight: 44000, axles: 2, length: 6.3, width: 2.55, height: 4.0, expectedLifetimeKm: 1500000, power: '450 ch', years: '2016+' },
      { name: 'S 500', type: 'tracteur', fuelConsumption: 28.5, adBlueConsumption: 1.3, weight: 44000, axles: 2, length: 6.3, width: 2.55, height: 4.0, expectedLifetimeKm: 1500000, power: '500 ch', years: '2016+' },
      { name: 'S 500 Super', type: 'tracteur', fuelConsumption: 27.0, adBlueConsumption: 1.3, weight: 44000, axles: 2, length: 6.3, width: 2.55, height: 4.0, expectedLifetimeKm: 1500000, power: '500 ch', years: '2020+' },
      { name: 'S 530', type: 'tracteur', fuelConsumption: 29.0, adBlueConsumption: 1.4, weight: 44000, axles: 2, length: 6.3, width: 2.55, height: 4.0, expectedLifetimeKm: 1500000, power: '530 ch', years: '2016+' },
      { name: 'S 530 Super', type: 'tracteur', fuelConsumption: 28.8, adBlueConsumption: 1.4, weight: 44000, axles: 2, length: 6.3, width: 2.55, height: 4.0, expectedLifetimeKm: 1500000, power: '530 ch', years: '2020+' },
      { name: 'S 590', type: 'tracteur', fuelConsumption: 31.5, adBlueConsumption: 1.5, weight: 44000, axles: 2, length: 6.3, width: 2.55, height: 4.0, expectedLifetimeKm: 1500000, power: '590 ch', years: '2016+' },
      { name: 'S 660 V8', type: 'tracteur', fuelConsumption: 33.0, adBlueConsumption: 1.6, weight: 44000, axles: 2, length: 6.3, width: 2.55, height: 4.0, expectedLifetimeKm: 1500000, power: '660 ch', years: '2020+' },
      { name: 'S 770 V8', type: 'tracteur', fuelConsumption: 35.0, adBlueConsumption: 1.8, weight: 44000, axles: 2, length: 6.3, width: 2.55, height: 4.0, expectedLifetimeKm: 1500000, power: '770 ch', years: '2020+' },
      // G-Series (tracteur polyvalent)
      { name: 'G 370', type: 'tracteur', fuelConsumption: 27.0, adBlueConsumption: 1.1, weight: 40000, axles: 2, length: 6.0, width: 2.55, height: 3.85, expectedLifetimeKm: 1300000, power: '370 ch', years: '2016+' },
      { name: 'G 410', type: 'tracteur', fuelConsumption: 28.0, adBlueConsumption: 1.2, weight: 44000, axles: 2, length: 6.0, width: 2.55, height: 3.85, expectedLifetimeKm: 1300000, power: '410 ch', years: '2016+' },
      { name: 'G 450', type: 'tracteur', fuelConsumption: 28.5, adBlueConsumption: 1.2, weight: 44000, axles: 2, length: 6.0, width: 2.55, height: 3.85, expectedLifetimeKm: 1300000, power: '450 ch', years: '2016+' },
      { name: 'G 500', type: 'tracteur', fuelConsumption: 29.5, adBlueConsumption: 1.3, weight: 44000, axles: 2, length: 6.0, width: 2.55, height: 3.85, expectedLifetimeKm: 1300000, power: '500 ch', years: '2016+' },
      // P-Series (porteur)
      { name: 'P 280', type: 'porteur', fuelConsumption: 22.0, adBlueConsumption: 0.9, weight: 19000, axles: 2, length: 8.5, width: 2.50, height: 3.5, expectedLifetimeKm: 1000000, power: '280 ch', years: '2016+' },
      { name: 'P 320', type: 'porteur', fuelConsumption: 23.5, adBlueConsumption: 1.0, weight: 19000, axles: 2, length: 8.5, width: 2.50, height: 3.5, expectedLifetimeKm: 1000000, power: '320 ch', years: '2016+' },
      { name: 'P 360', type: 'porteur', fuelConsumption: 24.5, adBlueConsumption: 1.0, weight: 26000, axles: 3, length: 9.0, width: 2.55, height: 3.8, expectedLifetimeKm: 1000000, power: '360 ch', years: '2016+' },
      { name: 'P 410', type: 'porteur', fuelConsumption: 25.5, adBlueConsumption: 1.1, weight: 26000, axles: 3, length: 9.0, width: 2.55, height: 3.8, expectedLifetimeKm: 1000000, power: '410 ch', years: '2016+' },
      { name: 'P 450', type: 'porteur', fuelConsumption: 26.5, adBlueConsumption: 1.2, weight: 26000, axles: 3, length: 9.0, width: 2.55, height: 3.8, expectedLifetimeKm: 1000000, power: '450 ch', years: '2016+' },
      // L-Series (distribution urbaine)
      { name: 'L 280', type: 'porteur', fuelConsumption: 20.0, adBlueConsumption: 0.8, weight: 18000, axles: 2, length: 8.0, width: 2.50, height: 3.4, expectedLifetimeKm: 800000, power: '280 ch', years: '2018+' },
      { name: 'L 320', type: 'porteur', fuelConsumption: 21.0, adBlueConsumption: 0.9, weight: 18000, axles: 2, length: 8.0, width: 2.50, height: 3.4, expectedLifetimeKm: 800000, power: '320 ch', years: '2018+' },
    ],
  },
  {
    brand: 'Iveco',
    models: [
      // Stralis (2015-2019)
      { name: 'Stralis 400', type: 'tracteur', fuelConsumption: 30.0, adBlueConsumption: 1.3, weight: 44000, axles: 2, length: 6.0, width: 2.55, height: 3.95, expectedLifetimeKm: 1000000, power: '400 ch', years: '2015-2019' },
      { name: 'Stralis 420', type: 'tracteur', fuelConsumption: 30.5, adBlueConsumption: 1.3, weight: 44000, axles: 2, length: 6.0, width: 2.55, height: 3.95, expectedLifetimeKm: 1000000, power: '420 ch', years: '2015-2019' },
      { name: 'Stralis 460', type: 'tracteur', fuelConsumption: 31.0, adBlueConsumption: 1.4, weight: 44000, axles: 2, length: 6.0, width: 2.55, height: 3.95, expectedLifetimeKm: 1000000, power: '460 ch', years: '2015-2019' },
      { name: 'Stralis 480', type: 'tracteur', fuelConsumption: 31.5, adBlueConsumption: 1.4, weight: 44000, axles: 2, length: 6.0, width: 2.55, height: 3.95, expectedLifetimeKm: 1000000, power: '480 ch', years: '2015-2019' },
      { name: 'Stralis 510', type: 'tracteur', fuelConsumption: 32.0, adBlueConsumption: 1.5, weight: 44000, axles: 2, length: 6.0, width: 2.55, height: 3.95, expectedLifetimeKm: 1000000, power: '510 ch', years: '2015-2019' },
      { name: 'Stralis 570', type: 'tracteur', fuelConsumption: 33.5, adBlueConsumption: 1.6, weight: 44000, axles: 2, length: 6.0, width: 2.55, height: 3.95, expectedLifetimeKm: 1000000, power: '570 ch', years: '2015-2019' },
      // S-Way (2019+)
      { name: 'S-Way 400', type: 'tracteur', fuelConsumption: 28.5, adBlueConsumption: 1.2, weight: 44000, axles: 2, length: 6.0, width: 2.55, height: 3.95, expectedLifetimeKm: 1100000, power: '400 ch', years: '2019+' },
      { name: 'S-Way 420', type: 'tracteur', fuelConsumption: 28.8, adBlueConsumption: 1.2, weight: 44000, axles: 2, length: 6.0, width: 2.55, height: 3.95, expectedLifetimeKm: 1100000, power: '420 ch', years: '2019+' },
      { name: 'S-Way 460', type: 'tracteur', fuelConsumption: 29.0, adBlueConsumption: 1.3, weight: 44000, axles: 2, length: 6.0, width: 2.55, height: 3.95, expectedLifetimeKm: 1100000, power: '460 ch', years: '2019+' },
      { name: 'S-Way 490', type: 'tracteur', fuelConsumption: 29.8, adBlueConsumption: 1.4, weight: 44000, axles: 2, length: 6.0, width: 2.55, height: 3.95, expectedLifetimeKm: 1100000, power: '490 ch', years: '2019+' },
      { name: 'S-Way 510', type: 'tracteur', fuelConsumption: 30.5, adBlueConsumption: 1.4, weight: 44000, axles: 2, length: 6.0, width: 2.55, height: 3.95, expectedLifetimeKm: 1100000, power: '510 ch', years: '2019+' },
      { name: 'S-Way 570', type: 'tracteur', fuelConsumption: 31.5, adBlueConsumption: 1.5, weight: 44000, axles: 2, length: 6.0, width: 2.55, height: 3.95, expectedLifetimeKm: 1100000, power: '570 ch', years: '2019+' },
      // X-Way (porteur chantier)
      { name: 'X-Way 400', type: 'porteur', fuelConsumption: 27.0, adBlueConsumption: 1.2, weight: 32000, axles: 4, length: 9.5, width: 2.55, height: 3.8, expectedLifetimeKm: 1000000, power: '400 ch', years: '2019+' },
      { name: 'X-Way 450', type: 'porteur', fuelConsumption: 27.5, adBlueConsumption: 1.2, weight: 32000, axles: 4, length: 9.5, width: 2.55, height: 3.8, expectedLifetimeKm: 1000000, power: '450 ch', years: '2019+' },
      { name: 'X-Way 480', type: 'porteur', fuelConsumption: 28.0, adBlueConsumption: 1.2, weight: 32000, axles: 4, length: 9.5, width: 2.55, height: 3.8, expectedLifetimeKm: 1000000, power: '480 ch', years: '2019+' },
      // T-Way (chantier)
      { name: 'T-Way 430', type: 'porteur', fuelConsumption: 29.0, adBlueConsumption: 1.3, weight: 41000, axles: 4, length: 9.5, width: 2.55, height: 3.8, expectedLifetimeKm: 900000, power: '430 ch', years: '2019+' },
      { name: 'T-Way 480', type: 'porteur', fuelConsumption: 30.0, adBlueConsumption: 1.4, weight: 41000, axles: 4, length: 9.5, width: 2.55, height: 3.8, expectedLifetimeKm: 900000, power: '480 ch', years: '2019+' },
      { name: 'T-Way 510', type: 'porteur', fuelConsumption: 31.0, adBlueConsumption: 1.5, weight: 41000, axles: 4, length: 9.5, width: 2.55, height: 3.8, expectedLifetimeKm: 900000, power: '510 ch', years: '2019+' },
      // Eurocargo
      { name: 'Eurocargo 120', type: 'porteur', fuelConsumption: 17.0, adBlueConsumption: 0.7, weight: 12000, axles: 2, length: 7.0, width: 2.35, height: 3.2, expectedLifetimeKm: 700000, power: '120 ch', years: '2015+' },
      { name: 'Eurocargo 160', type: 'porteur', fuelConsumption: 20.0, adBlueConsumption: 0.8, weight: 16000, axles: 2, length: 8.0, width: 2.50, height: 3.5, expectedLifetimeKm: 800000, power: '160 ch', years: '2015+' },
      { name: 'Eurocargo 190', type: 'porteur', fuelConsumption: 21.0, adBlueConsumption: 0.8, weight: 18000, axles: 2, length: 8.5, width: 2.50, height: 3.5, expectedLifetimeKm: 800000, power: '190 ch', years: '2015+' },
      { name: 'Eurocargo 220', type: 'porteur', fuelConsumption: 22.0, adBlueConsumption: 0.9, weight: 18000, axles: 2, length: 8.5, width: 2.50, height: 3.5, expectedLifetimeKm: 800000, power: '220 ch', years: '2015+' },
      { name: 'Eurocargo 280', type: 'porteur', fuelConsumption: 23.0, adBlueConsumption: 0.9, weight: 18000, axles: 2, length: 8.5, width: 2.50, height: 3.5, expectedLifetimeKm: 800000, power: '280 ch', years: '2019+' },
      // Daily (utilitaire/porteur léger)
      { name: 'Daily 160', type: 'porteur', fuelConsumption: 14.0, adBlueConsumption: 0.5, weight: 7000, axles: 2, length: 6.5, width: 2.20, height: 3.0, expectedLifetimeKm: 500000, power: '160 ch', years: '2015+' },
      { name: 'Daily 210', type: 'porteur', fuelConsumption: 15.0, adBlueConsumption: 0.6, weight: 7200, axles: 2, length: 6.5, width: 2.20, height: 3.0, expectedLifetimeKm: 500000, power: '210 ch', years: '2019+' },
    ],
  },
  {
    brand: 'MAN',
    models: [
      // TGX (2015-2020, ancienne génération)
      { name: 'TGX 18.400', type: 'tracteur', fuelConsumption: 29.0, adBlueConsumption: 1.2, weight: 44000, axles: 2, length: 6.0, width: 2.55, height: 3.95, expectedLifetimeKm: 1200000, power: '400 ch', years: '2015-2020' },
      { name: 'TGX 18.440', type: 'tracteur', fuelConsumption: 29.5, adBlueConsumption: 1.3, weight: 44000, axles: 2, length: 6.0, width: 2.55, height: 3.95, expectedLifetimeKm: 1200000, power: '440 ch', years: '2015-2020' },
      { name: 'TGX 18.460', type: 'tracteur', fuelConsumption: 30.0, adBlueConsumption: 1.3, weight: 44000, axles: 2, length: 6.0, width: 2.55, height: 3.95, expectedLifetimeKm: 1200000, power: '460 ch', years: '2015-2020' },
      { name: 'TGX 18.480', type: 'tracteur', fuelConsumption: 30.5, adBlueConsumption: 1.4, weight: 44000, axles: 2, length: 6.0, width: 2.55, height: 3.95, expectedLifetimeKm: 1200000, power: '480 ch', years: '2015-2020' },
      { name: 'TGX 18.500', type: 'tracteur', fuelConsumption: 31.0, adBlueConsumption: 1.4, weight: 44000, axles: 2, length: 6.0, width: 2.55, height: 3.95, expectedLifetimeKm: 1200000, power: '500 ch', years: '2015-2020' },
      { name: 'TGX 18.560', type: 'tracteur', fuelConsumption: 32.0, adBlueConsumption: 1.5, weight: 44000, axles: 2, length: 6.0, width: 2.55, height: 3.95, expectedLifetimeKm: 1200000, power: '560 ch', years: '2015-2020' },
      { name: 'TGX 18.640', type: 'tracteur', fuelConsumption: 33.5, adBlueConsumption: 1.6, weight: 44000, axles: 2, length: 6.2, width: 2.55, height: 4.0, expectedLifetimeKm: 1200000, power: '640 ch', years: '2015-2020' },
      // New TGX (2020+)
      { name: 'TGX 18.430 (New)', type: 'tracteur', fuelConsumption: 27.5, adBlueConsumption: 1.2, weight: 44000, axles: 2, length: 6.0, width: 2.55, height: 3.95, expectedLifetimeKm: 1200000, power: '430 ch', years: '2020+' },
      { name: 'TGX 18.470 (New)', type: 'tracteur', fuelConsumption: 28.5, adBlueConsumption: 1.3, weight: 44000, axles: 2, length: 6.0, width: 2.55, height: 3.95, expectedLifetimeKm: 1200000, power: '470 ch', years: '2020+' },
      { name: 'TGX 18.510 (New)', type: 'tracteur', fuelConsumption: 29.5, adBlueConsumption: 1.4, weight: 44000, axles: 2, length: 6.0, width: 2.55, height: 3.95, expectedLifetimeKm: 1200000, power: '510 ch', years: '2020+' },
      { name: 'TGX 18.540 (New)', type: 'tracteur', fuelConsumption: 30.5, adBlueConsumption: 1.5, weight: 44000, axles: 2, length: 6.0, width: 2.55, height: 3.95, expectedLifetimeKm: 1200000, power: '540 ch', years: '2022+' },
      { name: 'TGX 18.640 (New)', type: 'tracteur', fuelConsumption: 33.5, adBlueConsumption: 1.6, weight: 44000, axles: 2, length: 6.2, width: 2.55, height: 4.0, expectedLifetimeKm: 1200000, power: '640 ch', years: '2020+' },
      // TGS (porteur / tracteur chantier)
      { name: 'TGS 18.400', type: 'tracteur', fuelConsumption: 28.0, adBlueConsumption: 1.2, weight: 40000, axles: 2, length: 6.0, width: 2.55, height: 3.85, expectedLifetimeKm: 1000000, power: '400 ch', years: '2015+' },
      { name: 'TGS 18.430', type: 'tracteur', fuelConsumption: 28.5, adBlueConsumption: 1.2, weight: 40000, axles: 2, length: 6.0, width: 2.55, height: 3.85, expectedLifetimeKm: 1000000, power: '430 ch', years: '2020+' },
      { name: 'TGS 18.470', type: 'tracteur', fuelConsumption: 29.5, adBlueConsumption: 1.3, weight: 44000, axles: 2, length: 6.0, width: 2.55, height: 3.85, expectedLifetimeKm: 1000000, power: '470 ch', years: '2020+' },
      { name: 'TGS 26.400', type: 'porteur', fuelConsumption: 26.0, adBlueConsumption: 1.1, weight: 26000, axles: 3, length: 9.0, width: 2.55, height: 3.8, expectedLifetimeKm: 1000000, power: '400 ch', years: '2015+' },
      { name: 'TGS 26.430', type: 'porteur', fuelConsumption: 27.0, adBlueConsumption: 1.2, weight: 26000, axles: 3, length: 9.0, width: 2.55, height: 3.8, expectedLifetimeKm: 1000000, power: '430 ch', years: '2015+' },
      { name: 'TGS 26.470', type: 'porteur', fuelConsumption: 28.0, adBlueConsumption: 1.3, weight: 26000, axles: 3, length: 9.0, width: 2.55, height: 3.8, expectedLifetimeKm: 1000000, power: '470 ch', years: '2020+' },
      { name: 'TGS 33.430', type: 'porteur', fuelConsumption: 28.5, adBlueConsumption: 1.3, weight: 33000, axles: 4, length: 9.5, width: 2.55, height: 3.8, expectedLifetimeKm: 1000000, power: '430 ch', years: '2020+' },
      // TGM (porteur moyen)
      { name: 'TGM 15.250', type: 'porteur', fuelConsumption: 19.0, adBlueConsumption: 0.8, weight: 15000, axles: 2, length: 8.0, width: 2.50, height: 3.4, expectedLifetimeKm: 800000, power: '250 ch', years: '2015+' },
      { name: 'TGM 18.290', type: 'porteur', fuelConsumption: 21.0, adBlueConsumption: 0.9, weight: 18000, axles: 2, length: 8.5, width: 2.50, height: 3.5, expectedLifetimeKm: 800000, power: '290 ch', years: '2015+' },
      { name: 'TGM 18.320', type: 'porteur', fuelConsumption: 22.0, adBlueConsumption: 0.9, weight: 18000, axles: 2, length: 8.5, width: 2.50, height: 3.5, expectedLifetimeKm: 800000, power: '320 ch', years: '2020+' },
      { name: 'TGM 18.340', type: 'porteur', fuelConsumption: 22.5, adBlueConsumption: 0.9, weight: 18000, axles: 2, length: 8.5, width: 2.50, height: 3.5, expectedLifetimeKm: 800000, power: '340 ch', years: '2022+' },
      { name: 'TGM 26.320', type: 'porteur', fuelConsumption: 24.0, adBlueConsumption: 1.0, weight: 26000, axles: 3, length: 9.0, width: 2.55, height: 3.5, expectedLifetimeKm: 800000, power: '320 ch', years: '2020+' },
      // TGL (porteur léger)
      { name: 'TGL 8.190', type: 'porteur', fuelConsumption: 16.0, adBlueConsumption: 0.6, weight: 8000, axles: 2, length: 6.5, width: 2.35, height: 3.1, expectedLifetimeKm: 600000, power: '190 ch', years: '2015+' },
      { name: 'TGL 10.220', type: 'porteur', fuelConsumption: 17.5, adBlueConsumption: 0.7, weight: 10000, axles: 2, length: 7.0, width: 2.35, height: 3.2, expectedLifetimeKm: 600000, power: '220 ch', years: '2015+' },
      { name: 'TGL 12.250', type: 'porteur', fuelConsumption: 18.5, adBlueConsumption: 0.7, weight: 12000, axles: 2, length: 7.5, width: 2.50, height: 3.3, expectedLifetimeKm: 700000, power: '250 ch', years: '2015+' },
    ],
  },
  {
    brand: 'Mercedes-Benz',
    models: [
      // Actros MP4 (2015-2019)
      { name: 'Actros 1840 (MP4)', type: 'tracteur', fuelConsumption: 29.0, adBlueConsumption: 1.2, weight: 44000, axles: 2, length: 6.1, width: 2.55, height: 3.95, expectedLifetimeKm: 1300000, power: '400 ch', years: '2015-2019' },
      { name: 'Actros 1842 (MP4)', type: 'tracteur', fuelConsumption: 29.5, adBlueConsumption: 1.2, weight: 44000, axles: 2, length: 6.1, width: 2.55, height: 3.95, expectedLifetimeKm: 1300000, power: '420 ch', years: '2015-2019' },
      { name: 'Actros 1845 (MP4)', type: 'tracteur', fuelConsumption: 29.5, adBlueConsumption: 1.3, weight: 44000, axles: 2, length: 6.1, width: 2.55, height: 3.95, expectedLifetimeKm: 1300000, power: '450 ch', years: '2015-2019' },
      { name: 'Actros 1848 (MP4)', type: 'tracteur', fuelConsumption: 30.5, adBlueConsumption: 1.3, weight: 44000, axles: 2, length: 6.1, width: 2.55, height: 3.95, expectedLifetimeKm: 1300000, power: '480 ch', years: '2015-2019' },
      { name: 'Actros 1851 (MP4)', type: 'tracteur', fuelConsumption: 31.0, adBlueConsumption: 1.4, weight: 44000, axles: 2, length: 6.1, width: 2.55, height: 3.95, expectedLifetimeKm: 1300000, power: '510 ch', years: '2015-2019' },
      // Actros MP5 (2019+)
      { name: 'Actros 1843', type: 'tracteur', fuelConsumption: 27.5, adBlueConsumption: 1.2, weight: 44000, axles: 2, length: 6.1, width: 2.55, height: 3.95, expectedLifetimeKm: 1300000, power: '430 ch', years: '2019+' },
      { name: 'Actros 1845', type: 'tracteur', fuelConsumption: 28.0, adBlueConsumption: 1.2, weight: 44000, axles: 2, length: 6.1, width: 2.55, height: 3.95, expectedLifetimeKm: 1300000, power: '450 ch', years: '2019+' },
      { name: 'Actros 1848', type: 'tracteur', fuelConsumption: 28.5, adBlueConsumption: 1.3, weight: 44000, axles: 2, length: 6.1, width: 2.55, height: 3.95, expectedLifetimeKm: 1300000, power: '480 ch', years: '2019+' },
      { name: 'Actros 1851', type: 'tracteur', fuelConsumption: 29.5, adBlueConsumption: 1.4, weight: 44000, axles: 2, length: 6.1, width: 2.55, height: 3.95, expectedLifetimeKm: 1300000, power: '510 ch', years: '2019+' },
      { name: 'Actros 1853', type: 'tracteur', fuelConsumption: 30.0, adBlueConsumption: 1.4, weight: 44000, axles: 2, length: 6.1, width: 2.55, height: 3.95, expectedLifetimeKm: 1300000, power: '530 ch', years: '2019+' },
      // Actros L (2021+)
      { name: 'Actros L 2545', type: 'tracteur', fuelConsumption: 27.5, adBlueConsumption: 1.2, weight: 44000, axles: 2, length: 6.3, width: 2.55, height: 4.0, expectedLifetimeKm: 1300000, power: '450 ch', years: '2021+' },
      { name: 'Actros L 2548', type: 'tracteur', fuelConsumption: 28.0, adBlueConsumption: 1.3, weight: 44000, axles: 2, length: 6.3, width: 2.55, height: 4.0, expectedLifetimeKm: 1300000, power: '480 ch', years: '2021+' },
      { name: 'Actros L 2551', type: 'tracteur', fuelConsumption: 29.0, adBlueConsumption: 1.3, weight: 44000, axles: 2, length: 6.3, width: 2.55, height: 4.0, expectedLifetimeKm: 1300000, power: '510 ch', years: '2021+' },
      { name: 'Actros L 2553', type: 'tracteur', fuelConsumption: 29.0, adBlueConsumption: 1.3, weight: 44000, axles: 2, length: 6.3, width: 2.55, height: 4.0, expectedLifetimeKm: 1300000, power: '530 ch', years: '2021+' },
      // Arocs (chantier)
      { name: 'Arocs 1843', type: 'tracteur', fuelConsumption: 29.0, adBlueConsumption: 1.3, weight: 40000, axles: 2, length: 6.0, width: 2.55, height: 3.85, expectedLifetimeKm: 1100000, power: '430 ch', years: '2015+' },
      { name: 'Arocs 1848', type: 'tracteur', fuelConsumption: 30.0, adBlueConsumption: 1.3, weight: 44000, axles: 2, length: 6.0, width: 2.55, height: 3.85, expectedLifetimeKm: 1100000, power: '480 ch', years: '2015+' },
      { name: 'Arocs 3240', type: 'porteur', fuelConsumption: 27.0, adBlueConsumption: 1.2, weight: 32000, axles: 4, length: 9.5, width: 2.55, height: 3.8, expectedLifetimeKm: 1000000, power: '400 ch', years: '2015+' },
      { name: 'Arocs 3243', type: 'porteur', fuelConsumption: 28.0, adBlueConsumption: 1.2, weight: 32000, axles: 4, length: 9.5, width: 2.55, height: 3.8, expectedLifetimeKm: 1000000, power: '430 ch', years: '2015+' },
      { name: 'Arocs 3348', type: 'porteur', fuelConsumption: 30.0, adBlueConsumption: 1.3, weight: 33000, axles: 4, length: 9.5, width: 2.55, height: 3.8, expectedLifetimeKm: 1000000, power: '480 ch', years: '2015+' },
      // Atego (porteur moyen/distribution)
      { name: 'Atego 818', type: 'porteur', fuelConsumption: 14.5, adBlueConsumption: 0.5, weight: 8000, axles: 2, length: 6.5, width: 2.30, height: 3.1, expectedLifetimeKm: 600000, power: '177 ch', years: '2015+' },
      { name: 'Atego 1024', type: 'porteur', fuelConsumption: 16.0, adBlueConsumption: 0.6, weight: 10000, axles: 2, length: 7.0, width: 2.35, height: 3.2, expectedLifetimeKm: 600000, power: '238 ch', years: '2015+' },
      { name: 'Atego 1224', type: 'porteur', fuelConsumption: 17.5, adBlueConsumption: 0.7, weight: 12000, axles: 2, length: 7.5, width: 2.50, height: 3.3, expectedLifetimeKm: 700000, power: '238 ch', years: '2015+' },
      { name: 'Atego 1230', type: 'porteur', fuelConsumption: 19.0, adBlueConsumption: 0.7, weight: 12000, axles: 2, length: 7.5, width: 2.50, height: 3.3, expectedLifetimeKm: 700000, power: '299 ch', years: '2015+' },
      { name: 'Atego 1530', type: 'porteur', fuelConsumption: 20.0, adBlueConsumption: 0.8, weight: 15000, axles: 2, length: 8.0, width: 2.50, height: 3.4, expectedLifetimeKm: 700000, power: '299 ch', years: '2015+' },
      { name: 'Atego 1630', type: 'porteur', fuelConsumption: 21.0, adBlueConsumption: 0.8, weight: 16000, axles: 2, length: 8.0, width: 2.50, height: 3.4, expectedLifetimeKm: 700000, power: '299 ch', years: '2015+' },
      // eActros (électrique)
      { name: 'eActros 300', type: 'porteur', fuelConsumption: 0, adBlueConsumption: 0, weight: 19000, axles: 2, length: 8.5, width: 2.55, height: 3.5, expectedLifetimeKm: 800000, power: '400 ch (élec)', years: '2022+' },
      { name: 'eActros 400', type: 'porteur', fuelConsumption: 0, adBlueConsumption: 0, weight: 27000, axles: 3, length: 9.0, width: 2.55, height: 3.8, expectedLifetimeKm: 800000, power: '536 ch (élec)', years: '2022+' },
    ],
  },
  {
    brand: 'Renault Trucks',
    models: [
      // T (2015-2021)
      { name: 'T 380', type: 'tracteur', fuelConsumption: 28.0, adBlueConsumption: 1.2, weight: 40000, axles: 2, length: 6.0, width: 2.55, height: 3.85, expectedLifetimeKm: 1100000, power: '380 ch', years: '2015-2021' },
      { name: 'T 430', type: 'tracteur', fuelConsumption: 29.0, adBlueConsumption: 1.2, weight: 44000, axles: 2, length: 6.0, width: 2.55, height: 3.95, expectedLifetimeKm: 1100000, power: '430 ch', years: '2015-2021' },
      { name: 'T 460', type: 'tracteur', fuelConsumption: 29.5, adBlueConsumption: 1.3, weight: 44000, axles: 2, length: 6.0, width: 2.55, height: 3.95, expectedLifetimeKm: 1100000, power: '460 ch', years: '2015-2021' },
      { name: 'T 480', type: 'tracteur', fuelConsumption: 29.0, adBlueConsumption: 1.3, weight: 44000, axles: 2, length: 6.0, width: 2.55, height: 3.95, expectedLifetimeKm: 1100000, power: '480 ch', years: '2015-2021' },
      { name: 'T 520', type: 'tracteur', fuelConsumption: 31.0, adBlueConsumption: 1.5, weight: 44000, axles: 2, length: 6.0, width: 2.55, height: 3.95, expectedLifetimeKm: 1100000, power: '520 ch', years: '2015-2021' },
      // T High (2015-2021)
      { name: 'T High 480', type: 'tracteur', fuelConsumption: 30.0, adBlueConsumption: 1.3, weight: 44000, axles: 2, length: 6.2, width: 2.55, height: 4.0, expectedLifetimeKm: 1100000, power: '480 ch', years: '2015-2021' },
      { name: 'T High 520', type: 'tracteur', fuelConsumption: 30.5, adBlueConsumption: 1.4, weight: 44000, axles: 2, length: 6.2, width: 2.55, height: 4.0, expectedLifetimeKm: 1100000, power: '520 ch', years: '2015-2021' },
      // T Evolution (2021+)
      { name: 'T Evolution 380', type: 'tracteur', fuelConsumption: 26.5, adBlueConsumption: 1.1, weight: 40000, axles: 2, length: 6.0, width: 2.55, height: 3.95, expectedLifetimeKm: 1200000, power: '380 ch', years: '2021+' },
      { name: 'T Evolution 430', type: 'tracteur', fuelConsumption: 27.0, adBlueConsumption: 1.2, weight: 44000, axles: 2, length: 6.0, width: 2.55, height: 3.95, expectedLifetimeKm: 1200000, power: '430 ch', years: '2021+' },
      { name: 'T Evolution 460', type: 'tracteur', fuelConsumption: 27.5, adBlueConsumption: 1.2, weight: 44000, axles: 2, length: 6.0, width: 2.55, height: 3.95, expectedLifetimeKm: 1200000, power: '460 ch', years: '2021+' },
      { name: 'T Evolution 480', type: 'tracteur', fuelConsumption: 27.5, adBlueConsumption: 1.2, weight: 44000, axles: 2, length: 6.0, width: 2.55, height: 3.95, expectedLifetimeKm: 1200000, power: '480 ch', years: '2021+' },
      { name: 'T Evolution 520', type: 'tracteur', fuelConsumption: 29.0, adBlueConsumption: 1.4, weight: 44000, axles: 2, length: 6.0, width: 2.55, height: 3.95, expectedLifetimeKm: 1200000, power: '520 ch', years: '2021+' },
      // T High Evolution (2021+)
      { name: 'T High Evolution 480', type: 'tracteur', fuelConsumption: 28.0, adBlueConsumption: 1.3, weight: 44000, axles: 2, length: 6.2, width: 2.55, height: 4.0, expectedLifetimeKm: 1200000, power: '480 ch', years: '2021+' },
      { name: 'T High Evolution 520', type: 'tracteur', fuelConsumption: 29.0, adBlueConsumption: 1.4, weight: 44000, axles: 2, length: 6.2, width: 2.55, height: 4.0, expectedLifetimeKm: 1200000, power: '520 ch', years: '2021+' },
      // C/K (chantier)
      { name: 'C 380', type: 'porteur', fuelConsumption: 27.0, adBlueConsumption: 1.2, weight: 32000, axles: 4, length: 9.5, width: 2.55, height: 3.8, expectedLifetimeKm: 1000000, power: '380 ch', years: '2015+' },
      { name: 'C 430', type: 'porteur', fuelConsumption: 28.0, adBlueConsumption: 1.2, weight: 32000, axles: 4, length: 9.5, width: 2.55, height: 3.8, expectedLifetimeKm: 1000000, power: '430 ch', years: '2015+' },
      { name: 'C 480', type: 'porteur', fuelConsumption: 29.0, adBlueConsumption: 1.3, weight: 32000, axles: 4, length: 9.5, width: 2.55, height: 3.8, expectedLifetimeKm: 1000000, power: '480 ch', years: '2015+' },
      { name: 'K 430', type: 'porteur', fuelConsumption: 29.0, adBlueConsumption: 1.3, weight: 41000, axles: 4, length: 9.5, width: 2.55, height: 3.8, expectedLifetimeKm: 900000, power: '430 ch', years: '2015+' },
      { name: 'K 480', type: 'porteur', fuelConsumption: 30.0, adBlueConsumption: 1.4, weight: 41000, axles: 4, length: 9.5, width: 2.55, height: 3.8, expectedLifetimeKm: 900000, power: '480 ch', years: '2015+' },
      // D (distribution)
      { name: 'D 210', type: 'porteur', fuelConsumption: 18.0, adBlueConsumption: 0.7, weight: 12000, axles: 2, length: 7.5, width: 2.50, height: 3.3, expectedLifetimeKm: 700000, power: '210 ch', years: '2015+' },
      { name: 'D 240', type: 'porteur', fuelConsumption: 19.5, adBlueConsumption: 0.8, weight: 16000, axles: 2, length: 8.0, width: 2.50, height: 3.4, expectedLifetimeKm: 800000, power: '240 ch', years: '2015+' },
      { name: 'D 250', type: 'porteur', fuelConsumption: 20.0, adBlueConsumption: 0.8, weight: 16000, axles: 2, length: 8.0, width: 2.50, height: 3.4, expectedLifetimeKm: 800000, power: '250 ch', years: '2019+' },
      { name: 'D 280', type: 'porteur', fuelConsumption: 22.0, adBlueConsumption: 0.9, weight: 19000, axles: 2, length: 8.5, width: 2.50, height: 3.5, expectedLifetimeKm: 800000, power: '280 ch', years: '2015+' },
      { name: 'D 320', type: 'porteur', fuelConsumption: 23.0, adBlueConsumption: 0.9, weight: 19000, axles: 2, length: 8.5, width: 2.50, height: 3.5, expectedLifetimeKm: 800000, power: '320 ch', years: '2019+' },
      // D Wide (porteur large)
      { name: 'D Wide 280', type: 'porteur', fuelConsumption: 22.5, adBlueConsumption: 0.9, weight: 26000, axles: 3, length: 9.0, width: 2.55, height: 3.6, expectedLifetimeKm: 800000, power: '280 ch', years: '2019+' },
      { name: 'D Wide 320', type: 'porteur', fuelConsumption: 23.5, adBlueConsumption: 1.0, weight: 26000, axles: 3, length: 9.0, width: 2.55, height: 3.6, expectedLifetimeKm: 800000, power: '320 ch', years: '2019+' },
      { name: 'D Wide 380', type: 'porteur', fuelConsumption: 25.0, adBlueConsumption: 1.1, weight: 26000, axles: 3, length: 9.0, width: 2.55, height: 3.6, expectedLifetimeKm: 800000, power: '380 ch', years: '2019+' },
      // Midlum / D (porteur léger)
      { name: 'D 180', type: 'porteur', fuelConsumption: 16.0, adBlueConsumption: 0.6, weight: 7500, axles: 2, length: 6.5, width: 2.20, height: 3.0, expectedLifetimeKm: 600000, power: '180 ch', years: '2015+' },
      // E-Tech (électrique)
      { name: 'E-Tech D', type: 'porteur', fuelConsumption: 0, adBlueConsumption: 0, weight: 16000, axles: 2, length: 8.0, width: 2.50, height: 3.5, expectedLifetimeKm: 700000, power: '300 ch (élec)', years: '2023+' },
      { name: 'E-Tech T', type: 'tracteur', fuelConsumption: 0, adBlueConsumption: 0, weight: 44000, axles: 2, length: 6.0, width: 2.55, height: 3.95, expectedLifetimeKm: 900000, power: '490 ch (élec)', years: '2023+' },
    ],
  },
  {
    brand: 'Volvo',
    models: [
      // FH (tracteur longue distance)
      { name: 'FH 420', type: 'tracteur', fuelConsumption: 28.5, adBlueConsumption: 1.2, weight: 44000, axles: 2, length: 6.0, width: 2.55, height: 3.95, expectedLifetimeKm: 1300000, power: '420 ch', years: '2015+' },
      { name: 'FH 460', type: 'tracteur', fuelConsumption: 28.0, adBlueConsumption: 1.2, weight: 44000, axles: 2, length: 6.0, width: 2.55, height: 3.95, expectedLifetimeKm: 1300000, power: '460 ch', years: '2015+' },
      { name: 'FH 500', type: 'tracteur', fuelConsumption: 29.0, adBlueConsumption: 1.3, weight: 44000, axles: 2, length: 6.0, width: 2.55, height: 3.95, expectedLifetimeKm: 1300000, power: '500 ch', years: '2015+' },
      { name: 'FH 540', type: 'tracteur', fuelConsumption: 30.5, adBlueConsumption: 1.4, weight: 44000, axles: 2, length: 6.0, width: 2.55, height: 3.95, expectedLifetimeKm: 1300000, power: '540 ch', years: '2015+' },
      // FH new (2021+)
      { name: 'FH 420 (New)', type: 'tracteur', fuelConsumption: 27.0, adBlueConsumption: 1.1, weight: 44000, axles: 2, length: 6.0, width: 2.55, height: 3.95, expectedLifetimeKm: 1300000, power: '420 ch', years: '2021+' },
      { name: 'FH 460 (New)', type: 'tracteur', fuelConsumption: 27.5, adBlueConsumption: 1.2, weight: 44000, axles: 2, length: 6.0, width: 2.55, height: 3.95, expectedLifetimeKm: 1300000, power: '460 ch', years: '2021+' },
      { name: 'FH 500 (New)', type: 'tracteur', fuelConsumption: 28.0, adBlueConsumption: 1.3, weight: 44000, axles: 2, length: 6.0, width: 2.55, height: 3.95, expectedLifetimeKm: 1300000, power: '500 ch', years: '2021+' },
      { name: 'FH 540 (New)', type: 'tracteur', fuelConsumption: 29.5, adBlueConsumption: 1.4, weight: 44000, axles: 2, length: 6.0, width: 2.55, height: 3.95, expectedLifetimeKm: 1300000, power: '540 ch', years: '2021+' },
      // FH16 (haut de gamme)
      { name: 'FH16 550', type: 'tracteur', fuelConsumption: 32.0, adBlueConsumption: 1.5, weight: 44000, axles: 2, length: 6.2, width: 2.55, height: 4.0, expectedLifetimeKm: 1300000, power: '550 ch', years: '2015+' },
      { name: 'FH16 650', type: 'tracteur', fuelConsumption: 34.0, adBlueConsumption: 1.7, weight: 44000, axles: 2, length: 6.2, width: 2.55, height: 4.0, expectedLifetimeKm: 1300000, power: '650 ch', years: '2015+' },
      { name: 'FH16 750', type: 'tracteur', fuelConsumption: 35.0, adBlueConsumption: 1.7, weight: 44000, axles: 2, length: 6.2, width: 2.55, height: 4.0, expectedLifetimeKm: 1300000, power: '750 ch', years: '2015+' },
      // FM (tracteur polyvalent)
      { name: 'FM 330', type: 'tracteur', fuelConsumption: 26.0, adBlueConsumption: 1.0, weight: 40000, axles: 2, length: 6.0, width: 2.55, height: 3.85, expectedLifetimeKm: 1200000, power: '330 ch', years: '2015+' },
      { name: 'FM 370', type: 'tracteur', fuelConsumption: 27.0, adBlueConsumption: 1.1, weight: 40000, axles: 2, length: 6.0, width: 2.55, height: 3.85, expectedLifetimeKm: 1200000, power: '370 ch', years: '2015+' },
      { name: 'FM 420', type: 'tracteur', fuelConsumption: 27.5, adBlueConsumption: 1.2, weight: 44000, axles: 2, length: 6.0, width: 2.55, height: 3.85, expectedLifetimeKm: 1200000, power: '420 ch', years: '2015+' },
      { name: 'FM 460', type: 'tracteur', fuelConsumption: 28.5, adBlueConsumption: 1.2, weight: 44000, axles: 2, length: 6.0, width: 2.55, height: 3.85, expectedLifetimeKm: 1200000, power: '460 ch', years: '2015+' },
      { name: 'FM 500', type: 'tracteur', fuelConsumption: 29.5, adBlueConsumption: 1.3, weight: 44000, axles: 2, length: 6.0, width: 2.55, height: 3.85, expectedLifetimeKm: 1200000, power: '500 ch', years: '2021+' },
      // FM (porteur)
      { name: 'FM 330 Porteur', type: 'porteur', fuelConsumption: 24.0, adBlueConsumption: 1.0, weight: 26000, axles: 3, length: 9.0, width: 2.55, height: 3.8, expectedLifetimeKm: 1000000, power: '330 ch', years: '2015+' },
      { name: 'FM 370 Porteur', type: 'porteur', fuelConsumption: 25.0, adBlueConsumption: 1.1, weight: 26000, axles: 3, length: 9.0, width: 2.55, height: 3.8, expectedLifetimeKm: 1000000, power: '370 ch', years: '2015+' },
      { name: 'FM 420 Porteur', type: 'porteur', fuelConsumption: 26.0, adBlueConsumption: 1.1, weight: 26000, axles: 3, length: 9.0, width: 2.55, height: 3.8, expectedLifetimeKm: 1000000, power: '420 ch', years: '2015+' },
      // FMX (chantier)
      { name: 'FMX 370', type: 'porteur', fuelConsumption: 28.0, adBlueConsumption: 1.2, weight: 32000, axles: 4, length: 9.5, width: 2.55, height: 3.8, expectedLifetimeKm: 1000000, power: '370 ch', years: '2015+' },
      { name: 'FMX 420', type: 'porteur', fuelConsumption: 29.0, adBlueConsumption: 1.2, weight: 32000, axles: 4, length: 9.5, width: 2.55, height: 3.8, expectedLifetimeKm: 1000000, power: '420 ch', years: '2015+' },
      { name: 'FMX 460', type: 'porteur', fuelConsumption: 30.0, adBlueConsumption: 1.3, weight: 32000, axles: 4, length: 9.5, width: 2.55, height: 3.8, expectedLifetimeKm: 1000000, power: '460 ch', years: '2015+' },
      { name: 'FMX 500', type: 'porteur', fuelConsumption: 31.0, adBlueConsumption: 1.4, weight: 41000, axles: 4, length: 9.5, width: 2.55, height: 3.8, expectedLifetimeKm: 1000000, power: '500 ch', years: '2021+' },
      // FE (distribution)
      { name: 'FE 250', type: 'porteur', fuelConsumption: 19.0, adBlueConsumption: 0.8, weight: 16000, axles: 2, length: 8.0, width: 2.50, height: 3.4, expectedLifetimeKm: 800000, power: '250 ch', years: '2015+' },
      { name: 'FE 280', type: 'porteur', fuelConsumption: 20.0, adBlueConsumption: 0.8, weight: 18000, axles: 2, length: 8.5, width: 2.50, height: 3.5, expectedLifetimeKm: 800000, power: '280 ch', years: '2015+' },
      { name: 'FE 320', type: 'porteur', fuelConsumption: 21.0, adBlueConsumption: 0.9, weight: 18000, axles: 2, length: 8.5, width: 2.50, height: 3.5, expectedLifetimeKm: 800000, power: '320 ch', years: '2015+' },
      // FL (porteur léger)
      { name: 'FL 210', type: 'porteur', fuelConsumption: 18.0, adBlueConsumption: 0.7, weight: 12000, axles: 2, length: 7.5, width: 2.50, height: 3.3, expectedLifetimeKm: 700000, power: '210 ch', years: '2015+' },
      { name: 'FL 250', type: 'porteur', fuelConsumption: 20.0, adBlueConsumption: 0.8, weight: 16000, axles: 2, length: 8.0, width: 2.50, height: 3.5, expectedLifetimeKm: 800000, power: '250 ch', years: '2015+' },
      { name: 'FL 280', type: 'porteur', fuelConsumption: 21.0, adBlueConsumption: 0.8, weight: 18000, axles: 2, length: 8.5, width: 2.50, height: 3.5, expectedLifetimeKm: 800000, power: '280 ch', years: '2015+' },
      // Electrique
      { name: 'FH Electric', type: 'tracteur', fuelConsumption: 0, adBlueConsumption: 0, weight: 44000, axles: 2, length: 6.0, width: 2.55, height: 3.95, expectedLifetimeKm: 1000000, power: '490 ch (élec)', years: '2024+' },
      { name: 'FM Electric', type: 'tracteur', fuelConsumption: 0, adBlueConsumption: 0, weight: 44000, axles: 2, length: 6.0, width: 2.55, height: 3.85, expectedLifetimeKm: 1000000, power: '490 ch (élec)', years: '2023+' },
      { name: 'FE Electric', type: 'porteur', fuelConsumption: 0, adBlueConsumption: 0, weight: 16000, axles: 2, length: 8.0, width: 2.50, height: 3.5, expectedLifetimeKm: 700000, power: '270 ch (élec)', years: '2022+' },
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
