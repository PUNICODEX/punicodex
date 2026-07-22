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

// kind → fragments matched (case-insensitive) against the Printful catalog.
const KIND_CATALOG_FRAGMENTS = {
  tee: ['bella+canvas 3001', 'unisex jersey short sleeve tee'],
  hoodie: ['gildan 18500', 'unisex heavy blend hoodie'],
  crewneck: ['gildan 18000', 'crewneck sweatshirt'],
  print: ['enhanced matte paper poster'],
  canvas: ['canvas'],
  sticker: ['kiss-cut stickers'],
  pin: ['enamel pin'],
  mug: ['white glossy mug'],
  tumbler: ['tumbler'],
  tote: ['tote bag'],
  phonecase: ['clear case for iphone'],
  cap: ['distressed dad hat', 'dad hat'],
  notebook: ['spiral notebook'],
};

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

// Resolve a products.json entry to its local print-master PNG path per asset.
function assetFileFor(product, assetKey) {
  const webp = product.assets && product.assets[assetKey];
  if (!webp) return null;
  const full = path.join(ROOT, webp.replace(/^\//, '').replace(/\.webp$/, '.png'));
  return fs.existsSync(full) ? full : null;
}

async function uploadFile(state, absPath) {
  if (state.uploadedFiles[absPath]) return state.uploadedFiles[absPath];
  const base64 = fs.readFileSync(absPath).toString('base64');
  const result = await api('POST', '/files', {
    type: 'default',
    filename: path.basename(absPath),
    file: base64,
  });
  state.uploadedFiles[absPath] = result.id;
  saveState(state);
  return result.id;
}

async function resolveCatalogProduct(state, kind, catalogList) {
  if (state.catalog[kind]) return state.catalog[kind];
  const fragments = KIND_CATALOG_FRAGMENTS[kind];
  if (!fragments) throw new Error(`no catalog mapping for kind "${kind}"`);
  const lower = catalogList.map((p) => ({ id: p.id, name: String(p.name).toLowerCase() }));
  for (const frag of fragments) {
    const hit = lower.find((p) => p.name.includes(frag));
    if (hit) {
      state.catalog[kind] = hit.id;
      saveState(state);
      return hit.id;
    }
  }
  throw new Error(
    `no catalog product matched "${fragments.join('" / "')}" for kind "${kind}"`
  );
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
  const catalogId = await resolveCatalogProduct(state, product.design.kind || product.kind, catalogList);
  const kind = product.kind;
  const variants = await pickVariants(catalogId, kind);

  // Primary asset per area (composites logged as manual follow-up).
  const byArea = new Map();
  for (const pl of product.design.placements) {
    if (!byArea.has(pl.area)) byArea.set(pl.area, pl.asset);
    else console.log(`  composite design on ${product.id} (${pl.area}: +${pl.asset}) — primary asset used, composite pending`);
  }

  const files = [];
  for (const [area, assetKey] of byArea) {
    const abs = assetFileFor(product, assetKey);
    if (!abs) throw new Error(`print master missing for ${product.id}: ${assetKey}`);
    const fileId = await uploadFile(state, abs);
    files.push({ id: fileId, type: area === 'back' ? 'back' : 'front' });
  }

  const body = {
    sync_product: { name: product.name },
    sync_variants: variants.map((v) => ({
      variant_id: v.id,
      retail_price: product.price.toFixed(2),
      files,
    })),
  };
  const created = await api('POST', '/store/products', body);
  return created.id;
}

async function main() {
  const catalog = JSON.parse(fs.readFileSync(CATALOG_FILE, 'utf8'));
  const state = loadState();

  let pending = catalog.products.filter((p) => !p.printfulProductId && !state.done[p.id]);
  if (ONLY) pending = pending.filter((p) => (p.temple || 'punicodex') === ONLY);
  if (KINDS) pending = pending.filter((p) => KINDS.includes(p.id.split('-').pop()));
  if (LIMIT) pending = pending.slice(0, LIMIT);

  console.log(
    `Printful sync: ${pending.length} product(s) pending${ONLY ? ` (only ${ONLY})` : ''}${KINDS ? ` (kinds ${KINDS})` : ''}.`
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
    product.kind = kind; // used by syncProduct
    try {
      const printfulId = await syncProduct(state, product, catalogList);
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
  console.log(`Done: ${done} product(s) synced, catalog updated.`);
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
