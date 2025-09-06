# Changelog

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


