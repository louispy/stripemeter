/**
 * Core type definitions for Stripemeter
 */

export type TenantID = string;
export type CustomerRef = string;
export type MetricName = string;
export type SubscriptionItemID = string;
export type PriceID = string;
export type StripeAccountID = string;

export type AggregationType = 'sum' | 'max' | 'last';
export type ReconciliationStatus = 'ok' | 'investigate' | 'resolved';
export type AdjustmentReason = 'backfill' | 'correction' | 'promo' | 'credit' | 'manual';
export type EventSource = 'sdk' | 'http' | 'etl' | 'import' | 'system';

export interface UsageEvent {
  tenantId: TenantID;
  metric: MetricName;
  customerRef: CustomerRef;
  resourceId?: string;
  quantity: number;
  ts: string; // ISO 8601 UTC
  meta?: Record<string, any>;
  idempotencyKey?: string;
  source?: EventSource;
}

export interface CounterKey {
  tenantId: TenantID;
  metric: MetricName;
  customerRef: CustomerRef;
  periodStart: string; // YYYY-MM-DD UTC
}

export interface Counter extends CounterKey {
  periodEnd: string; // YYYY-MM-DD UTC
  aggSum: number;
  aggMax: number;
  aggLast?: number;
  watermarkTs: string;
  updatedAt: string;
}

export interface PriceMapping {
  tenantId: TenantID;
  metric: MetricName;
  aggregation: AggregationType;
  stripeAccount: StripeAccountID;
  priceId: PriceID;
  subscriptionItemId?: SubscriptionItemID;
  currency?: string;
  active: boolean;
}

export interface WriteLogKey {
  tenantId: TenantID;
  stripeAccount: StripeAccountID;
  subscriptionItemId: SubscriptionItemID;
  periodStart: string;
}

export interface WriteLog extends WriteLogKey {
  pushedTotal: number;
  lastRequestId?: string;
  updatedAt: string;
}

export interface Adjustment {
  id: string;
  tenantId: TenantID;
  metric: MetricName;
  customerRef: CustomerRef;
  periodStart: string;
  delta: number;
  reason: AdjustmentReason;
  actor: string;
  createdAt: string;
}

export interface ReconciliationReport {
  id: string;
  tenantId: TenantID;
  subscriptionItemId: SubscriptionItemID;
  periodStart: string;
  localTotal: number;
  stripeTotal: number;
  diff: number;
  status: ReconciliationStatus;
  createdAt: string;
}

export interface AlertConfig {
  id: string;
  tenantId: TenantID;
  customerRef?: CustomerRef;
  metric?: MetricName;
  type: 'threshold' | 'spike' | 'budget';
  threshold: number;
  action: 'email' | 'webhook' | 'slack' | 'hard_cap' | 'soft_cap';
  config: Record<string, any>;
  enabled: boolean;
}
