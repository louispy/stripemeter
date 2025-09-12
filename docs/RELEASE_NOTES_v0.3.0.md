## StripeMeter v0.3.0

### Highlights
- Usage History API: `GET /v1/usage/history` for time-series and totals
- Reconciliation Summary API: `GET /v1/reconciliation/summary` for drift/counters
- Backfill & Event Replay System: `POST /v1/replay` (dry-run/apply, watermark/cursor)
- Readiness checks for Stripe and Redis
- Initial production auth/tenancy/RBAC/API keys

### Why this matters
- See usage evolution and totals to validate replay outcomes
- Prove pre-invoice parity by quantifying drift before Stripe closes invoices
- Safely backfill and replay events with idempotency and observability
- Basic operational readiness probes for core dependencies
- Foundation for multi-tenant production hardening

### Upgrade guide
No breaking changes.
1) Pull latest and install: `pnpm i`
2) Build all: `pnpm -r build`
3) Run DB migrations: `pnpm db:migrate`
4) Restart API and workers; verify `/health/ready`

### Added
- **Usage History API** — `GET /v1/usage/history` returns time-series plus totals to visualize counters before/after replay. (#61)
- **Reconciliation Summary API** — `GET /v1/reconciliation/summary` reports drift and counters so you can prove pre-invoice parity. (#62)
- **Backfill & Event Replay System** — `POST /v1/replay` with dry-run/apply and watermark/cursor semantics (single worker MVP). (#44)
- **Readiness checks** — minimal health probes for Stripe ping + Redis ping. (#38)
- **Production Auth / Tenancy / RBAC / API keys (initial)** — base capabilities landed and tracked under a single issue. (#45)

### Developer Experience
- **Idempotency on ingest** — `Idempotency-Key` header accepted on `POST /v1/events/ingest`. (#58)
- **Per-event ingest results** — response now includes per-event statuses and a `requestId`. (#59)
- **Tenant ID DX** — relaxed `tenantId` validation from UUID to string (server-normalized). (#60)

### Documentation & Demos
- **Operator runbook** — reconciliation triage/repair steps for the "first 5 minutes." (#57)
- **Stripe Test Clocks Parity Walkthrough** — end-to-end demo that proves drift → 0 before Stripe closes the invoice. (#53)
