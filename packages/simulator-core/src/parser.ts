import { promises as fs } from 'fs';
import * as path from 'path';
import yaml from 'js-yaml';
import { ScenarioSchema, type Scenario } from './schema';

export type ParsedScenario = Scenario;

export async function loadScenarioFile(filePath: string): Promise<ParsedScenario> {
  const ext = path.extname(filePath).toLowerCase();
  const raw = await fs.readFile(filePath, 'utf8');

  let data: any;
  if (ext === '.yaml' || ext === '.yml') {
    data = yaml.load(raw);
  } else {
    data = JSON.parse(raw);
  }

  return ScenarioSchema.parse(data);
}

export async function collectScenarioFiles(target: { scenario?: string; dir?: string }): Promise<string[]> {
  const targets: string[] = [];
  if (target.scenario) targets.push(path.resolve(process.cwd(), target.scenario));
  if (target.dir) {
    const dirPath = path.resolve(process.cwd(), target.dir);
    const items = await fs.readdir(dirPath);
    for (const item of items) {
      if (item.endsWith('.sim.json') || item.endsWith('.sim.yaml') || item.endsWith('.sim.yml')) {
        targets.push(path.join(dirPath, item));
      }
    }
  }
  return targets;
}


