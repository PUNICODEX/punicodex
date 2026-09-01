#!/usr/bin/env node
/**
 * PuniCodex — Compress the PNG masters deployed to .masters/.
 *
 * The merch composites are high-resolution transparent PNGs that can be very
 * large (4–15 MB each). This script lossily re-encodes them as palette PNGs
 * so that the .masters/ deployment stays within Vercel's output budget while
 * remaining acceptable for Printful mockup generation.
 *
 *   - *_comp-*.png      → 128-color palette (these are composite print sheets)
 *   - *_mascot.png, *_logomark.png, *_logolockup.png, house logos
 *                         → 256-color palette
 *
 * Usage: node scripts/compress-masters-pngs.js
 */
const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');

const ROOT = path.join(__dirname, '..');
const MASTERS = path.join(ROOT, '.masters');
const CONCURRENCY = 4;

function colorsFor(name) {
  if (name.includes('_comp-')) return 128;
  return 256;
}

async function compressOne(file) {
  const src = path.join(MASTERS, file);
  const tmp = `${src}.compressed.png`;
  const colors = colorsFor(file);
  try {
    await sharp(src)
      .png({ compressionLevel: 9, adaptiveFiltering: true, palette: true, colors })
      .toFile(tmp);
    const origSize = fs.statSync(src).size;
    const newSize = fs.statSync(tmp).size;
    fs.renameSync(tmp, src);
    return { file, ok: true, origSize, newSize };
  } catch (err) {
    try { fs.unlinkSync(tmp); } catch {}
    return { file, ok: false, error: err.message };
  }
}

async function run() {
  const files = fs.readdirSync(MASTERS).filter((f) => f.endsWith('.png'));
  console.log(`Compressing ${files.length} PNG masters in .masters/ ...`);
  let done = 0;
  let saved = 0;
  let failed = 0;
  const queue = [...files];

  async function worker() {
    while (queue.length) {
      const file = queue.shift();
      const r = await compressOne(file);
      done++;
      if (r.ok) {
        saved += r.origSize - r.newSize;
        if (done % 100 === 0) {
          console.log(`  ${done}/${files.length} done, saved ${(saved / 1024 / 1024).toFixed(1)} MB so far`);
        }
      } else {
        failed++;
        console.error(`  ✗ ${file}: ${r.error}`);
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  console.log(
    `Compression complete: ${done} file(s), ${failed} failed, saved ${(saved / 1024 / 1024 / 1024).toFixed(2)} GB`
  );
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
