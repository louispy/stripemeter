import { InvoiceSimulator } from '@stripemeter/pricing-lib';
import type { Scenario } from './schema';

export interface RunOptions {
  seed?: string;
}

function applySeed(seed?: string) {
  if (!seed) return;
  process.env.SIM_SEED = seed;
}

export function runScenario(scenario: Scenario, opts?: RunOptions) {
  applySeed(opts?.seed);
  const simulator = new InvoiceSimulator();

  const invoice = simulator.simulate({
    customerId: scenario.inputs.customerId,
    periodStart: scenario.inputs.periodStart,
    periodEnd: scenario.inputs.periodEnd,
    usageItems: scenario.inputs.usageItems,
    commitments: scenario.inputs.commitments,
    credits: scenario.inputs.credits,
    taxRate: scenario.inputs.taxRate,
  });

  return invoice;
}


