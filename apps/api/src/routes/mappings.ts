/**
 * Price mapping configuration routes
 */

import { FastifyPluginAsync } from 'fastify';
import type { PriceMapping } from '@stripemeter/core';

export const mappingsRoutes: FastifyPluginAsync = async (server) => {
  /**
   * GET /v1/mappings
   * List all price mappings for a tenant
   */
  server.get<{
    Querystring: {
      tenantId: string;
      active?: boolean;
    };
    Reply: PriceMapping[];
  }>('/', {
    schema: {
      description: 'List all price mappings for a tenant',
      tags: ['mappings'],
      querystring: {
        type: 'object',
        required: ['tenantId'],
        properties: {
          tenantId: { type: 'string', format: 'uuid' },
          active: { type: 'boolean' },
        },
      },
      response: {
        200: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              tenantId: { type: 'string' },
              metric: { type: 'string' },
              aggregation: { type: 'string', enum: ['sum', 'max', 'last'] },
              stripeAccount: { type: 'string' },
              priceId: { type: 'string' },
              subscriptionItemId: { type: 'string' },
              currency: { type: 'string' },
              active: { type: 'boolean' },
            },
          },
        },
      },
    },
  }, async (request, reply) => {
    // TODO: Implement mapping retrieval from database
    reply.send([]);
  });

  /**
   * POST /v1/mappings
   * Create a new price mapping
   */
  server.post<{
    Body: Omit<PriceMapping, 'id'>;
    Reply: PriceMapping;
  }>('/', {
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
        },
      },
      response: {
        201: {
          type: 'object',
          properties: {
            tenantId: { type: 'string' },
            metric: { type: 'string' },
            aggregation: { type: 'string' },
            stripeAccount: { type: 'string' },
            priceId: { type: 'string' },
            subscriptionItemId: { type: 'string' },
            currency: { type: 'string' },
            active: { type: 'boolean' },
          },
        },
      },
    },
  }, async (request, reply) => {
    // TODO: Implement mapping creation
    reply.status(201).send(request.body as PriceMapping);
  });

  /**
   * PUT /v1/mappings/:id
   * Update a price mapping
   */
  server.put<{
    Params: { id: string };
    Body: Partial<PriceMapping>;
    Reply: PriceMapping;
  }>('/:id', {
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
        },
      },
    },
  }, async (request, reply) => {
    // TODO: Implement mapping update
    reply.status(501).send({ 
      error: 'Not Implemented',
      message: 'Mapping update endpoint is under development' 
    } as any);
  });

  /**
   * DELETE /v1/mappings/:id
   * Delete a price mapping
   */
  server.delete<{
    Params: { id: string };
  }>('/:id', {
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
  }, async (request, reply) => {
    // TODO: Implement mapping deletion
    reply.status(204).send();
  });
};
