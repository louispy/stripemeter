import { promises as fs } from 'fs';
import * as path from 'path';
import { collectScenarioFiles, loadScenarioFile } from '@stripemeter/simulator-core';
import { runScenario } from '@stripemeter/simulator-core';

interface RunOptions {
  scenario?: string;
  dir?: string;
  seed?: string;
  out?: string;
  record?: boolean;
}

function applySeed(seed?: string) {
  if (!seed) return;
  process.env.SIM_SEED = seed;
}

async function writeJson(filePath: string, data: unknown) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

export async function runRun(opts: RunOptions): Promise<number> {
  const outDir = path.resolve(process.cwd(), opts.out ?? 'results');
  applySeed(opts.seed);

  const targets = await collectScenarioFiles(opts);
  if (targets.length === 0) {
    console.error('No scenario provided. Use --scenario <file> or --dir <directory>.');
    return 1;
  }

  let hadError = false;
  

  for (const file of targets) {
    try {
      const parsed = await loadScenarioFile(file);
      const invoice = runScenario(parsed, { seed: opts.seed });

      const scenarioName = path.basename(file).replace(/\.sim\.(json|ya?ml)$/i, '');
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


