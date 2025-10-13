import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildServer } from '../../apps/api/src/server';

describe('CORS strict allowlist', () => {
  let server: Awaited<ReturnType<typeof buildServer>>;

  beforeAll(async () => {
    process.env.BYPASS_AUTH = '1';
    delete process.env.API_CORS_ORIGIN; // ensure default deny
    server = await buildServer();
  });

  afterAll(async () => {
    await server.close();
  });

  it('denies unknown origins by default (no CORS headers)', async () => {
    const res = await server.inject({ method: 'GET', url: '/health' });
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });
});


