/**
 * Bulletin de paie — calcul (salarié non cadre, transport routier, CCN 16).
 *
 * Valeurs par défaut 2026 (SMIC 12,31 €/h depuis le 1er juin 2026, PMSS 4 005 €)
 * et taux de cotisations usuels ; TOUS les taux sont modifiables par la société
 * (Paramètres de paie) et doivent être validés par l'expert-comptable :
 * AT/MP, prévoyance de branche, mutuelle et taux de prélèvement à la source
 * dépendent de chaque entreprise et de chaque salarié.
 *
 * Réduction générale dégressive unique (RGDU 2026), calcul mensuel :
 *   C = Tmin + Tdelta × [½ × (3 × SMIC du mois / brut − 1)]^P, plafonné à Tmin + Tdelta,
 *   nulle à partir de 3 SMIC. SMIC de la formule gelé à 12,02 €/h pour 2026.
 *   Tmin 0,02 ; Tdelta 0,3781 (FNAL 0,10 %) ou 0,3821 (FNAL 0,50 %) ; P 1,75.
 * Elle ne change pas le net du salarié, seulement le coût employeur.
 * Non gérés : régularisation annuelle/progressive, temps d'équivalence des
 * conducteurs grands routiers dans le SMIC de référence (à faire valider).
 */

export interface PayrollRates {
  smicHourly: number;
  pmss: number;
  /** Taux en % */
  maladieEmployer: number;           // 13 %, réduit à 7 % jusqu'à 2,25 SMIC
  maladieReducedEmployer: number;
  maladieReducedThresholdSmic: number;
  vieillessePlafSalarie: number;
  vieillessePlafEmployer: number;
  vieillesseDeplafSalarie: number;
  vieillesseDeplafEmployer: number;
  allocFamEmployer: number;          // 3,45 % (5,25 % au-delà de 3,5 SMIC)
  allocFamHighEmployer: number;
  atmpEmployer: number;              // propre à l'entreprise
  chomageEmployer: number;
  agsEmployer: number;
  fnalEmployer: number;              // 0,10 % (< 50 salariés) ou 0,50 %
  csaEmployer: number;               // contribution solidarité autonomie
  dialogueSocialEmployer: number;
  formationEmployer: number;         // 0,55 % (< 11 sal.) ou 1 %
  apprentissageEmployer: number;
  retraiteT1Salarie: number;
  retraiteT1Employer: number;
  cegT1Salarie: number;
  cegT1Employer: number;
  retraiteT2Salarie: number;
  retraiteT2Employer: number;
  cegT2Salarie: number;
  cegT2Employer: number;
  cetSalarie: number;
  cetEmployer: number;
  prevoyanceSalarie: number;         // prévoyance de branche (CCN transport) : à adapter
  prevoyanceEmployer: number;
  mutuelleSalarie: number;           // montant mensuel en €
  mutuelleEmployer: number;          // montant mensuel en €
  csgDeductible: number;             // 6,8 %
  csgNonDeductible: number;          // 2,4 %
  crds: number;                      // 0,5 %
  csgBaseRatio: number;              // 98,25 % du brut
  overtimeEmployeeReduction: number; // réduction salariale heures sup (11,31 %)
  overtimeTaxFreeCap: number;        // exonération d'impôt annuelle (7 500 €)
  /** Réduction générale dégressive unique (1 = appliquée, 0 = non) */
  rgduEnabled: number;
  rgduSmicHourly: number;            // SMIC retenu dans la formule (gelé 12,02 € en 2026)
  rgduTmin: number;
  /** Tdelta ; 0 = automatique selon le FNAL (0,3781 ou 0,3821) */
  rgduTdelta: number;
  rgduP: number;
}

