#!/usr/bin/env bash
# Shard the Printful photoreal pass across parallel single-temple runs.
# Usage: bash scripts/run-printful-photoreal-shards.sh <shard-index> <shard-count>
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
SHARD="$1"
COUNT="$2"
export PRINTFUL_API_KEY="${PRINTFUL_API_KEY:?PRINTFUL_API_KEY required}"
export PRINTFUL_MOCKUP_STATE="session-debug/printful-mockup-state-shard$SHARD.json"

mapfile -t IDS < <(node -e "
const { ARCHETYPES } = require('./js/archetypes-v2.js');
const ids = ARCHETYPES.map(a => a.id).concat(['punicodex']);
ids.forEach((id, i) => { if (i % $COUNT === $SHARD) console.log(id); });
")

echo "shard $SHARD/$COUNT: ${#IDS[@]} temples"
for id in "${IDS[@]}"; do
  echo "=== shard $SHARD → $id ==="
  node scripts/generate-printful-mockups.js --only "$id" --force || echo "shard $SHARD: $id exited non-zero — continuing"
done
echo "shard $SHARD complete"
