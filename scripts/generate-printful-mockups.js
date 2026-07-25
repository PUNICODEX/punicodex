#!/usr/bin/env node
/**
 * PuniCodex — Printful mockup pipeline.
 *
 * Generates real product mockups for every synced merch product and hosts
 * them ourselves (Printful's mockup URLs are temporary). Resumable via a
 * checkpoint file; interleaves task creation with polling to stay inside
 * the mockup generator's tight rate budget.
 *
 * Output: .masters/mockups/{productId}.jpg (+ products.json `mockupImage`).
 *
 * Usage:
 *   PRINTFUL_API_KEY=... node scripts/generate-printful-mockups.js \
 *     [--only <templeId|punicodex>] [--kinds tee,mug] [--limit N] [--dry-run]
 */
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const API = 'https://api.printful.com';
const CATALOG_FILE = path.join(ROOT, 'store', 'products.json');
const STATE_FILE = path.join(ROOT, 'session-debug', 'printful-mockup-state.json');
const OUT_DIR = path.join(ROOT, '.masters', 'mockups');
const MASTERS_BASE = 'https://punycodex-masters.vercel.app';

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

// kind → catalog product + variant preference + design placement files.
// Mirrors scripts/sync-printful-products.js mappings.
const KIND_CATALOG = {
  tee: { id: 71, variant: (vs) => pickColorSize(vs, 'black', 'M') },
  hoodie: { id: 294, variant: (vs) => pickColorSize(vs, 'black', 'M') },
  crewneck: { id: 145, variant: (vs) => pickColorSize(vs, 'black', 'M') },
  print: { id: 268, variant: (vs) => vs.find((v) => /30×40/.test(v.name)) || vs[0] },
  canvas: { id: 3, variant: (vs) => vs.find((v) => /12″×18″/.test(v.name)) || vs[0] },
  sticker: { id: 505, variant: (vs) => vs[0] },
  pin: { id: 660, variant: (vs) => vs.find((v) => /2.25/.test(v.name)) || vs[0] },
  mug: { id: 300, variant: (vs) => vs.find((v) => /11/.test(v.name)) || vs[0] },
  tumbler: { id: 585, variant: (vs) => vs[0] },
  tote: { id: 641, variant: (vs) => vs[0] },
  phonecase: { id: 683, variant: (vs) => vs.find((v) => /12 Pro\b/.test(v.name)) || vs[0] },
  cap: { id: 638, variant: (vs) => vs.find((v) => /black/i.test(v.name)) || vs[0] },
  notebook: { id: 474, variant: (vs) => vs[0] },
};

function pickColorSize(variants, colorRe, size) {
  const c = new RegExp(colorRe, 'i');
  const s = new RegExp(`\\b${size}\\b`);
  return variants.find((v) => c.test(v.name) && s.test(v.name)) || variants.find((v) => c.test(v.name)) || variants[0];
}

function assetUrlFor(product, assetKey) {
  const webp = product.assets && product.assets[assetKey];
  if (!webp) return null;
  const png = webp.replace(/\.webp$/, '.png');
  if (png.startsWith('/sites/')) return `${MASTERS_BASE}/${path.posix.basename(png)}`;
  return `https://punicodex.com${png}`;
}

// Mockup-generator placement ids vary by product family (unlike the sync
// API's uniform default/back). Verified against GET /products/{id} `files`
// for every catalog; `back: null` means the product is single-faced and the
// back design must be skipped rather than rejected by the API.
const KIND_PLACEMENTS = {
  tee: { front: 'front', back: 'back' },
  hoodie: { front: 'front', back: 'back' },
  crewneck: { front: 'front', back: 'back' },
  print: { front: 'default', back: null },
  canvas: { front: 'default', back: null },
  notebook: { front: 'front', back: 'back' },
  tote: { front: 'front', back: 'back' },
  tumbler: { front: 'default', back: null },
  sticker: { front: 'default', back: null },
  pin: { front: 'front', back: null },
  mug: { front: 'default', back: null },
  phonecase: { front: 'default', back: null },
  cap: { front: 'embroidery_front', back: null },
};

