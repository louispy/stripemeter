import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import * as path from 'path';
import * as os from 'os';
import { runReport } from '../modules/report';

async function makeTempDir(): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'stripemeter-sim-report-'));
  return dir;
}

async function writeJson(filePath: string, data: unknown) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

describe('runReport', () => {
  let tmp: string;
  let consoleLogSpy: any;

  beforeEach(async () => {
    tmp = await makeTempDir();
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(async () => {
    consoleLogSpy.mockRestore();
    // best-effort cleanup
    try {
      await fs.rm(tmp, { recursive: true, force: true });
    } catch {}
  });

  async function createScenarioWithResults(name: string, expectedTotal: number, actualTotal: number) {
    const scenarioPath = path.join(tmp, `${name}.sim.json`);
    const expectedPath = path.join(tmp, `${name}.expected.json`);
    const resultsDir = path.join(tmp, 'results');
    const resultPath = path.join(resultsDir, `${name}.result.json`);

    const scenario = {
      metadata: { name },
      inputs: {
        customerId: 'cust_123',
        periodStart: '2024-01-01',
        periodEnd: '2024-01-31',
        usageItems: [],
      },
      expected: { total: expectedTotal },
    };

    await writeJson(scenarioPath, scenario);
    await writeJson(expectedPath, { total: expectedTotal });
    await writeJson(resultPath, { total: actualTotal });

    return { scenarioPath, expectedPath, resultsDir, resultPath };
  }

  it('emits aggregated JSON to stdout when format=json', async () => {
    await createScenarioWithResults('ok-scenario', 100, 100);
    let payloadText = '';
    consoleLogSpy.mockImplementation((...args: any[]) => {
      payloadText += args.join(' ');
    });

    const code = await runReport({ dir: tmp, results: path.join(tmp, 'results'), format: 'json' });
    expect(code).toBe(0);
    expect(payloadText).toBeTruthy();
    const parsed = JSON.parse(payloadText);
    expect(parsed.summary.total).toBe(1);
    expect(parsed.summary.diffs).toBe(0);
    expect(parsed.results[0].scenario).toBe('ok-scenario');
    expect(parsed.results[0].diffs.length).toBe(0);
  });

  it('returns non-zero when diffs exist and failOnDiff is true', async () => {
    await createScenarioWithResults('diff-scenario', 100, 101);
    const code = await runReport({ dir: tmp, results: path.join(tmp, 'results'), format: 'table', failOnDiff: true });
    expect(code).toBe(1);
  });

  it('writes HTML when format=html and out is set', async () => {
    await createScenarioWithResults('ok-html', 100, 100);
    const out = path.join(tmp, 'report.html');
    const code = await runReport({ dir: tmp, results: path.join(tmp, 'results'), format: 'html', out });
    expect(code).toBe(0);
    const html = await fs.readFile(out, 'utf8');
    expect(html).toContain('<html');
    expect(html).toContain('ok-html');
    expect(html).toMatch(/Total: 1/);
  });

  it('writes Markdown when format=md and out is set', async () => {
    await createScenarioWithResults('ok-md', 50, 50);
    const out = path.join(tmp, 'report.md');
    const code = await runReport({ dir: tmp, results: path.join(tmp, 'results'), format: 'md', out });
    expect(code).toBe(0);
    const md = await fs.readFile(out, 'utf8');
    expect(md).toContain('| Scenario | Result |');
    expect(md).toContain('| ok-md | OK |');
  });
});


