import { FastifyRequest, FastifyReply } from 'fastify';
import { db } from '@stripemeter/database';
import { apiKeys } from '@stripemeter/database';
import { eq, and } from 'drizzle-orm';
import { createHmac } from 'crypto';
import { authFailTotal, crossTenantBlockTotal, scopeDenyTotal } from './metrics';

export type TenantContext = {
  organisationId: string;
  projectId?: string;
  apiKeyId: string;
  apiKeyPrefix: string;
  scopes: string[];
};

declare module 'fastify' {
  interface FastifyRequest {
    tenant?: TenantContext;
  }
}

export async function verifyApiKey(request: FastifyRequest, reply: FastifyReply) {
  const header = request.headers['authorization'] || request.headers['x-api-key'];
  const apiKeyRaw = Array.isArray(header) ? header[0] : header;
  if (!apiKeyRaw) {
    authFailTotal.inc({ route: request.routerPath, method: request.method });
    return reply.status(401).send({ error: 'Missing API key' });
  }

  const apiKey = apiKeyRaw.toString().startsWith('Bearer ')
    ? apiKeyRaw.toString().slice(7)
    : apiKeyRaw.toString();

  const dotIndex = apiKey.indexOf('.');
  if (dotIndex < 1) {
    authFailTotal.inc({ route: request.routerPath, method: request.method });
    return reply.status(401).send({ error: 'Invalid API key format' });
  }

  const prefix = apiKey.substring(0, dotIndex);
  const lastFour = apiKey.substring(apiKey.length - 4);

  // Lookup candidate keys by prefix and last4 to reduce hash checks
  const candidates = await db.select()
    .from(apiKeys)
    .where(and(eq(apiKeys.prefix, prefix), eq(apiKeys.lastFour, lastFour)))
    .limit(10);

  const computed = createHmac('sha256', getKeyDerivationSalt())
    .update(apiKey)
    .digest('base64url');

  const match = candidates.find(k => k.secretHash === computed && k.active && !k.revokedAt && (!k.expiresAt || new Date(k.expiresAt) > new Date()));
  if (!match) {
    authFailTotal.inc({ route: request.routerPath, method: request.method });
    return reply.status(401).send({ error: 'Invalid API key' });
  }

  request.tenant = {
    organisationId: match.organisationId,
    projectId: match.projectId ?? undefined,
    apiKeyId: match.id,
    apiKeyPrefix: match.prefix,
    scopes: (match.scopes || '').split(',').filter(Boolean),
  };
}

function getKeyDerivationSalt(): string {
  return process.env.API_KEY_SALT || 'dev-api-key-salt';
}

export function requireScopes(...scopes: string[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const bypass = process.env.BYPASS_AUTH === '1';
    if (bypass) return;
    const isAllowed = scopes.some(scope => request.tenant?.scopes.includes(scope));
    if (!isAllowed) {
      scopeDenyTotal.inc({
        route: request.routerPath,
        method: request.method,
        org: request.tenant?.organisationId || 'no-tenant',
      });
      reply.status(403).send({ error: `Require one of: ${scopes}` });
    }
  }
}

export function verifyTenantId(toVerifyKey: string | null = null) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const bypass = process.env.BYPASS_AUTH === '1';
    if (bypass) return;
    const organisationId = request.tenant?.organisationId;
    if (!organisationId) {
      authFailTotal.inc({ route: request.routerPath, method: request.method });
      return reply.status(401).send({ error: 'Unauthenticated' });
    }

    let tenantId: string | null = null;

    if (toVerifyKey === null) {
      tenantId = (request.query as any)?.tenantId ?? (request.body as any)?.tenantId ?? null;
    } else {
      const toVerify: Object | Array<Object> | null =
        (request.query as any)?.[toVerifyKey] ??
        (request.body as any)?.[toVerifyKey] ?? null;

      if (Array.isArray(toVerify)) {
        const tenantIds: string[] = (toVerify as any[]).map(obj => obj.tenantId);
        if (!tenantIds.every(id => id === organisationId)) {
          crossTenantBlockTotal.inc({
            route: request.routerPath,
            method: request.method,
            org: organisationId,
          });
          return reply.status(403).send({ error: `Mismatched tenantId in ${toVerifyKey}` });
        }
      } else if (toVerify && typeof toVerify === 'object') {
        tenantId = (toVerify as any)?.tenantId;
      }
    }

    const isAllowed = tenantId !== null ? tenantId === organisationId : true;
    if (!isAllowed) {
      crossTenantBlockTotal.inc({
        route: request.routerPath,
        method: request.method,
        org: organisationId,
      });
      return reply.status(403).send({ error: `Mismatched tenantId` });
    }
  }
}