import { describe, it, expect, vi } from 'vitest';

vi.mock('@stripemeter/database', () => ({
  checkDatabaseHealth: vi.fn(async () => true),
  checkRedisHealth: vi.fn(async () => true),
}));

import { buildServer } from '../../src/server';

describe('health endpoints', () => {
  it('GET /health/live returns alive', async () => {
    const server = await buildServer();
    const res = await server.inject({ method: 'GET', url: '/health/live' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ status: 'alive' });
  });

  it('GET /health/ready returns healthy or degraded', async () => {
    const server = await buildServer();
    const res = await server.inject({ method: 'GET', url: '/health/ready' });
    expect([200, 503]).toContain(res.statusCode);
    const body = res.json();
    expect(['healthy', 'degraded', 'unhealthy']).toContain(body.status);
  });
});


