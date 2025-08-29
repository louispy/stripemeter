/**
 * Zod validation schemas for API requests
 */
import { z } from 'zod';
export declare const usageEventSchema: z.ZodObject<{
    tenantId: z.ZodString;
    metric: z.ZodString;
    customerRef: z.ZodString;
    resourceId: z.ZodOptional<z.ZodString>;
    quantity: z.ZodNumber;
    ts: z.ZodEffects<z.ZodString, string, string>;
    meta: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    idempotencyKey: z.ZodOptional<z.ZodString>;
    source: z.ZodOptional<z.ZodEnum<["sdk", "http", "etl", "import", "system"]>>;
}, "strip", z.ZodTypeAny, {
    tenantId: string;
    metric: string;
    customerRef: string;
    quantity: number;
    ts: string;
    idempotencyKey?: string | undefined;
    resourceId?: string | undefined;
    meta?: Record<string, any> | undefined;
    source?: "http" | "sdk" | "etl" | "import" | "system" | undefined;
}, {
    tenantId: string;
    metric: string;
    customerRef: string;
    quantity: number;
    ts: string;
    idempotencyKey?: string | undefined;
    resourceId?: string | undefined;
    meta?: Record<string, any> | undefined;
    source?: "http" | "sdk" | "etl" | "import" | "system" | undefined;
}>;
export declare const ingestEventRequestSchema: z.ZodObject<{
    events: z.ZodArray<z.ZodObject<{
        tenantId: z.ZodString;
        metric: z.ZodString;
        customerRef: z.ZodString;
        resourceId: z.ZodOptional<z.ZodString>;
        quantity: z.ZodNumber;
        ts: z.ZodEffects<z.ZodString, string, string>;
        meta: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
        idempotencyKey: z.ZodOptional<z.ZodString>;
        source: z.ZodOptional<z.ZodEnum<["sdk", "http", "etl", "import", "system"]>>;
    }, "strip", z.ZodTypeAny, {
        tenantId: string;
        metric: string;
        customerRef: string;
        quantity: number;
        ts: string;
        idempotencyKey?: string | undefined;
        resourceId?: string | undefined;
        meta?: Record<string, any> | undefined;
        source?: "http" | "sdk" | "etl" | "import" | "system" | undefined;
    }, {
        tenantId: string;
        metric: string;
        customerRef: string;
        quantity: number;
        ts: string;
        idempotencyKey?: string | undefined;
        resourceId?: string | undefined;
        meta?: Record<string, any> | undefined;
        source?: "http" | "sdk" | "etl" | "import" | "system" | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    events: {
        tenantId: string;
        metric: string;
        customerRef: string;
        quantity: number;
        ts: string;
        idempotencyKey?: string | undefined;
        resourceId?: string | undefined;
        meta?: Record<string, any> | undefined;
        source?: "http" | "sdk" | "etl" | "import" | "system" | undefined;
    }[];
}, {
    events: {
        tenantId: string;
        metric: string;
        customerRef: string;
        quantity: number;
        ts: string;
        idempotencyKey?: string | undefined;
        resourceId?: string | undefined;
        meta?: Record<string, any> | undefined;
        source?: "http" | "sdk" | "etl" | "import" | "system" | undefined;
    }[];
}>;
export declare const adjustmentRequestSchema: z.ZodObject<{
    tenantId: z.ZodString;
    metric: z.ZodString;
    customerRef: z.ZodString;
    periodStart: z.ZodString;
    delta: z.ZodNumber;
    reason: z.ZodEnum<["backfill", "correction", "promo", "credit", "manual"]>;
}, "strip", z.ZodTypeAny, {
    tenantId: string;
    metric: string;
    customerRef: string;
    periodStart: string;
    delta: number;
    reason: "backfill" | "correction" | "promo" | "credit" | "manual";
}, {
    tenantId: string;
    metric: string;
    customerRef: string;
    periodStart: string;
    delta: number;
    reason: "backfill" | "correction" | "promo" | "credit" | "manual";
}>;
export declare const backfillRequestSchema: z.ZodEffects<z.ZodObject<{
    tenantId: z.ZodString;
    metric: z.ZodString;
    customerRef: z.ZodOptional<z.ZodString>;
    periodStart: z.ZodString;
    periodEnd: z.ZodOptional<z.ZodString>;
    events: z.ZodOptional<z.ZodArray<z.ZodObject<{
        tenantId: z.ZodString;
        metric: z.ZodString;
        customerRef: z.ZodString;
        resourceId: z.ZodOptional<z.ZodString>;
        quantity: z.ZodNumber;
        ts: z.ZodEffects<z.ZodString, string, string>;
        meta: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
        idempotencyKey: z.ZodOptional<z.ZodString>;
        source: z.ZodOptional<z.ZodEnum<["sdk", "http", "etl", "import", "system"]>>;
    }, "strip", z.ZodTypeAny, {
        tenantId: string;
        metric: string;
        customerRef: string;
        quantity: number;
        ts: string;
        idempotencyKey?: string | undefined;
        resourceId?: string | undefined;
        meta?: Record<string, any> | undefined;
        source?: "http" | "sdk" | "etl" | "import" | "system" | undefined;
    }, {
        tenantId: string;
        metric: string;
        customerRef: string;
        quantity: number;
        ts: string;
        idempotencyKey?: string | undefined;
        resourceId?: string | undefined;
        meta?: Record<string, any> | undefined;
        source?: "http" | "sdk" | "etl" | "import" | "system" | undefined;
    }>, "many">>;
    csvData: z.ZodOptional<z.ZodString>;
    reason: z.ZodString;
}, "strip", z.ZodTypeAny, {
    tenantId: string;
    metric: string;
    periodStart: string;
    reason: string;
    events?: {
        tenantId: string;
        metric: string;
        customerRef: string;
        quantity: number;
        ts: string;
        idempotencyKey?: string | undefined;
        resourceId?: string | undefined;
        meta?: Record<string, any> | undefined;
        source?: "http" | "sdk" | "etl" | "import" | "system" | undefined;
    }[] | undefined;
    customerRef?: string | undefined;
    periodEnd?: string | undefined;
    csvData?: string | undefined;
}, {
    tenantId: string;
    metric: string;
    periodStart: string;
    reason: string;
    events?: {
        tenantId: string;
        metric: string;
        customerRef: string;
        quantity: number;
        ts: string;
        idempotencyKey?: string | undefined;
        resourceId?: string | undefined;
        meta?: Record<string, any> | undefined;
        source?: "http" | "sdk" | "etl" | "import" | "system" | undefined;
    }[] | undefined;
    customerRef?: string | undefined;
    periodEnd?: string | undefined;
    csvData?: string | undefined;
}>, {
    tenantId: string;
    metric: string;
    periodStart: string;
    reason: string;
    events?: {
        tenantId: string;
        metric: string;
        customerRef: string;
        quantity: number;
        ts: string;
        idempotencyKey?: string | undefined;
        resourceId?: string | undefined;
        meta?: Record<string, any> | undefined;
        source?: "http" | "sdk" | "etl" | "import" | "system" | undefined;
    }[] | undefined;
    customerRef?: string | undefined;
    periodEnd?: string | undefined;
    csvData?: string | undefined;
}, {
    tenantId: string;
    metric: string;
    periodStart: string;
    reason: string;
    events?: {
        tenantId: string;
        metric: string;
        customerRef: string;
        quantity: number;
        ts: string;
        idempotencyKey?: string | undefined;
        resourceId?: string | undefined;
        meta?: Record<string, any> | undefined;
        source?: "http" | "sdk" | "etl" | "import" | "system" | undefined;
    }[] | undefined;
    customerRef?: string | undefined;
    periodEnd?: string | undefined;
    csvData?: string | undefined;
}>;
export declare const projectionRequestSchema: z.ZodObject<{
    tenantId: z.ZodString;
    customerRef: z.ZodString;
    periodStart: z.ZodOptional<z.ZodString>;
    periodEnd: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    tenantId: string;
    customerRef: string;
    periodStart?: string | undefined;
    periodEnd?: string | undefined;
}, {
    tenantId: string;
    customerRef: string;
    periodStart?: string | undefined;
    periodEnd?: string | undefined;
}>;
export declare const priceMappingSchema: z.ZodObject<{
    tenantId: z.ZodString;
    metric: z.ZodString;
    aggregation: z.ZodEnum<["sum", "max", "last"]>;
    stripeAccount: z.ZodString;
    priceId: z.ZodString;
    subscriptionItemId: z.ZodOptional<z.ZodString>;
    currency: z.ZodOptional<z.ZodString>;
    active: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    tenantId: string;
    metric: string;
    aggregation: "sum" | "max" | "last";
    stripeAccount: string;
    priceId: string;
    active: boolean;
    subscriptionItemId?: string | undefined;
    currency?: string | undefined;
}, {
    tenantId: string;
    metric: string;
    aggregation: "sum" | "max" | "last";
    stripeAccount: string;
    priceId: string;
    subscriptionItemId?: string | undefined;
    currency?: string | undefined;
    active?: boolean | undefined;
}>;
export declare const alertConfigSchema: z.ZodObject<{
    tenantId: z.ZodString;
    customerRef: z.ZodOptional<z.ZodString>;
    metric: z.ZodOptional<z.ZodString>;
    type: z.ZodEnum<["threshold", "spike", "budget"]>;
    threshold: z.ZodNumber;
    action: z.ZodEnum<["email", "webhook", "slack", "hard_cap", "soft_cap"]>;
    config: z.ZodRecord<z.ZodString, z.ZodAny>;
    enabled: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    tenantId: string;
    type: "threshold" | "spike" | "budget";
    threshold: number;
    action: "email" | "webhook" | "slack" | "hard_cap" | "soft_cap";
    config: Record<string, any>;
    enabled: boolean;
    metric?: string | undefined;
    customerRef?: string | undefined;
}, {
    tenantId: string;
    type: "threshold" | "spike" | "budget";
    threshold: number;
    action: "email" | "webhook" | "slack" | "hard_cap" | "soft_cap";
    config: Record<string, any>;
    metric?: string | undefined;
    customerRef?: string | undefined;
    enabled?: boolean | undefined;
}>;
export type UsageEventInput = z.infer<typeof usageEventSchema>;
export type IngestEventRequestInput = z.infer<typeof ingestEventRequestSchema>;
export type AdjustmentRequestInput = z.infer<typeof adjustmentRequestSchema>;
export type BackfillRequestInput = z.infer<typeof backfillRequestSchema>;
export type ProjectionRequestInput = z.infer<typeof projectionRequestSchema>;
export type PriceMappingInput = z.infer<typeof priceMappingSchema>;
export type AlertConfigInput = z.infer<typeof alertConfigSchema>;
//# sourceMappingURL=validation.d.ts.map