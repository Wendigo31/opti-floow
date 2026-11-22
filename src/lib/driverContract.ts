/**
 * Contrat d'un conducteur routier de marchandises — convention collective des
 * transports routiers (IDCC 16). Fichier identique dans OptiFret, OptiFlow et OptiXpress.
 *
 * Sources (vérifiées le 22/11/2026, à revoir à chaque accord de branche) :
 *  - temps de service et équivalences : Code des transports (décret 83-40 modifié) :
 *    longue distance (« grand routier », au moins 6 repos journaliers par mois hors du
 *    domicile) 43 h/semaine = 186,33 h/mois ; courte distance 39 h = 169 h ;
 *    heures d'équivalence (de la 36e à la 43e ou 39e heure) payées +25 % ;
 *    heures sup. +25 % (courte distance, 40e à 43e heure), +50 % au-delà de 43 h ;
 *  - taux horaires à l'embauche (grille ouvriers marchandises en vigueur en 2026) et
 *    majorations d'ancienneté +2 % (2 ans), +4 % (5 ans), +6 % (10 ans), +8 % (15 ans) ;
 *    le SMIC (12,31 €/h depuis le 1er juin 2026) prime quand il est plus élevé ;
 *  - frais de déplacement 2026 (avenant du 2 décembre 2025 au protocole du 30 avril 1974) ;
 *  - travail de nuit (21 h – 6 h) : prime horaire de 20 % du taux horaire à l'embauche
 *    du coefficient 150M (accord du 14 novembre 2001).
 * La société reste libre de payer plus ; l'expert-comptable valide le paramétrage.
 */

export type DriverCategory = 'longue_distance' | 'courte_distance' | 'messagerie';

export const CATEGORY_INFO: Record<DriverCategory, { label: string; hint: string; weeklyHours: number; monthlyHours: number }> = {
  longue_distance: { label: 'Longue distance (grand routier)', hint: 'Au moins 6 repos journaliers par mois hors du domicile', weeklyHours: 43, monthlyHours: 186.33 },
  courte_distance: { label: 'Courte distance', hint: 'Rentre chez lui la plupart des soirs', weeklyHours: 39, monthlyHours: 169 },
  messagerie: { label: 'Messagerie / 35 h', hint: 'Messagerie, fonds et valeurs, véhicules légers : 35 h', weeklyHours: 35, monthlyHours: 151.67 },
};

export const LEGAL_MONTHLY_HOURS = 151.67;
/** Seuil mensuel au-delà duquel les heures sont majorées de 50 % (43 h × 52 / 12). */
export const HS50_MONTHLY_THRESHOLD = 186.33;

export type Coefficient = '128M' | '138M' | '150M';

export const COEFFICIENTS: Record<Coefficient, { label: string; hiringRate: number }> = {
  '128M': { label: '128M — groupe 5 (porteur)', hiringRate: 12.12 },
  '138M': { label: '138M — groupe 6 (porteur de plus de 19 t)', hiringRate: 12.14 },
  '150M': { label: '150M — groupe 7 (ensemble articulé / SPL, hautement qualifié)', hiringRate: 12.43 },
};

export const SMIC_HOURLY_2026 = 12.31;

/** Frais de déplacement 2026 (ouvriers, marchandises). +18 % à l'étranger. */
export const ROAD_ALLOWANCES_2026 = {
  repas: 16.36,
  repasUnique: 10.07,
  repasUniqueNuit: 9.81,
  casseCroute: 8.87,
  speciale: 4.42,
  grandDeplacement1Repas: 52.31,
  grandDeplacement2Repas: 68.67,
  foreignMajorationPct: 18,
};

/** Prime horaire de nuit : 20 % du taux à l'embauche du 150M. */
export const NIGHT_PREMIUM_PER_HOUR = Math.round(COEFFICIENTS['150M'].hiringRate * 0.2 * 100) / 100;

/** Années d'ancienneté complètes à une date. */
export function seniorityYears(hireDate: string | null | undefined, at: Date = new Date()): number {
  if (!hireDate) return 0;
  const h = new Date(`${hireDate.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(h.getTime())) return 0;
  let y = at.getFullYear() - h.getFullYear();
  if (at.getMonth() < h.getMonth() || (at.getMonth() === h.getMonth() && at.getDate() < h.getDate())) y--;
  return Math.max(0, y);
}

export function seniorityMultiplier(years: number): number {
  if (years >= 15) return 1.08;
  if (years >= 10) return 1.06;
  if (years >= 5) return 1.04;
  if (years >= 2) return 1.02;
  return 1;
}

const r2 = (n: number) => Math.round(n * 100) / 100;

export interface ContractPreset {
  category: DriverCategory;
  coefficient: Coefficient;
  weeklyHours: number;
  monthlyHours: number;
  /** Heures d'équivalence comprises chaque mois (payées +25 %). */
  equivalenceHours: number;
  /** Taux horaire brut minimum (grille + ancienneté, au moins le SMIC). */
  hourlyRate: number;
  /** Salaire brut mensuel minimum du contrat (151,67 h + équivalences à 125 %). */
  baseSalary: number;
  seniorityYears: number;
  usesSmic: boolean;
  mealAllowance: number;
  overnightAllowance: number;
}

/** Valeurs minimales d'un nouveau contrat selon la catégorie, le coefficient et l'ancienneté. */
export function contractPreset(category: DriverCategory, coefficient: Coefficient, hireDate?: string | null, at: Date = new Date(), smicHourly = SMIC_HOURLY_2026): ContractPreset {
  const cat = CATEGORY_INFO[category];
  const years = seniorityYears(hireDate, at);
  const grid = r2(COEFFICIENTS[coefficient].hiringRate * seniorityMultiplier(years));
  const hourlyRate = Math.max(grid, smicHourly);
  const equivalenceHours = r2(Math.max(0, cat.monthlyHours - LEGAL_MONTHLY_HOURS));
  return {
    category,
    coefficient,
    weeklyHours: cat.weeklyHours,
    monthlyHours: cat.monthlyHours,
    equivalenceHours,
    hourlyRate,
    baseSalary: r2(hourlyRate * LEGAL_MONTHLY_HOURS + hourlyRate * 1.25 * equivalenceHours),
    seniorityYears: years,
    usesSmic: smicHourly > grid,
    mealAllowance: ROAD_ALLOWANCES_2026.repas,
    overnightAllowance: ROAD_ALLOWANCES_2026.grandDeplacement1Repas,
  };
}

/**
 * Répartition des heures de temps de service d'un mois (décompte mensuel) :
 * normales (151,67 h), équivalences +25 %, heures sup. +25 % et +50 %.
 */
export function splitServiceHours(serviceHours: number, category: DriverCategory) {
  const s = Math.max(0, serviceHours);
  const normal = Math.min(s, LEGAL_MONTHLY_HOURS);
  const above = Math.max(0, s - LEGAL_MONTHLY_HOURS);
  const eqCap = Math.max(0, CATEGORY_INFO[category].monthlyHours - LEGAL_MONTHLY_HOURS);
  const equivalence25 = Math.min(above, eqCap);
  const band25 = Math.max(0, HS50_MONTHLY_THRESHOLD - LEGAL_MONTHLY_HOURS - eqCap);
  const overtime25 = Math.min(Math.max(0, above - eqCap), band25);
  const overtime50 = Math.max(0, s - HS50_MONTHLY_THRESHOLD);
  return { normal: r2(normal), equivalence25: r2(equivalence25), overtime25: r2(overtime25), overtime50: r2(overtime50) };
}