export const DEFAULT_PAYROLL_RATES: PayrollRates = {
  smicHourly: 12.31,
  pmss: 4005,
  maladieEmployer: 13,
  maladieReducedEmployer: 7,
  maladieReducedThresholdSmic: 2.25,
  vieillessePlafSalarie: 6.9,
  vieillessePlafEmployer: 8.55,
  vieillesseDeplafSalarie: 0.4,
  vieillesseDeplafEmployer: 2.11,
  allocFamEmployer: 3.45,
  allocFamHighEmployer: 5.25,
  atmpEmployer: 3.5,
  chomageEmployer: 4,
  agsEmployer: 0.25,
  fnalEmployer: 0.1,
  csaEmployer: 0.3,
  dialogueSocialEmployer: 0.016,
  formationEmployer: 0.55,
  apprentissageEmployer: 0.68,
  retraiteT1Salarie: 3.15,
  retraiteT1Employer: 4.72,
  cegT1Salarie: 0.86,
  cegT1Employer: 1.29,
  retraiteT2Salarie: 8.64,
  retraiteT2Employer: 12.95,
  cegT2Salarie: 1.08,
  cegT2Employer: 1.62,
  cetSalarie: 0.14,
  cetEmployer: 0.21,
  prevoyanceSalarie: 0.8,
  prevoyanceEmployer: 0.8,
  mutuelleSalarie: 25,
  mutuelleEmployer: 25,
  csgDeductible: 6.8,
  csgNonDeductible: 2.4,
  crds: 0.5,
  csgBaseRatio: 98.25,
  overtimeEmployeeReduction: 11.31,
  overtimeTaxFreeCap: 7500,
  rgduEnabled: 1,
  rgduSmicHourly: 12.02,
  rgduTmin: 0.02,
  rgduTdelta: 0,
  rgduP: 1.75,
};

/** Coefficient de la réduction générale (RGDU 2026) pour un brut et un nombre d'heures du mois. */
export function rgduCoefficient(gross: number, paidHours: number, rates: PayrollRates = DEFAULT_PAYROLL_RATES): number {
  if (!rates.rgduEnabled || gross <= 0) return 0;
  const smicRef = rates.rgduSmicHourly * Math.max(0, paidHours);
  if (!smicRef || gross >= 3 * smicRef) return 0;
  const tdelta = rates.rgduTdelta || (rates.fnalEmployer >= 0.5 ? 0.3821 : 0.3781);
  const ratio = Math.max(0, 0.5 * ((3 * smicRef) / gross - 1));
  const c = rates.rgduTmin + tdelta * Math.pow(ratio, rates.rgduP);
  return Math.round(Math.min(c, rates.rgduTmin + tdelta) * 10000) / 10000;
}

export interface PayslipInput {
  /** Taux horaire brut */
  hourlyRate: number;
  /** Heures mensualisées (151,67 h = 35 h/semaine) */
  baseHours: number;
  overtime25Hours: number;
  overtime50Hours: number;
  /** Heures de nuit et de dimanche / jour férié (majorations) */
  nightHours: number;
  nightRatePct: number;
  sundayHours: number;
  sundayRatePct: number;
  /** Primes soumises (ancienneté, qualité…) */
  bonuses: { label: string; amount: number }[];
  /** Absence non rémunérée : heures à déduire */
  unpaidAbsenceHours: number;
  /** Frais de route non soumis (URSSAF) */
  mealAllowanceCount: number;
  mealAllowanceUnit: number;
  overnightCount: number;
  overnightUnit: number;
  otherAllowances: number;
  /** Prélèvement à la source (taux personnalisé, %) */
  withholdingRatePct: number;
  /** Heures sup déjà exonérées d'impôt cette année (pour le plafond) */
  overtimeTaxFreeUsedYtd: number;
}

export interface PayslipLine {
  key: string;
  section: 'brut' | 'sante' | 'retraite' | 'famille' | 'chomage' | 'autres' | 'csg' | 'non-soumis' | 'impot';
  label: string;
  base: number | null;
  employeeRate: number | null;
  /** Brut et frais : montant gagné ; cotisations et impôt : montant retenu (négatif = en faveur du salarié). */
  employeeAmount: number;
  employerRate: number | null;
  employerAmount: number;
}

export interface PayslipResult {
  gross: number;
  overtimePay: number;
  lines: PayslipLine[];
  employeeContributions: number;
  employerContributions: number;
  netBeforeTax: number;       // net à payer avant impôt
  netTaxable: number;         // net imposable
  netSocial: number;          // montant net social
  withholdingTax: number;
  allowances: number;         // frais non soumis
  netToPay: number;
  employerCost: number;
}

const r2 = (n: number) => Math.round(n * 100) / 100;
const pct = (base: number, rate: number) => r2((base * rate) / 100);

