#!/usr/bin/env node
/**
 * PuniCodex — print-box audit.
 *
 * Measures WHERE the Printful mockup fleet actually prints each kind's
 * design, in stage-percent terms, by diffing fleet photos
 * (.masters/mockups/{id}-{kind}.jpg) against the matching blank-garment base
 * (assets/store-base/{kind}--{colour}.jpg). The PDP configurator overlays
 * choosable art inside per-kind print zones (scripts/generate-pod-products.js
 * PLACEMENTS); when the zones drift from the fleet's real print placement,
 * the default (fleet-photo) view and every other colourway visibly disagree
 * (the "black tee shows a bigger mascot" class of bug).
 *
 * Output: per-kind median print box {x0,y0,x1,y1,cx,cy,w,h} in stage %.
 *
 * Usage: node scripts/audit-print-boxes.js [--kinds tee,cap] [--sample 12]
 */
const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');

const ROOT = path.join(__dirname, '..');
const MOCK_DIR = path.join(ROOT, '.masters', 'mockups');
const BASE_DIR = path.join(ROOT, 'assets', 'store-base');

const args = process.argv.slice(2);
const KINDS = (args.includes('--kinds') ? args[args.indexOf('--kinds') + 1] : 'tee,hoodie,crewneck,cap,mug,tote').split(',');
const SAMPLE = Number(args.includes('--sample') ? args[args.indexOf('--sample') + 1] : 12);
// Per-pixel channel delta above which a pixel counts as "printed".
const THRESHOLD = 42;
// Ignore the outer 1.5% rim (JPEG ringing + shadow noise).
const RIM = 0.015;

/* The colour each kind's fleet is rendered on (scripts/generate-printful-mockups.js
 * picks black apparel/drinkware variants; object kinds map to their single base). */
const FLEET_COLOR = {
  tee: 'black',
  hoodie: 'black',
  crewneck: 'black',
  cap: 'black',
  mug: 'black',
  tumbler: 'black',
  tote: 'black',
  print: 'standard',
  canvas: 'standard',
  notebook: 'dotted',
  sticker: 'standard',
  pin: 'white',
  phonecase: 'glossy',
};

function baseFileFor(kind) {
  const color = FLEET_COLOR[kind] || 'black';
  const jpg = path.join(BASE_DIR, `${kind}--${color}.jpg`);
  return fs.existsSync(jpg) ? jpg : null;
}

async function diffBox(mockFile, baseFile) {
  const S = 400; // measure on a small grid — boxes are coarse
  const [a, b] = await Promise.all([
    sharp(mockFile).resize(S, S, { fit: 'fill' }).raw().toBuffer({ resolveWithObject: true }),
    sharp(baseFile).resize(S, S, { fit: 'fill' }).raw().toBuffer({ resolveWithObject: true }),
  ]);
  if (a.info.width !== b.info.width || a.info.height !== b.info.height) return null;
  const { width: W, height: H, channels: C } = a.info;
  let x0 = W, y0 = H, x1 = -1, y1 = -1, count = 0;
  const rimX = Math.floor(W * RIM), rimY = Math.floor(H * RIM);
  for (let y = rimY; y < H - rimY; y++) {
    for (let x = rimX; x < W - rimX; x++) {
      const i = (y * W + x) * C;
      let d = 0;
      for (let c = 0; c < 3; c++) d = Math.max(d, Math.abs(a.data[i + c] - b.data[i + c]));
      if (d > THRESHOLD) {
        count++;
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0 || count < W * H * 0.0005) return null;
  return {
    x0: (x0 / W) * 100,
    y0: (y0 / H) * 100,
    x1: ((x1 + 1) / W) * 100,
    y1: ((y1 + 1) / H) * 100,
    coverage: count / (W * H),
  };
}

function median(nums) {
  const s = [...nums].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

async function main() {
  const files = fs.readdirSync(MOCK_DIR).filter((f) => f.endsWith('.jpg'));
  const byKind = new Map(KINDS.map((k) => [k, []]));
  for (const f of files) {
    const m = f.match(/^(?:punicodex-)?.*-([a-z]+)\.jpg$/);
    if (!m) continue;
    const kind = m[1];
    if (byKind.has(kind)) byKind.get(kind).push(path.join(MOCK_DIR, f));
  }

  const out = {};
  for (const [kind, list] of byKind) {
    const base = baseFileFor(kind);
    if (!base) {
      console.log(`${kind}: no blank base — skipped`);
      continue;
    }
    // Deterministic spread across the catalog.
    const step = Math.max(1, Math.floor(list.length / SAMPLE));
    const sample = list.filter((_, i) => i % step === 0).slice(0, SAMPLE);
    const boxes = [];
    for (const f of sample) {
      const box = await diffBox(f, base);
      if (box) boxes.push(box);
    }
    if (!boxes.length) {
      console.log(`${kind}: no diffs found (fleet/base framing mismatch?)`);
      continue;
    }
    const w = median(boxes.map((b) => b.x1 - b.x0));
    const h = median(boxes.map((b) => b.y1 - b.y0));
    const cx = median(boxes.map((b) => (b.x0 + b.x1) / 2));
    const cy = median(boxes.map((b) => (b.y0 + b.y1) / 2));
    out[kind] = {
      cx: +cx.toFixed(1),
      cy: +cy.toFixed(1),
      w: +w.toFixed(1),
      h: +h.toFixed(1),
      n: boxes.length,
      coverage: +(median(boxes.map((b) => b.coverage)) * 100).toFixed(2),
    };
    console.log(
      `${kind}: median print box w ${w.toFixed(1)} × h ${h.toFixed(1)} ` +
        `centred (${cx.toFixed(1)}, ${cy.toFixed(1)}) — n=${boxes.length}/${sample.length}`
    );
  }
  console.log('\nJSON:');
  console.log(JSON.stringify(out, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