function designFiles(product) {
  const kind = product.id.split('-').pop();
  const conf = KIND_PLACEMENTS[kind] || { front: 'front', back: null };
  const byArea = new Map();
  for (const pl of product.design.placements) {
    if (!byArea.has(pl.area)) byArea.set(pl.area, pl.asset);
  }
  const files = [];
  for (const [area, assetKey] of byArea) {
    const placement = conf[area];
    if (!placement) continue; // single-faced product: skip the back design
    const url = assetUrlFor(product, assetKey);
    if (url) files.push({ placement, url, assetKey });
  }
  return files;
}

// Fit the design inside the print area, preserving aspect (fit-to-area).
function fit(imgW, imgH, areaW, areaH) {
  const scale = Math.min(areaW / imgW, areaH / imgH);
  const width = Math.round(imgW * scale);
  const height = Math.round(imgH * scale);
  return {
    area_width: areaW,
    area_height: areaH,
    width,
    height,
    left: Math.round((areaW - width) / 2),
    top: Math.round((areaH - height) / 2),
  };
}

// Approximate master dimensions by asset kind (masters are ~1024-3600px).
function assetDims(assetKey) {
  if (assetKey === 'mascot') return [1024, 1536];
  if (assetKey === 'logomark') return [1024, 1024];
  if (assetKey === 'logolockup') return [1536, 1024];
  if (assetKey === 'compCanvas') return [3600, 5400];
  if (assetKey === 'compTote') return [3300, 3900];
  if (assetKey === 'compMug') return [2700, 1050];
  if (assetKey === 'compNotebook') return [1750, 2480];
  return [2480, 3508]; // compSticker
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function api(method, endpoint, body, attempt = 0) {
  const res = await fetch(`${API}${endpoint}`, {
    method,
    headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 429 && attempt < 8) {
    const wait = Number(res.headers.get('retry-after') || 2 ** attempt * 3);
    await sleep(wait * 1000);
    return api(method, endpoint, body, attempt + 1);
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`${method} ${endpoint} → ${res.status}: ${JSON.stringify(json).slice(0, 200)}`);
  }
  return json.result;
}

function loadState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  } catch {
    return { done: {}, variants: {}, templates: {} };
  }
}

