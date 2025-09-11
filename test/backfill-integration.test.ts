/**
 * Integration tests for Backfill & Event Replay System
 */

import { test, expect, describe, beforeEach, afterEach } from 'vitest';
import { buildServer } from '../apps/api/src/server';
import { BackfillWorker } from '../apps/workers/src/workers/backfill';
import { db, events, backfillOperations, counters } from '@stripemeter/database';
import { eq, and } from 'drizzle-orm';

describe('Backfill System Integration Tests', () => {
  let server: any;
  let backfillWorker: BackfillWorker;

  beforeEach(async () => {
    // Clean up test data
    await db.delete(events);
    await db.delete(backfillOperations);
    await db.delete(counters);

    server = await buildServer();
    await server.ready();
    
    backfillWorker = new BackfillWorker();
  });

  afterEach(async () => {
    await server.close();
    await backfillWorker.stop();
    
    // Clean up test data
    await db.delete(events);
    await db.delete(backfillOperations);
    await db.delete(counters);
  });

  describe('End-to-End Backfill Flow', () => {
    test('should process JSON backfill request successfully', async () => {
      // 1. Submit backfill request
      const backfillData = {
        tenantId: 'test-tenant-123',
        metric: 'api_calls',
        periodStart: '2024-01-01',
        periodEnd: '2024-01-31',
        reason: 'Historical data import for testing',
        events: [
          {
            tenantId: 'test-tenant-123',
            metric: 'api_calls',
            customerRef: 'customer-1',
            quantity: 100,
            ts: '2024-01-15T10:00:00Z',
            source: 'import',
          },
          {
            tenantId: 'test-tenant-123',
            metric: 'api_calls',
            customerRef: 'customer-2',
            quantity: 200,
            ts: '2024-01-16T10:00:00Z',
            source: 'import',
          },
        ],
      };

      const response = await server.inject({
        method: 'POST',
        url: '/v1/events/backfill',
        headers: {
          'x-api-key': 'test-key',
        },
        payload: backfillData,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('operationId');
      expect(body).toHaveProperty('status', 'pending');

      const operationId = body.operationId;

      // 2. Verify backfill operation was created
      const operation = await db
        .select()
        .from(backfillOperations)
        .where(eq(backfillOperations.id, operationId))
        .limit(1);

      expect(operation).toHaveLength(1);
      expect(operation[0]).toHaveProperty('tenantId', 'test-tenant-123');
      expect(operation[0]).toHaveProperty('metric', 'api_calls');
      expect(operation[0]).toHaveProperty('status', 'pending');
      expect(operation[0]).toHaveProperty('sourceType', 'json');

      // 3. Check operation status via API
      const statusResponse = await server.inject({
        method: 'GET',
        url: `/v1/events/backfill/${operationId}`,
        headers: {
          'x-api-key': 'test-key',
        },
      });

      expect(statusResponse.statusCode).toBe(200);
      const statusBody = JSON.parse(statusResponse.body);
      expect(statusBody).toHaveProperty('id', operationId);
      expect(statusBody).toHaveProperty('status', 'pending');
    });

    test('should process CSV backfill request successfully', async () => {
      const csvData = `tenantId,metric,customerRef,quantity,ts,source
test-tenant-456,api_calls,customer-1,150,2024-01-15T10:00:00Z,import
test-tenant-456,api_calls,customer-2,250,2024-01-16T10:00:00Z,import`;

      const backfillData = {
        tenantId: 'test-tenant-456',
        metric: 'api_calls',
        periodStart: '2024-01-01',
        periodEnd: '2024-01-31',
        reason: 'CSV historical data import',
        csvData,
      };

      const response = await server.inject({
        method: 'POST',
        url: '/v1/events/backfill',
        headers: {
          'x-api-key': 'test-key',
        },
        payload: backfillData,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('operationId');
      expect(body).toHaveProperty('status', 'pending');

      const operationId = body.operationId;

      // Verify operation was created with CSV source type
      const operation = await db
        .select()
        .from(backfillOperations)
        .where(eq(backfillOperations.id, operationId))
        .limit(1);

      expect(operation).toHaveLength(1);
      expect(operation[0]).toHaveProperty('sourceType', 'csv');
    });

    test('should validate backfill request data', async () => {
      // Test missing required fields
      const invalidRequest = {
        tenantId: 'test-tenant',
        // Missing metric
        periodStart: '2024-01-01',
        reason: 'Test',
        events: [],
      };

      const response = await server.inject({
        method: 'POST',
        url: '/v1/events/backfill',
        headers: {
          'x-api-key': 'test-key',
        },
        payload: invalidRequest,
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('error');
    });

    test('should handle large payload size limits', async () => {
      // Create a large events array
      const largeEvents = Array.from({ length: 10000 }, (_, i) => ({
        tenantId: 'test-tenant',
        metric: 'api_calls',
        customerRef: `customer-${i}`,
        quantity: 100,
        ts: '2024-01-15T10:00:00Z',
        source: 'import',
      }));

      const backfillData = {
        tenantId: 'test-tenant',
        metric: 'api_calls',
        periodStart: '2024-01-01',
        reason: 'Large data test',
        events: largeEvents,
      };

      const response = await server.inject({
        method: 'POST',
        url: '/v1/events/backfill',
        headers: {
          'x-api-key': 'test-key',
        },
        payload: backfillData,
      });

      // Should either succeed or return 413 (Payload Too Large)
      expect([200, 413]).toContain(response.statusCode);
    });
  });

  describe('Backfill Operation Management', () => {
    test('should list backfill operations with filters', async () => {
      // Create multiple operations
      const operations = [
        {
          tenantId: 'tenant-1',
          metric: 'api_calls',
          periodStart: '2024-01-01',
          periodEnd: '2024-01-31',
          reason: 'Operation 1',
          events: [],
        },
        {
          tenantId: 'tenant-2',
          metric: 'storage',
          periodStart: '2024-02-01',
          periodEnd: '2024-02-28',
          reason: 'Operation 2',
          events: [],
        },
      ];

      const operationIds = [];
      for (const op of operations) {
        const response = await server.inject({
          method: 'POST',
          url: '/v1/events/backfill',
          headers: {
            'x-api-key': 'test-key',
          },
          payload: op,
        });
        
        const body = JSON.parse(response.body);
        operationIds.push(body.operationId);
      }

      // List all operations
      const listResponse = await server.inject({
        method: 'GET',
        url: '/v1/events/backfill',
        headers: {
          'x-api-key': 'test-key',
        },
      });

      expect(listResponse.statusCode).toBe(200);
      const listBody = JSON.parse(listResponse.body);
      expect(listBody.operations).toHaveLength(2);

      // Filter by tenant
      const filteredResponse = await server.inject({
        method: 'GET',
        url: '/v1/events/backfill?tenantId=tenant-1',
        headers: {
          'x-api-key': 'test-key',
        },
      });

      expect(filteredResponse.statusCode).toBe(200);
      const filteredBody = JSON.parse(filteredResponse.body);
      expect(filteredBody.operations).toHaveLength(1);
      expect(filteredBody.operations[0]).toHaveProperty('tenantId', 'tenant-1');
    });

    test('should handle non-existent operation lookup', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/v1/events/backfill/00000000-0000-0000-0000-000000000000',
        headers: {
          'x-api-key': 'test-key',
        },
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('error', 'Not Found');
    });
  });

  describe('Data Validation and Error Handling', () => {
    test('should reject invalid event data in backfill', async () => {
      const backfillData = {
        tenantId: 'test-tenant',
        metric: 'api_calls',
        periodStart: '2024-01-01',
        reason: 'Test with invalid events',
        events: [
          {
            tenantId: 'test-tenant',
            metric: 'api_calls',
            customerRef: 'customer-1',
            quantity: 'invalid-number', // Should be number
            ts: 'invalid-date', // Should be valid ISO date
            source: 'import',
          },
        ],
      };

      const response = await server.inject({
        method: 'POST',
        url: '/v1/events/backfill',
        headers: {
          'x-api-key': 'test-key',
        },
        payload: backfillData,
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('error');
    });

    test('should handle malformed CSV data', async () => {
      const malformedCsv = `tenantId,metric,customerRef,quantity,ts,source
test-tenant,api_calls,customer-1,invalid-number,invalid-date,import`;

      const backfillData = {
        tenantId: 'test-tenant',
        metric: 'api_calls',
        periodStart: '2024-01-01',
        reason: 'Test with malformed CSV',
        csvData: malformedCsv,
      };

      const response = await server.inject({
        method: 'POST',
        url: '/v1/events/backfill',
        headers: {
          'x-api-key': 'test-key',
        },
        payload: backfillData,
      });

      // Should accept the request but the worker will handle validation
      expect(response.statusCode).toBe(200);
    });
  });

  describe('Watermark Safety', () => {
    test('should respect period boundaries in backfill', async () => {
      const backfillData = {
        tenantId: 'test-tenant',
        metric: 'api_calls',
        periodStart: '2024-01-01',
        periodEnd: '2024-01-31',
        reason: 'Test period boundaries',
        events: [
          {
            tenantId: 'test-tenant',
            metric: 'api_calls',
            customerRef: 'customer-1',
            quantity: 100,
            ts: '2024-01-15T10:00:00Z', // Within period
            source: 'import',
          },
          {
            tenantId: 'test-tenant',
            metric: 'api_calls',
            customerRef: 'customer-2',
            quantity: 200,
            ts: '2024-02-15T10:00:00Z', // Outside period
            source: 'import',
          },
        ],
      };

      const response = await server.inject({
        method: 'POST',
        url: '/v1/events/backfill',
        headers: {
          'x-api-key': 'test-key',
        },
        payload: backfillData,
      });

      expect(response.statusCode).toBe(200);
      
      // The worker should filter out events outside the period
      // This would be verified by checking the final event count
    });
  });
});
