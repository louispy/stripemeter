import { FastifyRequest, FastifyReply } from 'fastify';
import { db } from '@stripemeter/database';
import { auditLogs } from '@stripemeter/database';

export async function persistAuditLog(request: FastifyRequest, reply: FastifyReply) {
  try {
    const tenant = request.tenant;
    if (!tenant) return;
    const url = request.raw.url || '';
    if (url.startsWith('/docs') || url.startsWith('/health')) return;

    const action = `${request.method} ${request.routerPath || url.split('?')[0]}`;
    await db.insert(auditLogs).values({
      organisationId: tenant.organisationId,
      projectId: tenant.projectId,
      actorType: 'api_key',
      actorId: tenant.apiKeyId,
      action,
      resourceType: undefined,
      resourceId: undefined,
      ip: request.ip,
      userAgent: request.headers['user-agent'] as string | undefined,
      meta: {
        requestId: request.id,
        statusCode: reply.statusCode,
        path: url,
      },
    });
  } catch (err) {
    request.log.warn({ err }, 'audit log persist failed');
  }
}


