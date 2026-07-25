#!/usr/bin/env node
/**
 * PuniCodex — per-variant pricing builder.
 *
 * The catalog (store/products.json) prices every product flat, but POD cost
 * varies by size/option: a 12″×36″ canvas costs Printful ~3× what a 10″×10″
 * costs. This worker fetches the Printful catalog variants once per kind
 * (13 kinds → 13 API calls), computes our per-variant retail price, and
 * writes `variantPricing: { label: priceCents }` onto every product of the
 * kind (same spread for all temples; the cheaper house line keeps its own
 * base). The checkout server and the product pages price from this map.
 *
 * Pricing rule (margin-preserving):
 *   ourVariantPrice = ourFlatPrice
 *                   + max(0, printfulPrice(variant) − printfulPrice(cheapest variant of kind))
 * rounded to whole dollars and stored as cents. Sizes only ever go up from
 * the flat base price.
 *
 * Resumable (one checkpoint per kind) and idempotent; safe to re-run.
 *
 * Usage:
 *   PRINTFUL_API_KEY=... node scripts/build-variant-pricing.js [--kinds tee,canvas] [--force]
 */
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const API = 'https://api.printful.com';
const CATALOG_FILE = path.join(ROOT, 'store', 'products.json');
const STATE_FILE = path.join(ROOT, 'session-debug', 'variant-pricing-state.json');

const KEY = process.env.PRINTFUL_API_KEY;
const args = process.argv.slice(2);
const FORCE = args.includes('--force');
const KINDS = argValue('--kinds') ? argValue('--kinds').split(',') : null;

function argValue(flag) {
  const i = args.indexOf(flag);
  return i === -1 ? null : args[i + 1];
}

// kind → Printful catalog product id. Keep in sync with KIND_CATALOG in
// scripts/sync-printful-products.js.
const KIND_CATALOG_ID = {
  tee: 71,
  hoodie: 294,
  crewneck: 145,
  print: 268,
  canvas: 3,
  sticker: 505,
  pin: 660,
  mug: 300,
  tumbler: 585,
  tote: 641,
  phonecase: 683,
  cap: 638,
  notebook: 474,
};

const money = (n) => `$${Number(n).toFixed(2)}`;

// Label rule — MUST match variantLabel() in scripts/backfill-printful-variants.js
// so the pricing map keys equal the printfulVariants keys the checkout
// receives (colour kept verbatim: "Black / M", never "M").
function variantLabel(v) {
  const size = v.size && v.size !== 'One size' ? v.size : null;
  const color = v.color || null;
  return [color, size].filter(Boolean).join(' / ') || 'One size';
}

// The variants we actually sell per kind — MUST mirror pickVariants() in
// scripts/sync-printful-products.js.
function sellableVariants(variants, kind) {
  if (kind === 'tee') {
    // Curated palette: Black + White, up to 8 sizes per colour (the size set
    // the existing sync products carry — catalog order puts XS last).
    const wanted = ['black', 'white'].flatMap((color) =>
      variants
        .filter((v) => String(v.color || '').trim().toLowerCase() === color)
        .slice(0, 8)
    );
    return wanted.length ? wanted : variants.slice(0, 16);
  }
  if (kind === 'hoodie' || kind === 'crewneck') {
    // Black only, all sizes — premium dark garment identity.
    const black = variants.filter((v) => /black/i.test(v.color || ''));
    return (black.length ? black : variants).slice(0, 8);
  }
  return variants.slice(0, 6);
}

/**
 * Pricing rule: our flat retail rides on the cheapest variant of the kind;
 * every pricier variant passes its Printful cost delta straight through.
 * Returns the { label: priceCents } map; every price is a whole-dollar
 * amount in cents and never below flatPrice × 100.
 */
