/**
 * Stripe Writer Worker - Pushes usage deltas to Stripe
 */

import Stripe from 'stripe';
import { db, redis, priceMappings, counters, writeLog } from '@stripemeter/database';
import { eq, and } from 'drizzle-orm';
import { logger } from '../utils/logger';
import { generateStripeIdempotencyKey, generateDeterministicStripeIdempotencyKey, getCurrentPeriod } from '@stripemeter/core';
import { backOff } from 'exponential-backoff';
import pLimit from 'p-limit';
import { shadowUsagePostsTotal, shadowUsagePostFailuresTotal } from '../utils/metrics';

export class StripeWriterWorker {
  private stripeLive: Stripe;
  private stripeTest: Stripe | null = null;
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;
  private rateLimiter: Map<string, any> = new Map();

  constructor() {
    this.stripeLive = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
      apiVersion: '2023-10-16',
      typescript: true,
    });
    const testKey = process.env.STRIPE_TEST_SECRET_KEY || '';
    if (testKey) {
      this.stripeTest = new Stripe(testKey, {
        apiVersion: '2023-10-16',
        typescript: true,
      });
    }
  }

  async start() {
    const intervalMs = parseInt(process.env.STRIPE_WRITER_INTERVAL_MS || '10000', 10);
    
    // Run immediately on start
    this.processWriteQueue();
    
    // Then run on interval
    this.intervalId = setInterval(() => {
      if (!this.isRunning) {
        this.processWriteQueue();
      }
    }, intervalMs);

    logger.info(`Stripe writer started (interval: ${intervalMs}ms)`);
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
    
    logger.info('Stripe writer stopped');
  }

  private async processWriteQueue() {
    if (this.isRunning) {
      logger.debug('Write queue processing already in progress, skipping');
      return;
    }

    this.isRunning = true;
    
    try {
      // Get current period
      const { start: periodStart } = getCurrentPeriod();
      
      // Get all active price mappings
      const mappings = await db
        .select()
        .from(priceMappings)
        .where(eq(priceMappings.active, true));

      logger.debug(`Processing ${mappings.length} price mappings`);

      // Process each mapping
      for (const mapping of mappings) {
        try {
          await this.processMappingDelta(mapping, periodStart);
        } catch (error) {
          logger.error(`Failed to process mapping ${mapping.id}:`, error);
        }
      }

    } catch (error) {
      logger.error('Failed to process write queue:', error);
    } finally {
      this.isRunning = false;
    }
  }

  private async processMappingDelta(
    mapping: typeof priceMappings.$inferSelect,
    periodStart: string
  ) {
    const { tenantId, metric, stripeAccount, subscriptionItemId } = mapping as any;

    if (!subscriptionItemId) {
      logger.debug(`No subscription item for mapping ${mapping.id}, skipping`);
      return;
    }

    // Get rate limiter for this Stripe account
    let limiter = this.rateLimiter.get(stripeAccount);
    if (!limiter) {
      // Default to 25 requests per second per account
      limiter = pLimit(25);
      this.rateLimiter.set(stripeAccount, limiter);
    }

    // Get all customers with usage for this metric in current period
    const countersList = await db
      .select()
      .from(counters)
      .where(
        and(
          eq(counters.tenantId, tenantId),
          eq(counters.metric, metric),
          eq(counters.periodStart, periodStart)
        )
      );

    for (const counter of countersList) {
      await limiter(async () => {
        await this.pushDeltaForCustomer(
          mapping,
          counter,
          periodStart
        );
      });
    }
  }

  private async pushDeltaForCustomer(
    mapping: typeof priceMappings.$inferSelect,
    counter: typeof counters.$inferSelect,
    periodStart: string
  ) {
    const { tenantId, stripeAccount, subscriptionItemId, shadow, shadowStripeAccount, shadowSubscriptionItemId } = mapping as any;
    const { customerRef } = counter;

    // Get local total based on aggregation type
    let localTotal: number;
    switch (mapping.aggregation) {
      case 'sum':
        localTotal = parseFloat(counter.aggSum);
        break;
      case 'max':
        localTotal = parseFloat(counter.aggMax);
        break;
      case 'last':
        localTotal = counter.aggLast ? parseFloat(counter.aggLast) : 0;
        break;
      default:
        localTotal = parseFloat(counter.aggSum);
    }

    // Determine live vs shadow routing
    const isShadow = shadow === true && !!this.stripeTest;
    if (shadow === true && !this.stripeTest) {
      logger.warn('Shadow mode mapping detected but STRIPE_TEST_SECRET_KEY is not configured; skipping shadow push');
    }
    const targetStripe = isShadow ? this.stripeTest! : this.stripeLive;
    const effectiveStripeAccount = isShadow ? (shadowStripeAccount || stripeAccount) : stripeAccount;
    const effectiveSubscriptionItemId = isShadow ? (shadowSubscriptionItemId || subscriptionItemId) : subscriptionItemId;

    // Get previously pushed total (only for live mode; shadow should not affect write_log)
    const [writeLogRow] = await db
      .select()
      .from(writeLog)
      .where(
        and(
          eq(writeLog.tenantId, tenantId),
          eq(writeLog.stripeAccount, stripeAccount),
          eq(writeLog.subscriptionItemId, subscriptionItemId!),
          eq(writeLog.periodStart, periodStart)
        )
      )
      .limit(1);

    const pushedTotal = writeLogRow ? parseFloat(writeLogRow.pushedTotal) : 0;
    const delta = localTotal - pushedTotal;

    // Skip if no delta
    if (delta <= 0) {
      logger.debug(`No delta for ${subscriptionItemId}/${customerRef}: local=${localTotal}, pushed=${pushedTotal}`);
      return;
    }

    logger.info(`[${isShadow ? 'TEST' : 'LIVE'}] Pushing delta for ${effectiveSubscriptionItemId}/${customerRef}: delta=${delta}, local=${localTotal}, pushed=${pushedTotal}`);

    // Generate idempotency key
    const idempotencyKey = isShadow
      ? generateDeterministicStripeIdempotencyKey({
          tenantId,
          subscriptionItemId: effectiveSubscriptionItemId!,
          periodStart,
          quantity: localTotal,
        })
      : generateStripeIdempotencyKey({
          tenantId,
          subscriptionItemId: effectiveSubscriptionItemId!,
          periodStart,
          quantity: localTotal,
        });

    try {
      // Push to Stripe with exponential backoff
      await backOff(
        async () => {
          const usageRecord = await targetStripe.subscriptionItems.createUsageRecord(
            effectiveSubscriptionItemId!,
            {
              quantity: Math.round(localTotal), // Stripe requires integer for most prices
              timestamp: Math.floor(Date.now() / 1000),
              action: 'set', // Set total, not increment
            },
            {
              idempotencyKey,
              stripeAccount: effectiveStripeAccount !== 'default' ? effectiveStripeAccount : undefined,
            }
          );

          logger.info(`Successfully pushed usage record ${usageRecord.id} for ${subscriptionItemId}`);
          if (isShadow) {
            shadowUsagePostsTotal.inc({ tenant: tenantId, metric: mapping.metric }, 1);
          }
          return usageRecord;
        },
        {
          numOfAttempts: 5,
          startingDelay: 1000,
          timeMultiple: 2,
          maxDelay: 30000,
          retry: (error: any) => {
            // Retry on rate limit or temporary errors
            if (error?.statusCode === 429 || error?.statusCode >= 500) {
              logger.warn(`Retrying Stripe request due to ${error.statusCode} error`);
              return true;
            }
            return false;
          },
        }
      );

      // Update write log only for live mode
      if (!isShadow && writeLogRow) {
        await db
          .update(writeLog)
          .set({
            pushedTotal: localTotal.toString(),
            lastRequestId: idempotencyKey,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(writeLog.tenantId, tenantId),
              eq(writeLog.stripeAccount, stripeAccount),
              eq(writeLog.subscriptionItemId, subscriptionItemId!),
              eq(writeLog.periodStart, periodStart)
            )
          );
      } else if (!isShadow) {
        await db
          .insert(writeLog)
          .values({
            tenantId,
            stripeAccount,
            subscriptionItemId: subscriptionItemId!,
            periodStart,
            pushedTotal: localTotal.toString(),
            lastRequestId: idempotencyKey,
            updatedAt: new Date(),
          });
      }

      // Update cache
      const cacheKey = `write_log:${tenantId}:${effectiveSubscriptionItemId}:${periodStart}`;
      await redis.setex(
        cacheKey,
        3600, // 1 hour TTL
        JSON.stringify({
          pushedTotal: localTotal,
          lastRequestId: idempotencyKey,
          updatedAt: new Date().toISOString(),
        })
      );

    } catch (error: any) {
      logger.error(`Failed to push usage for ${effectiveSubscriptionItemId}:`, {
        error: error.message,
        statusCode: error.statusCode,
        type: error.type,
        code: error.code,
      });

      if (isShadow) {
        shadowUsagePostFailuresTotal.inc({ tenant: tenantId, metric: mapping.metric, reason: String(error.code || error.type || 'unknown') }, 1);
      }

      // Store error in Redis for monitoring
      const errorKey = `write_error:${tenantId}:${subscriptionItemId}:${periodStart}`;
      await redis.setex(
        errorKey,
        3600, // 1 hour TTL
        JSON.stringify({
          error: error.message,
          statusCode: error.statusCode,
          timestamp: new Date().toISOString(),
          delta,
          localTotal,
          pushedTotal,
        })
      );

      throw error;
    }
  }
}
