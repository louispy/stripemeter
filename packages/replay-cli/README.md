## @stripemeter/replay-cli

Backfill/replay CLI to safely resend usage events (CSV or JSON lines) to the local API with idempotency.

### Install

This package is part of the monorepo. Build with:

```bash
pnpm -r build
```

### Usage

```bash
pnpm --filter @stripemeter/replay-cli exec replay \
  --input ./events.csv \
  --format csv \
  --tenant demo \
  --api-url http://localhost:3000 \
  --window-hours 24 \
  --concurrency 5 \
  --rate 10 \
  --batch-size 100 \
  --dry-run
```

Input schema (CSV headers or JSON line fields):

- id (optional idempotency key)
- customer
- meter
- qty
- ts (ISO8601)
- resourceId (optional)
- meta (optional JSON for JSONL only)


