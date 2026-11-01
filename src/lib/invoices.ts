// Facturation OptiXpress — modèle de données et calculs.
// L'émetteur de la facture est toujours la société détentrice de la licence
// (voir InvoiceIssuer, préremplie depuis les infos de licence puis éditable).
// Les lignes peuvent être générées automatiquement depuis les tournées saisies.

export const INVOICES_STORAGE_KEY = "optixpress_invoices";
export const INVOICE_ISSUER_STORAGE_KEY = "optixpress_invoice_issuer";

export type InvoiceStatus = "draft" | "sent" | "paid" | "cancelled";

export interface InvoiceLine {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number; // HT
  /** Identifiant de la tournée source lorsque la ligne a été importée */
  sourceRouteId?: string;
  /** Ligne d'indexation gazole (comptabilisée à part dans le FEC). */
  fuel?: boolean;
}

export interface Invoice {
  id: string;
  number: string;
  clientId: string;
  clientName: string;
  clientAddress?: string;
  clientEmail?: string;
  // Ajouté (demande utilisateur, oct. 2026) : SIREN du client, capturé en
  // instantané au moment de la facture (même logique que clientAddress/
  // clientEmail ci-dessus) — pour qu'une facture déjà éditée garde le SIREN
  // tel qu'il était à ce moment-là, même si la fiche client change ensuite.
  clientSiren?: string;
  issueDate: string; // ISO yyyy-mm-dd
  dueDate: string; // ISO yyyy-mm-dd
  periodStart?: string;
  periodEnd?: string;
  lines: InvoiceLine[];
  taxRate: number; // en %
  notes?: string;
  status: InvoiceStatus;
  createdAt: string;
  /** Date d'envoi effective par email au client (ISO), renseignée automatiquement par l'envoi. */
  sentAt?: string;
  /** Facture ou avoir (AV-…, lignes négatives) ; absent = facture. */
  kind?: "invoice" | "credit_note";
  /** Avoir : facture d'origine. */
  creditOf?: { id: string; number: string };
  creditReason?: string;
  cancelledAt?: string;
  /** Date d'encaissement (ISO), renseignée quand la facture passe « payée ». */
  paidAt?: string;
}

/** Une facture émise (plus un brouillon) ne se modifie ni ne se supprime : on fait un avoir. */
export const isIssued = (inv: Pick<Invoice, "status">) => inv.status !== "draft";
export const isCreditNote = (inv: Pick<Invoice, "kind">) => inv.kind === "credit_note";

/** Montant HT encore créditable d'une facture (avoirs déjà émis déduits). */
export function creditableHT(invoice: Invoice, all: Invoice[]): number {
  const own = computeInvoiceTotals(invoice.lines, invoice.taxRate).subtotal;
  const credited = all
    .filter((i) => i.kind === "credit_note" && i.creditOf?.id === invoice.id)
    .reduce((s, i) => s + computeInvoiceTotals(i.lines, i.taxRate).subtotal, 0);
  return Math.round((own + credited) * 100) / 100;
}

/** Total TTC restant dû (avoirs partiels déduits). */
export function amountDueTTC(invoice: Invoice, all: Invoice[]): number {
  const own = computeInvoiceTotals(invoice.lines, invoice.taxRate).total;
  const credited = all
    .filter((i) => i.kind === "credit_note" && i.creditOf?.id === invoice.id)
    .reduce((s, i) => s + computeInvoiceTotals(i.lines, i.taxRate).total, 0);
  return Math.round((own + credited) * 100) / 100;
}

export interface InvoiceIssuer {
  companyName: string;
  legalForm: string;
  siren: string;
  vatNumber: string;
  addressStreet: string;
  addressPostalCode: string;
  addressCity: string;
  email: string;
  phone: string;
  iban: string;
  bic: string;
  paymentTermsDays: number;
  footerNote: string;
}

export const DEFAULT_INVOICE_ISSUER: InvoiceIssuer = {
  companyName: "",
  legalForm: "",
  siren: "",
  vatNumber: "",
  addressStreet: "",
  addressPostalCode: "",
  addressCity: "",
  email: "",
  phone: "",
  iban: "",
  bic: "",
  paymentTermsDays: 30,
  footerNote:
    "Pénalités de retard : 3 fois le taux d'intérêt légal. Indemnité forfaitaire de recouvrement : 40 €.",
};

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  draft: "Brouillon",
  sent: "Envoyée",
  paid: "Payée",
  cancelled: "Annulée",
};

export interface InvoiceTotals {
  subtotal: number;
  tax: number;
  total: number;
}

export function computeInvoiceTotals(lines: InvoiceLine[], taxRate: number): InvoiceTotals {
  const subtotal = lines.reduce(
    (sum, l) => sum + (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0),
    0
  );
  const r = (x: number) => Math.round(x * 100) / 100;
  const ht = r(subtotal);
  const tax = r(ht * ((Number(taxRate) || 0) / 100));
  return { subtotal: ht, tax, total: r(ht + tax) };
}

export function lineTotal(line: InvoiceLine): number {
  return (Number(line.quantity) || 0) * (Number(line.unitPrice) || 0);
}

/**
 * FA-2026-0007 : numérotation séquentielle par année, sans trou. Factures (FA) et
 * avoirs (AV) partagent la même série : FA-2026-0007 puis AV-2026-0008.
 */
export function nextInvoiceNumber(invoices: Invoice[], date = new Date()): string {
  const year = String(date.getFullYear());
  const max = invoices.reduce((acc, i) => {
    const [kind, y, n] = (i.number || "").split("-");
    if ((kind !== "FA" && kind !== "AV") || y !== year) return acc;
    const v = parseInt(n, 10);
    return Number.isFinite(v) && v > acc ? v : acc;
  }, 0);
  return `FA-${year}-${String(max + 1).padStart(4, "0")}`;
}

export function addDays(isoDate: string, days: number): string {
  // Calcul en UTC : en France (UTC+1/+2), minuit local converti en UTC tombait la veille
  // et l'échéance d'une facture sortait avec un jour d'avance.
  const [y, m, d] = isoDate.slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** DD/MM/YYYY (convention d'affichage OptiXpress) */
export function formatDateFr(isoDate?: string): string {
  if (!isoDate) return "—";
  const d = new Date(`${isoDate.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString("fr-FR");
}

export function formatEuro(amount: number): string {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(
    Number.isFinite(amount) ? amount : 0
  );
}

export function generateId(prefix = "inv"): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Identifiants des tournées (`sourceRouteId`) déjà utilisées par une facture
 * existante, à l'exclusion de la facture en cours d'édition — pour que le
 * formulaire de facture n'autorise pas de refacturer deux fois la même
 * tournée. Extrait de Invoicing.tsx (Phase 34, tests de non-régression).
 */
export function computeUsedTripIds(invoices: Invoice[], editingInvoiceId?: string | null): string[] {
  return invoices
    // Une facture annulée par avoir libère ses tournées : elles peuvent être refacturées.
    .filter((i) => i.id !== editingInvoiceId && i.status !== "cancelled")
    .flatMap((i) => i.lines.map((l) => l.sourceRouteId).filter((id): id is string => Boolean(id)));
}
