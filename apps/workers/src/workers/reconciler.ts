/**
 * Reconciler Worker - Compares local usage with Stripe and identifies discrepancies
 */

import Stripe from 'stripe';
import { db, redis, schema } from '@stripemeter/database';
import { eq, and, gte, sql } from 'drizzle-orm';
import { logger } from '../utils/logger';
import { getCurrentPeriod, RECONCILIATION_EPSILON } from '@stripemeter/core';

export class ReconcilerWorker {
  private stripe: Stripe;
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;

  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
      apiVersion: '2023-10-16',
      typescript: true,
    });
  }

  async start() {
    const intervalMs = parseInt(process.env.RECONCILIATION_INTERVAL_MS || '3600000', 10); // Default 1 hour
    
    // Run immediately on start
    this.runReconciliation();
    
    // Then run on interval
    this.intervalId = setInterval(() => {
      if (!this.isRunning) {
        this.runReconciliation();
      }
    }, intervalMs);

    logger.info(`Reconciler started (interval: ${intervalMs}ms)`);
  }

  async stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    // Wait for current run to complete
    while (this.isRunning) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    logger.info('Reconciler stopped');
  }

  private async runReconciliation() {
    if (this.isRunning) {
      logger.debug('Reconciliation already in progress, skipping');
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();
    
    try {
      logger.info('Starting reconciliation run');
      
      // Get current period
      const { start: periodStart } = getCurrentPeriod();
      
      // Get all active price mappings with subscription items
      const mappings = await db
        .select()
        .from(schema.priceMappings)
        .where(
          and(
            eq(schema.priceMappings.active, true),
            sql`${schema.priceMappings.subscriptionItemId} IS NOT NULL`
          )
        );

      logger.info(`Reconciling ${mappings.length} subscription items`);

      let totalReports = 0;
      let investigatingCount = 0;

      for (const mapping of mappings) {
        try {
          const reports = await this.reconcileSubscriptionItem(mapping, periodStart);
          totalReports += reports.length;
          investigatingCount += reports.filter(r => r.status === 'investigate').length;
        } catch (error) {
          logger.error(`Failed to reconcile mapping ${mapping.id}:`, error);
        }
      }

      const duration = Date.now() - startTime;
      logger.info(`Reconciliation completed in ${duration}ms: ${totalReports} reports, ${investigatingCount} investigating`);

      // Store metrics in Redis
      await redis.setex(
        'reconciliation:last_run',
        86400, // 24 hour TTL
        JSON.stringify({
          timestamp: new Date().toISOString(),
          duration,
          totalReports,
          investigatingCount,
          periodStart,
        })
      );

    } catch (error) {
      logger.error('Reconciliation run failed:', error);
    } finally {
      this.isRunning = false;
    }
  }

  private async reconcileSubscriptionItem(
    mapping: typeof schema.priceMappings.$inferSelect,
    periodStart: string
  ): Promise<Array<typeof schema.reconciliationReports.$inferSelect>> {
    const { tenantId, metric, aggregation, stripeAccount, subscriptionItemId } = mapping;
    
    if (!subscriptionItemId) {
      return [];
    }

    const reports: Array<typeof schema.reconciliationReports.$inferInsert> = [];

    try {
      // Get local totals from counters
      const counters = await db
        .select({
          customerRef: schema.counters.customerRef,
          total: sql<string>`
            CASE 
              WHEN ${aggregation} = 'sum' THEN ${schema.counters.aggSum}
              WHEN ${aggregation} = 'max' THEN ${schema.counters.aggMax}
              WHEN ${aggregation} = 'last' THEN COALESCE(${schema.counters.aggLast}, '0')
              ELSE ${schema.counters.aggSum}
            END
          `,
        })
        .from(schema.counters)
        .where(
          and(
            eq(schema.counters.tenantId, tenantId),
            eq(schema.counters.metric, metric),
            eq(schema.counters.periodStart, periodStart)
          )
        );

      // Calculate local total across all customers
      const localTotal = counters.reduce((sum, c) => sum + parseFloat(c.total), 0);

      // Get Stripe reported usage
      const stripeUsage = await this.getStripeUsage(subscriptionItemId, periodStart, stripeAccount);
      const stripeTotal = stripeUsage.total_usage || 0;

      // Calculate difference
      const diff = Math.abs(localTotal - stripeTotal);
      const diffPercentage = stripeTotal > 0 ? diff / stripeTotal : diff > 0 ? 1 : 0;

      // Determine status based on epsilon tolerance
      let status: 'ok' | 'investigate' | 'resolved';
      if (diffPercentage <= RECONCILIATION_EPSILON) {
        status = 'ok';
      } else {
        status = 'investigate';
        logger.warn(`Reconciliation diff exceeds epsilon for ${subscriptionItemId}: local=${localTotal}, stripe=${stripeTotal}, diff=${diff} (${(diffPercentage * 100).toFixed(2)}%)`);
      }

      // Create reconciliation report
      const report: typeof schema.reconciliationReports.$inferInsert = {
        tenantId,
        subscriptionItemId,
        periodStart,
        localTotal: localTotal.toString(),
        stripeTotal: stripeTotal.toString(),
        diff: diff.toString(),
        status,
        createdAt: new Date(),
      };

      await db.insert(schema.reconciliationReports).values(report);
      reports.push(report);

      // If investigating, create suggested adjustments
      if (status === 'investigate') {
        await this.createSuggestedAdjustments(
          tenantId,
          metric,
          counters,
          localTotal,
          stripeTotal,
          periodStart
        );
      }

      // Update metrics in Redis
      const metricsKey = `reconciliation:metrics:${tenantId}:${subscriptionItemId}:${periodStart}`;
      await redis.setex(
        metricsKey,
        86400, // 24 hour TTL
        JSON.stringify({
          localTotal,
          stripeTotal,
          diff,
          diffPercentage,
          status,
          timestamp: new Date().toISOString(),
        })
      );

    } catch (error) {
      logger.error(`Failed to reconcile ${subscriptionItemId}:`, error);
    }

    return reports;
  }

  private async getStripeUsage(
    subscriptionItemId: string,
    periodStart: string,
    stripeAccount: string
  ): Promise<Stripe.UsageRecordSummary> {
    try {
      // Get subscription item to find the current period
      const subscriptionItem = await this.stripe.subscriptionItems.retrieve(
        subscriptionItemId,
        {
          stripeAccount: stripeAccount !== 'default' ? stripeAccount : undefined,
        }
      );

      // List usage record summaries for the period
      const summaries = await this.stripe.subscriptionItems.listUsageRecordSummaries(
        subscriptionItemId,
        {
          limit: 1,
        },
        {
          stripeAccount: stripeAccount !== 'default' ? stripeAccount : undefined,
        }
      );

      if (summaries.data.length > 0) {
        return summaries.data[0];
      }

      // Return empty summary if none found
      return {
        id: '',
        object: 'usage_record_summary',
        invoice: null,
        livemode: false,
        period: {
          start: Math.floor(new Date(periodStart).getTime() / 1000),
          end: Math.floor(Date.now() / 1000),
        },
        subscription_item: subscriptionItemId,
        total_usage: 0,
      };

    } catch (error: any) {
      logger.error(`Failed to fetch Stripe usage for ${subscriptionItemId}:`, error);
      throw error;
    }
  }

  private async createSuggestedAdjustments(
    tenantId: string,
    metric: string,
    counters: Array<{ customerRef: string; total: string }>,
    localTotal: number,
    stripeTotal: number,
    periodStart: string
  ) {
    const diff = stripeTotal - localTotal;
    
    // If Stripe has more usage than local, we might be missing events
    if (diff > 0) {
      // Distribute the difference proportionally across customers
      for (const counter of counters) {
        const customerTotal = parseFloat(counter.total);
        const proportion = localTotal > 0 ? customerTotal / localTotal : 1 / counters.length;
        const adjustmentAmount = diff * proportion;

        if (adjustmentAmount > 0.01) { // Only create adjustment if significant
          await db.insert(schema.adjustments).values({
            tenantId,
            metric,
            customerRef: counter.customerRef,
            periodStart,
            delta: adjustmentAmount.toString(),
            reason: 'correction' as const,
            actor: 'system:reconciliation',
            createdAt: new Date(),
          });

          logger.info(`Created suggested adjustment for ${counter.customerRef}: +${adjustmentAmount.toFixed(2)}`);
        }
      }
    } else if (diff < 0) {
      // If local has more usage than Stripe, we might need to push more
      logger.warn(`Local usage exceeds Stripe for ${metric}: might need manual intervention`);
      
      // Store alert in Redis for admin review
      const alertKey = `reconciliation:alert:${tenantId}:${metric}:${periodStart}`;
      await redis.setex(
        alertKey,
        86400 * 7, // 7 day TTL
        JSON.stringify({
          type: 'local_exceeds_stripe',
          localTotal,
          stripeTotal,
          diff: Math.abs(diff),
          timestamp: new Date().toISOString(),
          message: 'Local usage exceeds Stripe reported usage. Manual review required.',
        })
      );
    }
  }
}
