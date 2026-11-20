import './jspdfFrenchSpaces';
import { drawCompanyLogo } from './companyLogo';
import jsPDF from 'jspdf';
import type { PayslipInput, PayslipLine, PayslipResult } from '@/lib/payslipCalc';

export interface PayslipPDFData {
  period: string; // AAAA-MM
  employer: {
    name: string;
    legalForm?: string | null;
    address?: string | null;
    postalCode?: string | null;
    city?: string | null;
    siret?: string | null;
    naf?: string | null;
    convention?: string | null;
  };
  employee: {
    name: string;
    job?: string | null;
    classification?: string | null;
  };
  input: PayslipInput;
  result: PayslipResult;
  status: 'draft' | 'validated';
}

// jsPDF n'a pas l'espace fine insécable utilisée par fr-FR : remplacée par une espace simple.
const plain = (t: string) => t.replace(/[\u202f\u00a0]/g, ' ');
const eur = (n: number) => plain(`${n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`);
const num = (n: number | null) => (n === null || n === undefined ? '' : plain(n.toLocaleString('fr-FR', { maximumFractionDigits: 4 })));
const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

export function periodLabel(period: string) {
  const [y, m] = period.split('-').map(Number);
  return `${MONTHS[(m || 1) - 1]} ${y}`;
}

const SECTION_TITLES: Record<PayslipLine['section'], string> = {
  brut: 'Salaire brut',
  sante: 'Santé',
  retraite: 'Retraite',
  famille: 'Famille',
  chomage: 'Assurance chômage',
  autres: 'Autres contributions dues par l\'employeur',
  csg: 'CSG / CRDS',
  'non-soumis': 'Frais professionnels non soumis à cotisations',
  impot: 'Impôt sur le revenu',
};

