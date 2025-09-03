import { promises as fs } from 'fs';
import * as path from 'path';
import { ScenarioSchema, type Scenario } from './schema';
import { InvoiceSimulator } from '@stripemeter/pricing-lib';

interface RunOptions {
  scenario?: string;
  dir?: string;
  seed?: string;
  out?: string;
  record?: boolean;
}

function applySeed(seed?: string) {
  if (!seed) return;
  // Determinism placeholder; pricing-lib currently deterministic.
  process.env.SIM_SEED = seed;
}

async function writeJson(filePath: string, data: unknown) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

export async function runRun(opts: RunOptions): Promise<number> {
  const outDir = path.resolve(process.cwd(), opts.out ?? 'results');
  applySeed(opts.seed);

  const targets: string[] = [];
  if (opts.scenario) {
    targets.push(path.resolve(process.cwd(), opts.scenario));
  }
  if (opts.dir) {
    const dirPath = path.resolve(process.cwd(), opts.dir);
    const items = await fs.readdir(dirPath);
    for (const item of items) if (item.endsWith('.sim.json')) targets.push(path.join(dirPath, item));
  }
  if (targets.length === 0) {
    console.error('No scenario provided. Use --scenario <file> or --dir <directory>.');
    return 1;
  }

  let hadError = false;
  const simulator = new InvoiceSimulator();

  for (const file of targets) {
    try {
      const raw = await fs.readFile(file, 'utf8');
      const json = JSON.parse(raw);
      const parsed = ScenarioSchema.parse(json) as Scenario;

      const invoice = simulator.simulate({
        customerId: parsed.inputs.customerId,
        periodStart: parsed.inputs.periodStart,
        periodEnd: parsed.inputs.periodEnd,
        usageItems: parsed.inputs.usageItems,
        commitments: parsed.inputs.commitments,
        credits: parsed.inputs.credits,
        taxRate: parsed.inputs.taxRate,
      });

      const scenarioName = path.basename(file).replace(/\.sim\.json$/, '');
      const resultPath = path.join(outDir, `${scenarioName}.result.json`);
      await writeJson(resultPath, invoice);
      console.log(`Wrote ${resultPath}`);

      if (opts.record) {
        const expectedPath = path.join(path.dirname(file), `${scenarioName}.expected.json`);
        await writeJson(expectedPath, invoice);
        console.log(`Recorded expected -> ${expectedPath}`);
      }
    } catch (err: any) {
      hadError = true;
      console.error(`Failed to run scenario ${file}: ${err.message}`);
    }
  }

  return hadError ? 1 : 0;
}


