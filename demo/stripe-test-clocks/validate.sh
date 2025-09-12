#!/usr/bin/env bash
set -euo pipefail

DIR=$(cd "$(dirname "$0")" && pwd)
STATE_FILE="$DIR/.state.json"
API="http://localhost:3000"
LOG_FILE="$DIR/validate.log"
INV_FILE="$DIR/invoice.json"

require() { command -v "$1" >/dev/null 2>&1 || { echo "Missing command: $1"; exit 1; }; }
require jq
require curl

if [[ ! -s "$STATE_FILE" ]]; then echo "Run ./run.sh first" >&2; exit 1; fi

TENANT_ID=$(jq -r .tenantId "$STATE_FILE")

# Derive current period YYYY-MM from UTC
PERIOD=$(date -u +%Y-%m)

echo "[*] Validating reconciliation for period $PERIOD" | tee "$LOG_FILE"

SUMMARY=$(curl -fsS "$API/v1/reconciliation/summary?tenantId=$TENANT_ID&periodStart=$PERIOD&periodEnd=$PERIOD")
echo "$SUMMARY" | jq . | tee -a "$LOG_FILE"

DRIFT_ABS=$(echo "$SUMMARY" | jq -r .overall.drift_abs)
DRIFT_PCT=$(echo "$SUMMARY" | jq -r .overall.drift_pct)

EPSILON=${RECONCILIATION_EPSILON:-0.005}

ok_abs=$(python - <<PY
import decimal,sys
d=decimal.Decimal('$DRIFT_ABS')
print('1' if d == 0 else '0')
PY
)

ok_pct=$(python - <<PY
import decimal,sys
d=decimal.Decimal('$DRIFT_PCT')
e=decimal.Decimal('$EPSILON')
print('1' if d <= e else '0')
PY
)

if [[ "$ok_abs" == "1" || "$ok_pct" == "1" ]]; then
  echo "[✓] Parity within epsilon (abs=$DRIFT_ABS, pct=$DRIFT_PCT <= $EPSILON)" | tee -a "$LOG_FILE"
else
  echo "[x] Drift exceeds epsilon (abs=$DRIFT_ABS, pct=$DRIFT_PCT > $EPSILON)" | tee -a "$LOG_FILE"
fi

# Optional: Pull latest invoice for the subscription item via Stripe API if available
if [[ -n "${STRIPE_SECRET_KEY:-}" && -s "$DIR/.state.json" ]]; then
  SUB_ITEM_ID=$(jq -r .subscriptionItemId "$DIR/.state.json")
  if [[ -n "$SUB_ITEM_ID" && "$SUB_ITEM_ID" != "null" ]]; then
    echo "[*] Fetching latest usage summary from Stripe for $SUB_ITEM_ID"
    curl -fsS https://api.stripe.com/v1/subscription_items/$SUB_ITEM_ID/usage_record_summaries \
      -u "$STRIPE_SECRET_KEY:" | jq . | tee "$INV_FILE" >/dev/null || true
  fi
fi

if [[ "$ok_abs" == "1" || "$ok_pct" == "1" ]]; then exit 0; else exit 2; fi


