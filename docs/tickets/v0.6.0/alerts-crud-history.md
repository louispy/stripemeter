---
name: Feature request
about: Suggest an idea for this project
---

**Problem**
Operators lack first-class alert objects, lifecycle, and history. Today alerts exist as PromQL recipes and dashboards without CRUD, ack/snooze, or retention.

**Proposed solution**
DB-backed Alerts with CRUD + lifecycle (open/ack/snooze/resolved), history timeline, Admin UI, and optional Alertmanager webhook integration.

**Scope**
- Tables: `alerts` (definition), `alert_events` (firings/changes), `acknowledgements` (user+note), TTL retention 30–90d
- API: create/update/delete alert definitions; list with filters (state, severity, tenant, metric); ack/snooze/resolve actions; history endpoint
- Admin UI: alerts list, detail timeline, actions (ack with note, snooze durations); deep-link from Grafana
- Ingest: receive Alertmanager webhook → persist firing/resolved events, associate by fingerprint
- Backfill: optional polling from Prometheus for last N hours on startup
- RBAC: restrict write ops and notes by role; audit fields

**Acceptance criteria**
- Drift breach creates/updates a firing within ≤30s; UI shows timeline and allows ack with note
- Ack suppresses duplicate notifications while firing persists
- API + UI covered by tests; OpenAPI docs published

**Out of scope**
- Complex correlation/dedup across services (future)

**Technical notes**
- Drizzle migrations in `packages/database`; foreign keys and cascades
- Indexing on `(tenantId, metric, state, createdAt)`
- Webhook signature verification for Alertmanager if configured

**Metrics**
- `alert_events_ingested_total`, `alert_state_transitions_total`

**Dependencies**
- Relates to #7

**Links**
- `ops/ALERTS.md`, `RECONCILIATION.md`

