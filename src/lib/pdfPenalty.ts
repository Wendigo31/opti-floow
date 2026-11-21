/**
 * Décompte des pénalités de retard (PDF) à envoyer au client.
 * Fichier partagé (bridge/shared/penalties) : copie identique dans les 3 logiciels.
 */
import jsPDF from 'jspdf';
import { RECOVERY_INDEMNITY, type LateInvoice, type LatePenaltyCalc } from '@/lib/penalties';

const eur = (n: number) => `${n.toFixed(2).replace('.', ',')} €`;
const fr = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;

export function exportLatePenaltyPDF(opts: {
  company: { name: string; address?: string | null; siren?: string | null; email?: string | null };
  invoice: LateInvoice;
  calc: LatePenaltyCalc;
  ratePct: number;
  asOf: string;
}) {
  const { company, invoice, calc, ratePct, asOf } = opts;
  // jsPDF : espaces insécables remplacés (police standard sans ces glyphes).
  const t = (s: string) => s.replace(/[\u00a0\u202f]/g, ' ');
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  let y = 20;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(t(company.name), 20, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  for (const line of [company.address, company.siren ? `SIREN ${company.siren}` : null, company.email].filter(Boolean) as string[]) {
    y += 5;
    doc.text(t(line), 20, y);
  }
  y += 14;
  doc.setFontSize(11);
  doc.text(t(`À l'attention de : ${invoice.clientName}`), 20, y);
  y += 6;
  doc.text(t(`Le ${fr(asOf)}`), 20, y);
  y += 14;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(t('Décompte des pénalités de retard de paiement'), 20, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  y += 10;
  const settled = invoice.paidAt ? `réglée le ${fr(invoice.paidAt.slice(0, 10))}` : `non réglée au ${fr(asOf)}`;
  const intro = `Votre facture n° ${invoice.number}, échue le ${fr(invoice.dueDate)}, a été ${settled}. Conformément à nos conditions générales et à l'article L441-10 du Code de commerce, les pénalités suivantes sont dues de plein droit :`;
  for (const line of doc.splitTextToSize(t(intro), 170)) {
    doc.text(line, 20, y);
    y += 5;
  }
  y += 6;
  const rows: [string, string][] = [
    ['Montant TTC concerné', eur(invoice.amountTTC)],
    ['Jours de retard', String(calc.days)],
    ['Taux annuel des pénalités', `${ratePct.toString().replace('.', ',')} %`],
    [`Pénalités (${eur(invoice.amountTTC)} × ${ratePct.toString().replace('.', ',')} % × ${calc.days} / 365)`, eur(calc.interest)],
    ['Indemnité forfaitaire pour frais de recouvrement (art. D441-5)', eur(RECOVERY_INDEMNITY)],
  ];
  for (const [label, value] of rows) {
    doc.text(t(label), 20, y);
    doc.text(t(value), 190, y, { align: 'right' });
    y += 7;
  }
  doc.setDrawColor(180);
  doc.line(20, y - 3, 190, y - 3);
  y += 3;
  doc.setFont('helvetica', 'bold');
  doc.text(t('Total à régler'), 20, y);
  doc.text(t(eur(calc.total)), 190, y, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  y += 12;
  doc.setFontSize(9);
  for (const line of doc.splitTextToSize(t('Ces sommes sont hors du champ de la TVA. Merci de procéder au règlement sous 8 jours. Pour toute question, répondez simplement à ce courrier.'), 170)) {
    doc.text(line, 20, y);
    y += 5;
  }
  doc.save(`penalites-retard-${invoice.number}.pdf`);
}
