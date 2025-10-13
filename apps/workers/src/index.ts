/**
 * Workers entry point - starts all background workers
 */

import 'dotenv/config';
import { logger } from './utils/logger';
import { AggregatorWorker } from './workers/aggregator';
import { StripeWriterWorker } from './workers/stripe-writer';
import { ReconcilerWorker } from './workers/reconciler';
import { AlertMonitorWorker } from './workers/alert-monitor';
import { SimulationRunnerWorker } from './workers/simulation-runner';
import { BackfillWorker } from './workers/backfill';
import { redis } from '@stripemeter/database';
import { startWorkerHttpServer } from './http';
import * as Sentry from '@sentry/node';

async function start() {
  logger.info('🚀 Starting Stripemeter workers...');

  try {
    // Initialize Sentry if configured
    try {
      const dsn = process.env.SENTRY_DSN;
      if (dsn) {
        Sentry.init({
          dsn,
          environment: process.env.NODE_ENV || 'development',
          release: process.env.GIT_SHA || process.env.RELEASE || undefined,
          tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || '0'),
        });
      }
    } catch {}
    // Initialize workers
    const aggregator = new AggregatorWorker();
    const stripeWriter = new StripeWriterWorker();
    const reconciler = new ReconcilerWorker();
    const alertMonitor = new AlertMonitorWorker();
    const simulationRunner = new SimulationRunnerWorker();
    const backfill = new BackfillWorker();

    // Start lightweight HTTP server for health/metrics and manual triggers
    startWorkerHttpServer(Number(process.env.WORKER_HTTP_PORT || 3100), {
      onReconcileRun: async () => {
        await reconciler.triggerOnDemand();
      },
    });

    // Start all workers
    await Promise.all([
      aggregator.start(),
      stripeWriter.start(),
      reconciler.start(),
      alertMonitor.start(),
      simulationRunner.start(),
      backfill.start(),
    ]);

    logger.info('✅ All workers started successfully');

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}, shutting down workers...`);
      
      await Promise.all([
        aggregator.stop(),
        stripeWriter.stop(),
        reconciler.stop(),
        alertMonitor.stop(),
        simulationRunner.stop(),
        backfill.stop(),
      ]);

      await redis.quit();
      process.exit(0);
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

  } catch (error) {
    logger.error('Failed to start workers:', error);
    process.exit(1);
  }
}

start();
