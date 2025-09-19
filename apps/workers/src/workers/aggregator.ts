/**
 * Aggregator Worker - Processes events and updates counters
 */

import { Worker, Queue, Job } from 'bullmq';
import { redis, db, events, counters, adjustments } from '@stripemeter/database';
import { eq, and, gte, lte, lt, gt, sql } from 'drizzle-orm';
import { logger } from '../utils/logger';
import { getPeriodEnd } from '@stripemeter/core';

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

  public async processAggregation(data: AggregationJob) {
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

      // Lateness window (hours) from env with default 48h
      const latenessWindowHours = parseInt(process.env.LATE_EVENT_WINDOW_HOURS || '48', 10);

      // Establish acceptance lower bound for recomputation
      // If we have an existing watermark, accept events with ts >= (watermark - L)
      // Otherwise (first build), accept from period start
      let recomputeStartDate: Date = periodStartDate;
      if (existingCounter && existingCounter.watermarkTs) {
        const watermarkTsDate = new Date(existingCounter.watermarkTs);
        const lowerBound = new Date(watermarkTsDate.getTime() - latenessWindowHours * 60 * 60 * 1000);
        // Do not go earlier than the period start
        recomputeStartDate = lowerBound > periodStartDate ? lowerBound : periodStartDate;
      }

      // Calculate aggregations from events (respect lateness window for recomputation)
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
              AND ${events.ts} >= ${recomputeStartDate}
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
            gte(events.ts, recomputeStartDate),
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
      const watermark = aggregations.maxTs || (existingCounter?.watermarkTs ? new Date(existingCounter.watermarkTs) : new Date());

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

      // Check for very-late events (older than acceptance window) to convert into adjustments
      if (existingCounter && existingCounter.watermarkTs) {
        const watermarkTsDate = new Date(existingCounter.watermarkTs);
        const veryLateCutoff = new Date(watermarkTsDate.getTime() - latenessWindowHours * 60 * 60 * 1000);

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
              lt(events.ts, veryLateCutoff),
              // Only consider events newly inserted since last aggregation to avoid duplicates
              gt(events.insertedAt, existingCounter.updatedAt as any)
            )
          );

        for (const event of lateEvents) {
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

          logger.warn(`Created adjustment for very-late event ${event.idempotencyKey}`);
        }
      }

    } catch (error) {
      logger.error(`Failed to process aggregation for ${tenantId}/${metric}:`, error);
      throw error;
    }
  }
}
