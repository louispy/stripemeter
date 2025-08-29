/**
 * Tests for tiered pricing calculator
 */
import { describe, it, expect } from 'vitest';
import { calculateTieredPrice } from './tiered';
describe('Tiered Pricing Calculator', () => {
    const tiers = [
        { upTo: 100, unitPrice: 1.00 }, // First 100 units at $1.00
        { upTo: 1000, unitPrice: 0.80 }, // Next 900 units at $0.80
        { upTo: null, unitPrice: 0.60 }, // Above 1000 at $0.60
    ];
    it('should calculate price within first tier', () => {
        const result = calculateTieredPrice(50, tiers);
        expect(result.total).toBe(50.00); // 50 × $1.00
        expect(result.breakdown).toHaveLength(1);
        expect(result.breakdown[0]).toEqual({
            tier: 1,
            units: 50,
            unitPrice: 1.00,
            subtotal: 50.00,
        });
    });
    it('should calculate price across multiple tiers', () => {
        const result = calculateTieredPrice(1500, tiers);
        // 100 × $1.00 = $100
        // 900 × $0.80 = $720
        // 500 × $0.60 = $300
        // Total = $1,120
        expect(result.total).toBe(1120.00);
        expect(result.breakdown).toHaveLength(3);
        expect(result.breakdown[0]).toEqual({
            tier: 1,
            units: 100,
            unitPrice: 1.00,
            subtotal: 100.00,
        });
        expect(result.breakdown[1]).toEqual({
            tier: 2,
            units: 900,
            unitPrice: 0.80,
            subtotal: 720.00,
        });
        expect(result.breakdown[2]).toEqual({
            tier: 3,
            units: 500,
            unitPrice: 0.60,
            subtotal: 300.00,
        });
    });
    it('should handle zero quantity', () => {
        const result = calculateTieredPrice(0, tiers);
        expect(result.total).toBe(0);
        expect(result.breakdown).toHaveLength(0);
    });
    it('should handle fractional quantities', () => {
        const result = calculateTieredPrice(150.5, tiers);
        // 100 × $1.00 = $100
        // 50.5 × $0.80 = $40.40
        expect(result.total).toBe(140.40);
        expect(result.breakdown).toHaveLength(2);
    });
    it('should handle single tier with no upper limit', () => {
        const singleTier = [
            { upTo: null, unitPrice: 2.50 },
        ];
        const result = calculateTieredPrice(1000, singleTier);
        expect(result.total).toBe(2500.00);
        expect(result.breakdown).toHaveLength(1);
    });
    it('should round to currency precision', () => {
        const result = calculateTieredPrice(33.333, [
            { upTo: null, unitPrice: 0.03 },
        ]);
        // 33.333 × 0.03 = 0.9999, should round to 1.00
        expect(result.total).toBe(1.00);
    });
});
//# sourceMappingURL=tiered.test.js.map