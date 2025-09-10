import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildServer } from '../server';

describe('Admin API Keys', () => {
  let server: FastifyInstance;

  beforeAll(async () => {
    process.env.BYPASS_AUTH = '1';
    server = await buildServer();
    await server.ready();
  });

  afterAll(async () => {
    await server.close();
  });

  it('creates, rotates and revokes an API key', async () => {
    // create
    const keyName = `test-key-${Date.now()}`;
    const createRes = await server.inject({
      method: 'POST',
      url: '/v1/admin/api-keys',
      payload: { name: keyName },
    });
    expect(createRes.statusCode).toBe(201);
    const created = JSON.parse(createRes.body);
    expect(created.apiKey).toMatch(/\./);
    const id = created.key.id;

    // rotate
    const rotRes = await server.inject({
      method: 'POST',
      url: `/v1/admin/api-keys/${id}/rotate`,
    });
    expect(rotRes.statusCode).toBe(200);
    const rotated = JSON.parse(rotRes.body);
    expect(rotated.apiKey).toMatch(/\./);
    expect(rotated.key.prefix).not.toBe(created.key.prefix);

    // revoke
    const revRes = await server.inject({
      method: 'POST',
      url: `/v1/admin/api-keys/${id}/revoke`,
    });
    expect(revRes.statusCode).toBe(200);
    const revoked = JSON.parse(revRes.body);
    expect(revoked.key.active).toBe(false);
  });
});


