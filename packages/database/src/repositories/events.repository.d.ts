/**
 * Events repository - Handles event storage and retrieval
 */
import { type Event, type NewEvent } from '../schema/events';
export declare class EventsRepository {
    /**
     * Insert a new event (with upsert for idempotency)
     */
    upsertEvent(event: NewEvent): Promise<Event>;
    /**
     * Batch insert events
     */
    upsertBatch(eventBatch: NewEvent[]): Promise<{
        inserted: Event[];
        duplicates: string[];
    }>;
    /**
     * Get events for a specific period
     */
    getEventsByPeriod(params: {
        tenantId: string;
        metric: string;
        customerRef: string;
        periodStart: Date;
        periodEnd: Date;
    }): Promise<Event[]>;
    /**
     * Get events after a watermark
     */
    getEventsAfterWatermark(params: {
        tenantId: string;
        metric: string;
        customerRef: string;
        watermark: Date;
    }): Promise<Event[]>;
    /**
     * Calculate sum for a period
     */
    calculateSum(params: {
        tenantId: string;
        metric: string;
        customerRef: string;
        periodStart: Date;
        periodEnd: Date;
    }): Promise<number>;
    /**
     * Calculate max for a period
     */
    calculateMax(params: {
        tenantId: string;
        metric: string;
        customerRef: string;
        periodStart: Date;
        periodEnd: Date;
    }): Promise<number>;
    /**
     * Get last value for a period
     */
    getLastValue(params: {
        tenantId: string;
        metric: string;
        customerRef: string;
        periodStart: Date;
        periodEnd: Date;
    }): Promise<number | null>;
}
//# sourceMappingURL=events.repository.d.ts.map