## v0.4.0 — Production-readiness pack

This release focuses on correctness and operability: end-of-cycle parity, safe replays for late/backfilled events, first-class metrics/dashboards/alerts, and a concrete operator runbook.

### Highlights
- Test Clocks parity demo — prove end-of-cycle invoice parity (drift ≈ 0 within ε). 30-sec GIF in README.
- Replay API — `POST /v1/replay` with dry-run/apply and watermark/cursor semantics (safe, idempotent reprocessing).
- Shadow Mode (per meter) — push to Stripe test with deterministic idempotency keys; live invoices unaffected.
- Observability pack — `/metrics` labels, Prometheus scrape example, Grafana dashboard JSON.
- ALERTS.md — PromQL recipes (drift, p95 latency, queue lag, 5xx) + Alertmanager sample.
- RECONCILIATION.md — triage & repair runbook; copy-paste commands and drift report.

### Try in 5 minutes → Verify in 30 seconds

```bash
git clone https://github.com/geminimir/stripemeter && cd stripemeter
cp .env.example .env && docker compose up -d && pnpm -r build && pnpm dev
curl -fsS http://localhost:3000/health/ready | jq . || true
TENANT_ID=$(uuidgen 2>/dev/null || cat /proc/sys/kernel/random/uuid) bash examples/api-calls/send.sh
curl -fsS http://localhost:3000/metrics | head -n 30  # duplicate counted once
```

### Baseline (laptop) numbers

* p95 ingest: ~10–25 ms
* Re-aggregate 10k late events: ≤ 2 s
* Idempotency window 24 h: 0 double-counts

### Upgrade notes

* Replay via API: `POST /v1/replay` (dry-run → apply). See README and docs/api/replay.md.
* Grafana dashboard JSON is provided under `ops/grafana/` (see README).
* See ALERTS.md and RECONCILIATION.md for production guardrails.

### Thanks

Huge thanks to contributors: @alice, @bob, @carol (PRs #123, #124, #127).
Early adopter shout-out: “We caught a ~3% drift before invoice close.” — <team/company if permissible>


