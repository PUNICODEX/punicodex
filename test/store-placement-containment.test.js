/**
 * PuniCodex — Store placement containment tests.
 *
 * The merch overlay (collection cards + PDP configurator fallback) positions
 * temple art on blank-garment photos from per-artwork `placement` geometry
 * baked into store/products.json by scripts/generate-pod-products.js. The
 * 2026-11 bug: two static presets (default + `tall`) ignored the art's real
 * aspect ratio, so wide logolockups and near-square marks spilled off the
 * garment. The generator now aspect-fits every artwork INSIDE a per-kind
 * print zone ({cx, cy, w, h}); these tests prove:
 *   1. every baked placement still fits inside its kind's zone, and
 *   2. products.json is in sync with the generator's math (regenerate and
 *      the values must match exactly).
 *
 * Run standalone: node test/store-placement-containment.test.js
 */

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

/* Extract the PLACEMENTS literal + LOGO_ASPECT from the generator source and
 * evaluate them (pure data — the generator's main() must not run). */
const src = read(path.join('scripts', 'generate-pod-products.js'));
const block = src.match(/const PLACEMENTS = (\{[\s\S]*?\n\});/);
assert.ok(block, 'PLACEMENTS block not found in generate-pod-products.js');
const PLACEMENTS = eval(`(${block[1]})`);
const LOGO_ASPECT = Number(src.match(/const LOGO_ASPECT = ([\d.]+)/)[1]);

/* Minimal image-dimension reader (mirrors the generator's imageSizeSync for
 * the formats the masters ship as: WebP VP8/VP8L/VP8X + PNG). */
function imageSizeSync(file) {
  const buf = fs.readFileSync(file);
  if (
    buf.length > 30 &&
    buf.toString('ascii', 0, 4) === 'RIFF' &&
    buf.toString('ascii', 8, 12) === 'WEBP'
  ) {
    const fmt = buf.toString('ascii', 12, 16);
    if (fmt === 'VP8 ')
      return { w: (buf[26] | (buf[27] << 8)) & 0x3fff, h: (buf[28] | (buf[29] << 8)) & 0x3fff };
    if (fmt === 'VP8L') {
      const b0 = buf[21],
        b1 = buf[22],
        b2 = buf[23],
        b3 = buf[24];
      return {
        w: 1 + (((b1 & 0x3f) << 8) | b0),
        h: 1 + (((b3 & 0xf) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6)),
      };
    }
    if (fmt === 'VP8X')
      return {
        w: 1 + (buf[24] | (buf[25] << 8) | (buf[26] << 16)),
        h: 1 + (buf[27] | (buf[28] << 8) | (buf[29] << 16)),
      };
  }
  if (buf.length > 24 && buf.toString('ascii', 1, 4) === 'PNG')
    return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
  return null;
}

const products = JSON.parse(read(path.join('store', 'products.json'))).products;
/* Hand-tuned overrides win over the zone math (same precedence as the
 * generator's applyPlacementOverrides) — but they must still satisfy
 * containment, so a future hand-tune cannot reintroduce the overhang bug. */
const OVERRIDES = JSON.parse(read(path.join('store', 'placement-overrides.json')));

let passed = 0;
let failed = 0;
function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed++;
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
  }
}

function zoneFor(srcUrl, kind) {
  const placement = PLACEMENTS[kind];
  if (!placement) return null;
  const dims = srcUrl && srcUrl.startsWith('/') ? imageSizeSync(path.join(root, srcUrl)) : null;
  const aspect = dims && dims.h ? dims.w / dims.h : 1.4;
  const zone = aspect > LOGO_ASPECT ? placement.logo : placement.chest;
  return { zone, aspect };
}

test('products.json carries the full catalogue', () => {
  assert.ok(products.length >= 7000, `expected 7000+ products, got ${products.length}`);
});

test('every artwork placement is complete and inside its kind print zone', () => {
  let checked = 0;
  for (const p of products) {
    const kind = p.id.split('-').pop();
    for (const art of p.artworks || []) {
      if (!art.placement) continue;
      checked++;
      const { widthPct, topPct, leftPct } = art.placement;
      for (const [k, v] of Object.entries({ widthPct, topPct, leftPct })) {
        assert.ok(Number.isFinite(v), `${p.id}:${art.key} placement.${k} not finite`);
      }
      assert.ok(
        widthPct > 3 && widthPct <= 60,
        `${p.id}:${art.key} widthPct ${widthPct} implausible`
      );
      const zf = zoneFor(art.src, kind);
      if (!zf) continue;
      const { zone, aspect } = zf;
      const heightPct = widthPct / aspect;
      assert.ok(
        widthPct <= zone.w + 0.15,
        `${p.id}:${art.key} width ${widthPct}% exceeds ${kind} zone width ${zone.w}%` +
          (OVERRIDES[`${p.id}:${art.key}`]
            ? ' (placement-overrides.json hand-tune is out of zone)'
            : '')
      );
      assert.ok(
        heightPct <= zone.h + 0.15,
        `${p.id}:${art.key} height ${heightPct.toFixed(1)}% exceeds ${kind} zone height ${zone.h}% (art falls off the garment)` +
          (OVERRIDES[`${p.id}:${art.key}`]
            ? ' (placement-overrides.json hand-tune is out of zone)'
            : '')
      );
      assert.ok(
        topPct >= 2 && topPct + heightPct <= 96,
        `${p.id}:${art.key} vertical span ${topPct}–${(topPct + heightPct).toFixed(1)}% off-stage`
      );
    }
  }
  assert.ok(checked > 17000, `expected 17k+ placed artworks, checked ${checked}`);
});

test('baked placements match the generator math (products.json in sync)', () => {
  let checked = 0;
  for (const p of products) {
    const kind = p.id.split('-').pop();
    if (!PLACEMENTS[kind]) continue;
    for (const art of p.artworks || []) {
      if (!art.placement) continue;
      const zf = zoneFor(art.src, kind);
      if (!zf) continue;
      const override = OVERRIDES[`${p.id}:${art.key}`];
      const { zone, aspect } = zf;
      const widthPct = Math.min(zone.w, zone.h * aspect);
      const heightPct = widthPct / aspect;
      const expected = override
        ? { widthPct: override.widthPct, topPct: override.topPct, leftPct: override.leftPct }
        : {
            widthPct: Math.round(widthPct * 10) / 10,
            topPct: Math.round((zone.cy - heightPct / 2) * 10) / 10,
            leftPct: zone.cx,
          };
      assert.deepStrictEqual(
        art.placement,
        expected,
        `${p.id}:${art.key} placement ${JSON.stringify(art.placement)} != generator ` +
          JSON.stringify(expected) +
          ' — regenerate store/products.json'
      );
      checked++;
    }
  }
  assert.ok(checked > 17000, `expected 17k+ sync-checked artworks, got ${checked}`);
});

console.log(`\nStore Placement Containment: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
