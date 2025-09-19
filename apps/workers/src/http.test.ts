import { describe, it, expect } from 'vitest';
import { startWorkerHttpServer } from './http';

function getPort(server: any): number {
  const addr = server.address();
  if (typeof addr === 'string' || !addr) return 0;
  return addr.port;
}

describe('workers http server', () => {
  it('exposes /health/live and /metrics', async () => {
    const server = startWorkerHttpServer(0);
    // Wait for server to start listening
    await new Promise((r) => setTimeout(r, 50));
    const port = getPort(server);

    const liveRes = await fetch(`http://127.0.0.1:${port}/health/live`);
    expect(liveRes.status).toBe(200);
    const liveJson = await liveRes.json();
    expect(liveJson).toMatchObject({ status: 'alive' });

    const metricsRes = await fetch(`http://127.0.0.1:${port}/metrics`);
    expect(metricsRes.status).toBe(200);
    const text = await metricsRes.text();
    expect(text).toContain('# HELP');
    expect(text).toContain('# TYPE');

    server.close();
  });

  it('triggers reconciler on POST /reconciler/run', async () => {
    let called = 0;
    const server = startWorkerHttpServer(0, {
      onReconcileRun: async () => {
        called += 1;
      },
    });
    await new Promise((r) => setTimeout(r, 50));
    const port = getPort(server);

    const res = await fetch(`http://127.0.0.1:${port}/reconciler/run`, {
      method: 'POST',
    });
    expect(res.status).toBe(202);
    const body = await res.json();
    expect(body).toMatchObject({ message: 'Reconciliation run triggered' });
    expect(called).toBe(1);

    server.close();
  });
});


