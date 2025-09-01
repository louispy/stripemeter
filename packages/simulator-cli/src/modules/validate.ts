import { promises as fs } from 'fs';
import * as path from 'path';
import { ScenarioSchema } from './schema';

interface ValidateOptions {
  scenario?: string;
  dir?: string;
}

export async function runValidate(opts: ValidateOptions): Promise<number> {
  const targets: string[] = [];

  if (opts.scenario) {
    targets.push(path.resolve(process.cwd(), opts.scenario));
  }

  if (opts.dir) {
    const dirPath = path.resolve(process.cwd(), opts.dir);
    const items = await fs.readdir(dirPath);
    for (const item of items) {
      if (item.endsWith('.sim.json')) {
        targets.push(path.join(dirPath, item));
      }
    }
  }

  if (targets.length === 0) {
    console.error('No scenario provided. Use --scenario <file> or --dir <directory>.');
    return 1;
  }

  let hadError = false;

  for (const file of targets) {
    try {
      const raw = await fs.readFile(file, 'utf8');
      const json = JSON.parse(raw);
      const result = ScenarioSchema.safeParse(json);
      if (!result.success) {
        hadError = true;
        console.error(`Validation failed for ${file}:`);
        for (const issue of result.error.issues) {
          console.error(` - ${issue.path.join('.')}: ${issue.message}`);
        }
      } else {
        console.log(`OK: ${file}`);
      }
    } catch (err: any) {
      hadError = true;
      console.error(`Error reading ${file}: ${err.message}`);
    }
  }

  return hadError ? 1 : 0;
}


