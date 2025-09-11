# API — Replay (v0.2.0)

[← Back to Welcome](../welcome.md)

POST /v1/replay

Request Body
```json
{
  "tenantId": "demo",
  "metrics": ["requests"],
  "since": "-PT24H",
  "until": "now",
  "mode": "dry-run"
}
```

Parameters
- `tenantId` (string, required): Tenant to replay events for
- `metrics` (array, required): List of metrics to replay
- `since` (string, required): Start time for replay (ISO 8601 or relative like "-PT24H")
- `until` (string, required): End time for replay (ISO 8601 or "now")
- `mode` (string, required): Either "dry-run" or "apply"

Response (dry-run)
```json
{
  "mode": "dry-run",
  "tenantId": "demo",
  "metrics": ["requests"],
  "timeRange": {
    "since": "2025-01-15T14:30:00Z",
    "until": "2025-01-16T14:30:00Z"
  },
  "changes": {
    "requests": {
      "eventsFound": 150,
      "lateEvents": 5,
      "counterDelta": 50,
      "affectedCustomers": ["cus_123", "cus_456"]
    }
  },
  "summary": "Would update 2 counters with +50 total delta"
}
```

Response (apply)
```json
{
  "mode": "apply",
  "tenantId": "demo",
  "metrics": ["requests"],
  "timeRange": {
    "since": "2025-01-15T14:30:00Z",
    "until": "2025-01-16T14:30:00Z"
  },
  "changes": {
    "requests": {
      "eventsFound": 150,
      "lateEvents": 5,
      "counterDelta": 50,
      "affectedCustomers": ["cus_123", "cus_456"]
    }
  },
  "applied": true,
  "summary": "Updated 2 counters with +50 total delta"
}
```

Examples
```bash
# Dry-run replay for last 24 hours
curl -X POST http://localhost:3000/v1/replay \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "demo",
    "metrics": ["requests"],
    "since": "-PT24H",
    "until": "now",
    "mode": "dry-run"
  }'

# Apply the replay changes
curl -X POST http://localhost:3000/v1/replay \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "demo",
    "metrics": ["requests"],
    "since": "-PT24H",
    "until": "now",
    "mode": "apply"
  }'
```

Notes
- Always run `dry-run` first to see what changes would be made
- Replay processes events within the watermark window (configurable per metric)
- Late events outside the watermark become adjustments
- Use relative times like "-PT24H" for rolling windows
