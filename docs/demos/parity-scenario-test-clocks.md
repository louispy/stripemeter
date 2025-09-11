# Parity Demo — Test Clocks Scenario

This demo shows how StripeMeter achieves **pre-invoice parity** using Stripe test clocks to simulate realistic billing scenarios.

## What it demonstrates

1. **Exactly-once ingest**: Duplicate events are counted only once
2. **Late-event replay**: Events arriving after initial processing are handled correctly
3. **Pre-invoice reconciliation**: Drift is reduced to zero before invoice finalization

## Prerequisites

- StripeMeter running locally (`pnpm dev`)
- Optional: Stripe API key for test clock integration

## Run the demo

### Option 1: Automated (CI/GitHub Actions)

1. Go to the **Actions** tab in your GitHub repository
2. Select the **parity-check** workflow
3. Click **Run workflow**
4. Choose mode: `dry-run` (preview) or `apply` (execute changes)
5. Download the **parity-report** artifact when complete

### Option 2: Local execution

```bash
# Make sure StripeMeter is running
pnpm dev

# In another terminal, run the parity scenario
chmod +x docs/demos/run-parity-scenario.sh
docs/demos/run-parity-scenario.sh --mode dry-run

# Check the generated reports
cat artifacts/parity-report.json
cat artifacts/parity-log.txt
```

## What to expect

The demo will:

1. **Seed usage data** with intentional duplicates and late events
2. **Show initial reconciliation** with drift > 0
3. **Run replay** to fix late events within the watermark window
4. **Show final reconciliation** with drift = 0

### Sample output

```json
{
  "tenantId": "demo",
  "metric": "requests",
  "reconciliation": {
    "localTotal": 15500,
    "stripeTotal": 15500,
    "drift": 0,
    "driftPercentage": 0.0,
    "status": "parity"
  }
}
```

## Understanding the results

- **Before replay**: Shows drift from late events and timing differences
- **After replay**: Shows how watermark-based reconciliation achieves parity
- **Parity status**: `parity` means drift ≤ 0.5% (invoice-ready)

## Troubleshooting

- **API not ready**: Wait longer or check `http://localhost:3000/health/ready`
- **No artifacts**: Check that the scripts have execute permissions
- **Stripe errors**: Demo works in demo mode without Stripe API key

## Next steps

- [View reconciliation API docs](../api/reconciliation-summary.md)
- [Learn about replay functionality](../api/replay.md)
- [Explore configuration options](../../examples/config/stripemeter.config.ts)
