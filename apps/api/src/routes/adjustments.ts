import { FastifyPluginAsync } from 'fastify';
import { and, eq, gte, lte } from 'drizzle-orm';
import { db, adjustments, auditLogs } from '@stripemeter/database';
import { apiAdjustmentsApprovedTotal, apiAdjustmentsCreatedTotal, apiAdjustmentsRevertedTotal } from '../utils/metrics';
import { requireScopes, verifyTenantId } from '../utils/auth';
import { SCOPES } from '../constants/scopes';

export const adjustmentsRoutes: FastifyPluginAsync = async (server) => {
  // List adjustments
  server.get<{ Querystring: any }>('/', {
    schema: {
      description: 'List adjustments',
      tags: ['adjustments'],
      querystring: {
        type: 'object',
        properties: {
          tenantId: { type: 'string' },
          metric: { type: 'string' },
          customerRef: { type: 'string' },
          periodStart: { type: 'string', format: 'date' },
          periodEnd: { type: 'string', format: 'date' },
          status: { type: 'string', enum: ['pending', 'approved', 'reverted'] },
        },
        required: ['tenantId'],
      },
    },
    preHandler: [requireScopes(SCOPES.PROJECT_READ), verifyTenantId()],
  }, async (request, reply) => {
    const { tenantId, metric, customerRef, periodStart, periodEnd, status } = request.query as any;

    const where = [eq(adjustments.tenantId, tenantId)];
    if (metric) where.push(eq(adjustments.metric, metric));
    if (customerRef) where.push(eq(adjustments.customerRef, customerRef));
    if (periodStart) where.push(gte(adjustments.periodStart, periodStart));
    if (periodEnd) where.push(lte(adjustments.periodStart, periodEnd));
    if (status) where.push(eq(adjustments.status as any, status));

    const rows = await db
      .select()
      .from(adjustments)
      .where(and(...where));

    reply.send({ adjustments: rows });
  });

  // Get by id
  server.get<{ Params: { id: string }; Querystring: { tenantId: string } }>('/:id', {
    schema: {
      description: 'Get a single adjustment',
      tags: ['adjustments'],
      params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'string' } },
      },
      querystring: {
        type: 'object',
        required: ['tenantId'],
        properties: { tenantId: { type: 'string' } },
      },
    },
    preHandler: [requireScopes(SCOPES.PROJECT_READ), verifyTenantId()],
  }, async (request, reply) => {
    const { id } = request.params;
    const { tenantId } = request.query;
    const [row] = await db
      .select()
      .from(adjustments)
      .where(and(eq(adjustments.id, id as any), eq(adjustments.tenantId, tenantId)));
    if (!row) return reply.status(404).send({ error: 'Not found' });
    reply.send(row);
  });

  // Create pending adjustment
  server.post<{ Body: any }>('/', {
    schema: {
      description: 'Create a pending adjustment',
      tags: ['adjustments'],
      body: {
        type: 'object',
        required: ['tenantId', 'metric', 'customerRef', 'periodStart', 'delta', 'reason'],
        properties: {
          tenantId: { type: 'string' },
          metric: { type: 'string' },
          customerRef: { type: 'string' },
          periodStart: { type: 'string', format: 'date' },
          delta: { type: 'number' },
          reason: { type: 'string', enum: ['backfill', 'correction', 'promo', 'credit', 'manual'] },
          requestId: { type: 'string' },
          note: { type: 'string' },
        },
      },
    },
    preHandler: [requireScopes(SCOPES.PROJECT_WRITE), verifyTenantId()],
  }, async (request, reply) => {
    const body = request.body as any;
    const actor = request.tenant?.apiKeyPrefix ? `api:${request.tenant?.apiKeyPrefix}` : 'api';
    const row = {
      tenantId: body.tenantId,
      metric: body.metric,
      customerRef: body.customerRef,
      periodStart: body.periodStart,
      delta: String(body.delta),
      reason: body.reason,
      actor,
      status: 'pending' as const,
      requestId: body.requestId,
      note: body.note,
      createdAt: new Date(),
    };
    await db.insert(adjustments).values(row);
    try { apiAdjustmentsCreatedTotal.labels(request.tenant!.organisationId, body.reason).inc(); } catch (_e) {}
    await db.insert(auditLogs).values({
      organisationId: request.tenant!.organisationId,
      projectId: request.tenant!.projectId,
      actorType: 'api_key',
      actorId: request.tenant!.apiKeyId,
      action: 'adjustment.create',
      resourceType: 'adjustment',
      resourceId: '',
      meta: row as any,
      createdAt: new Date(),
    });
    reply.status(201).send({ ok: true });
  });

  // Approve adjustment
  server.post<{ Params: { id: string }; Body: { tenantId: string } }>('/:id/approve', {
    schema: {
      description: 'Approve a pending adjustment',
      tags: ['adjustments'],
      params: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } },
      body: { type: 'object', required: ['tenantId'], properties: { tenantId: { type: 'string' } } },
    },
    preHandler: [requireScopes(SCOPES.PROJECT_WRITE), verifyTenantId()],
  }, async (request, reply) => {
    const { id } = request.params;
    const { tenantId } = request.body;
    const actor = request.tenant?.apiKeyPrefix ? `api:${request.tenant?.apiKeyPrefix}` : 'api';
    const [row] = await db
      .select()
      .from(adjustments)
      .where(and(eq(adjustments.id, id as any), eq(adjustments.tenantId, tenantId)));
    if (!row) return reply.status(404).send({ error: 'Not found' });
    if (row.status === 'approved') return reply.send({ ok: true, already: true });
    if (row.status === 'reverted') return reply.status(400).send({ error: 'Already reverted' });
    await db.update(adjustments).set({ status: 'approved' as any, approvedBy: actor, approvedAt: new Date() }).where(eq(adjustments.id, id as any));
    try { apiAdjustmentsApprovedTotal.labels(request.tenant!.organisationId).inc(); } catch (_e) {}
    await db.insert(auditLogs).values({
      organisationId: request.tenant!.organisationId,
      projectId: request.tenant!.projectId,
      actorType: 'api_key',
      actorId: request.tenant!.apiKeyId,
      action: 'adjustment.approve',
      resourceType: 'adjustment',
      resourceId: id,
      meta: {},
      createdAt: new Date(),
    });
    reply.send({ ok: true });
  });

  // Revert adjustment (create linked negative adjustment, mark original reverted)
  server.post<{ Params: { id: string }; Body: { tenantId: string; note?: string } }>('/:id/revert', {
    schema: {
      description: 'Revert an approved adjustment',
      tags: ['adjustments'],
      params: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } },
      body: { type: 'object', required: ['tenantId'], properties: { tenantId: { type: 'string' }, note: { type: 'string' } } },
    },
    preHandler: [requireScopes(SCOPES.PROJECT_WRITE), verifyTenantId()],
  }, async (request, reply) => {
    const { id } = request.params;
    const { tenantId, note } = request.body;
    const actor = request.tenant?.apiKeyPrefix ? `api:${request.tenant?.apiKeyPrefix}` : 'api';
    const [row] = await db
      .select()
      .from(adjustments)
      .where(and(eq(adjustments.id, id as any), eq(adjustments.tenantId, tenantId)));
    if (!row) return reply.status(404).send({ error: 'Not found' });
    if (row.status !== 'approved') return reply.status(400).send({ error: 'Only approved adjustments can be reverted' });

    // Mark original reverted
    await db.update(adjustments).set({ status: 'reverted' as any, revertedBy: actor, revertedAt: new Date(), note }).where(eq(adjustments.id, id as any));
    // Create reversal
    const reversal = {
      tenantId: row.tenantId,
      metric: row.metric,
      customerRef: row.customerRef,
      periodStart: row.periodStart as any,
      delta: String(-Number(row.delta)),
      reason: 'correction' as const,
      actor,
      status: 'approved' as const,
      parentAdjustmentId: row.id as any,
      note,
      createdAt: new Date(),
    };
    await db.insert(adjustments).values(reversal);
    try { apiAdjustmentsRevertedTotal.labels(request.tenant!.organisationId).inc(); } catch (_e) {}
    await db.insert(auditLogs).values({
      organisationId: request.tenant!.organisationId,
      projectId: request.tenant!.projectId,
      actorType: 'api_key',
      actorId: request.tenant!.apiKeyId,
      action: 'adjustment.revert',
      resourceType: 'adjustment',
      resourceId: id,
      meta: reversal as any,
      createdAt: new Date(),
    });
    reply.send({ ok: true });
  });
};


