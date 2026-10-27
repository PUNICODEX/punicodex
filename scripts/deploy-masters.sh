#!/usr/bin/env bash
# PuniCodex — guarded deploy of the punycodex-masters media host.
#
# 2026-10-27 incident: a deploy ran from a .masters folder that had lost
# ~7,000 of its 7,132 mockups, silently replacing the full live fleet with
# 78 files. This script exists so that can never happen again: the deploy
# ABORTS unless the local mockup count covers the full product catalog.
#
# Usage: bash scripts/deploy-masters.sh   (from anywhere)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

EXPECTED=$(node -e "
const p = require('./store/products.json');
const list = Array.isArray(p.products) ? p.products : Object.values(p.products || {});
console.log(list.length);
")
JPGS=$(find .masters/mockups -maxdepth 1 -name '*.jpg' 2>/dev/null | wc -l | tr -d ' ')

echo "Pre-flight: $JPGS local mockup JPGs vs $EXPECTED catalog products."
if [ "$JPGS" -lt "$EXPECTED" ]; then
  echo "ABORT — local fleet is partial ($JPGS of $EXPECTED)." >&2
  echo "Deploying now would overwrite the live fleet with a subset." >&2
  echo "Restore the missing renders first (see scripts/audit-mockup-fleet.js)." >&2
  exit 1
fi

echo "Pre-flight OK — deploying punycodex-masters."
cd .masters
# 17k+ files exceed the 15,000-item upload cap — archive upload is mandatory
# (same doctrine as the main site's deploys).
exec vercel deploy --prod --yes --archive=tgz
