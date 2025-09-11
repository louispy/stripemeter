/**
 * Reconciliation routes
 */

import { FastifyPluginAsync } from 'fastify';
import type { ReconciliationResponse, ReconciliationSummaryResponse } from '@stripemeter/core';
import { db, priceMappings, reconciliationReports } from '@stripemeter/database';
import { and, eq, gte, lte, sql } from 'drizzle-orm';

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
   * GET /v1/reconciliation/summary
   * Get per-metric reconciliation summary for a period range
   */
  server.get<{
    Querystring: { tenantId: string; periodStart: string; periodEnd: string };
    Reply: ReconciliationSummaryResponse;
  }>('/summary', {
    schema: {
      description: 'Get per-metric reconciliation summary for a period range',
      tags: ['reconciliation'],
      querystring: {
        type: 'object',
        required: ['tenantId', 'periodStart', 'periodEnd'],
        properties: {
          tenantId: { type: 'string', format: 'uuid' },
          periodStart: { type: 'string', pattern: '^\\d{4}-\\d{2}$' },
          periodEnd: { type: 'string', pattern: '^\\d{4}-\\d{2}$' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            periodStart: { type: 'string' },
            periodEnd: { type: 'string' },
            perMetric: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  metric: { type: 'string' },
                  local: { type: 'number' },
                  stripe: { type: 'number' },
                  drift_abs: { type: 'number' },
                  drift_pct: { type: 'number' },
                  items: { type: 'number' },
                },
              },
            },
            overall: {
              type: 'object',
              properties: {
                local: { type: 'number' },
                stripe: { type: 'number' },
                drift_abs: { type: 'number' },
                drift_pct: { type: 'number' },
                metrics: { type: 'number' },
                items: { type: 'number' },
              },
            },
          },
          example: {
            periodStart: '2025-01',
            periodEnd: '2025-03',
            perMetric: [
              { metric: 'api_calls', local: 100000, stripe: 99800, drift_abs: 200, drift_pct: 0.002, items: 3 },
              { metric: 'gb_transfer', local: 512, stripe: 520, drift_abs: 8, drift_pct: 0.0154, items: 1 },
            ],
            overall: { local: 100512, stripe: 100320, drift_abs: 192, drift_pct: 0.0019, metrics: 2, items: 4 },
          },
        },
      },
    },
  }, async (request, reply) => {
    const { tenantId, periodStart, periodEnd } = request.query;

    // Basic validation: ensure periodStart <= periodEnd
    if (periodEnd < periodStart) {
      return reply.status(400).send({
        periodStart,
        periodEnd,
        perMetric: [],
        overall: { local: 0, stripe: 0, drift_abs: 0, drift_pct: 0, metrics: 0, items: 0 },
      } as any);
    }

    // Convert YYYY-MM to YYYY-MM-01 for date comparisons
    const startDate = `${periodStart}-01`;
    const endDate = `${periodEnd}-01`;

    try {
      const rows = await db
        .select({
          metric: priceMappings.metric,
          local: sql<string>`SUM((${reconciliationReports.localTotal})::numeric)` as unknown as number,
          stripe: sql<string>`SUM((${reconciliationReports.stripeTotal})::numeric)` as unknown as number,
          items: sql<number>`COUNT(DISTINCT ${reconciliationReports.subscriptionItemId})`,
        })
        .from(reconciliationReports)
        .innerJoin(
          priceMappings,
          and(
            eq(priceMappings.subscriptionItemId, reconciliationReports.subscriptionItemId),
            eq(priceMappings.tenantId, reconciliationReports.tenantId),
            eq(priceMappings.active, true as any)
          )
        )
        .where(
          and(
            eq(reconciliationReports.tenantId, tenantId),
            gte(reconciliationReports.periodStart, startDate),
            lte(reconciliationReports.periodStart, endDate)
          )
        )
        .groupBy(priceMappings.metric);

      const perMetric = rows.map((r) => {
        const local = Number(r.local ?? 0);
        const stripe = Number(r.stripe ?? 0);
        const drift_abs = Math.abs(local - stripe);
        const drift_pct = stripe > 0 ? drift_abs / stripe : drift_abs > 0 ? 1 : 0;
        return { metric: r.metric, local, stripe, drift_abs, drift_pct, items: Number(r.items ?? 0) };
      });

      const overallLocal = perMetric.reduce((s, m) => s + m.local, 0);
      const overallStripe = perMetric.reduce((s, m) => s + m.stripe, 0);
      const overallDriftAbs = Math.abs(overallLocal - overallStripe);
      const overallDriftPct = overallStripe > 0 ? overallDriftAbs / overallStripe : overallDriftAbs > 0 ? 1 : 0;
      const overallItems = perMetric.reduce((s, m) => s + m.items, 0);

      const body: ReconciliationSummaryResponse = {
        periodStart,
        periodEnd,
        perMetric,
        overall: {
          local: overallLocal,
          stripe: overallStripe,
          drift_abs: overallDriftAbs,
          drift_pct: overallDriftPct,
          metrics: perMetric.length,
          items: overallItems,
        },
      };

      reply.send(body);
    } catch (err) {
      // Fail closed with empty summary
      reply.send({
        periodStart,
        periodEnd,
        perMetric: [],
        overall: { local: 0, stripe: 0, drift_abs: 0, drift_pct: 0, metrics: 0, items: 0 },
      });
    }
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
