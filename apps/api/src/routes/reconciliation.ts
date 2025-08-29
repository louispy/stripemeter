/**
 * Reconciliation routes
 */

import { FastifyPluginAsync } from 'fastify';
import type { ReconciliationResponse } from '@stripemeter/core';

export const reconciliationRoutes: FastifyPluginAsync = async (server) => {
  /**
   * GET /v1/reconciliation/:period
   * Get reconciliation report for a period
   */
  server.get<{
    Params: { period: string };
    Querystring: { tenantId: string };
    Reply: ReconciliationResponse;
  }>('/:period', {
    schema: {
      description: 'Get reconciliation report for a period',
      tags: ['reconciliation'],
      params: {
        type: 'object',
        required: ['period'],
        properties: {
          period: { type: 'string', pattern: '^\\d{4}-\\d{2}$' }, // YYYY-MM format
        },
      },
      querystring: {
        type: 'object',
        required: ['tenantId'],
        properties: {
          tenantId: { type: 'string', format: 'uuid' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            period: { type: 'string' },
            reports: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  tenantId: { type: 'string' },
                  subscriptionItemId: { type: 'string' },
                  periodStart: { type: 'string' },
                  localTotal: { type: 'number' },
                  stripeTotal: { type: 'number' },
                  diff: { type: 'number' },
                  status: { type: 'string', enum: ['ok', 'investigate', 'resolved'] },
                  createdAt: { type: 'string' },
                },
              },
            },
            suggestedAdjustments: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  tenantId: { type: 'string' },
                  metric: { type: 'string' },
                  customerRef: { type: 'string' },
                  periodStart: { type: 'string' },
                  delta: { type: 'number' },
                  reason: { type: 'string' },
                  actor: { type: 'string' },
                  createdAt: { type: 'string' },
                },
              },
            },
            summary: {
              type: 'object',
              properties: {
                total: { type: 'number' },
                ok: { type: 'number' },
                investigating: { type: 'number' },
                resolved: { type: 'number' },
                maxDiff: { type: 'number' },
              },
            },
          },
        },
      },
    },
  }, async (request, reply) => {
    // TODO: Implement reconciliation report generation
    const { period } = request.params;
    const { tenantId: _tenantId } = request.query;
    
    reply.send({
      period,
      reports: [],
      suggestedAdjustments: [],
      summary: {
        total: 0,
        ok: 0,
        investigating: 0,
        resolved: 0,
        maxDiff: 0,
      },
    });
  });

  /**
   * POST /v1/reconciliation/run
   * Trigger reconciliation for current period
   */
  server.post<{
    Body: { tenantId: string };
  }>('/run', {
    schema: {
      description: 'Trigger reconciliation for current period',
      tags: ['reconciliation'],
      body: {
        type: 'object',
        required: ['tenantId'],
        properties: {
          tenantId: { type: 'string', format: 'uuid' },
        },
      },
      response: {
        202: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            jobId: { type: 'string' },
          },
        },
      },
    },
  }, async (_request, reply) => {
    // TODO: Queue reconciliation job
    reply.status(202).send({
      message: 'Reconciliation job queued',
      jobId: `job_${Date.now()}`,
    });
  });

  /**
   * POST /v1/reconciliation/adjustments
   * Apply suggested adjustments
   */
  server.post<{
    Body: {
      adjustmentIds: string[];
      reason: string;
    };
  }>('/adjustments', {
    schema: {
      description: 'Apply suggested adjustments',
      tags: ['reconciliation'],
      body: {
        type: 'object',
        required: ['adjustmentIds', 'reason'],
        properties: {
          adjustmentIds: {
            type: 'array',
            items: { type: 'string', format: 'uuid' },
          },
          reason: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            applied: { type: 'number' },
            failed: { type: 'number' },
          },
        },
      },
    },
  }, async (_request, reply) => {
    // TODO: Apply adjustments
    reply.send({
      applied: 0,
      failed: 0,
    });
  });
};
