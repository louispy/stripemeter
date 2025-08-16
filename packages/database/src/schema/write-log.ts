/**
 * Write log table schema - Tracks what has been pushed to Stripe
 */

import { pgTable, uuid, text, numeric, timestamp, date, primaryKey, index } from 'drizzle-orm/pg-core';

export const writeLog = pgTable('write_log', {
  tenantId: uuid('tenant_id').notNull(),
  stripeAccount: text('stripe_account').notNull(),
  subscriptionItemId: text('subscription_item_id').notNull(),
  periodStart: date('period_start').notNull(),
  pushedTotal: numeric('pushed_total', { precision: 20, scale: 6 }).notNull().default('0'),
  lastRequestId: text('last_request_id'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => {
  return {
    // Composite primary key
    pk: primaryKey({ 
      columns: [table.tenantId, table.stripeAccount, table.subscriptionItemId, table.periodStart] 
    }),
    
    // Index for tenant queries
    tenantIdx: index('idx_write_log_tenant')
      .on(table.tenantId, table.periodStart),
    
    // Index for subscription item queries
    subscriptionItemIdx: index('idx_write_log_subscription_item')
      .on(table.subscriptionItemId, table.periodStart),
  };
});

// Type inference
export type WriteLog = typeof writeLog.$inferSelect;
export type NewWriteLog = typeof writeLog.$inferInsert;
