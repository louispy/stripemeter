/**
 * Simulator integration tests
 */
import { describe, it, expect } from 'vitest';
import { InvoiceSimulator } from '../simulator';
describe('InvoiceSimulator Integration', () => {
    it('should simulate a simple invoice with one metric', () => {
        const simulator = new InvoiceSimulator();
        const invoice = simulator.simulate({
            customerId: 'cust_test',
            periodStart: '2024-01-01',
            periodEnd: '2024-02-01',
            usageItems: [
                {
                    metric: 'api_calls',
                    quantity: 1500,
                    priceConfig: {
                        model: 'tiered',
                        currency: 'USD',
                        tiers: [
                            { upTo: 1000, unitPrice: 0.10 },
                            { upTo: 10000, unitPrice: 0.08 },
                            { upTo: null, unitPrice: 0.05 },
                        ],
                    },
                },
            ],
            credits: [{ amount: 10, reason: 'promo' }],
            taxRate: 0,
        });
        expect(invoice.total).toBeGreaterThan(0);
        expect(invoice.lineItems.length).toBe(1);
        expect(invoice.currency).toBe('USD');
    });
    it('should support multi-metric invoices', () => {
        const simulator = new InvoiceSimulator();
        const invoice = simulator.simulate({
            customerId: 'cust_multi',
            periodStart: '2024-01-01',
            periodEnd: '2024-02-01',
            usageItems: [
                {
                    metric: 'api_calls',
                    quantity: 25000,
                    priceConfig: {
                        model: 'volume',
                        currency: 'USD',
                        tiers: [
                            { upTo: 1000, unitPrice: 0.10 },
                            { upTo: 50000, unitPrice: 0.08 },
                            { upTo: null, unitPrice: 0.05 },
                        ],
                    },
                },
                {
                    metric: 'storage_gb',
                    quantity: 300,
                    priceConfig: {
                        model: 'flat',
                        currency: 'USD',
                        unitPrice: 0.02,
                    },
                },
            ],
            taxRate: 8.5,
        });
        expect(invoice.total).toBeGreaterThan(0);
        expect(invoice.lineItems.length).toBe(2);
        expect(invoice.tax).toBeGreaterThan(0);
    });
});
//# sourceMappingURL=simulator.integration.test.js.map