function computeVariantPricing(flatPrice, variants) {
  const cheapest = Math.min(...variants.map((v) => Number(v.price)));
  const map = {};
  for (const v of variants) {
    const delta = Math.max(0, Number(v.price) - cheapest);
    map[variantLabel(v)] = Math.round(flatPrice + delta) * 100;
  }
  return map;
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
  fs.writeFileSync(tmp, JSON.stringify(state, null, 2));
  fs.renameSync(tmp, STATE_FILE);
}

function flushCatalog(catalog) {
  const tmp = `${CATALOG_FILE}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(catalog, null, 2)}\n`);
  fs.renameSync(tmp, CATALOG_FILE);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function api(method, endpoint, attempt = 0) {
  const res = await fetch(`${API}${endpoint}`, {
    method,
    headers: { Authorization: `Bearer ${KEY}` },
  });
  if (res.status === 429 && attempt < 6) {
    const wait = Number(res.headers.get('retry-after') || 2 ** attempt * 2);
    console.warn(`  rate limited — waiting ${wait}s`);
    await sleep(wait * 1000);
    return api(method, endpoint, attempt + 1);
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`${method} ${endpoint} → ${res.status}: ${JSON.stringify(json).slice(0, 200)}`);
  }
  await sleep(250); // stay well under the rate budget
  return json.result;
}

async function main() {
  const catalog = JSON.parse(fs.readFileSync(CATALOG_FILE, 'utf8'));
  const state = loadState();

  const byKind = new Map();
  for (const p of catalog.products) {
    const kind = p.id.split('-').pop();
    if (!KIND_CATALOG_ID[kind]) continue;
    if (!byKind.has(kind)) byKind.set(kind, []);
    byKind.get(kind).push(p);
  }

  const kinds = [...byKind.keys()].filter(
    (k) => (!KINDS || KINDS.includes(k)) && (FORCE || !state.done[k])
  );
  console.log(
    `Variant pricing: ${kinds.length} kind(s) to price${KINDS ? ` (kinds ${KINDS})` : ''}${FORCE ? ' (forced)' : ''}.`
  );
  if (!kinds.length) {
    console.log('Nothing to do — every kind already priced (use --force to rebuild).');
    return;
  }
  if (!KEY) {
    console.error('PRINTFUL_API_KEY is not set.');
    process.exit(1);
  }

  for (const kind of kinds) {
    const products = byKind.get(kind);
    const detail = await api('GET', `/products/${KIND_CATALOG_ID[kind]}`);
    const sellable = sellableVariants(detail.variants || [], kind);
    if (!sellable.length) {
      console.warn(`  ${kind}: no catalog variants — skipped`);
      continue;
    }
    // One map per distinct flat price: temple lines and the cheaper house
    // line share the kind's spread but keep their own base price.
    const flats = [...new Set(products.map((p) => p.price))].sort((a, b) => a - b);
    const summaries = [];
    for (const flat of flats) {
      const map = computeVariantPricing(flat, sellable);
      for (const p of products.filter((x) => x.price === flat)) p.variantPricing = map;
      const entries = Object.entries(map).sort((a, b) => a[1] - b[1]);
      const [loLabel, loCents] = entries[0];
      const [hiLabel, hiCents] = entries[entries.length - 1];
      summaries.push(
        `base ${money(flat)}: ${loLabel} ${money(loCents / 100)} → ${hiLabel} ${money(hiCents / 100)}`
      );
    }
    flushCatalog(catalog); // write before checkpointing — a redo is idempotent
    state.done[kind] = true;
    saveState(state);
    console.log(
      `  ${kind}: ${sellable.length} variants priced onto ${products.length} products — ${summaries.join('; ')}`
    );
  }
  console.log('Variant pricing complete.');
}

if (require.main === module) {
  main().catch((err) => {
    console.error(`Variant pricing stopped: ${err.message}`);
    process.exit(1);
  });
}

module.exports = { computeVariantPricing, variantLabel, sellableVariants, KIND_CATALOG_ID };
