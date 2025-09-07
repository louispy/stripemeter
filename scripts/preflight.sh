#!/usr/bin/env bash
set -euo pipefail

PASS=true

echo "Checking prerequisites..."

# Node
if ! command -v node >/dev/null 2>&1; then echo "✖ Node.js missing (need v20+)"; PASS=false; else echo "✔ Node $(node -v)"; fi

# pnpm
if ! command -v pnpm >/dev/null 2>&1; then echo "✖ pnpm missing (install: npm i -g pnpm@8)"; PASS=false; else echo "✔ pnpm $(pnpm -v)"; fi

# Docker
if ! docker info >/dev/null 2>&1; then echo "✖ Docker not running"; PASS=false; else echo "✔ Docker running"; fi

# jq (optional but helpful)
if ! command -v jq >/dev/null 2>&1; then echo "◦ jq not found (brew install jq | apt-get install -y jq)"; else echo "✔ jq present"; fi

# Ports
for p in 3000 3001 3002 5432 6379; do
  if lsof -i :$p >/dev/null 2>&1; then echo "◦ WARN: port $p in use"; fi
done

if [ "$PASS" = true ]; then
  echo "\nPreflight: PASS — you're good to go."
  exit 0
else
  echo "\nPreflight: FAIL — see messages above."
  exit 1
fi
