/**
 * Zod validation schemas for API requests
 */

import { z } from 'zod';

// ISO 8601 date-time validation
const isoDateTimeSchema = z.string().refine(
  (val) => !isNaN(Date.parse(val)),
  { message: 'Invalid ISO 8601 date-time format' }
);

// UUID validation
const uuidSchema = z.string().uuid();

// Usage event schema
export const usageEventSchema = z.object({
  tenantId: uuidSchema,
  metric: z.string().min(1).max(100),
  customerRef: z.string().min(1).max(255),
  resourceId: z.string().max(255).optional(),
  quantity: z.number().positive().finite(),
  ts: isoDateTimeSchema,
  meta: z.record(z.any()).optional(),
  idempotencyKey: z.string().max(255).optional(),
  source: z.enum(['sdk', 'http', 'etl', 'import', 'system']).optional(),
});

// Batch event ingestion schema
export const ingestEventRequestSchema = z.object({
  events: z.array(usageEventSchema).min(1).max(1000),
});

// Adjustment schema
export const adjustmentRequestSchema = z.object({
  tenantId: uuidSchema,
  metric: z.string().min(1).max(100),
  customerRef: z.string().min(1).max(255),
  periodStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  delta: z.number().finite(),
  reason: z.enum(['backfill', 'correction', 'promo', 'credit', 'manual']),
});

// Backfill request schema
export const backfillRequestSchema = z.object({
  tenantId: uuidSchema,
  metric: z.string().min(1).max(100),
  customerRef: z.string().min(1).max(255).optional(),
  periodStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  periodEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  events: z.array(usageEventSchema).optional(),
  csvData: z.string().optional(),
  reason: z.string().min(1).max(500),
}).refine(
  (data) => data.events || data.csvData,
  { message: 'Either events or csvData must be provided' }
);

// Projection request schema
export const projectionRequestSchema = z.object({
  tenantId: uuidSchema,
  customerRef: z.string().min(1).max(255),
  periodStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  periodEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

// Price mapping schema
export const priceMappingSchema = z.object({
  tenantId: uuidSchema,
  metric: z.string().min(1).max(100),
  aggregation: z.enum(['sum', 'max', 'last']),
  stripeAccount: z.string().startsWith('acct_'),
  priceId: z.string().startsWith('price_'),
  subscriptionItemId: z.string().startsWith('si_').optional(),
  currency: z.string().length(3).optional(),
  active: z.boolean().default(true),
});

// Alert configuration schema
export const alertConfigSchema = z.object({
  tenantId: uuidSchema,
  customerRef: z.string().min(1).max(255).optional(),
  metric: z.string().min(1).max(100).optional(),
  type: z.enum(['threshold', 'spike', 'budget']),
  threshold: z.number().positive().finite(),
  action: z.enum(['email', 'webhook', 'slack', 'hard_cap', 'soft_cap']),
  config: z.record(z.any()),
  enabled: z.boolean().default(true),
});

// Type exports
export type UsageEventInput = z.infer<typeof usageEventSchema>;
export type IngestEventRequestInput = z.infer<typeof ingestEventRequestSchema>;
export type AdjustmentRequestInput = z.infer<typeof adjustmentRequestSchema>;
export type BackfillRequestInput = z.infer<typeof backfillRequestSchema>;
export type ProjectionRequestInput = z.infer<typeof projectionRequestSchema>;
export type PriceMappingInput = z.infer<typeof priceMappingSchema>;
export type AlertConfigInput = z.infer<typeof alertConfigSchema>;