function saveState(state) {
  const tmp = `${STATE_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(state));
  fs.renameSync(tmp, STATE_FILE);
}

async function variantFor(state, kind) {
  const cacheKey = String(kind);
  if (state.variants[cacheKey]) return state.variants[cacheKey];
  const mapping = KIND_CATALOG[kind];
  const detail = await api('GET', `/products/${mapping.id}`);
  const v = mapping.variant(detail.variants || []);
  state.variants[cacheKey] = { catalogId: mapping.id, variantId: v.id };
  saveState(state);
  return state.variants[cacheKey];
}

async function templateFor(state, catalogId, placement) {
  const cacheKey = `${catalogId}:${placement}`;
  if (state.templates[cacheKey]) return state.templates[cacheKey];
  const result = await api('GET', `/mockup-generator/templates/${catalogId}`);
  const all = result.templates || [];
  // Templates carry no placement id — only `is_template_on_front`. Resolve
  // front vs back from that flag; fall back to the first template.
  const wantFront = placement !== 'back';
  const preferred = all.find((x) => x.is_template_on_front === wantFront) || all[0];
  state.templates[cacheKey] = {
    area_width: preferred.print_area_width,
    area_height: preferred.print_area_height,
    placement,
  };
  saveState(state);
  return state.templates[cacheKey];
}

async function createTask(state, product, files) {
  const kind = product.id.split('-').pop();
  const { catalogId, variantId } = await variantFor(state, kind);
  const payloadFiles = [];
  for (const f of files) {
    const [w, h] = assetDims(f.assetKey);
    const t = await templateFor(state, catalogId, f.placement);
    payloadFiles.push({
      placement: f.placement,
      image_url: f.url,
      position: fit(w, h, t.area_width, t.area_height),
    });
  }
  return api('POST', `/mockup-generator/create-task/${catalogId}`, {
    variant_ids: [variantId],
    format: 'jpg',
    files: payloadFiles,
  });
}

async function pollTask(taskKey, attempts = 30) {
  for (let i = 0; i < attempts; i++) {
    await sleep(8000);
    const poll = await api('GET', `/mockup-generator/task?task_key=${taskKey}`);
    if (poll.status === 'completed') return poll;
  }
  throw new Error(`mockup task ${taskKey} did not complete in time`);
}

async function downloadMockup(url, outPath) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download ${url} → ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(outPath, buf);
}

async function main() {
  const catalog = JSON.parse(fs.readFileSync(CATALOG_FILE, 'utf8'));
  const state = loadState();
  fs.mkdirSync(OUT_DIR, { recursive: true });

  // Reconcile: mockups already downloaded but not yet written back (batch
  // interruption) — attach them without re-rendering.
  let reconciled = 0;
  for (const p of catalog.products) {
    if (!p.mockupImage && state.done[p.id] === true) {
      const jpg = path.join(OUT_DIR, `${p.id}.jpg`);
      if (fs.existsSync(jpg)) {
        p.mockupImage = `${MASTERS_BASE}/mockups/${p.id}.jpg`;
        reconciled++;
      }
    }
  }
  if (reconciled) {
    flushCatalog(catalog);
    console.log(`Reconciled ${reconciled} existing mockups into the catalog.`);
  }

  let pending = catalog.products.filter(
    (p) => p.printfulProductId && !state.done[p.id] && !p.mockupImage
  );
  if (ONLY) pending = pending.filter((p) => (p.temple || 'punicodex') === ONLY);
  if (KINDS) pending = pending.filter((p) => KINDS.includes(p.id.split('-').pop()));
  if (LIMIT) pending = pending.slice(0, LIMIT);

  console.log(`Mockup pipeline: ${pending.length} product(s) pending.`);
  if (DRY_RUN) return;
  if (!KEY) {
    console.error('PRINTFUL_API_KEY is not set.');
    process.exit(1);
  }

  // Interleave: keep a window of tasks in flight; poll all of them
  // round-robin each cycle so render time overlaps instead of serializing.
  const inFlight = [];
  const WINDOW = 8;
  let done = 0;

  const startNext = async () => {
    const product = pending[done + inFlight.length];
    if (!product) return false;
    try {
      const files = designFiles(product);
      const task = await createTask(state, product, files);
      inFlight.push({ product, taskKey: task.task_key, attempts: 0 });
      console.log(`  ▸ task for ${product.id}`);
      return true;
    } catch (err) {
      console.error(`  ✗ ${product.id}: ${err.message.slice(0, 140)}`);
      state.done[product.id] = `error: ${err.message.slice(0, 120)}`;
      saveState(state);
      done++;
      return true;
    }
  };

  const completeOne = async (item) => {
    const poll = await api('GET', `/mockup-generator/task?task_key=${item.taskKey}`);
    if (poll.status !== 'completed') return false;
    const mockups = poll.mockups || [];
    const front = mockups.find((m) => /front/i.test(m.mockup_url || '')) || mockups[0];
    if (!front || !front.mockup_url) throw new Error('no mockup URL in completed task');
    const outPath = path.join(OUT_DIR, `${item.product.id}.jpg`);
    await downloadMockup(front.mockup_url, outPath);
    item.product.mockupImage = `${MASTERS_BASE}/mockups/${item.product.id}.jpg`;
    state.done[item.product.id] = true;
    saveState(state);
    done++;
    console.log(`  ✓ ${item.product.id} (${done}/${pending.length})`);
    if (done % 20 === 0) flushCatalog(catalog);
    return true;
  };

  while (done < pending.length) {
    while (inFlight.length < WINDOW && pending[done + inFlight.length]) {
      if (!(await startNext())) break;
      await sleep(8000);
    }
    let progressed = false;
    for (let i = inFlight.length - 1; i >= 0; i--) {
      const item = inFlight[i];
      try {
        if (await completeOne(item)) {
          inFlight.splice(i, 1);
          progressed = true;
        }
      } catch (err) {
        item.attempts++;
        if (item.attempts > 6) {
          console.error(`  ✗ ${item.product.id}: ${err.message.slice(0, 140)}`);
          state.done[item.product.id] = `error: ${err.message.slice(0, 120)}`;
          saveState(state);
          done++;
          inFlight.splice(i, 1);
        }
      }
    }
    if (!progressed) await sleep(10000);
  }
  flushCatalog(catalog);
  console.log(`Mockups complete: ${done} product(s).`);
}

function flushCatalog(catalog) {
  const tmp = `${CATALOG_FILE}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(catalog, null, 2)}\n`);
  fs.renameSync(tmp, CATALOG_FILE);
}

main().catch((err) => {
  console.error(`Mockup pipeline stopped: ${err.message}`);
  process.exit(1);
});
