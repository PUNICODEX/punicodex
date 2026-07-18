#!/usr/bin/env node
/**
 * One-off: resize + recompress the brand kit's 13-page-visuals renders into
 * assets/brand/13-page-visuals/ (plan §7.1 — mandatory compression before use).
 *
 * - jimp 1.6.1 resizes each transparent PNG to its per-placement width
 *   (≈2× display size, capped at 1600px) and recompresses the PNG.
 * - A WebP q85 (method=6) sibling is then minted by scripts' own pipeline
 *   settings via Pillow (see the accompanying python invocation printed at
 *   the end — or run tools/resize-brand-page-visuals.py).
 * - The celestial-knot-loop.mp4 is copied verbatim.
 *
 * The brand kit source directory is READ-ONLY and is never written to.
 *
 * Run: node tools/resize-brand-page-visuals.js
 */

const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { Jimp } = require('jimp');

const ROOT = path.resolve(__dirname, '..');
const KIT = path.join(ROOT, 'Kimi_Agent_punicodex扩展', 'punicodex-brand-kit', '13-page-visuals');
const OUT = path.join(ROOT, 'assets', 'brand', '13-page-visuals');

// file (relative to 13-page-visuals) → shipped pixel width (≈2× display size)
const TARGETS = {
  'home/celestial-knot-hero.png': 1280,
  'home/celestial-knot-square.png': 840,
  'pantheon/council-of-twelve.png': 760,
  'realms/bifrost-stair.png': 800,
  'lexicon/mobius-ribbon.png': 680,
  'connections/hopf-link.png': 720,
  'type/monolith-cursor.png': 660,
  'tiers/triad-ziggurat.png': 1040,
  'codex/codex-icosahedron.png': 600,
  'api/api-lattice.png': 256,
  'store/golden-brilliant.png': 760,
  'about/the-spark-eclipse.png': 720,
  'contact/beacon-flame.png': 400,
  'search/the-lens.png': 600,
  'oracle/armillary-sphere.png': 1040,
  'appraise/golden-balance.png': 680,
  'authenticity/cylinder-seal.png': 560,
  'scholars/golden-nib.png': 640,
  'creatives/muse-flame.png': 640,
  'creatives/empty-pedestal.png': 560,
  'university-sponsorship/academy-temple.png': 840,
  'university-sponsorship/icon-globe.png': 256,
  'university-sponsorship/icon-mortarboard.png': 256,
  'university-sponsorship/icon-barchart.png': 256,
  'temple-template/portal-ring.png': 1100,
  'legal/sealed-tablet.png': 280,
  'errors/toppled-column.png': 760,
};

const COPY_VERBATIM = ['home/celestial-knot-loop.mp4'];

async function main() {
  const manifest = {};
  for (const [rel, width] of Object.entries(TARGETS)) {
    const src = path.join(KIT, rel);
    const dst = path.join(OUT, rel);
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    const before = fs.statSync(src).size;
    const img = await Jimp.read(src);
    if (img.bitmap.width > width) img.resize({ w: width });
    await img.write(dst);
    const after = fs.statSync(dst).size;
    manifest[rel] = {
      width: img.bitmap.width,
      height: img.bitmap.height,
      beforeKB: Math.round(before / 1024),
      pngKB: Math.round(after / 1024),
    };
    console.log(
      `  ${rel}: ${img.bitmap.width}x${img.bitmap.height} ` +
        `${Math.round(before / 1024)} KB -> ${Math.round(after / 1024)} KB png`
    );
  }

  for (const rel of COPY_VERBATIM) {
    const src = path.join(KIT, rel);
    const dst = path.join(OUT, rel);
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.copyFileSync(src, dst);
    console.log(`  ${rel}: copied verbatim (${Math.round(fs.statSync(dst).size / 1024)} KB)`);
  }

  fs.writeFileSync(
    path.join(ROOT, 'tools', 'resize-brand-page-visuals.manifest.json'),
    `${JSON.stringify(manifest, null, 2)}\n`
  );

  // Mint WebP q85 siblings with the exact pipeline settings (Pillow, method=6),
  // so a later `npm run generate` finds them fresh and skips reconversion.
  const py = spawnSync(
    process.platform === 'win32' ? 'python' : 'python3',
    [path.join(ROOT, 'tools', 'resize-brand-page-visuals-webp.py')],
    { cwd: ROOT, encoding: 'utf8' }
  );
  process.stdout.write(py.stdout || '');
  if (py.status !== 0) {
    process.stderr.write(py.stderr || '');
    process.exit(py.status || 1);
  }
  console.log('✓ page-visuals resized; manifest at tools/resize-brand-page-visuals.manifest.json');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
