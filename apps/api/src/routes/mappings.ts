/**
 * Price mapping configuration routes
 */

import { FastifyPluginAsync } from 'fastify';
import { db, priceMappings } from '@stripemeter/database';
import { eq, and } from 'drizzle-orm';
import { requireScopes } from '../utils/auth';
import { SCOPES } from '../constants/scopes';

export const mappingsRoutes: FastifyPluginAsync = async (server) => {
  /**
   * GET /v1/mappings
   * List all price mappings for a tenant
   */
  server.get('/', {
    schema: {
      description: 'List all price mappings for a tenant',
      tags: ['mappings'],
      querystring: {
        type: 'object',
        required: ['tenantId'],
        properties: {
          tenantId: { type: 'string', format: 'uuid' },
          active: { type: 'boolean' },
          metric: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              tenantId: { type: 'string' },
              metric: { type: 'string' },
              aggregation: { type: 'string', enum: ['sum', 'max', 'last'] },
              stripeAccount: { type: 'string' },
              priceId: { type: 'string' },
              subscriptionItemId: { type: 'string' },
              currency: { type: 'string' },
              active: { type: 'boolean' },
              shadow: { type: 'boolean' },
              shadowStripeAccount: { type: 'string' },
              shadowPriceId: { type: 'string' },
              shadowSubscriptionItemId: { type: 'string' },
            },
          },
        },
      },
    },
    preHandler: requireScopes(SCOPES.PROJECT_READ, SCOPES.MAPPINGS_READ),
  }, async (request: any, reply) => {
    const { tenantId, active, metric } = request.query as { tenantId: string; active?: boolean; metric?: string };
    const whereClauses: any[] = [eq(priceMappings.tenantId, tenantId as any)];
    if (typeof active === 'boolean') whereClauses.push(eq(priceMappings.active, active as any));
    if (metric) whereClauses.push(eq(priceMappings.metric, metric as any));
    const rows = await db.select().from(priceMappings).where(and(...whereClauses));
    reply.send(rows);
  });

  /**
   * POST /v1/mappings
   * Create a new price mapping
   */
  server.post('/', {
    schema: {
      description: 'Create a new price mapping',
      tags: ['mappings'],
      body: {
        type: 'object',
        required: ['tenantId', 'metric', 'aggregation', 'stripeAccount', 'priceId'],
        properties: {
          tenantId: { type: 'string', format: 'uuid' },
          metric: { type: 'string' },
          aggregation: { type: 'string', enum: ['sum', 'max', 'last'] },
          stripeAccount: { type: 'string' },
          priceId: { type: 'string' },
          subscriptionItemId: { type: 'string' },
          currency: { type: 'string' },
          active: { type: 'boolean' },
          shadow: { type: 'boolean' },
          shadowStripeAccount: { type: 'string' },
          shadowPriceId: { type: 'string' },
          shadowSubscriptionItemId: { type: 'string' },
        },
      },
      response: {
        201: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            tenantId: { type: 'string' },
            metric: { type: 'string' },
            aggregation: { type: 'string' },
            stripeAccount: { type: 'string' },
            priceId: { type: 'string' },
            subscriptionItemId: { type: 'string' },
            currency: { type: 'string' },
            active: { type: 'boolean' },
            shadow: { type: 'boolean' },
            shadowStripeAccount: { type: 'string' },
            shadowPriceId: { type: 'string' },
            shadowSubscriptionItemId: { type: 'string' },
          },
        },
      },
    },
    preHandler: requireScopes(SCOPES.PROJECT_WRITE, SCOPES.MAPPINGS_WRITE),
  }, async (request: any, reply) => {
    const body = request.body as any;
    const [row] = await db.insert(priceMappings).values(body).returning();
    reply.status(201).send(row);
  });

  /**
   * PUT /v1/mappings/:id
   * Update a price mapping
   */
  server.put('/:id', {
    schema: {
      description: 'Update a price mapping',
      tags: ['mappings'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
      body: {
        type: 'object',
        properties: {
          aggregation: { type: 'string', enum: ['sum', 'max', 'last'] },
          stripeAccount: { type: 'string' },
          priceId: { type: 'string' },
          subscriptionItemId: { type: 'string' },
          currency: { type: 'string' },
          active: { type: 'boolean' },
          shadow: { type: 'boolean' },
          shadowStripeAccount: { type: 'string' },
          shadowPriceId: { type: 'string' },
          shadowSubscriptionItemId: { type: 'string' },
        },
      },
    },
    preHandler: requireScopes(SCOPES.PROJECT_WRITE, SCOPES.MAPPINGS_WRITE),
  }, async (request: any, reply) => {
    const { id } = request.params as { id: string };
    const updates = request.body as any;
    const [row] = await db.update(priceMappings).set(updates).where(eq(priceMappings.id, id as any)).returning();
    reply.status(200).send(row);
  });

  /**
   * DELETE /v1/mappings/:id
   * Delete a price mapping
   */
  server.delete('/:id', {
    schema: {
      description: 'Delete a price mapping',
      tags: ['mappings'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
      response: {
        204: {
          type: 'null',
        },
      },
    },
    preHandler: requireScopes(SCOPES.PROJECT_WRITE, SCOPES.MAPPINGS_WRITE),
  }, async (request: any, reply) => {
    const { id } = request.params as { id: string };
    await db.delete(priceMappings).where(eq(priceMappings.id, id as any));
    reply.status(204).send();
  });

  /**
   * GET /v1/mappings/:id
   * Retrieve a mapping by id
   */
  server.get('/:id', {
    schema: {
      description: 'Get a price mapping by id',
      tags: ['mappings'],
      params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'string', format: 'uuid' } },
      },
    },
    preHandler: requireScopes(SCOPES.PROJECT_READ, SCOPES.MAPPINGS_READ),
  }, async (request: any, reply) => {
    const { id } = request.params as { id: string };
    const [row] = await db.select().from(priceMappings).where(eq(priceMappings.id, id as any));
    if (!row) return reply.status(404).send({ error: 'Not found' });
    reply.send(row);
  });
};
