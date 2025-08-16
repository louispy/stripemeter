/**
 * Price mappings table schema - Maps metrics to Stripe prices
 */

import { pgTable, uuid, text, boolean, unique, index } from 'drizzle-orm/pg-core';

export const priceMappings = pgTable('price_mappings', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  metric: text('metric').notNull(),
  aggregation: text('aggregation', { 
    enum: ['sum', 'max', 'last'] 
  }).notNull(),
  stripeAccount: text('stripe_account').notNull(),
  priceId: text('price_id').notNull(),
  subscriptionItemId: text('subscription_item_id'),
  currency: text('currency'),
  active: boolean('active').notNull().default(true),
}, (table) => {
  return {
    // Unique constraint for active mappings
    uniqueActiveMapping: unique('unique_active_mapping')
      .on(table.tenantId, table.metric, table.active)
      .nullsNotDistinct(),
    
    // Index for tenant lookups
    tenantIdx: index('idx_price_mappings_tenant')
      .on(table.tenantId, table.active),
    
    // Index for metric lookups
    metricIdx: index('idx_price_mappings_metric')
      .on(table.tenantId, table.metric, table.active),
  };
});

// Type inference
export type PriceMapping = typeof priceMappings.$inferSelect;
export type NewPriceMapping = typeof priceMappings.$inferInsert;
