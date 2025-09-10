import { FastifyRequest, FastifyReply } from 'fastify';
import { redis } from '@stripemeter/database';

export function perTenantRateLimit({ limit, windowSeconds }: { limit: number; windowSeconds: number; }) {
  return async function (request: FastifyRequest, reply: FastifyReply) {
    const tenant = request.tenant;
    // If no tenant context (e.g., auth bypass in tests), skip rate limiting
    if (!tenant) return;
    const key = `rl:${tenant.organisationId}:${tenant.projectId || 'org'}:${Math.floor(Date.now() / (windowSeconds * 1000))}`;
    const current = await redis.incr(key);
    if (current === 1) {
      await redis.expire(key, windowSeconds);
    }
    if (current > limit) {
      return reply.status(429).send({ error: 'Rate limit exceeded' });
    }
  };
}


