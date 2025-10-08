---
name: Feature request
about: Suggest an idea for this project
---

**Problem**
Current writer supports legacy usage recording paths; teams adopting Stripe Meters v2 and usage credits need first-class support and parity guarantees.

**Proposed solution**
Implement Stripe Billing driver for Meters v2 with idempotent delta semantics and credits support integrated into reconciliation/replay.

**Scope**
- Add Meters v2 client with deterministic idempotency keys
- Map counters → meter events; preserve delta‑only writes
- Credits model: represent, apply during reconciliation and replay; expose in drift report
- Shadow Mode parity for Meters v2; test clocks coverage including credits
- Feature flag + rollout per tenant/meter

**Acceptance criteria**
- E2E: ingest → aggregate → delta write via Meters v2; credits reduce charges as expected
- Retries do not over‑report; idempotency verified in tests
- Comprehensive unit/integration tests; OpenAPI docs

**Out of scope**
- Commitment contracts and overage smoothing (future)

**Technical notes**
- Extend writer in `apps/workers` to branch on driver type
- Store driver capabilities on mapping to choose Meters v2 path
- Include reconciliation adapters for Meters v2 readbacks when available

**Metrics**
- `stripe_meters_v2_posts_total`, `stripe_meters_v2_post_failures_total`

**Dependencies**
- Relates to #13

