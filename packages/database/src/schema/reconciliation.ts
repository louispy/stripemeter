/**
 * Reconciliation reports table schema - Tracks differences between local and Stripe
 */

import { pgTable, uuid, text, numeric, timestamp, date, index } from 'drizzle-orm/pg-core';

export const reconciliationReports = pgTable('reconciliation_reports', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  subscriptionItemId: text('subscription_item_id').notNull(),
  periodStart: date('period_start').notNull(),
  localTotal: numeric('local_total', { precision: 20, scale: 6 }).notNull(),
  stripeTotal: numeric('stripe_total', { precision: 20, scale: 6 }).notNull(),
  diff: numeric('diff', { precision: 20, scale: 6 }).notNull(),
  status: text('status', { 
    enum: ['ok', 'investigate', 'resolved'] 
  }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => {
  return {
    // Index for tenant queries
    tenantPeriodIdx: index('idx_reconciliation_tenant_period')
      .on(table.tenantId, table.periodStart),
    
    // Index for status filtering
    statusIdx: index('idx_reconciliation_status')
      .on(table.status, table.tenantId),
    
    // Index for subscription item queries
    subscriptionItemIdx: index('idx_reconciliation_subscription_item')
      .on(table.subscriptionItemId, table.periodStart),
  };
});

// Type inference
export type ReconciliationReport = typeof reconciliationReports.$inferSelect;
export type NewReconciliationReport = typeof reconciliationReports.$inferInsert;
