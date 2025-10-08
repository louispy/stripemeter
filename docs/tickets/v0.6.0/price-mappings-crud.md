---
name: Feature request
about: Suggest an idea for this project
---

**Problem**
Operators need to manage metric→Stripe price routing without code edits or restarts. Today mappings are static, slowing iteration and risking misconfiguration.

**Proposed solution**
DB‑backed Price Mappings with CRUD across API + Admin UI. Writer uses the latest active mapping; updates propagate without service restarts.

**Scope**
- DB schema & migrations for `price_mappings` (+ audit: createdBy, updatedBy, createdAt, updatedAt, isDeleted)
- API: list/get/create/update/delete; validation; optimistic concurrency via `updatedAt`
- RBAC: restrict write ops; read scoped by tenant
- Admin UI: list/search, create/edit, soft delete, diff preview before save
- Hot‑reload mapping cache in writer with 60s TTL + manual bust endpoint (auth‑guarded)
- Seed/migrate from `examples/config/stripemeter.config.ts`

**Acceptance criteria**
- Creating/editing a mapping reflects in writer within ≤60s without restart
- E2E: create mapping → ingest events → correct subscription item delta push
- OpenAPI documented; unit/integration tests for API + writer lookup

**Out of scope**
- Full versioned change history UI (tracked separately)

**Technical notes**
- Drizzle migrations under `packages/database`
- Key fields: tenantId, metric, priceId, subscriptionItemId (optional), shadow fields, enabled, effectiveFrom/To
- Cache invalidation via pub/sub or simple TTL + admin bust endpoint

**Risks/Mitigations**
- Partial updates causing drift → use transactional upserts and validation

**Metrics**
- `price_mapping_cache_refresh_total`, `price_mapping_cache_staleness_seconds`

**Dependencies**
- Relates to #6

**Links**
- RECONCILIATION runbook

