/**
 * Backfill operations repository
 */

import { db, backfillOperations } from '../index';
import { eq, and, desc, asc, gte, lte, sql } from 'drizzle-orm';
import type { BackfillOperation, NewBackfillOperation } from '../schema/backfill-operations';

type BackfillStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

export interface BackfillOperationFilters {
  tenantId?: string;
  status?: BackfillStatus;
  periodStart?: string;
  periodEnd?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'createdAt' | 'startedAt' | 'completedAt';
  sortDir?: 'asc' | 'desc';
}

export interface BackfillOperationStats {
  total: number;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  cancelled: number;
}

export class BackfillRepository {
  /**
   * Create a new backfill operation
   */
  async create(operation: NewBackfillOperation): Promise<BackfillOperation> {
    const [result] = await db
      .insert(backfillOperations)
      .values(operation)
      .returning();
    
    return result;
  }

  /**
   * Get backfill operation by ID
   */
  async getById(id: string): Promise<BackfillOperation | null> {
    const [result] = await db
      .select()
      .from(backfillOperations)
      .where(eq(backfillOperations.id, id))
      .limit(1);
    
    return result || null;
  }

  /**
   * Update backfill operation
   */
  async update(id: string, updates: Partial<NewBackfillOperation>): Promise<BackfillOperation | null> {
    const [result] = await db
      .update(backfillOperations)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(backfillOperations.id, id))
      .returning();
    
    return result || null;
  }

  /**
   * Update operation status
   */
  async updateStatus(
    id: string, 
    status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled',
    errorMessage?: string
  ): Promise<BackfillOperation | null> {
    const updates: Partial<NewBackfillOperation> = {
      status,
      updatedAt: new Date(),
    };

    if (status === 'processing' && !updates.startedAt) {
      updates.startedAt = new Date();
    }

    if (status === 'completed' || status === 'failed' || status === 'cancelled') {
      updates.completedAt = new Date();
    }

    if (errorMessage) {
      updates.errorMessage = errorMessage;
    }

    return this.update(id, updates);
  }

  /**
   * Update operation progress
   */
  async updateProgress(
    id: string,
    progress: {
      processedEvents?: number;
      failedEvents?: number;
      duplicateEvents?: number;
    }
  ): Promise<BackfillOperation | null> {
    return this.update(id, {
      ...progress,
      updatedAt: new Date(),
    });
  }

  /**
   * List backfill operations with filters
   */
  async list(filters: BackfillOperationFilters = {}): Promise<BackfillOperation[]> {
    const {
      tenantId,
      status,
      periodStart,
      periodEnd,
      limit = 50,
      offset = 0,
      sortBy = 'createdAt',
      sortDir = 'desc'
    } = filters;

    let base = db.select().from(backfillOperations);

    // Apply filters
    const conditions = [] as any[];
    if (tenantId) conditions.push(eq(backfillOperations.tenantId, tenantId));
    if (status) conditions.push(eq(backfillOperations.status, status));
    if (periodStart) conditions.push(gte(backfillOperations.periodStart, periodStart));
    if (periodEnd) conditions.push(lte(backfillOperations.periodEnd, periodEnd));

    let filtered: any = base;
    if (conditions.length > 0) {
      filtered = filtered.where(and(...conditions));
    }

    // Apply sorting
    let ordered: any;
    switch (sortBy) {
      case 'createdAt':
        ordered = filtered.orderBy(sortDir === 'asc' ? asc(backfillOperations.createdAt) : desc(backfillOperations.createdAt));
        break;
      case 'startedAt':
        ordered = filtered.orderBy(sortDir === 'asc' ? asc(backfillOperations.startedAt) : desc(backfillOperations.startedAt));
        break;
      case 'completedAt':
        ordered = filtered.orderBy(sortDir === 'asc' ? asc(backfillOperations.completedAt) : desc(backfillOperations.completedAt));
        break;
      default:
        ordered = filtered.orderBy(desc(backfillOperations.createdAt));
    }

    // Apply pagination and return
    return await ordered.limit(limit).offset(offset);
  }

  /**
   * Get backfill operation statistics
   */
  async getStats(tenantId?: string): Promise<BackfillOperationStats> {
    let baseStats: any = db
      .select({
        status: backfillOperations.status,
        count: sql<number>`count(*)`,
      })
      .from(backfillOperations);

    if (tenantId) {
      baseStats = baseStats.where(eq(backfillOperations.tenantId, tenantId));
    }

    const results = await baseStats.groupBy(backfillOperations.status);

    const stats: BackfillOperationStats = {
      total: 0,
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      cancelled: 0,
    };

    for (const result of results) {
      const count = Number(result.count);
      stats.total += count;
      stats[result.status as keyof BackfillOperationStats] = count;
    }

    return stats;
  }

  /**
   * Get operations that are stuck in processing state
   */
  async getStuckOperations(timeoutMinutes: number = 30): Promise<BackfillOperation[]> {
    const timeoutDate = new Date();
    timeoutDate.setMinutes(timeoutDate.getMinutes() - timeoutMinutes);

    return await db
      .select()
      .from(backfillOperations)
      .where(
        and(
          eq(backfillOperations.status, 'processing'),
          lte(backfillOperations.startedAt, timeoutDate)
        )
      );
  }

  /**
   * Cancel stuck operations
   */
  async cancelStuckOperations(timeoutMinutes: number = 30): Promise<number> {
    const stuckOps = await this.getStuckOperations(timeoutMinutes);
    
    for (const op of stuckOps) {
      await this.updateStatus(op.id, 'cancelled', 'Operation timed out');
    }

    return stuckOps.length;
  }
}
