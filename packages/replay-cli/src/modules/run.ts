import fs from 'node:fs/promises';
import path from 'node:path';
import { parse as csvParse } from 'csv-parse';
import { createClient, type UsageEvent } from '@stripemeter/sdk-node';
import PQueue from 'p-queue';

export interface ReplayOptions {
  input?: string;
  format?: 'csv'|'json';
  tenant?: string;
  apiUrl?: string;
  apiKey?: string;
  windowHours?: string|number;
  concurrency?: string|number;
  rate?: string|number;
  batchSize?: string|number;
  dryRun?: boolean;
}

export function toNumber(val: string|number|undefined, def: number): number {
  const n = typeof val === 'string' ? parseInt(val, 10) : (typeof val === 'number' ? val : NaN);
  return Number.isFinite(n) ? Number(n) : def;
}

export type InputRow = { id?: string; customer: string; meter: string; qty: number|string; ts: string; resourceId?: string; meta?: any; };

export async function readJsonLines(filePath: string): Promise<InputRow[]> {
  const raw = await fs.readFile(filePath, 'utf8');
  return raw
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l.length > 0)
    .map(l => JSON.parse(l));
}

export async function readCsv(filePath: string): Promise<InputRow[]> {
  const raw = await fs.readFile(filePath, 'utf8');
  return new Promise((resolve, reject) => {
    csvParse(raw, { columns: true, trim: true }, (err, records: any[]) => {
      if (err) return reject(err);
      resolve(records as InputRow[]);
    });
  });
}

export function mapToUsage(row: InputRow, tenantId: string): UsageEvent {
  return {
    tenantId,
    metric: row.meter,
    customerRef: row.customer,
    resourceId: row.resourceId,
    quantity: typeof row.qty === 'string' ? Number(row.qty) : row.qty,
    ts: new Date(row.ts).toISOString(),
    meta: row.meta,
    idempotencyKey: row.id,
    source: 'etl',
  };
}

export function filterByWindow(events: UsageEvent[], windowHours: number): UsageEvent[] {
  const now = Date.now();
  const minTs = now - windowHours * 3600 * 1000;
  return events.filter(ev => new Date(ev.ts).getTime() >= minTs);
}

export async function runReplay(opts: ReplayOptions): Promise<number> {
  const input = opts.input ? path.resolve(process.cwd(), opts.input) : undefined;
  const format = (opts.format ?? 'csv') as 'csv'|'json';
  const tenantId = opts.tenant;
  if (!tenantId) {
    console.error('Missing --tenant');
    return 2;
  }
  if (!input) {
    console.error('Missing --input');
    return 2;
  }

  const windowHours = toNumber(opts.windowHours, 24);
  const concurrency = toNumber(opts.concurrency, 5);
  const rate = toNumber(opts.rate, 10);
  const batchSize = toNumber(opts.batchSize, 100);
  const dryRun = Boolean(opts.dryRun);

  let rows: InputRow[] = [];
  try {
    rows = format === 'csv' ? await readCsv(input) : await readJsonLines(input);
  } catch (e: any) {
    console.error('Failed to read input:', e.message);
    return 1;
  }

  const usage = rows.map(r => mapToUsage(r, tenantId));
  const filtered = filterByWindow(usage, windowHours);

  if (dryRun) {
    console.log(JSON.stringify({ total: rows.length, considered: filtered.length }, null, 2));
    return 0;
  }

  const apiUrl = opts.apiUrl || 'http://localhost:3000';
  const apiKey = opts.apiKey || process.env.STRIPEMETER_API_KEY || '';
  const client = createClient({ apiUrl, apiKey, tenantId, batchSize });

  let sent = 0;
  let duplicates = 0;
  let errors = 0;

  const queue = new PQueue({ concurrency, interval: 1000, intervalCap: rate });

  for (let i = 0; i < filtered.length; i += batchSize) {
    const batch = filtered.slice(i, i + batchSize).map(e => ({ ...e, source: 'etl' as const }));
    queue.add(async () => {
      try {
        const res = await client.trackBatch(batch.map(({ tenantId: _t, ...rest }) => rest));
        sent += (res as any).accepted || 0;
        duplicates += (res as any).duplicates || 0;
      } catch (_e) {
        errors += batch.length;
      }
    });
  }

  await queue.onIdle();

  console.log(JSON.stringify({ total: rows.length, considered: filtered.length, sent, duplicates, errors }, null, 2));

  return errors > 0 ? 1 : 0;
}


