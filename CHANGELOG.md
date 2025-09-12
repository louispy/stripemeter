# Changelog

## v0.3.0 — 2025-09-12

### Added
- Usage History API — `GET /v1/usage/history` returns time-series plus totals to visualize counters before/after replay. (#61)
- Reconciliation Summary API — `GET /v1/reconciliation/summary` reports drift and counters so you can prove pre-invoice parity. (#62)
- Backfill & Event Replay System — `POST /v1/replay` with dry-run/apply and watermark/cursor semantics (single worker MVP). (#44)
- Readiness checks — minimal health probes for Stripe ping + Redis ping. (#38)
- Production Auth / Tenancy / RBAC / API keys (initial) — base capabilities landed and tracked under a single issue. (#45)

### Developer Experience
- Idempotency on ingest — `Idempotency-Key` header accepted on `POST /v1/events/ingest`. (#58)
- Per-event ingest results — response now includes per-event statuses and a `requestId`. (#59)
- Tenant ID DX — relaxed `tenantId` validation from UUID to string (server-normalized). (#60)

### Documentation & Demos
- Operator runbook — reconciliation triage/repair steps for the "first 5 minutes." (#57)
- Stripe Test Clocks Parity Walkthrough — end-to-end demo that proves drift → 0 before Stripe closes the invoice. (#53)

## v0.2.0 — 2025-09-06

### Added
- Events List API: `GET /v1/events` with pagination, filters, sorting, and time range.
- Health & Metrics: `/health/ready` readiness with dependency checks; Prometheus `/metrics` exposed (API and workers).
- Admin UI QoL: Settings form values now persist across reloads (localStorage with validation).
- Simulator docs and CLI usage examples.

### Improved
- API HTTP metrics collection via lightweight Fastify hooks.

### Notes
- Docs-first and API-stable release. No breaking changes.


