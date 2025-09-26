import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildServer } from '../../apps/api/src/server';
import { db, adjustments, counters } from '@stripemeter/database';
import { and, eq } from 'drizzle-orm';

describe('Adjustments API lifecycle', () => {
  let server: Awaited<ReturnType<typeof buildServer>>;
  const tenantId = '123e4567-e89b-12d3-a456-426614174999';
  const metric = 'api_calls';
  const customerRef = 'cus_TEST';
  const periodStart = '2025-01-01';

  beforeAll(async () => {
    process.env.BYPASS_AUTH = '1';
    server = await buildServer();
    // Cleanup
    await db.delete(adjustments);
    await db.delete(counters);
  });

  afterAll(async () => {
    await server.close();
  });

  it('should create pending, approve, and revert an adjustment', async () => {
    // Create pending
    const createRes = await server.inject({
      method: 'POST',
      url: '/v1/adjustments',
      payload: {
        tenantId,
        metric,
        customerRef,
        periodStart,
        delta: 5,
        reason: 'manual',
        note: 'test adj',
      },
    });
    expect(createRes.statusCode).toBe(201);

    const listRes = await server.inject({
      method: 'GET',
      url: `/v1/adjustments?tenantId=${tenantId}&metric=${metric}&customerRef=${customerRef}&status=pending`,
    });
    const list = listRes.json();
    expect(Array.isArray(list.adjustments)).toBe(true);
    const id = list.adjustments[0].id;

    // Approve
    const approveRes = await server.inject({
      method: 'POST',
      url: `/v1/adjustments/${id}/approve`,
      payload: { tenantId },
    });
    expect(approveRes.statusCode).toBe(200);

    const [approvedRow] = await db
      .select()
      .from(adjustments)
      .where(and(eq(adjustments.id, id as any), eq(adjustments.tenantId, tenantId as any)));
    expect(approvedRow.status).toBe('approved');

    // Revert
    const revertRes = await server.inject({
      method: 'POST',
      url: `/v1/adjustments/${id}/revert`,
      payload: { tenantId, note: 'undo' },
    });
    expect(revertRes.statusCode).toBe(200);

    const rows = await db
      .select()
      .from(adjustments)
      .where(eq(adjustments.tenantId, tenantId as any));
    const original = rows.find(r => r.id === id)!;
    const reversal = rows.find(r => r.parentAdjustmentId === id)!;
    expect(original.status).toBe('reverted');
    expect(Number(reversal.delta)).toBe(-Number(original.delta));
    expect(reversal.status).toBe('approved');
  });
});


