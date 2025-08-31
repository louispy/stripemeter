# StripeMeter v0.1.0 (Alpha)

This is the first tagged release of StripeMeter focused on a smooth local demo and a clear operator story. It is suitable for evaluation and prototypes.

## Scope

- Works locally with Docker (Postgres + Redis)
- Core apps: API, Workers, Admin UI, Customer Widget, Pricing Simulator
- Demo: CloudAPI SaaS showcase under `demo/cloudapi-saas`

## Stability

- Stability: Alpha. Expect breaking changes before v1.0.

## What’s in

- Usage ingestion API and usage/projection endpoints
- Workers: aggregation, reconciliation, alert monitor, Stripe writer (best-effort)
- Reconciliation loop with epsilon threshold
- Admin UI and customer widget for basic flows
- Pricing simulator library and docs

## What’s out (for now)

- High-availability/multi-region guidance
- Advanced authz/SSO, RBAC hardening
- Performance SLO guarantees at scale
- Kubernetes/Helm production guidance

## Known limitations

- Single-node, developer setup focused
- Best-effort reconciliation; manual review recommended for large drifts
- Limited observability; basic logs and health checks only

## Requirements

- Node.js 20+
- pnpm 8+
- Docker Desktop

## Try in 5 minutes

```bash
git clone https://github.com/geminimir/stripemeter.git
cd stripemeter
pnpm i -w
docker compose up -d
pnpm -r build && pnpm dev

# optional demo
cd demo/cloudapi-saas && ./demo-start.sh
```

Health check: `curl -sS http://localhost:3000/health`

## Reconciliation (operator playbook)

See `RECONCILIATION.md` for drift epsilon policy (0.5%), watermarks, delta push, hourly compare, and triage steps.

## Roadmap (next)

- Observability: metrics, dashboards, alerting
- Hardening: auth/tenant scoping, retries/backoff across services
- Performance baselines and benchmarks
- Packaging: container images and production guides

## Acknowledgements

MIT licensed. Built by the community for transparent usage-based billing.


