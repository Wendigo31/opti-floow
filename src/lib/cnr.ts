/**
 * Comparaison avec le coût de revient de référence du CNR (Comité national routier),
 * formule « trinôme » : coût = CK × km + CC × heures + CJ × jours.
 * Valeurs par défaut : longue distance ensemble articulé 40-44 t gazole, conditions
 * économiques de décembre 2025 (cnr.fr). Chaque société peut les remplacer par les valeurs
 * de son activité (régional, porteur, frigo…). Fichier identique dans OptiFret et OptiFlow.
 */
export interface CnrReference {
  label: string;
  /** Terme kilométrique, péages compris (€/km). */
  ck: number;
  /** Terme horaire conducteur (€/h). */
  cc: number;
  /** Terme journalier véhicule + structure (€/jour). */
  cj: number;
  /** Heures de service comptées pour une journée d'exploitation. */
  hoursPerDay: number;
}

export const CNR_DEFAULT: CnrReference = {
  label: 'CNR longue distance ensemble articulé gazole — décembre 2025',
  ck: 0.572,
  cc: 30.39,
  cj: 255.42,
  hoursPerDay: 10,
};

export interface CnrOperation {
  id: string;
  date: string;
  label: string;
  km: number;
  /** Heures de service (conduite + chargement). */
  hours: number;
  /** Prix facturé HT. */
  revenue: number;
}

export interface CnrResult extends CnrOperation {
  cnrCost: number;
  gap: number;
  gapPct: number | null;
}

export function cnrCost(ref: CnrReference, km: number, hours: number): number {
  const days = ref.hoursPerDay > 0 ? hours / ref.hoursPerDay : 0;
  return Math.round((ref.ck * km + ref.cc * hours + ref.cj * days) * 100) / 100;
}

/** Heures estimées quand l'opération n'en donne pas : 65 km/h de moyenne + 2 h de chargement / déchargement. */
export const estimateHours = (km: number) => Math.round((km / 65 + 2) * 10) / 10;

export function compareToCnr(ref: CnrReference, ops: CnrOperation[]): { rows: CnrResult[]; revenue: number; cnr: number; gap: number; below: number } {
  const rows = ops
    .filter((o) => o.km > 0)
    .map((o) => {
      const c = cnrCost(ref, o.km, o.hours);
      const gap = Math.round((o.revenue - c) * 100) / 100;
      return { ...o, cnrCost: c, gap, gapPct: c > 0 ? (gap / c) * 100 : null };
    });
  const revenue = rows.reduce((s, r) => s + r.revenue, 0);
  const cnr = rows.reduce((s, r) => s + r.cnrCost, 0);
  return { rows, revenue, cnr, gap: revenue - cnr, below: rows.filter((r) => r.gap < 0).length };
}

const KEY = 'opti-cnr-reference';
export function loadCnrReference(licenseId?: string | null): CnrReference {
  try {
    const raw = localStorage.getItem(`${KEY}:${licenseId ?? ''}`);
    if (raw) return { ...CNR_DEFAULT, ...JSON.parse(raw) };
  } catch { /* stockage indisponible */ }
  return CNR_DEFAULT;
}
export function saveCnrReference(ref: CnrReference, licenseId?: string | null) {
  try { localStorage.setItem(`${KEY}:${licenseId ?? ''}`, JSON.stringify(ref)); } catch { /* stockage indisponible */ }
}