export function computePayslip(input: PayslipInput, rates: PayrollRates = DEFAULT_PAYROLL_RATES): PayslipResult {
  const h = Math.max(0, input.hourlyRate || 0);
  const lines: PayslipLine[] = [];
  const brut = (key: string, label: string, base: number | null, rate: number | null, amount: number) =>
    lines.push({ key, section: 'brut', label, base, employeeRate: rate, employeeAmount: r2(amount), employerRate: null, employerAmount: 0 });

  const basePay = r2(h * (input.baseHours || 0));
  brut('base', 'Salaire de base', input.baseHours, h, basePay);
  const ot25 = r2(h * 1.25 * (input.overtime25Hours || 0));
  const ot50 = r2(h * 1.5 * (input.overtime50Hours || 0));
  if (ot25) brut('ot25', 'Heures supplémentaires à 25 %', input.overtime25Hours, r2(h * 1.25), ot25);
  if (ot50) brut('ot50', 'Heures supplémentaires à 50 %', input.overtime50Hours, r2(h * 1.5), ot50);
  const night = r2(h * ((input.nightRatePct || 0) / 100) * (input.nightHours || 0));
  if (night) brut('night', `Majoration heures de nuit (${input.nightRatePct} %)`, input.nightHours, r2(h * input.nightRatePct / 100), night);
  const sunday = r2(h * ((input.sundayRatePct || 0) / 100) * (input.sundayHours || 0));
  if (sunday) brut('sunday', `Majoration dimanche / férié (${input.sundayRatePct} %)`, input.sundayHours, r2(h * input.sundayRatePct / 100), sunday);
  let bonuses = 0;
  input.bonuses.filter((b) => b.amount).forEach((b, i) => {
    bonuses += b.amount;
    brut(`bonus${i}`, b.label || 'Prime', null, null, b.amount);
  });
  const absence = r2(h * (input.unpaidAbsenceHours || 0));
  if (absence) brut('absence', 'Absence non rémunérée', input.unpaidAbsenceHours, h, -absence);

  const overtimePay = r2(ot25 + ot50);
  const gross = r2(basePay + overtimePay + night + sunday + bonuses - absence);
  const t1 = Math.min(gross, rates.pmss);
  const t2 = Math.max(0, Math.min(gross, 8 * rates.pmss) - rates.pmss);
  const smicMonth = rates.smicHourly * 151.67;

  const add = (section: PayslipLine['section'], key: string, label: string, base: number, sRate: number | null, eRate: number | null) => {
    const s = sRate ? pct(base, sRate) : 0;
    const e = eRate ? pct(base, eRate) : 0;
    if (!s && !e) return;
    lines.push({ key, section, label, base: r2(base), employeeRate: sRate, employeeAmount: s, employerRate: eRate, employerAmount: e });
  };
  const fixed = (section: PayslipLine['section'], key: string, label: string, s: number, e: number) => {
    if (!s && !e) return;
    lines.push({ key, section, label, base: null, employeeRate: null, employeeAmount: r2(s), employerRate: null, employerAmount: r2(e) });
  };

  // Santé
  const maladieRate = gross <= rates.maladieReducedThresholdSmic * smicMonth ? rates.maladieReducedEmployer : rates.maladieEmployer;
  add('sante', 'maladie', 'Sécurité sociale — maladie, maternité, invalidité, décès', gross, null, maladieRate);
  add('sante', 'prevoyance', 'Prévoyance (convention collective)', t1, rates.prevoyanceSalarie, rates.prevoyanceEmployer);
  fixed('sante', 'mutuelle', 'Complémentaire santé (mutuelle)', rates.mutuelleSalarie, rates.mutuelleEmployer);
  add('autres', 'atmp', 'Accidents du travail — maladies professionnelles', gross, null, rates.atmpEmployer);
  // Retraite
  add('retraite', 'vieillesse-plaf', 'Sécurité sociale plafonnée', t1, rates.vieillessePlafSalarie, rates.vieillessePlafEmployer);
  add('retraite', 'vieillesse-deplaf', 'Sécurité sociale déplafonnée', gross, rates.vieillesseDeplafSalarie, rates.vieillesseDeplafEmployer);
  add('retraite', 'retraite-t1', 'Complémentaire tranche 1 (Agirc-Arrco)', t1, rates.retraiteT1Salarie, rates.retraiteT1Employer);
  add('retraite', 'ceg-t1', 'Contribution d\'équilibre général T1', t1, rates.cegT1Salarie, rates.cegT1Employer);
  if (t2 > 0) {
    add('retraite', 'retraite-t2', 'Complémentaire tranche 2 (Agirc-Arrco)', t2, rates.retraiteT2Salarie, rates.retraiteT2Employer);
    add('retraite', 'ceg-t2', 'Contribution d\'équilibre général T2', t2, rates.cegT2Salarie, rates.cegT2Employer);
    add('retraite', 'cet', 'Contribution d\'équilibre technique', Math.min(gross, 8 * rates.pmss), rates.cetSalarie, rates.cetEmployer);
  }
  // Famille, chômage, autres
  add('famille', 'alloc', 'Allocations familiales', gross, null, gross > 3.5 * smicMonth ? rates.allocFamHighEmployer : rates.allocFamEmployer);
  add('chomage', 'chomage', 'Assurance chômage', Math.min(gross, 4 * rates.pmss), null, rates.chomageEmployer);
  add('chomage', 'ags', 'AGS (garantie des salaires)', Math.min(gross, 4 * rates.pmss), null, rates.agsEmployer);
  add('autres', 'fnal', 'FNAL', t1, null, rates.fnalEmployer);
  add('autres', 'csa', 'Contribution solidarité autonomie', gross, null, rates.csaEmployer);
  add('autres', 'dialogue', 'Contribution au dialogue social', gross, null, rates.dialogueSocialEmployer);
  add('autres', 'formation', 'Formation professionnelle', gross, null, rates.formationEmployer);
  add('autres', 'apprentissage', 'Taxe d\'apprentissage', gross, null, rates.apprentissageEmployer);

  // Réduction générale des cotisations patronales (RGDU). Heures de référence :
  // heures payées (base + heures sup, hors majoration) − absences non payées.
  const refHours = (input.baseHours || 0) + (input.overtime25Hours || 0) + (input.overtime50Hours || 0) - (input.unpaidAbsenceHours || 0);
  const rgduCoef = rgduCoefficient(gross, refHours, rates);
  if (rgduCoef > 0) {
    // Plafonnée aux cotisations patronales qu'elle couvre (Urssaf, chômage, retraite
    // complémentaire T1 ; AT/MP dans la limite de 0,50 %), pour ne jamais dépasser leur montant.
    const covered = new Set(['maladie', 'vieillesse-plaf', 'vieillesse-deplaf', 'alloc', 'fnal', 'csa', 'chomage', 'retraite-t1', 'ceg-t1']);
    const eligible = lines.filter((l) => covered.has(l.key)).reduce((a, l) => a + l.employerAmount, 0) + pct(gross, Math.min(rates.atmpEmployer, 0.5));
    const reduction = r2(Math.min(gross * rgduCoef, eligible));
    lines.push({ key: 'rgdu', section: 'autres', label: 'Réduction générale des cotisations patronales', base: gross, employeeRate: null, employeeAmount: 0, employerRate: -r2(rgduCoef * 100), employerAmount: -reduction });
  }

  // Réduction salariale sur heures supplémentaires (dans la limite des cotisations vieillesse)
  const otReduction = overtimePay ? r2(Math.min(pct(overtimePay, rates.overtimeEmployeeReduction), pct(overtimePay, rates.vieillessePlafSalarie + rates.vieillesseDeplafSalarie + rates.retraiteT1Salarie + rates.cegT1Salarie))) : 0;
  if (otReduction) {
    lines.push({ key: 'ot-reduction', section: 'retraite', label: 'Réduction de cotisations sur heures supplémentaires', base: overtimePay, employeeRate: -rates.overtimeEmployeeReduction, employeeAmount: -otReduction, employerRate: null, employerAmount: 0 });
  }

  // CSG / CRDS (98,25 % du brut + part patronale prévoyance / mutuelle)
  const csgBase = r2((gross * rates.csgBaseRatio) / 100 + pct(t1, rates.prevoyanceEmployer) + rates.mutuelleEmployer);
  add('csg', 'csg-ded', 'CSG déductible de l\'impôt sur le revenu', csgBase, rates.csgDeductible, null);
  add('csg', 'csg-nonded', 'CSG/CRDS non déductible', csgBase, rates.csgNonDeductible + rates.crds, null);

  const sumS = (filter: (l: PayslipLine) => boolean) => r2(lines.filter((l) => l.section !== 'brut' && l.section !== 'non-soumis' && filter(l)).reduce((a, l) => a + l.employeeAmount, 0));
  const employeeContributions = sumS(() => true);
  const employerContributions = r2(lines.reduce((a, l) => a + l.employerAmount, 0));
  const netBeforeTax = r2(gross - employeeContributions);

  // Net imposable : + CSG/CRDS non déductible + part patronale mutuelle − heures sup exonérées (plafond annuel)
  const csgNonDed = lines.find((l) => l.key === 'csg-nonded')?.employeeAmount || 0;
  const otExempt = Math.max(0, Math.min(overtimePay - otReduction, rates.overtimeTaxFreeCap - (input.overtimeTaxFreeUsedYtd || 0)));
  const netTaxable = r2(netBeforeTax + csgNonDed + rates.mutuelleEmployer - otExempt);
  const withholdingTax = pct(Math.max(0, netTaxable), input.withholdingRatePct || 0);
  if (withholdingTax) {
    lines.push({ key: 'pas', section: 'impot', label: `Impôt sur le revenu prélevé à la source (${input.withholdingRatePct} %)`, base: netTaxable, employeeRate: input.withholdingRatePct, employeeAmount: withholdingTax, employerRate: null, employerAmount: 0 });
  }

  // Montant net social : brut − cotisations salariales obligatoires hors CSG/CRDS
  const netSocial = r2(gross - sumS((l) => l.section !== 'csg' && l.section !== 'impot'));

  const meals = r2((input.mealAllowanceCount || 0) * (input.mealAllowanceUnit || 0));
  const nights = r2((input.overnightCount || 0) * (input.overnightUnit || 0));
  const allowances = r2(meals + nights + (input.otherAllowances || 0));
  if (meals) lines.push({ key: 'meals', section: 'non-soumis', label: 'Indemnités de repas', base: input.mealAllowanceCount, employeeRate: input.mealAllowanceUnit, employeeAmount: meals, employerRate: null, employerAmount: 0 });
  if (nights) lines.push({ key: 'overnight', section: 'non-soumis', label: 'Indemnités de grand déplacement (découchés)', base: input.overnightCount, employeeRate: input.overnightUnit, employeeAmount: nights, employerRate: null, employerAmount: 0 });
  if (input.otherAllowances) lines.push({ key: 'other', section: 'non-soumis', label: 'Autres frais remboursés', base: null, employeeRate: null, employeeAmount: r2(input.otherAllowances), employerRate: null, employerAmount: 0 });

  const netToPay = r2(netBeforeTax - withholdingTax + allowances);
  // Ordre du bulletin : brut, santé, retraite, famille, chômage, autres, CSG, impôt, frais.
  const ORDER: PayslipLine['section'][] = ['brut', 'sante', 'retraite', 'famille', 'chomage', 'autres', 'csg', 'impot', 'non-soumis'];
  lines.sort((a, b) => ORDER.indexOf(a.section) - ORDER.indexOf(b.section));
  return {
    gross,
    overtimePay,
    lines,
    employeeContributions,
    employerContributions,
    netBeforeTax,
    netTaxable,
    netSocial,
    withholdingTax,
    allowances,
    netToPay,
    employerCost: r2(gross + employerContributions + allowances),
  };
}

export const emptyPayslipInput = (hourlyRate = DEFAULT_PAYROLL_RATES.smicHourly): PayslipInput => ({
  hourlyRate,
  baseHours: 151.67,
  overtime25Hours: 0,
  overtime50Hours: 0,
  nightHours: 0,
  nightRatePct: 20,
  sundayHours: 0,
  sundayRatePct: 100,
  bonuses: [],
  unpaidAbsenceHours: 0,
  mealAllowanceCount: 0,
  mealAllowanceUnit: 16.3,
  overnightCount: 0,
  overnightUnit: 50.3,
  otherAllowances: 0,
  withholdingRatePct: 0,
  overtimeTaxFreeUsedYtd: 0,
});
