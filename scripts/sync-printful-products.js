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
 *     [--limit N] [--dry-run] [--refresh] [--full-palette]
 *
 * --refresh realigns existing sync products (adds/removes variants to match
 * the current pickVariants palette). --full-palette switches tee/hoodie/
 * crewneck/cap/tote to the wide curated color set (P3); it must be mirrored by
 * `build-variant-pricing.js --force --full-palette` so pricing covers the new
 * variant labels.
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
// P3 full-color expansion: --full-palette syncs the wide curated palette
// (scripts/printful-palette.js) instead of the historic curated minimum.
const FULL_PALETTE = args.includes('--full-palette');
// Parallel rollout: --shard I/N processes only targets whose catalog index
// mod N equals I. Each worker checkpoints independently; shards never touch
// each other's products. Combined with --refresh for wide palette passes.
const SHARD = argValue('--shard') ? argValue('--shard').split('/') .map(Number) : null;

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
    return JSON.parse(fs.readFileSync(stateFile(), 'utf8'));
  } catch {
    return { uploadedFiles: {}, done: {}, catalog: {} };
  }
}

function saveState(state) {
  const tmp = `${stateFile()}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(state, null, 2));
  fs.renameSync(tmp, stateFile());
}

// Sharded workers keep independent checkpoints (see --shard): concurrent
// writes to one shared file would lose each other's done-markers.
function stateFile() {
  const shard = argValue('--shard');
  return shard ? STATE_FILE.replace(/\.json$/, `.shard-${shard.replace('/', '-')}.json`) : STATE_FILE;
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

// In-memory memo: the catalog doesn't change mid-run — fetching the picked
// variant set once per kind saves ~7k identical GETs on a --refresh pass.
const PICKED_MEMO = new Map();

async function pickVariants(catalogProductId, kind) {
  if (PICKED_MEMO.has(kind)) return PICKED_MEMO.get(kind);
  const detail = await api('GET', `/products/${catalogProductId}`);
  const variants = detail.variants || [];
  let picked;
  if (FULL_PALETTE) {
    const { paletteVariants } = require('./printful-palette');
    picked = paletteVariants(variants, kind);
  } else if (kind === 'tee') {
    // Curated palette: Black + White, up to 8 sizes per colour. Black carries
    // the obsidian-gold identity; White gives a light option for contrast.
    // Mirrored by sellableVariants() in scripts/build-variant-pricing.js.
    const wanted = ['black', 'white'].flatMap((color) =>
      variants
        .filter((v) => String(v.color || '').trim().toLowerCase() === color)
        .slice(0, 8)
    );
    picked = wanted.length ? wanted : variants.slice(0, 16);
  } else if (kind === 'hoodie' || kind === 'crewneck') {
    // Black only, all sizes — premium dark garment identity: the gold print
    // is tuned for dark fabric, so these garments stay on black.
    const black = variants.filter((v) => /black/i.test(v.color || ''));
    const chosen = black.length ? black : variants;
    picked = chosen.slice(0, 8);
  } else {
    picked = variants.slice(0, 6);
  }
  PICKED_MEMO.set(kind, picked);
  return picked;
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
  // Align the sync product with the current pickVariants palette: existing
  // sync variants are updated in place, palette additions are appended.
  const wanted = await pickVariants(catalogId, kind);

  const byArea = new Map();
  for (const pl of product.design.placements) byArea.set(pl.area, pl.asset);
  const files = [];
  for (const [area, assetKey] of byArea) {
    const url = assetUrlFor(product, assetKey);
    if (!url) throw new Error(`print master missing for ${product.id}: ${assetKey}`);
    files.push({ type: area === 'back' ? 'back' : KIND_FRONT_FILE_TYPE[kind] || 'default', url });
  }

  const variantBody = (v) => ({
    variant_id: v.variant_id,
    retail_price: product.price.toFixed(2),
    files,
    ...(KIND_OPTIONS[kind] ? { options: KIND_OPTIONS[kind] } : {}),
  });
  // Wholesale replace: the PUT defines the sync product's full variant set —
  // wanted variants update in place (by sync id), new ones are created, and
  // catalog variants absent from the pick are removed. This is what makes a
  // --full-palette refresh fit under Printful's 100-variant cap.
  const syncIdByCatalogId = new Map(existing.map((v) => [v.variant_id, v.id]));
  const syncVariants = wanted.map((v) => {
    const body = variantBody({ variant_id: v.id });
    const existingId = syncIdByCatalogId.get(v.id);
    return existingId ? { id: existingId, ...body } : body;
  });
  const removed = existing.length + wanted.length - syncVariants.length;
  if (removed > 0) {
    console.log(`  ${product.id}: palette replaces ${existing.length} → ${syncVariants.length} sync variants`);
  }

  const body = {
    sync_product: { name: product.name, external_id: product.id },
    sync_variants: syncVariants,
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

/**
 * Fast palette refresh (P3): ONE PUT per changed product, no per-product GET.
 *
 * products.json already carries every sync variant id from the last backfill
 * (printfulVariants: label → syncId — the same map checkout fulfils from), so
 * the refresh can be assembled locally:
 *   - kept variants   → { id: syncId }            (price/files untouched —
 *                                                    {id}-only entries are
 *                                                    server-side no-ops, ~1s)
 *   - added variants  → { variant_id, retail_price, files }
 *   - omitted variants are REMOVED (PUT is a wholesale replace)
 * Products whose local variant labels already equal the wanted palette are
 * skipped entirely (zero requests). Products with fallback (synthetic) ids
 * fall back to the GET-based refreshProduct.
 */
async function fastRefreshProduct(state, product, wantedByKind, catalogList) {
  const kind = product.kind;
  const wanted = wantedByKind.get(kind);
  if (!wanted) throw new Error(`no local palette for kind "${kind}"`);

  const current = product.printfulVariants || {};
  const currentLabels = new Set(Object.keys(current));
  // Fallback variants carry synthetic ids in [900M, 1B); real Printful sync
  // ids are larger (10-digit). Synthetic-id products need the GET-based path.
  const fakeIds = Object.values(current).some(
    (id) => Number(id) >= 900_000_000 && Number(id) < 1_000_000_000,
  );
  if (fakeIds || !currentLabels.size) {
    return refreshProduct(state, product, catalogList); // GET-based, re-resolves catalog id
  }
  if (!state.force) {
    let same = currentLabels.size === wanted.size;
    if (same) for (const label of wanted.keys()) if (!currentLabels.has(label)) { same = false; break; }
    if (same) return 'unchanged';
  }

  const byArea = new Map();
  for (const pl of product.design.placements) byArea.set(pl.area, pl.asset);
  const files = [];
  for (const [area, assetKey] of byArea) {
    const url = assetUrlFor(product, assetKey);
    if (!url) throw new Error(`print master missing for ${product.id}: ${assetKey}`);
    files.push({ type: area === 'back' ? 'back' : KIND_FRONT_FILE_TYPE[kind] || 'default', url });
  }

  const added = [];
  const kept = [];
  for (const [label, catalogVariant] of wanted) {
    if (current[label] != null) kept.push({ id: current[label] });
    else {
      added.push({
        variant_id: catalogVariant.id,
        retail_price: product.price.toFixed(2),
        files,
        ...(KIND_OPTIONS[kind] ? { options: KIND_OPTIONS[kind] } : {}),
      });
    }
  }

  const body = {
    sync_product: { name: product.name, external_id: product.id },
    sync_variants: [...kept, ...added],
  };
  const t0 = Date.now();
  try {
    await api('PUT', `/store/products/${product.printfulProductId}`, body);
  } catch (err) {
    if (!/Incorrect file type/.test(err.message) || files.length < 2) throw err;
    body.sync_variants = body.sync_variants.map((v) =>
      v.variant_id ? { ...v, files: [files[0]] } : v,
    );
    await api('PUT', `/store/products/${product.printfulProductId}`, body);
  }
  const ms = Date.now() - t0;
  console.log(
    `  ${product.id}: kept ${kept.length}, added ${added.length} (${ms}ms)${ms > 10000 ? ' — slow' : ''}`,
  );
  return product.printfulProductId;
}

/** Fetch the wanted palette per kind once (13 GETs) as label → catalog variant. */
async function wantedPalettes() {
  const { variantLabel } = require('./build-variant-pricing');
  const { paletteVariants } = require('./printful-palette');
  const map = new Map();
  for (const [kind, catalogId] of Object.entries(KIND_CATALOG)) {
    const detail = await api('GET', `/products/${catalogId.id}`);
    const byLabel = new Map();
    for (const v of paletteVariants(detail.variants || [], kind)) {
      byLabel.set(variantLabel(v), v);
    }
    map.set(kind, byLabel);
  }
  return map;
}

async function main() {
  const catalog = JSON.parse(fs.readFileSync(CATALOG_FILE, 'utf8'));
  const state = loadState();
  const REFRESH = args.includes('--refresh');
  const FAST_REFRESH = args.includes('--fast-refresh');
  state.force = args.includes('--force');

  let pending = REFRESH || FAST_REFRESH
    ? catalog.products.filter((p) => p.printfulProductId)
    : catalog.products.filter((p) => !p.printfulProductId && !state.done[p.id]);
  if (SHARD) {
    const [i, n] = SHARD;
    pending = pending.filter((_, idx) => idx % n === i);
  }
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

  let wantedByKind = null;
  if (FAST_REFRESH) {
    wantedByKind = await wantedPalettes();
    // Skip products this campaign already refreshed — their local variant
    // map is stale (backfill reconciles it later) and re-adding wanted
    // variants would duplicate the ones already added at Printful.
    const refreshed = new Set(Object.keys(state.done || {}));
    for (const f of fs.readdirSync(path.join(ROOT, 'session-debug'))) {
      const m = f.match(/^printful-sync-state\.shard-[\d-]+\.json$/);
      if (!m) continue;
      try {
        for (const id of Object.keys(JSON.parse(fs.readFileSync(path.join(ROOT, 'session-debug', f), 'utf8')).done || {})) {
          refreshed.add(id);
        }
      } catch { /* unreadable shard state — ignore */ }
    }
    const before = pending.length;
    pending = pending.filter((p) => !refreshed.has(p.id));
    console.log(`Fast refresh: local palettes resolved — 1 PUT per changed product, unchanged skipped; ${before - pending.length} already refreshed this campaign.`);
  }

  let done = 0;
  let skipped = 0;
  for (const product of pending) {
    const kind = product.id.split('-').pop();
    product.kind = kind; // used by syncProduct/refreshProduct
    try {
      if (FAST_REFRESH) {
        const result = await fastRefreshProduct(state, product, wantedByKind, catalogList);
        if (result === 'unchanged') {
          skipped++;
          state.done[product.id] = true;
          saveState(state);
          continue;
        }
        state.done[product.id] = true;
        saveState(state);
        done++;
        if (done % 25 === 0) console.log(`  … ${done} refreshed, ${skipped} unchanged (${done + skipped}/${pending.length})`);
        continue;
      }
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
  console.log(`Done: ${done} product(s) ${REFRESH || FAST_REFRESH ? 'refreshed' : 'synced'}${FAST_REFRESH ? `, ${skipped} already matching` : ''}, catalog updated.`);
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
