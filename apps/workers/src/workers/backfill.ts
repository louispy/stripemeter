/**
 * Backfill Worker - Processes bulk event imports and backfill operations
 */

import { Worker, Queue, Job } from 'bullmq';
import { redis, db, events, BackfillRepository } from '@stripemeter/database';
// no drizzle conditions used here
import { logger } from '../utils/logger';
import { generateIdempotencyKey } from '@stripemeter/core';
import { z } from 'zod';

// CSV parsing
import { parse } from 'csv-parse/sync';
// no stringify used

// S3/MinIO client setup
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

interface BackfillJob {
  operationId: string;
  tenantId: string;
  metric: string;
  customerRef?: string;
  periodStart: string;
  periodEnd: string;
  sourceType: 'json' | 'csv' | 'api';
  sourceData?: string;
  sourceUrl?: string;
  reason: string;
  actor: string;
}

// Event schema for validation
const backfillEventSchema = z.object({
  tenantId: z.string().min(1),
  metric: z.string().min(1).max(100),
  customerRef: z.string().min(1).max(255),
  resourceId: z.string().max(255).optional(),
  quantity: z.number().positive().finite(),
  ts: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Invalid ISO 8601 date-time format'
  }),
  meta: z.record(z.any()).optional(),
  idempotencyKey: z.string().max(255).optional(),
  source: z.enum(['sdk', 'http', 'etl', 'import', 'system']).optional(),
});

export class BackfillWorker {
  private worker: Worker | null = null;
  private queue: Queue;
  private backfillRepo: BackfillRepository;
  private s3Client: S3Client | null = null;

