/**
 * Metrics route exposing Prometheus metrics at /metrics
 */

import { FastifyPluginAsync } from 'fastify';
import { renderMetrics } from '../utils/metrics';

export const metricsRoutes: FastifyPluginAsync = async (server) => {
  server.get('/', {
    schema: {
      description: 'Prometheus metrics',
      tags: ['health'],
      response: {
        200: { type: 'string' },
      },
    },
  }, async (_request, reply) => {
    const body = await renderMetrics();
    reply
      .header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
      .send(body);
  });
};


