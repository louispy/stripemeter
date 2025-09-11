/**
 * Integration tests for events API
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
// Bypass API auth for tests
process.env.BYPASS_AUTH = '1';
// Mock database layer to avoid external connections
vi.mock('@stripemeter/database', () => {
  const store: any[] = [];
  return {
    EventsRepository: class {
      async upsertBatch(batch: any[]) {
        const inserted: any[] = [];
        const duplicates: string[] = [];
        for (const e of batch) {
          const exists = store.find(x => x.idempotencyKey === e.idempotencyKey);
          if (exists) {
            duplicates.push(e.idempotencyKey);
          } else {
            store.push(e);
            inserted.push(e);
          }
        }
        return { inserted, duplicates };
      }
      async getEventsByParam(param: any) {
        const start = Number(param?.offset ?? 0);
        const end = start + Number(param?.limit ?? store.length);
        return store.slice(start, end);
      }
      async getEventsCountByParam() { return store.length; }
    },
    redis: undefined,
    db: undefined,
  };
});
import { FastifyInstance } from 'fastify';
import { buildServer } from '../server';
import { generateIdempotencyKey } from '@stripemeter/core';

describe('Events API', () => {
  let server: FastifyInstance;

  beforeAll(async () => {
    server = await buildServer();
    await server.ready();
  });

  afterAll(async () => {
    await server.close();
  });

  describe('POST /v1/events/ingest', () => {
    it('should accept valid events', async () => {
      const events = [
        {
          tenantId: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
          metric: 'api_calls',
          customerRef: 'cus_TEST001',
          quantity: 100,
          ts: new Date().toISOString(),
          meta: { endpoint: '/v1/test' },
        },
      ];

      const response = await server.inject({
        method: 'POST',
        url: '/v1/events/ingest',
        payload: { events },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('accepted');
      expect(body).toHaveProperty('duplicates');
      expect(body.accepted + body.duplicates).toBe(events.length);
      expect(typeof body.requestId).toBe('string');
      expect(Array.isArray(body.results)).toBe(true);
      expect(body.results[0]).toHaveProperty('idempotencyKey');
      expect(['accepted','duplicate','error']).toContain(body.results[0].status);
    });

    it('should accept events with non-UUID tenantId', async () => {
      const events = [
        {
          tenantId: 'demo-tenant',
          metric: 'api_calls',
          customerRef: 'cus_TEST_NONUUID',
          quantity: 1,
          ts: new Date().toISOString(),
        },
      ];

      const response = await server.inject({
        method: 'POST',
        url: '/v1/events/ingest',
        payload: { events },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.accepted + body.duplicates).toBe(events.length);
    });

    it('should handle duplicate events with idempotency', async () => {
      const idempotencyKey = 'evt_test_duplicate_001';
      const event = {
        tenantId: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
        metric: 'api_calls',
        customerRef: 'cus_TEST001',
        quantity: 50,
        ts: new Date().toISOString(),
        idempotencyKey,
      };

      // First request
      const response1 = await server.inject({
        method: 'POST',
        url: '/v1/events/ingest',
        payload: { events: [event] },
      });

      expect(response1.statusCode).toBe(200);
      const body1 = JSON.parse(response1.body);
      expect(body1.accepted).toBeGreaterThan(0);

      // Duplicate request
      const response2 = await server.inject({
        method: 'POST',
        url: '/v1/events/ingest',
        payload: { events: [event] },
      });

      expect(response2.statusCode).toBe(200);
      const body2 = JSON.parse(response2.body);
      expect(body2.duplicates).toBeGreaterThan(0);
      const statuses = new Set(body2.results.map((r: any) => r.status));
      expect(statuses.has('duplicate')).toBe(true);
    });

    it('should reject invalid events', async () => {
      const invalidEvents = [
        {
          // Missing required fields
          metric: 'api_calls',
          quantity: 100,
        },
      ];

      const response = await server.inject({
        method: 'POST',
        url: '/v1/events/ingest',
        payload: { events: invalidEvents },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.errors).toBeDefined();
      expect(body.errors.length).toBeGreaterThan(0);
    });

    it('should reject events too far in the future', async () => {
      const futureDate = new Date();
      futureDate.setHours(futureDate.getHours() + 2); // 2 hours in future

      const events = [
        {
          tenantId: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
          metric: 'api_calls',
          customerRef: 'cus_TEST001',
          quantity: 100,
          ts: futureDate.toISOString(),
        },
      ];

      const response = await server.inject({
        method: 'POST',
        url: '/v1/events/ingest',
        payload: { events },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.errors).toBeDefined();
      expect(body.errors[0].error).toContain('future');
      const hasError = body.results.some((r: any) => r.status === 'error');
      expect(hasError).toBe(true);
    });

    it('should handle batch of mixed valid and invalid events', async () => {
      const events = [
        {
          tenantId: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
          metric: 'api_calls',
          customerRef: 'cus_TEST001',
          quantity: 100,
          ts: new Date().toISOString(),
        },
        {
          // Invalid - missing tenantId
          metric: 'storage_gb',
          customerRef: 'cus_TEST001',
          quantity: 2.5,
          ts: new Date().toISOString(),
        },
      ];

      const response = await server.inject({
        method: 'POST',
        url: '/v1/events/ingest',
        payload: { events },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should apply Idempotency-Key header when body lacks idempotencyKey', async () => {
      const headerKey = 'evt_header_only_001';
      const event = {
        tenantId: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
        metric: 'api_calls',
        customerRef: 'cus_TEST002',
        quantity: 10,
        ts: new Date().toISOString(),
      };

      const first = await server.inject({
        method: 'POST',
        url: '/v1/events/ingest',
        headers: { 'idempotency-key': headerKey },
        payload: { events: [event] },
      });

      expect(first.statusCode).toBe(200);
      const body1 = JSON.parse(first.body);
      expect(body1.accepted).toBe(1);

      const second = await server.inject({
        method: 'POST',
        url: '/v1/events/ingest',
        headers: { 'idempotency-key': headerKey },
        payload: { events: [event] },
      });

      expect(second.statusCode).toBe(200);
      const body2 = JSON.parse(second.body);
      expect(body2.duplicates).toBe(1);
    });

    it('should give precedence to body idempotencyKey over header', async () => {
      const headerKey = 'evt_header_precedence_001';
      const bodyKey = 'evt_body_precedence_001';
      const event = {
        tenantId: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
        metric: 'api_calls',
        customerRef: 'cus_TEST003',
        quantity: 7,
        ts: new Date().toISOString(),
        idempotencyKey: bodyKey,
      };

      const r1 = await server.inject({
        method: 'POST',
        url: '/v1/events/ingest',
        headers: { 'idempotency-key': headerKey },
        payload: { events: [event] },
      });
      expect(r1.statusCode).toBe(200);
      const b1 = JSON.parse(r1.body);
      expect(b1.accepted).toBe(1);

      // Re-send with same body key but different header to ensure body is used
      const r2 = await server.inject({
        method: 'POST',
        url: '/v1/events/ingest',
        headers: { 'idempotency-key': headerKey + '_DIFF' },
        payload: { events: [event] },
      });
      expect(r2.statusCode).toBe(200);
      const b2 = JSON.parse(r2.body);
      expect(b2.duplicates).toBe(1);
    });

    it('should include requestId and per-event results with statuses', async () => {
      const events = [
        {
          tenantId: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
          metric: 'api_calls',
          customerRef: 'cus_TEST004',
          quantity: 1,
          ts: new Date().toISOString(),
        },
      ];
      const res = await server.inject({ method: 'POST', url: '/v1/events/ingest', payload: { events } });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(typeof body.requestId).toBe('string');
      expect(Array.isArray(body.results)).toBe(true);
      expect(body.results.length).toBe(1);
      expect(body.results[0].status).toBeDefined();
    });
  });

  describe('GET /v1/events', () => {
  it('should return events list for valid tenantId', async () => {
    const tenantId = '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d';

    // Insert a test event first (if needed for isolation)
    await server.inject({
      method: 'POST',
      url: '/v1/events/ingest',
      payload: {
        events: [{
          tenantId,
          metric: 'api_calls',
          customerRef: 'cus_TEST001',
          quantity: 100,
          ts: new Date().toISOString(),
        }],
      },
    });

    const response = await server.inject({
      method: 'GET',
      url: `/v1/events?tenantId=${tenantId}`,
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body).toHaveProperty('total');
    expect(body).toHaveProperty('events');
    expect(Array.isArray(body.events)).toBe(true);
    expect(body.events.length).toBeGreaterThanOrEqual(1);
    expect(body.events[0]).toHaveProperty('tenantId', tenantId);
  });

  it('should return 400 for missing tenantId', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/v1/events',
    });

    expect(response.statusCode).toBe(400);
  });

  it('should support pagination and sorting', async () => {
    const tenantId = '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d';

    const response = await server.inject({
      method: 'GET',
      url: `/v1/events?tenantId=${tenantId}&limit=1&offset=0&sort=ts&sortDir=desc`,
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body).toHaveProperty('total');
    expect(body).toHaveProperty('events');
    expect(body.events.length).toBeLessThanOrEqual(1);
  });
});
});
