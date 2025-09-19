import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StripeWriterWorker } from './stripe-writer';

describe('StripeWriterWorker shadow routing', () => {
  beforeEach(() => {
    process.env.STRIPE_SECRET_KEY = 'sk_live_dummy';
    process.env.STRIPE_TEST_SECRET_KEY = 'sk_test_dummy';
  });

  it('constructs both live and test clients when STRIPE_TEST_SECRET_KEY set', () => {
    const worker = new StripeWriterWorker() as any;
    expect(worker.stripeLive).toBeTruthy();
    expect(worker.stripeTest).toBeTruthy();
  });
});


