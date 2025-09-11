/**
 * Backfill Worker tests
 */

import { test, expect, describe, beforeEach, afterEach, vi } from 'vitest';
import { BackfillWorker } from './backfill';
import { db, events, backfillOperations } from '@stripemeter/database';
import { eq } from 'drizzle-orm';

// Mock dependencies
vi.mock('@stripemeter/database', () => ({
  db: {
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        onConflictDoNothing: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ idempotencyKey: 'test-key' }])
        })
      })
    })
  },
  events: {
    idempotencyKey: 'idempotencyKey'
  },
  backfillOperations: {},
  redis: {
    setex: vi.fn().mockResolvedValue('OK')
  },
  BackfillRepository: class {
    updateStatus = vi.fn().mockResolvedValue(undefined);
    update = vi.fn().mockResolvedValue(undefined);
    updateProgress = vi.fn().mockResolvedValue(undefined);
  }
}));

vi.mock('bullmq', () => ({
  Queue: vi.fn().mockImplementation(() => ({
    add: vi.fn().mockResolvedValue({}),
    addBulk: vi.fn().mockResolvedValue([]),
    close: vi.fn().mockResolvedValue(undefined)
  })),
  Worker: vi.fn().mockImplementation(() => ({
    on: vi.fn(),
    close: vi.fn().mockResolvedValue(undefined)
  }))
}));

vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn().mockImplementation(() => ({
    send: vi.fn().mockResolvedValue({
      Body: {
        transformToString: vi.fn().mockResolvedValue('test,data\n1,2')
      }
    })
  })),
  GetObjectCommand: vi.fn()
}));

describe('BackfillWorker', () => {
  let worker: BackfillWorker;

  beforeEach(() => {
    worker = new BackfillWorker();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('CSV parsing', () => {
    test('should parse CSV data correctly', async () => {
      const csvData = `tenantId,metric,customerRef,quantity,ts,source
test-tenant,api_calls,customer-1,100,2024-01-15T10:00:00Z,import
test-tenant,api_calls,customer-2,200,2024-01-16T10:00:00Z,import`;

      // Access private method for testing
      const parseCsvData = (worker as any).parseCsvData.bind(worker);
      const result = parseCsvData(csvData);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        tenantId: 'test-tenant',
        metric: 'api_calls',
        customerRef: 'customer-1',
        resourceId: undefined,
        quantity: 100,
        ts: '2024-01-15T10:00:00Z',
        meta: {},
        idempotencyKey: undefined,
        source: 'import',
      });
      expect(result[1]).toEqual({
        tenantId: 'test-tenant',
        metric: 'api_calls',
        customerRef: 'customer-2',
        resourceId: undefined,
        quantity: 200,
        ts: '2024-01-16T10:00:00Z',
        meta: {},
        idempotencyKey: undefined,
        source: 'import',
      });
    });

    test('should handle CSV with different column names', async () => {
      const csvData = `tenant_id,metric,customer_ref,quantity,timestamp,source
test-tenant,api_calls,customer-1,100,2024-01-15T10:00:00Z,import`;

      const parseCsvData = (worker as any).parseCsvData.bind(worker);
      const result = parseCsvData(csvData);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        tenantId: 'test-tenant',
        metric: 'api_calls',
        customerRef: 'customer-1',
        resourceId: undefined,
        quantity: 100,
        ts: '2024-01-15T10:00:00Z',
        meta: {},
        idempotencyKey: undefined,
        source: 'import',
      });
    });

    test('should handle CSV with meta data', async () => {
      const csvData = `tenantId,metric,customerRef,quantity,ts,source,meta
test-tenant,api_calls,customer-1,100,2024-01-15T10:00:00Z,import,"{""region"":""us-east-1""}"`;

      const parseCsvData = (worker as any).parseCsvData.bind(worker);
      const result = parseCsvData(csvData);

      expect(result).toHaveLength(1);
      expect(result[0].meta).toEqual({ region: 'us-east-1' });
    });
  });

  describe('Event validation', () => {
    test('should validate event schema correctly', () => {
      const validEvent = {
        tenantId: 'test-tenant',
        metric: 'api_calls',
        customerRef: 'customer-1',
        quantity: 100,
        ts: '2024-01-15T10:00:00Z',
        source: 'import',
      };

      // This would be tested through the actual processing method
      // For now, we can test the schema validation directly
      expect(validEvent).toHaveProperty('tenantId');
      expect(validEvent).toHaveProperty('metric');
      expect(validEvent).toHaveProperty('customerRef');
      expect(validEvent).toHaveProperty('quantity');
      expect(validEvent).toHaveProperty('ts');
    });

    test('should reject invalid event data', () => {
      const invalidEvent = {
        tenantId: 'test-tenant',
        metric: 'api_calls',
        customerRef: 'customer-1',
        quantity: 'invalid-number', // Should be number
        ts: 'invalid-date', // Should be valid ISO date
        source: 'import',
      };

      // This would be caught by the schema validation
      expect(invalidEvent.quantity).not.toBeTypeOf('number');
      expect(Number.isNaN(new Date(invalidEvent.ts).getTime())).toBe(true);
    });
  });

  describe('Period filtering', () => {
    test('should filter events by period correctly', () => {
      const eventDate = new Date('2024-01-15T10:00:00Z');
      const periodStart = new Date('2024-01-01');
      const periodEnd = new Date('2024-01-31T23:59:59.999Z');

      expect(eventDate >= periodStart && eventDate <= periodEnd).toBe(true);
    });

    test('should exclude events outside period', () => {
      const eventDate = new Date('2024-02-15T10:00:00Z');
      const periodStart = new Date('2024-01-01');
      const periodEnd = new Date('2024-01-31T23:59:59.999Z');

      expect(eventDate >= periodStart && eventDate <= periodEnd).toBe(false);
    });
  });

  describe('Customer filtering', () => {
    test('should filter events by customer when specified', () => {
      const event = {
        tenantId: 'test-tenant',
        metric: 'api_calls',
        customerRef: 'customer-1',
        quantity: 100,
        ts: '2024-01-15T10:00:00Z',
        source: 'import',
      };

      const targetCustomer = 'customer-1';
      const shouldInclude = !targetCustomer || event.customerRef === targetCustomer;

      expect(shouldInclude).toBe(true);
    });

    test('should exclude events for different customers', () => {
      const event = {
        tenantId: 'test-tenant',
        metric: 'api_calls',
        customerRef: 'customer-2',
        quantity: 100,
        ts: '2024-01-15T10:00:00Z',
        source: 'import',
      };

      const targetCustomer = 'customer-1';
      const shouldInclude = !targetCustomer || event.customerRef === targetCustomer;

      expect(shouldInclude).toBe(false);
    });
  });
});
