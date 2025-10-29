/**
 * Unit tests for Simulation Runner Worker
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SimulationRunnerWorker } from './simulation-runner';
import { InvoiceSimulator } from '@stripemeter/pricing-lib';
import { compareInvoices } from '@stripemeter/core';

// Mock dependencies
vi.mock('@stripemeter/database', () => ({
  db: {
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
  },
  simulationRuns: {},
  simulationBatches: {},
  simulationAssertions: {},
  redis: {
    ping: vi.fn(),
  },
  eq: vi.fn(),
  sql: vi.fn(),
  and: vi.fn(),
}));

vi.mock('../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('bullmq', () => ({
  Worker: vi.fn().mockImplementation(() => ({
    on: vi.fn(),
    close: vi.fn(),
  })),
  Queue: vi.fn(),
  Job: vi.fn(),
}));

describe('SimulationRunnerWorker', () => {
  let worker: SimulationRunnerWorker;

  beforeEach(() => {
    worker = new SimulationRunnerWorker();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // Use shared assertions with a small adapter to match previous signature
  const compareResults = (actual: any, expected: any, tolerances?: any) =>
    compareInvoices(actual, expected, { tolerances });

  describe('Simulation Execution', () => {
    it('should successfully run a basic simulation', async () => {
      const scenario = {
        inputs: {
          customerId: 'test_customer',
          periodStart: '2024-01-01',
          periodEnd: '2024-01-31',
          usageItems: [
            {
              metric: 'api_calls',
              quantity: 1000,
              priceConfig: {
                model: 'flat',
                currency: 'USD',
                unitPrice: 0.01,
              },
            },
          ],
        },
      };

      const simulator = new InvoiceSimulator();
      const result = simulator.simulate(scenario.inputs);

      expect(result).toBeDefined();
      expect(result.total).toBe(10); // 1000 * 0.01
      expect(result.customerId).toBe('test_customer');
      expect(result.lineItems).toHaveLength(1);
      expect(result.lineItems[0].metric).toBe('api_calls');
    });

    it('should handle tiered pricing correctly', async () => {
      const scenario = {
        inputs: {
          customerId: 'test_customer',
          periodStart: '2024-01-01',
          periodEnd: '2024-01-31',
          usageItems: [
            {
              metric: 'api_calls',
              quantity: 350,
              priceConfig: {
                model: 'tiered',
                currency: 'USD',
                tiers: [
                  { upTo: 100, unitPrice: 0.10 },
                  { upTo: 500, unitPrice: 0.08 },
                  { upTo: null, unitPrice: 0.05 },
                ],
              },
            },
          ],
        },
      };

      const simulator = new InvoiceSimulator();
      const result = simulator.simulate(scenario.inputs);

      // 100 * 0.10 + 250 * 0.08 = 10 + 20 = 30
      expect(result.total).toBe(30);
    });

    it('should handle volume pricing correctly', async () => {
      const scenario = {
        inputs: {
          customerId: 'test_customer',
          periodStart: '2024-01-01',
          periodEnd: '2024-01-31',
          usageItems: [
            {
              metric: 'storage_gb',
              quantity: 250,
              priceConfig: {
                model: 'volume',
                currency: 'USD',
                tiers: [
                  { upTo: 100, unitPrice: 0.10 },
                  { upTo: 500, unitPrice: 0.07 },
                  { upTo: null, unitPrice: 0.04 },
                ],
              },
            },
          ],
        },
      };

      const simulator = new InvoiceSimulator();
      const result = simulator.simulate(scenario.inputs);

      // Volume pricing: 250 GB falls in 100-500 tier, all units at 0.07
      expect(result.total).toBe(17.5); // 250 * 0.07
    });

    it('should handle graduated pricing correctly', async () => {
      const scenario = {
        inputs: {
          customerId: 'test_customer',
          periodStart: '2024-01-01',
          periodEnd: '2024-01-31',
          usageItems: [
            {
              metric: 'compute_hours',
              quantity: 150,
              priceConfig: {
                model: 'graduated',
                currency: 'USD',
                tiers: [
                  { upTo: 100, flatPrice: 10, unitPrice: 0.05 },
                  { upTo: 500, flatPrice: 30, unitPrice: 0.03 },
                  { upTo: null, flatPrice: 100, unitPrice: 0.02 },
                ],
              },
            },
          ],
        },
      };

      const simulator = new InvoiceSimulator();
      const result = simulator.simulate(scenario.inputs);

      // Graduated: 150 units total
      // First 100 units: flatPrice: 10 + (100 * 0.05) = 10 + 5 = 15
      // Next 50 units: flatPrice: 30 + (50 * 0.03) = 30 + 1.5 = 31.5
      // Total: 15 + 31.5 = 46.5
      expect(result.total).toBe(46.5);
    });

    it('should handle package pricing correctly', async () => {
      const scenario = {
        inputs: {
          customerId: 'test_customer',
          periodStart: '2024-01-01',
          periodEnd: '2024-01-31',
          usageItems: [
            {
              metric: 'sms_messages',
              quantity: 250,
              priceConfig: {
                model: 'package',
                currency: 'USD',
                packageSize: 100,
                unitPrice: 5.00,
              },
            },
          ],
        },
      };

      const simulator = new InvoiceSimulator();
      const result = simulator.simulate(scenario.inputs);

      // Package: 250 messages = 3 packages (ceil(250/100))
      expect(result.total).toBe(15); // 3 * 5.00
    });

    it('should apply commitments correctly', async () => {
      const scenario = {
        inputs: {
          customerId: 'test_customer',
          periodStart: '2024-01-01',
          periodEnd: '2024-01-31',
          usageItems: [
            {
              metric: 'api_calls',
              quantity: 1000,
              priceConfig: {
                model: 'flat',
                currency: 'USD',
                unitPrice: 0.01,
              },
            },
          ],
          commitments: [
            {
              amount: 5,
              startDate: '2024-01-01',
              endDate: '2024-12-31',
              applied: 0,
            },
          ],
        },
      };

      const simulator = new InvoiceSimulator();
      const result = simulator.simulate(scenario.inputs);

      // Subtotal: 10, Commitment credit: 5
      expect(result.subtotal).toBe(10);
      expect(result.credits).toBe(5);
      expect(result.total).toBe(5); // 10 - 5
    });

    it('should apply credits correctly', async () => {
      const scenario = {
        inputs: {
          customerId: 'test_customer',
          periodStart: '2024-01-01',
          periodEnd: '2024-01-31',
          usageItems: [
            {
              metric: 'api_calls',
              quantity: 1000,
              priceConfig: {
                model: 'flat',
                currency: 'USD',
                unitPrice: 0.01,
              },
            },
          ],
          credits: [
            { amount: 3, reason: 'Promotional credit' },
            { amount: 2, reason: 'Service credit' },
          ],
        },
      };

      const simulator = new InvoiceSimulator();
      const result = simulator.simulate(scenario.inputs);

      expect(result.subtotal).toBe(10);
      expect(result.credits).toBe(5); // 3 + 2
      expect(result.total).toBe(5); // 10 - 5
    });

    it('should calculate tax correctly', async () => {
      const scenario = {
        inputs: {
          customerId: 'test_customer',
          periodStart: '2024-01-01',
          periodEnd: '2024-01-31',
          usageItems: [
            {
              metric: 'api_calls',
              quantity: 1000,
              priceConfig: {
                model: 'flat',
                currency: 'USD',
                unitPrice: 0.01,
              },
            },
          ],
          taxRate: 10, // 10% tax
        },
      };

      const simulator = new InvoiceSimulator();
      const result = simulator.simulate(scenario.inputs);

      expect(result.subtotal).toBe(10);
      expect(result.tax).toBe(1); // 10 * 0.10
      expect(result.total).toBe(11); // 10 + 1
    });

    it('should handle minimum and maximum charges', async () => {
      const scenarioMin = {
        inputs: {
          customerId: 'test_customer',
          periodStart: '2024-01-01',
          periodEnd: '2024-01-31',
          usageItems: [
            {
              metric: 'api_calls',
              quantity: 10,
              priceConfig: {
                model: 'flat',
                currency: 'USD',
                unitPrice: 0.01,
                minimumCharge: 5,
              },
            },
          ],
        },
      };

      const simulatorMin = new InvoiceSimulator();
      const resultMin = simulatorMin.simulate(scenarioMin.inputs);
      expect(resultMin.total).toBe(5); // Minimum charge applied

      const scenarioMax = {
        inputs: {
          customerId: 'test_customer',
          periodStart: '2024-01-01',
          periodEnd: '2024-01-31',
          usageItems: [
            {
              metric: 'api_calls',
              quantity: 10000,
              priceConfig: {
                model: 'flat',
                currency: 'USD',
                unitPrice: 0.01,
                maximumCharge: 50,
              },
            },
          ],
        },
      };

      const simulatorMax = new InvoiceSimulator();
      const resultMax = simulatorMax.simulate(scenarioMax.inputs);
      expect(resultMax.total).toBe(50); // Maximum charge applied
    });
  });

  describe('Result Comparison', () => {
    it('should pass comparison when results match expected', () => {
      const actual = {
        total: 100.00,
        subtotal: 100.00,
        tax: 0,
        lineItems: [
          { metric: 'api_calls', quantity: 1000, subtotal: 100.00 },
        ],
      };

      const expected = {
        total: 100.00,
        subtotal: 100.00,
        tax: 0,
      };

      const comparison = compareResults(actual, expected);
      expect(comparison.passed).toBe(true);
      expect(comparison.differences).toHaveLength(0);
    });

    it('should fail comparison when results differ beyond tolerance', () => {
      const actual = {
        total: 105.00,
        subtotal: 105.00,
        tax: 0,
      };

      const expected = {
        total: 100.00,
        subtotal: 100.00,
        tax: 0,
      };

      const tolerances = {
        absolute: 0.01,
        relative: 0.01, // 1%
      };

      const comparison = compareResults(actual, expected, tolerances);
      expect(comparison.passed).toBe(false);
      expect(comparison.differences).toHaveLength(2); // total and subtotal differ
    });

    it('should pass comparison when within tolerance', () => {
      const actual = {
        total: 100.005,
        subtotal: 100.005,
        tax: 0,
      };

      const expected = {
        total: 100.00,
        subtotal: 100.00,
        tax: 0,
      };

      const tolerances = {
        absolute: 0.01,
        relative: 0.001,
      };

      const comparison = compareResults(actual, expected, tolerances);
      expect(comparison.passed).toBe(true);
      expect(comparison.differences).toHaveLength(0);
    });

    it('should compare line items correctly', () => {
      const actual = {
        total: 100.00,
        lineItems: [
          { metric: 'api_calls', quantity: 1000, subtotal: 60.00 },
          { metric: 'storage_gb', quantity: 100, subtotal: 40.00 },
        ],
      };

      const expected = {
        total: 100.00,
        lineItems: [
          { metric: 'api_calls', subtotal: 60.00 },
          { metric: 'storage_gb', subtotal: 35.00 }, // Different!
        ],
      };

      const comparison = compareResults(actual, expected);
      expect(comparison.passed).toBe(false);
      expect(comparison.differences).toContainEqual(
        expect.objectContaining({
          field: 'lineItem.storage_gb.subtotal',
          expected: 35.00,
          actual: 40.00,
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle missing required fields', () => {
      const invalidScenario = {
        inputs: {
          customerId: 'test_customer',
          // Missing periodStart, periodEnd, usageItems
        },
      };

      expect(() => {
        const simulator = new InvoiceSimulator();
        simulator.simulate(invalidScenario.inputs as any);
      }).toThrow();
    });

    it('should handle invalid pricing models', () => {
      const invalidScenario = {
        inputs: {
          customerId: 'test_customer',
          periodStart: '2024-01-01',
          periodEnd: '2024-01-31',
          usageItems: [
            {
              metric: 'api_calls',
              quantity: 1000,
              priceConfig: {
                model: 'invalid_model' as any,
                currency: 'USD',
              },
            },
          ],
        },
      };

      const simulator = new InvoiceSimulator();
      const result = simulator.simulate(invalidScenario.inputs);
      
      // Should handle gracefully with 0 charge
      expect(result.total).toBe(0);
    });

    it('should handle negative quantities', () => {
      const scenario = {
        inputs: {
          customerId: 'test_customer',
          periodStart: '2024-01-01',
          periodEnd: '2024-01-31',
          usageItems: [
            {
              metric: 'api_calls',
              quantity: -100,
              priceConfig: {
                model: 'flat',
                currency: 'USD',
                unitPrice: 0.01,
              },
            },
          ],
        },
      };

      const simulator = new InvoiceSimulator();
      const result = simulator.simulate(scenario.inputs);
      
      // Should handle negative as 0
      expect(result.total).toBe(0);
    });
  });
});

// Helper function for comparison (extracted from worker)
function compareResults(actual: any, expected: any, tolerances?: any) {
  const differences: any[] = [];
  const absoluteTolerance = tolerances?.absolute || 0.01;
  const relativeTolerance = tolerances?.relative || 0.001;

  // Compare total
  if (expected.total !== undefined) {
    const diff = Math.abs(actual.total - expected.total);
    const relDiff = expected.total > 0 ? diff / expected.total : diff;

    if (diff > absoluteTolerance && relDiff > relativeTolerance) {
      differences.push({
        field: 'total',
        expected: expected.total,
        actual: actual.total,
        difference: diff,
      });
    }
  }

  // Compare subtotal
  if (expected.subtotal !== undefined) {
    const diff = Math.abs(actual.subtotal - expected.subtotal);
    const relDiff = expected.subtotal > 0 ? diff / expected.subtotal : diff;

    if (diff > absoluteTolerance && relDiff > relativeTolerance) {
      differences.push({
        field: 'subtotal',
        expected: expected.subtotal,
        actual: actual.subtotal,
        difference: diff,
      });
    }
  }

  // Compare line items
  if (expected.lineItems && Array.isArray(expected.lineItems)) {
    for (const expectedItem of expected.lineItems) {
      const actualItem = actual.lineItems?.find((item: any) => item.metric === expectedItem.metric);

      if (!actualItem) {
        differences.push({
          field: `lineItem.${expectedItem.metric}`,
          expected: expectedItem,
          actual: null,
          difference: -1,
        });
        continue;
      }

      if (expectedItem.subtotal !== undefined) {
        const diff = Math.abs(actualItem.subtotal - expectedItem.subtotal);
        const relDiff = expectedItem.subtotal > 0 ? diff / expectedItem.subtotal : diff;

        if (diff > absoluteTolerance && relDiff > relativeTolerance) {
          differences.push({
            field: `lineItem.${expectedItem.metric}.subtotal`,
            expected: expectedItem.subtotal,
            actual: actualItem.subtotal,
            difference: diff,
          });
        }
      }
    }
  }

  return {
    passed: differences.length === 0,
    differences,
  };
}
