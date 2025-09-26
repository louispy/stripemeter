import { describe, it, expect, beforeEach } from 'vitest';
import { db, counters, adjustments } from '@stripemeter/database';
import { AggregatorWorker } from '../apps/workers/src/workers/aggregator';
import { and, eq } from 'drizzle-orm';

function makeWorker(): AggregatorWorker {
  return new AggregatorWorker();
}

describe('Aggregator uses only approved adjustments', () => {
  const tenantId = '00000000-0000-0000-0000-000000000001';
  const metric = 'api_calls';
  const customerRef = 'cus_A';
  const periodStart = '2025-01-01';

  beforeEach(async () => {
    await db.delete(counters);
    await db.delete(adjustments);
  });

  it('excludes pending, includes approved, excludes reverted', async () => {
    // Seed adjustments in different states
    await db.insert(adjustments).values({
      tenantId, metric, customerRef, periodStart: periodStart as any, delta: '2', reason: 'manual', actor: 'test', status: 'pending' as any,
    });
    await db.insert(adjustments).values({
      tenantId, metric, customerRef, periodStart: periodStart as any, delta: '3', reason: 'manual', actor: 'test', status: 'approved' as any,
    });
    await db.insert(adjustments).values({
      tenantId, metric, customerRef, periodStart: periodStart as any, delta: '4', reason: 'manual', actor: 'test', status: 'reverted' as any,
    });

    const worker = makeWorker();
    await worker.processAggregation({ tenantId, metric, customerRef, periodStart });

    const [row] = await db
      .select()
      .from(counters)
      .where(and(eq(counters.tenantId, tenantId as any), eq(counters.metric, metric), eq(counters.customerRef, customerRef), eq(counters.periodStart, periodStart as any)));

    expect(Number(row.aggSum)).toBeCloseTo(3);
  });
});


