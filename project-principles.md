# Project Playbook — **Stripe-Native Usage Metering & Cost Experience**

> A practical guide to building a Stripe-opinionated, reliable metering layer that gives customers a live, trustworthy cost view and gives teams exactly-once accounting with invoice parity.

---

## 0) Executive Summary

**End goal:**
Provide SaaS companies a drop-in system to meter usage in real time, project costs accurately, prevent bill shock (alerts & caps), and reconcile exactly with Stripe invoices. Treat usage like money: append-only, explainable, auditable.

**What we ship:**

* Ingestion SDKs + HTTP endpoint (idempotent)
* Canonical ledger (Postgres) + near-real-time counters (Redis)
* Mapper from metrics → Stripe Prices/Subscription items
* Writer that pushes **deltas** to Stripe usage records with backoff
* Invoice simulator (same math as reconciliation) for projections
* Admin UI (ops & finance) + embeddable customer widget (live usage + spend)
* Backfills & corrections (non-destructive), reconciliation reports
* Alerts & caps (threshold/spike/budget)

**North-star invariants:**

1. **Invoice parity**: what we show = what Stripe bills (within a defined epsilon until finalization).
2. **Exactly-once**: an event should affect billing at most once.
3. **Explainability**: every billed unit is traceable; no destructive edits.
4. **Operability**: any failure is safely retryable; you can prove we didn’t double-bill.

---

## 1) Architecture Overview

### 1.1 High-Level Diagram

```
Clients / Services
   │  (SDK / HTTP)
   ▼
[ Ingest API ]  ──────────────┐
   │ validates + upserts      │ enqueue
   ▼                          │
[ Postgres: events (ledger) ] │
   │                          ▼
   │                 [ Aggregator Worker ]
   │                   -> counters (Redis+PG)
   │                          │
   │                          ├──────────► [ Alerts & Caps ]
   │                          │
   │                          ▼
   │                   [ Stripe Writer ]
   │                     (delta push, rate-limit aware)
   │                          │
   │                          ▼
   │                 [ Write Log (PG) ]
   │
   ├────────► [ Reconciler ] ◄────────── [ Stripe API ]
   │              |  local vs stripe totals
   │              └─> reports + adjustments
   │
   ├────────► [ Simulator ]  (shared pricing lib)
   │
   ├────────► [ Admin UI ] (ops/finance)
   └────────► [ Customer Widget ] (live usage & projection)
```

### 1.2 Component Responsibilities

* **Ingest API (Fastify, TS)**
  Validates payloads, derives/accepts deterministic `idempotency_key`, upserts into `events` (append-only, PK = key), enqueues aggregation.

* **Aggregator Worker (BullMQ/Redis)**
  Folds events (+ adjustments) into `counters` by `(tenant, metric, customer, period)`. Maintains a **watermark** per combination to handle lateness.

* **Stripe Writer**
  On cadence/threshold, computes `delta = local_total - pushed_total` per `(price_item, period)`, submits **usage records** to Stripe with idempotent request IDs, observes rate limits, updates `write_log`.

* **Reconciler**
  Periodically fetches Stripe reported totals, compares with local counters, emits `reconciliation_report` and auto-suggested `adjustments` when diffs exceed epsilon.

* **Simulator (Pricing Library)**
  Deterministic price math for tiers/volume/graduated, minimums/commitments/credits, proration. Used by UI (projections) **and** reconciliation to ensure parity.

* **Alerts & Caps**
  Thresholds, spike detection, budget caps (soft/hard). Integrations: email/webhook/Slack.

* **Admin UI (React)**
  Events explorer, mappings, reconciliation views, adjustments/backfills UI, writer status, per-tenant limits.

* **Customer Widget (React embed)**
  Current period usage, projected charge (with freshness indicator), quota remaining, alerts, upgrade CTA, optional hard-cap toggle.

---

## 2) Data Model (Core Tables)

> **Postgres** as source of truth; **Redis** for fast counters. Partition PG tables by month for scale.

