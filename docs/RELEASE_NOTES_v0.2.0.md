## StripeMeter v0.2.0

### Highlights
- GET /v1/events with pagination, filters, sorting, and time range
- Admin UI settings persistence (localStorage with validation + tests)
- /health/ready readiness and Prometheus /metrics (API and workers)
- Simulator docs and CLI workflow examples

### Why this matters
- Quick visibility: list usage events in minutes
- Better DX: settings persist across reloads
- Sanity checks: health + metrics ready for monitoring
- Repeatable tests: simulator docs to standardize flows

### Upgrade guide
No breaking changes. Pull latest, run pnpm install && pnpm build, then start API/UI.
