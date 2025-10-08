/**
 * Assertions utilities for simulator invoice comparisons
 */

export type Tolerances = {
  absolute?: number; // absolute currency difference threshold
  relative?: number; // relative threshold in [0,1]
};

export type InvoiceLineItemLike = {
  metric: string;
  quantity: number;
  unitPrice?: number;
  subtotal?: number;
};

export type InvoiceLike = {
  total: number;
  subtotal?: number;
  tax?: number;
  currency?: string;
  lineItems?: InvoiceLineItemLike[];
};

export type Difference = {
  field: string; // e.g., "total", "lineItem.api_calls.subtotal"
  expected: unknown;
  actual: unknown;
  difference?: number; // numeric diff when applicable
};

export type ComparisonResult = {
  passed: boolean;
  differences: Difference[];
};

export const DEFAULT_ASSERT_ABSOLUTE_TOLERANCE = 0.001; // $0.001
export const DEFAULT_ASSERT_RELATIVE_TOLERANCE = 0.0005; // 0.05%

export function approxEqual(
  a: number,
  b: number,
  tolerances?: Tolerances
): boolean {
  const absolute = tolerances?.absolute ?? DEFAULT_ASSERT_ABSOLUTE_TOLERANCE;
  const relative = tolerances?.relative ?? DEFAULT_ASSERT_RELATIVE_TOLERANCE;
  const diff = Math.abs(a - b);
  if (diff <= absolute) return true;
  const denom = Math.max(1, Math.abs(b));
  return diff / denom <= relative;
}

export function compareInvoices(
  actual: InvoiceLike,
  expected: Partial<InvoiceLike> & { total?: number },
  opts?: { tolerances?: Tolerances }
): ComparisonResult {
  const differences: Difference[] = [];
  const t = opts?.tolerances;

  // total
  if (expected.total !== undefined && !approxEqual(actual.total, expected.total, t)) {
    differences.push({ field: 'total', expected: expected.total, actual: actual.total, difference: Math.abs(actual.total - expected.total) });
  }

  // subtotal
  if (expected.subtotal !== undefined && actual.subtotal !== undefined && !approxEqual(actual.subtotal, expected.subtotal, t)) {
    differences.push({ field: 'subtotal', expected: expected.subtotal, actual: actual.subtotal, difference: Math.abs(actual.subtotal - expected.subtotal) });
  }

  // tax
  if (expected.tax !== undefined && actual.tax !== undefined && !approxEqual(actual.tax, expected.tax, t)) {
    differences.push({ field: 'tax', expected: expected.tax, actual: actual.tax, difference: Math.abs(actual.tax - expected.tax) });
  }

  // currency exact match if provided in expected
  if (expected.currency !== undefined && actual.currency !== expected.currency) {
    differences.push({ field: 'currency', expected: expected.currency, actual: actual.currency });
  }

  // line items by metric
  if (expected.lineItems && Array.isArray(expected.lineItems)) {
    const actualItems = actual.lineItems ?? [];
    for (const expItem of expected.lineItems) {
      const actItem = actualItems.find((li) => li.metric === expItem.metric);
      if (!actItem) {
        differences.push({ field: `lineItem.${expItem.metric}`, expected: expItem, actual: null });
        continue;
      }

      if (expItem.subtotal !== undefined && actItem.subtotal !== undefined && !approxEqual(actItem.subtotal, expItem.subtotal, t)) {
        differences.push({ field: `lineItem.${expItem.metric}.subtotal`, expected: expItem.subtotal, actual: actItem.subtotal, difference: Math.abs((actItem.subtotal ?? 0) - (expItem.subtotal ?? 0)) });
      }

      if (expItem.unitPrice !== undefined && actItem.unitPrice !== undefined && !approxEqual(actItem.unitPrice, expItem.unitPrice, t)) {
        differences.push({ field: `lineItem.${expItem.metric}.unitPrice`, expected: expItem.unitPrice, actual: actItem.unitPrice, difference: Math.abs((actItem.unitPrice ?? 0) - (expItem.unitPrice ?? 0)) });
      }

      if (expItem.quantity !== undefined && actItem.quantity !== expItem.quantity) {
        differences.push({ field: `lineItem.${expItem.metric}.quantity`, expected: expItem.quantity, actual: actItem.quantity, difference: Math.abs(actItem.quantity - expItem.quantity) });
      }
    }
  }

  return { passed: differences.length === 0, differences };
}

export function formatDifferences(differences: Difference[]): string[] {
  return differences.map((d) => {
    const path = d.field;
    if (typeof d.expected === 'number' && typeof d.actual === 'number') {
      return `${path}: expected ${d.expected}, got ${d.actual}`;
    }
    return `${path}: expected ${JSON.stringify(d.expected)}, got ${JSON.stringify(d.actual)}`;
  });
}


