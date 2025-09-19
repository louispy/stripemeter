/**
 * Prometheus metrics utilities for workers
 */

import { Counter, Gauge, Histogram, Registry, collectDefaultMetrics } from 'prom-client';

export const registry = new Registry();
collectDefaultMetrics({ register: registry });

export const workerJobsTotal = new Counter({
  name: 'worker_jobs_total',
  help: 'Total number of worker jobs processed',
  registers: [registry],
  labelNames: ['type', 'result'] as const,
});

export const workerJobDurationSeconds = new Histogram({
  name: 'worker_job_duration_seconds',
  help: 'Duration of worker jobs in seconds',
  registers: [registry],
  labelNames: ['type'] as const,
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30, 60],
});

export const workerRunningGauge = new Gauge({
  name: 'worker_running_gauge',
  help: 'Number of running jobs by type',
  registers: [registry],
  labelNames: ['type'] as const,
});

export const shadowUsagePostsTotal = new Counter({
  name: 'shadow_usage_posts_total',
  help: 'Total number of shadow mode usage posts to Stripe test',
  registers: [registry],
  labelNames: ['tenant', 'metric'] as const,
});

export const shadowUsagePostFailuresTotal = new Counter({
  name: 'shadow_usage_post_failures_total',
  help: 'Total number of failed shadow mode usage posts',
  registers: [registry],
  labelNames: ['tenant', 'metric', 'reason'] as const,
});

export async function renderMetrics(): Promise<string> {
  return await registry.metrics();
}


