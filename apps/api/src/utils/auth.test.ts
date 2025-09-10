import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildServer } from '../server';

describe('Auth & Rate Limit middleware', () => {
  let server: FastifyInstance;

  beforeAll(async () => {
    delete process.env.BYPASS_AUTH;
    server = await buildServer();
    await server.ready();
  });

  afterAll(async () => {
    await server.close();
  });

  it('rejects when API key missing', async () => {
    const res = await server.inject({ method: 'GET', url: '/v1/events?tenantId=00000000-0000-0000-0000-000000000000' });
    expect(res.statusCode).toBe(401);
  });
});


