/**
 * Pénalités — modèle et calculs communs aux 3 logiciels (fichier partagé :
 * bridge/shared/penalties, copie identique dans OptiFret, OptiFlow, OptiXpress).
 *
 * Trois sortes :
 * - retenues des clients (le donneur d'ordre retient de l'argent : retard,
 *   colis perdu ou abîmé, non-présentation…) ;
 * - pénalités de retard de paiement réclamées aux clients (art. L441-10 du
 *   Code de commerce : taux des CGV, au moins 3 fois le taux d'intérêt légal,
 *   plus 40 € d'indemnité forfaitaire de recouvrement par facture) ;
 * - amendes et PV reçus par la société (désignation du conducteur sous 45 jours).
 */

export type PenaltyKind = 'client_withholding' | 'late_payment' | 'fine';

export interface Penalty {
  id: string;
  license_id: string;
  kind: PenaltyKind;
  occurred_on: string; // AAAA-MM-JJ
  amount: number; // € (HT pour une retenue, montant dû pour une amende)
  status: string;
  reason: string | null;
  reference: string | null; // n° de facture, n° d'avis de contravention, n° de réclamation
  client_id: string | null;
  route_id: string | null; // tournée / mission / affrètement concerné
  driver_id: string | null;
  vehicle_id: string | null;
  due_on: string | null;
  notes: string | null;
  created_at?: string;
}

export const WITHHOLDING_REASONS = [
  'Retard de livraison',
  'Colis perdu',
  'Colis ou marchandise abîmé',
  'Non-présentation / tournée non faite',
  'Défaut de preuve de livraison',
  'Réclamation du destinataire',
  'Autre',
] as const;

export const WITHHOLDING_STATUS: Record<string, { label: string; tone: 'warn' | 'ok' | 'muted' | 'bad' }> = {
  open: { label: 'À vérifier', tone: 'warn' },
  contested: { label: 'Contestée', tone: 'warn' },
  accepted: { label: 'Acceptée', tone: 'bad' },
  refunded: { label: 'Annulée / remboursée', tone: 'ok' },
};

export const LATE_STATUS: Record<string, { label: string; tone: 'warn' | 'ok' | 'muted' | 'bad' }> = {
  open: { label: 'Réclamées', tone: 'warn' },
  paid: { label: 'Payées', tone: 'ok' },
  waived: { label: 'Abandonnées', tone: 'muted' },
};

export const FINE_STATUS: Record<string, { label: string; tone: 'warn' | 'ok' | 'muted' | 'bad' }> = {
  open: { label: 'Conducteur à désigner', tone: 'bad' },
  designated: { label: 'Conducteur désigné', tone: 'ok' },
  paid: { label: 'Payée par la société', tone: 'muted' },
  contested: { label: 'Contestée', tone: 'warn' },
};

/** Délai légal de désignation du conducteur (art. L121-6 du Code de la route). */
export const DESIGNATION_DAYS = 45;
/** Indemnité forfaitaire pour frais de recouvrement, par facture payée en retard (art. D441-5). */
export const RECOVERY_INDEMNITY = 40;
/** 3 × taux d'intérêt légal « professionnels » du 2e semestre 2026 (2,75 %), minimum légal entre professionnels. */
export const DEFAULT_LATE_RATE = 8.25;

const r2 = (n: number) => Math.round(n * 100) / 100;

export function addDaysIso(iso: string, days: number): string {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

export function daysBetween(fromIso: string, toIso: string): number {
  const a = Date.UTC(+fromIso.slice(0, 4), +fromIso.slice(5, 7) - 1, +fromIso.slice(8, 10));
  const b = Date.UTC(+toIso.slice(0, 4), +toIso.slice(5, 7) - 1, +toIso.slice(8, 10));
  return Math.round((b - a) / 86_400_000);
}

/** Facture vue par l'écran Pénalités (chaque logiciel adapte la sienne). */
export interface LateInvoice {
  id: string;
  number: string;
  clientId: string | null;
  clientName: string;
  dueDate: string; // AAAA-MM-JJ
  /** Montant TTC resté dû après l'échéance (avoirs déduits). */
  amountTTC: number;
  /** Date de paiement si la facture a été payée (en retard ou non). */
  paidAt?: string | null;
}

export interface LatePenaltyCalc {
  days: number;
  interest: number;
  indemnity: number;
  total: number;
}

/**
 * Pénalités de retard d'une facture : intérêts au taux annuel `ratePct` sur le
 * montant TTC, du lendemain de l'échéance au paiement (ou à `asOf`), plus
 * l'indemnité forfaitaire de 40 €. Rien si la facture n'est pas en retard.
 */
export function latePenalty(inv: LateInvoice, ratePct: number, asOf: string): LatePenaltyCalc | null {
  const end = (inv.paidAt || asOf).slice(0, 10);
  const days = daysBetween(inv.dueDate.slice(0, 10), end);
  if (!(days > 0) || !(inv.amountTTC > 0)) return null;
  const interest = r2((inv.amountTTC * (ratePct / 100) * days) / 365);
  return { days, interest, indemnity: RECOVERY_INDEMNITY, total: r2(interest + RECOVERY_INDEMNITY) };
}

/** Factures en retard (ou payées en retard), avec leur calcul, les plus anciennes d'abord. */
export function lateInvoices(invoices: LateInvoice[], ratePct: number, asOf: string): { invoice: LateInvoice; calc: LatePenaltyCalc }[] {
  return invoices
    .map((invoice) => ({ invoice, calc: latePenalty(invoice, ratePct, asOf) }))
    .filter((x): x is { invoice: LateInvoice; calc: LatePenaltyCalc } => x.calc !== null)
    .sort((a, b) => a.invoice.dueDate.localeCompare(b.invoice.dueDate));
}

/** Jours restants pour désigner le conducteur d'un PV (négatif = délai dépassé). */
export function designationDaysLeft(fine: Pick<Penalty, 'due_on' | 'occurred_on'>, today: string): number {
  const due = fine.due_on || addDaysIso(fine.occurred_on, DESIGNATION_DAYS);
  return daysBetween(today, due);
}

export interface PenaltyTotals {
  withheld: number;
  withheldOpen: number;
  lateClaimed: number;
  lateCollected: number;
  finesOpen: number;
  finesToDesignate: number;
}

export function penaltyTotals(rows: Penalty[], month?: string): PenaltyTotals {
  const inMonth = (p: Penalty) => !month || p.occurred_on.startsWith(month);
  const sum = (f: (p: Penalty) => boolean) => r2(rows.filter((p) => inMonth(p) && f(p)).reduce((s, p) => s + Number(p.amount || 0), 0));
  return {
    withheld: sum((p) => p.kind === 'client_withholding' && p.status !== 'refunded'),
    withheldOpen: sum((p) => p.kind === 'client_withholding' && (p.status === 'open' || p.status === 'contested')),
    lateClaimed: sum((p) => p.kind === 'late_payment' && p.status === 'open'),
    lateCollected: sum((p) => p.kind === 'late_payment' && p.status === 'paid'),
    finesOpen: sum((p) => p.kind === 'fine' && (p.status === 'open' || p.status === 'contested')),
    finesToDesignate: rows.filter((p) => p.kind === 'fine' && p.status === 'open').length,
  };
}
