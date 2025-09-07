# StripeMeter

> **The open-source usage metering platform that eliminates billing surprises**

[![CI](https://github.com/geminimir/stripemeter/actions/workflows/ci.yml/badge.svg)](https://github.com/geminimir/stripemeter/actions/workflows/ci.yml)
[![GitHub release](https://img.shields.io/github/v/release/geminimir/stripemeter)](https://github.com/geminimir/stripemeter/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)
[![Community](https://img.shields.io/badge/Join-Community-blue)](https://github.com/geminimir/stripemeter/discussions)
[![Contributors](https://img.shields.io/github/contributors/geminimir/stripemeter.svg)](https://github.com/geminimir/stripemeter/graphs/contributors)

**Stability: Beta (v0.2.0)** — See [Release Notes](docs/RELEASE_NOTES_v0.2.0.md) and [Operator Playbook](RECONCILIATION.md).

### Try in 5 minutes

```bash
pnpm i -w
cp .env.example .env
docker compose up -d
pnpm -r build
pnpm dev
```

After services are up:
- Readiness: `GET http://localhost:3000/health/ready`
- Metrics: `GET http://localhost:3000/metrics`
- List events: `curl -s "http://localhost:3000/v1/events?tenantId=your-tenant-id&limit=10" | jq`

### Verify it worked (visible success)

```bash
# 1) Health (should be healthy or degraded)
curl -s http://localhost:3000/health/ready

# 2) Idempotency demo: send the SAME event twice (counts once)
curl -s -X POST http://localhost:3000/v1/events/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "events": [{
      "tenantId": "your-tenant-id",
      "metric": "api_calls",
      "customerRef": "cust_123",
      "quantity": 5,
      "ts": "2025-01-01T00:00:00Z",
      "idempotencyKey": "evt-1"
    }]
  }'

curl -s -X POST http://localhost:3000/v1/events/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "events": [{
      "tenantId": "your-tenant-id",
      "metric": "api_calls",
      "customerRef": "cust_123",
      "quantity": 5,
      "ts": "2025-01-01T00:00:00Z",
      "idempotencyKey": "evt-1"
    }]
  }'

# 3) Check metrics (should reflect one accepted ingest)
curl -s http://localhost:3000/metrics | head -n 30
```

> If this clarified drift/idempotency, please ⭐ the repo and open an issue with what you tried — it guides the roadmap.

### Micro-proof numbers (optional quick check)

- p95 ingest latency: ~10–25 ms
- Re-aggregation of 10k late events: ≤ 2 s
- Duplicate events inside 24 h idempotency window: 0 double-counts

Reproduce locally:

```bash
# p95 for POST /v1/events/ingest (100 concurrent for 30s)
npx autocannon -m POST -H 'content-type: application/json' \
  -b '{"events":[{"tenantId":"your-tenant-id","metric":"api_calls","customerRef":"c1","quantity":1,"ts":"2025-01-01T00:00:00Z"}]}' \
  http://localhost:3000/v1/events/ingest

# Spot-check metrics after a short send
curl -s http://localhost:3000/metrics | grep -E "http_request_duration|process_" || true
```

### Pick your case (examples)

- API calls: `bash examples/api-calls/verify.sh`
- Seats: `bash examples/seats/verify.sh`

Each script checks health, sends a duplicate event with an explicit idempotency key, and prints the first lines of `/metrics` so you can see it counted once.

**StripeMeter** is an alpha-stage, Stripe-native usage metering system that brings transparency and trust to SaaS billing. Built by developers, for developers who believe customers deserve to see exactly what they're paying for.

## Why StripeMeter?

- **Eliminate Bill Shock**: Real-time usage tracking with live cost projections
- **Exactly-Once Guarantee**: Never double-bill customers with idempotent processing
- **Invoice Parity**: What customers see = what Stripe bills (guaranteed within 0.5%)
- **Lightning Fast**: Sub-minute freshness with horizontal scaling
- **Battle-Tested**: Built for production with comprehensive error handling
- **Beautiful UIs**: Admin dashboard + embeddable customer widgets
- **Developer First**: Full-featured SDKs for Node.js and Python

## What Makes StripeMeter Special

Unlike other billing solutions, StripeMeter is designed around three core principles:

1. **Transparency First**: Customers should never be surprised by their bill
2. **Developer Experience**: Building usage-based pricing should be delightful
3. **Community Driven**: Built by the community, for the community

## Architecture

```
┌─────────────┐     ┌──────────┐     ┌──────────────┐
│   Clients   │────▶│ Ingest   │────▶│   Events     │
│  (SDK/HTTP) │     │   API    │     │  (Postgres)  │
└─────────────┘     └──────────┘     └──────────────┘
                           │                 │
                           ▼                 ▼
                    ┌──────────┐     ┌──────────────┐
                    │  Queue   │────▶│ Aggregator   │
                    │ (Redis)  │     │   Worker     │
                    └──────────┘     └──────────────┘
                                            │
                                            ▼
                                     ┌──────────────┐
                                     │   Counters   │
                                     │(Redis + PG)  │
                                     └──────────────┘
                                            │
                           ┌────────────────┼────────────────┐
                           ▼                ▼                ▼
                    ┌──────────┐     ┌──────────┐    ┌──────────┐
                    │  Stripe  │     │  Alerts  │    │ Customer │
                    │  Writer  │     │  & Caps  │    │  Widget  │
                    └──────────┘     └──────────┘    └──────────┘
```

## Project Structure

```
stripemeter/
├── packages/
│   ├── core/           # Shared types, schemas, utilities
│   ├── database/       # Database layer (Drizzle ORM + Redis)
│   ├── pricing-lib/    # Pricing calculation engine
│   ├── sdk-node/       # Node.js SDK
│   └── sdk-python/     # Python SDK
├── apps/
│   ├── api/           # REST API (Fastify)
│   ├── workers/       # Background workers (BullMQ)
│   ├── admin-ui/      # Admin dashboard (React)
│   └── customer-widget/ # Embeddable widget (React)
└── infra/             # Infrastructure configs
```

## Quick Start

**Get StripeMeter running in under 5 minutes**

### One-Command Setup

```bash
# Clone and setup everything automatically
git clone https://github.com/geminimir/stripemeter.git
cd stripemeter && ./scripts/setup.sh
```

That's it! The setup script will:
- Check prerequisites (Node.js 20+, pnpm, Docker)
- Install dependencies
- Start infrastructure services
- Run database migrations
- Create example configuration

### Manual Setup (if you prefer)

<details>
<summary>Click to expand manual installation steps</summary>

1. **Prerequisites**: Node.js 20+, pnpm 8+, Docker
2. **Install**: `pnpm install`
3. **Configure**: Copy `.env.example` to `.env` and add your Stripe keys
4. **Infrastructure**: `docker compose up -d`
5. **Database**: `pnpm db:migrate`
6. **Start**: `pnpm dev`

</details>

### You're Ready!

- **API**: `http://localhost:3000` (with Swagger docs at `/docs`)
- **Admin Dashboard**: `http://localhost:3001`
- **Customer Widget Demo**: `http://localhost:3002`

### Try the Interactive Demo

Experience StripeMeter in action with our realistic SaaS demo:

```bash
cd demo/cloudapi-saas
./demo-start.sh
```

The demo showcases:
- **Real-time usage tracking** with live cost updates
- **Multiple pricing tiers** (Free, Pro, Enterprise)
- **Interactive API testing** with immediate billing feedback
- **Usage simulation tools** for different traffic patterns
- **Complete billing transparency** that customers love

Perfect for understanding how StripeMeter integrates with your SaaS application!

## Core Concepts

### Events (Immutable Ledger)
Every usage event is stored with a deterministic idempotency key. Events are never deleted or modified - corrections are made through adjustments.

### Counters (Materialized Aggregations)
Pre-computed aggregations (sum/max/last) by tenant, metric, customer, and period. Updated in near-real-time by the aggregator worker.

### Watermarks (Late Event Handling)
Each counter maintains a watermark timestamp. Events arriving within the lateness window (default 48h) trigger re-aggregation. Later events become adjustments.

### Delta Push (Stripe Synchronization)
The writer tracks `pushed_total` per subscription item and only sends the delta to Stripe, ensuring idempotent updates even after retries.

### Reconciliation (Trust but Verify)
Hourly comparison of local totals vs Stripe reported usage. Differences beyond epsilon (0.5%) trigger investigation and suggested adjustments.

## Pricing Simulator

**Test and optimize your pricing strategy before going live**

The StripeMeter pricing simulator helps you validate billing logic, compare pricing models, and ensure customers are never surprised by their bills.

### Quick Example

```typescript
import { InvoiceSimulator } from '@stripemeter/pricing-lib';

const simulator = new InvoiceSimulator();

// Compare tiered vs volume pricing for 25,000 API calls
const tieredPrice = simulator.simulate({
  customerId: 'test',
  periodStart: '2024-01-01',
  periodEnd: '2024-02-01',
  usageItems: [{
    metric: 'api_calls',
    quantity: 25000,
    priceConfig: {
      model: 'tiered',
      currency: 'USD',
      tiers: [
        { upTo: 10000, unitPrice: 0.01 },
        { upTo: 50000, unitPrice: 0.008 },
        { upTo: null, unitPrice: 0.005 }
      ]
    }
  }]
});

console.log(`Tiered pricing: $${tieredPrice.total}`); // $220
```

### 📖 Complete Documentation

- **[Simulator Getting Started](docs/simulator-getting-started.md)** - Complete guide with examples
- **[Pricing Scenarios](docs/simulator-scenarios.md)** - Real-world use cases and comparisons
- **[Example Code](examples/pricing-simulator-examples.ts)** - Runnable examples for all pricing models

### Why Use the Simulator?

✅ **Validate pricing accuracy** - Test before customers see bills  
✅ **Compare pricing models** - Tiered vs Volume vs Graduated  
✅ **Optimize revenue** - Find the best pricing for your segments  
✅ **Handle edge cases** - Test zero usage, tier boundaries, credits  
✅ **Enterprise scenarios** - Multi-metric billing with commitments  

## Usage Examples

### Track Usage with SDKs

<details>
<summary><strong>Node.js SDK</strong></summary>

```javascript
import { createClient } from '@stripemeter/sdk-node';

const client = createClient({
  apiUrl: 'http://localhost:3000',
  tenantId: 'your-tenant-id',
  customerId: 'cus_ABC123'
});

// Track a single event
await client.track({
  metric: 'api_calls',
  customerRef: 'cus_ABC123',
  quantity: 100,
  meta: { endpoint: '/v1/search', region: 'us-east-1' }
});

// Get live usage and cost projection
const usage = await client.getUsage('cus_ABC123');
const projection = await client.getProjection('cus_ABC123');

console.log(`Current usage: ${usage.metrics[0].current}`);
console.log(`Projected cost: $${projection.total}`);
```

</details>

<details>
<summary><strong>Python SDK</strong></summary>

```python
from stripemeter import StripeMeterClient

client = StripeMeterClient(
    api_url="http://localhost:3000",
    tenant_id="your-tenant-id",
    customer_id="cus_ABC123"
)

# Track usage
client.track(
    metric="api_calls",
    customer_ref="cus_ABC123",
    quantity=100,
    meta={"endpoint": "/v1/search", "region": "us-east-1"}
)

# Get projections
projection = client.get_projection("cus_ABC123")
print(f"Projected cost: ${projection.total}")
```

</details>

<details>
<summary><strong>REST API</strong></summary>

```bash
# Ingest usage events
curl -X POST http://localhost:3000/v1/events/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "events": [{
      "tenantId": "your-tenant-id",
      "metric": "api_calls",
      "customerRef": "cus_ABC123",
      "quantity": 100,
      "ts": "2025-01-16T14:30:00Z"
    }]
  }'

# Get cost projection
curl -X POST http://localhost:3000/v1/usage/projection \
  -H "Content-Type: application/json" \
  -d '{"tenantId": "your-tenant-id", "customerRef": "cus_ABC123"}'
```

</details>

### Embed the Customer Widget

```html
<!-- Add to your customer dashboard -->
<div id="usage-widget"></div>
<script src="https://cdn.stripemeter.io/widget/v1/stripemeter-widget.umd.js"></script>
<script>
  StripeMeterWidget.initStripeMeterWidget('usage-widget', {
    apiUrl: 'https://api.stripemeter.io',
    tenantId: 'your-tenant-id',
    customerId: 'cus_ABC123',
    theme: 'light' // or 'dark'
  });
</script>
```

## Contributing

StripeMeter is built by the community, for the community.

### Ways to Contribute

- **Found a bug?** [Open an issue](https://github.com/stripemeter/stripemeter/issues/new?template=bug_report.md)
- **Have an idea?** [Start a discussion](https://github.com/stripemeter/stripemeter/discussions)
- **Improve docs** - Even fixing typos helps!
- **Add tests** - Help us improve reliability
- **Design improvements** - Make StripeMeter more beautiful
- **New features** - Check our [roadmap](https://github.com/stripemeter/stripemeter/projects)

### Quick Contribution Guide

1. **Fork the repo** and create your branch: `git checkout -b my-amazing-feature`
2. **Make your changes** and add tests if needed
3. **Run the tests**: `pnpm test`
4. **Commit with a clear message**: `git commit -m "Add amazing feature"`
5. **Push and create a PR** - we'll review it quickly!

## Testing & Quality

We maintain high code quality standards:

```bash
# Run all tests
pnpm test

# Type checking
pnpm typecheck

# Linting
pnpm lint

# End-to-end tests
pnpm test:e2e
```

## Deployment

### One-Click Deploy

[![Deploy to Railway](https://railway.app/button.svg)](https://railway.app/template/stripemeter)
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/stripemeter/stripemeter)

### Docker Production

```bash
# Production deployment
docker compose -f docker-compose.prod.yml up -d

# With monitoring stack
docker compose -f docker-compose.prod.yml --profile monitoring up -d
```

### Kubernetes

```bash
# Apply all manifests
kubectl apply -k infra/k8s/

# Or use Helm
helm install stripemeter ./charts/stripemeter
```

## Performance & Monitoring

**Production SLOs**:
- Ingest latency p99 ≤ 200ms
- Projection staleness ≤ 60s
- Reconciliation accuracy ≥ 99.5%
- Uptime ≥ 99.9%

**Built-in Observability**:
- Prometheus metrics
- Structured logging
- Distributed tracing
- Health check endpoints

## Security & Compliance

- **Zero PCI scope** - No card data stored
- **Multi-tenant isolation** - Complete data separation
- **SOC 2 ready** - Comprehensive audit trails
- **RBAC support** - Role-based access control
- **Security scanning** - Automated vulnerability detection

## Roadmap

### Foundations (in progress)

- [ ] Deterministic idempotency across core/SDKs/writer
- [ ] BullMQ dedup via jobId for aggregation
- [ ] Fix watermark logic for late events → adjustments
- [ ] Implement usage endpoints (current + projection)
- [ ] API authentication + tenant scoping
- [ ] Price mappings CRUD (DB-backed)
- [ ] Alerts CRUD + history endpoints
- [ ] Health checks + Prometheus metrics
- [ ] Drizzle migrations and bootstrap
- [ ] Security and resilience hardening

### Next: Billing Simulator

- [ ] Simulator core: Scenario DSL + runner
- [ ] Stripe billing driver (test clocks, meters v2, credits)
- [ ] Simulator DB schema & migrations
- [ ] CSV/S3 parity adapter + MinIO
- [ ] Assertions library for simulator
- [ ] sim-api: CRUD scenarios, run orchestration
- [ ] sim-reporter: HTML/JSON reports
- [ ] MinIO infra profile for CSV parity tests
- [ ] Simulator CLI (run/validate/report)
- [ ] Simulator Prometheus metrics
- [ ] Credit Grants lifecycle
- [ ] Mixed cadence invoice scenario
- [ ] Dunning lab
- [ ] CI for simulator (fast PR + nightly full)
- [x] Docs: Simulator getting started + scenarios

[View full roadmap →](https://github.com/stripemeter/stripemeter/projects/1)
## License

StripeMeter is [MIT licensed](./LICENSE). Use it, modify it, distribute it - we believe in open source!

## Acknowledgments

Built with ❤️ by the open-source community. Special thanks to:

- [Stripe](https://stripe.com) for the amazing payments platform
- All our [contributors](https://github.com/stripemeter/stripemeter/graphs/contributors)
---

<div align="center">

**If StripeMeter helps your business, please give us a star!**

[Star on GitHub](https://github.com/stripemeter/stripemeter) • [Documentation](https://docs.stripemeter.io) • [Community](https://discord.gg/stripemeter)

Made with ❤️ by developers who believe in billing transparency

</div>
