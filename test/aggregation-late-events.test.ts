import { describe, test, beforeEach, expect } from 'vitest';
import { db, events, counters, adjustments } from '@stripemeter/database';
import { AggregatorWorker } from '../apps/workers/src/workers/aggregator';
import { eq, and } from 'drizzle-orm';

describe('Aggregation worker - late events & watermark behavior', () => {
  const tenantId = '00000000-0000-0000-0000-000000000001';
  const metric = 'api_calls';
  const customerRef = 'cust_test_1';
  const periodStart = '2025-09-01';
  const periodEnd = '2025-09-30';

  beforeEach(async () => {
    process.env.LATE_EVENT_WINDOW_HOURS = '48';
    // Clean tables for deterministic tests
    await db.delete(adjustments);
    await db.delete(counters);
    await db.delete(events);
  });

  function makeWorkerWithoutCtor(): AggregatorWorker {
    // Avoid constructor (which creates a Redis queue). We only need processAggregation.
    return Object.create(AggregatorWorker.prototype) as AggregatorWorker;
  }

  async function insertEvent(idempotencyKey: string, quantity: number, tsIso: string) {
    await db.insert(events).values({
      idempotencyKey,
      tenantId: tenantId as any,
      metric,
      customerRef,
      quantity: quantity.toString(),
      ts: new Date(tsIso),
      meta: {},
      source: 'test',
    });
  }

  test('within-window late events recompute counters (no adjustments)', async () => {
    const worker = makeWorkerWithoutCtor();

    // Seed on-time event E1 at 2025-09-10T00:00:00Z
    await insertEvent('evt_e1', 5, '2025-09-10T00:00:00Z');

    // First aggregation builds initial counter
    await worker.processAggregation({ tenantId, metric, customerRef, periodStart });

    // Insert late but within-window event E2 at 2025-09-09 (within 48h of watermark 09-10)
    await insertEvent('evt_e2', 3, '2025-09-09T00:00:00Z');

    // Re-aggregate
    await worker.processAggregation({ tenantId, metric, customerRef, periodStart });

    // Verify counters reflect sum=8, no adjustments created
    const [counter] = await db
      .select()
      .from(counters)
      .where(
        and(
          eq(counters.tenantId, tenantId as any),
          eq(counters.metric, metric),
          eq(counters.customerRef, customerRef),
          eq(counters.periodStart, periodStart as any)
        )
      )
      .limit(1);

    expect(counter).toBeTruthy();
    expect(parseFloat(counter.aggSum as any)).toBeCloseTo(8);

    const adjRows = await db
      .select()
      .from(adjustments)
      .where(
        and(
          eq(adjustments.tenantId, tenantId as any),
          eq(adjustments.metric, metric),
          eq(adjustments.customerRef, customerRef),
          eq(adjustments.periodStart, periodStart as any)
        )
      );

    expect(adjRows.length).toBe(0);
  });

  test('beyond-window very-late events produce adjustments and do not double count', async () => {
    const worker = makeWorkerWithoutCtor();

    // Seed on-time event E1 at 2025-09-10
    await insertEvent('evt_e1', 5, '2025-09-10T00:00:00Z');
    await worker.processAggregation({ tenantId, metric, customerRef, periodStart });

    // Insert very-late event E0 at 2025-09-01 (older than watermark - 48h)
    await insertEvent('evt_e0', 2, '2025-09-01T00:00:00Z');

    // Re-aggregate: should create an adjustment but not include E0 in recompute
    await worker.processAggregation({ tenantId, metric, customerRef, periodStart });

    // Verify an adjustment exists
    const adjRows1 = await db
      .select()
      .from(adjustments)
      .where(
        and(
          eq(adjustments.tenantId, tenantId as any),
          eq(adjustments.metric, metric),
          eq(adjustments.customerRef, customerRef),
          eq(adjustments.periodStart, periodStart as any)
        )
      );
    expect(adjRows1.length).toBe(1);
    expect(parseFloat(adjRows1[0].delta as any)).toBeCloseTo(2);

    // Counters should still be 5 immediately after this run (adjustment included next run)
    let [counter1] = await db
      .select()
      .from(counters)
      .where(
        and(
          eq(counters.tenantId, tenantId as any),
          eq(counters.metric, metric),
          eq(counters.customerRef, customerRef),
          eq(counters.periodStart, periodStart as any)
        )
      )
      .limit(1);
    expect(parseFloat(counter1.aggSum as any)).toBeCloseTo(5);

    // One more aggregation should fold adjustments sum
    await worker.processAggregation({ tenantId, metric, customerRef, periodStart });
    let [counter2] = await db
      .select()
      .from(counters)
      .where(
        and(
          eq(counters.tenantId, tenantId as any),
          eq(counters.metric, metric),
          eq(counters.customerRef, customerRef),
          eq(counters.periodStart, periodStart as any)
        )
      )
      .limit(1);
    expect(parseFloat(counter2.aggSum as any)).toBeCloseTo(7);

    // Monotonicity: aggSum did not decrease across runs
    expect(parseFloat(counter2.aggSum as any)).toBeGreaterThanOrEqual(parseFloat(counter1.aggSum as any));
  });
});


