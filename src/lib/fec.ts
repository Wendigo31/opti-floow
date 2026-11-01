/**
 * Fichier des écritures comptables (FEC, art. A47 A-1 du Livre des procédures fiscales)
 * des ventes : une écriture par facture (journal VE) et une par règlement (journal BQ).
 * 18 colonnes séparées par des tabulations, montants avec virgule, dates AAAAMMJJ.
 * Comptes par défaut (plan comptable général) modifiables : 411 clients, 706 prestations,
 * 44571 TVA collectée, 512 banque. À contrôler par l'expert-comptable avant dépôt.
 * Achats (affrètement / commission) : factures des transporteurs au journal HA
 * (401 fournisseurs, 611 sous-traitance, 44566 TVA déductible) et leurs règlements au journal BQ.
 */
export interface FecPurchase {
  invoice_number: string;
  issued_at: string | null;
  amount_ht: number;
  tax_amount: number | null;
  total_ttc: number;
  status: string | null;
  paid_at: string | null;
  carrier_name: string;
  label: string;
}
export interface FecInvoice {
  invoice_number: string;
  issued_at: string | null;
  amount: number;
  tax_amount: number | null;
  total_amount: number;
  fuel_surcharge?: number | null;
  status: string | null;
  paid_at: string | null;
  client_name: string;
  client_code?: string | null;
  label: string;
}

export interface FecAccounts {
  client: string; // racine 411
  sales: string; // 706
  fuel: string; // indexation gazole
  vat: string; // 44571
  bank: string; // 512
  supplier?: string; // 401
  subcontracting?: string; // 611
  vatDeductible?: string; // 44566
}
export const DEFAULT_FEC_ACCOUNTS: Required<FecAccounts> = { client: '411000', sales: '706000', fuel: '706100', vat: '445710', bank: '512000', supplier: '401000', subcontracting: '611000', vatDeductible: '445660' };

const HEADER = ['JournalCode', 'JournalLib', 'EcritureNum', 'EcritureDate', 'CompteNum', 'CompteLib', 'CompAuxNum', 'CompAuxLib', 'PieceRef', 'PieceDate', 'EcritureLib', 'Debit', 'Credit', 'EcritureLet', 'DateLet', 'ValidDate', 'Montantdevise', 'Idevise'];

const d8 = (iso?: string | null) => (iso ? iso.slice(0, 10).replace(/-/g, '') : '');
const money = (n: number) => (Math.round((Number(n) || 0) * 100) / 100).toFixed(2).replace('.', ',');
const clean = (s: string) => String(s || '').replace(/[\t\r\n|]/g, ' ').trim();
/** Code auxiliaire client : CLI + lettres/chiffres du nom (8 max). */
export const supplierCode = (name: string) => `F${clean(name).normalize('NFD').replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 8) || 'DIVERS'}`;
export const clientCode = (name: string) => `C${clean(name).normalize('NFD').replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 8) || 'DIVERS'}`;

