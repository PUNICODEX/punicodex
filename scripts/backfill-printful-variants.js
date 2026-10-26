#!/usr/bin/env node
/**
 * PuniCodex — Printful variant-map backfill.
 *
 * Order creation needs a sync-variant id per purchasable size/option.
 * For every product in store/products.json with a printfulProductId, fetch
 * the sync product and write back `printfulVariants` ({ label: variantId })
 * plus `printfulVariantCount`. Idempotent and resumable; safe to re-run.
 *
 * Usage: PRINTFUL_API_KEY=... node scripts/backfill-printful-variants.js [--only <temple>]
 */
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const API = 'https://api.printful.com';
const CATALOG_FILE = path.join(ROOT, 'store', 'products.json');
const STATE_FILE = path.join(ROOT, 'session-debug', 'printful-variant-backfill.json');

const KEY = process.env.PRINTFUL_API_KEY;
const args = process.argv.slice(2);
const ONLY = args.includes('--only') ? args[args.indexOf('--only') + 1] : null;
// Parallel rollout: --shard I/N processes only targets whose catalog index
// mod N equals I; each shard keeps its own checkpoint file.
const SHARD = args.includes('--shard') ? args[args.indexOf('--shard') + 1].split('/').map(Number) : null;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function api(endpoint, attempt = 0) {
  const res = await fetch(`${API}${endpoint}`, {
    headers: { Authorization: `Bearer ${KEY}` },
  });
  if (res.status === 429 && attempt < 6) {
    const wait = Number(res.headers.get('retry-after') || 2 ** attempt * 2);
    console.warn(`  rate limited — waiting ${wait}s`);
    await sleep(wait * 1000);
    return api(endpoint, attempt + 1);
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`GET ${endpoint} → ${res.status}: ${JSON.stringify(json).slice(0, 200)}`);
  await sleep(250);
  return json.result;
}

function stateFile() {
  return SHARD
    ? STATE_FILE.replace(/\.json$/, `.shard-${SHARD.join('-')}.json`)
    : STATE_FILE;
}

function loadState() {
  try {
    return JSON.parse(fs.readFileSync(stateFile(), 'utf8'));
  } catch {
    return { done: {} };
  }
}

function saveState(state) {
  fs.writeFileSync(stateFile(), JSON.stringify(state));
}

function variantLabel(v) {
  // "Zeús Temple Tee / Black / 2XL" → "Black / 2XL". The colour is kept
  // verbatim (black included) so multi-colour products stay distinguishable
  // and the labels match the variantPricing map keys.
  const size = v.size && v.size !== 'One size' ? v.size : null;
  const color = v.color || null;
  return [color, size].filter(Boolean).join(' / ') || 'One size';
}

// The sync-product and catalog APIs describe the same variant with cosmetic
// drifts ("20oz" vs "20 oz"; a single-variant notebook whose sync variant
// carries neither colour nor size). Normalize so the printfulVariants keys
// equal the variantPricing keys the checkout prices from.
function normalizeLabels(map, product) {
  const out = {};
  for (const [label, id] of Object.entries(map)) {
    out[label.replace(/(\d)\s?(oz)\b/i, '$1 $2')] = id;
  }
  const keys = Object.keys(out);
  if (keys.length === 1 && keys[0] === 'One size') {
    const priced = Object.keys(product.variantPricing || {});
    if (priced.length === 1) return { [priced[0]]: out['One size'] };
  }
  return out;
}

async function main() {
  if (args.includes('--merge')) {
    mergeShardUpdates();
    return;
  }
  if (!KEY) {
    console.error('PRINTFUL_API_KEY is not set.');
    process.exit(1);
  }
  const catalog = JSON.parse(fs.readFileSync(CATALOG_FILE, 'utf8'));
  const state = loadState();
  // Sharded workers never write the shared catalog (concurrent full-file
  // flushes would lose each other's maps) — updates accumulate in a
  // per-shard file applied by --merge after all shards finish.
  const shardUpdates = {};

  let targets = catalog.products.filter((p) => p.printfulProductId && !state.done[p.id]);
  if (SHARD) {
    const [i, n] = SHARD;
    targets = targets.filter((_, idx) => idx % n === i);
  }
  if (ONLY) targets = targets.filter((p) => (p.temple || 'punicodex') === ONLY);

  console.log(`Variant backfill: ${targets.length} product(s) to map.`);
  let done = 0;
  for (const product of targets) {
    try {
      const detail = await api(`/store/products/${product.printfulProductId}`);
      const variants = detail.sync_variants || [];
      const map = {};
      for (const v of variants) map[variantLabel(v)] = v.id;
      const printfulVariants = normalizeLabels(map, product);
      const printfulVariantCount = variants.length;
      if (SHARD) {
        shardUpdates[product.id] = { printfulVariants, printfulVariantCount };
      } else {
        product.printfulVariants = printfulVariants;
        product.printfulVariantCount = printfulVariantCount;
      }
      state.done[product.id] = true;
      saveState(state);
      done++;
      if (done % 25 === 0) {
        flush(catalog, shardUpdates);
        console.log(`  ${done}/${targets.length} mapped`);
      }
    } catch (err) {
      flush(catalog, shardUpdates);
      console.error(`  ✗ ${product.id}: ${err.message}`);
      throw err;
    }
  }
  flush(catalog, shardUpdates);
  console.log(`Backfill complete: ${done} product(s) mapped.`);
}

function shardUpdatesFile() {
  return STATE_FILE.replace(/\.json$/, `.updates-${SHARD.join('-')}.json`);
}

/**
 * Apply every shard's update file to products.json. Idempotent: re-running
 * after a partial merge just rewrites the same maps.
 */
function mergeShardUpdates() {
  const catalog = JSON.parse(fs.readFileSync(CATALOG_FILE, 'utf8'));
  const dir = path.join(ROOT, 'session-debug');
  let merged = 0;
  for (const f of fs.readdirSync(dir)) {
    const m = f.match(/^printful-variant-backfill\.updates-([\d-]+)\.json$/);
    if (!m) continue;
    const updates = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    for (const p of catalog.products) {
      const u = updates[p.id];
      if (!u) continue;
      p.printfulVariants = u.printfulVariants;
      p.printfulVariantCount = u.printfulVariantCount;
      merged++;
    }
    fs.unlinkSync(path.join(dir, f));
  }
  const tmp = `${CATALOG_FILE}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(catalog, null, 2)}\n`);
  fs.renameSync(tmp, CATALOG_FILE);
  console.log(`Merged shard variant maps into products.json (${merged} product update(s)).`);
}

function flush(catalog, shardUpdates = {}) {
  if (SHARD) {
    fs.writeFileSync(shardUpdatesFile(), JSON.stringify(shardUpdates));
    return;
  }
  const tmp = `${CATALOG_FILE}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(catalog, null, 2)}\n`);
  fs.renameSync(tmp, CATALOG_FILE);
}

main().catch((err) => {
  console.error(`Backfill stopped: ${err.message}`);
  process.exit(1);
});
