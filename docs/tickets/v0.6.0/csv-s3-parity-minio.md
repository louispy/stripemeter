---
name: Feature request
about: Suggest an idea for this project
---

**Problem**
Teams need offline parity checks against CSV/S3 exports. Lack of a simple adapter and local object storage slows adoption.

**Proposed solution**
CSV/S3 Parity Adapter with MinIO profile for local testing. Produce parity report (JSON/CSV) with epsilon markers and actionable deltas.

**Scope**
- Adapter to read CSV/S3 usage snapshots → compare against counters
- Output report (JSON and CSV) with per‑metric/counter diffs
- MinIO docker‑compose profile; seed/demo buckets and scripts
- API endpoint and CLI to run parity; docs

**Acceptance criteria**
- `docker compose --profile minio up` brings MinIO; running parity yields drift report
- Works with live/Shadow Mode; tests and documentation included

**Out of scope**
- Generic data lake connectors (future)

**Technical notes**
- S3 client with path/prefix filters; CSV schema validation
- Place infra under `infra/` and docs under `docs/demos/`

**Metrics**
- `parity_runs_total`, `parity_drift_items_total`

**Dependencies**
- Relates to #15 and #19

