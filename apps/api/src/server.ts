/**
 * Fastify server configuration
 */

import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { errorHandler } from './utils/error-handler';

// Import routes
import { healthRoutes } from './routes/health';
import { eventsRoutes } from './routes/events';
import { usageRoutes } from './routes/usage';
import { mappingsRoutes } from './routes/mappings';
import { reconciliationRoutes } from './routes/reconciliation';
import { alertsRoutes } from './routes/alerts';
import { simulationRoutes } from './routes/simulations';

export async function buildServer() {
  const server = Fastify({
    logger: true,
    requestIdHeader: 'x-request-id',
    requestIdLogLabel: 'requestId',
    disableRequestLogging: false,
    trustProxy: true,
  });

  // Register error handler
  server.setErrorHandler((error, request, reply) => {
    return errorHandler(error, request, reply);
  });

  // Register plugins
  await server.register(helmet, {
    contentSecurityPolicy: false, // Disable for API
  });

  await server.register(cors, {
    origin: process.env.API_CORS_ORIGIN?.split(',') || true,
    credentials: true,
  });

  await server.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
    allowList: ['127.0.0.1', '::1'], // Whitelist localhost
  });

  // API Documentation
  await server.register(swagger, {
    swagger: {
      info: {
        title: 'Stripemeter API',
        description: 'Stripe-native usage metering and cost experience API',
        version: '1.0.0',
      },
      host: process.env.API_HOST || 'localhost:3000',
      schemes: ['http', 'https'],
      consumes: ['application/json'],
      produces: ['application/json'],
      tags: [
        { name: 'health', description: 'Health check endpoints' },
        { name: 'events', description: 'Usage event ingestion' },
        { name: 'usage', description: 'Usage queries and projections' },
        { name: 'mappings', description: 'Price mapping configuration' },
        { name: 'reconciliation', description: 'Reconciliation reports' },
        { name: 'alerts', description: 'Alert configuration' },
        { name: 'simulations', description: 'Pricing simulation scenarios and runs' },
      ],
    },
  });

  await server.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: false,
    },
    staticCSP: true,
    transformSpecificationClone: true,
  });

  // Register routes
  await server.register(healthRoutes, { prefix: '/health' });
  await server.register(eventsRoutes, { prefix: '/v1/events' });
  await server.register(usageRoutes, { prefix: '/v1/usage' });
  await server.register(mappingsRoutes, { prefix: '/v1/mappings' });
  await server.register(reconciliationRoutes, { prefix: '/v1/reconciliation' });
  await server.register(alertsRoutes, { prefix: '/v1/alerts' });
  await server.register(simulationRoutes, { prefix: '/v1/simulations' });

  // Ready handler
  await server.ready();

  return server;
}
