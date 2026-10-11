import * as XLSX from 'xlsx';
import type { FixedCharge } from '@/types';
import type { SavedTour } from '@/types/savedTour';

export interface ExcelChargeRow {
  nom?: string;
  name?: string;
  montant?: number;
  amount?: number;
  periodicite?: string;
  periodicity?: string;
  categorie?: string;
  category?: string;
  ht?: boolean | string;
  isHT?: boolean | string;
}

export interface ExcelTourRow {
  nom?: string;
  name?: string;
  origine?: string;
  origin?: string;
  destination?: string;
  distance?: number;
  distance_km?: number;
  peages?: number;
  toll_cost?: number;
  carburant?: number;
  fuel_cost?: number;
  revenu?: number;
  revenue?: number;
  notes?: string;
  // Rapprochement par nom avec les données déjà en base (véhicules/clients/conducteurs).
  vehicule?: string;
  vehicle?: string;
  client?: string;
  conducteur?: string;
  conducteurs?: string;
  driver?: string;
  drivers?: string;
}

export interface ToursExcelLookupItem {
  id: string;
  name: string;
}

export interface ToursExcelLookups {
  vehicles?: ToursExcelLookupItem[];
  clients?: ToursExcelLookupItem[];
  /** Nom affiché du conducteur (ex. "Prénom Nom") */
  drivers?: ToursExcelLookupItem[];
}

/** Rapproche une valeur texte d'Excel avec un élément déjà en base, par nom exact puis par inclusion (insensible à la casse/accents). */
function matchByName<T extends ToursExcelLookupItem>(value: string | undefined, items: T[] | undefined): string | null {
  if (!value || !items || items.length === 0) return null;
  const normalize = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  const needle = normalize(value);
  if (!needle) return null;
  const exact = items.find((item) => normalize(item.name) === needle);
  if (exact) return exact.id;
  const partial = items.find((item) => normalize(item.name).includes(needle) || needle.includes(normalize(item.name)));
  return partial ? partial.id : null;
}

export function parseExcelFile(file: File): Promise<XLSX.WorkBook> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        resolve(workbook);
      } catch (error) {
        reject(new Error('Erreur de lecture du fichier Excel'));
      }
    };
    reader.onerror = () => reject(new Error('Erreur de lecture du fichier'));
    reader.readAsArrayBuffer(file);
  });
}

export function parseChargesFromExcel(workbook: XLSX.WorkBook): Partial<FixedCharge>[] {
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<ExcelChargeRow>(sheet);

  return rows.map((row, index) => {
    const name = row.nom || row.name || `Charge ${index + 1}`;
    const amount = row.montant || row.amount || 0;
    const periodicity = normalizePeriodicty(row.periodicite || row.periodicity || 'monthly');
    const category = normalizeCategory(row.categorie || row.category || 'other');
    const isHT = normalizeBoolean(row.ht ?? row.isHT ?? false);

    return {
      id: crypto.randomUUID(),
      name,
      amount,
      periodicity,
      category,
      isHT,
    };
  });
}

export function parseToursFromExcel(workbook: XLSX.WorkBook, lookups?: ToursExcelLookups): Partial<SavedTour>[] {
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<ExcelTourRow>(sheet);

  return rows.map((row, index) => {
    const vehicle_id = matchByName(row.vehicule || row.vehicle, lookups?.vehicles);
    const client_id = matchByName(row.client, lookups?.clients);
    const driverNames = (row.conducteur || row.conducteurs || row.driver || row.drivers || '')
      .split(/[,;/]/)
      .map((n) => n.trim())
      .filter(Boolean);
    const driver_ids = driverNames
      .map((n) => matchByName(n, lookups?.drivers))
      .filter((id): id is string => !!id);

    const toll_cost = row.peages || row.toll_cost || 0;
    const fuel_cost = row.carburant || row.fuel_cost || 0;
    const revenue = row.revenu || row.revenue || 0;
    // Les coûts additionnels (AdBlue, conducteur, structure, véhicule) ne sont pas
    // dans le fichier — laissés à 0 ; la marge se recalcule exactement de la même
    // façon dès qu'ils sont complétés dans l'éditeur de tournée.
    const total_cost = toll_cost + fuel_cost;
    const profit = revenue - total_cost;

    return {
      name: row.nom || row.name || `Tournée ${index + 1}`,
      origin_address: row.origine || row.origin || '',
      destination_address: row.destination || '',
      distance_km: row.distance || row.distance_km || 0,
      toll_cost,
      fuel_cost,
      adblue_cost: 0,
      driver_cost: 0,
      structure_cost: 0,
      vehicle_cost: 0,
      total_cost,
      pricing_mode: 'fixed',
      revenue,
      profit,
      profit_margin: revenue > 0 ? Math.round((profit / revenue) * 1000) / 10 : 0,
      notes: row.notes || '',
      ...(vehicle_id ? { vehicle_id } : {}),
      ...(client_id ? { client_id } : {}),
      ...(driver_ids.length > 0 ? { driver_ids } : {}),
    };
  });
}

