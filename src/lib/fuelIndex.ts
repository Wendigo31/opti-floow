import { generateId, type InvoiceLine } from "@/lib/invoices";

/**
 * Indexation gazole (article L3222-1 du Code des transports) : la part du gazole
 * dans le prix suit l'indice publié chaque mois par le CNR.
 * Surcoût HT = montant HT × part gazole × (indice du mois − indice de référence) / indice de référence.
 */
export interface FuelIndexSettings {
  enabled: boolean;
  /** Part du gazole dans le prix (%) — souvent 20 à 30 % en messagerie / VUL. */
  sharePct: number;
  /** Indice CNR inscrit au contrat. */
  refIndex: number | null;
  /** Indice CNR du mois facturé. */
  currentIndex: number | null;
}

export const DEFAULT_FUEL_INDEX: FuelIndexSettings = { enabled: false, sharePct: 25, refIndex: null, currentIndex: null };

export function fuelSurcharge(amountHT: number, s: FuelIndexSettings): number {
  if (!s.enabled || !s.refIndex || !s.currentIndex) return 0;
  return Math.round(amountHT * (s.sharePct / 100) * ((s.currentIndex - s.refIndex) / s.refIndex) * 100) / 100;
}

/** Lignes de la facture avec la ligne d'indexation ajoutée ou recalculée (une seule). */
export function withFuelLine(lines: InvoiceLine[], s: FuelIndexSettings): InvoiceLine[] {
  const base = lines.filter((l) => !l.fuel);
  const ht = base.reduce((sum, l) => sum + (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0), 0);
  const amount = fuelSurcharge(ht, s);
  if (!amount) return base;
  const existing = lines.find((l) => l.fuel);
  return [
    ...base,
    {
      id: existing?.id ?? generateId("line"),
      description: `Indexation gazole CNR (indice ${s.refIndex} → ${s.currentIndex}, part gazole ${s.sharePct} %)`,
      quantity: 1,
      unitPrice: amount,
      fuel: true,
    },
  ];
}
