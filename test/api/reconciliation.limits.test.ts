import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildServer } from '../../apps/api/src/server';

describe('Reconciliation approvals limits', () => {
  let server: Awaited<ReturnType<typeof buildServer>>;

  beforeAll(async () => {
    process.env.BYPASS_AUTH = '1';
    process.env.MAX_RECONCILIATION_APPROVALS_PER_REQUEST = '2';
    server = await buildServer();
  });

  afterAll(async () => {
    await server.close();
  });

  it('rejects too many adjustmentIds', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/v1/reconciliation/adjustments',
      payload: { adjustmentIds: ['a','b','c'], reason: 'test' },
    });
    expect(res.statusCode).toBe(400);
  });
});


