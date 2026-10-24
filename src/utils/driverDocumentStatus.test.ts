import { describe, it, expect } from 'vitest';
import {
  driverDocumentTypes,
  getDriverDocumentTypeLabel,
  getDaysUntilExpiry,
  getDocumentUrgency,
  getDocumentsNeedingAttention,
  formatExpiryStatus,
  generateDriverDocumentId,
} from './driverDocumentStatus';
import type { DriverDocument } from '@/types';

function makeDoc(overrides: Partial<DriverDocument>): DriverDocument {
  return {
    id: 'doc_1',
    type: 'permis',
    label: 'Permis de conduire',
    expiryDate: '2026-12-31',
    ...overrides,
  };
}

const TODAY = new Date('2026-11-01T12:00:00');

describe('getDriverDocumentTypeLabel', () => {
  it('returns the label for every known type', () => {
    for (const t of driverDocumentTypes) {
      expect(getDriverDocumentTypeLabel(t.value)).toBe(t.label);
    }
  });

  it('falls back to "Autre document" for an unknown type', () => {
    // @ts-expect-error - testing a value outside the known union
    expect(getDriverDocumentTypeLabel('unknown')).toBe('Autre document');
  });
});

describe('getDaysUntilExpiry', () => {
  it('returns a positive count for a future date', () => {
    expect(getDaysUntilExpiry('2026-11-11', TODAY)).toBe(10);
  });

  it('returns 0 for today', () => {
    expect(getDaysUntilExpiry('2026-11-01', TODAY)).toBe(0);
  });

  it('returns a negative count for a past date', () => {
    expect(getDaysUntilExpiry('2026-10-20', TODAY)).toBe(-12);
  });
});

describe('getDocumentUrgency', () => {
  it('is "ok" well before the warning threshold (>60 days)', () => {
    const doc = makeDoc({ expiryDate: '2027-06-01' });
    expect(getDocumentUrgency(doc, TODAY)).toBe('ok');
  });

  it('is "warning" within 60 days but above 15', () => {
    const doc = makeDoc({ expiryDate: '2026-12-15' });
    expect(getDocumentUrgency(doc, TODAY)).toBe('warning');
  });

  it('is "danger" within 15 days', () => {
    const doc = makeDoc({ expiryDate: '2026-11-10' });
    expect(getDocumentUrgency(doc, TODAY)).toBe('danger');
  });

  it('is "danger" for an already-expired document', () => {
    const doc = makeDoc({ expiryDate: '2026-10-01' });
    expect(getDocumentUrgency(doc, TODAY)).toBe('danger');
  });
});

describe('getDocumentsNeedingAttention', () => {
  it('returns an empty array when documents is undefined', () => {
    expect(getDocumentsNeedingAttention(undefined, TODAY)).toEqual([]);
  });

  it('filters out documents that are still far from expiry', () => {
    const docs = [
      makeDoc({ id: 'a', expiryDate: '2027-06-01' }), // ok
      makeDoc({ id: 'b', expiryDate: '2026-11-10' }), // danger
      makeDoc({ id: 'c', expiryDate: '2026-12-15' }), // warning
    ];
    const result = getDocumentsNeedingAttention(docs, TODAY);
    expect(result.map(d => d.id)).toEqual(['b', 'c']);
  });
});

describe('formatExpiryStatus', () => {
  it('formats a future expiry with the day count', () => {
    expect(formatExpiryStatus(makeDoc({ expiryDate: '2026-11-11' }), TODAY)).toBe(
      "expire le 11/11/2026 (dans 10 j)"
    );
  });

  it('formats an expiry due today', () => {
    expect(formatExpiryStatus(makeDoc({ expiryDate: '2026-11-01' }), TODAY)).toBe(
      "expire aujourd'hui (01/11/2026)"
    );
  });

  it('formats an already-expired document', () => {
    expect(formatExpiryStatus(makeDoc({ expiryDate: '2026-10-01' }), TODAY)).toBe(
      'expiré depuis le 01/10/2026'
    );
  });
});

describe('generateDriverDocumentId', () => {
  it('generates unique, non-empty ids', () => {
    const id1 = generateDriverDocumentId();
    const id2 = generateDriverDocumentId();
    expect(id1).toMatch(/^doc_/);
    expect(id1).not.toBe(id2);
  });
});
