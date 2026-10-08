/** Prix de devis : marge appliquée sur le coût de revient (prix = coût × (1 + marge)). */
export function computeQuotePrices(totalCost: number, marginPercent: number, tvaRate: number) {
  const round = (n: number) => Math.round(n * 100) / 100;
  const priceHT = round((totalCost || 0) * (1 + (marginPercent || 0) / 100));
  const priceTTC = round(priceHT * (1 + (tvaRate || 0) / 100));
  return { priceHT, priceTTC };
}
