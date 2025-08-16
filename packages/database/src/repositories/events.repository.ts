/**
 * Events repository - Handles event storage and retrieval
 */

import { eq, and, gte, lte, sql as sqlTag } from 'drizzle-orm';
import { db } from '../client';
import { events, type Event, type NewEvent } from '../schema/events';
import type { UsageEvent } from '@stripemeter/core';

export class EventsRepository {
  /**
   * Insert a new event (with upsert for idempotency)
   */
  async upsertEvent(event: NewEvent): Promise<Event> {
    const [result] = await db
      .insert(events)
      .values(event)
      .onConflictDoNothing({ target: events.idempotencyKey })
      .returning();
    
    // If conflict (duplicate), fetch the existing event
    if (!result) {
      const [existing] = await db
        .select()
        .from(events)
        .where(eq(events.idempotencyKey, event.idempotencyKey))
        .limit(1);
      return existing;
    }
    
    return result;
  }

  /**
   * Batch insert events
   */
  async upsertBatch(eventBatch: NewEvent[]): Promise<{ 
    inserted: Event[]; 
    duplicates: string[] 
  }> {
    if (eventBatch.length === 0) {
      return { inserted: [], duplicates: [] };
    }

    const inserted = await db
      .insert(events)
      .values(eventBatch)
      .onConflictDoNothing({ target: events.idempotencyKey })
      .returning();
    
    // Identify duplicates
    const insertedKeys = new Set(inserted.map(e => e.idempotencyKey));
    const duplicates = eventBatch
      .filter(e => !insertedKeys.has(e.idempotencyKey))
      .map(e => e.idempotencyKey);
    
    return { inserted, duplicates };
  }

  /**
   * Get events for a specific period
   */
  async getEventsByPeriod(params: {
    tenantId: string;
    metric: string;
    customerRef: string;
    periodStart: Date;
    periodEnd: Date;
  }): Promise<Event[]> {
    const { tenantId, metric, customerRef, periodStart, periodEnd } = params;
    
    return db
      .select()
      .from(events)
      .where(
        and(
          eq(events.tenantId, tenantId),
          eq(events.metric, metric),
          eq(events.customerRef, customerRef),
          gte(events.ts, periodStart),
          lte(events.ts, periodEnd)
        )
      )
      .orderBy(events.ts);
  }

  /**
   * Get events after a watermark
   */
  async getEventsAfterWatermark(params: {
    tenantId: string;
    metric: string;
    customerRef: string;
    watermark: Date;
  }): Promise<Event[]> {
    const { tenantId, metric, customerRef, watermark } = params;
    
    return db
      .select()
      .from(events)
      .where(
        and(
          eq(events.tenantId, tenantId),
          eq(events.metric, metric),
          eq(events.customerRef, customerRef),
          gte(events.ts, watermark)
        )
      )
      .orderBy(events.ts);
  }

  /**
   * Calculate sum for a period
   */
  async calculateSum(params: {
    tenantId: string;
    metric: string;
    customerRef: string;
    periodStart: Date;
    periodEnd: Date;
  }): Promise<number> {
    const { tenantId, metric, customerRef, periodStart, periodEnd } = params;
    
    const [result] = await db
      .select({
        total: sqlTag<number>`COALESCE(SUM(${events.quantity}), 0)::numeric`,
      })
      .from(events)
      .where(
        and(
          eq(events.tenantId, tenantId),
          eq(events.metric, metric),
          eq(events.customerRef, customerRef),
          gte(events.ts, periodStart),
          lte(events.ts, periodEnd)
        )
      );
    
    return Number(result?.total || 0);
  }

  /**
   * Calculate max for a period
   */
  async calculateMax(params: {
    tenantId: string;
    metric: string;
    customerRef: string;
    periodStart: Date;
    periodEnd: Date;
  }): Promise<number> {
    const { tenantId, metric, customerRef, periodStart, periodEnd } = params;
    
    const [result] = await db
      .select({
        max: sqlTag<number>`COALESCE(MAX(${events.quantity}), 0)::numeric`,
      })
      .from(events)
      .where(
        and(
          eq(events.tenantId, tenantId),
          eq(events.metric, metric),
          eq(events.customerRef, customerRef),
          gte(events.ts, periodStart),
          lte(events.ts, periodEnd)
        )
      );
    
    return Number(result?.max || 0);
  }

  /**
   * Get last value for a period
   */
  async getLastValue(params: {
    tenantId: string;
    metric: string;
    customerRef: string;
    periodStart: Date;
    periodEnd: Date;
  }): Promise<number | null> {
    const { tenantId, metric, customerRef, periodStart, periodEnd } = params;
    
    const [result] = await db
      .select({ quantity: events.quantity })
      .from(events)
      .where(
        and(
          eq(events.tenantId, tenantId),
          eq(events.metric, metric),
          eq(events.customerRef, customerRef),
          gte(events.ts, periodStart),
          lte(events.ts, periodEnd)
        )
      )
      .orderBy(sqlTag`${events.ts} DESC`)
      .limit(1);
    
    return result ? Number(result.quantity) : null;
  }
}
