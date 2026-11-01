import { describe, it, expect } from "vitest";
import { facturXDoc, fecRows } from "./invoiceFacturX";
import { facturXml } from "./facturx";
import { buildFec } from "./fec";
import { withFuelLine, fuelSurcharge, DEFAULT_FUEL_INDEX } from "./fuelIndex";
import { DEFAULT_INVOICE_ISSUER, type Invoice } from "./invoices";

const issuer = { ...DEFAULT_INVOICE_ISSUER, companyName: "Flow Transports", siren: "123456789" };
const inv: Invoice = {
  id: "f1", number: "FA-2026-0001", clientId: "c", clientName: "Colis SA", clientSiren: "987654321",
  issueDate: "2026-10-31", dueDate: "2026-11-30", periodStart: "2026-10-01", periodEnd: "2026-10-31",
  taxRate: 20, status: "paid", paidAt: "2026-11-10", createdAt: "",
  lines: [{ id: "a", description: "Tournées", quantity: 20, unitPrice: 50 }],
};

describe("indexation gazole", () => {
  const s = { ...DEFAULT_FUEL_INDEX, enabled: true, sharePct: 25, refIndex: 200, currentIndex: 210 };
  it("calcule le surcoût CNR et ajoute une seule ligne", () => {
    expect(fuelSurcharge(1000, s)).toBe(12.5);
    const once = withFuelLine(inv.lines, s);
    const twice = withFuelLine(once, s);
    expect(twice.filter((l) => l.fuel)).toHaveLength(1);
    expect(twice.find((l) => l.fuel)?.unitPrice).toBe(12.5);
  });
});

describe("Factur-X et FEC OptiXpress", () => {
  it("facture : type 380, SIREN vendeur et acheteur, total", () => {
    const xml = facturXml(facturXDoc(inv, issuer));
    expect(xml).toContain("<ram:TypeCode>380</ram:TypeCode>");
    expect(xml).toContain('schemeID="0002">123456789');
    expect(xml).toContain('schemeID="0002">987654321');
    expect(xml).toContain("<ram:GrandTotalAmount>1200.00</ram:GrandTotalAmount>");
  });

  it("avoir : type 381 en positif avec référence", () => {
    const av: Invoice = { ...inv, id: "a1", number: "AV-2026-0002", kind: "credit_note", creditOf: { id: "f1", number: "FA-2026-0001" }, lines: [{ id: "m", description: "Avoir", quantity: 1, unitPrice: -1000 }] };
    const xml = facturXml(facturXDoc(av, issuer));
    expect(xml).toContain("<ram:TypeCode>381</ram:TypeCode>");
    expect(xml).toContain("<ram:GrandTotalAmount>1200.00</ram:GrandTotalAmount>");
    expect(xml).toContain("<ram:IssuerAssignedID>FA-2026-0001</ram:IssuerAssignedID>");
  });

  it("FEC équilibré avec règlement lettré", () => {
    const { text, lines } = buildFec(fecRows([inv]), { from: "2026-01-01", to: "2026-12-31" });
    expect(lines).toBe(5);
    const rows = text.trim().split("\r\n").slice(1).map((l) => l.split("\t"));
    const num = (x: string) => Number(x.replace(",", "."));
    expect(Math.round(rows.reduce((a, r) => a + num(r[11]) - num(r[12]), 0) * 100)).toBe(0);
  });
});
