#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');
const { writeFileWithRetry } = require('./write-file-retry.js');

const ROOT = path.join(__dirname, '..');
const CATALOG = path.join(ROOT, 'store', 'products.json');
const OUT = path.join(ROOT, '.masters', 'mockups');
const ARCHIVE = path.join(ROOT, '.masters', 'mockups-archive');
const MASTERS = 'https://punycodex-masters.vercel.app/mockups';
const args = process.argv.slice(2);
const ONLY = args.includes('--only') ? args[args.indexOf('--only') + 1] : null;
const IDS = args.includes('--ids')
  ? new Set(args[args.indexOf('--ids') + 1].split(',').filter(Boolean))
  : null;
const LIMIT = args.includes('--limit') ? Number(args[args.indexOf('--limit') + 1]) : 0;

function local(src) {
  return path.join(ROOT, String(src || '').replace(/^\//, ''));
}

function defaultArtwork(product) {
  return (
    product.artworks.find((art) => art.key === product.defaultArtwork) ||
    product.artworks.find((art) => art.key === 'mascot') ||
    product.artworks[0]
  );
}

async function render(product) {
  const art = defaultArtwork(product);
  if (!art || !product.baseMockup) return false;
  const baseFile = local(product.baseMockup);
  const artFile = local(art.src);
  if (!fs.existsSync(baseFile) || !fs.existsSync(artFile)) return false;
  const placement = art.placement || product.placement;
  if (!placement) return false;
  const base = sharp(baseFile);
  const { width, height } = await base.metadata();
  const overlayWidth = Math.max(1, Math.round((width * placement.widthPct) / 100));
  const overlay = await sharp(artFile)
    .resize({ width: overlayWidth, withoutEnlargement: false })
    .png()
    .toBuffer();
  const overlayMeta = await sharp(overlay).metadata();
  const left = Math.round((width * (placement.leftPct ?? 50)) / 100 - overlayMeta.width / 2);
  const top = Math.round((height * placement.topPct) / 100);
  const output = path.join(OUT, `${product.id}.jpg`);
  const archived = path.join(ARCHIVE, `${product.id}.jpg`);
  fs.mkdirSync(OUT, { recursive: true });
  fs.mkdirSync(ARCHIVE, { recursive: true });
  if (fs.existsSync(output) && !fs.existsSync(archived)) fs.copyFileSync(output, archived);
  await base
    .composite([{ input: overlay, left, top }])
    .jpeg({ quality: 91, mozjpeg: true })
    .toFile(output);
  product.mockupImage = `${MASTERS}/${product.id}.jpg`;
  return true;
}

async function main() {
  const catalog = JSON.parse(fs.readFileSync(CATALOG, 'utf8'));
  const targets = catalog.products.filter(
    (product) =>
      (!IDS || IDS.has(product.temple)) &&
      (!ONLY || product.temple === ONLY) &&
      (!LIMIT || catalog.products.indexOf(product) < LIMIT)
  );
  let rendered = 0;
  const skipped = [];
  for (const product of targets) {
    if (await render(product)) rendered++;
    else skipped.push(product.id);
    if (rendered % 100 === 0) console.log(`${rendered} local mockups rendered`);
  }
  writeFileWithRetry(CATALOG, `${JSON.stringify(catalog, null, 2)}\n`, 'utf8');
  console.log(`Local mockups: ${rendered} rendered; ${skipped.length} skipped.`);
  if (skipped.length) console.log(`Skipped ids: ${skipped.slice(0, 30).join(', ')}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
