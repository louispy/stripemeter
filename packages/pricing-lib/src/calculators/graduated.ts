/**
 * Graduated pricing calculator
 * Similar to tiered but with flat fees per tier
 */

import Decimal from 'decimal.js';
import { PriceTier, toDecimal, roundToCurrency } from '../models/pricing-models';

export function calculateGraduatedPrice(
  quantity: number,
  tiers: PriceTier[]
): {
  total: number;
  breakdown: Array<{
    tier: number;
    units: number;
    unitPrice: number;
    flatFee: number;
    subtotal: number;
  }>;
} {
  const breakdown: Array<{
    tier: number;
    units: number;
    unitPrice: number;
    flatFee: number;
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
      const unitCharge = unitsInTier.mul(tier.unitPrice);
      const flatFee = tier.flatPrice || 0;
      const tierTotal = unitCharge.add(flatFee);
      
      total = total.add(tierTotal);

      breakdown.push({
        tier: i + 1,
        units: unitsInTier.toNumber(),
        unitPrice: tier.unitPrice,
        flatFee,
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
 * - First 100 units: $10 flat + $0.50 per unit
 * - Next 900 units: $50 flat + $0.30 per unit
 * - Above 1000: $100 flat + $0.20 per unit
 * 
 * For 1500 units:
 * - Tier 1: $10 + (100 × $0.50) = $60
 * - Tier 2: $50 + (900 × $0.30) = $320
 * - Tier 3: $100 + (500 × $0.20) = $200
 * Total: $580
 */
