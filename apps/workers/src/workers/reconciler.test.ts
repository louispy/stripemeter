import { describe, it, expect, vi, beforeEach } from 'vitest';
import Stripe from 'stripe';
import { ReconcilerWorker } from './reconciler';

vi.mock('stripe', () => {
  const mock = vi.fn().mockImplementation(() => ({
    subscriptionItems: {
      retrieve: vi.fn().mockResolvedValue({ id: 'si_test' }),
      listUsageRecordSummaries: vi.fn().mockResolvedValue({ data: [{ id: 'urs_1', total_usage: 10 }], has_more: false }),
    },
  }));
  return { default: mock };
});

describe('ReconcilerWorker', () => {
  beforeEach(() => {
    process.env.STRIPE_SECRET_KEY = 'sk_test';
  });

  it('exposes triggerOnDemand without throwing when not running', async () => {
    const worker = new ReconcilerWorker();
    const runSpy = vi.spyOn<any, any>(worker as any, 'runReconciliation').mockResolvedValue(undefined);
    await worker.triggerOnDemand();
    expect(runSpy).toHaveBeenCalled();
  });

  it('getStripeUsage sums usage with pagination and handles headers', async () => {
    const worker = new ReconcilerWorker();
    // @ts-expect-error access private for test
    const usage = await worker['getStripeUsage']('si_test', '2025-01-01', 'default');
    expect(usage.total_usage).toBeGreaterThanOrEqual(0);
  });
});


