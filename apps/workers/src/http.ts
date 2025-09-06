/**
 * Minimal HTTP server for workers to expose /health and /metrics
 */

import http from 'http';
import { renderMetrics } from './utils/metrics';

export function startWorkerHttpServer(port: number = Number(process.env.WORKER_HTTP_PORT || 3100)) {
  const server = http.createServer(async (req, res) => {
    try {
      if (!req.url) {
        res.statusCode = 404;
        res.end('Not Found');
        return;
      }

      if (req.method === 'GET' && req.url === '/health/live') {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ status: 'alive' }));
        return;
      }

      if (req.method === 'GET' && req.url === '/health/ready') {
        // Keep it simple for early release: always ready if process is up
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ status: 'healthy' }));
        return;
      }

      if (req.method === 'GET' && req.url === '/metrics') {
        const body = await renderMetrics();
        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
        res.end(body);
        return;
      }

      res.statusCode = 404;
      res.end('Not Found');
    } catch (_err) {
      res.statusCode = 500;
      res.end('Internal Server Error');
    }
  });

  server.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`Workers HTTP server listening on :${port}`);
  });

  return server;
}


