import { promises as fs } from 'fs';
import * as path from 'path';
import { ScenarioSchema } from './schema';

interface ReportOptions {
  scenario?: string;
  dir?: string;
  results?: string;
  format?: 'table' | 'json' | 'md';
  failOnDiff?: boolean;
}

type Invoice = {
  total: number;
  subtotal?: number;
  tax?: number;
  currency?: string;
  lineItems?: Array<{ metric: string; quantity: number; unitPrice?: number; subtotal?: number }>;
};

function approxEqual(a: number, b: number, abs = 0, rel = 0): boolean {
  const diff = Math.abs(a - b);
  if (diff <= abs) return true;
  const denom = Math.max(1, Math.abs(b));
  return diff / denom <= rel;
}

async function readJson(filePath: string): Promise<any> {
  const raw = await fs.readFile(filePath, 'utf8');
  return JSON.parse(raw);
}

function findExpectedPath(scenarioPath: string): string {
  const base = scenarioPath.replace(/\.sim\.json$/, '');
  return `${base}.expected.json`;
}

export async function runReport(opts: ReportOptions): Promise<number> {
  const resultsDir = path.resolve(process.cwd(), opts.results ?? 'results');
  const format = (opts.format ?? 'table') as 'table' | 'json' | 'md';

  const scenarios: string[] = [];
  if (opts.scenario) scenarios.push(path.resolve(process.cwd(), opts.scenario));
  if (opts.dir) {
    const dirPath = path.resolve(process.cwd(), opts.dir);
    const items = await fs.readdir(dirPath);
    for (const item of items) if (item.endsWith('.sim.json')) scenarios.push(path.join(dirPath, item));
  }
  if (scenarios.length === 0) {
    console.error('No scenario provided. Use --scenario <file> or --dir <directory>.');
    return 1;
  }

  let hadDiff = false;

  for (const scenarioPath of scenarios) {
    const name = path.basename(scenarioPath).replace(/\.sim\.json$/, '');
    const expectedPath = findExpectedPath(scenarioPath);
    const resultPath = path.join(resultsDir, `${name}.result.json`);

    try {
      // Pull tolerances from scenario if present; default to conservative values
      const scenarioRaw = await readJson(scenarioPath);
      const parsedScenario = ScenarioSchema.safeParse(scenarioRaw);
      const absTol = parsedScenario.success && parsedScenario.data.tolerances?.absolute !== undefined
        ? parsedScenario.data.tolerances.absolute
        : 0.001;
      const relTol = parsedScenario.success && parsedScenario.data.tolerances?.relative !== undefined
        ? parsedScenario.data.tolerances.relative
        : 0.0005;

      const expected: Invoice = await readJson(expectedPath);
      const actual: Invoice = await readJson(resultPath);

      const diffs: string[] = [];
      if (!approxEqual(actual.total, expected.total, absTol, relTol)) {
        diffs.push(`total: expected ${expected.total}, got ${actual.total}`);
      }
      if (expected.subtotal !== undefined && actual.subtotal !== undefined && !approxEqual(actual.subtotal, expected.subtotal, absTol, relTol)) {
        diffs.push(`subtotal: expected ${expected.subtotal}, got ${actual.subtotal}`);
      }
      if (expected.tax !== undefined && actual.tax !== undefined && !approxEqual(actual.tax, expected.tax, absTol, relTol)) {
        diffs.push(`tax: expected ${expected.tax}, got ${actual.tax}`);
      }

      if (format === 'json') {
        console.log(JSON.stringify({ scenario: name, diffs }, null, 2));
      } else if (format === 'md') {
        if (diffs.length === 0) {
          console.log(`| ${name} | OK |`);
        } else {
          console.log(`| ${name} | ${diffs.join('; ')} |`);
        }
      } else {
        if (diffs.length === 0) {
          console.log(`OK: ${name}`);
        } else {
          console.log(`DIFF: ${name}`);
          for (const d of diffs) console.log(` - ${d}`);
        }
      }

      if (diffs.length > 0) hadDiff = true;
    } catch (err: any) {
      console.error(`Failed to generate report for ${name}: ${err.message}`);
      hadDiff = true;
    }
  }

  return hadDiff && opts.failOnDiff ? 1 : 0;
}


