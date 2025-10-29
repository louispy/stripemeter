import { and, asc, desc, eq, sql } from 'drizzle-orm';
import { db } from '../client';
import {
  simulationScenarios,
  type SimulationScenario,
  type NewSimulationScenario,
  simulationRuns,
  type SimulationRun,
  type NewSimulationRun,
  simulationBatches,
  type SimulationBatch,
  type NewSimulationBatch,
  simulationAssertions,
  type SimulationAssertion,
  type NewSimulationAssertion,
} from '../schema';

export class SimulationsRepository {
  // Scenarios
  async createScenario(input: NewSimulationScenario): Promise<SimulationScenario> {
    const [created] = await db.insert(simulationScenarios).values(input).returning();
    return created;
  }

  async getScenarioById(tenantId: string, id: string): Promise<SimulationScenario | undefined> {
    const [row] = await db
      .select()
      .from(simulationScenarios)
      .where(and(eq(simulationScenarios.id, id), eq(simulationScenarios.tenantId, tenantId)))
      .limit(1);
    return row;
  }

  async listScenarios(params: {
    tenantId: string;
    active?: boolean;
    tag?: string;
    limit?: number;
    offset?: number;
    sortBy?: 'name' | 'createdAt' | 'updatedAt';
    sortOrder?: 'asc' | 'desc';
  }): Promise<{ scenarios: SimulationScenario[]; total: number }> {
    const { tenantId, active, tag, limit = 20, offset = 0, sortBy = 'createdAt', sortOrder = 'desc' } = params;

    const conditions = [eq(simulationScenarios.tenantId, tenantId)];
    if (active !== undefined) conditions.push(eq(simulationScenarios.active, active));
    if (tag) conditions.push(sql`${simulationScenarios.tags}::jsonb @> ${JSON.stringify([tag])}::jsonb`);

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(simulationScenarios)
      .where(and(...conditions));

    const getSortColumn = (field: string) => {
      switch (field) {
        case 'name':
          return simulationScenarios.name;
        case 'createdAt':
          return simulationScenarios.createdAt;
        case 'updatedAt':
          return simulationScenarios.updatedAt;
        default:
          return simulationScenarios.createdAt;
      }
    };
    const orderBy = sortOrder === 'desc' ? desc(getSortColumn(sortBy)) : asc(getSortColumn(sortBy));

    const scenarios = await db
      .select()
      .from(simulationScenarios)
      .where(and(...conditions))
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset);

    return { scenarios, total: Number(count) };
  }

  async updateScenario(tenantId: string, id: string, updates: Partial<NewSimulationScenario>): Promise<SimulationScenario | undefined> {
    const [updated] = await db
      .update(simulationScenarios)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(simulationScenarios.id, id), eq(simulationScenarios.tenantId, tenantId)))
      .returning();
    return updated;
  }

  async softDeleteScenario(tenantId: string, id: string, updatedBy?: string): Promise<void> {
    await db
      .update(simulationScenarios)
      .set({ active: false, updatedAt: new Date(), updatedBy })
      .where(and(eq(simulationScenarios.id, id), eq(simulationScenarios.tenantId, tenantId)));
  }

  // Runs
  async createRun(input: NewSimulationRun): Promise<Pick<SimulationRun, 'id' | 'status'>> {
    const [created] = await db
      .insert(simulationRuns)
      .values(input)
      .returning({ id: simulationRuns.id, status: simulationRuns.status });
    return created;
  }

  async getRunById(tenantId: string, id: string): Promise<SimulationRun | undefined> {
    const [row] = await db
      .select()
      .from(simulationRuns)
      .where(and(eq(simulationRuns.id, id), eq(simulationRuns.tenantId, tenantId)))
      .limit(1);
    return row;
  }

  async listRuns(params: {
    tenantId: string;
    scenarioId?: string;
    status?: string;
    runType?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ runs: SimulationRun[]; total: number }> {
    const { tenantId, scenarioId, status, runType, limit = 20, offset = 0 } = params;
    const conditions = [eq(simulationRuns.tenantId, tenantId)];
    if (scenarioId) conditions.push(eq(simulationRuns.scenarioId, scenarioId));
    if (status) conditions.push(eq(simulationRuns.status, status));
    if (runType) conditions.push(eq(simulationRuns.runType, runType));

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(simulationRuns)
      .where(and(...conditions));

    const runs = await db
      .select()
      .from(simulationRuns)
      .where(and(...conditions))
      .orderBy(desc(simulationRuns.createdAt))
      .limit(limit)
      .offset(offset);

    return { runs, total: Number(count) };
  }

  async updateRunResult(id: string, updates: Partial<SimulationRun>): Promise<void> {
    await db.update(simulationRuns).set(updates).where(eq(simulationRuns.id, id));
  }

  // Batches
  async createBatch(input: NewSimulationBatch): Promise<Pick<SimulationBatch, 'id' | 'totalRuns'>> {
    const [batch] = await db
      .insert(simulationBatches)
      .values(input)
      .returning({ id: simulationBatches.id, totalRuns: simulationBatches.totalRuns });
    return batch;
  }

  async getBatchById(tenantId: string, id: string): Promise<SimulationBatch | undefined> {
    const [row] = await db
      .select()
      .from(simulationBatches)
      .where(and(eq(simulationBatches.id, id), eq(simulationBatches.tenantId, tenantId)))
      .limit(1);
    return row;
  }

  async listRunsByBatch(tenantId: string, batchId: string): Promise<Array<Pick<SimulationRun, 'id' | 'status' | 'scenarioId' | 'passed' | 'error'>>> {
    const rows = await db
      .select({
        id: simulationRuns.id,
        status: simulationRuns.status,
        scenarioId: simulationRuns.scenarioId,
        passed: simulationRuns.passed,
        error: simulationRuns.error,
      })
      .from(simulationRuns)
      .where(and(eq(simulationRuns.tenantId, tenantId), sql`${simulationRuns.metadata}->>'batchId' = ${batchId}`));
    return rows;
  }

  // Assertions
  async createAssertionsForRun(runId: string, differences: Array<{ field: string; expected: unknown; actual: unknown; difference?: number }>): Promise<SimulationAssertion[]> {
    const toInsert: NewSimulationAssertion[] = differences.map((d) => ({
      runId,
      field: d.field,
      expected: d.expected as any,
      actual: d.actual as any,
      difference: typeof d.difference === 'number' ? String(d.difference) : null,
      passed: false,
    }));
    if (toInsert.length === 0) return [];
    const created = await db.insert(simulationAssertions).values(toInsert).returning();
    return created;
  }

  async listAssertionsByRun(runId: string): Promise<SimulationAssertion[]> {
    return db.select().from(simulationAssertions).where(eq(simulationAssertions.runId, runId));
  }
}


