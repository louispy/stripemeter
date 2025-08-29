/**
 * Tests for graduated pricing calculator
 */
import { describe, it, expect } from 'vitest';
import { calculateGraduatedPrice } from './graduated';
describe('Graduated Pricing Calculator', () => {
    const tiers = [
        { upTo: 100, flatPrice: 10, unitPrice: 0.50 },
        { upTo: 1000, flatPrice: 50, unitPrice: 0.30 },
        { upTo: null, flatPrice: 100, unitPrice: 0.20 },
    ];
    it('should calculate price within first tier including flat fee', () => {
        const result = calculateGraduatedPrice(50, tiers);
        // $10 flat + (50 × $0.50) = $35
        expect(result.total).toBe(35.00);
        expect(result.breakdown).toHaveLength(1);
        expect(result.breakdown[0].flatFee).toBe(10);
    });
    it('should calculate across tiers including flat fees', () => {
        const result = calculateGraduatedPrice(1500, tiers);
        // Tier1: $10 + (100 × 0.50) = 60
        // Tier2: $50 + (900 × 0.30) = 320
        // Tier3: $100 + (500 × 0.20) = 200
        // Total: 580
        expect(result.total).toBe(580.00);
        expect(result.breakdown).toHaveLength(3);
    });
    it('should handle zero quantity (no flat fee applied)', () => {
        const result = calculateGraduatedPrice(0, tiers);
        expect(result.total).toBe(0);
        expect(result.breakdown).toHaveLength(0);
    });
});
//# sourceMappingURL=graduated.test.js.map