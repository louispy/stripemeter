# Reconciliation Playbook (Alpha)

This guide helps operators triage and correct differences between StripeMeter and Stripe for v0.1.0.

## Policy

- Drift epsilon: 0.5% relative difference per subscription item per period
- Within epsilon: record a small adjustment to align and proceed
- Beyond epsilon: backfill underlying events, then re-run aggregation

## Mechanics

- Watermarks: track last processed timestamp per counter; late events within the lateness window trigger re-aggregation
- Delta push: writer sends only the delta from last `pushed_total` per item to Stripe
- Hourly compare: reconciliation job compares local totals vs Stripe reported usage; flags items beyond epsilon

## Triage steps

1. Identify item: tenant, customer, metric, period
2. Inspect local totals and watermark
3. Check Stripe reported usage for the same item/period
4. Determine cause: late events, duplicates, manual Stripe change
5. Decide action: adjust (<= 0.5%) or backfill (> 0.5%)
6. Verify: re-run compare to confirm parity

## Common commands (examples)

```bash
# Health check
curl -sS http://localhost:3000/health

# Recent reconciliation alerts (example endpoint)
curl -sS http://localhost:3000/v1/reconciliation?limit=20 | jq '.items[] | {metric, period, diffPct}'

# Recent events for a customer/metric (example endpoint)
curl -sS -X POST http://localhost:3000/v1/events/query \
  -H 'Content-Type: application/json' \
  -d '{"tenantId":"TENANT","customerRef":"CUST","metric":"api_calls","period":"2025-01"}'
```

## Examples

- Late event (< 48h): falls within lateness window, re-aggregate; if residual diff <= 0.5%, adjust.
- Duplicate event: idempotency key should dedupe; if not, create a negative adjustment.

## Notes

- Best-effort alpha flow; review large drifts manually.
- Keep logs from API and workers when filing issues.