function normalizePeriodicty(value: string): 'daily' | 'monthly' | 'yearly' {
  const lower = value.toLowerCase().trim();
  if (['daily', 'jour', 'journalier', 'quotidien'].includes(lower)) return 'daily';
  if (['yearly', 'annuel', 'an', 'annee', 'année'].includes(lower)) return 'yearly';
  return 'monthly';
}

function normalizeCategory(value: string): FixedCharge['category'] {
  const lower = value.toLowerCase().trim();
  if (['insurance', 'assurance'].includes(lower)) return 'insurance';
  if (['leasing', 'credit-bail', 'crédit-bail', 'location'].includes(lower)) return 'leasing';
  if (['administrative', 'administratif', 'admin'].includes(lower)) return 'administrative';
  if (['maintenance', 'entretien'].includes(lower)) return 'maintenance';
  return 'other';
}

function normalizeBoolean(value: boolean | string): boolean {
  if (typeof value === 'boolean') return value;
  const lower = String(value).toLowerCase().trim();
  return ['true', 'oui', 'yes', '1', 'vrai'].includes(lower);
}

export function generateExcelTemplate(type: 'charges' | 'tours'): Blob {
  const wb = XLSX.utils.book_new();
  
  if (type === 'charges') {
    const data = [
      { nom: 'Exemple Assurance', montant: 500, periodicite: 'mensuel', categorie: 'assurance', ht: 'oui' },
      { nom: 'Exemple Leasing', montant: 1200, periodicite: 'mensuel', categorie: 'leasing', ht: 'oui' },
      { nom: 'Exemple Entretien', montant: 2000, periodicite: 'annuel', categorie: 'entretien', ht: 'oui' },
    ];
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Charges');
  } else {
    const data = [
      { nom: 'Exemple Paris-Lyon', origine: 'Paris, France', destination: 'Lyon, France', distance: 465, client: 'Client Dupont', vehicule: 'Camion 1', conducteur: 'Jean Martin', peages: 35, carburant: 150, revenu: 450, notes: 'Client régulier' },
      { nom: 'Exemple Lyon-Marseille', origine: 'Lyon, France', destination: 'Marseille, France', distance: 315, client: '', vehicule: '', conducteur: '', peages: 25, carburant: 100, revenu: 320, notes: '' },
    ];
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Tournees');

    const helpData = [
      ['Comment remplir ce modèle :'],
      ['- "client", "vehicule" et "conducteur" doivent reprendre exactement (ou presque) le nom déjà existant dans l\'application.'],
      ['- Si le nom ne correspond à rien de connu, la ligne est importée sans ce lien (à compléter ensuite dans Tournées).'],
      ['- "conducteur" accepte plusieurs noms séparés par une virgule (conducteur titulaire + relais).'],
      ['- "peages" et "carburant" sont en euros ; "distance" en kilomètres ; "revenu" = prix facturé au client.'],
    ];
    const wsHelp = XLSX.utils.aoa_to_sheet(helpData);
    XLSX.utils.book_append_sheet(wb, wsHelp, 'Aide');
  }

  const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}
