#!/usr/bin/env bash
set -euo pipefail

echo "[*] Seeding demo usage with duplicates and late events..."

# Send some demo events with duplicates
TENANT_ID="demo"
BASE_URL="http://localhost:3000"

# Event 1 - original
curl -s -X POST "$BASE_URL/v1/events/ingest" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: demo-event-1" \
  -d "{\"events\":[{\"tenantId\":\"$TENANT_ID\",\"metric\":\"requests\",\"customerRef\":\"cus_demo\",\"quantity\":100,\"ts\":\"$(date -u -v-1H +%Y-%m-%dT%H:%M:%SZ)\"}]}" \
  | jq -c '.accepted // 0' | xargs -I {} echo "Accepted: {}"

# Event 1 - duplicate (should be ignored)
curl -s -X POST "$BASE_URL/v1/events/ingest" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: demo-event-1" \
  -d "{\"events\":[{\"tenantId\":\"$TENANT_ID\",\"metric\":\"requests\",\"customerRef\":\"cus_demo\",\"quantity\":100,\"ts\":\"$(date -u -v-1H +%Y-%m-%dT%H:%M:%SZ)\"}]}" \
  | jq -c '.accepted // 0' | xargs -I {} echo "Accepted: {}"

# Event 2 - late event (older timestamp)
curl -s -X POST "$BASE_URL/v1/events/ingest" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: demo-event-late" \
  -d "{\"events\":[{\"tenantId\":\"$TENANT_ID\",\"metric\":\"requests\",\"customerRef\":\"cus_demo\",\"quantity\":50,\"ts\":\"$(date -u -v-2H +%Y-%m-%dT%H:%M:%SZ)\"}]}" \
  | jq -c '.accepted // 0' | xargs -I {} echo "Accepted: {}"

echo "[✓] Demo usage seeded"
