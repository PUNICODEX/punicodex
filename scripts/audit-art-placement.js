#!/usr/bin/env node
/**
 * PuniCodex — art-placement audit.
 *
 * For every overlay-kind product, compute where each artwork's VISIBLE
 * CONTENT (alpha-scanned, not the canvas) lands on the garment photo and
 * flag anything that spills outside the measured garment bounds. Violators
 * get a fitted per-art placement written to store/placement-overrides.json,
 * which generate-pod-products.js applies on top of the kind geometry.
 *
 * Run after adding/changing base images or artwork files:
 *   node scripts/audit-art-placement.js [--check]   (—check: audit only, no write)
 */
const sharp = require('sharp');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const CATALOG_FILE = path.join(ROOT, 'store', 'products.json');
const OUT_FILE = path.join(ROOT, 'store', 'placement-overrides.json');
const MARGIN = 0.015; // soft garment shadow tolerance

// Garment bounds per kind, measured from assets/store-base/{kind}--black.jpg
// (see scripts/audit-art-placement.js — re-measure if the base set changes).
const GARMENT_BOXES = {
  tee: { minX: 0.15, maxX: 0.858, minY: 0.022, maxY: 0.976 },
  hoodie: { minX: 0.162, maxX: 0.828, minY: 0.032, maxY: 0.964 },
  crewneck: { minX: 0.128, maxX: 0.882, minY: 0.054, maxY: 0.968 },
  cap: { minX: 0.112, maxX: 0.88, minY: 0.108, maxY: 0.894 },
  tote: { minX: 0.226, maxX: 0.772, minY: 0.036, maxY: 0.948 },
};

async function artContent(src) {
  const { data, info } = await sharp(path.join(ROOT, src))
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let minX = info.width, maxX = 0, minY = info.height, maxY = 0, found = false;
  for (let y = 0; y < info.height; y += 2) {
    for (let x = 0; x < info.width; x += 2) {
      if (data[(y * info.width + x) * info.channels + 3] > 18) {
        found = true;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (!found) return null;
  return {
    x0: minX / info.width,
    x1: maxX / info.width,
    y0: minY / info.height,
    y1: maxY / info.height,
    aspect: info.width / info.height,
  };
}

/** Content box (stage fractions) for an art at a placement. */
function contentStageBox(content, place) {
  const w = place.widthPct / 100;
  const leftEdge = place.leftPct / 100 - w / 2;
  const imgH = w / content.aspect; // stage-height fraction of the img box
  return {
    x0: leftEdge + w * content.x0,
    x1: leftEdge + w * content.x1,
    y0: place.topPct / 100 + imgH * content.y0,
    y1: place.topPct / 100 + imgH * content.y1,
  };
}

async function main() {
  const checkOnly = process.argv.includes('--check');
  const catalog = JSON.parse(fs.readFileSync(CATALOG_FILE, 'utf8'));
  const overrides = {};
  const violations = [];
  let checked = 0;

  const contentCache = new Map();
  const contentFor = async (src) => {
    if (!contentCache.has(src)) contentCache.set(src, await artContent(src).catch(() => null));
    return contentCache.get(src);
  };

  for (const p of catalog.products.filter((x) => x.placement)) {
    const kind = p.id.split('-').pop();
    const box = GARMENT_BOXES[kind];
    for (const art of p.artworks) {
      const content = await contentFor(art.src);
      if (!content) continue;
      checked++;
      const place = art.placement || p.placement;
      const cb = contentStageBox(content, place);
      const spills = {
        left: box.minX - MARGIN - cb.x0,
        right: cb.x1 - (box.maxX + MARGIN),
        top: box.minY - MARGIN - cb.y0,
        bottom: cb.y1 - (box.maxY + MARGIN),
      };
      const worst = Math.max(spills.left, spills.right, spills.top, spills.bottom);
      if (worst <= 0) continue;

      // Fit: the content box scales linearly with widthPct, so compute the
      // scale that brings each violated dimension inside the bounds.
      const scaleW =
        spills.left > 0 || spills.right > 0
          ? (box.maxX - box.minX - MARGIN * 2) / (cb.x1 - cb.x0)
          : 1;
      const scaleH =
        spills.top > 0 || spills.bottom > 0
          ? (box.maxY - box.minY - MARGIN * 2) / (cb.y1 - cb.y0)
          : 1;
      const scale = Math.max(0.4, Math.min(1, scaleW, scaleH) * 0.97);
      if (scale >= 0.995) continue; // rounding-level spill — not worth an override
      violations.push({ id: p.id, art: art.key, kind, scale: scale.toFixed(3) });
      overrides[`${p.id}:${art.key}`] = {
        widthPct: Math.round(place.widthPct * scale * 10) / 10,
        topPct: place.topPct,
        leftPct: place.leftPct,
      };
    }
  }

  console.log(`Audited ${checked} art placements: ${violations.length} spill the garment bounds.`);
  for (const v of violations.slice(0, 20)) console.log(`  ${v.id} · ${v.art} (${v.kind}) → scale ${v.scale}`);

  if (checkOnly) process.exit(violations.length ? 1 : 0);
  const tmp = `${OUT_FILE}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(overrides, null, 2)}\n`);
  fs.renameSync(tmp, OUT_FILE);
  console.log(`Wrote ${Object.keys(overrides).length} placement override(s) → ${OUT_FILE}`);
}

main().catch((err) => {
  console.error(`Placement audit stopped: ${err.message}`);
  process.exit(1);
});
