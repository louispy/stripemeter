/**
 * Events ingestion routes
 */

import { FastifyPluginAsync } from 'fastify';
import {
  ingestEventRequestSchema,
  getEventsQuerySchema,
  backfillRequestSchema,
  generateIdempotencyKey,
  type IngestEventRequestInput,
  type IngestEventResponse,
  type GetEventsQueryInput,
  type GetEventsResponse,
  type BackfillRequestInput,
} from '@stripemeter/core';
import { Queue } from 'bullmq';
import { warnIfNonUuidTenantId } from '../utils/logger';
import { eventsIngestedTotal, ingestLatencyMs } from '../utils/metrics';

export const eventsRoutes: FastifyPluginAsync = async (server) => {
  // Lazily import database to play well with test mocks
  let EventsRepositoryCtor: any;
  let BackfillRepositoryCtor: any;
  let redisConn: any;
  try {
    const mod: any = await import('@stripemeter/database');
    EventsRepositoryCtor = mod.EventsRepository;
    BackfillRepositoryCtor = mod.BackfillRepository;
    redisConn = mod.redis;
  } catch (_e) {
    EventsRepositoryCtor = class {
      async upsertBatch() { return { inserted: [], duplicates: [] }; }
      async getEventsByParam() { return []; }
      async getEventsCountByParam() { return 0; }
    };
    BackfillRepositoryCtor = class {
      async create() { return {}; }
      async getById() { return null; }
      async update() { return null; }
      async updateStatus() { return null; }
      async list() { return []; }
    };
    redisConn = undefined;
  }
  const eventsRepo = new EventsRepositoryCtor();
  const backfillRepo = new BackfillRepositoryCtor();

  const aggregationQueue = redisConn ? new Queue('aggregation', {
    connection: redisConn,
    defaultJobOptions: {
      removeOnComplete: 100,
      removeOnFail: 1000,
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
    },
  }) : undefined as unknown as Queue;

  const backfillQueue = redisConn ? new Queue('backfill', {
    connection: redisConn,
    defaultJobOptions: {
      removeOnComplete: 50,
      removeOnFail: 100,
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
    },
  }) : undefined as unknown as Queue;
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
      headers: {
        type: 'object',
        properties: {
          'idempotency-key': {
            type: 'string',
            description: 'Optional idempotency key to apply when body events lack idempotencyKey',
          },
        },
      },
      // Delegate detailed validation to zod in handler to control error shape
      response: {
        200: {
          type: 'object',
          properties: {
            accepted: { type: 'number' },
            duplicates: { type: 'number' },
            requestId: { type: 'string' },
            results: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  idempotencyKey: { type: 'string' },
                  status: { type: 'string', enum: ['accepted', 'duplicate', 'error'] },
                  error: { type: 'string' },
                },
                required: ['idempotencyKey', 'status'],
              },
            },
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
    const ingestStart = process.hrtime.bigint();
    // Validate request body
    const validationResult = ingestEventRequestSchema.safeParse(request.body);
    if (!validationResult.success) {
      return reply.status(400).send({
        accepted: 0,
        duplicates: 0,
        requestId: request.id,
        errors: validationResult.error.errors.map((err: any, index: number) => ({
          index,
          error: err.message,
        })),
      });
    }

    const { events: eventBatch } = validationResult.data;
    const errors: Array<{ index: number; error: string }> = [];
    const results: Array<{ idempotencyKey: string; status: 'accepted' | 'duplicate' | 'error'; error?: string }> = [];
    const eventsToInsert = [];

    // Extract optional Idempotency-Key header (case-insensitive, Fastify normalizes to lowercase)
    const headerIdempotencyKeyRaw = (request.headers as any)['idempotency-key'];
    const headerIdempotencyKey = Array.isArray(headerIdempotencyKeyRaw)
      ? headerIdempotencyKeyRaw[0]
      : (headerIdempotencyKeyRaw as string | undefined);

    // Process each event
    for (let i = 0; i < eventBatch.length; i++) {
      const event = eventBatch[i];

      try {
        // Apply precedence: event.idempotencyKey > header 'Idempotency-Key' > generated key
        const idempotencyKey = event.idempotencyKey || headerIdempotencyKey || generateIdempotencyKey({
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
          results.push({ idempotencyKey, status: 'error', error: 'Event timestamp too far in the future' });
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
        const fallbackKey = event.idempotencyKey || headerIdempotencyKey || 'unknown';
        results.push({ idempotencyKey: fallbackKey, status: 'error', error: error instanceof Error ? error.message : 'Unknown error' });
      }
    }

    // Insert events into database
    const { inserted, duplicates } = await eventsRepo.upsertBatch(eventsToInsert);

    // Observe ingest latency (accept → persisted)
    try {
      const diffNs = Number(process.hrtime.bigint() - ingestStart);
      const diffMs = diffNs / 1e6;
      ingestLatencyMs.observe(diffMs);
    } catch (_e) {
      // never fail request on metrics
    }

    // Map accepted/duplicate results by idempotencyKey
    const insertedKeys = new Set(inserted.map((e: any) => e.idempotencyKey));
    const duplicateKeys = new Set(duplicates);
    for (const e of eventsToInsert) {
      const key = e.idempotencyKey as string;
      if (insertedKeys.has(key)) results.push({ idempotencyKey: key, status: 'accepted' });
      else if (duplicateKeys.has(key)) results.push({ idempotencyKey: key, status: 'duplicate' });
    }

    // Increment events_ingested_total by meter for accepted
    try {
      const countsByMetric = new Map<string, number>();
      for (const e of inserted) {
        countsByMetric.set(e.metric, (countsByMetric.get(e.metric) || 0) + 1);
      }
      for (const [metric, count] of countsByMetric.entries()) {
        eventsIngestedTotal.labels(metric).inc(count);
      }
    } catch (_e) {
      // ignore metrics errors
    }

    // Queue aggregation jobs for inserted events
    if (inserted.length > 0 && aggregationQueue) {
      // Group by tenant, metric, customer, period for efficient aggregation
      const aggregationJobs = new Map<string, any>();

      for (const event of inserted) {
        // Soft guidance: log if tenantId not UUID
        warnIfNonUuidTenantId(server.log, event.tenantId);
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
          removeOnComplete: 100,
          removeOnFail: 1000,
        },
      }));

      await aggregationQueue.addBulk(jobs);
    }

    // Send response
    reply.send({
      accepted: inserted.length,
      duplicates: duplicates.length,
      requestId: request.id,
      results,
      ...(errors.length > 0 && { errors }),
    });
  });

  /**
   * POST /v1/events/backfill
   * Backfill historical events
   */
  server.post<{
    Body: BackfillRequestInput;
    Reply: any;
  }>('/backfill', {
    schema: {
      description: 'Backfill historical usage events',
      tags: ['events'],
      body: {
        type: 'object',
        required: ['tenantId', 'metric', 'periodStart', 'reason'],
        properties: {
          tenantId: { type: 'string' },
          metric: { type: 'string' },
          customerRef: { type: 'string' },
          periodStart: { type: 'string', format: 'date' },
          periodEnd: { type: 'string', format: 'date' },
          events: { type: 'array' },
          csvData: { type: 'string' },
          reason: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            operationId: { type: 'string' },
            status: { type: 'string' },
            message: { type: 'string' },
          },
        },
        400: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' },
          },
        },
      },
    },
  }, async (request, reply) => {
    // Validate request body
    const validationResult = backfillRequestSchema.safeParse(request.body);
    if (!validationResult.success) {
      return reply.status(400).send({
        error: 'Validation Error',
        message: validationResult.error.errors.map(err => err.message).join(', '),
      });
    }

    const { tenantId, metric, customerRef, periodStart, periodEnd, events, csvData, reason } = validationResult.data;

    try {
      // Determine source type and data
      let sourceType: 'json' | 'csv' | 'api';
      let sourceData: string | undefined;
      let sourceUrl: string | undefined;

      if (events && events.length > 0) {
        sourceType = 'json';
        sourceData = JSON.stringify(events);
      } else if (csvData) {
        sourceType = 'csv';
        sourceData = csvData;
      } else {
        return reply.status(400).send({
          error: 'Invalid Request',
          message: 'Either events or csvData must be provided',
        });
      }

      // For large data, we could upload to S3/MinIO here
      // For now, we'll store small data directly
      const dataSize = sourceData.length;
      const maxDirectSize = parseInt(process.env.MAX_DIRECT_BACKFILL_SIZE || '1048576', 10); // 1MB default

      if (dataSize > maxDirectSize) {
        // TODO: Implement S3/MinIO upload for large data
        return reply.status(413).send({
          error: 'Payload Too Large',
          message: `Data size (${dataSize} bytes) exceeds maximum direct size (${maxDirectSize} bytes). S3/MinIO upload not yet implemented.`,
        });
      }

      // Create backfill operation record
      const operation = await backfillRepo.create({
        tenantId,
        metric,
        customerRef,
        periodStart,
        periodEnd: periodEnd || periodStart,
        status: 'pending',
        reason,
        actor: 'api:backfill', // TODO: Extract from auth context
        sourceType,
        sourceData,
        sourceUrl,
        metadata: {
          requestId: request.id,
          userAgent: request.headers['user-agent'],
          ip: request.ip,
        },
      });

      // Queue backfill job
      if (backfillQueue) {
        await backfillQueue.add('process-backfill', {
          operationId: operation.id,
          tenantId,
          metric,
          customerRef,
          periodStart,
          periodEnd: periodEnd || periodStart,
          sourceType,
          sourceData,
          sourceUrl,
          reason,
          actor: 'api:backfill',
        }, {
          jobId: operation.id,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
        });
      }

      reply.send({
        operationId: operation.id,
        status: 'pending',
        message: 'Backfill operation queued successfully',
      });

    } catch (error) {
      server.log.error({ err: error }, 'Backfill request failed');
      reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to process backfill request',
      });
    }
  });

  /**
   * GET /v1/events/backfill/:operationId
   * Get backfill operation status
   */
  server.get<{
    Params: { operationId: string };
    Reply: any;
  }>('/backfill/:operationId', {
    schema: {
      description: 'Get backfill operation status',
      tags: ['events'],
      params: {
        type: 'object',
        properties: {
          operationId: { type: 'string', format: 'uuid' },
        },
        required: ['operationId'],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            tenantId: { type: 'string' },
            metric: { type: 'string' },
            customerRef: { type: 'string' },
            periodStart: { type: 'string' },
            periodEnd: { type: 'string' },
            status: { type: 'string' },
            reason: { type: 'string' },
            actor: { type: 'string' },
            totalEvents: { type: 'number' },
            processedEvents: { type: 'number' },
            failedEvents: { type: 'number' },
            duplicateEvents: { type: 'number' },
            sourceType: { type: 'string' },
            errorMessage: { type: 'string' },
            startedAt: { type: 'string' },
            completedAt: { type: 'string' },
            createdAt: { type: 'string' },
            updatedAt: { type: 'string' },
          },
        },
        404: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' },
          },
        },
      },
    },
  }, async (request, reply) => {
    const { operationId } = request.params;

    try {
      const operation = await backfillRepo.getById(operationId);
      
      if (!operation) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'Backfill operation not found',
        });
      }

      reply.send(operation);
    } catch (error) {
      server.log.error({ err: error }, 'Failed to get backfill operation');
      reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to retrieve backfill operation',
      });
    }
  });

  /**
   * GET /v1/events/backfill
   * List backfill operations
   */
  server.get<{
    Querystring: {
      tenantId?: string;
      status?: string;
      limit?: number;
      offset?: number;
    };
    Reply: any;
  }>('/backfill', {
    schema: {
      description: 'List backfill operations',
      tags: ['events'],
      querystring: {
        type: 'object',
        properties: {
          tenantId: { type: 'string' },
          status: { type: 'string', enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'] },
          limit: { type: 'number', minimum: 1, maximum: 100, default: 50 },
          offset: { type: 'number', minimum: 0, default: 0 },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            operations: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  tenantId: { type: 'string' },
                  metric: { type: 'string' },
                  customerRef: { type: 'string' },
                  periodStart: { type: 'string' },
                  periodEnd: { type: 'string' },
                  status: { type: 'string' },
                  reason: { type: 'string' },
                  actor: { type: 'string' },
                  totalEvents: { type: 'number' },
                  processedEvents: { type: 'number' },
                  failedEvents: { type: 'number' },
                  duplicateEvents: { type: 'number' },
                  sourceType: { type: 'string' },
                  errorMessage: { type: 'string' },
                  startedAt: { type: 'string' },
                  completedAt: { type: 'string' },
                  createdAt: { type: 'string' },
                  updatedAt: { type: 'string' },
                },
              },
            },
            total: { type: 'number' },
          },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const operations = await backfillRepo.list({
        tenantId: request.query.tenantId,
        status: request.query.status,
        limit: request.query.limit,
        offset: request.query.offset,
      });

      reply.send({
        operations,
        total: operations.length,
      });
    } catch (error) {
      server.log.error({ err: error }, 'Failed to list backfill operations');
      reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to list backfill operations',
      });
    }
  });

  /**
   * GET /v1/events
   * Get events list
   */
  server.get<{
    Querystring: GetEventsQueryInput;
    Reply: GetEventsResponse;
  }>('/', {
    schema: {
      description: 'Get events list',
      tags: ['events'],
      querystring: {
        type: 'object',
        required: ['tenantId'],
        properties: {
          tenantId: { type: 'string' },
          metric: { type: 'string' },
          customerRef: { type: 'string' },
          source: { type: 'string' },
          limit: { type: 'number', default: 25 },
          offset: { type: 'number', default: 0 },
          sort: { type: 'string', enum: ['metric', 'customerRef', 'source', 'ts'] },
          sortDir: { type: 'string', enum: ['asc', 'desc'] },
          startTime: { type: 'string', format: 'date-time' },
          endTime: { type: 'string', format: 'date-time' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            total: { type: 'number' },
            events: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  tenantId: { type: 'string' },
                  metric: { type: 'string' },
                  customerRef: { type: 'string' },
                  resourceId: { type: 'string' },
                  quantity: { type: 'number' },
                  timestamp: { type: 'string' },
                  meta: { type: 'string' },
                  source: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },

  }, async (_request, reply) => {
    const validationResult = getEventsQuerySchema.safeParse(_request.query);
    if (!validationResult.success) {
      return reply.status(400).send({
        total: 0,
        events: [],
        errors: validationResult.error.errors.map((err: any, index: number) => ({
          index,
          error: err.message,
        })),
      });
    }

    const startTime = _request.query.startTime;
    const endTime = _request.query.endTime;
    const param = {
      tenantId: _request.query.tenantId,
      metric: _request.query.metric,
      customerRef: _request.query.customerRef,
      source: _request.query.source,
      limit: _request.query.limit,
      offset: _request.query.offset,
      sort: _request.query.sort,
      sortDir: _request.query.sortDir,
      startTime: startTime ? new Date(startTime) : undefined,
      endTime: endTime ? new Date(endTime) : undefined,
    };

    const [events, count] = await Promise.all([
      eventsRepo.getEventsByParam(param),
      eventsRepo.getEventsCountByParam(param),
    ]);

    const res: GetEventsResponse = {
      total: count,
      events: events.map((event: any) => ({
        id: event.idempotencyKey,
        tenantId: event.tenantId,
        metric: event.metric,
        customerRef: event.customerRef,
        resourceId: event.resourceId || undefined,
        quantity: Number(event.quantity),
        timestamp: event.ts.toISOString(),
        source: event.source,
        meta: typeof event.meta === 'string'
          ? event.meta
          : JSON.stringify(event.meta),
      })),
    };

    reply.status(200).send(res)
  });
};
