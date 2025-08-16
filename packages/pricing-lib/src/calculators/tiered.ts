/**
 * Tiered pricing calculator
 * Each unit is priced according to the tier it falls into
 */

import Decimal from 'decimal.js';
import { PriceTier, toDecimal, roundToCurrency } from '../models/pricing-models';

export function calculateTieredPrice(
  quantity: number,
  tiers: PriceTier[]
): {
  total: number;
  breakdown: Array<{
    tier: number;
    units: number;
    unitPrice: number;
    subtotal: number;
  }>;
} {
  const breakdown: Array<{
    tier: number;
    units: number;
    unitPrice: number;
    subtotal: number;
  }> = [];

  let remaining = toDecimal(quantity);
  let total = new Decimal(0);
  let previousUpTo = 0;

  for (let i = 0; i < tiers.length; i++) {
    const tier = tiers[i];
    const tierUpTo = tier.upTo || Infinity;
    const tierSize = tierUpTo - previousUpTo;
    const unitsInTier = Decimal.min(remaining, tierSize);

    if (unitsInTier.gt(0)) {
      const tierTotal = unitsInTier.mul(tier.unitPrice);
      total = total.add(tierTotal);

      breakdown.push({
        tier: i + 1,
        units: unitsInTier.toNumber(),
        unitPrice: tier.unitPrice,
        subtotal: roundToCurrency(tierTotal),
      });

      remaining = remaining.sub(unitsInTier);
      if (remaining.lte(0)) break;
    }

    previousUpTo = tierUpTo;
  }

  return {
    total: roundToCurrency(total),
    breakdown,
  };
}

/**
 * Example:
 * Tiers:
 * - First 100 units: $1.00 each
 * - Next 900 units: $0.80 each
 * - Above 1000: $0.60 each
 * 
 * For 1500 units:
 * - 100 units × $1.00 = $100
 * - 900 units × $0.80 = $720
 * - 500 units × $0.60 = $300
 * Total: $1,120
 */
