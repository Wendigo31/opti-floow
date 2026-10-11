import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import { parseToursFromExcel, type ToursExcelLookups } from './excelImport';

/** Construit un classeur Excel en mémoire, comme le ferait un fichier .xlsx importé par l'utilisateur. */
function buildWorkbook(rows: Record<string, unknown>[]): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, 'Tournees');
  return wb;
}

describe('parseToursFromExcel', () => {
  const lookups: ToursExcelLookups = {
    vehicles: [{ id: 'v1', name: 'Camion 1' }, { id: 'v2', name: 'Camion 2' }],
    clients: [{ id: 'c1', name: 'Client Dupont' }],
    drivers: [{ id: 'd1', name: 'Jean Martin' }, { id: 'd2', name: 'Alice Durand' }],
  };

  it('rapproche véhicule/client/conducteur par nom et calcule les coûts/marge', () => {
    const wb = buildWorkbook([
      {
        nom: 'Paris-Lyon', origine: 'Paris', destination: 'Lyon', distance: 465,
        client: 'Client Dupont', vehicule: 'Camion 1', conducteur: 'Jean Martin',
        peages: 35, carburant: 150, revenu: 450, notes: 'Client régulier',
      },
    ]);

    const [tour] = parseToursFromExcel(wb, lookups);

    expect(tour.name).toBe('Paris-Lyon');
    expect(tour.vehicle_id).toBe('v1');
    expect(tour.client_id).toBe('c1');
    expect(tour.driver_ids).toEqual(['d1']);
    expect(tour.total_cost).toBe(185); // péages + carburant
    expect(tour.profit).toBe(265); // 450 - 185
    expect(tour.profit_margin).toBeCloseTo(58.9, 1);
    expect(tour.pricing_mode).toBe('fixed');
  });

  it('accepte plusieurs conducteurs séparés par une virgule (titulaire + relais)', () => {
    const wb = buildWorkbook([
      { nom: 'Ligne relais', origine: 'Lille', destination: 'Marseille', distance: 1000, conducteur: 'Jean Martin, Alice Durand' },
    ]);

    const [tour] = parseToursFromExcel(wb, lookups);
    expect(tour.driver_ids).toEqual(['d1', 'd2']);
  });

  it("n'assigne aucun id quand le nom ne correspond à rien de connu, sans faire échouer l'import", () => {
    const wb = buildWorkbook([
      { nom: 'Ligne inconnue', origine: 'A', destination: 'B', distance: 10, vehicule: 'Camion fantôme', client: 'Client inconnu' },
    ]);

    const [tour] = parseToursFromExcel(wb, lookups);
    expect(tour.vehicle_id).toBeUndefined();
    expect(tour.client_id).toBeUndefined();
    expect(tour.name).toBe('Ligne inconnue');
  });

  it('fonctionne sans lookups (comportement historique conservé)', () => {
    const wb = buildWorkbook([
      { nom: 'Lyon-Marseille', origine: 'Lyon', destination: 'Marseille', distance: 315, peages: 25, carburant: 100, revenu: 320 },
    ]);

    const [tour] = parseToursFromExcel(wb);
    expect(tour.name).toBe('Lyon-Marseille');
    expect(tour.total_cost).toBe(125);
    expect(tour.revenue).toBe(320);
  });
});
