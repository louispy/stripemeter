import { promises as fs } from 'fs';
import * as path from 'path';
import { ScenarioSchema } from '@stripemeter/simulator-core';
import { compareInvoices, formatDifferences } from '@stripemeter/core';

interface ReportOptions {
  scenario?: string;
  dir?: string;
  results?: string;
  format?: 'table' | 'json' | 'md' | 'html';
  failOnDiff?: boolean;
  out?: string;
}

type Invoice = {
  total: number;
  subtotal?: number;
  tax?: number;
  currency?: string;
  lineItems?: Array<{ metric: string; quantity: number; unitPrice?: number; subtotal?: number }>;
};

type ScenarioDiff = {
  scenario: string;
  diffs: string[];
};

// Numeric comparison now handled by core assertions

async function readJson(filePath: string): Promise<any> {
  const raw = await fs.readFile(filePath, 'utf8');
  return JSON.parse(raw);
}

function findExpectedPath(scenarioPath: string): string {
  const base = scenarioPath.replace(/\.sim\.json$/, '');
  return `${base}.expected.json`;
}

function buildHtml(results: ScenarioDiff[]): string {
  const total = results.length;
  const diffCount = results.filter((r) => r.diffs.length > 0).length;
  const okCount = total - diffCount;

  const rows = results
    .map((r) => {
      const status = r.diffs.length === 0 ? 'OK' : 'DIFF';
      const details = r.diffs.length === 0 ? '' : r.diffs.join('; ');
      return `<tr><td>${escapeHtml(r.scenario)}</td><td class="${status.toLowerCase()}">${status}</td><td>${escapeHtml(details)}</td></tr>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Simulator Report</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Arial, sans-serif; margin: 24px; }
    h1 { font-size: 20px; margin: 0 0 12px; }
    .summary { margin-bottom: 16px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { text-align: left; padding: 8px; border-bottom: 1px solid #e5e7eb; vertical-align: top; }
    th { background: #f9fafb; }
    .ok { color: #047857; font-weight: 600; }
    .diff { color: #b91c1c; font-weight: 600; }
    .meta { color: #6b7280; }
  </style>
  </head>
  <body>
    <h1>Simulator Report</h1>
    <div class="summary meta">Total: ${total} • OK: ${okCount} • Diffs: ${diffCount}</div>
    <table>
      <thead>
        <tr><th>Scenario</th><th>Status</th><th>Details</th></tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  </body>
</html>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function buildMarkdown(results: ScenarioDiff[]): string {
  const header = '| Scenario | Result |\n|---|---|';
  const rows = results
    .map((r) => {
      if (r.diffs.length === 0) return `| ${r.scenario} | OK |`;
      return `| ${r.scenario} | ${r.diffs.join('; ')} |`;
    })
    .join('\n');
  return `${header}\n${rows}\n`;
}

async function writeOutFile(outPath: string, contents: string | object): Promise<void> {
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  const payload = typeof contents === 'string' ? contents : JSON.stringify(contents, null, 2) + '\n';
  await fs.writeFile(outPath, payload, 'utf8');
}

export async function runReport(opts: ReportOptions): Promise<number> {
  const resultsDir = path.resolve(process.cwd(), opts.results ?? 'results');
  const format = (opts.format ?? 'table') as 'table' | 'json' | 'md' | 'html';

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
  const results: ScenarioDiff[] = [];

  for (const scenarioPath of scenarios) {
    const name = path.basename(scenarioPath).replace(/\.sim\.json$/, '');
    const expectedPath = findExpectedPath(scenarioPath);
    const resultPath = path.join(resultsDir, `${name}.result.json`);

    try {
      const scenarioRaw = await readJson(scenarioPath);
      const parsedScenario = ScenarioSchema.safeParse(scenarioRaw);
      const expected: Invoice = await readJson(expectedPath);
      const actual: Invoice = await readJson(resultPath);

      const comp = compareInvoices(actual as any, expected as any, {
        tolerances: parsedScenario.success ? parsedScenario.data.tolerances : undefined,
      });
      const diffs = formatDifferences(comp.differences);
      results.push({ scenario: name, diffs });
      if (diffs.length > 0) hadDiff = true;
    } catch (err: any) {
      results.push({ scenario: name, diffs: [`error: ${err.message}`] });
      hadDiff = true;
    }
  }

  const summary = {
    total: results.length,
    diffs: results.filter((r) => r.diffs.length > 0).length,
    ok: results.filter((r) => r.diffs.length === 0).length,
  };

  // Render and emit
  if (format === 'json') {
    const payload = { summary, results };
    if (opts.out) {
      await writeOutFile(path.resolve(process.cwd(), opts.out), payload);
    } else {
      console.log(JSON.stringify(payload, null, 2));
    }
  } else if (format === 'md') {
    const md = buildMarkdown(results);
    if (opts.out) {
      await writeOutFile(path.resolve(process.cwd(), opts.out), md);
    } else {
      process.stdout.write(md);
    }
  } else if (format === 'html') {
    const html = buildHtml(results);
    if (opts.out) {
      await writeOutFile(path.resolve(process.cwd(), opts.out), html);
    } else {
      process.stdout.write(html);
    }
  } else {
    // table (stdout pretty)
    for (const r of results) {
      if (r.diffs.length === 0) {
        console.log(`OK: ${r.scenario}`);
      } else {
        console.log(`DIFF: ${r.scenario}`);
        for (const d of r.diffs) console.log(` - ${d}`);
      }
    }
  }

  return hadDiff && opts.failOnDiff ? 1 : 0;
}