export function buildFec(invoices: FecInvoice[], opts: { from: string; to: string; accounts?: Partial<FecAccounts>; purchases?: FecPurchase[] }): { text: string; lines: number; total: number; purchases: number } {
  const acc = { ...DEFAULT_FEC_ACCOUNTS, ...Object.fromEntries(Object.entries(opts.accounts || {}).filter(([, v]) => v)) } as Required<FecAccounts>;
  const rows: string[][] = [];
  let seqVE = 0;
  let seqBQ = 0;
  let total = 0;
  const sorted = [...invoices]
    .filter((i) => i.issued_at && i.status !== 'draft')
    .sort((a, b) => String(a.issued_at).localeCompare(String(b.issued_at)) || a.invoice_number.localeCompare(b.invoice_number));
  for (const inv of sorted) {
    const date = d8(inv.issued_at);
    const aux = inv.client_code || clientCode(inv.client_name);
    const ttc = Number(inv.total_amount) || 0;
    const tva = Number(inv.tax_amount) || 0;
    const fuel = Number(inv.fuel_surcharge) || 0;
    const ht = (Number(inv.amount) || 0) - fuel;
    const letter = inv.status === 'paid' && ttc > 0 && inv.paid_at ? `L${String(seqBQ + 1).padStart(4, '0')}` : '';
    if (date >= d8(opts.from) && date <= d8(opts.to)) {
      seqVE++;
      total += ttc;
      const num = `VE${String(seqVE).padStart(6, '0')}`;
      const lib = clean(`${inv.invoice_number} ${inv.client_name} ${inv.label}`).slice(0, 100);
      // Avoir (montants négatifs) : écriture inversée, montants toujours positifs.
      const base = (compte: string, compteLib: string, a: string, aLib: string, debit: number, credit: number, let_ = '', dateLet = '') => {
        const [dr, cr] = debit < 0 || credit < 0 ? [Math.abs(credit), Math.abs(debit)] : [debit, credit];
        rows.push(['VE', 'Ventes', num, date, compte, compteLib, a, aLib, inv.invoice_number, date, lib, money(dr), money(cr), let_, dateLet, date, '', '']);
      };
      base(acc.client, 'Clients', aux, clean(inv.client_name), ttc, 0, letter, letter ? d8(inv.paid_at) : '');
      if (ht) base(acc.sales, 'Prestations de transport', '', '', 0, ht);
      if (fuel) base(acc.fuel, 'Indexation gazole', '', '', 0, fuel);
      if (tva) base(acc.vat, 'TVA collectée', '', '', 0, tva);
    }
    const paid = d8(inv.paid_at);
    if (inv.status === 'paid' && ttc > 0 && paid && paid >= d8(opts.from) && paid <= d8(opts.to)) {
      seqBQ++;
      const num = `BQ${String(seqBQ).padStart(6, '0')}`;
      const lib = clean(`Règlement ${inv.invoice_number} ${inv.client_name}`).slice(0, 100);
      rows.push(['BQ', 'Banque', num, paid, acc.bank, 'Banque', '', '', inv.invoice_number, paid, lib, money(ttc), money(0), '', '', paid, '', '']);
      rows.push(['BQ', 'Banque', num, paid, acc.client, 'Clients', aux, clean(inv.client_name), inv.invoice_number, paid, lib, money(0), money(ttc), letter, paid, paid, '', '']);
    }
  }
  // Achats : factures des transporteurs
  let seqHA = 0;
  let purchasesTotal = 0;
  const inRange = (d: string) => d >= d8(opts.from) && d <= d8(opts.to);
  const purchases = [...(opts.purchases || [])]
    .filter((p) => p.issued_at)
    .sort((a, b) => String(a.issued_at).localeCompare(String(b.issued_at)) || a.invoice_number.localeCompare(b.invoice_number));
  for (const p of purchases) {
    const date = d8(p.issued_at);
    const aux = supplierCode(p.carrier_name);
    const ttc = Number(p.total_ttc) || 0;
    const tva = Number(p.tax_amount) || 0;
    const ht = Number(p.amount_ht) || 0;
    const piece = clean(p.invoice_number).slice(0, 40);
    if (inRange(date)) {
      seqHA++;
      purchasesTotal += ttc;
      const num = `HA${String(seqHA).padStart(6, '0')}`;
      const lib = clean(`${piece} ${p.carrier_name} ${p.label}`).slice(0, 100);
      const line = (compte: string, compteLib: string, a: string, aLib: string, debit: number, credit: number) =>
        rows.push(['HA', 'Achats', num, date, compte, compteLib, a, aLib, piece, date, lib, money(debit), money(credit), '', '', date, '', '']);
      if (ht) line(acc.subcontracting, 'Sous-traitance transport', '', '', ht, 0);
      if (tva) line(acc.vatDeductible, 'TVA déductible', '', '', tva, 0);
      line(acc.supplier, 'Fournisseurs', aux, clean(p.carrier_name), 0, ttc);
    }
    const paid = d8(p.paid_at);
    if (p.status === 'paid' && paid && inRange(paid)) {
      seqBQ++;
      const num = `BQ${String(seqBQ).padStart(6, '0')}`;
      const lib = clean(`Paiement ${piece} ${p.carrier_name}`).slice(0, 100);
      rows.push(['BQ', 'Banque', num, paid, acc.supplier, 'Fournisseurs', aux, clean(p.carrier_name), piece, paid, lib, money(ttc), money(0), '', '', paid, '', '']);
      rows.push(['BQ', 'Banque', num, paid, acc.bank, 'Banque', '', '', piece, paid, lib, money(0), money(ttc), '', '', paid, '', '']);
    }
  }

  const text = [HEADER, ...rows].map((r) => r.join('\t')).join('\r\n') + '\r\n';
  return { text, lines: rows.length, total, purchases: Math.round(purchasesTotal * 100) / 100 };
}

/** Nom légal du fichier : <SIREN>FEC<AAAAMMJJ>.txt (date de clôture). */
export const fecFileName = (siren: string | null | undefined, to: string) => `${(siren || '').replace(/\D/g, '').slice(0, 9) || '000000000'}FEC${d8(to)}.txt`;
