import '@/lib/jspdfFrenchSpaces';
import jsPDF from "jspdf";
import {
  Invoice,
  InvoiceIssuer,
  computeInvoiceTotals,
  formatDateFr,
  formatEuro,
  lineTotal,
} from "@/lib/invoices";

/** Génère la facture en PDF (mise en page vectorielle, pas de capture d'écran). */
export function generateInvoicePdf(invoice: Invoice, issuer: InvoiceIssuer): jsPDF {
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15;
  const right = pageWidth - margin;
  let y = margin;

  // En-tête émetteur
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(16);
  pdf.setTextColor(20, 20, 20);
  pdf.text(issuer.companyName || "Votre société", margin, y);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(90, 90, 90);
  y += 6;
  const issuerLines = [
    issuer.legalForm,
    issuer.addressStreet,
    [issuer.addressPostalCode, issuer.addressCity].filter(Boolean).join(" "),
    issuer.siren ? `SIREN ${issuer.siren}` : "",
    issuer.vatNumber ? `TVA ${issuer.vatNumber}` : "",
    issuer.email,
    issuer.phone,
  ].filter(Boolean) as string[];
  issuerLines.forEach((line) => {
    pdf.text(line, margin, y);
    y += 4.2;
  });

  // Bloc facture (droite)
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(22);
  pdf.setTextColor(234, 88, 12);
  pdf.text(invoice.kind === "credit_note" ? "AVOIR" : "FACTURE", right, margin + 2, { align: "right" });
  pdf.setFontSize(10);
  pdf.setTextColor(40, 40, 40);
  pdf.text(invoice.number, right, margin + 9, { align: "right" });
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(90, 90, 90);
  pdf.setFontSize(9);
  pdf.text(`Date : ${formatDateFr(invoice.issueDate)}`, right, margin + 15, { align: "right" });
  pdf.text(`Échéance : ${formatDateFr(invoice.dueDate)}`, right, margin + 20, { align: "right" });
  if (invoice.periodStart || invoice.periodEnd) {
    pdf.text(
      `Période : ${formatDateFr(invoice.periodStart)} — ${formatDateFr(invoice.periodEnd)}`,
      right,
      margin + 25,
      { align: "right" }
    );
  }

  y = Math.max(y, margin + 32) + 6;

  if (invoice.kind === "credit_note" && invoice.creditOf) {
    pdf.setFillColor(254, 243, 199);
    pdf.roundedRect(margin, y - 4, pageWidth - margin * 2, 10, 2, 2, "F");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    pdf.setTextColor(40, 40, 40);
    const ref = `Avoir sur la facture ${invoice.creditOf.number} — Motif : ${invoice.creditReason || "—"}`;
    pdf.text(pdf.splitTextToSize(ref, pageWidth - margin * 2 - 8)[0], margin + 4, y + 2.5);
    y += 10;
  }

  // Client
  pdf.setDrawColor(230, 230, 230);
  pdf.setFillColor(248, 248, 248);
  pdf.roundedRect(margin, y, pageWidth - margin * 2, 24, 2, 2, "FD");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  pdf.setTextColor(120, 120, 120);
  pdf.text("CLIENT", margin + 4, y + 6);
  pdf.setFontSize(11);
  pdf.setTextColor(20, 20, 20);
  pdf.text(invoice.clientName || "—", margin + 4, y + 12);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(90, 90, 90);
  // Ajouté (demande utilisateur, oct. 2026) : SIREN du client affiché sur la
  // facture, comme déjà fait pour l'émetteur ci-dessus (issuerLines).
  const clientInfo = [
    invoice.clientAddress,
    invoice.clientSiren ? `SIREN ${invoice.clientSiren}` : "",
    invoice.clientEmail,
  ]
    .filter(Boolean)
    .join(" · ");
  if (clientInfo) pdf.text(clientInfo, margin + 4, y + 18);

  y += 32;

  // Tableau des lignes
  const colDesc = margin + 2;
  const colQty = margin + 108;
  const colUnit = margin + 132;
  const colTotal = right - 2;

  const drawTableHeader = () => {
    pdf.setFillColor(30, 41, 59);
    pdf.rect(margin, y, pageWidth - margin * 2, 8, "F");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    pdf.setTextColor(255, 255, 255);
    pdf.text("Désignation", colDesc, y + 5.5);
    pdf.text("Qté", colQty, y + 5.5, { align: "right" });
    pdf.text("P.U. HT", colUnit, y + 5.5, { align: "right" });
    pdf.text("Total HT", colTotal, y + 5.5, { align: "right" });
    y += 8;
  };

  drawTableHeader();
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(30, 30, 30);

  invoice.lines.forEach((line, index) => {
    const wrapped = pdf.splitTextToSize(line.description || "—", 100) as string[];
    const rowHeight = Math.max(8, wrapped.length * 4.5 + 3);

    if (y + rowHeight > pageHeight - 45) {
      pdf.addPage();
      y = margin;
      drawTableHeader();
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(30, 30, 30);
    }

    if (index % 2 === 0) {
      pdf.setFillColor(250, 250, 250);
      pdf.rect(margin, y, pageWidth - margin * 2, rowHeight, "F");
    }
    pdf.setFontSize(9);
    wrapped.forEach((part, i) => pdf.text(part, colDesc, y + 5.5 + i * 4.5));
    pdf.text(String(line.quantity ?? 0), colQty, y + 5.5, { align: "right" });
    pdf.text(formatEuro(line.unitPrice), colUnit, y + 5.5, { align: "right" });
    pdf.text(formatEuro(lineTotal(line)), colTotal, y + 5.5, { align: "right" });
    y += rowHeight;
  });

  // Totaux
  const totals = computeInvoiceTotals(invoice.lines, invoice.taxRate);
  y += 6;
  if (y > pageHeight - 60) {
    pdf.addPage();
    y = margin;
  }
  const boxX = pageWidth / 2;
  pdf.setFontSize(9);
  pdf.setTextColor(90, 90, 90);
  pdf.text("Total HT", boxX, y);
  pdf.setTextColor(20, 20, 20);
  pdf.text(formatEuro(totals.subtotal), colTotal, y, { align: "right" });
  y += 6;
  pdf.setTextColor(90, 90, 90);
  pdf.text(`TVA ${invoice.taxRate} %`, boxX, y);
  pdf.setTextColor(20, 20, 20);
  pdf.text(formatEuro(totals.tax), colTotal, y, { align: "right" });
  y += 3;
  pdf.setDrawColor(200, 200, 200);
  pdf.line(boxX, y, colTotal, y);
  y += 7;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12);
  pdf.setTextColor(234, 88, 12);
  pdf.text("Total TTC", boxX, y);
  pdf.text(formatEuro(totals.total), colTotal, y, { align: "right" });

  // Notes / règlement
  y += 12;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8.5);
  pdf.setTextColor(90, 90, 90);
  if (invoice.notes) {
    const notes = pdf.splitTextToSize(invoice.notes, pageWidth - margin * 2) as string[];
    notes.forEach((line) => {
      pdf.text(line, margin, y);
      y += 4;
    });
    y += 2;
  }
  const bank = [issuer.iban ? `IBAN : ${issuer.iban}` : "", issuer.bic ? `BIC : ${issuer.bic}` : ""]
    .filter(Boolean)
    .join("   ");
  if (bank) {
    pdf.text(bank, margin, y);
    y += 4;
  }
  pdf.text(`Paiement à ${issuer.paymentTermsDays} jours.`, margin, y);

  // Pied de page
  const pages = pdf.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    pdf.setPage(i);
    pdf.setFontSize(7.5);
    pdf.setTextColor(140, 140, 140);
    if (issuer.footerNote) {
      const footer = pdf.splitTextToSize(issuer.footerNote, pageWidth - margin * 2) as string[];
      pdf.text(footer, pageWidth / 2, pageHeight - 14, { align: "center" });
    }
    pdf.text(`Page ${i}/${pages}`, right, pageHeight - 6, { align: "right" });
  }

  return pdf;
}

export function downloadInvoicePdf(invoice: Invoice, issuer: InvoiceIssuer): void {
  generateInvoicePdf(invoice, issuer).save(`${invoice.number}.pdf`);
}

export function invoicePdfDataUri(invoice: Invoice, issuer: InvoiceIssuer): string {
  return generateInvoicePdf(invoice, issuer).output("datauristring");
}

/**
 * Contenu du PDF encodé en base64, sans le préfixe "data:application/pdf;base64,"
 * — format attendu par l'API Resend pour joindre un fichier à un email
 * (voir supabase/functions/send-invoice-email).
 */
export function invoicePdfBase64(invoice: Invoice, issuer: InvoiceIssuer): string {
  return generateInvoicePdf(invoice, issuer).output("datauristring").split(",")[1] ?? "";
}

/** Ouvre le PDF dans un nouvel onglet et lance l'impression. */
export function printInvoicePdf(invoice: Invoice, issuer: InvoiceIssuer): void {
  const pdf = generateInvoicePdf(invoice, issuer);
  pdf.autoPrint();
  const url = pdf.output("bloburl") as unknown as string;
  const win = window.open(url, "_blank");
  if (!win) pdf.save(`${invoice.number}.pdf`);
}
