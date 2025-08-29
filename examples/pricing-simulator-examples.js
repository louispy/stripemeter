/**
 * StripeMeter Pricing Simulator Examples
 *
 * This file demonstrates basic usage of the pricing simulator
 * for different pricing models and scenarios.
 */
import { InvoiceSimulator } from '@stripemeter/pricing-lib';
const simulator = new InvoiceSimulator();
// ================================================================================
// EXAMPLE 1: Tiered Pricing - API Usage
// ================================================================================
console.log('='.repeat(60));
console.log('EXAMPLE 1: Tiered Pricing for API Usage');
console.log('='.repeat(60));
const tieredApiPricing = {
    model: 'tiered',
    currency: 'USD',
    tiers: [
        { upTo: 1000, unitPrice: 0.10 }, // First 1,000 calls: $0.10 each
        { upTo: 10000, unitPrice: 0.08 }, // Next 9,000 calls: $0.08 each
        { upTo: 50000, unitPrice: 0.05 }, // Next 40,000 calls: $0.05 each
        { upTo: null, unitPrice: 0.03 } // Above 50,000: $0.03 each
    ]
};
const tieredExamples = [
    { usage: 500, name: 'Light usage' },
    { usage: 5000, name: 'Moderate usage' },
    { usage: 25000, name: 'Heavy usage' },
    { usage: 100000, name: 'Enterprise usage' }
];
tieredExamples.forEach(example => {
    const invoice = simulator.simulate({
        customerId: `tiered_${example.name.replace(' ', '_')}`,
        periodStart: '2024-01-01',
        periodEnd: '2024-02-01',
        usageItems: [{
                metric: 'api_calls',
                quantity: example.usage,
                priceConfig: tieredApiPricing
            }]
    });
    console.log(`${example.name}: ${example.usage.toLocaleString()} calls = $${invoice.total}`);
});
// ================================================================================
// EXAMPLE 2: Volume Pricing - Data Processing
// ================================================================================
console.log('\n' + '='.repeat(60));
console.log('EXAMPLE 2: Volume Pricing for Data Processing');
console.log('='.repeat(60));
const volumeDataPricing = {
    model: 'volume',
    currency: 'USD',
    tiers: [
        { upTo: 100, unitPrice: 0.50 }, // 0-100 GB: $0.50/GB
        { upTo: 1000, unitPrice: 0.35 }, // 0-1000 GB: $0.35/GB (all units)
        { upTo: 5000, unitPrice: 0.25 }, // 0-5000 GB: $0.25/GB (all units)
        { upTo: null, unitPrice: 0.15 } // Above 5000 GB: $0.15/GB (all units)
    ]
};
const volumeExamples = [
    { usage: 50, name: 'Small job' },
    { usage: 500, name: 'Medium job' },
    { usage: 2500, name: 'Large job' },
    { usage: 10000, name: 'Enterprise job' }
];
volumeExamples.forEach(example => {
    const invoice = simulator.simulate({
        customerId: `volume_${example.name.replace(' ', '_')}`,
        periodStart: '2024-01-01',
        periodEnd: '2024-02-01',
        usageItems: [{
                metric: 'data_processed_gb',
                quantity: example.usage,
                priceConfig: volumeDataPricing
            }]
    });
    console.log(`${example.name}: ${example.usage.toLocaleString()} GB = $${invoice.total}`);
});
// ================================================================================
// EXAMPLE 3: Graduated Pricing - Storage Service
// ================================================================================
console.log('\n' + '='.repeat(60));
console.log('EXAMPLE 3: Graduated Pricing for Storage Service');
console.log('='.repeat(60));
const graduatedStoragePricing = {
    model: 'graduated',
    currency: 'USD',
    tiers: [
        { upTo: 100, flatPrice: 5, unitPrice: 0.02 }, // $5 base + $0.02/GB
        { upTo: 1000, flatPrice: 15, unitPrice: 0.015 }, // $15 base + $0.015/GB
        { upTo: null, flatPrice: 50, unitPrice: 0.01 } // $50 base + $0.01/GB
    ]
};
const graduatedExamples = [
    { usage: 25, name: 'Starter plan' },
    { usage: 250, name: 'Professional plan' },
    { usage: 2500, name: 'Enterprise plan' }
];
graduatedExamples.forEach(example => {
    const invoice = simulator.simulate({
        customerId: `graduated_${example.name.replace(' ', '_')}`,
        periodStart: '2024-01-01',
        periodEnd: '2024-02-01',
        usageItems: [{
                metric: 'storage_gb',
                quantity: example.usage,
                priceConfig: graduatedStoragePricing
            }]
    });
    console.log(`${example.name}: ${example.usage.toLocaleString()} GB = $${invoice.total}`);
});
// ================================================================================
// EXAMPLE 4: Multi-Metric Billing
// ================================================================================
console.log('\n' + '='.repeat(60));
console.log('EXAMPLE 4: Multi-Metric Billing - SaaS Platform');
console.log('='.repeat(60));
const multiMetricExample = {
    customerId: 'saas_customer_001',
    periodStart: '2024-01-01',
    periodEnd: '2024-02-01',
    usageItems: [
        {
            metric: 'api_calls',
            quantity: 15000,
            priceConfig: {
                model: 'tiered',
                currency: 'USD',
                tiers: [
                    { upTo: 5000, unitPrice: 0.01 },
                    { upTo: 20000, unitPrice: 0.008 },
                    { upTo: null, unitPrice: 0.005 }
                ]
            }
        },
        {
            metric: 'storage_gb',
            quantity: 150,
            priceConfig: {
                model: 'flat',
                currency: 'USD',
                unitPrice: 0.025
            }
        },
        {
            metric: 'bandwidth_gb',
            quantity: 500,
            priceConfig: {
                model: 'volume',
                currency: 'USD',
                tiers: [
                    { upTo: 100, unitPrice: 0.09 },
                    { upTo: 1000, unitPrice: 0.07 },
                    { upTo: null, unitPrice: 0.05 }
                ]
            }
        }
    ]
};
const multiMetricInvoice = simulator.simulate(multiMetricExample);
console.log('Multi-metric billing breakdown:');
multiMetricInvoice.lineItems.forEach(item => {
    console.log(`  ${item.metric}: ${item.quantity.toLocaleString()} units × $${item.unitPrice} = $${item.subtotal}`);
});
console.log(`Total: $${multiMetricInvoice.total}`);
// ================================================================================
// EXAMPLE 5: Credits and Commitments
// ================================================================================
console.log('\n' + '='.repeat(60));
console.log('EXAMPLE 5: Enterprise Customer with Credits and Commitments');
console.log('='.repeat(60));
const enterpriseExample = {
    customerId: 'enterprise_customer',
    periodStart: '2024-01-01',
    periodEnd: '2024-02-01',
    usageItems: [
        {
            metric: 'compute_hours',
            quantity: 1000,
            priceConfig: {
                model: 'volume',
                currency: 'USD',
                tiers: [
                    { upTo: 500, unitPrice: 0.50 },
                    { upTo: 2000, unitPrice: 0.40 },
                    { upTo: null, unitPrice: 0.30 }
                ]
            }
        }
    ],
    credits: [
        { amount: 100, reason: 'Welcome credit' },
        { amount: 50, reason: 'Referral bonus' }
    ],
    commitments: [
        {
            amount: 2000, // $2,000 annual commitment
            startDate: '2024-01-01',
            endDate: '2024-12-31',
            applied: 0 // First month, no commitment used yet
        }
    ],
    taxRate: 8.5 // 8.5% tax rate
};
const enterpriseInvoice = simulator.simulate(enterpriseExample);
console.log('Enterprise customer breakdown:');
console.log(`Subtotal: $${enterpriseInvoice.subtotal}`);
console.log(`Credits applied: -$${enterpriseInvoice.credits}`);
console.log(`Tax (8.5%): $${enterpriseInvoice.tax}`);
console.log(`Total: $${enterpriseInvoice.total}`);
// ================================================================================
// EXAMPLE 6: Pricing Model Comparison
// ================================================================================
console.log('\n' + '='.repeat(60));
console.log('EXAMPLE 6: Pricing Model Comparison for Same Usage');
console.log('='.repeat(60));
const usage = 25000; // 25,000 API calls
const pricingModels = {
    'Tiered': {
        model: 'tiered',
        currency: 'USD',
        tiers: [
            { upTo: 10000, unitPrice: 0.01 },
            { upTo: 50000, unitPrice: 0.008 },
            { upTo: null, unitPrice: 0.005 }
        ]
    },
    'Volume': {
        model: 'volume',
        currency: 'USD',
        tiers: [
            { upTo: 10000, unitPrice: 0.01 },
            { upTo: 50000, unitPrice: 0.008 },
            { upTo: null, unitPrice: 0.005 }
        ]
    },
    'Graduated': {
        model: 'graduated',
        currency: 'USD',
        tiers: [
            { upTo: 10000, flatPrice: 50, unitPrice: 0.005 },
            { upTo: 50000, flatPrice: 100, unitPrice: 0.003 },
            { upTo: null, flatPrice: 200, unitPrice: 0.002 }
        ]
    }
};
console.log(`For ${usage.toLocaleString()} API calls:`);
Object.entries(pricingModels).forEach(([modelName, config]) => {
    const invoice = simulator.simulate({
        customerId: `comparison_${modelName.toLowerCase()}`,
        periodStart: '2024-01-01',
        periodEnd: '2024-02-01',
        usageItems: [{
                metric: 'api_calls',
                quantity: usage,
                priceConfig: config
            }]
    });
    console.log(`  ${modelName} pricing: $${invoice.total}`);
});
// ================================================================================
// EXAMPLE 7: Edge Cases and Validation
// ================================================================================
console.log('\n' + '='.repeat(60));
console.log('EXAMPLE 7: Edge Cases and Validation');
console.log('='.repeat(60));
const edgeCases = [
    { name: 'Zero usage', quantity: 0 },
    { name: 'Tier boundary (exact)', quantity: 1000 },
    { name: 'Just over boundary', quantity: 1001 },
    { name: 'Fractional usage', quantity: 999.99 },
    { name: 'Very high usage', quantity: 1000000 }
];
edgeCases.forEach(testCase => {
    const invoice = simulator.simulate({
        customerId: 'edge_case_test',
        periodStart: '2024-01-01',
        periodEnd: '2024-02-01',
        usageItems: [{
                metric: 'api_calls',
                quantity: testCase.quantity,
                priceConfig: tieredApiPricing
            }]
    });
    console.log(`${testCase.name}: ${testCase.quantity} calls = $${invoice.total}`);
});
console.log('\n' + '='.repeat(60));
console.log('All examples completed successfully!');
console.log('See docs/simulator-getting-started.md for detailed documentation.');
console.log('='.repeat(60));
//# sourceMappingURL=pricing-simulator-examples.js.map