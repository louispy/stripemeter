/**
 * Events table schema - The immutable ledger of all usage events
 */

import { pgTable, text, uuid, numeric, timestamp, jsonb, index } from 'drizzle-orm/pg-core';

export const events = pgTable('events', {
  // Primary key - deterministic idempotency key
  idempotencyKey: text('idempotency_key').primaryKey(),
  
  // Core fields
  tenantId: uuid('tenant_id').notNull(),
  metric: text('metric').notNull(),
  customerRef: text('customer_ref').notNull(),
  resourceId: text('resource_id'),
  quantity: numeric('quantity', { precision: 20, scale: 6 }).notNull(),
  ts: timestamp('ts', { withTimezone: true }).notNull(),
  meta: jsonb('meta').notNull().default({}),
  source: text('source').notNull().default('http'),
  insertedAt: timestamp('inserted_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => {
  return {
    // Composite index for efficient querying
    tenantMetricCustomerTsIdx: index('idx_events_tenant_metric_customer_ts')
      .on(table.tenantId, table.metric, table.customerRef, table.ts),
    
    // Index for period queries
    tenantTsIdx: index('idx_events_tenant_ts')
      .on(table.tenantId, table.ts),
  };
});

// Type inference
export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;
