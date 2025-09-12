#!/usr/bin/env bash
set -euo pipefail

DIR=$(cd "$(dirname "$0")" && pwd)
ROOT=$(cd "$DIR/../../.." && pwd)
STATE_FILE="$DIR/.state.json"

echo "[*] Stripe Test Clocks Demo: setup"

require() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

require jq
require curl

API="http://localhost:3000"
STRIPE_KEY="${STRIPE_SECRET_KEY:-}"
if [[ -z "$STRIPE_KEY" ]]; then
  echo "STRIPE_SECRET_KEY is not set (sk_test_...). Aborting." >&2
  exit 1
fi

mkdir -p "$DIR"
touch "$STATE_FILE"
if [[ ! -s "$STATE_FILE" ]]; then echo '{}' > "$STATE_FILE"; fi

api() {
  curl -fsS "$API$1" "$@"
}

stripe() {
  curl -fsS https://api.stripe.com/v1/$1 \
    -u "$STRIPE_KEY:" \
    "$@"
}

read_state() {
  jq -r "$1 // empty" "$STATE_FILE"
}

write_state() {
  local key=$1
  local val=$2
  tmp=$(mktemp)
  jq --argjson v "$val" ".[$key]=$v" "$STATE_FILE" > "$tmp"
  mv "$tmp" "$STATE_FILE"
}

json_str() {
  printf '%s' "$1" | jq -Rs .
}

TENANT_ID=$(read_state .tenantId)
if [[ -z "$TENANT_ID" ]]; then
  if command -v uuidgen >/dev/null 2>&1; then
    TENANT_ID=$(uuidgen)
  else
    TENANT_ID=$(cat /proc/sys/kernel/random/uuid 2>/dev/null || printf '00000000-0000-0000-0000-000000000000')
  fi
  write_state tenantId "$(json_str "$TENANT_ID")"
fi

echo "[*] Creating Stripe Test Clock..."
CLOCK_JSON=$(stripe 'test_helpers/test_clocks' \
  -d frozen_time=$(date -u +%s) \
  -d name="Stripemeter Demo Clock" \
  -d status="advancing" \
  -d 'present=true')
TEST_CLOCK_ID=$(printf '%s' "$CLOCK_JSON" | jq -r .id)
write_state testClockId "$(json_str "$TEST_CLOCK_ID")"
echo "    clock: $TEST_CLOCK_ID"

echo "[*] Creating Product + Metered Price..."
PROD_JSON=$(stripe products -d name="API Calls Product" -d description="Stripemeter demo product")
PRODUCT_ID=$(printf '%s' "$PROD_JSON" | jq -r .id)
PRICE_JSON=$(stripe prices \
  -d currency=usd \
  -d product="$PRODUCT_ID" \
  -d 'recurring[interval]=month' \
  -d 'recurring[usage_type]=metered' \
  -d nickname="api_calls")
PRICE_ID=$(printf '%s' "$PRICE_JSON" | jq -r .id)
write_state productId "$(json_str "$PRODUCT_ID")"
write_state priceId "$(json_str "$PRICE_ID")"
echo "    product: $PRODUCT_ID price: $PRICE_ID"

echo "[*] Creating Customer on the Test Clock..."
CUS_JSON=$(stripe customers \
  -d name="Demo Customer" \
  -d email="demo+testclocks@example.com" \
  -d 'test_clock'="$TEST_CLOCK_ID")
CUSTOMER_ID=$(printf '%s' "$CUS_JSON" | jq -r .id)
write_state customerId "$(json_str "$CUSTOMER_ID")"
echo "    customer: $CUSTOMER_ID"

echo "[*] Creating Subscription with metered price..."
SUB_JSON=$(stripe subscriptions \
  -d customer="$CUSTOMER_ID" \
  -d 'items[0][price]'="$PRICE_ID" \
  -d 'collection_method=charge_automatically')
SUBSCRIPTION_ID=$(printf '%s' "$SUB_JSON" | jq -r .id)
SUB_ITEM_ID=$(printf '%s' "$SUB_JSON" | jq -r '.items.data[0].id')
write_state subscriptionId "$(json_str "$SUBSCRIPTION_ID")"
write_state subscriptionItemId "$(json_str "$SUB_ITEM_ID")"
echo "    subscription: $SUBSCRIPTION_ID item: $SUB_ITEM_ID"

echo "[*] Upserting price mapping in Postgres (docker exec stripemeter-postgres)"
SQL=$(cat <<EOSQL
INSERT INTO price_mappings (tenant_id, metric, aggregation, stripe_account, price_id, subscription_item_id, currency, active)
VALUES ('$TENANT_ID','api_calls','sum','default','$PRICE_ID','$SUB_ITEM_ID','USD', true)
ON CONFLICT ON CONSTRAINT unique_active_mapping
DO UPDATE SET price_id=EXCLUDED.price_id,
              subscription_item_id=EXCLUDED.subscription_item_id,
              currency=EXCLUDED.currency,
              aggregation=EXCLUDED.aggregation,
              stripe_account=EXCLUDED.stripe_account,
              active=true;
EOSQL
)

if docker ps --format '{{.Names}}' | grep -q '^stripemeter-postgres$'; then
  echo "$SQL" | docker exec -i stripemeter-postgres psql -U stripemeter -d stripemeter >/dev/null
  echo "    mapping upserted for tenant $TENANT_ID → item $SUB_ITEM_ID"
else
  echo "[!] Postgres container 'stripemeter-postgres' not running. Please start docker compose and re-run."
  exit 1
fi

echo "[*] Setup complete"
echo "    Save these IDs (also in .state.json):"
jq '{tenantId, testClockId, customerId, priceId, subscriptionId, subscriptionItemId}' "$STATE_FILE"


