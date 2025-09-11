/**
 * Backfill operations schema - Track bulk import operations
 */

import { pgTable, uuid, text, timestamp, jsonb, index, integer, numeric } from 'drizzle-orm/pg-core';

export const backfillOperations = pgTable('backfill_operations', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  metric: text('metric').notNull(),
  customerRef: text('customer_ref'),
  periodStart: text('period_start').notNull(), // YYYY-MM-DD format
  periodEnd: text('period_end').notNull(), // YYYY-MM-DD format
  status: text('status', { 
    enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'] 
  }).notNull().default('pending'),
  reason: text('reason').notNull(),
  actor: text('actor').notNull(), // who initiated the backfill
  totalEvents: integer('total_events').default(0),
  processedEvents: integer('processed_events').default(0),
  failedEvents: integer('failed_events').default(0),
  duplicateEvents: integer('duplicate_events').default(0),
  sourceType: text('source_type', { 
    enum: ['json', 'csv', 'api'] 
  }).notNull(),
  sourceData: text('source_data'), // For small data, store directly
  sourceUrl: text('source_url'), // For large data, store S3/MinIO URL
  metadata: jsonb('metadata').notNull().default({}),
  errorMessage: text('error_message'),
  startedAt: timestamp('started_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => {
  return {
    // Index for tenant queries
    tenantIdx: index('idx_backfill_operations_tenant')
      .on(table.tenantId, table.createdAt),
    
    // Index for status monitoring
    statusIdx: index('idx_backfill_operations_status')
      .on(table.status, table.createdAt),
    
    // Index for period queries
    periodIdx: index('idx_backfill_operations_period')
      .on(table.tenantId, table.periodStart, table.periodEnd),
  };
});

// Type inference
export type BackfillOperation = typeof backfillOperations.$inferSelect;
export type NewBackfillOperation = typeof backfillOperations.$inferInsert;
