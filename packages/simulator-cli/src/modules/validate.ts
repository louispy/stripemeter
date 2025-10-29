import { ScenarioSchema } from '@stripemeter/simulator-core';
import { collectScenarioFiles, loadScenarioFile } from '@stripemeter/simulator-core';

interface ValidateOptions {
  scenario?: string;
  dir?: string;
}

export async function runValidate(opts: ValidateOptions): Promise<number> {
  const targets: string[] = [];
  targets.push(...(await collectScenarioFiles(opts)));

  if (targets.length === 0) {
    console.error('No scenario provided. Use --scenario <file> or --dir <directory>.');
    return 1;
  }

  let hadError = false;

  for (const file of targets) {
    try {
      const parsed = await loadScenarioFile(file);
      const result = ScenarioSchema.safeParse(parsed);
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


