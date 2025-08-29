/**
 * Idempotency key generation utilities
 */
/**
 * Generate a deterministic idempotency key for usage events
 */
export declare function generateIdempotencyKey(params: {
    tenantId: string;
    metric: string;
    customerRef: string;
    resourceId?: string;
    ts: string;
    nonce?: string;
}): string;
/**
 * Generate idempotency key for Stripe API requests
 */
export declare function generateStripeIdempotencyKey(params: {
    tenantId: string;
    subscriptionItemId: string;
    periodStart: string;
    quantity: number;
    timestamp?: number;
}): string;
/**
 * Validate idempotency key format
 */
export declare function isValidIdempotencyKey(key: string): boolean;
//# sourceMappingURL=idempotency.d.ts.map