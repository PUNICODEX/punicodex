#!/usr/bin/env node
/**
 * PuniCodex — Printful sync worker (phase 2).
 *
 * Creates real Printful store products for entries in store/products.json
 * and writes the returned printfulProductId back into the catalog.
 *
 * Resumable: a checkpoint file (session-debug/printful-sync-state.json)
 * records uploaded asset file IDs and finished product IDs, so an
 * interrupted run continues exactly where it stopped.
 *
 * Usage:
 *   PRINTFUL_API_KEY=... node scripts/sync-printful-products.js \
 *     [--only <templeId|punicodex>] [--kinds tee,print,sticker] \
 *     [--limit N] [--dry-run]
 *
 * Notes:
 *   - Print masters are the local PNGs (sites/{id}/assets/*.png,
 *     assets/brand/01-logos/*.png); only .webp derivatives are public.
 *   - Where a product's design calls for multiple assets in one area
 *     (composites like the sticker sheet), the worker prints the primary
 *     asset for that area and logs the composite as a manual follow-up.
 */
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const API = 'https://api.printful.com';
const CATALOG_FILE = path.join(ROOT, 'store', 'products.json');
const STATE_FILE = path.join(ROOT, 'session-debug', 'printful-sync-state.json');

const KEY = process.env.PRINTFUL_API_KEY;
const args = process.argv.slice(2);
const ONLY = argValue('--only');
const KINDS = argValue('--kinds') ? argValue('--kinds').split(',') : null;
const LIMIT = Number(argValue('--limit') || 0);
const DRY_RUN = args.includes('--dry-run');

function argValue(flag) {
  const i = args.indexOf(flag);
  return i === -1 ? null : args[i + 1];
}

// kind → preferred Printful catalog product: verify by name fragment, fall
// back to the known ID (names verified against the live catalog 2026-07).
const KIND_CATALOG = {
  tee: { id: 71, fragment: 'bella + canvas 3001' },
  hoodie: { id: 294, fragment: 'bella + canvas 3719' },
  crewneck: { id: 145, fragment: 'gildan 18000' },
  print: { id: 268, fragment: 'enhanced matte paper poster (cm)' },
  canvas: { id: 3, fragment: 'canvas (in)' },
  sticker: { id: 505, fragment: 'kiss-cut sticker sheet' },
  pin: { id: 660, fragment: 'set of pin buttons' },
  mug: { id: 300, fragment: 'black glossy mug' },
  tumbler: { id: 585, fragment: 'stainless steel tumbler' },
  tote: { id: 641, fragment: 'cotton tote bag' },
  phonecase: { id: 683, fragment: 'snap case for iphone' },
  cap: { id: 638, fragment: 'adidas dad hat' },
  notebook: { id: 474, fragment: 'spiral notebook' },
};

// Per-kind file type for the primary print area (embroidery products don't
// accept "default") and extra sync-variant options (embroidery type +
// thread colours — 1672 Old Gold, the house antique gold).
const KIND_FRONT_FILE_TYPE = {
  cap: 'embroidery_front',
};
const KIND_OPTIONS = {
  cap: [
    { id: 'embroidery_type', value: 'flat' },
    { id: 'thread_colors', value: ['#A67843'] },
  ],
};

// Print masters are reachable by URL: temple masters live on the dedicated
// static masters deployment (2 GB of PNGs, kept out of the main site deploy);
// house brand masters are already public on punicodex.com.
const MASTERS_BASE = process.env.PRINTFUL_MASTERS_BASE || 'https://punycodex-masters.vercel.app';
const SITE_BASE = 'https://punicodex.com';

function assetUrlFor(product, assetKey) {
  const webp = product.assets && product.assets[assetKey];
  if (!webp) return null;
  const png = webp.replace(/\.webp$/, '.png');
  if (png.startsWith('/sites/')) return `${MASTERS_BASE}/${path.posix.basename(png)}`;
  return `${SITE_BASE}${png}`;
}

function loadState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  } catch {
    return { uploadedFiles: {}, done: {}, catalog: {} };
  }
}

