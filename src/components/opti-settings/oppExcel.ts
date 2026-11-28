/**
 * Export Excel des données d'une société (fichier partagé, identique dans les 3 logiciels).
 * Même contenu que le .opp, lisible directement : un onglet « Société », puis un onglet
 * par table (une ligne par enregistrement). Les secrets sont déjà retirés par la base.
 */
import type { OppExport } from '@/components/opti-settings/oppFormat';

/** Noms d'onglets en français pour les tables les plus courantes (sinon, le nom de la table). */
const SHEET_LABELS: Record<string, string> = {
  clients: 'Clients',
  user_clients: 'Clients',
  invoices: 'Factures',
  user_invoices: 'Factures',
  invoice_lines: 'Lignes de factures',
  quotes: 'Devis',
  user_quotes: 'Devis',
  drivers: 'Conducteurs',
  user_drivers: 'Conducteurs',
  vehicles: 'Véhicules',
  user_vehicles: 'Véhicules',
  trailers: 'Remorques',
  user_trailers: 'Remorques',
  charges: 'Charges',
  user_charges: 'Charges',
  trips: 'Trajets',
  tours: 'Tournées',
  freights: 'Affrètements',
  rate_cards: 'Grilles tarifaires',
  fuel_transactions: 'Carburant',
  tacho_days: 'Relevés tachy',
  company_users: 'Équipe',
  payslips: 'Fiches de paie',
};

function cell(v: unknown): string | number | boolean | null {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number' || typeof v === 'boolean') return v;
  if (typeof v === 'string') return v.length > 32000 ? `${v.slice(0, 32000)}…` : v;
  const s = JSON.stringify(v);
  return s.length > 32000 ? `${s.slice(0, 32000)}…` : s;
}

function sheetName(table: string, used: Set<string>): string {
  const base = (SHEET_LABELS[table] ?? table).replace(/[[\]:*?/\\]/g, ' ').slice(0, 31) || 'Table';
  let name = base;
  let i = 2;
  while (used.has(name.toLowerCase())) name = `${base.slice(0, 27)} (${i++})`;
  used.add(name.toLowerCase());
  return name;
}

/** Construit le classeur et renvoie son contenu (.xlsx). */
export async function buildExcel(data: OppExport): Promise<ArrayBuffer> {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();
  const used = new Set<string>();

  const company = Object.entries(data.company ?? {}).map(([k, v]) => ({ Champ: k, Valeur: cell(v) }));
  const info = [
    { Champ: 'Logiciel', Valeur: data.app },
    { Champ: 'Exporté le', Valeur: data.exported_at },
    { Champ: 'Exporté par', Valeur: data.exported_by ?? '' },
    ...company,
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(info), sheetName('Société', used));

  const tables = Object.entries(data.tables ?? {})
    .filter(([, rows]) => Array.isArray(rows) && rows.length > 0)
    .sort(([a], [b]) => (SHEET_LABELS[a] ?? a).localeCompare(SHEET_LABELS[b] ?? b, 'fr'));
  for (const [table, rows] of tables) {
    const clean = (rows as Record<string, unknown>[]).map((r) =>
      Object.fromEntries(Object.entries(r ?? {}).map(([k, v]) => [k, cell(v)])),
    );
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(clean), sheetName(table, used));
  }
  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
}

export function excelFileName(app: string, company: string): string {
  const slug = (company || 'societe').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase();
  const day = new Date().toISOString().slice(0, 10);
  return `${app.toLowerCase()}-${slug}-${day}.xlsx`;
}

export function downloadBlob(content: ArrayBuffer, name: string): void {
  const blob = new Blob([content], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