/** Bulletin de paie au format A4 (présentation simplifiée réglementaire). */
export function buildPayslipPDF(d: PayslipPDFData): jsPDF {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = pdf.internal.pageSize.getWidth();
  const H = pdf.internal.pageSize.getHeight();
  const M = 12;
  let y = 14;
  if (drawCompanyLogo(pdf, M, 4, 45, 13)) y = 24;

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(15);
  pdf.text('BULLETIN DE PAIE', M, y);
  pdf.setFontSize(10);
  pdf.text(`Période : ${periodLabel(d.period)}`, W - M, y, { align: 'right' });
  if (d.status === 'draft') {
    pdf.setTextColor(200, 60, 60);
    pdf.text('BROUILLON', W - M, y + 5, { align: 'right' });
    pdf.setTextColor(0, 0, 0);
  }
  y += 8;

  // Employeur / salarié
  const boxW = (W - M * 2 - 6) / 2;
  const box = (x: number, title: string, lines: string[]) => {
    pdf.setDrawColor(200);
    pdf.roundedRect(x, y, boxW, 32, 2, 2);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    pdf.text(title, x + 3, y + 5);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    lines.filter(Boolean).slice(0, 6).forEach((l, i) => pdf.text(pdf.splitTextToSize(l, boxW - 6)[0], x + 3, y + 10 + i * 4));
  };
  box(M, 'Employeur', [
    [d.employer.name, d.employer.legalForm].filter(Boolean).join(' — '),
    d.employer.address || '',
    [d.employer.postalCode, d.employer.city].filter(Boolean).join(' '),
    d.employer.siret ? `SIRET : ${d.employer.siret}` : '',
    d.employer.naf ? `Code NAF : ${d.employer.naf}` : '',
    d.employer.convention ? `Convention collective : ${d.employer.convention}` : '',
  ]);
  box(M + boxW + 6, 'Salarié', [
    d.employee.name,
    d.employee.job ? `Emploi : ${d.employee.job}` : '',
    d.employee.classification ? `Classification : ${d.employee.classification}` : '',
    `Taux horaire : ${eur(d.input.hourlyRate)}`,
    `Heures payées : ${num(d.input.baseHours + d.input.overtime25Hours + d.input.overtime50Hours - d.input.unpaidAbsenceHours)} h`,
  ]);
  y += 38;

  // Tableau
  const cols = [M, M + 82, M + 104, M + 126, M + 152, M + 168]; // libellé, base, taux sal., montant sal., taux pat., montant pat.
  const header = () => {
    pdf.setFillColor(235, 240, 245);
    pdf.rect(M, y - 4, W - M * 2, 6, 'F');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7.5);
    ['Rubrique', 'Base', 'Taux sal.', 'Part salarié', 'Taux pat.', 'Part employeur'].forEach((h, i) => pdf.text(h, i === 0 ? cols[0] + 1 : cols[i], y));
    y += 5;
  };
  header();
  pdf.setFont('helvetica', 'normal');

  let lastSection = '';
  for (const l of d.result.lines) {
    if (y > H - 50) {
      pdf.addPage();
      y = 16;
      header();
      pdf.setFont('helvetica', 'normal');
    }
    if (l.section !== lastSection) {
      lastSection = l.section;
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(7.5);
      pdf.text(SECTION_TITLES[l.section], cols[0] + 1, y);
      y += 4;
    }
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7.5);
    pdf.text(pdf.splitTextToSize(l.label, 78)[0], cols[0] + 3, y);
    pdf.text(num(l.base), cols[1], y);
    pdf.text(num(l.employeeRate), cols[2], y);
    if (l.employeeAmount) pdf.text(eur(l.section === 'brut' || l.section === 'non-soumis' ? l.employeeAmount : -l.employeeAmount), cols[3], y);
    pdf.text(num(l.employerRate), cols[4], y);
    if (l.employerAmount) pdf.text(eur(l.employerAmount), cols[5], y);
    y += 4;
    if (l.section === 'brut' && d.result.lines[d.result.lines.indexOf(l) + 1]?.section !== 'brut') {
      pdf.setFont('helvetica', 'bold');
      pdf.text('SALAIRE BRUT', cols[0] + 1, y);
      pdf.text(eur(d.result.gross), cols[3], y);
      y += 5;
    }
  }

  // Totaux
  y += 2;
  pdf.setDrawColor(180);
  pdf.line(M, y, W - M, y);
  y += 5;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  const total = (label: string, value: string, x = cols[3]) => {
    pdf.text(label, cols[0] + 1, y);
    pdf.text(value, x, y);
    y += 5;
  };
  pdf.text('Total des cotisations et contributions', cols[0] + 1, y);
  pdf.text(eur(-d.result.employeeContributions), cols[3], y);
  pdf.text(eur(d.result.employerContributions), cols[5], y);
  y += 6;
  pdf.setFont('helvetica', 'normal');
  total('Net à payer avant impôt sur le revenu', eur(d.result.netBeforeTax));
  total('Net imposable', eur(d.result.netTaxable));
  total('Montant net social', eur(d.result.netSocial));
  if (d.result.withholdingTax) total(`Impôt prélevé à la source (${d.input.withholdingRatePct} %)`, eur(-d.result.withholdingTax));
  if (d.result.allowances) total('Frais professionnels remboursés', eur(d.result.allowances));

  y += 2;
  pdf.setFillColor(20, 120, 90);
  pdf.roundedRect(M, y - 4, W - M * 2, 10, 2, 2, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.text('NET À PAYER AU SALARIÉ', M + 4, y + 2.5);
  pdf.text(eur(d.result.netToPay), W - M - 4, y + 2.5, { align: 'right' });
  pdf.setTextColor(0, 0, 0);
  y += 12;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7);
  pdf.text(`Coût total employeur : ${eur(d.result.employerCost)} (réduction générale déduite)`, M, y);
  y += 4;
  pdf.setTextColor(110);
  const notes = [
    'Dans votre intérêt et pour vous aider à faire valoir vos droits, conservez ce bulletin de paie sans limitation de durée.',
    'Rubrique dédiée au bulletin de paie sur le portail www.service-public.fr.',
    'Bulletin établi avec OptiFret : taux et paramètres de paie à faire valider par votre expert-comptable.',
  ];
  notes.forEach((n) => {
    pdf.text(pdf.splitTextToSize(n, W - M * 2), M, y);
    y += 4;
  });
  return pdf;
}

export function exportPayslipPDF(d: PayslipPDFData) {
  const safe = d.employee.name.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '-');
  buildPayslipPDF(d).save(`bulletin-${safe}-${d.period}.pdf`);
}