  constructor() {
    this.queue = new Queue('backfill', {
      connection: redis,
    });
    this.backfillRepo = new BackfillRepository();

    // Initialize S3 client if credentials are available
    if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
      this.s3Client = new S3Client({
        endpoint: process.env.S3_ENDPOINT || undefined,
        region: process.env.AWS_REGION || 'us-east-1',
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        },
        forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
      });
    }
  }

  async start() {
    this.worker = new Worker(
      'backfill',
      async (job: Job<BackfillJob>) => {
        await this.processBackfill(job.data);
      },
      {
        connection: redis,
        concurrency: parseInt(process.env.BACKFILL_WORKER_CONCURRENCY || '2', 10),
        limiter: {
          max: 10,
          duration: 60000, // 10 jobs per minute
        },
      }
    );

    this.worker.on('completed', (job) => {
      logger.info(`Backfill completed for operation ${job.data.operationId}`);
    });

    this.worker.on('failed', (job, err) => {
      logger.error(`Backfill failed for operation ${job?.data?.operationId}:`, err);
    });

    logger.info('Backfill worker started');
  }

  async stop() {
    if (this.worker) {
      await this.worker.close();
      this.worker = null;
    }
    await this.queue.close();
    logger.info('Backfill worker stopped');
  }

  private async processBackfill(data: BackfillJob) {
    const { operationId, tenantId, metric, customerRef, periodStart, periodEnd, sourceType, sourceData, sourceUrl } = data;
    
    logger.info(`Processing backfill operation ${operationId} for ${tenantId}/${metric}`);

    try {
      // Update status to processing
      await this.backfillRepo.updateStatus(operationId, 'processing');

      // Load and parse source data
      const events = await this.loadSourceData(sourceType, sourceData, sourceUrl);
      logger.info(`Loaded ${events.length} events for backfill operation ${operationId}`);

      // Update total events count
      await this.backfillRepo.update(operationId, { totalEvents: events.length });

      // Process events in batches
      const batchSize = parseInt(process.env.BACKFILL_BATCH_SIZE || '100', 10);
      let processedEvents = 0;
      let failedEvents = 0;
      let duplicateEvents = 0;

      for (let i = 0; i < events.length; i += batchSize) {
        const batch = events.slice(i, i + batchSize);
        const result = await this.processEventBatch(operationId, batch, tenantId, metric, customerRef, periodStart, periodEnd);
        
        processedEvents += result.processed;
        failedEvents += result.failed;
        duplicateEvents += result.duplicates;

        // Update progress
        await this.backfillRepo.updateProgress(operationId, {
          processedEvents,
          failedEvents,
          duplicateEvents,
        });

        // Small delay to prevent overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Update final status
      await this.backfillRepo.updateStatus(operationId, 'completed');

      logger.info(`Backfill operation ${operationId} completed: ${processedEvents} processed, ${failedEvents} failed, ${duplicateEvents} duplicates`);

    } catch (error) {
      logger.error(`Backfill operation ${operationId} failed:`, error);
      await this.backfillRepo.updateStatus(operationId, 'failed', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  private async loadSourceData(sourceType: string, sourceData?: string, sourceUrl?: string): Promise<any[]> {
    let rawData: string;

    if (sourceData) {
      rawData = sourceData;
    } else if (sourceUrl && this.s3Client) {
      // Load from S3/MinIO
      const bucket = process.env.S3_BUCKET || 'stripemeter-backfill';
      const key = sourceUrl.replace(`s3://${bucket}/`, '');
      
      const command = new GetObjectCommand({ Bucket: bucket, Key: key });
      const response = await this.s3Client.send(command);
      
      if (!response.Body) {
        throw new Error('No data found in S3 object');
      }
      
      rawData = await response.Body.transformToString();
    } else {
      throw new Error('No source data or URL provided');
    }

    // Parse based on source type
    switch (sourceType) {
      case 'json':
        return JSON.parse(rawData);
      
      case 'csv':
        return this.parseCsvData(rawData);
      
      default:
        throw new Error(`Unsupported source type: ${sourceType}`);
    }
  }

  private parseCsvData(csvData: string): any[] {
    const records = parse(csvData, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    // Transform CSV records to event format
    return records.map((record: any) => ({
      tenantId: record.tenantId || record.tenant_id,
      metric: record.metric,
      customerRef: record.customerRef || record.customer_ref,
      resourceId: record.resourceId || record.resource_id,
      quantity: parseFloat(record.quantity),
      ts: record.ts || record.timestamp || record.created_at,
      meta: record.meta ? JSON.parse(record.meta) : {},
      idempotencyKey: record.idempotencyKey || record.idempotency_key,
      source: record.source || 'import',
    }));
  }

  private async processEventBatch(
    _operationId: string,
    eventBatch: any[],
    tenantId: string,
    metric: string,
    customerRef: string | undefined,
    periodStart: string,
    periodEnd: string
  ): Promise<{ processed: number; failed: number; duplicates: number }> {
    const eventsToInsert = [];
    let failed = 0;
    let duplicates = 0;

    // Validate and prepare events
    for (const event of eventBatch) {
      try {
        // Validate event schema
        const validatedEvent = backfillEventSchema.parse(event);
        
        // Filter by customer if specified
        if (customerRef && validatedEvent.customerRef !== customerRef) {
          continue;
        }

        // Filter by period
        const eventDate = new Date(validatedEvent.ts);
        const periodStartDate = new Date(periodStart);
        const periodEndDate = new Date(periodEnd + 'T23:59:59.999Z');
        
        if (eventDate < periodStartDate || eventDate > periodEndDate) {
          continue;
        }

        // Generate idempotency key if not provided
        const idempotencyKey = validatedEvent.idempotencyKey || generateIdempotencyKey({
          tenantId: validatedEvent.tenantId,
          metric: validatedEvent.metric,
          customerRef: validatedEvent.customerRef,
          resourceId: validatedEvent.resourceId,
          ts: validatedEvent.ts,
        });

        eventsToInsert.push({
          ...validatedEvent,
          idempotencyKey,
          quantity: validatedEvent.quantity.toString(),
          ts: new Date(validatedEvent.ts),
          source: validatedEvent.source || 'import',
        });
      } catch (error) {
        logger.warn(`Invalid event in batch:`, error);
        failed++;
      }
    }

    if (eventsToInsert.length === 0) {
      return { processed: 0, failed, duplicates };
    }

    // Insert events into database
    try {
      const inserted = await db
        .insert(events)
        .values(eventsToInsert)
        .onConflictDoNothing()
        .returning({ idempotencyKey: events.idempotencyKey, tenantId: events.tenantId, metric: events.metric, customerRef: events.customerRef, ts: events.ts });

      const processed = inserted.length;

      // Queue aggregation jobs for inserted events
      if (inserted.length > 0) {
        await this.queueAggregationJobs(inserted, tenantId, metric);
      }

      return { processed, failed, duplicates };
    } catch (error) {
      logger.error(`Failed to insert event batch:`, error);
      return { processed: 0, failed: eventsToInsert.length, duplicates: 0 };
    }
  }

  private async queueAggregationJobs(insertedEvents: any[], _tenantId: string, _metric: string) {
    // Group by tenant, metric, customer, period for efficient aggregation
    const aggregationJobs = new Map<string, any>();

    for (const event of insertedEvents) {
      const periodStart = new Date(event.ts);
      periodStart.setUTCDate(1);
      periodStart.setUTCHours(0, 0, 0, 0);

      const key = `${event.tenantId}:${event.metric}:${event.customerRef}:${periodStart.toISOString()}`;

      if (!aggregationJobs.has(key)) {
        aggregationJobs.set(key, {
          tenantId: event.tenantId,
          metric: event.metric,
          customerRef: event.customerRef,
          periodStart: periodStart.toISOString(),
        });
      }
    }

    // Add jobs to aggregation queue
    const aggregationQueue = new Queue('aggregation', { connection: redis });
    const jobs = Array.from(aggregationJobs.values()).map(job => ({
      name: 'aggregate-counter',
      data: job,
      opts: {
        delay: 1000, // Small delay to batch events
        jobId: `${job.tenantId}:${job.metric}:${job.customerRef}:${job.periodStart}`,
      },
    }));

    await aggregationQueue.addBulk(jobs);
    await aggregationQueue.close();
  }

  /**
   * Add a backfill job to the queue
   */
  async addBackfillJob(jobData: BackfillJob): Promise<void> {
    await this.queue.add('process-backfill', jobData, {
      jobId: jobData.operationId,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
    });
  }
}
