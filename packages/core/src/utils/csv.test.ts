import { describe, it, expect } from 'vitest';
import { generateEventsCsv } from './csv';

describe('generateEventsCsv', () => {
  it('generates CSV with headers and rows', () => {
    const csv = generateEventsCsv([
      {
        tenantId: 't1',
        metric: 'api_calls',
        customerRef: 'c1',
        quantity: 100,
        ts: '2024-01-01T00:00:00Z',
        meta: { region: 'us' },
      },
      {
        tenantId: 't1',
        metric: 'api_calls',
        customerRef: 'c2',
        resourceId: 'r2',
        quantity: 200,
        ts: '2024-01-02T00:00:00Z',
        source: 'import',
        idempotencyKey: 'k2',
      },
    ]);

    const lines = csv.split('\n');
    expect(lines[0]).toBe('tenantId,metric,customerRef,resourceId,quantity,ts,source,meta,idempotencyKey');
    expect(lines.length).toBe(3);
    expect(lines[1]).toContain('t1');
    expect(lines[1]).toContain('api_calls');
    expect(lines[1]).toContain('c1');
    expect(lines[1]).toContain('100');
    expect(lines[1]).toContain('2024-01-01T00:00:00Z');
    expect(lines[2]).toContain('r2');
    expect(lines[2]).toContain('200');
    expect(lines[2]).toContain('k2');
  });
});


