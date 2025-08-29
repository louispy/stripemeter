/**
 * API request/response types
 */
import { UsageEvent, Adjustment, ReconciliationReport } from './base';
export interface IngestEventRequest {
    events: UsageEvent[];
}
export interface BackfillRequest {
    tenantId: string;
    metric: string;
    customerRef?: string;
    periodStart: string;
    periodEnd?: string;
    events?: UsageEvent[];
    csvData?: string;
    reason: string;
}
export interface AdjustmentRequest {
    tenantId: string;
    metric: string;
    customerRef: string;
    periodStart: string;
    delta: number;
    reason: string;
}
export interface ProjectionRequest {
    tenantId: string;
    customerRef: string;
    periodStart?: string;
    periodEnd?: string;
}
export interface IngestEventResponse {
    accepted: number;
    duplicates: number;
    errors?: Array<{
        index: number;
        error: string;
    }>;
}
export interface ProjectionResponse {
    customerRef: string;
    periodStart: string;
    periodEnd: string;
    lineItems: Array<{
        metric: string;
        quantity: number;
        unitPrice: number;
        total: number;
    }>;
    subtotal: number;
    credits: number;
    total: number;
    currency: string;
    freshness: {
        lastUpdate: string;
        staleness: number;
    };
}
export interface UsageResponse {
    customerRef: string;
    period: {
        start: string;
        end: string;
    };
    metrics: Array<{
        name: string;
        current: number;
        limit?: number;
        unit: string;
    }>;
    alerts: Array<{
        type: string;
        message: string;
        severity: 'info' | 'warning' | 'critical';
    }>;
}
export interface ReconciliationResponse {
    period: string;
    reports: ReconciliationReport[];
    suggestedAdjustments: Adjustment[];
    summary: {
        total: number;
        ok: number;
        investigating: number;
        resolved: number;
        maxDiff: number;
    };
}
export interface HealthResponse {
    status: 'healthy' | 'degraded' | 'unhealthy';
    version: string;
    checks: {
        database: boolean;
        redis: boolean;
        stripe: boolean;
        workers: boolean;
    };
    metrics?: {
        eventsPerSecond: number;
        writerLag: number;
        reconciliationDiff: number;
    };
}
//# sourceMappingURL=api.d.ts.map