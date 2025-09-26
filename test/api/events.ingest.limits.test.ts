import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildServer } from '../../apps/api/src/server';

describe('Events ingest limits', () => {
  let server: Awaited<ReturnType<typeof buildServer>>;

  beforeAll(async () => {
    process.env.BYPASS_AUTH = '1';
    process.env.MAX_INGEST_BATCH = '3';
    process.env.INGEST_BODY_LIMIT_BYTES = '1024';
    server = await buildServer();
  });

  afterAll(async () => {
    await server.close();
  });

  it('rejects batch larger than MAX_INGEST_BATCH', async () => {
    const payload = {
      events: [0,1,2,3].map(i => ({
        tenantId: '123e4567-e89b-12d3-a456-426614174999',
        metric: 'api_calls',
        customerRef: 'cus_A',
        quantity: 1,
        ts: new Date().toISOString(),
      }))
    };
    const res = await server.inject({ method: 'POST', url: '/v1/events/ingest', payload });
    expect(res.statusCode).toBe(400);
    const body = res.json();
    expect(body.errors?.[0]?.error).toContain('Batch too large');
  });

  it('rejects meta too large', async () => {
    const payload = {
      events: [{
        tenantId: '123e4567-e89b-12d3-a456-426614174999',
        metric: 'api_calls',
        customerRef: 'cus_A',
        quantity: 1,
        ts: new Date().toISOString(),
        meta: { big: 'x'.repeat(5000) },
      }]
    };
    process.env.MAX_EVENT_META_BYTES = '1024';
    const res = await server.inject({ method: 'POST', url: '/v1/events/ingest', payload });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.errors?.[0]?.error).toContain('Meta too large');
  });
});


