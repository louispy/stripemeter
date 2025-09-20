import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock database and redis layer used by aggregator
vi.mock('@stripemeter/database', () => {
  const nextSelectResults: any[] = [];

  function buildWhereResult() {
    const obj: any = {
      limit: (_n?: number) => (nextSelectResults.shift() ?? []),
      orderBy: (_o?: any) => (nextSelectResults.shift() ?? []),
    };
    // Make await obj resolve to next result (thenable)
    obj.then = (resolve: any) => resolve(nextSelectResults.shift() ?? []);
    return obj;
  }

  const db = {
    __pushSelectResult: (res: any) => nextSelectResults.push(res),
    select: (_?: any) => ({
      from: (_tbl?: any) => ({
        where: (_w?: any) => buildWhereResult(),
        orderBy: (_o?: any) => (nextSelectResults.shift() ?? []),
      }),
    }),
    update: (_tbl?: any) => ({ set: (_vals?: any) => ({ where: (_?: any) => ({}) }) }),
    insert: (_tbl?: any) => ({ values: (_vals?: any) => ({}) }),
  } as any;

  return {
    db,
    redis: { setex: vi.fn(async () => true) },
    events: {},
    counters: {},
    adjustments: {},
  };
});

import { AggregatorWorker } from './aggregator';
import { reaggregationsTotal } from '../utils/metrics';
import { db } from '@stripemeter/database';

describe('Aggregator reaggregations_total metrics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('increments reason=initial when creating a new counter', async () => {
    const incSpy = vi.spyOn(reaggregationsTotal, 'inc');
    const labelsSpy = vi.spyOn(reaggregationsTotal, 'labels');

    // Queue DB responses in order of select() calls within processAggregation
    // 1) existingCounter lookup → none
    (db as any).__pushSelectResult([]);
    // 2) aggregations over events
    (db as any).__pushSelectResult([{ sum: '0', max: '0', last: null, maxTs: new Date() }]);
    // 3) adjustments sum
    (db as any).__pushSelectResult([{ total: '0' }]);

    const worker = new AggregatorWorker();
    await worker.processAggregation({
      tenantId: 't1',
      metric: 'm1',
      customerRef: 'c1',
      periodStart: '2025-01-01T00:00:00.000Z',
    } as any);

    expect(labelsSpy).toHaveBeenCalledWith('initial');
    expect(incSpy).toHaveBeenCalled();
  });

  it('increments reason=late_event when recomputeStartDate advances due to watermark', async () => {
    const incSpy = vi.spyOn(reaggregationsTotal, 'inc');
    const labelsSpy = vi.spyOn(reaggregationsTotal, 'labels');

    const periodStart = new Date('2025-01-01T00:00:00.000Z');
    const watermark = new Date(periodStart.getTime() + 72 * 60 * 60 * 1000); // +72h
    process.env.LATE_EVENT_WINDOW_HOURS = '48';

    // 1) existingCounter with watermarkTs
    (db as any).__pushSelectResult([{ watermarkTs: watermark, updatedAt: new Date() }]);
    // 2) aggregations over events
    (db as any).__pushSelectResult([{ sum: '1', max: '1', last: '1', maxTs: new Date() }]);
    // 3) adjustments sum
    (db as any).__pushSelectResult([{ total: '0' }]);
    // 4) late events query (return none)
    (db as any).__pushSelectResult([]);

    const worker = new AggregatorWorker();
    await worker.processAggregation({
      tenantId: 't1',
      metric: 'm1',
      customerRef: 'c1',
      periodStart: periodStart.toISOString(),
    } as any);

    expect(labelsSpy).toHaveBeenCalledWith('late_event');
    expect(incSpy).toHaveBeenCalled();
  });

  it('increments reason=on_time when recomputeStartDate equals periodStart', async () => {
    const incSpy = vi.spyOn(reaggregationsTotal, 'inc');
    const labelsSpy = vi.spyOn(reaggregationsTotal, 'labels');

    const periodStart = new Date('2025-01-01T00:00:00.000Z');
    const watermark = new Date(periodStart.getTime() + 24 * 60 * 60 * 1000); // +24h
    process.env.LATE_EVENT_WINDOW_HOURS = '48';

    // 1) existingCounter with watermarkTs; lowerBound < periodStart → recomputeStartDate = periodStart
    (db as any).__pushSelectResult([{ watermarkTs: watermark, updatedAt: new Date() }]);
    // 2) aggregations
    (db as any).__pushSelectResult([{ sum: '2', max: '2', last: '2', maxTs: new Date() }]);
    // 3) adjustments sum
    (db as any).__pushSelectResult([{ total: '0' }]);
    // 4) late events
    (db as any).__pushSelectResult([]);

    const worker = new AggregatorWorker();
    await worker.processAggregation({
      tenantId: 't1',
      metric: 'm1',
      customerRef: 'c1',
      periodStart: periodStart.toISOString(),
    } as any);

    expect(labelsSpy).toHaveBeenCalledWith('on_time');
    expect(incSpy).toHaveBeenCalled();
  });
});


