/**
 * Health check routes
 */

import { FastifyPluginAsync } from 'fastify';
import { checkDatabaseHealth, checkRedisHealth } from '@stripemeter/database';
import type { HealthResponse } from '@stripemeter/core';

export const healthRoutes: FastifyPluginAsync = async (server) => {
  /**
   * GET /health
   * Basic health check
   */
  server.get('/', {
    schema: {
      description: 'Basic health check',
      tags: ['health'],
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            timestamp: { type: 'string' },
          },
        },
      },
    },
  }, async (_request, reply) => {
    reply.send({
      status: 'ok',
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * GET /health/live
   * Liveness probe for Kubernetes
   */
  server.get('/live', {
    schema: {
      description: 'Liveness probe',
      tags: ['health'],
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string' },
          },
        },
      },
    },
  }, async (_request, reply) => {
    reply.send({ status: 'alive' });
  });

  /**
   * GET /health/ready
   * Readiness probe - checks all dependencies
   */
  server.get<{ Reply: HealthResponse }>('/ready', {
    schema: {
      description: 'Readiness probe with dependency checks',
      tags: ['health'],
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['healthy', 'degraded', 'unhealthy'] },
            version: { type: 'string' },
            checks: {
              type: 'object',
              properties: {
                database: { type: 'boolean' },
                redis: { type: 'boolean' },
                stripe: { type: 'boolean' },
                workers: { type: 'boolean' },
              },
            },
            metrics: {
              type: 'object',
              properties: {
                eventsPerSecond: { type: 'number' },
                writerLag: { type: 'number' },
                reconciliationDiff: { type: 'number' },
              },
            },
          },
        },
        503: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            checks: { type: 'object' },
          },
        },
      },
    },
  }, async (_request, reply) => {
    const checks = {
      database: await checkDatabaseHealth(),
      redis: await checkRedisHealth(),
      stripe: true, // TODO: Implement Stripe health check
      workers: true, // TODO: Check worker health via Redis
    };

    const allHealthy = Object.values(checks).every(check => check === true);
    const someHealthy = Object.values(checks).some(check => check === true);

    const status: HealthResponse['status'] = 
      allHealthy ? 'healthy' : 
      someHealthy ? 'degraded' : 
      'unhealthy';

    const response: HealthResponse = {
      status,
      version: process.env.npm_package_version || '1.0.0',
      checks,
      ...(status === 'healthy' && {
        metrics: {
          eventsPerSecond: 0, // TODO: Calculate from Redis
          writerLag: 0, // TODO: Calculate from write log
          reconciliationDiff: 0, // TODO: Calculate from reconciliation reports
        },
      }),
    };

    const statusCode = status === 'healthy' ? 200 : 503;
    reply.status(statusCode).send(response);
  });
};
