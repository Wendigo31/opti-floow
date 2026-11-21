import { describe, it, expect } from 'vitest';
import { designationDaysLeft, latePenalty, lateInvoices, penaltyTotals, type LateInvoice, type Penalty } from './penalties';

const inv = (over: Partial<LateInvoice> = {}): LateInvoice => ({ id: 'i1', number: 'FA-2026-0001', clientId: 'c', clientName: 'Client', dueDate: '2026-10-01', amountTTC: 1200, ...over });

describe('pénalités', () => {
  it('retard de paiement : intérêts au prorata + 40 €', () => {
    const c = latePenalty(inv(), 8.25, '2026-10-31');
    expect(c?.days).toBe(30);
    expect(c?.interest).toBe(8.14); // 1200 × 8,25 % × 30 / 365
    expect(c?.total).toBe(48.14);
    expect(latePenalty(inv({ paidAt: '2026-10-11' }), 8.25, '2026-12-31')?.days).toBe(10);
    expect(latePenalty(inv({ paidAt: '2026-09-30' }), 8.25, '2026-12-31')).toBeNull();
    expect(latePenalty(inv({ amountTTC: 0 }), 8.25, '2026-12-31')).toBeNull();
  });

  it('liste les factures en retard, les plus anciennes d\'abord', () => {
    const list = lateInvoices([inv({ id: 'b', dueDate: '2026-11-10' }), inv({ id: 'a' }), inv({ id: 'c', dueDate: '2026-12-01' })], 10, '2026-11-20');
    expect(list.map((x) => x.invoice.id)).toEqual(['a', 'b']);
  });

  it('PV : délai de désignation de 45 jours', () => {
    expect(designationDaysLeft({ occurred_on: '2026-11-01', due_on: null }, '2026-11-11')).toBe(35);
    expect(designationDaysLeft({ occurred_on: '2026-09-01', due_on: '2026-11-15' }, '2026-11-20')).toBe(-5);
  });

  it('totaux du mois', () => {
    const p = (o: Partial<Penalty>): Penalty => ({ id: Math.random().toString(), license_id: 'l', kind: 'client_withholding', occurred_on: '2026-11-03', amount: 50, status: 'open', reason: null, reference: null, client_id: null, route_id: null, driver_id: null, vehicle_id: null, due_on: null, notes: null, ...o });
    const t = penaltyTotals([p({}), p({ status: 'refunded' }), p({ kind: 'fine', amount: 135 }), p({ kind: 'late_payment', amount: 48, status: 'paid' }), p({ occurred_on: '2026-10-01' })], '2026-11');
    expect(t.withheld).toBe(50);
    expect(t.finesOpen).toBe(135);
    expect(t.finesToDesignate).toBe(1);
    expect(t.lateCollected).toBe(48);
  });
});
