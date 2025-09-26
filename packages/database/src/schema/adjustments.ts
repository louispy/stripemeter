/**
 * Adjustments table schema - Non-destructive corrections to usage
 */

import { pgTable, uuid, text, numeric, timestamp, date, index } from 'drizzle-orm/pg-core';


export const adjustments = pgTable('adjustments', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  metric: text('metric').notNull(),
  customerRef: text('customer_ref').notNull(),
  periodStart: date('period_start').notNull(),
  delta: numeric('delta', { precision: 20, scale: 6 }).notNull(),
  reason: text('reason', { 
    enum: ['backfill', 'correction', 'promo', 'credit', 'manual'] 
  }).notNull(),
  actor: text('actor').notNull(),
  status: text('status', {
    enum: ['pending', 'approved', 'reverted']
  }).notNull().default('pending'),
  approvedBy: text('approved_by'),
  approvedAt: timestamp('approved_at', { withTimezone: true }),
  revertedBy: text('reverted_by'),
  revertedAt: timestamp('reverted_at', { withTimezone: true }),
  parentAdjustmentId: uuid('parent_adjustment_id'),
  requestId: text('request_id'),
  note: text('note'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => {
  return {
    // Index for finding adjustments by tenant and period
    tenantPeriodIdx: index('idx_adjustments_tenant_period')
      .on(table.tenantId, table.periodStart),
    
    // Index for customer-specific adjustments
    tenantCustomerIdx: index('idx_adjustments_tenant_customer')
      .on(table.tenantId, table.customerRef),
    // Index for filtering by status quickly
    statusIdx: index('idx_adjustments_status')
      .on(table.status, table.tenantId),
  };
});

// Type inference
export type Adjustment = typeof adjustments.$inferSelect;
export type NewAdjustment = typeof adjustments.$inferInsert;
