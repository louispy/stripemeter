#!/usr/bin/env bash
set -euo pipefail

API_URL="${STRIPEMETER_API_URL:-http://localhost:3000}"

echo "# 1) Health (should be healthy or degraded)"
curl -fsS "${API_URL}/health/ready" | jq . || true

echo
bash "$(dirname "$0")/send.sh"

echo
echo "# 3) Metrics (should reflect one accepted ingest)"
curl -fsS "${API_URL}/metrics" | head -n 30 || true
