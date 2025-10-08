import { describe, it, expect } from 'vitest';
import { approxEqual, compareInvoices, formatDifferences } from './assertions';

describe('assertions.approxEqual', () => {
  it('treats values within absolute tolerance as equal', () => {
    expect(approxEqual(100.0004, 100.0005, { absolute: 0.001 })).toBe(true);
  });
  it('uses relative tolerance when absolute fails', () => {
    // 1% relative tolerance allows 101 vs 100
    expect(approxEqual(101, 100, { absolute: 0, relative: 0.02 })).toBe(true);
  });
  it('fails when outside tolerances', () => {
    expect(approxEqual(1.1, 1, { absolute: 0.05, relative: 0.05 })).toBe(false);
  });
});

describe('assertions.compareInvoices', () => {
  it('passes when totals match within tolerances', () => {
    const actual = { total: 100.001 };
    const expected = { total: 100.0 };
    const res = compareInvoices(actual, expected, { tolerances: { absolute: 0.01 } });
    expect(res.passed).toBe(true);
    expect(res.differences.length).toBe(0);
  });

  it('reports total difference when outside tolerance', () => {
    const actual = { total: 100.02 };
    const expected = { total: 100.0 };
    const res = compareInvoices(actual, expected, { tolerances: { absolute: 0.001, relative: 0.0001 } });
    expect(res.passed).toBe(false);
    expect(res.differences[0].field).toBe('total');
  });

  it('checks subtotal and tax with approx comparison', () => {
    const actual = { total: 110, subtotal: 100.001, tax: 9.999 };
    const expected = { total: 110, subtotal: 100.0, tax: 10.0 };
    const res = compareInvoices(actual, expected, { tolerances: { absolute: 0.01 } });
    expect(res.passed).toBe(true);
  });

  it('compares currency when provided', () => {
    const actual = { total: 10, currency: 'USD' };
    const expected = { total: 10, currency: 'EUR' } as any;
    const res = compareInvoices(actual, expected);
    expect(res.passed).toBe(false);
    expect(res.differences.some(d => d.field === 'currency')).toBe(true);
  });

  it('diffs line items by metric for subtotal and quantity', () => {
    const actual = {
      total: 30,
      lineItems: [
        { metric: 'api_calls', quantity: 350, subtotal: 30 },
      ],
    };
    const expected = {
      total: 30,
      lineItems: [
        { metric: 'api_calls', quantity: 350, subtotal: 30.005 }, // within 0.01 abs tol
        { metric: 'storage_gb', quantity: 10, subtotal: 1 }, // missing in actual
      ],
    } as any;
    const res = compareInvoices(actual, expected, { tolerances: { absolute: 0.01 } });
    // subtotal within tol => no diff; missing storage_gb => diff
    expect(res.passed).toBe(false);
    expect(res.differences.some(d => d.field === 'lineItem.storage_gb')).toBe(true);
  });
});

describe('assertions.formatDifferences', () => {
  it('formats numeric and non-numeric diffs', () => {
    const diffs = [
      { field: 'total', expected: 10, actual: 11, difference: 1 },
      { field: 'currency', expected: 'USD', actual: 'EUR' },
    ];
    const lines = formatDifferences(diffs);
    expect(lines[0]).toContain('total: expected 10, got 11');
    expect(lines[1]).toContain('currency: expected');
  });
});


