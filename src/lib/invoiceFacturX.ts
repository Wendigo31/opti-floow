import { toFacturX, facturXml, type FacturXDoc } from "@/lib/facturx";
import { generateInvoicePdf } from "@/lib/invoicePdf";
import type { FecInvoice } from "@/lib/fec";
import { computeInvoiceTotals, type Invoice, type InvoiceIssuer } from "@/lib/invoices";

/** Facture OptiXpress → données Factur-X (EN 16931). */
export function facturXDoc(invoice: Invoice, issuer: InvoiceIssuer): FacturXDoc {
  const t = computeInvoiceTotals(invoice.lines, invoice.taxRate);
  const fuel = invoice.lines.filter((l) => l.fuel).reduce((s, l) => s + l.quantity * l.unitPrice, 0);
  const days = Math.max(0, Math.round((Date.parse(invoice.dueDate) - Date.parse(invoice.issueDate)) / 86_400_000)) || issuer.paymentTermsDays || 30;
  return {
    number: invoice.number,
    issueDate: invoice.issueDate,
    dueDate: invoice.dueDate,
    deliveryDate: invoice.periodEnd || invoice.issueDate,
    creditOf: invoice.kind === "credit_note" ? invoice.creditOf?.number : undefined,
    seller: {
      companyName: issuer.companyName,
      siren: issuer.siren,
      vatNumber: issuer.vatNumber,
      address: issuer.addressStreet,
      postalCode: issuer.addressPostalCode,
      city: issuer.addressCity,
      email: issuer.email,
    },
    buyer: { companyName: invoice.clientName || "Client", siren: invoice.clientSiren, address: invoice.clientAddress, email: invoice.clientEmail },
    ht: t.subtotal,
    tva: t.tax,
    ttc: t.total,
    rate: invoice.taxRate,
    notes: [
      invoice.periodStart && invoice.periodEnd ? `Prestations du ${invoice.periodStart} au ${invoice.periodEnd}.` : "",
      fuel ? `Dont indexation gazole : ${Math.abs(fuel).toFixed(2)} EUR HT.` : "",
      invoice.creditReason ? `Motif : ${invoice.creditReason}` : "",
    ].filter(Boolean),
    paymentTermsDays: days,
    paid: invoice.status === "paid",
    creator: "OptiFlow",
  };
}

/** PDF de la facture avec son XML Factur-X intégré. */
export async function invoiceFacturXBytes(invoice: Invoice, issuer: InvoiceIssuer): Promise<Uint8Array> {
  return toFacturX(generateInvoicePdf(invoice, issuer).output("arraybuffer"), facturXDoc(invoice, issuer));
}

export const invoiceFacturXml = (invoice: Invoice, issuer: InvoiceIssuer) => facturXml(facturXDoc(invoice, issuer));

/** Factures OptiXpress → lignes du FEC (ventes et règlements). */
export function fecRows(invoices: Invoice[]): FecInvoice[] {
  return invoices.map((i) => {
    const t = computeInvoiceTotals(i.lines, i.taxRate);
    const fuel = i.lines.filter((l) => l.fuel).reduce((s, l) => s + l.quantity * l.unitPrice, 0);
    return {
      invoice_number: i.number,
      issued_at: i.issueDate,
      amount: t.subtotal,
      tax_amount: t.tax,
      total_amount: t.total,
      fuel_surcharge: Math.round(fuel * 100) / 100,
      status: i.status,
      paid_at: i.paidAt || (i.status === "paid" && i.kind !== "credit_note" ? i.issueDate : null),
      client_name: i.clientName || "Client",
      label: i.periodStart && i.periodEnd ? `Tournées ${i.periodStart} au ${i.periodEnd}` : "Tournées",
    };
  });
}
