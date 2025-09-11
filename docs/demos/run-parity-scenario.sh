#!/usr/bin/env bash
set -euo pipefail

MODE="${1:-}"
if [[ "$MODE" == "--mode" ]]; then MODE="$2"; fi
MODE="${MODE:-dry-run}"

mkdir -p artifacts

echo "[*] Seeding demo usage with duplicates + late events..."
# You can replace these with your existing demo helpers:
bash docs/demos/seed-demo-usage.sh | tee artifacts/parity-log.txt

echo "[*] Showing pre-replay reconciliation summary..."
curl -s "http://localhost:3000/v1/reconciliation/summary?tenantId=demo&metric=requests" \
  | jq . | tee -a artifacts/parity-log.txt

echo "[*] Running replay ($MODE)..."
curl -s -X POST "http://localhost:3000/v1/replay" \
  -H "Content-Type: application/json" \
  -d "{\"tenantId\":\"demo\",\"metrics\":[\"requests\"],\"since\":\"-PT24H\",\"until\":\"now\",\"mode\":\"$MODE\"}" \
  | jq . | tee -a artifacts/parity-log.txt

echo "[*] Showing post-replay reconciliation summary..."
curl -s "http://localhost:3000/v1/reconciliation/summary?tenantId=demo&metric=requests" \
  | jq . | tee artifacts/parity-report.json

echo "[✓] Parity report written to artifacts/parity-report.json"
