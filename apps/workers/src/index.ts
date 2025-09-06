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
import { redis } from '@stripemeter/database';
import { startWorkerHttpServer } from './http';

async function start() {
  logger.info('🚀 Starting Stripemeter workers...');

  try {
    // Start lightweight HTTP server for health/metrics
    startWorkerHttpServer();
    // Initialize workers
    const aggregator = new AggregatorWorker();
    const stripeWriter = new StripeWriterWorker();
    const reconciler = new ReconcilerWorker();
    const alertMonitor = new AlertMonitorWorker();
    const simulationRunner = new SimulationRunnerWorker();

    // Start all workers
    await Promise.all([
      aggregator.start(),
      stripeWriter.start(),
      reconciler.start(),
      alertMonitor.start(),
      simulationRunner.start(),
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
