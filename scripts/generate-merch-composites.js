#!/usr/bin/env node
/**
 * PuniCodex — merch composite generator.
 *
 * Builds the multi-material print designs that need more than one asset in
 * a single print area (Printful takes one file per placement):
 *
 *   {id}_comp-sticker.png   A5 sheet: mascot + logomark + logolockup
 *   {id}_comp-canvas.png    2:3 canvas: mascot + corner seal
 *   {id}_comp-tote.png      tote: lockup + small mascot tag
 *   {id}_comp-mug.png       wrap: seal (handle side) + mascot (outward)
 *   {id}_comp-notebook.png  cover: lockup + seal footer
 *   punicodex_comp-sticker.png / punicodex_comp-poster.png (house)
 *
 * Masters are web-resolution (1024–1536 px), so components are upscaled
 * with hermite resampling to print-appropriate dimensions (~150–300 DPI
 * at the product's print size). Output: transparent PNGs beside the
 * masters in sites/{id}/assets/ (and assets/brand/01-logos/ for house).
 *
 * Usage: node scripts/generate-merch-composites.js [--only <templeId|punicodex>]
 */
const fs = require('node:fs');
const path = require('node:path');
const { Jimp } = require('jimp');

const ROOT = path.join(__dirname, '..');
const { ARCHETYPES } = require(path.join(ROOT, 'js', 'archetypes-v2.js'));

const args = process.argv.slice(2);
const ONLY = args.includes('--only') ? args[args.indexOf('--only') + 1] : null;

async function load(p) {
  return Jimp.read(p);
}

function scaleTo(img, { w, h }) {
  const clone = img.clone();
  if (w) clone.resize({ w });
  else if (h) clone.resize({ h });
  return clone;
}

function center(bgW, w) {
  return Math.round((bgW - w) / 2);
}

async function canvasOf(w, h) {
  return new Jimp({ width: w, height: h, color: 0x00000000 });
}

async function buildTempleComposites(id) {
  const dir = path.join(ROOT, 'sites', id, 'assets');
  const mascot = await load(path.join(dir, `${id}_mascot.png`));
  const logomark = await load(path.join(dir, `${id}_logomark.png`));
  const lockup = await load(path.join(dir, `${id}_logolockup.png`));
  const out = [];

  // Sticker sheet (A5 @ 300dpi): mascot top, seal mid, lockup bottom.
  {
    const bg = await canvasOf(2480, 3508);
    const m = scaleTo(mascot, { h: 1650 });
    bg.composite(m, center(2480, m.bitmap.width), 100);
    const s = scaleTo(logomark, { w: 700 });
    bg.composite(s, center(2480, 700), 1850);
    const l = scaleTo(lockup, { w: 1300 });
    bg.composite(l, center(2480, 1300), 2620);
    const file = path.join(dir, `${id}_comp-sticker.png`);
    await bg.write(file);
    out.push(file);
  }

  // Canvas (2:3 @ 300dpi): full mascot, corner seal.
  {
    const bg = await canvasOf(3600, 5400);
    const m = scaleTo(mascot, { w: 3300 });
    bg.composite(m, center(3600, m.bitmap.width), center(5400, m.bitmap.height));
    const s = scaleTo(logomark, { w: 480 });
    s.opacity(0.92);
    bg.composite(s, 3600 - 480 - 160, 5400 - 480 - 160);
    const file = path.join(dir, `${id}_comp-canvas.png`);
    await bg.write(file);
    out.push(file);
  }

  // Tote: lockup large, small mascot tag lower right.
  {
    const bg = await canvasOf(3300, 3900);
    const l = scaleTo(lockup, { w: 2700 });
    bg.composite(l, center(3300, 2700), 750);
    const m = scaleTo(mascot, { h: 1050 });
    bg.composite(m, 3300 - m.bitmap.width - 260, 3900 - 1050 - 220);
    const file = path.join(dir, `${id}_comp-tote.png`);
    await bg.write(file);
    out.push(file);
  }

  // Mug wrap (300dpi): seal at handle side, mascot facing out.
  {
    const bg = await canvasOf(2700, 1050);
    const s = scaleTo(logomark, { w: 880 });
    bg.composite(s, 110, center(1050, 880));
    const m = scaleTo(mascot, { h: 920 });
    bg.composite(m, 2700 - m.bitmap.width - 140, center(1050, 920));
    const file = path.join(dir, `${id}_comp-mug.png`);
    await bg.write(file);
    out.push(file);
  }

  // Notebook cover (A5 @ 300dpi): lockup centre, seal footer.
  {
    const bg = await canvasOf(1750, 2480);
    const l = scaleTo(lockup, { w: 1400 });
    bg.composite(l, center(1750, 1400), 620);
    const s = scaleTo(logomark, { w: 320 });
    bg.composite(s, center(1750, 320), 1900);
    const file = path.join(dir, `${id}_comp-notebook.png`);
    await bg.write(file);
    out.push(file);
  }

  return out;
}

async function buildHouseComposites() {
  const dir = path.join(ROOT, 'assets', 'brand', '01-logos');
  const wordmark = await load(path.join(dir, 'punicodex-wordmark-gold-solid.png'));
  const emblem = await load(path.join(dir, 'punicodex-emblem-gold.png'));
  const glyph = await load(path.join(dir, 'punicodex-emblem-glyph-gold.png'));
  const out = [];

  // House sticker sheet: wordmark top, glyph centre, emblem bottom.
  {
    const bg = await canvasOf(2480, 3508);
    const w = scaleTo(wordmark, { w: 1500 });
    bg.composite(w, center(2480, 1500), 220);
    const g = scaleTo(glyph, { h: 1500 });
    bg.composite(g, center(2480, g.bitmap.width), 700);
    const e = scaleTo(emblem, { w: 560 });
    bg.composite(e, center(2480, 560), 2450);
    const file = path.join(dir, 'punicodex_comp-sticker.png');
    await bg.write(file);
    out.push(file);
  }

  // House poster: wordmark upper third, glyph centred below.
  {
    const bg = await canvasOf(3300, 4500);
    const w = scaleTo(wordmark, { w: 2200 });
    bg.composite(w, center(3300, 2200), 420);
    const g = scaleTo(glyph, { h: 2900 });
    bg.composite(g, center(3300, g.bitmap.width), 950);
    const file = path.join(dir, 'punicodex_comp-poster.png');
    await bg.write(file);
    out.push(file);
  }

  return out;
}

async function main() {
  const targets = ARCHETYPES.filter((a) => a.built !== false && (!ONLY || a.id === ONLY));
  let count = 0;
  for (const a of targets) {
    const dir = path.join(ROOT, 'sites', a.id, 'assets');
    if (!fs.existsSync(path.join(dir, `${a.id}_mascot.png`))) {
      console.warn(`  ! ${a.id}: masters missing — skipped`);
      continue;
    }
    await buildTempleComposites(a.id);
    count++;
    if (count % 25 === 0) console.log(`  ${count}/${targets.length} temples composited`);
  }
  if (!ONLY || ONLY === 'punicodex') {
    await buildHouseComposites();
    console.log('  house composites built');
  }
  console.log(`Composites complete: ${count} temple(s)${count ? ' ×5' : ''}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
