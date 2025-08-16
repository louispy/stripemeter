/**
 * Volume pricing calculator
 * All units are priced at the rate of the tier they reach
 */

import { PriceTier, toDecimal, roundToCurrency } from '../models/pricing-models';

export function calculateVolumePrice(
  quantity: number,
  tiers: PriceTier[]
): {
  total: number;
  tierUsed: number;
  unitPrice: number;
} {
  const qty = toDecimal(quantity);
  let tierUsed = 0;
  let unitPrice = 0;

  // Find which tier the total quantity falls into
  for (let i = 0; i < tiers.length; i++) {
    const tier = tiers[i];
    const tierUpTo = tier.upTo || Infinity;

    if (qty.lte(tierUpTo)) {
      tierUsed = i + 1;
      unitPrice = tier.unitPrice;
      break;
    }
  }

  // If quantity exceeds all tiers, use the last tier
  if (tierUsed === 0 && tiers.length > 0) {
    tierUsed = tiers.length;
    unitPrice = tiers[tiers.length - 1].unitPrice;
  }

  const total = qty.mul(unitPrice);

  return {
    total: roundToCurrency(total),
    tierUsed,
    unitPrice,
  };
}

/**
 * Example:
 * Tiers:
 * - Up to 100 units: $1.00 each
 * - Up to 1000 units: $0.80 each
 * - Above 1000: $0.60 each
 * 
 * For 1500 units:
 * - All 1500 units are priced at $0.60 each
 * Total: $900
 */
