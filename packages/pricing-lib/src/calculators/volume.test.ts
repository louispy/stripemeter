/**
 * Tests for volume pricing calculator
 */

import { describe, it, expect } from 'vitest';
import { calculateVolumePrice } from './volume';
import type { PriceTier } from '../models/pricing-models';

describe('Volume Pricing Calculator', () => {
  const tiers: PriceTier[] = [
    { upTo: 100, unitPrice: 1.00 },
    { upTo: 1000, unitPrice: 0.80 },
    { upTo: null, unitPrice: 0.60 },
  ];

  it('should use the first tier for small quantities', () => {
    const result = calculateVolumePrice(50, tiers);
    expect(result.total).toBe(50.00); // 50 × $1.00
    expect(result.tierUsed).toBe(1);
    expect(result.unitPrice).toBe(1.00);
  });

  it('should use the correct tier for mid-range quantities', () => {
    const result = calculateVolumePrice(500, tiers);
    expect(result.total).toBe(400.00); // 500 × $0.80
    expect(result.tierUsed).toBe(2);
    expect(result.unitPrice).toBe(0.80);
  });

  it('should use the last tier for high quantities', () => {
    const result = calculateVolumePrice(1500, tiers);
    expect(result.total).toBe(900.00); // 1500 × $0.60
    expect(result.tierUsed).toBe(3);
    expect(result.unitPrice).toBe(0.60);
  });

  it('should handle single infinite tier', () => {
    const single: PriceTier[] = [{ upTo: null, unitPrice: 2.5 }];
    const result = calculateVolumePrice(10, single);
    expect(result.total).toBe(25.00);
    expect(result.tierUsed).toBe(1);
    expect(result.unitPrice).toBe(2.5);
  });

  it('should handle zero quantity', () => {
    const result = calculateVolumePrice(0, tiers);
    expect(result.total).toBe(0);
  });
});


