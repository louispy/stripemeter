/**
 * Tests for idempotency utilities
 */
import { describe, it, expect } from 'vitest';
import { generateIdempotencyKey, generateStripeIdempotencyKey, isValidIdempotencyKey } from './idempotency';
describe('Idempotency Utilities', () => {
    describe('generateIdempotencyKey', () => {
        it('should generate a deterministic key for the same inputs', () => {
            const params = {
                tenantId: '123e4567-e89b-12d3-a456-426614174000',
                metric: 'api_calls',
                customerRef: 'cus_ABC123',
                resourceId: 'resource_1',
                ts: '2025-01-16T14:30:00.000Z',
                nonce: 'test-nonce',
            };
            const key1 = generateIdempotencyKey(params);
            const key2 = generateIdempotencyKey(params);
            expect(key1).toBe(key2);
            expect(key1).toMatch(/^evt_[a-f0-9]{16}$/);
        });
        it('should generate different keys for different timestamps', () => {
            const params1 = {
                tenantId: '123e4567-e89b-12d3-a456-426614174000',
                metric: 'api_calls',
                customerRef: 'cus_ABC123',
                ts: '2025-01-16T14:30:00.000Z',
            };
            const params2 = {
                ...params1,
                ts: '2025-01-16T14:31:00.000Z',
            };
            const key1 = generateIdempotencyKey(params1);
            const key2 = generateIdempotencyKey(params2);
            expect(key1).not.toBe(key2);
        });
        it('should handle missing resourceId', () => {
            const params = {
                tenantId: '123e4567-e89b-12d3-a456-426614174000',
                metric: 'api_calls',
                customerRef: 'cus_ABC123',
                ts: '2025-01-16T14:30:00.000Z',
            };
            const key = generateIdempotencyKey(params);
            expect(key).toMatch(/^evt_[a-f0-9]{16}$/);
        });
    });
    describe('generateStripeIdempotencyKey', () => {
        it('should generate a key with the correct format', () => {
            const params = {
                tenantId: '123e4567-e89b-12d3-a456-426614174000',
                subscriptionItemId: 'si_ABC123',
                periodStart: '2025-01-01',
                quantity: 100.5,
                timestamp: 1705416600000,
            };
            const key = generateStripeIdempotencyKey(params);
            expect(key).toBe('push:123e4567-e89b-12d3-a456-426614174000:si_ABC123:2025-01-01:100.500000:1705416600000');
        });
        it('should use current timestamp if not provided', () => {
            const params = {
                tenantId: '123e4567-e89b-12d3-a456-426614174000',
                subscriptionItemId: 'si_ABC123',
                periodStart: '2025-01-01',
                quantity: 100,
            };
            const key = generateStripeIdempotencyKey(params);
            expect(key).toMatch(/^push:.*:\d+$/);
        });
    });
    describe('isValidIdempotencyKey', () => {
        it('should validate event idempotency keys', () => {
            expect(isValidIdempotencyKey('evt_1234567890abcdef')).toBe(true);
            expect(isValidIdempotencyKey('evt_fedcba0987654321')).toBe(true);
        });
        it('should validate Stripe idempotency keys', () => {
            const key = 'push:123e4567-e89b-12d3-a456-426614174000:si_ABC123:2025-01-01:100.500000:1705416600000';
            expect(isValidIdempotencyKey(key)).toBe(true);
        });
        it('should reject invalid keys', () => {
            expect(isValidIdempotencyKey('invalid_key')).toBe(false);
            expect(isValidIdempotencyKey('evt_')).toBe(false);
            expect(isValidIdempotencyKey('evt_12345')).toBe(false);
            expect(isValidIdempotencyKey('push:invalid')).toBe(false);
        });
    });
});
//# sourceMappingURL=idempotency.test.js.map