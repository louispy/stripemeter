/**
 * Integration tests for events API
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
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
