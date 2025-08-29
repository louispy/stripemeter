/**
 * Aggregator Worker - Processes events and updates counters
 */

import { Worker, Queue, Job } from 'bullmq';
import { redis, db, events, counters, adjustments } from '@stripemeter/database';
import { eq, and, gte, lte, sql } from 'drizzle-orm';
import { logger } from '../utils/logger';
import { getPeriodEnd, isEventTooLate } from '@stripemeter/core';

interface AggregationJob {
  tenantId: string;
  metric: string;
  customerRef: string;
  periodStart: string;
}

export class AggregatorWorker {
  private worker: Worker | null = null;
  private queue: Queue;

  constructor() {
    this.queue = new Queue('aggregation', {
      connection: redis,
    });
  }

  async start() {
    this.worker = new Worker(
      'aggregation',
      async (job: Job<AggregationJob>) => {
        await this.processAggregation(job.data);
      },
      {
        connection: redis,
        concurrency: parseInt(process.env.WORKER_CONCURRENCY || '5', 10),
        limiter: {
          max: 100,
          duration: 1000, // 100 jobs per second
        },
      }
    );

    this.worker.on('completed', (job) => {
      logger.debug(`Aggregation completed for job ${job.id}`);
    });

    this.worker.on('failed', (job, err) => {
      logger.error(`Aggregation failed for job ${job?.id}:`, err);
    });

    logger.info('Aggregator worker started');
  }

  async stop() {
    if (this.worker) {
      await this.worker.close();
      this.worker = null;
    }
    await this.queue.close();
    logger.info('Aggregator worker stopped');
  }

  private async processAggregation(data: AggregationJob) {
    const { tenantId, metric, customerRef, periodStart } = data;
    
    logger.debug(`Processing aggregation for ${tenantId}/${metric}/${customerRef}/${periodStart}`);

    try {
      // Get period boundaries
      const periodEnd = getPeriodEnd(periodStart);
      const periodStartDate = new Date(periodStart);
      const periodEndDate = new Date(periodEnd + 'T23:59:59.999Z');

      // Check if counter exists
      const [existingCounter] = await db
        .select()
        .from(counters)
        .where(
          and(
            eq(counters.tenantId, tenantId),
            eq(counters.metric, metric),
            eq(counters.customerRef, customerRef),
            eq(counters.periodStart, periodStart)
          )
        )
        .limit(1);

      // Calculate aggregations from events
      const [aggregations] = await db
        .select({
          sum: sql<string>`COALESCE(SUM(${events.quantity}), 0)::numeric`,
          max: sql<string>`COALESCE(MAX(${events.quantity}), 0)::numeric`,
          last: sql<string>`(
            SELECT ${events.quantity} 
            FROM ${events} 
            WHERE ${events.tenantId} = ${tenantId}
              AND ${events.metric} = ${metric}
              AND ${events.customerRef} = ${customerRef}
              AND ${events.ts} >= ${periodStartDate}
              AND ${events.ts} <= ${periodEndDate}
            ORDER BY ${events.ts} DESC
            LIMIT 1
          )::numeric`,
          maxTs: sql<Date>`MAX(${events.ts})`,
        })
        .from(events)
        .where(
          and(
            eq(events.tenantId, tenantId),
            eq(events.metric, metric),
            eq(events.customerRef, customerRef),
            gte(events.ts, periodStartDate),
            lte(events.ts, periodEndDate)
          )
        );

      // Add adjustments if any
      const [adjustmentSum] = await db
        .select({
          total: sql<string>`COALESCE(SUM(${adjustments.delta}), 0)::numeric`,
        })
        .from(adjustments)
        .where(
          and(
            eq(adjustments.tenantId, tenantId),
            eq(adjustments.metric, metric),
            eq(adjustments.customerRef, customerRef),
            eq(adjustments.periodStart, periodStart)
          )
        );

      // Calculate final values
      const finalSum = parseFloat(aggregations.sum || '0') + parseFloat(adjustmentSum.total || '0');
      const finalMax = parseFloat(aggregations.max || '0');
      const finalLast = aggregations.last ? parseFloat(aggregations.last) : null;
      const watermark = aggregations.maxTs || new Date();

      // Upsert counter
      if (existingCounter) {
        // Update existing counter
        await db
          .update(counters)
          .set({
            aggSum: finalSum.toString(),
            aggMax: finalMax.toString(),
            aggLast: finalLast?.toString(),
            watermarkTs: watermark,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(counters.tenantId, tenantId),
              eq(counters.metric, metric),
              eq(counters.customerRef, customerRef),
              eq(counters.periodStart, periodStart)
            )
          );
        
        logger.info(`Updated counter for ${metric}/${customerRef}: sum=${finalSum}, max=${finalMax}`);
      } else {
        // Insert new counter
        await db
          .insert(counters)
          .values({
            tenantId,
            metric,
            customerRef,
            periodStart,
            periodEnd,
            aggSum: finalSum.toString(),
            aggMax: finalMax.toString(),
            aggLast: finalLast?.toString(),
            watermarkTs: watermark,
            updatedAt: new Date(),
          });
        
        logger.info(`Created counter for ${metric}/${customerRef}: sum=${finalSum}, max=${finalMax}`);
      }

      // Update Redis cache for fast reads
      const cacheKey = `counter:${tenantId}:${metric}:${customerRef}:${periodStart}`;
      const cacheValue = {
        sum: finalSum,
        max: finalMax,
        last: finalLast,
        watermark: watermark.toISOString(),
        updated: new Date().toISOString(),
      };
      
      await redis.setex(
        cacheKey,
        3600, // 1 hour TTL
        JSON.stringify(cacheValue)
      );

      // Check for late events that need to become adjustments
      if (existingCounter && existingCounter.watermarkTs) {
        const lateEvents = await db
          .select()
          .from(events)
          .where(
            and(
              eq(events.tenantId, tenantId),
              eq(events.metric, metric),
              eq(events.customerRef, customerRef),
              gte(events.ts, periodStartDate),
              lte(events.ts, periodEndDate),
              lte(events.ts, existingCounter.watermarkTs)
            )
          );

        for (const event of lateEvents) {
          if (isEventTooLate(event.ts, existingCounter.watermarkTs)) {
            // Create adjustment for late event
            await db
              .insert(adjustments)
              .values({
                tenantId,
                metric,
                customerRef,
                periodStart,
                delta: event.quantity,
                reason: 'backfill' as const,
                actor: 'system:late-event',
                createdAt: new Date(),
              });
            
            logger.warn(`Created adjustment for late event ${event.idempotencyKey}`);
          }
        }
      }

    } catch (error) {
      logger.error(`Failed to process aggregation for ${tenantId}/${metric}:`, error);
      throw error;
    }
  }
}
