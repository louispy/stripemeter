import { describe, it, expect } from 'vitest';
import { ScenarioSchema } from '../src/schema';
import { loadScenarioFile } from '../src/parser';
import { runScenario } from '../src/runner';
import { promises as fs } from 'fs';
import * as path from 'path';

const tmp = async (name: string, content: string) => {
  const p = path.join(process.cwd(), '.tmp', name);
  await fs.mkdir(path.dirname(p), { recursive: true });
  await fs.writeFile(p, content, 'utf8');
  return p;
};

const jsonScenario = {
  metadata: { name: 'Flat 1000' },
  inputs: {
    customerId: 'c1',
    periodStart: '2024-01-01',
    periodEnd: '2024-01-31',
    usageItems: [
      { metric: 'api_calls', quantity: 1000, priceConfig: { model: 'flat', currency: 'USD', unitPrice: 0.01 } },
    ],
  },
  expected: { total: 10 },
};

const yamlScenario = `
metadata:
  name: Flat 1000
inputs:
  customerId: c1
  periodStart: '2024-01-01'
  periodEnd: '2024-01-31'
  usageItems:
    - metric: api_calls
      quantity: 1000
      priceConfig:
        model: flat
        currency: USD
        unitPrice: 0.01
expected:
  total: 10
`;

describe('simulator-core schema and runner', () => {
  it('validates JSON and YAML with the same schema', async () => {
    const parsedJson = ScenarioSchema.parse(jsonScenario);
    expect(parsedJson.metadata.name).toBe('Flat 1000');

    const yPath = await tmp('scenario.sim.yaml', yamlScenario);
    const parsedYaml = await loadScenarioFile(yPath);
    expect(parsedYaml.metadata.name).toBe('Flat 1000');
  });

  it('runs deterministically for simple flat scenario', async () => {
    const jPath = await tmp('scenario.sim.json', JSON.stringify(jsonScenario));
    const scenario = await loadScenarioFile(jPath);
    const result = runScenario(scenario, { seed: '42' });
    expect(result.total).toBe(10);
  });
});