### 2.1 Events Ledger

```sql
CREATE TABLE events (
  idempotency_key TEXT PRIMARY KEY,          -- deterministic
  tenant_id       UUID NOT NULL,
  metric          TEXT NOT NULL,             -- e.g. "api_calls", "gb_egress"
  customer_ref    TEXT NOT NULL,             -- Stripe customer or your user ID (mapped)
  resource_id     TEXT,                      -- optional for fine-grained dedupe
  quantity        NUMERIC(20,6) NOT NULL,    -- supports fractional units
  ts              TIMESTAMPTZ NOT NULL,
  meta            JSONB NOT NULL DEFAULT '{}',
  source          TEXT NOT NULL,             -- sdk/http/etl
  inserted_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON events (tenant_id, metric, customer_ref, ts);
```

### 2.2 Adjustments (Non-Destructive)

```sql
CREATE TABLE adjustments (
  id              UUID PRIMARY KEY,
  tenant_id       UUID NOT NULL,
  metric          TEXT NOT NULL,
  customer_ref    TEXT NOT NULL,
  period_start    DATE NOT NULL,             -- UTC day of period boundary
  delta           NUMERIC(20,6) NOT NULL,    -- +/- corrections
  reason          TEXT NOT NULL,             -- enum: backfill, correction, promo...
  actor           TEXT NOT NULL,             -- user/system
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 2.3 Counters (Materialized State)

```sql
CREATE TABLE counters (
  tenant_id       UUID NOT NULL,
  metric          TEXT NOT NULL,
  customer_ref    TEXT NOT NULL,
  period_start    DATE NOT NULL,
  period_end      DATE NOT NULL,
  agg_sum         NUMERIC(20,6) NOT NULL,
  agg_max         NUMERIC(20,6) NOT NULL,
  watermark_ts    TIMESTAMPTZ NOT NULL,      -- latest event timestamp folded
  updated_at      TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (tenant_id, metric, customer_ref, period_start)
);
```

### 2.4 Metric → Stripe Mapping

```sql
CREATE TABLE price_mappings (
  tenant_id        UUID NOT NULL,
  metric           TEXT NOT NULL,                    -- "api_calls"
  aggregation      TEXT NOT NULL CHECK (aggregation IN ('sum','max','last')),
  stripe_account   TEXT NOT NULL,                    -- acct_xxx if multiple
  price_id         TEXT NOT NULL,                    -- Stripe Price ID
  subscription_item_id TEXT,                         -- optional stable pointer
  currency         TEXT,                             -- informational
  active           BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (tenant_id, metric, active)
);
```

### 2.5 Write Log (Stripe Usage Sync)

```sql
CREATE TABLE write_log (
  tenant_id        UUID NOT NULL,
  stripe_account   TEXT NOT NULL,
  subscription_item_id TEXT NOT NULL,
  period_start     DATE NOT NULL,
  pushed_total     NUMERIC(20,6) NOT NULL DEFAULT 0,
  last_request_id  TEXT,
  updated_at       TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (tenant_id, stripe_account, subscription_item_id, period_start)
);
```

### 2.6 Reconciliation Reports

```sql
CREATE TABLE reconciliation_reports (
  id               UUID PRIMARY KEY,
  tenant_id        UUID NOT NULL,
  subscription_item_id TEXT NOT NULL,
  period_start     DATE NOT NULL,
  local_total      NUMERIC(20,6) NOT NULL,
  stripe_total     NUMERIC(20,6) NOT NULL,
  diff             NUMERIC(20,6) NOT NULL,
  status           TEXT NOT NULL CHECK (status IN ('ok','investigate','resolved')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## 3) SDK & API Contracts

### 3.1 Usage Event Payload (SDKs & HTTP)

```json
{
  "tenant_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "metric": "api_calls",
  "customer_ref": "cus_ABC123",           // or your internal user ID; mapping configured
  "resource_id": "org_42",                // optional
  "quantity": 1,
  "ts": "2025-08-16T14:05:10.000Z",
  "meta": { "endpoint": "/v1/search", "region": "us-east-1" },
  "idempotency_key": "hash(metric|resource_id|2025-08-16T14:05|seq:0001)"  // optional if SDK computes
}
```

**Rules:**

* `ts` is UTC from the producer; server will clamp to now±allowed skew if wildly off.
* If `idempotency_key` is omitted, server can derive (`metric|customer|period_bucket|resource|nonce`).
* All writes are **upserts** by key.

### 3.2 Backfill/Correction API

* **POST** `/backfill` (CSV/JSON), requires reason.
* **POST** `/adjustments` {tenant, metric, period\_start, delta, reason}.
* **GET** `/reconciliation/:period` produces diffs and suggested adjustments.

### 3.3 Mapping Configuration (YAML)

```yaml
tenant: 9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d
timezone: UTC
customers:
  # map internal IDs to Stripe customer if needed
  - internal_id: "user_123"
    stripe_customer: "cus_ABC123"

metrics:
  - name: api_calls
    aggregation: sum
    period: monthly
    price:
      stripe_account: "acct_123"
      price_id: "price_1Px..."
      subscription_item_id: "si_9xy..."
  - name: peak_concurrency
    aggregation: max
    period: daily
    price:
      stripe_account: "acct_123"
      price_id: "price_1Py..."
```

---

## 4) Core Algorithms (Simple & Effective)

### 4.1 Aggregation with Watermarks

* Maintain per `(tenant, metric, customer, period)` **watermark\_ts** = max event `ts` folded.
* Accept late events **≤ L** (e.g., 48h) before watermark: recompute counter.
* Events later than **L** become **adjustments** targeting the original period.

### 4.2 Stripe Writer — Delta Push

* For each mapped `(subscription_item, period)` compute:

  * `local_total` = counters.agg (sum/max/last)
  * `pushed_total` = write\_log.pushed\_total
  * `delta = local_total - pushed_total`
* If `delta > 0`, upsert **usage\_record** to Stripe with **idempotency key** = `tenant|item|period|local_total`.
* On success: set `pushed_total = local_total`, store `last_request_id`.
* If Stripe returns 429: exponential backoff; obey `Stripe-RateLimit-Remaining` headers.

### 4.3 Reconciliation

* On cadence (e.g., hourly), read Stripe’s reported quantity for each `(item, period)` → `stripe_total`.
* Compare with `local_total`. If `|diff| > epsilon`:

  * Create `reconciliation_report(status='investigate')`
  * Optionally propose `adjustment` (depends on lateness policy).

### 4.4 Simulation (Used Everywhere)

* Pure function `projected_amount(customer, period)`:

  * Inputs: `counters`, `adjustments` (to date), `price_model`, `plan_changes`, `credits/commitments`.
  * Output: totals per line item + final projected invoice.
* UI and reconciler both call the **same** function/library.

---

## 5) Handling the Hard Things

### 5.1 Duplicates, Late, Out-of-Order

* **Idempotency first:** PK conflicts on `events` are OK = we dedup.
* **Order-insensitive math:** aggregation recomputes from ledger; no reliance on ingestion order.
* **Watermark + lateness policy:** configurable per metric (24–72h typical).

### 5.2 Periods, Proration, Plan Swaps

* **Timeline engine** reconstructs active subscription\_items over time from Stripe events.
* All period math in **UTC**; UI localizes.
* For mid-cycle swaps, split counters across items; simulator shows proration explicitly.

### 5.3 Backfills & Corrections

* Never delete; **append adjustments** with reasons.
* Bulk backfills run as jobs with preview → apply.
* Audit trail ties every adjustment to user + justification.

### 5.4 Writer & Rate Limits

* **Token bucket** per Stripe account; adaptive cadence.
* Batch small deltas; coalesce writes within short windows.
* Prefer fewer, larger deltas to reduce write amplification.

### 5.5 Exactly-Once End-to-End

* **Three ledgers**: events, counters, write\_log.
* Writer always compares totals; retries safe; idempotent request IDs.
* Reconciler proves final state matches Stripe.

---

## 6) Observability, SLOs, and Runbooks

### 6.1 SLOs

* **Ingest latency p99 ≤ 200ms** (HTTP accepted → event persisted).
* **Projection staleness ≤ 60s** (widget freshness).
* **Writer staleness ≤ 120s** (Stripe reported ≈ local).
* **Reconciliation diff ≤ 0.5%** for open periods; **0%** on finalized invoices (after corrections).
* **Error budget**: < 0.1% failed writes/day auto-resolved within 15m.

### 6.2 Metrics (Prometheus style)

* `ingest_requests_total{tenant,metric}`
* `events_upsert_conflicts_total` (dedupe)
* `aggregation_jobs_duration_seconds_bucket`
* `writer_delta_total{item}` / `writer_stripe_errors_total{code}`
* `projection_freshness_seconds`
* `reconciliation_diff{item}`

### 6.3 Logs & Traces

* **trace\_id** carried from ingest → writer → reconciler.
* Structured logs (JSON) with tenant, metric, period, item, deltas.

### 6.4 Runbooks (Common Incidents)

* **Stripe 429 storms**: writer auto-backs off; verify token bucket; optionally raise cadence; watch staleness SLO.
* **Large reconciliation diffs**: open report, drill into events & adjustments; apply corrective adjustment; annotate.
* **Late event flood post-invoice**: apply tenant policy: (a) roll to next cycle, (b) auto-credit note delta; communicate to customer.
* **DB lag**: enable PG autovacuum tuning, check partitioning, scale reads, defer non-critical analytics.

---

## 7) Security & Compliance

* **No PAN/card data** stored; interact only with Stripe tokens/IDs.
* Secrets in **KMS/Secrets Manager**; rotate regularly.
* **Multi-tenant isolation** via tenant\_id scoping on all queries + row-level policies (optional).
* **PII minimization**: store Stripe customer IDs; optional field-level encryption for internal IDs.
* Audit logs for all admin actions; **RBAC** for adjustments/backfills.

---

## 8) Deployment & Environments

* **Monorepo** (pnpm workspaces): `api`, `workers`, `pricing-lib`, `ui-admin`, `widget`, `sdk-node`, `sdk-python`, `infra`
* **Envs**: `dev`, `staging`, `prod` (separate Stripe accounts/keys)
* **Infra (MVP)**: Docker Compose (PG, Redis), single service deploy; migrate to k8s when SLOs demand.
* **Migrations**: `drizzle` or `prisma` (strict, repeatable).
* **CI**: lint + unit + property tests + stripe sandbox contract tests; seed demo data.

---

## 9) Testing Strategy

* **Property tests**: random event streams → `sum(events)+sum(adjustments) == counters.sum`.
* **Golden tests**: tiered/volume/graduated pricing, proration edge cases.
* **Chaos**: duplicate/out-of-order/late events; forced Stripe 429/5xx; network partitions; DB failover.
* **Contract tests (Stripe sandbox)**: generate usage, push, finalize invoice, assert parity.
* **UI tests**: widget freshness indicator, caps/alerts behavior, admin flows.

---

## 10) Roadmap (Scope Discipline)

### MVP (4–6 weeks)

* Ingest API + Node/Python SDKs
* PG events, Redis counters, aggregator worker
* Metric→price mapping; single Stripe account
* Writer (delta push, backoff, write\_log)
* Basic admin dashboard (events/counters/mappings)
* React customer widget (usage + projection + freshness)
* Threshold alerts (email/webhook)
* Reconciliation report (diffs)

### V1 (Next 6–10 weeks)

* Backfills & corrections UI (non-destructive)
* Full simulator (tiers/volume/graduated, credits/minimums, proration)
* Spike detection & **budget caps** (soft/hard stop)
* Multi-Stripe account support; per-tenant rate limiting
* Warehouse sync (daily export) & CSV import
* RBAC, audit exports

### Later (as needed)

* ClickHouse for heavy analytics
* Plan recommendation experiments & “what-if” pricing tools
* Self-serve budget management for customers
* Kafka/SQS in place of Redis queues if volume/SLOs demand

---

## 11) Risks & Mitigations

| Risk                        | Impact                            | Mitigation                                                 |
| --------------------------- | --------------------------------- | ---------------------------------------------------------- |
| Stripe rate limits          | Delayed writes; stale projections | Token bucket per account, adaptive backoff, batch deltas   |
| Clock skew/late events      | Mis-billing                       | Watermarks, lateness window, adjustments policy            |
| Plan/pricing complexity     | Projection inaccuracies           | Single pricing lib for UI+recon, golden tests              |
| Data growth                 | Slow queries                      | Partitioning, archiving, ClickHouse for reads              |
| Human error in adjustments  | Trust loss                        | RBAC, required reason codes, reviewer workflow, audit logs |
| Multi-tenant noisy neighbor | SLO breaches                      | Per-tenant quotas, sharding, isolated writer pools         |

---

## 12) Definitions & Policies

* **Epsilon (parity tolerance):** ≤ 0.5% during open period; 0% after invoice finalization (post-recon).
* **Lateness window:** default 48h per metric (configurable).
* **Cap policies:**

  * **Soft cap:** alert customer, throttle optional, allow override.
  * **Hard cap:** stop metering/writes; surface clear UI; require manual or automated resume.
* **Adjustment policy:** Prefer adjustments rather than historical mutation; expose to customer if it changes their bill.

---

## 13) Appendix

### 13.1 Minimal TS Interfaces (Core)

```ts
type TenantID = string;

interface UsageEvent {
  tenantId: TenantID;
  metric: string;
  customerRef: string;       // "cus_..."
  resourceId?: string;
  quantity: number;
  ts: string;                // ISO UTC
  meta?: Record<string, any>;
  idempotencyKey?: string;
}

interface CounterKey {
  tenantId: TenantID;
  metric: string;
  customerRef: string;
  periodStart: string; // YYYY-MM-DD UTC
}

interface PriceMapping {
  tenantId: TenantID;
  metric: string;
  aggregation: 'sum'|'max'|'last';
  stripeAccount: string;
  priceId: string;
  subscriptionItemId?: string;
}

interface WriteLogKey {
  tenantId: TenantID;
  stripeAccount: string;
  subscriptionItemId: string;
  periodStart: string;
}
```

### 13.2 Pseudocode — Writer Loop

```ts
for (const item of mappedItems) {
  const local = getLocalTotal(item);
  const pushed = getPushedTotal(item);
  const delta = local - pushed;
  if (delta <= 0) continue;

  const reqId = `push:${item.tenantId}:${item.subscriptionItemId}:${item.periodStart}:${local}`;
  try {
    await stripe.usageRecords.create({
      subscription_item: item.subscriptionItemId,
      action: 'set',                      // set total to local
      quantity: Number(local.toFixed(6)),
      timestamp: now(),
    }, { idempotencyKey: reqId });

    updateWriteLog(item, local, reqId);
  } catch (e) {
    if (isRateLimit(e)) backoff(item.stripeAccount);
    else logErrorAndRetry(item, e);
  }
}
```

---

### 13.3 Example Customer Widget States

* **Fresh:** “Updated 28s ago · Projected \$124.12 by Aug 31”
* **Stale:** “Updating… last sync 4m ago” (show reason if known: “writer backoff, retrying”)
* **At Cap:** “Usage paused at \$500 budget · Resume?” (if soft cap reached)

---

## Final Note

Keep the system **small and boring** until SLOs force complexity. Start as a single deploy with clear module boundaries. Optimize for **truth, trust, and traceability**—because in billing, correctness beats cleverness every time.