function saveState(state) {
  const tmp = `${STATE_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(state, null, 2));
  fs.renameSync(tmp, STATE_FILE);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function api(method, endpoint, body, attempt = 0) {
  const res = await fetch(`${API}${endpoint}`, {
    method,
    headers: {
      Authorization: `Bearer ${KEY}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 429 && attempt < 6) {
    const wait = Number(res.headers.get('retry-after') || 2 ** attempt * 2);
    console.warn(`  rate limited — waiting ${wait}s`);
    await sleep(wait * 1000);
    return api(method, endpoint, body, attempt + 1);
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`${method} ${endpoint} → ${res.status}: ${JSON.stringify(json).slice(0, 300)}`);
  }
  await sleep(250); // stay well under the rate budget
  return json.result;
}

async function resolveCatalogProduct(state, kind, catalogList) {
  if (state.catalog[kind]) return state.catalog[kind];
  const mapping = KIND_CATALOG[kind];
  if (!mapping) throw new Error(`no catalog mapping for kind "${kind}"`);
  const lower = catalogList.map((p) => ({ id: p.id, name: String(p.title || p.name).toLowerCase() }));
  const byName = lower.find((p) => p.name.includes(mapping.fragment));
  const chosen = byName || lower.find((p) => p.id === mapping.id);
  if (!chosen) {
    throw new Error(
      `catalog product for kind "${kind}" not found (fragment "${mapping.fragment}", id ${mapping.id})`
    );
  }
  if (!chosen.name.includes(mapping.fragment)) {
    console.warn(
      `  warn: kind "${kind}" resolved to "${chosen.name}" (id ${chosen.id}) — expected "${mapping.fragment}"`
    );
  }
  state.catalog[kind] = chosen.id;
  saveState(state);
  return chosen.id;
}

async function pickVariants(catalogProductId, kind) {
  const detail = await api('GET', `/products/${catalogProductId}`);
  const variants = detail.variants || [];
  if (['tee', 'hoodie', 'crewneck'].includes(kind)) {
    // One colour, all sizes — prefer Black for the obsidian-gold identity.
    const black = variants.filter((v) => /black/i.test(v.color || ''));
    const chosen = black.length ? black : variants;
    return chosen.slice(0, 8);
  }
  return variants.slice(0, 6);
}

async function syncProduct(state, product, catalogList) {
  const kind = product.kind;
  const catalogId = await resolveCatalogProduct(state, kind, catalogList);
  const variants = await pickVariants(catalogId, kind);

  // Primary asset per area (composites logged as manual follow-up).
  const byArea = new Map();
  for (const pl of product.design.placements) {
    if (!byArea.has(pl.area)) byArea.set(pl.area, pl.asset);
    else console.log(`  composite design on ${product.id} (${pl.area}: +${pl.asset}) — primary asset used, composite pending`);
  }

  const files = [];
  for (const [area, assetKey] of byArea) {
    const url = assetUrlFor(product, assetKey);
    if (!url) throw new Error(`print master missing for ${product.id}: ${assetKey}`);
    files.push({ type: area === 'back' ? 'back' : KIND_FRONT_FILE_TYPE[kind] || 'default', url });
  }

  const body = {
    sync_product: { name: product.name, external_id: product.id },
    sync_variants: variants.map((v) => ({
      variant_id: v.id,
      retail_price: product.price.toFixed(2),
      files,
      ...(KIND_OPTIONS[kind] ? { options: KIND_OPTIONS[kind] } : {}),
    })),
  };
  try {
    const created = await api('POST', '/store/products', body);
    return created.id;
  } catch (err) {
    // Some products (mugs, caps, phone cases, …) only accept a default
    // print area — fall back to the primary asset alone.
    if (!/Incorrect file type/.test(err.message) || files.length < 2) throw err;
    console.log(`  ${product.id}: no back placement on this product — front asset only`);
    body.sync_variants = body.sync_variants.map((v) => ({ ...v, files: [files[0]] }));
    const created = await api('POST', '/store/products', body);
    return created.id;
  }
}

