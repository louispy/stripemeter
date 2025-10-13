import { Command } from 'commander';
import axios from 'axios';

const program = new Command();

program
  .name('sm-ops')
  .description('Stripemeter operator CLI for adjustments')
  .version('0.1.0');

program
  .command('adjustments:create')
  .requiredOption('--tenant <id>', 'Tenant ID')
  .requiredOption('--metric <metric>', 'Metric')
  .requiredOption('--customer <ref>', 'Customer ref')
  .requiredOption('--period <YYYY-MM-DD>', 'Period start date')
  .requiredOption('--delta <number>', 'Delta')
  .requiredOption('--reason <reason>', 'Reason')
  .option('--api-url <url>', 'API base URL', 'http://localhost:3000')
  .option('--api-key <key>', 'API key')
  .option('--note <text>', 'Note')
  .action(async (opts) => {
    const http = axios.create({
      baseURL: opts.apiUrl,
      headers: {
        'Content-Type': 'application/json',
        ...(opts.apiKey ? { Authorization: `Bearer ${opts.apiKey}` } : {}),
      },
      timeout: 10000,
    });
    const res = await http.post('/v1/adjustments', {
      tenantId: opts.tenant,
      metric: opts.metric,
      customerRef: opts.customer,
      periodStart: opts.period,
      delta: Number(opts.delta),
      reason: opts.reason,
      note: opts.note,
    });
    console.log(JSON.stringify(res.data, null, 2));
  });

program
  .command('adjustments:list')
  .requiredOption('--tenant <id>', 'Tenant ID')
  .option('--metric <metric>', 'Metric')
  .option('--customer <ref>', 'Customer ref')
  .option('--status <status>', 'Status')
  .option('--api-url <url>', 'API base URL', 'http://localhost:3000')
  .option('--api-key <key>', 'API key')
  .action(async (opts) => {
    const http = axios.create({
      baseURL: opts.apiUrl,
      headers: {
        'Content-Type': 'application/json',
        ...(opts.apiKey ? { Authorization: `Bearer ${opts.apiKey}` } : {}),
      },
      timeout: 10000,
    });
    const params: any = { tenantId: opts.tenant };
    if (opts.metric) params.metric = opts.metric;
    if (opts.customer) params.customerRef = opts.customer;
    if (opts.status) params.status = opts.status;
    const res = await http.get('/v1/adjustments', { params });
    console.log(JSON.stringify(res.data, null, 2));
  });

program
  .command('adjustments:approve')
  .argument('<id>', 'Adjustment ID')
  .requiredOption('--tenant <id>', 'Tenant ID')
  .option('--api-url <url>', 'API base URL', 'http://localhost:3000')
  .option('--api-key <key>', 'API key')
  .action(async (id, opts) => {
    const http = axios.create({
      baseURL: opts.apiUrl,
      headers: {
        'Content-Type': 'application/json',
        ...(opts.apiKey ? { Authorization: `Bearer ${opts.apiKey}` } : {}),
      },
      timeout: 10000,
    });
    const res = await http.post(`/v1/adjustments/${id}/approve`, { tenantId: opts.tenant });
    console.log(JSON.stringify(res.data, null, 2));
  });

program
  .command('adjustments:revert')
  .argument('<id>', 'Adjustment ID')
  .requiredOption('--tenant <id>', 'Tenant ID')
  .option('--note <text>', 'Note')
  .option('--api-url <url>', 'API base URL', 'http://localhost:3000')
  .option('--api-key <key>', 'API key')
  .action(async (id, opts) => {
    const http = axios.create({
      baseURL: opts.apiUrl,
      headers: {
        'Content-Type': 'application/json',
        ...(opts.apiKey ? { Authorization: `Bearer ${opts.apiKey}` } : {}),
      },
      timeout: 10000,
    });
    const res = await http.post(`/v1/adjustments/${id}/revert`, { tenantId: opts.tenant, note: opts.note });
    console.log(JSON.stringify(res.data, null, 2));
  });

program.parseAsync().catch((err) => {
  console.error(err);
  process.exit(1);
});


