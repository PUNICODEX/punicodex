#!/usr/bin/env node
/**
 * PuniCodex — store base-garment image fetcher (P3b).
 *
 * Downloads the blank-garment catalog photo for every palette color of every
 * overlay kind (tee, hoodie, crewneck, cap, tote) into assets/store-base/ and
 * writes store/base-colors.json — the data the configurator uses to swap the
 * garment base when a color chip is picked.
 *
 * The Printful catalog variant `image` is the product photo with no design on
 * it, and `color_code` is the exact color hex — better than any hand table.
 *
 * Idempotent: existing files are never re-downloaded (committed bytes win,
 * same doctrine as OG cards). Safe to re-run.
 *
 * Usage:
 *   PRINTFUL_API_KEY=... node scripts/fetch-store-base-images.js [--kinds tee,hoodie]
 */
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const API = 'https://api.printful.com';
const OUT_DIR = path.join(ROOT, 'assets', 'store-base');
const INDEX_FILE = path.join(ROOT, 'store', 'base-colors.json');

const KEY = process.env.PRINTFUL_API_KEY;
const args = process.argv.slice(2);
const KINDS = argValue('--kinds') ? argValue('--kinds').split(',') : null;

function argValue(flag) {
  const i = args.indexOf(flag);
  return i === -1 ? null : args[i + 1];
}

// kind → Printful catalog product id. Keep in sync with KIND_CATALOG in
// scripts/sync-printful-products.js and KIND_CATALOG_ID in
// scripts/build-variant-pricing.js.
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

// Dimension-only kinds have no color: one representative base per kind
// under the 'Standard' name (colors[] on those products is empty anyway).
const SINGLE_BASE = new Set(['print', 'canvas', 'sticker']);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function slug(name) {
  return String(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

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
  await sleep(300);
  return json.result;
}

async function downloadVariantImage(variant, kind, colorName) {
  const base = `${kind}--${slug(colorName)}`;
  const webpPath = path.join(OUT_DIR, `${base}.webp`);
  const jpgPath = path.join(OUT_DIR, `${base}.jpg`);
  if (fs.existsSync(webpPath) && fs.existsSync(jpgPath)) {
    return `/assets/store-base/${base}.webp`;
  }
  const res = await fetch(variant.image);
  if (!res.ok) throw new Error(`download ${variant.image} → ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(jpgPath, buf);
  const sharp = require('sharp');
  await sharp(buf).webp({ quality: 85 }).toFile(webpPath);
  return `/assets/store-base/${base}.webp`;
}

async function main() {
  if (!KEY) {
    console.error('PRINTFUL_API_KEY is not set.');
    process.exit(1);
  }
  const { paletteVariants } = require('./printful-palette');
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const kinds = KINDS || Object.keys(KIND_CATALOG_ID);
  const index = {};
  for (const kind of kinds) {
    const detail = await api(`/products/${KIND_CATALOG_ID[kind]}`);
    const picked = paletteVariants(detail.variants || [], kind);
    // One representative variant per color (in-stock, core size first).
    const byColor = new Map();
    for (const v of picked) {
      const key = SINGLE_BASE.has(kind) ? 'Standard' : v.color;
      if (!byColor.has(key)) byColor.set(key, v);
    }
    const colors = [];
    for (const [name, variant] of byColor) {
      try {
        const photo = await downloadVariantImage(variant, kind, name);
        colors.push({
          name,
          hex: variant.color_code || null,
          catalogVariantId: variant.id,
          // Interim on-model catalog photo; scripts/generate-store-base-mockups.js
          // renders the square flat-lay blank into `image` (the configurator
          // base) — the PDP stage is square, so only `image` is wired in.
          photo,
        });
        console.log(`  ${kind} · ${name} → ${path.basename(photo)}`);
      } catch (err) {
        console.error(`  ✗ ${kind} · ${name}: ${err.message}`);
      }
    }
    index[kind] = colors;
  }
  const tmp = `${INDEX_FILE}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(index, null, 2)}\n`);
  fs.renameSync(tmp, INDEX_FILE);
  console.log(`Base images: ${Object.values(index).reduce((n, c) => n + c.length, 0)} color(s) across ${kinds.length} kind(s) → ${INDEX_FILE}`);
}

main().catch((err) => {
  console.error(`Base image fetch stopped: ${err.message}`);
  process.exit(1);
});