async function refreshProduct(state, product, catalogList) {
  const kind = product.kind;
  const catalogId = await resolveCatalogProduct(state, kind, catalogList);
  const detail = await api('GET', `/store/products/${product.printfulProductId}`);
  const existing = detail.sync_variants || [];

  const byArea = new Map();
  for (const pl of product.design.placements) byArea.set(pl.area, pl.asset);
  const files = [];
  for (const [area, assetKey] of byArea) {
    const url = assetUrlFor(product, assetKey);
    if (!url) throw new Error(`print master missing for ${product.id}: ${assetKey}`);
    files.push({ type: area === 'back' ? 'back' : KIND_FRONT_FILE_TYPE[kind] || 'default', url });
  }

  const body = {
    sync_product: { name: product.name, external_id: product.id },
    sync_variants: existing.map((v) => ({
      id: v.id,
      variant_id: v.variant_id,
      retail_price: product.price.toFixed(2),
      files,
      ...(KIND_OPTIONS[kind] ? { options: KIND_OPTIONS[kind] } : {}),
    })),
  };
  try {
    await api('PUT', `/store/products/${product.printfulProductId}`, body);
  } catch (err) {
    if (!/Incorrect file type/.test(err.message) || files.length < 2) throw err;
    body.sync_variants = body.sync_variants.map((v) => ({ ...v, files: [files[0]] }));
    await api('PUT', `/store/products/${product.printfulProductId}`, body);
  }
  return product.printfulProductId;
}

async function main() {
  const catalog = JSON.parse(fs.readFileSync(CATALOG_FILE, 'utf8'));
  const state = loadState();
  const REFRESH = args.includes('--refresh');

  let pending = REFRESH
    ? catalog.products.filter((p) => p.printfulProductId)
    : catalog.products.filter((p) => !p.printfulProductId && !state.done[p.id]);
  if (ONLY) pending = pending.filter((p) => (p.temple || 'punicodex') === ONLY);
  if (KINDS) pending = pending.filter((p) => KINDS.includes(p.id.split('-').pop()));
  if (LIMIT) pending = pending.slice(0, LIMIT);

  console.log(
    `Printful sync: ${pending.length} product(s) ${REFRESH ? 'to refresh' : 'pending'}${ONLY ? ` (only ${ONLY})` : ''}${KINDS ? ` (kinds ${KINDS})` : ''}.`
  );
  if (DRY_RUN) {
    const byKind = {};
    for (const p of pending) byKind[p.id.split('-').pop()] = (byKind[p.id.split('-').pop()] || 0) + 1;
    console.log('dry run — would sync by kind:', byKind);
    return;
  }
  if (!KEY) {
    console.error('PRINTFUL_API_KEY is not set.');
    process.exit(1);
  }

  const catalogList = await api('GET', '/products');
  console.log(`Printful catalog: ${catalogList.length} base products available.`);

  let done = 0;
  for (const product of pending) {
    const kind = product.id.split('-').pop();
    product.kind = kind; // used by syncProduct/refreshProduct
    try {
      const printfulId = REFRESH
        ? await refreshProduct(state, product, catalogList)
        : await syncProduct(state, product, catalogList);
      product.printfulProductId = printfulId;
      state.done[product.id] = printfulId;
      saveState(state);
      done++;
      console.log(`  ✓ ${product.id} → printful ${printfulId} (${done}/${pending.length})`);
      if (done % 10 === 0) flushCatalog(catalog);
    } catch (err) {
      console.error(`  ✗ ${product.id}: ${err.message}`);
      flushCatalog(catalog);
      throw err; // checkpoints are saved per product — safe to stop and resume
    }
  }
  flushCatalog(catalog);
  console.log(`Done: ${done} product(s) ${REFRESH ? 'refreshed' : 'synced'}, catalog updated.`);
}

function flushCatalog(catalog) {
  for (const p of catalog.products) delete p.kind;
  const tmp = `${CATALOG_FILE}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(catalog, null, 2)}\n`);
  fs.renameSync(tmp, CATALOG_FILE);
}

main().catch((err) => {
  console.error(`Sync stopped: ${err.message}`);
  process.exit(1);
});
