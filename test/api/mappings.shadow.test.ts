import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildServer } from '../../apps/api/src/server';
import { db } from '@stripemeter/database';

describe('Mappings API with shadow fields', () => {
  let server: Awaited<ReturnType<typeof buildServer>>;

  beforeAll(async () => {
    process.env.BYPASS_AUTH = '1';
    server = await buildServer();
  });

  afterAll(async () => {
    await server.close();
  });

  it('should create and retrieve a mapping with shadow fields', async () => {
    const payload = {
      tenantId: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
      metric: 'api_calls',
      aggregation: 'sum',
      stripeAccount: 'acct_live123',
      priceId: 'price_live123',
      subscriptionItemId: 'si_live123',
      currency: 'USD',
      active: true,
      shadow: true,
      shadowStripeAccount: 'acct_test123',
      shadowPriceId: 'price_test123',
      shadowSubscriptionItemId: 'si_test123',
    };

    const resCreate = await server.inject({
      method: 'POST',
      url: '/v1/mappings',
      payload,
    });
    expect(resCreate.statusCode).toBe(201);
    const created = resCreate.json();
    expect(created.shadow).toBe(true);
    expect(created.shadowStripeAccount).toBe('acct_test123');

    const resList = await server.inject({
      method: 'GET',
      url: `/v1/mappings?tenantId=${payload.tenantId}`,
    });
    expect(resList.statusCode).toBe(200);
    const list = resList.json();
    const found = list.find((m: any) => m.id === created.id);
    expect(found).toBeTruthy();
    expect(found.shadow).toBe(true);
  });
});


