#!/usr/bin/env node
/**
 * PuniCodex — Sync merch composites + logolockups to .masters/
 *
 * The Printful mockup pipeline and store pages fetch print designs from
 * https://punycodex-masters.vercel.app/{id}_comp-{kind}.png. This script copies
 * those PNGs from sites/{id}/assets/ (where generate-merch-composites.js writes
 * them) into the .masters/ root so they are deployed alongside mascots/logomarks.
 *
 * Usage: node scripts/sync-masters-composites.js
 */
const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');

const ROOT = path.join(__dirname, '..');
const SITES_ROOT = path.join(ROOT, 'sites');
const MASTERS_ROOT = path.join(ROOT, '.masters');
const PATTERN = /_(comp-(canvas|mug|tote|sticker|notebook)|logolockup)\.png$/;

function shouldCopy(name) {
  return PATTERN.test(name);
}

function colorsFor(name) {
  return name.includes('_comp-') ? 128 : 256;
}

async function compressPng(file) {
  const tmp = `${file}.compressed`;
  await sharp(file)
    .png({ compressionLevel: 9, adaptiveFiltering: true, palette: true, colors: colorsFor(path.basename(file)) })
    .toFile(tmp);
  fs.renameSync(tmp, file);
}

let copied = 0;
let updated = 0;
let skipped = 0;
let compressed = 0;

async function main() {
  if (!fs.existsSync(MASTERS_ROOT)) {
    fs.mkdirSync(MASTERS_ROOT, { recursive: true });
  }

  let missing = 0;
  for (const id of fs.readdirSync(SITES_ROOT)) {
    const assetsDir = path.join(SITES_ROOT, id, 'assets');
    if (!fs.existsSync(assetsDir)) continue;

    for (const name of fs.readdirSync(assetsDir)) {
      if (!shouldCopy(name)) continue;
      const src = path.join(assetsDir, name);
      const dst = path.join(MASTERS_ROOT, name);

      if (!fs.existsSync(src)) {
        // Composite masters are gitignored and must be produced by
        // generate-merch-composites.js. In a fresh checkout that step may
        // not have created every file; warn instead of crashing so the
        // generation flywheel can complete. Local/source-of-truth builds
        // that include .masters keep the real assets.
        console.warn(`  ! missing source composite, skipping: ${src}`);
        missing++;
        continue;
      }

      let needsCopy = false;
      if (!fs.existsSync(dst)) {
        needsCopy = true;
      } else {
        const srcStat = fs.statSync(src);
        const dstStat = fs.statSync(dst);
        if (srcStat.mtime > dstStat.mtime) {
          needsCopy = true;
        }
      }

      if (needsCopy) {
        fs.copyFileSync(src, dst);
        await compressPng(dst);
        compressed++;
        if (fs.existsSync(dst) && fs.statSync(dst).mtime >= fs.statSync(src).mtime) {
          updated++;
        } else {
          copied++;
        }
      } else {
        skipped++;
      }
    }
  }

  console.log(`sync-masters-composites complete:`);
  console.log(`  copied:     ${copied}`);
  console.log(`  updated:    ${updated}`);
  console.log(`  compressed: ${compressed}`);
  console.log(`  skipped:    ${skipped}`);
  console.log(`  missing:    ${missing}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
