import { Command } from 'commander';
import { runReplay } from './modules/run';

const program = new Command();

program
  .name('replay')
  .description('Backfill/replay CLI to safely resend usage events (CSV/JSONL)')
  .version('0.1.0');

program
  .option('--input <path>', 'Input file path (CSV or JSON lines)')
  .option('--format <format>', 'Input format: csv|json', 'csv')
  .option('--tenant <id>', 'Tenant ID (required)')
  .option('--api-url <url>', 'API base URL', 'http://localhost:3000')
  .option('--api-key <key>', 'API key for auth')
  .option('--window-hours <n>', 'Consider only events in the last N hours', '24')
  .option('--concurrency <n>', 'Concurrent requests', '5')
  .option('--rate <rps>', 'Max requests per second', '10')
  .option('--batch-size <n>', 'Batch size per ingest request', '100')
  .option('--dry-run', 'Do not send, just simulate and report', false)
  .action(async (opts) => {
    const exit = await runReplay(opts);
    process.exit(exit);
  });

program.parseAsync().catch((err) => {
  console.error(err);
  process.exit(1);
});


