import { Command } from 'commander';
import { runValidate } from './modules/validate';
import { runRun } from './modules/run';
import { runReport } from './modules/report';

const program = new Command();

program
  .name('sim')
  .description('Simulator CLI to run, validate, and report scenarios')
  .version('0.1.0');

program
  .command('validate')
  .description('Validate scenario files')
  .option('--scenario <path>', 'Path to a single scenario file (.sim.json)')
  .option('--dir <path>', 'Directory containing scenario files')
  .action(async (opts) => {
    const exitCode = await runValidate(opts);
    process.exit(exitCode);
  });

program
  .command('run')
  .description('Run scenarios offline and emit results')
  .option('--scenario <path>', 'Path to a single scenario file (.sim.json)')
  .option('--dir <path>', 'Directory containing scenario files')
  .option('--seed <seed>', 'Deterministic seed')
  .option('--out <dir>', 'Output directory for results', 'results')
  .option('--record', 'Record results as expected next to scenarios', false)
  .action(async (opts) => {
    const exitCode = await runRun(opts);
    process.exit(exitCode);
  });

program
  .command('report')
  .description('Diff results against expected artifacts')
  .option('--scenario <path>', 'Path to a single scenario file (.sim.json)')
  .option('--dir <path>', 'Directory containing scenario files')
  .option('--results <dir>', 'Directory containing results JSON', 'results')
  .option('--format <fmt>', 'Output format: table|json|md', 'table')
  .option('--fail-on-diff', 'Exit non-zero if diffs found', false)
  .action(async (opts) => {
    const exitCode = await runReport({
      scenario: opts.scenario,
      dir: opts.dir,
      results: opts.results,
      format: opts.format,
      failOnDiff: !!opts.failOnDiff,
    });
    process.exit(exitCode);
  });

program.parseAsync().catch((err) => {
  console.error(err);
  process.exit(1);
});


