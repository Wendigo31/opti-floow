import { describe, expect, it } from 'vitest';
import { computeQuotePrices } from './quotePricing';

describe('computeQuotePrices', () => {
  it('applies margin on cost then VAT', () => {
    expect(computeQuotePrices(1000, 15, 20)).toEqual({ priceHT: 1150, priceTTC: 1380 });
  });
  it('handles zero margin', () => {
    expect(computeQuotePrices(500, 0, 20)).toEqual({ priceHT: 500, priceTTC: 600 });
  });
});
