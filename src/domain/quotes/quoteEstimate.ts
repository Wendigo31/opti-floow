import { calculateTourCosts, type TourCostResult } from '@/utils/tourCostCalculation';
import { computeQuotePrices } from './quotePricing';

type CostParams = Parameters<typeof calculateTourCosts>[0];

export interface QuoteEstimate {
  cost: TourCostResult;
  marginAmount: number;
  priceHT: number;
  tvaAmount: number;
  priceTTC: number;
}

/** Devis sans tournée : coût réel via le moteur unique, puis marge et TVA. */
export function estimateQuote(params: CostParams, marginPercent: number, tvaRate: number): QuoteEstimate {
  const cost = calculateTourCosts(params);
  const { priceHT, priceTTC } = computeQuotePrices(cost.totalCost, marginPercent, tvaRate);
  return {
    cost,
    marginAmount: Math.round((priceHT - cost.totalCost) * 100) / 100,
    priceHT,
    tvaAmount: Math.round((priceTTC - priceHT) * 100) / 100,
    priceTTC,
  };
}
