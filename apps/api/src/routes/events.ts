/**
 * Events ingestion routes
 */

import { FastifyPluginAsync } from 'fastify';
import { 
  ingestEventRequestSchema, 
  generateIdempotencyKey,
  type IngestEventRequestInput,
  type IngestEventResponse 
} from '@stripemeter/core';
import { EventsRepository, redis } from '@stripemeter/database';
import { Queue } from 'bullmq';

const eventsRepo = new EventsRepository();

// Create aggregation queue
const aggregationQueue = new Queue('aggregation', {
  connection: redis,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 1000,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  },
});

export const eventsRoutes: FastifyPluginAsync = async (server) => {
  /**
   * POST /v1/events/ingest
   * Ingest a batch of usage events
   */
  server.post<{
    Body: IngestEventRequestInput;
    Reply: IngestEventResponse;
  }>('/ingest', {
    schema: {
      description: 'Ingest a batch of usage events',
      tags: ['events'],
      body: {
        type: 'object',
        properties: {
          events: {
            type: 'array',
            items: {
              type: 'object',
              required: ['tenantId', 'metric', 'customerRef', 'quantity', 'ts'],
              properties: {
                tenantId: { type: 'string', format: 'uuid' },
                metric: { type: 'string' },
                customerRef: { type: 'string' },
                resourceId: { type: 'string' },
                quantity: { type: 'number' },
                ts: { type: 'string', format: 'date-time' },
                meta: { type: 'object' },
                idempotencyKey: { type: 'string' },
                source: { type: 'string', enum: ['sdk', 'http', 'etl', 'import', 'system'] },
              },
            },
          },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            accepted: { type: 'number' },
            duplicates: { type: 'number' },
            errors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  index: { type: 'number' },
                  error: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
  }, async (request, reply) => {
    // Validate request body
    const validationResult = ingestEventRequestSchema.safeParse(request.body);
    if (!validationResult.success) {
      return reply.status(400).send({
        accepted: 0,
        duplicates: 0,
        errors: validationResult.error.errors.map((err: any, index: number) => ({
          index,
          error: err.message,
        })),
      });
    }

    const { events: eventBatch } = validationResult.data;
    const errors: Array<{ index: number; error: string }> = [];
    const eventsToInsert = [];

    // Process each event
    for (let i = 0; i < eventBatch.length; i++) {
      const event = eventBatch[i];
      
      try {
        // Generate idempotency key if not provided
        const idempotencyKey = event.idempotencyKey || generateIdempotencyKey({
          tenantId: event.tenantId,
          metric: event.metric,
          customerRef: event.customerRef,
          resourceId: event.resourceId,
          ts: event.ts,
        });

        // Validate timestamp is not too far in the future
        const eventTime = new Date(event.ts);
        const now = new Date();
        const maxFuture = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour in future
        
        if (eventTime > maxFuture) {
          errors.push({
            index: i,
            error: 'Event timestamp too far in the future',
          });
          continue;
        }

        eventsToInsert.push({
          ...event,
          idempotencyKey,
          quantity: event.quantity.toString(),
          ts: new Date(event.ts),
          source: event.source || 'http',
        });
      } catch (error) {
        errors.push({
          index: i,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Insert events into database
    const { inserted, duplicates } = await eventsRepo.upsertBatch(eventsToInsert);

    // Queue aggregation jobs for inserted events
    if (inserted.length > 0) {
      // Group by tenant, metric, customer, period for efficient aggregation
      const aggregationJobs = new Map<string, any>();
      
      for (const event of inserted) {
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

      // Add jobs to queue with stable jobId for deduplication
      const jobs = Array.from(aggregationJobs.values()).map(job => ({
        name: 'aggregate-counter',
        data: job,
        opts: {
          delay: 1000, // Small delay to batch events
          jobId: `${job.tenantId}:${job.metric}:${job.customerRef}:${job.periodStart}`,
        },
      }));

      await aggregationQueue.addBulk(jobs);
    }

    // Send response
    reply.send({
      accepted: inserted.length,
      duplicates: duplicates.length,
      ...(errors.length > 0 && { errors }),
    });
  });

  /**
   * POST /v1/events/backfill
   * Backfill historical events
   */
  server.post('/backfill', {
    schema: {
      description: 'Backfill historical usage events',
      tags: ['events'],
      body: {
        type: 'object',
        required: ['tenantId', 'metric', 'periodStart', 'reason'],
        properties: {
          tenantId: { type: 'string', format: 'uuid' },
          metric: { type: 'string' },
          customerRef: { type: 'string' },
          periodStart: { type: 'string', format: 'date' },
          periodEnd: { type: 'string', format: 'date' },
          events: { type: 'array' },
          csvData: { type: 'string' },
          reason: { type: 'string' },
        },
      },
    },
  }, async (_request, reply) => {
    // TODO: Implement backfill logic
    reply.status(501).send({ 
      error: 'Not Implemented',
      message: 'Backfill endpoint is under development' 
    });
  });
};
