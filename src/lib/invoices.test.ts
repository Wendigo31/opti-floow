import { describe, it, expect } from "vitest";
import {
  computeInvoiceTotals,
  lineTotal,
  nextInvoiceNumber,
  addDays,
  computeUsedTripIds,
  creditableHT,
  amountDueTTC,
  isIssued,
  isCreditNote,
  type Invoice,
  type InvoiceLine,
} from "./invoices";

function makeLine(overrides: Partial<InvoiceLine> = {}): InvoiceLine {
  return {
    id: "line-1",
    description: "Tournée",
    quantity: 1,
    unitPrice: 100,
    ...overrides,
  };
}

function makeInvoice(overrides: Partial<Invoice> = {}): Invoice {
  return {
    id: "inv-1",
    number: "FA-2026-0001",
    clientId: "c1",
    clientName: "Chronopost",
    issueDate: "2026-10-01",
    dueDate: "2026-10-31",
    lines: [],
    taxRate: 20,
    status: "draft",
    createdAt: "2026-10-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("computeInvoiceTotals", () => {
  it("computes subtotal/tax/total for a simple line", () => {
    const totals = computeInvoiceTotals([makeLine({ quantity: 2, unitPrice: 150 })], 20);
    expect(totals.subtotal).toBe(300);
    expect(totals.tax).toBe(60);
    expect(totals.total).toBe(360);
  });

  it("rounds to the cent instead of accumulating floating-point drift", () => {
    // 0.1 + 0.2 classique : sans arrondi explicite, ce genre de somme dérive
    // (0.30000000000000004). Les montants d'une facture doivent rester
    // exacts au centime.
    const totals = computeInvoiceTotals(
      [makeLine({ quantity: 1, unitPrice: 0.1 }), makeLine({ quantity: 1, unitPrice: 0.2 })],
      0
    );
    expect(totals.subtotal).toBe(0.3);
    expect(totals.total).toBe(0.3);
  });

  it("treats a zero tax rate as zero tax, not NaN", () => {
    const totals = computeInvoiceTotals([makeLine({ quantity: 1, unitPrice: 100 })], 0);
    expect(totals.tax).toBe(0);
    expect(totals.total).toBe(100);
  });

  it("treats non-finite quantity/price as zero rather than producing NaN totals", () => {
    const totals = computeInvoiceTotals(
      [makeLine({ quantity: Number.NaN, unitPrice: 100 })],
      20
    );
    expect(totals.subtotal).toBe(0);
    expect(totals.total).toBe(0);
  });

  it("returns zero totals for an empty line list", () => {
    const totals = computeInvoiceTotals([], 20);
    expect(totals).toEqual({ subtotal: 0, tax: 0, total: 0 });
  });
});

describe("lineTotal", () => {
  it("multiplies quantity by unit price", () => {
    expect(lineTotal(makeLine({ quantity: 3, unitPrice: 50 }))).toBe(150);
  });
});

describe("nextInvoiceNumber", () => {
  it("starts at 0001 when there are no invoices for the year", () => {
    expect(nextInvoiceNumber([], new Date("2026-10-18"))).toBe("FA-2026-0001");
  });

  it("increments sequentially from the highest existing number", () => {
    const invoices = [makeInvoice({ number: "FA-2026-0003" }), makeInvoice({ number: "FA-2026-0001" })];
    expect(nextInvoiceNumber(invoices, new Date("2026-10-18"))).toBe("FA-2026-0004");
  });

  it("never reuses a number even if the invoice holding it was trashed (soft-deleted)", () => {
    // Invoicing.tsx passe délibérément `allInvoices` (corbeille comprise) à
    // cette fonction, précisément pour ce cas : une facture mise à la
    // corbeille ne doit jamais libérer son numéro.
    const invoices = [makeInvoice({ number: "FA-2026-0005", status: "cancelled" })];
    expect(nextInvoiceNumber(invoices, new Date("2026-10-18"))).toBe("FA-2026-0006");
  });

  it("does not consider invoices from a different year", () => {
    const invoices = [makeInvoice({ number: "FA-2025-0099" })];
    expect(nextInvoiceNumber(invoices, new Date("2026-01-05"))).toBe("FA-2026-0001");
  });

  it("ignores malformed numbers instead of crashing", () => {
    const invoices = [makeInvoice({ number: "FA-2026-XYZ" }), makeInvoice({ number: "FA-2026-0002" })];
    expect(nextInvoiceNumber(invoices, new Date("2026-10-18"))).toBe("FA-2026-0003");
  });
});

describe("addDays", () => {
  it("adds days within the same month", () => {
    expect(addDays("2026-10-01", 10)).toBe("2026-10-11");
  });

  it("rolls over to the next month", () => {
    expect(addDays("2026-10-25", 10)).toBe("2026-11-04");
  });

  it("rolls over to the next year", () => {
    expect(addDays("2026-12-28", 5)).toBe("2027-01-02");
  });
});

describe("computeUsedTripIds", () => {
  it("collects sourceRouteId from every invoice's lines", () => {
    const invoices = [
      makeInvoice({ id: "a", lines: [makeLine({ sourceRouteId: "route-1" })] }),
      makeInvoice({ id: "b", lines: [makeLine({ sourceRouteId: "route-2" })] }),
    ];
    expect(computeUsedTripIds(invoices).sort()).toEqual(["route-1", "route-2"]);
  });

  it("excludes the invoice currently being edited, so re-opening it doesn't block its own trips", () => {
    const invoices = [
      makeInvoice({ id: "a", lines: [makeLine({ sourceRouteId: "route-1" })] }),
      makeInvoice({ id: "b", lines: [makeLine({ sourceRouteId: "route-2" })] }),
    ];
    expect(computeUsedTripIds(invoices, "a")).toEqual(["route-2"]);
  });

  it("ignores lines with no sourceRouteId (manually-entered lines)", () => {
    const invoices = [
      makeInvoice({
        id: "a",
        lines: [makeLine({ sourceRouteId: undefined }), makeLine({ sourceRouteId: "route-3" })],
      }),
    ];
    expect(computeUsedTripIds(invoices)).toEqual(["route-3"]);
  });
});

describe("avoirs", () => {
  const base = { clientId: "c", clientName: "C", issueDate: "2026-10-01", dueDate: "2026-10-31", taxRate: 20, createdAt: "" };
  const fa = { ...base, id: "f1", number: "FA-2026-0001", status: "sent" as const, lines: [{ id: "l", description: "Tournées", quantity: 10, unitPrice: 100 }] };
  const av = { ...base, id: "a1", number: "AV-2026-0002", status: "paid" as const, kind: "credit_note" as const, creditOf: { id: "f1", number: "FA-2026-0001" }, lines: [{ id: "m", description: "Avoir", quantity: 1, unitPrice: -250 }] };

  it("factures et avoirs partagent la même série", () => {
    expect(nextInvoiceNumber([fa, av], new Date("2026-11-01"))).toBe("FA-2026-0003");
  });

  it("montant encore créditable et reste dû après un avoir partiel", () => {
    expect(creditableHT(fa, [fa, av])).toBe(750);
    expect(amountDueTTC(fa, [fa, av])).toBe(900);
  });

  it("une facture annulée libère ses tournées", () => {
    const withTrip = { ...fa, status: "cancelled" as const, lines: [{ id: "l", description: "T", quantity: 1, unitPrice: 1, sourceRouteId: "r1" }] };
    expect(computeUsedTripIds([withTrip])).toEqual([]);
    expect(isIssued(fa)).toBe(true);
    expect(isCreditNote(av)).toBe(true);
  });
});
