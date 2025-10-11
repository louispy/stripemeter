export interface CsvEventRow {
  tenantId: string;
  metric: string;
  customerRef: string;
  resourceId?: string;
  quantity: number;
  ts: string; // ISO 8601
  source?: string;
  meta?: Record<string, any>;
  idempotencyKey?: string;
}

/**
 * Generate CSV string matching the backfill parser schema.
 */
export function generateEventsCsv(rows: CsvEventRow[]): string {
  const headers = [
    'tenantId',
    'metric',
    'customerRef',
    'resourceId',
    'quantity',
    'ts',
    'source',
    'meta',
    'idempotencyKey',
  ];

  const lines = [headers.join(',')];
  for (const r of rows) {
    const values = [
      r.tenantId,
      r.metric,
      r.customerRef,
      r.resourceId ?? '',
      String(r.quantity),
      r.ts,
      r.source ?? 'import',
      r.meta ? JSON.stringify(r.meta) : '',
      r.idempotencyKey ?? '',
    ];
    lines.push(values.map(escapeCsvValue).join(','));
  }
  return lines.join('\n');
}

function escapeCsvValue(v: string): string {
  if (v.includes(',') || v.includes('"') || v.includes('\n')) {
    return '"' + v.replace(/"/g, '""') + '"';
  }
  return v;
}


