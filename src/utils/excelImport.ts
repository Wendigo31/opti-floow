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

export function parseToursFromExcel(workbook: XLSX.WorkBook): Partial<SavedTour>[] {
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<ExcelTourRow>(sheet);

  return rows.map((row, index) => {
    return {
      name: row.nom || row.name || `Tournée ${index + 1}`,
      origin_address: row.origine || row.origin || '',
      destination_address: row.destination || '',
      distance_km: row.distance || row.distance_km || 0,
      toll_cost: row.peages || row.toll_cost || 0,
      fuel_cost: row.carburant || row.fuel_cost || 0,
      revenue: row.revenu || row.revenue || 0,
      notes: row.notes || '',
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
      { nom: 'Exemple Paris-Lyon', origine: 'Paris, France', destination: 'Lyon, France', distance: 465, peages: 35, carburant: 150, revenu: 450, notes: 'Client régulier' },
      { nom: 'Exemple Lyon-Marseille', origine: 'Lyon, France', destination: 'Marseille, France', distance: 315, peages: 25, carburant: 100, revenu: 320, notes: '' },
    ];
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Tournees');
  }

  const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}
