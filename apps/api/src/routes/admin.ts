import { FastifyInstance } from 'fastify';
import { db } from '@stripemeter/database';
import { apiKeys } from '@stripemeter/database';
import { eq } from 'drizzle-orm';
import { createHmac, randomBytes } from 'crypto';

export async function adminRoutes(server: FastifyInstance) {
  server.post('/api-keys', async (request, reply) => {
    const body = request.body as any;
    const organisationId = request.tenant?.organisationId || (process.env.BYPASS_AUTH === '1' ? '00000000-0000-0000-0000-000000000000' : undefined);
    if (!organisationId) return reply.status(401).send({ error: 'unauthenticated' });
    const name = body?.name || 'New API Key';
    const projectId = body?.projectId as string | undefined;
    const scopes = Array.isArray(body?.scopes) ? body.scopes.join(',') : 'project:read,project:write';

    const { apiKey, prefix, last4, secretHash } = generateApiKeyHash('sm');
    const inserted = await db.insert(apiKeys).values({ organisationId, projectId, name, prefix, lastFour: last4, secretHash, scopes }).returning();
    return reply.status(201).send({ apiKey, key: inserted[0] });
  });

  server.post('/api-keys/:id/rotate', async (request, reply) => {
    const organisationId = request.tenant?.organisationId || (process.env.BYPASS_AUTH === '1' ? '00000000-0000-0000-0000-000000000000' : undefined);
    if (!organisationId) return reply.status(401).send({ error: 'unauthenticated' });
    const id = (request.params as any).id as string;
    const { apiKey, prefix, last4, secretHash } = generateApiKeyHash('sm');
    const updated = await db.update(apiKeys)
      .set({ prefix, lastFour: last4, secretHash })
      .where(eq(apiKeys.id, id))
      .returning();
    return reply.status(200).send({ apiKey, key: updated[0] });
  });

  server.post('/api-keys/:id/revoke', async (request, reply) => {
    const id = (request.params as any).id as string;
    const updated = await db.update(apiKeys)
      .set({ active: false, revokedAt: new Date() })
      .where(eq(apiKeys.id, id))
      .returning();
    return reply.status(200).send({ key: updated[0] });
  });
}

function generateApiKeyHash(prefixBase: string) {
  const prefix = `${prefixBase}_${randomBytes(3).toString('hex')}`;
  const secret = randomBytes(24).toString('base64url');
  const apiKey = `${prefix}.${secret}`;
  const last4 = secret.slice(-4);
  const secretHash = createHmac('sha256', getKeyDerivationSalt())
    .update(apiKey)
    .digest('base64url');
  return { apiKey, prefix, last4, secretHash };
}

function getKeyDerivationSalt(): string {
  return process.env.API_KEY_SALT || 'dev-api-key-salt';
}


