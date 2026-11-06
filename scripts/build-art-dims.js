#!/usr/bin/env node
/**
 * PuniCodex — art-dims manifest builder.
 *
 * The merch placement math needs every artwork's pixel dimensions, but the
 * composite print sheets (comp-*.png) are gitignored build artifacts — a
 * fresh CI checkout cannot measure them, so regenerating products.json on
 * CI produced different placements than the committed file (divergence).
 * This script measures every artwork referenced by store/products.json and
 * writes store/art-dims.json; the generator reads the manifest FIRST and
 * only falls back to measuring when a file exists locally. Committed
 * manifest + committed products.json = deterministic across checkouts.
 *
 * Run after adding/changing temple artwork: node scripts/build-art-dims.js
 */
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'store', 'art-dims.json');

function imageSizeSync(file) {
  try {
    const buf = fs.readFileSync(file);
    if (buf.length > 30 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') {
      const fmt = buf.toString('ascii', 12, 16);
      if (fmt === 'VP8 ')
        return { w: (buf[26] | (buf[27] << 8)) & 0x3fff, h: (buf[28] | (buf[29] << 8)) & 0x3fff };
      if (fmt === 'VP8L') {
        const b0 = buf[21], b1 = buf[22], b2 = buf[23], b3 = buf[24];
        return { w: 1 + (((b1 & 0x3f) << 8) | b0), h: 1 + (((b3 & 0xf) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6)) };
      }
      if (fmt === 'VP8X')
        return {
          w: 1 + (buf[24] | (buf[25] << 8) | (buf[26] << 16)),
          h: 1 + (buf[27] | (buf[28] << 8) | (buf[29] << 16)),
        };
    }
    if (buf.length > 24 && buf.toString('ascii', 1, 4) === 'PNG')
      return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
    if (buf.length > 10 && buf.toString('ascii', 6, 10) === 'JFIF')
      return { w: buf.readUInt16BE(18), h: buf.readUInt16BE(16) };
  } catch {
    /* fall through */
  }
  return null;
}

const products = JSON.parse(fs.readFileSync(path.join(ROOT, 'store', 'products.json'), 'utf8')).products;
const srcs = new Set();
for (const p of products) {
  for (const art of p.artworks || []) {
    if (art.src && art.src.startsWith('/')) srcs.add(art.src);
  }
}

const manifest = {};
let measured = 0;
let missing = 0;
for (const src of [...srcs].sort()) {
  const full = path.join(ROOT, src.replace(/^\//, ''));
  const dims = imageSizeSync(full);
  if (dims) {
    manifest[src] = dims;
    measured++;
  } else {
    missing++;
    console.warn('  ⚠ no dims for ' + src + ' (file absent or unreadable)');
  }
}

fs.writeFileSync(OUT, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`art-dims: ${measured} measured, ${missing} missing → store/art-dims.json`);
