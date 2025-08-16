/**
 * Idempotency key generation utilities
 */

import { createHash } from 'crypto';

/**
 * Generate a deterministic idempotency key for usage events
 */
export function generateIdempotencyKey(params: {
  tenantId: string;
  metric: string;
  customerRef: string;
  resourceId?: string;
  ts: string;
  nonce?: string;
}): string {
  const { tenantId, metric, customerRef, resourceId, ts, nonce } = params;
  
  // Extract period bucket (minute precision)
  const date = new Date(ts);
  const periodBucket = date.toISOString().slice(0, 16); // YYYY-MM-DDTHH:mm
  
  // Build key components
  const components = [
    tenantId,
    metric,
    customerRef,
    resourceId || 'default',
    periodBucket,
    nonce || Date.now().toString(),
  ];
  
  // Generate hash
  const hash = createHash('sha256')
    .update(components.join('|'))
    .digest('hex')
    .slice(0, 16);
  
  return `evt_${hash}`;
}

/**
 * Generate idempotency key for Stripe API requests
 */
export function generateStripeIdempotencyKey(params: {
  tenantId: string;
  subscriptionItemId: string;
  periodStart: string;
  quantity: number;
  timestamp?: number;
}): string {
  const { tenantId, subscriptionItemId, periodStart, quantity, timestamp = Date.now() } = params;
  
  const components = [
    'push',
    tenantId,
    subscriptionItemId,
    periodStart,
    quantity.toFixed(6),
    timestamp.toString(),
  ];
  
  return components.join(':');
}

/**
 * Validate idempotency key format
 */
export function isValidIdempotencyKey(key: string): boolean {
  // Check if it matches our expected formats
  const eventKeyPattern = /^evt_[a-f0-9]{16}$/;
  const stripeKeyPattern = /^push:[a-f0-9-]+:si_[a-zA-Z0-9]+:\d{4}-\d{2}-\d{2}:\d+\.\d{6}:\d+$/;
  
  return eventKeyPattern.test(key) || stripeKeyPattern.test(key);
}
