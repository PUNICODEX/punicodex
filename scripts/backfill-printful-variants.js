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

function loadState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  } catch {
    return { done: {} };
  }
}

function saveState(state) {
  const tmp = `${STATE_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(state));
  fs.renameSync(tmp, STATE_FILE);
}

function variantLabel(v) {
  // "Zeús Temple Tee / Black / 2XL" → "2XL"; posters/mugs keep the size too.
  const size = v.size && v.size !== 'One size' ? v.size : null;
  const color = v.color && !/black/i.test(v.color) ? v.color : null;
  return [color, size].filter(Boolean).join(' / ') || 'One size';
}

async function main() {
  if (!KEY) {
    console.error('PRINTFUL_API_KEY is not set.');
    process.exit(1);
  }
  const catalog = JSON.parse(fs.readFileSync(CATALOG_FILE, 'utf8'));
  const state = loadState();

  let targets = catalog.products.filter((p) => p.printfulProductId && !state.done[p.id]);
  if (ONLY) targets = targets.filter((p) => (p.temple || 'punicodex') === ONLY);

  console.log(`Variant backfill: ${targets.length} product(s) to map.`);
  let done = 0;
  for (const product of targets) {
    try {
      const detail = await api(`/store/products/${product.printfulProductId}`);
      const variants = detail.sync_variants || [];
      const map = {};
      for (const v of variants) map[variantLabel(v)] = v.id;
      product.printfulVariants = map;
      product.printfulVariantCount = variants.length;
      state.done[product.id] = true;
      saveState(state);
      done++;
      if (done % 25 === 0) {
        flush(catalog);
        console.log(`  ${done}/${targets.length} mapped`);
      }
    } catch (err) {
      flush(catalog);
      console.error(`  ✗ ${product.id}: ${err.message}`);
      throw err;
    }
  }
  flush(catalog);
  console.log(`Backfill complete: ${done} product(s) mapped.`);
}

function flush(catalog) {
  const tmp = `${CATALOG_FILE}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(catalog, null, 2)}\n`);
  fs.renameSync(tmp, CATALOG_FILE);
}

main().catch((err) => {
  console.error(`Backfill stopped: ${err.message}`);
  process.exit(1);
});
