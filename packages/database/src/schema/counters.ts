/**
 * Counters table schema - Materialized aggregations of events
 */

import { pgTable, uuid, text, numeric, timestamp, date, primaryKey, index } from 'drizzle-orm/pg-core';

export const counters = pgTable('counters', {
  tenantId: uuid('tenant_id').notNull(),
  metric: text('metric').notNull(),
  customerRef: text('customer_ref').notNull(),
  periodStart: date('period_start').notNull(),
  periodEnd: date('period_end').notNull(),
  aggSum: numeric('agg_sum', { precision: 20, scale: 6 }).notNull().default('0'),
  aggMax: numeric('agg_max', { precision: 20, scale: 6 }).notNull().default('0'),
  aggLast: numeric('agg_last', { precision: 20, scale: 6 }),
  watermarkTs: timestamp('watermark_ts', { withTimezone: true }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => {
  return {
    // Composite primary key
    pk: primaryKey({ 
      columns: [table.tenantId, table.metric, table.customerRef, table.periodStart] 
    }),
    
    // Index for tenant queries
    tenantPeriodIdx: index('idx_counters_tenant_period')
      .on(table.tenantId, table.periodStart),
    
    // Index for customer usage lookups
    customerIdx: index('idx_counters_customer')
      .on(table.tenantId, table.customerRef, table.periodStart),
  };
});

// Type inference
export type Counter = typeof counters.$inferSelect;
export type NewCounter = typeof counters.$inferInsert;
