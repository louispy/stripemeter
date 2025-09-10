import { FastifyRequest, FastifyReply } from 'fastify';
import { db } from '@stripemeter/database';
import { apiKeys } from '@stripemeter/database';
import { eq, and } from 'drizzle-orm';
import { createHmac } from 'crypto';

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
    return reply.status(401).send({ error: 'Missing API key' });
  }

  const apiKey = apiKeyRaw.toString().startsWith('Bearer ')
    ? apiKeyRaw.toString().slice(7)
    : apiKeyRaw.toString();

  const dotIndex = apiKey.indexOf('.');
  if (dotIndex < 1) return reply.status(401).send({ error: 'Invalid API key format' });
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
  if (!match) return reply.status(401).send({ error: 'Invalid API key' });

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


