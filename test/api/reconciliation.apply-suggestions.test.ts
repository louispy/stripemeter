import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildServer } from '../../apps/api/src/server';
import { db, adjustments } from '@stripemeter/database';

describe('Reconciliation apply suggestions', () => {
  let server: Awaited<ReturnType<typeof buildServer>>;
  const tenantId = '123e4567-e89b-12d3-a456-426614174777';

  beforeAll(async () => {
    process.env.BYPASS_AUTH = '1';
    server = await buildServer();
    await db.delete(adjustments);
  });

  afterAll(async () => {
    await server.close();
  });

  it('approves a list of pending suggested adjustments', async () => {
    // seed two pending adjustments
    const a1 = await db.insert(adjustments).values({
      tenantId, metric: 'api_calls', customerRef: 'cus_X', periodStart: '2025-01-01' as any, delta: '1', reason: 'correction', actor: 'system', status: 'pending' as any,
    }).returning();
    const a2 = await db.insert(adjustments).values({
      tenantId, metric: 'api_calls', customerRef: 'cus_Y', periodStart: '2025-01-01' as any, delta: '2', reason: 'correction', actor: 'system', status: 'pending' as any,
    }).returning();

    const res = await server.inject({
      method: 'POST',
      url: '/v1/reconciliation/adjustments',
      payload: { adjustmentIds: [a1[0].id, a2[0].id], reason: 'approve suggested' },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.applied).toBe(2);

    const rows = await db.select().from(adjustments);
    expect(rows.filter(r => r.status === 'approved').length).toBe(2);
  });
});


