/**
 * Backfill API tests
 */

import { vi, test, expect, describe, beforeEach, afterEach } from 'vitest';

// Bypass API auth for tests and mock DB to avoid external connections
process.env.BYPASS_AUTH = '1';
vi.mock('@stripemeter/database', () => {
  const operations: any[] = [];
  return {
    db: undefined,
    events: undefined,
    BackfillRepository: class {
      async create(op: any) {
        const id = `00000000-0000-0000-0000-${(operations.length + 1)
          .toString()
          .padStart(12, '0')}`;
        const created = {
          id,
          totalEvents: 0,
          processedEvents: 0,
          failedEvents: 0,
          duplicateEvents: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          ...op,
        };
        operations.push(created);
        return created;
      }
      async getById(id: string) {
        return operations.find((o) => o.id === id) || null;
      }
      async list() {
        return operations;
      }
      async update() { return null; }
      async updateStatus() { return null; }
    },
    redis: undefined,
  };
});

import { buildServer } from '../server';
import type { FastifyInstance } from 'fastify';

describe('Backfill API', () => {
  let server: FastifyInstance;

  beforeEach(async () => {
    server = await buildServer();
    await server.ready();
  });

  afterEach(async () => {
    await server.close();
  });

  describe('POST /v1/events/backfill', () => {
    test('should accept valid JSON backfill request', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/v1/events/backfill',
        headers: {
          'x-api-key': 'test-key',
        },
        payload: {
          tenantId: 'test-tenant',
          metric: 'api_calls',
          periodStart: '2024-01-01',
          periodEnd: '2024-01-31',
          reason: 'Historical data import',
          events: [
            {
              tenantId: 'test-tenant',
              metric: 'api_calls',
              customerRef: 'customer-1',
              quantity: 100,
              ts: '2024-01-15T10:00:00Z',
              source: 'import',
            },
            {
              tenantId: 'test-tenant',
              metric: 'api_calls',
              customerRef: 'customer-2',
              quantity: 200,
              ts: '2024-01-16T10:00:00Z',
              source: 'import',
            },
          ],
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('operationId');
      expect(body).toHaveProperty('status', 'pending');
      expect(body).toHaveProperty('message');
    });

    test('should accept valid CSV backfill request', async () => {
      const csvData = `tenantId,metric,customerRef,quantity,ts,source
test-tenant,api_calls,customer-1,100,2024-01-15T10:00:00Z,import
test-tenant,api_calls,customer-2,200,2024-01-16T10:00:00Z,import`;

      const response = await server.inject({
        method: 'POST',
        url: '/v1/events/backfill',
        headers: {
          'x-api-key': 'test-key',
        },
        payload: {
          tenantId: 'test-tenant',
          metric: 'api_calls',
          periodStart: '2024-01-01',
          periodEnd: '2024-01-31',
          reason: 'Historical data import',
          csvData,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('operationId');
      expect(body).toHaveProperty('status', 'pending');
    });

    test('should reject request without events or csvData', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/v1/events/backfill',
        headers: {
          'x-api-key': 'test-key',
        },
        payload: {
          tenantId: 'test-tenant',
          metric: 'api_calls',
          periodStart: '2024-01-01',
          reason: 'Historical data import',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('error');
    });

    test('should reject request with invalid date format', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/v1/events/backfill',
        headers: {
          'x-api-key': 'test-key',
        },
        payload: {
          tenantId: 'test-tenant',
          metric: 'api_calls',
          periodStart: 'invalid-date',
          reason: 'Historical data import',
          events: [],
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('error');
    });

    test('should reject request with invalid events', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/v1/events/backfill',
        headers: {
          'x-api-key': 'test-key',
        },
        payload: {
          tenantId: 'test-tenant',
          metric: 'api_calls',
          periodStart: '2024-01-01',
          reason: 'Historical data import',
          events: [
            {
              // Missing required fields
              tenantId: 'test-tenant',
              quantity: 'invalid-number', // Should be number
            },
          ],
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('error');
    });
  });

  describe('GET /v1/events/backfill/:operationId', () => {
    test('should return 404 for non-existent operation', async () => {
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

    test('should return operation details for valid operation', async () => {
      // First create a backfill operation
      const createResponse = await server.inject({
        method: 'POST',
        url: '/v1/events/backfill',
        headers: {
          'x-api-key': 'test-key',
        },
        payload: {
          tenantId: 'test-tenant',
          metric: 'api_calls',
          periodStart: '2024-01-01',
          reason: 'Test operation',
          events: [],
        },
      });

      expect(createResponse.statusCode).toBe(200);
      const createBody = JSON.parse(createResponse.body);
      const operationId = createBody.operationId;

      // Then retrieve it
      const response = await server.inject({
        method: 'GET',
        url: `/v1/events/backfill/${operationId}`,
        headers: {
          'x-api-key': 'test-key',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('id', operationId);
      expect(body).toHaveProperty('tenantId', 'test-tenant');
      expect(body).toHaveProperty('metric', 'api_calls');
      expect(body).toHaveProperty('status', 'pending');
    });
  });

  describe('GET /v1/events/backfill', () => {
    test('should return empty list when no operations exist', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/v1/events/backfill',
        headers: {
          'x-api-key': 'test-key',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('operations', []);
      expect(body).toHaveProperty('total', 0);
    });

    test('should filter operations by tenantId', async () => {
      // Create operations for different tenants
      await server.inject({
        method: 'POST',
        url: '/v1/events/backfill',
        headers: {
          'x-api-key': 'test-key',
        },
        payload: {
          tenantId: 'tenant-1',
          metric: 'api_calls',
          periodStart: '2024-01-01',
          reason: 'Test operation 1',
          events: [],
        },
      });

      await server.inject({
        method: 'POST',
        url: '/v1/events/backfill',
        headers: {
          'x-api-key': 'test-key',
        },
        payload: {
          tenantId: 'tenant-2',
          metric: 'api_calls',
          periodStart: '2024-01-01',
          reason: 'Test operation 2',
          events: [],
        },
      });

      // Filter by tenant-1
      const response = await server.inject({
        method: 'GET',
        url: '/v1/events/backfill?tenantId=tenant-1',
        headers: {
          'x-api-key': 'test-key',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.operations).toHaveLength(1);
      expect(body.operations[0]).toHaveProperty('tenantId', 'tenant-1');
    });

    test('should filter operations by status', async () => {
      // Create a pending operation
      await server.inject({
        method: 'POST',
        url: '/v1/events/backfill',
        headers: {
          'x-api-key': 'test-key',
        },
        payload: {
          tenantId: 'test-tenant',
          metric: 'api_calls',
          periodStart: '2024-01-01',
          reason: 'Test operation',
          events: [],
        },
      });

      // Filter by pending status
      const response = await server.inject({
        method: 'GET',
        url: '/v1/events/backfill?status=pending',
        headers: {
          'x-api-key': 'test-key',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.operations.length).toBeGreaterThan(0);
      body.operations.forEach((op: any) => {
        expect(op).toHaveProperty('status', 'pending');
      });
    });
  });
});
