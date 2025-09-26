/**
 * Logger configuration
 */

import pino from 'pino';

const isDevelopment = process.env.NODE_ENV === 'development';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: isDevelopment
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
  serializers: {
    req: (req) => ({
      method: req.method,
      url: req.url,
      headers: (() => {
        const headers = { ...(req.headers || {}) } as Record<string, any>;
        const redact = ['authorization', 'x-api-key'];
        for (const key of Object.keys(headers)) {
          if (redact.includes(key.toLowerCase())) headers[key] = '[redacted]';
        }
        return headers;
      })(),
      hostname: req.hostname,
      remoteAddress: req.ip,
      remotePort: req.socket?.remotePort,
    }),
    res: (res) => ({
      statusCode: res.statusCode,
    }),
  },
  base: {
    service: 'stripemeter-api',
    env: process.env.NODE_ENV,
  },
});

export function logAudit(serverOrRequest: any, event: {
  organisationId: string;
  projectId?: string;
  actorType: 'api_key' | 'user' | 'system';
  actorId: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  meta?: Record<string, any>;
}) {
  const l = serverOrRequest && serverOrRequest.log ? serverOrRequest.log : logger;
  l.info({ audit: event }, 'audit');
}

export function warnIfNonUuidTenantId(logger: any, tenantId: string) {
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(tenantId);
  if (!isUuid) {
    try { logger?.warn?.({ tenantId }, 'non-uuid tenantId used'); } catch { /* noop */ }
  }
}
