---
name: Feature request
about: Suggest an idea for this project
---

**Problem**
Time‑to‑first‑value for new adopters can exceed 15 minutes and requires manual event crafting.

**Proposed solution**
10‑minute Quickstart with a Demo Emitter to generate realistic traffic patterns (steady/burst/late) and drive the parity demo.

**Scope**
- `demo-emitter` service (small Node app) with CLI flags and presets
- One‑command script to boot stack + emitter + test clocks
- README updates with GIF/video; CI job validates quickstart

**Acceptance criteria**
- New dev reaches “first verified metric” in ≤10 minutes on a clean machine
- CI workflow runs quickstart script and asserts health/metrics

**Out of scope**
- Production‑grade load generator (future)

**Technical notes**
- Put under `demo/` with docker profile
- Emit late events to exercise replay

**Metrics**
- `demo_emitter_events_total`, `demo_emitter_late_events_total`

**Dependencies**
- Relates to #78

