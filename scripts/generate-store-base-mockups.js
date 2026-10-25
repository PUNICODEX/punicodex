#!/usr/bin/env node
/**
 * PuniCodex — square blank base-mockup renderer (P3b final).
 *
 * The PDP stage is square (matching the composite product mockups rendered by
 * the same Printful mockup generator), so the configurator base must be a
 * square flat-lay — not the catalog's on-model photo. This script renders one
 * blank garment per kind × palette color through the mockup generator using
 * the fully transparent blank-print.png as the design (an invisible print =
 * a blank garment), downloads the square JPG into assets/store-base/, and
 * stamps `image` in store/base-colors.json — the field generate-pod-products
 * wires into colors[].mockup.
 *
 * Requires blank-print.png to be deployed at
 * https://punicodex.com/assets/store-base/blank-print.png (the mockup
 * generator fetches design files by public URL).
 *
 * Idempotent: entries with `image` set and both files on disk are skipped
 * (committed bytes win).
 *
 * Usage:
 *   PRINTFUL_API_KEY=... node scripts/generate-store-base-mockups.js [--kinds tee,hoodie]
 */
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const API = 'https://api.printful.com';
const OUT_DIR = path.join(ROOT, 'assets', 'store-base');
const INDEX_FILE = path.join(ROOT, 'store', 'base-colors.json');
const BLANK_PRINT_URL = 'https://punicodex.com/assets/store-base/blank-print.png';
const MASTERS_BASE = 'https://punycodex-masters.vercel.app';

// kind → Printful catalog product id (same mapping as the other ops scripts).
const KIND_CATALOG_ID = {
  tee: 71,
  hoodie: 294,
  crewneck: 145,
  cap: 638,
  tote: 641,
};

const KEY = process.env.PRINTFUL_API_KEY;
const args = process.argv.slice(2);
const KINDS = argValue('--kinds') ? argValue('--kinds').split(',') : null;

function argValue(flag) {
  const i = args.indexOf(flag);
  return i === -1 ? null : args[i + 1];
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
    console.warn(`  rate limited — waiting ${wait}s`);
    await sleep(wait * 1000);
    return api(method, endpoint, body, attempt + 1);
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`${method} ${endpoint} → ${res.status}: ${JSON.stringify(json).slice(0, 200)}`);
  }
  return json.result;
}

function slug(name) {
  return String(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Print-area template per kind+placement (from the mockup pipeline; the
// blank print is fit-to-area, so any template of the right face works).
const TEMPLATE_CACHE = new Map();
async function templateFor(catalogId) {
  if (TEMPLATE_CACHE.has(catalogId)) return TEMPLATE_CACHE.get(catalogId);
  const result = await api('GET', `/mockup-generator/templates/${catalogId}`);
  const all = result.templates || [];
  const preferred = all.find((x) => x.is_template_on_front === true) || all[0];
  const t = { area_width: preferred.print_area_width, area_height: preferred.print_area_height };
  TEMPLATE_CACHE.set(catalogId, t);
  return t;
}

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

async function pollTask(taskKey, attempts = 30) {
  for (let i = 0; i < attempts; i++) {
    await sleep(8000);
    const poll = await api('GET', `/mockup-generator/task?task_key=${taskKey}`);
    if (poll.status === 'completed') return poll;
    if (poll.status === 'failed') throw new Error(`mockup task failed: ${poll.error || ''}`);
  }
  throw new Error(`mockup task ${taskKey} did not complete in time`);
}

async function renderBlank(kind, color) {
  const catalogId = KIND_CATALOG_ID[kind];
  const t = await templateFor(catalogId);
  const task = await api('POST', `/mockup-generator/create-task/${catalogId}`, {
    variant_ids: [color.catalogVariantId],
    format: 'jpg',
    files: [{ placement: 'front', image_url: BLANK_PRINT_URL, position: fit(2900, 2900, t.area_width, t.area_height) }],
  });
  if (!task || !task.task_key) throw new Error('create-task response missing task_key');
  const done = await pollTask(task.task_key);
  const mockups = done.mockups || [];
  const front = mockups.find((m) => /front/i.test(m.mockup_url || '')) || mockups[0];
  if (!front || !front.mockup_url) throw new Error('no mockup URL in completed task');
  const res = await fetch(front.mockup_url);
  if (!res.ok) throw new Error(`download ${front.mockup_url} → ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

async function main() {
  if (!KEY) {
    console.error('PRINTFUL_API_KEY is not set.');
    process.exit(1);
  }
  const index = JSON.parse(fs.readFileSync(INDEX_FILE, 'utf8'));
  const kinds = KINDS || Object.keys(index);
  const inFlight = [];
  const WINDOW = 4;
  let done = 0;
  let failed = 0;
  const targets = [];
  for (const kind of kinds) {
    for (const color of index[kind] || []) {
      const base = `${kind}--${slug(color.name)}`;
      if (color.image && fs.existsSync(path.join(OUT_DIR, `${base}.jpg`))) continue;
      targets.push({ kind, color, base });
    }
  }
  console.log(`Base mockups: ${targets.length} blank(s) to render.`);

  const runOne = async ({ kind, color, base }) => {
    try {
      const buf = await renderBlank(kind, color);
      const jpgPath = path.join(OUT_DIR, `${base}.jpg`);
      fs.writeFileSync(jpgPath, buf);
      const sharp = require('sharp');
      await sharp(buf).webp({ quality: 85 }).toFile(path.join(OUT_DIR, `${base}.webp`));
      color.image = `/assets/store-base/${base}.jpg`;
      done++;
      console.log(`  ✓ ${base}`);
    } catch (err) {
      failed++;
      console.error(`  ✗ ${base}: ${err.message.slice(0, 140)}`);
    }
  };

  // Interleave with a small window; flush the index after every completion.
  for (let i = 0; i < targets.length; i++) {
    inFlight.push(runOne(targets[i]));
    if (inFlight.length >= WINDOW) {
      await Promise.all(inFlight.splice(0));
      const tmp = `${INDEX_FILE}.tmp`;
      fs.writeFileSync(tmp, `${JSON.stringify(index, null, 2)}\n`);
      fs.renameSync(tmp, INDEX_FILE);
    }
  }
  await Promise.all(inFlight);
  const tmp = `${INDEX_FILE}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(index, null, 2)}\n`);
  fs.renameSync(tmp, INDEX_FILE);
  console.log(`Base mockups complete: ${done} rendered, ${failed} failed.`);
}

main().catch((err) => {
  console.error(`Base mockup render stopped: ${err.message}`);
  process.exit(1);
});
