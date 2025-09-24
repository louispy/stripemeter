import { describe, it, expect, vi, beforeEach } from 'vitest';
import path from 'node:path';
import fs from 'node:fs/promises';
import { filterByWindow, mapToUsage, readCsv, readJsonLines, toNumber, type InputRow, runReplay } from '../src/modules/run';

describe('helpers', () => {
  it('toNumber parses with default', () => {
    expect(toNumber('10', 5)).toBe(10);
    expect(toNumber(undefined, 5)).toBe(5);
    expect(toNumber('x', 7)).toBe(7);
  });

  it('mapToUsage maps fields correctly', () => {
    const row: InputRow = { customer: 'c1', meter: 'm1', qty: '2', ts: '2025-01-01T00:00:00Z' };
    const ev = mapToUsage(row, 'tenant-1');
    expect(ev.metric).toBe('m1');
    expect(ev.customerRef).toBe('c1');
    expect(ev.quantity).toBe(2);
    expect(ev.tenantId).toBe('tenant-1');
  });

  it('filterByWindow filters out old events', () => {
    const nowIso = new Date().toISOString();
    const oldIso = new Date(Date.now() - 48 * 3600 * 1000).toISOString();
    const kept = filterByWindow([
      { tenantId: 't', metric: 'm', customerRef: 'c', quantity: 1, ts: nowIso },
      { tenantId: 't', metric: 'm', customerRef: 'c', quantity: 1, ts: oldIso },
    ] as any, 24);
    expect(kept).toHaveLength(1);
  });
});

describe('readers', () => {
  const tmpDir = path.join(process.cwd(), '.tmp-tests');
  beforeEach(async () => { await fs.mkdir(tmpDir, { recursive: true }); });

  it('reads json lines', async () => {
    const file = path.join(tmpDir, 'events.jsonl');
    await fs.writeFile(file, '{"customer":"c","meter":"m","qty":1,"ts":"2025-01-01T00:00:00Z"}\n');
    const rows = await readJsonLines(file);
    expect(rows).toHaveLength(1);
    expect(rows[0].customer).toBe('c');
  });

  it('reads csv', async () => {
    const file = path.join(tmpDir, 'events.csv');
    await fs.writeFile(file, 'customer,meter,qty,ts\nc,m,1,2025-01-01T00:00:00Z\n');
    const rows = await readCsv(file);
    expect(rows).toHaveLength(1);
    expect(rows[0].meter).toBe('m');
  });
});

describe('runReplay integration (dry-run)', () => {
  it('returns 0 and prints counts in dry-run', async () => {
    const file = path.join(process.cwd(), '.tmp-tests', 'dry.csv');
    await fs.writeFile(file, 'customer,meter,qty,ts\nc,m,1,2025-01-01T00:00:00Z\n');
    const code = await runReplay({ input: file, format: 'csv', tenant: 't', dryRun: true });
    expect(code).toBe(0);
  });
});


