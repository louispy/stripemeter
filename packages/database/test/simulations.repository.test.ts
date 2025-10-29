import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../src/client', () => {
  const calls: any[] = [];
  const makeChain = () => ({
    values: vi.fn().mockReturnThis(),
    returning: vi.fn(),
    onConflictDoNothing: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    offset: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
  });

  const insertChain: any = makeChain();
  const selectChain: any = makeChain();
  const updateChain: any = makeChain();

  const db = {
    insert: vi.fn(() => insertChain),
    select: vi.fn(() => selectChain),
    update: vi.fn(() => updateChain),
    from: vi.fn().mockReturnThis(),
  } as unknown as any;

  return { db };
});

import { db } from '../src/client';
import { SimulationsRepository } from '../src/repositories/simulations.repository';
import { simulationScenarios, simulationRuns, simulationAssertions, simulationBatches } from '../src/schema';

describe('SimulationsRepository', () => {
  const repo = new SimulationsRepository();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a scenario', async () => {
    (db.insert(simulationScenarios).returning as any).mockResolvedValueOnce([
      { id: 's1', tenantId: 't1', name: 'Test', active: true },
    ]);

    const created = await repo.createScenario({ tenantId: 't1', name: 'Test', model: {}, inputs: {} } as any);
    expect(created.id).toBe('s1');
    expect(db.insert).toHaveBeenCalledWith(simulationScenarios);
  });

  it('lists scenarios with filters and returns total', async () => {
    (db.select as any).mockReturnValueOnce({ from: () => ({ where: () => Promise.resolve([{ count: 2 }]) }) });
    (db.select as any).mockReturnValueOnce({
      from: () => ({ where: () => ({ orderBy: () => ({ limit: () => ({ offset: () => Promise.resolve([{ id: 'a' }, { id: 'b' }]) }) }) }) }),
    });

    const res = await repo.listScenarios({ tenantId: 't1', active: true, limit: 2, offset: 0 });
    expect(res.total).toBe(2);
    expect(res.scenarios.length).toBe(2);
  });

  it('creates a run and returns id and status', async () => {
    (db.insert(simulationRuns).returning as any).mockResolvedValueOnce([{ id: 'r1', status: 'pending' }]);
    const created = await repo.createRun({ tenantId: 't1', scenarioSnapshot: {}, runType: 'manual', status: 'pending' } as any);
    expect(created).toEqual({ id: 'r1', status: 'pending' });
  });

  it('creates assertions for a run', async () => {
    (db.insert(simulationAssertions).returning as any).mockResolvedValueOnce([
      { id: 'a1', runId: 'r1', field: 'total', passed: false },
    ]);
    const created = await repo.createAssertionsForRun('r1', [
      { field: 'total', expected: 10, actual: 12, difference: 2 },
    ]);
    expect(created.length).toBe(1);
    expect(db.insert).toHaveBeenCalledWith(simulationAssertions);
  });

  it('creates a batch and returns id and totalRuns', async () => {
    (db.insert(simulationBatches).returning as any).mockResolvedValueOnce([{ id: 'b1', totalRuns: 3 }]);
    const created = await repo.createBatch({ tenantId: 't1', name: 'batch', scenarioIds: [], totalRuns: 3, status: 'pending' } as any);
    expect(created).toEqual({ id: 'b1', totalRuns: 3 });
  });
});


