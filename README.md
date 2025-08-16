# 🚀 StripeMeter

> **The open-source usage metering platform that eliminates billing surprises**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)
[![Community](https://img.shields.io/badge/Join-Community-blue)](https://github.com/geminimir/stripemeter/discussions)
[![Contributors](https://img.shields.io/github/contributors/geminimir/stripemeter.svg)](https://github.com/geminimir/stripemeter/graphs/contributors)

**StripeMeter** is a production-ready, Stripe-native usage metering system that brings transparency and trust to SaaS billing. Built by developers, for developers who believe customers deserve to see exactly what they're paying for.

## ✨ Why StripeMeter?

- 🎯 **Eliminate Bill Shock**: Real-time usage tracking with live cost projections
- 🔒 **Exactly-Once Guarantee**: Never double-bill customers with idempotent processing
- 📊 **Invoice Parity**: What customers see = what Stripe bills (guaranteed within 0.5%)
- ⚡ **Lightning Fast**: Sub-minute freshness with horizontal scaling
- 🛡️ **Battle-Tested**: Built for production with comprehensive error handling
- 🎨 **Beautiful UIs**: Admin dashboard + embeddable customer widgets
- 🔧 **Developer First**: Full-featured SDKs for Node.js and Python

## 🌟 What Makes StripeMeter Special

Unlike other billing solutions, StripeMeter is designed around three core principles:

1. **Transparency First**: Customers should never be surprised by their bill
2. **Developer Experience**: Building usage-based pricing should be delightful
3. **Community Driven**: Built by the community, for the community

## 🏗️ Architecture

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

## 📦 Project Structure

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

## 🚀 Quick Start

> **Get StripeMeter running in under 5 minutes!**

### One-Command Setup

```bash
# Clone and setup everything automatically
git clone https://github.com/geminimir/stripemeter.git
cd stripemeter && ./scripts/setup.sh
```

That's it! The setup script will:
- ✅ Check prerequisites (Node.js 20+, pnpm, Docker)
- ✅ Install dependencies
- ✅ Start infrastructure services
- ✅ Run database migrations
- ✅ Create example configuration

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

### 🎉 You're Ready!

- 📡 **API**: `http://localhost:3000` (with Swagger docs at `/docs`)
- 🎛️ **Admin Dashboard**: `http://localhost:3001`
- 🎨 **Customer Widget Demo**: `http://localhost:3002`

## 📊 Core Concepts

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

## 💻 Usage Examples

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

## 🤝 Contributing

**We ❤️ contributions!** StripeMeter is built by the community, for the community.

### 🌟 Ways to Contribute

- 🐛 **Found a bug?** [Open an issue](https://github.com/stripemeter/stripemeter/issues/new?template=bug_report.md)
- 💡 **Have an idea?** [Start a discussion](https://github.com/stripemeter/stripemeter/discussions)
- 📖 **Improve docs** - Even fixing typos helps!
- 🧪 **Add tests** - Help us improve reliability
- 🎨 **Design improvements** - Make StripeMeter more beautiful
- 🚀 **New features** - Check our [roadmap](https://github.com/stripemeter/stripemeter/projects)

### 🚀 Quick Contribution Guide

1. **Fork the repo** and create your branch: `git checkout -b my-amazing-feature`
2. **Make your changes** and add tests if needed
3. **Run the tests**: `pnpm test`
4. **Commit with a clear message**: `git commit -m "Add amazing feature"`
5. **Push and create a PR** - we'll review it quickly!

### 🏆 Recognition

All contributors get:
- 🎉 Recognition in our [contributors page](https://github.com/stripemeter/stripemeter/graphs/contributors)
- 🏅 Special Discord role in our [community server](https://discord.gg/stripemeter)
- 📧 Early access to new features and updates

## 🌍 Community

Join thousands of developers building the future of usage-based billing:

- 💬 **[Discord Community](https://discord.gg/stripemeter)** - Chat with other developers
- 🐦 **[Twitter](https://twitter.com/stripemeter)** - Follow for updates
- 📰 **[Blog](https://blog.stripemeter.io)** - Deep dives and tutorials
- 📧 **[Newsletter](https://newsletter.stripemeter.io)** - Monthly updates

## 🧪 Testing & Quality

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

**Coverage**: We aim for >90% test coverage on core components.

## 🚢 Deployment

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

## 📊 Performance & Monitoring

**Production SLOs**:
- 🚀 Ingest latency p99 ≤ 200ms
- ⚡ Projection staleness ≤ 60s
- 🎯 Reconciliation accuracy ≥ 99.5%
- 🛡️ Uptime ≥ 99.9%

**Built-in Observability**:
- Prometheus metrics
- Structured logging
- Distributed tracing
- Health check endpoints

## 🔒 Security & Compliance

- 🔐 **Zero PCI scope** - No card data stored
- 🛡️ **Multi-tenant isolation** - Complete data separation
- 📋 **SOC 2 ready** - Comprehensive audit trails
- 🔑 **RBAC support** - Role-based access control
- 🚨 **Security scanning** - Automated vulnerability detection

## 🗺️ Roadmap

**Coming Soon**:
- [ ] GraphQL API
- [ ] Slack/Teams integrations
- [ ] Advanced analytics dashboard
- [ ] Custom pricing models
- [ ] Multi-currency support
- [ ] Audit log exports

**Future**:
- [ ] Machine learning usage predictions
- [ ] Advanced fraud detection
- [ ] Enterprise SSO integration

[View full roadmap →](https://github.com/stripemeter/stripemeter/projects/1)

## 📄 License

StripeMeter is [MIT licensed](./LICENSE). Use it, modify it, distribute it - we believe in open source!

## 🙏 Acknowledgments

Built with ❤️ by the open-source community. Special thanks to:

- [Stripe](https://stripe.com) for the amazing payments platform
- All our [contributors](https://github.com/stripemeter/stripemeter/graphs/contributors)
- The broader usage-based billing community

---

<div align="center">

**⭐ If StripeMeter helps your business, please give us a star!**

[⭐ Star on GitHub](https://github.com/stripemeter/stripemeter) • [📖 Documentation](https://docs.stripemeter.io) • [💬 Community](https://discord.gg/stripemeter)

Made with ❤️ by developers who believe in billing transparency

</div>
