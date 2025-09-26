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

// Reconciliation metrics
export const reconRunsTotal = new Counter({
  name: 'recon_runs_total',
  help: 'Total number of reconciliation runs',
  registers: [registry],
});

export const reconDurationSeconds = new Histogram({
  name: 'recon_duration_seconds',
  help: 'Duration of reconciliation runs in seconds',
  registers: [registry],
  buckets: [0.5, 1, 2.5, 5, 10, 30, 60, 120, 300],
});

export const reconciliationDiffAbs = new Gauge({
  name: 'reconciliation_diff_abs',
  help: 'Absolute drift between local and Stripe by item and period',
  registers: [registry],
  labelNames: ['tenant', 'subscription_item', 'period'] as const,
});

export const reconciliationDiffPct = new Gauge({
  name: 'reconciliation_diff_pct',
  help: 'Percentage drift (|local - stripe| / stripe) by item and period',
  registers: [registry],
  labelNames: ['tenant', 'subscription_item', 'period'] as const,
});

// Re-aggregations counter
export const reaggregationsTotal = new Counter({
  name: 'reaggregations_total',
  help: 'Total number of re-aggregation operations by reason',
  registers: [registry],
  labelNames: ['reason'] as const,
});

// Adjustments lifecycle metrics
export const adjustmentsCreatedTotal = new Counter({
  name: 'adjustments_created_total',
  help: 'Total number of adjustments created',
  registers: [registry],
  labelNames: ['tenant', 'reason'] as const,
});

export const adjustmentsApprovedTotal = new Counter({
  name: 'adjustments_approved_total',
  help: 'Total number of adjustments approved',
  registers: [registry],
  labelNames: ['tenant', 'reason'] as const,
});

export const adjustmentsRevertedTotal = new Counter({
  name: 'adjustments_reverted_total',
  help: 'Total number of adjustments reverted',
  registers: [registry],
  labelNames: ['tenant', 'reason'] as const,
});

export async function renderMetrics(): Promise<string> {
  return await registry.metrics();
}


