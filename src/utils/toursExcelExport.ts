import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import type { SavedTour } from '@/types/savedTour';
import { downloadBlob } from './excelTemplates';

export function exportToursExcel(tours: SavedTour[], filename?: string) {
  const wb = XLSX.utils.book_new();

  // Feuille 1 — Synthèse
  const headers = [
    'Nom',
    'Origine',
    'Destination',
    'Distance (km)',
    'Durée (min)',
    'Carburant (€)',
    'AdBlue (€)',
    'Péages (€)',
    'Conducteur (€)',
    'Structure (€)',
    'Véhicule (€)',
    'Coût total (€)',
    "Chiffre d'affaires (€)",
    'Bénéfice (€)',
    'Marge (%)',
    'Coût/km (€)',
    'Mode tarif',
    'Date création',
    'Favori',
    'Tags',
  ];

  const rows = tours.map((t) => [
    t.name,
    t.origin_address,
    t.destination_address,
    Number(t.distance_km.toFixed(1)),
    t.duration_minutes ?? '',
    Number(t.fuel_cost.toFixed(2)),
    Number(t.adblue_cost.toFixed(2)),
    Number(t.toll_cost.toFixed(2)),
    Number(t.driver_cost.toFixed(2)),
    Number(t.structure_cost.toFixed(2)),
    Number(t.vehicle_cost.toFixed(2)),
    Number(t.total_cost.toFixed(2)),
    Number((t.revenue || 0).toFixed(2)),
    Number((t.profit || 0).toFixed(2)),
    Number((t.profit_margin || 0).toFixed(1)),
    t.distance_km > 0 ? Number((t.total_cost / t.distance_km).toFixed(3)) : 0,
    t.pricing_mode || 'auto',
    format(new Date(t.created_at), 'dd/MM/yyyy'),
    t.is_favorite ? 'Oui' : 'Non',
    (t.tags || []).join(', '),
  ]);

  // Total row
  const totalRow = [
    'TOTAL',
    '',
    '',
    Number(tours.reduce((s, t) => s + t.distance_km, 0).toFixed(1)),
    '',
    Number(tours.reduce((s, t) => s + t.fuel_cost, 0).toFixed(2)),
    Number(tours.reduce((s, t) => s + t.adblue_cost, 0).toFixed(2)),
    Number(tours.reduce((s, t) => s + t.toll_cost, 0).toFixed(2)),
    Number(tours.reduce((s, t) => s + t.driver_cost, 0).toFixed(2)),
    Number(tours.reduce((s, t) => s + t.structure_cost, 0).toFixed(2)),
    Number(tours.reduce((s, t) => s + t.vehicle_cost, 0).toFixed(2)),
    Number(tours.reduce((s, t) => s + t.total_cost, 0).toFixed(2)),
    Number(tours.reduce((s, t) => s + (t.revenue || 0), 0).toFixed(2)),
    Number(tours.reduce((s, t) => s + (t.profit || 0), 0).toFixed(2)),
    '',
    '',
    '',
    '',
    '',
  ];

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows, totalRow]);

  ws['!cols'] = [
    { wch: 28 }, // Nom
    { wch: 35 }, // Origine
    { wch: 35 }, // Destination
    { wch: 12 }, // Distance
    { wch: 12 }, // Durée
    { wch: 14 }, // Carburant
    { wch: 12 }, // AdBlue
    { wch: 12 }, // Péages
    { wch: 14 }, // Conducteur
    { wch: 14 }, // Structure
    { wch: 14 }, // Véhicule
    { wch: 14 }, // Total
    { wch: 14 }, // CA
    { wch: 14 }, // Bénéfice
    { wch: 10 }, // Marge
    { wch: 12 }, // Coût/km
    { wch: 12 }, // Mode tarif
    { wch: 14 }, // Date
    { wch: 8 },  // Favori
    { wch: 25 }, // Tags
  ];

  // Freeze header row
  ws['!freeze'] = { xSplit: 0, ySplit: 1 } as any;
  ws['!autofilter'] = { ref: `A1:${XLSX.utils.encode_col(headers.length - 1)}${rows.length + 1}` };

  XLSX.utils.book_append_sheet(wb, ws, 'Tournées');

  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbout], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  downloadBlob(blob, filename || `tournees_${format(new Date(), 'yyyyMMdd')}.xlsx`);
}
