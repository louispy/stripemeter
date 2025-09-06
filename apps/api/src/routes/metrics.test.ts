import { describe, it, expect } from 'vitest';
import { buildServer } from '../../src/server';

describe('GET /metrics', () => {
  it('should expose prometheus metrics', async () => {
    const server = await buildServer();
    const res = await server.inject({ method: 'GET', url: '/metrics' });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('text/plain');
    expect(res.body).toContain('# HELP');
    expect(res.body).toContain('# TYPE');
  });
});


