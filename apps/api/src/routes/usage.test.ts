/**
 * Integration tests for usage API
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildServer } from '../server';

describe('Usage API', () => {
  let server: FastifyInstance;

  beforeAll(async () => {
    server = await buildServer();
    await server.ready();
  });

  afterAll(async () => {
    await server.close();
  });

  it('GET /v1/usage/current returns shape', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/v1/usage/current',
      query: {
        tenantId: '00000000-0000-0000-0000-000000000000',
        customerRef: 'cus_TEST',
      } as any,
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body).toHaveProperty('customerRef');
    expect(body).toHaveProperty('period');
    expect(body).toHaveProperty('metrics');
    expect(Array.isArray(body.metrics)).toBe(true);
  });

  it('POST /v1/usage/projection returns shape', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/v1/usage/projection',
      payload: {
        tenantId: '00000000-0000-0000-0000-000000000000',
        customerRef: 'cus_TEST',
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body).toHaveProperty('customerRef');
    expect(body).toHaveProperty('lineItems');
    expect(Array.isArray(body.lineItems)).toBe(true);
    expect(body).toHaveProperty('subtotal');
    expect(body).toHaveProperty('total');
  });
});


