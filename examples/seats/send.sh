#!/usr/bin/env bash
set -euo pipefail

API_URL="${STRIPEMETER_API_URL:-http://localhost:3000}"
TENANT_ID="${TENANT_ID:-your-tenant-id}"
CUSTOMER_REF="${CUSTOMER_REF:-cust_456}"
METRIC="seats"
IDEMPOTENCY_KEY="${IDEMPOTENCY_KEY:-seat-evt-1}"

DATA=$(cat <<JSON
{
  "events": [{
    "tenantId": "${TENANT_ID}",
    "metric": "${METRIC}",
    "customerRef": "${CUSTOMER_REF}",
    "quantity": 10,
    "ts": "2025-01-01T00:00:00Z",
    "idempotencyKey": "${IDEMPOTENCY_KEY}"
  }]
}
JSON
)

echo "→ Ingesting seats event (idempotencyKey=${IDEMPOTENCY_KEY})"
curl -s -X POST "${API_URL}/v1/events/ingest" \
  -H "Content-Type: application/json" \
  -d "${DATA}" | jq . || true

sleep 0.5

echo "→ Re-sending same seats event (should be deduped)"
curl -s -X POST "${API_URL}/v1/events/ingest" \
  -H "Content-Type: application/json" \
  -d "${DATA}" | jq . || true

echo "✓ Done"
