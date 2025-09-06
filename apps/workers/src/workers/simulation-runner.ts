/**
 * Simulation Runner Worker - Executes pricing simulations
 */

import { Worker, Job } from 'bullmq';
import { db, simulationRuns, simulationBatches, redis } from '@stripemeter/database';
import { eq, sql, and } from 'drizzle-orm';
import { InvoiceSimulator } from '@stripemeter/pricing-lib';
import { logger } from '../utils/logger';

interface SimulationJobData {
  runId: string;
  tenantId: string;
  scenario: any;
  batchId?: string;
}

interface ComparisonResult {
  passed: boolean;
  differences: Array<{
    field: string;
    expected: any;
    actual: any;
    difference: number;
  }>;
}

export class SimulationRunnerWorker {
  private worker: Worker | null = null;
  private simulator: InvoiceSimulator;

  constructor() {
    this.simulator = new InvoiceSimulator();
  }

  async start() {
    this.worker = new Worker(
      'simulations',
      async (job: Job<SimulationJobData>) => {
        await this.processSimulation(job);
      },
      {
        connection: redis,
        concurrency: 5,
      }
    );

    this.worker.on('completed', (job) => {
      logger.info(`Simulation ${job.data.runId} completed`);
    });

    this.worker.on('failed', (job, err) => {
      logger.error(`Simulation ${job?.data?.runId} failed:`, err);
    });

    logger.info('Simulation runner worker started');
  }

  async stop() {
    if (this.worker) {
      await this.worker.close();
      this.worker = null;
    }
    logger.info('Simulation runner worker stopped');
  }

  private async processSimulation(job: Job<SimulationJobData>) {
    const { runId, tenantId, scenario, batchId } = job.data;
    const startTime = Date.now();

    try {
      // Update run status to running
      await db
        .update(simulationRuns)
        .set({
          status: 'running',
          startedAt: new Date(),
        })
        .where(eq(simulationRuns.id, runId));

      // Run the simulation
      const result = await this.runSimulation(scenario);

      // Compare with expected if provided
      let comparison: ComparisonResult | null = null;
      let passed: boolean | null = null;

      if (scenario.expected) {
        comparison = this.compareResults(result, scenario.expected, scenario.tolerances);
        passed = comparison.passed;
      }

      // Update run with results
      await db
        .update(simulationRuns)
        .set({
          status: 'completed',
          completedAt: new Date(),
          durationMs: Date.now() - startTime,
          result,
          comparison,
          passed,
        })
        .where(eq(simulationRuns.id, runId));

      // Update batch if part of one
      if (batchId) {
        await this.updateBatchStatus(batchId, tenantId);
      }

      return { success: true, result, comparison };

    } catch (error) {
      const errorDetails = {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        details: error,
      };

      // Update run with error
      await db
        .update(simulationRuns)
        .set({
          status: 'failed',
          completedAt: new Date(),
          durationMs: Date.now() - startTime,
          error: errorDetails,
        })
        .where(eq(simulationRuns.id, runId));

      // Update batch if part of one
      if (batchId) {
        await this.updateBatchStatus(batchId, tenantId);
      }

      throw error;
    }
  }

  private async runSimulation(scenario: any) {
    // Extract inputs from scenario
    const inputs = scenario.inputs || scenario;

    // Validate required fields
    if (!inputs.customerId || !inputs.periodStart || !inputs.periodEnd || !inputs.usageItems) {
      throw new Error('Missing required simulation inputs');
    }

    // Run the simulation
    try {
      const invoice = this.simulator.simulate({
        customerId: inputs.customerId,
        periodStart: inputs.periodStart,
        periodEnd: inputs.periodEnd,
        usageItems: inputs.usageItems,
        commitments: inputs.commitments,
        credits: inputs.credits,
        taxRate: inputs.taxRate,
      });

      return invoice;
    } catch (error) {
      logger.error('Simulation execution failed:', error);
      throw new Error(`Simulation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private compareResults(actual: any, expected: any, tolerances?: any): ComparisonResult {
    const differences: ComparisonResult['differences'] = [];
    const absoluteTolerance = tolerances?.absolute || 0.01; // Default $0.01
    const relativeTolerance = tolerances?.relative || 0.001; // Default 0.1%

    // Compare total (most important)
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

    // Compare tax
    if (expected.tax !== undefined) {
      const diff = Math.abs(actual.tax - expected.tax);
      const relDiff = expected.tax > 0 ? diff / expected.tax : diff;

      if (diff > absoluteTolerance && relDiff > relativeTolerance) {
        differences.push({
          field: 'tax',
          expected: expected.tax,
          actual: actual.tax,
          difference: diff,
        });
      }
    }

    // Compare line items if provided
    if (expected.lineItems && Array.isArray(expected.lineItems)) {
      for (const expectedItem of expected.lineItems) {
        const actualItem = actual.lineItems.find((item: any) => item.metric === expectedItem.metric);

        if (!actualItem) {
          differences.push({
            field: `lineItem.${expectedItem.metric}`,
            expected: expectedItem,
            actual: null,
            difference: -1,
          });
          continue;
        }

        // Compare line item subtotal
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

        // Compare line item quantity
        if (expectedItem.quantity !== undefined && actualItem.quantity !== expectedItem.quantity) {
          differences.push({
            field: `lineItem.${expectedItem.metric}.quantity`,
            expected: expectedItem.quantity,
            actual: actualItem.quantity,
            difference: Math.abs(actualItem.quantity - expectedItem.quantity),
          });
        }
      }
    }

    return {
      passed: differences.length === 0,
      differences,
    };
  }

  private async updateBatchStatus(batchId: string, tenantId: string) {
    // Get all runs for this batch
    const runs = await db
      .select({
        status: simulationRuns.status,
      })
      .from(simulationRuns)
      .where(and(
        eq(simulationRuns.tenantId, tenantId),
        sql`${simulationRuns.metadata}->>'batchId' = ${batchId}`
      ));

    const completedCount = runs.filter(r => r.status === 'completed').length;
    const failedCount = runs.filter(r => r.status === 'failed').length;
    const totalCount = runs.length;

    // Determine batch status
    let batchStatus = 'running';
    let completedAt = null;

    if (completedCount + failedCount === totalCount) {
      batchStatus = failedCount === 0 ? 'completed' : failedCount === totalCount ? 'failed' : 'partial';
      completedAt = new Date();
    }

    // Calculate summary statistics
    const successRate = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
    const summary = {
      totalRuns: totalCount,
      completed: completedCount,
      failed: failedCount,
      pending: runs.filter(r => r.status === 'pending').length,
      running: runs.filter(r => r.status === 'running').length,
      successRate: Math.round(successRate * 100) / 100,
    };

    // Update batch
    await db
      .update(simulationBatches)
      .set({
        status: batchStatus,
        completedRuns: completedCount,
        failedRuns: failedCount,
        completedAt,
        summary,
      })
      .where(eq(simulationBatches.id, batchId));
  }
}

