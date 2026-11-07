#!/usr/bin/env node
/**
 * PuniCodex — gold-on-black alpha keyer.
 *
 * The house style is gold on void — which makes merchandise trivial:
 * luminance IS the alpha. This script converts keepers (or any gold-on-
 * black art) into transparent PNGs for the Reliquary: dark pixels become
 * transparent, gold pixels opaque, with a soft knee so antialiased edges
 * stay clean on any garment colour.
 *
 *   node scripts/key-gold-alpha.js                  — all keepers
 *   node scripts/key-gold-alpha.js ai-art/keepers/zeus-v1.1.jpg
 *
 * Output: ai-art/alpha/<name>.png (trimmed, alpha-matted).
 */
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'ai-art', 'alpha');

async function keyOne(file) {
  const sharp = require('sharp');
  const img = sharp(file);
  const { data, info } = await img.raw().ensureAlpha().toBuffer({ resolveWithObject: true });
  const out = Buffer.alloc(info.width * info.height * 4);
  for (let i = 0, p = 0; i < data.length; i += 4, p += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    // Rec.601 luma, then stretch: black(0)->0, mid-gold(~90)->~120+, bright->255
    const luma = 0.299 * r + 0.587 * g + 0.114 * b;
    let a = ((luma - 8) / 110) * 255;
    a = a < 0 ? 0 : a > 255 ? 255 : a;
    // Un-premultiply toward the gold hue so semi pixels keep warmth.
    out[p] = r;
    out[p + 1] = g;
    out[p + 2] = b;
    out[p + 3] = Math.round(a);
  }
  const base = path.basename(file).replace(/\.jpg$/, '.png');
  const dest = path.join(OUT_DIR, base);
  await sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } })
    .trim({ threshold: 12 })
    .png()
    .toFile(dest);
  return dest;
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const args = process.argv.slice(2).filter((a) => a.endsWith('.jpg'));
  const files =
    args.length > 0
      ? args
      : fs
          .readdirSync(path.join(ROOT, 'ai-art', 'keepers'))
          .filter((f) => f.endsWith('.jpg'))
          .map((f) => path.join(ROOT, 'ai-art', 'keepers', f));
  for (const f of files) {
    try {
      const dest = await keyOne(f);
      console.log(`✓ ${path.relative(ROOT, dest)}`);
    } catch (e) {
      console.log(`✗ ${f}: ${e.message.slice(0, 100)}`);
    }
  }
}

main();
