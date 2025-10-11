import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildServer } from '../../apps/api/src/server';

describe('Price Mappings CRUD', () => {
  let server: Awaited<ReturnType<typeof buildServer>>;
  const tenantId = '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d';

  beforeAll(async () => {
    process.env.BYPASS_AUTH = '1';
    server = await buildServer();
  });

  afterAll(async () => {
    await server.close();
  });

  it('should create, get, list, update and delete a mapping', async () => {
    const payload = {
      tenantId,
      metric: 'api_calls',
      aggregation: 'sum',
      stripeAccount: 'acct_live123',
      priceId: 'price_live123',
      currency: 'USD',
      active: true,
      shadow: false,
    };

    // Create
    const resCreate = await server.inject({ method: 'POST', url: '/v1/mappings', payload });
    expect(resCreate.statusCode).toBe(201);
    const created = resCreate.json();
    expect(created.id).toBeDefined();

    // Get by id
    const resGet = await server.inject({ method: 'GET', url: `/v1/mappings/${created.id}` });
    expect(resGet.statusCode).toBe(200);
    const got = resGet.json();
    expect(got.metric).toBe('api_calls');

    // List by tenant
    const resList = await server.inject({ method: 'GET', url: `/v1/mappings?tenantId=${tenantId}` });
    expect(resList.statusCode).toBe(200);
    const list = resList.json();
    expect(Array.isArray(list)).toBe(true);
    expect(list.find((m: any) => m.id === created.id)).toBeTruthy();

    // Update
    const resUpdate = await server.inject({ method: 'PUT', url: `/v1/mappings/${created.id}`, payload: { active: false, shadow: true } });
    expect(resUpdate.statusCode).toBe(200);
    const updated = resUpdate.json();
    expect(updated.active).toBe(false);
    expect(updated.shadow).toBe(true);

    // Delete
    const resDelete = await server.inject({ method: 'DELETE', url: `/v1/mappings/${created.id}` });
    expect(resDelete.statusCode).toBe(204);

    // Get should 404
    const resGet404 = await server.inject({ method: 'GET', url: `/v1/mappings/${created.id}` });
    expect(resGet404.statusCode).toBe(404);
  });
});


