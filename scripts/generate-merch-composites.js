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
 * to print-appropriate dimensions (~150–300 DPI at the product's print size).
 * Output: transparent PNGs beside the masters in sites/{id}/assets/ (and
 * assets/brand/01-logos/ for house).
 *
 * Usage: node scripts/generate-merch-composites.js [--only <templeId|punicodex>]
 */
const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');

const ROOT = path.join(__dirname, '..');
const { ARCHETYPES } = require(path.join(ROOT, 'js', 'archetypes-v2.js'));

const args = process.argv.slice(2);
const ONLY = args.includes('--only') ? args[args.indexOf('--only') + 1] : null;

function center(bgW, w) {
  return Math.round((bgW - w) / 2);
}

async function scaled(p, { w, h }) {
  const meta = await sharp(p).metadata();
  let nw = meta.width;
  let nh = meta.height;
  if (w) {
    nw = w;
    nh = Math.round((meta.height * w) / meta.width);
  } else if (h) {
    nh = h;
    nw = Math.round((meta.width * h) / meta.height);
  }
  const buf = await sharp(p).resize(nw, nh, { fit: 'inside' }).png().toBuffer();
  return { buf, width: nw, height: nh };
}

async function transparentCanvas(w, h) {
  return sharp({
    create: { width: w, height: h, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .png()
    .toBuffer();
}

async function compositeToFile(bgBuf, layers, file) {
  await sharp(bgBuf)
    .composite(layers.map((l) => ({ input: l.buf, left: l.left, top: l.top })))
    .png()
    .toFile(file);
}

async function buildTempleComposites(id) {
  const dir = path.join(ROOT, 'sites', id, 'assets');
  const mascot = path.join(dir, `${id}_mascot.png`);
  const logomark = path.join(dir, `${id}_logomark.png`);
  const lockup = path.join(dir, `${id}_logolockup.png`);
  const out = [];

  // Sticker sheet (A5 @ 300dpi): mascot top, seal mid, lockup bottom.
  {
    const [m, s, l] = await Promise.all([
      scaled(mascot, { h: 1650 }),
      scaled(logomark, { w: 700 }),
      scaled(lockup, { w: 1300 }),
    ]);
    const bg = await transparentCanvas(2480, 3508);
    await compositeToFile(bg, [
      { buf: m.buf, left: center(2480, m.width), top: 100 },
      { buf: s.buf, left: center(2480, s.width), top: 1850 },
      { buf: l.buf, left: center(2480, l.width), top: 2620 },
    ], path.join(dir, `${id}_comp-sticker.png`));
    out.push(`${id}_comp-sticker.png`);
  }

  // Canvas (2:3 @ 300dpi): full mascot, corner seal.
  {
    const [m, s] = await Promise.all([
      scaled(mascot, { w: 3300 }),
      scaled(logomark, { w: 480 }),
    ]);
    const bg = await transparentCanvas(3600, 5400);
    await compositeToFile(bg, [
      { buf: m.buf, left: center(3600, m.width), top: center(5400, m.height) },
      { buf: s.buf, left: 3600 - 480 - 160, top: 5400 - 480 - 160 },
    ], path.join(dir, `${id}_comp-canvas.png`));
    out.push(`${id}_comp-canvas.png`);
  }

  // Tote: lockup large, small mascot tag lower right.
  {
    const [l, m] = await Promise.all([
      scaled(lockup, { w: 2700 }),
      scaled(mascot, { h: 1050 }),
    ]);
    const bg = await transparentCanvas(3300, 3900);
    await compositeToFile(bg, [
      { buf: l.buf, left: center(3300, l.width), top: 750 },
      { buf: m.buf, left: 3300 - m.width - 260, top: 3900 - 1050 - 220 },
    ], path.join(dir, `${id}_comp-tote.png`));
    out.push(`${id}_comp-tote.png`);
  }

  // Mug wrap (300dpi): seal at handle side, mascot facing out.
  {
    const [s, m] = await Promise.all([
      scaled(logomark, { w: 880 }),
      scaled(mascot, { h: 920 }),
    ]);
    const bg = await transparentCanvas(2700, 1050);
    await compositeToFile(bg, [
      { buf: s.buf, left: 110, top: center(1050, s.height) },
      { buf: m.buf, left: 2700 - m.width - 140, top: center(1050, m.height) },
    ], path.join(dir, `${id}_comp-mug.png`));
    out.push(`${id}_comp-mug.png`);
  }

  // Notebook cover (A5 @ 300dpi): lockup centre, seal footer.
  {
    const [l, s] = await Promise.all([
      scaled(lockup, { w: 1400 }),
      scaled(logomark, { w: 320 }),
    ]);
    const bg = await transparentCanvas(1750, 2480);
    await compositeToFile(bg, [
      { buf: l.buf, left: center(1750, l.width), top: 620 },
      { buf: s.buf, left: center(1750, s.width), top: 1900 },
    ], path.join(dir, `${id}_comp-notebook.png`));
    out.push(`${id}_comp-notebook.png`);
  }

  return out;
}

async function buildHouseComposites() {
  const dir = path.join(ROOT, 'assets', 'brand', '01-logos');
  const wordmark = path.join(dir, 'punicodex-wordmark-gold-solid.png');
  const emblem = path.join(dir, 'punicodex-emblem-gold.png');
  const glyph = path.join(dir, 'punicodex-emblem-glyph-gold.png');
  const out = [];

  // House sticker sheet: wordmark top, glyph centre, emblem bottom.
  {
    const [w, g, e] = await Promise.all([
      scaled(wordmark, { w: 1500 }),
      scaled(glyph, { h: 1500 }),
      scaled(emblem, { w: 560 }),
    ]);
    const bg = await transparentCanvas(2480, 3508);
    await compositeToFile(
      bg,
      [
        { buf: w.buf, left: center(2480, w.width), top: 220 },
        { buf: g.buf, left: center(2480, g.width), top: 700 },
        { buf: e.buf, left: center(2480, e.width), top: 2450 },
      ],
      path.join(dir, 'punicodex_comp-sticker.png')
    );
    out.push('punicodex_comp-sticker.png');
  }

  // House poster: wordmark upper third, glyph centred below.
  {
    const [w, g] = await Promise.all([
      scaled(wordmark, { w: 2200 }),
      scaled(glyph, { h: 2900 }),
    ]);
    const bg = await transparentCanvas(3300, 4500);
    await compositeToFile(
      bg,
      [
        { buf: w.buf, left: center(3300, w.width), top: 420 },
        { buf: g.buf, left: center(3300, g.width), top: 950 },
      ],
      path.join(dir, 'punicodex_comp-poster.png')
    );
    out.push('punicodex_comp-poster.png');
  }

  return out;
}

async function main() {
  const targets = ARCHETYPES.filter((a) => a.built !== false && (!ONLY || a.id === ONLY));
  const COMP_NAMES = ['comp-sticker', 'comp-canvas', 'comp-tote', 'comp-mug', 'comp-notebook'];
  let count = 0;
  let skipped = 0;
  for (const a of targets) {
    const dir = path.join(ROOT, 'sites', a.id, 'assets');
    if (!fs.existsSync(path.join(dir, `${a.id}_mascot.png`))) {
      console.warn(`  ! ${a.id}: masters missing — skipped`);
      continue;
    }
    const allExist = COMP_NAMES.every((n) => fs.existsSync(path.join(dir, `${a.id}_${n}.png`)));
    if (allExist) {
      skipped++;
      count++;
      if ((count + skipped) % 25 === 0) {
        console.log(`  ${count}/${targets.length} temples composited (${skipped} skipped)`);
      }
      continue;
    }
    await buildTempleComposites(a.id);
    count++;
    if ((count + skipped) % 25 === 0) {
      console.log(`  ${count}/${targets.length} temples composited`);
    }
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
