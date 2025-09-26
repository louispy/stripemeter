import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildServer } from '../server';
import { apiKeys, db } from '@stripemeter/database';
import { eq, inArray } from 'drizzle-orm';

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

  it('should rejects when invalid api key format', async () => {
    const res = await server.inject({
      method: 'GET',
      url: `/v1/events?tenantId=00000000-0000-0000-0000-000000000000`,
      headers: {
        'x-api-key': 'thequickbrownfoxjumpsoverthelazydog',
      }
    });
    expect(res.statusCode).toBe(401);
  });
});

describe('Scope & Tenant validation', () => {
  let server: FastifyInstance;
  let newApiKeys: string[] = [];
  const toCreateApiKeys = [
    { keyName: `test-key-invalid`, scopes: ['resouce:action'] },
    { keyName: `test-key-valid`, scopes: ['project:read,project:write'] },
  ];
  const defaultOrgId = '00000000-0000-0000-0000-000000000000';
  const invalidOrgId = '00000000-0000-0000-0000-000000000001';

  beforeAll(async () => {
    process.env.BYPASS_AUTH = '1';
    server = await buildServer();
    await server.ready();

    await db.delete(apiKeys).where(inArray(apiKeys.name, toCreateApiKeys.map(e => e.keyName)));
    for (const { keyName, scopes } of toCreateApiKeys) {
      const createRes = await server.inject({
        method: 'POST',
        url: '/v1/admin/api-keys',
        payload: { name: keyName, scopes },
      });
      expect(createRes.statusCode).toBe(201);
      const created = JSON.parse(createRes.body);
      expect(created.apiKey).toMatch(/\./);
      newApiKeys.push(created.apiKey);
    }
    delete process.env.BYPASS_AUTH;
  });

  afterAll(async () => {
    await server.close();
  });

  it('should rejects when invalid scope', async () => {
    const res = await server.inject({
      method: 'GET',
      url: `/v1/events?tenantId=${defaultOrgId}`,
      headers: {
        'x-api-key': newApiKeys[0],
      }
    });
    expect(res.statusCode).toBe(403);
  });

  it('should rejects when invalid tenantId', async () => {
    const res = await server.inject({
      method: 'GET',
      url: `/v1/events?tenantId=${invalidOrgId}`,
      headers: {
        'x-api-key': newApiKeys[1],
      }
    });
    expect(res.statusCode).toBe(403);
  });

  it('should succeed on matching tenantId and scope', async () => {
    const res = await server.inject({
      method: 'GET',
      url: `/v1/events?tenantId=${defaultOrgId}`,
      headers: {
        'x-api-key': newApiKeys[1],
      }
    });
    expect(res.statusCode).toBe(200);
  });
});

describe('Swagger security scheme', () => {
  let server: FastifyInstance;

  beforeAll(async () => {
    server = await buildServer();
    await server.ready();
  });

  afterAll(async () => {
    await server.close();
  });

  it('should include API key security definition', async () => {
    const res = await server.inject({ method: 'GET', url: '/docs/json' });
    expect(res.statusCode).toBe(200);
    const spec = JSON.parse(res.body);

    expect(spec.securityDefinitions?.ApiKeyAuth).toBeDefined();
    expect(spec.securityDefinitions?.BearerAuth).toBeDefined();
  });
})