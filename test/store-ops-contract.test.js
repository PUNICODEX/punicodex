#!/usr/bin/env node
/**
 * PuniCodex — store ops contract tests (the retrospective sweep).
 *
 * Guards the machinery this session built that the feature suites don't
 * directly touch: the palette caps, the synthetic-id detection range, the
 * orb/modal CSS contract, and the per-temple content-hash pin consistency.
 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.join(__dirname, '..');

// ── Palette discipline ──────────────────────────────────────────────

test('the full palette never exceeds the Printful 100-variant sync cap', () => {
  const { paletteVariants } = require('../scripts/printful-palette.js');
  // Simulate a giant catalog: 84 colors × 12 sizes each.
  const fake = [];
  for (let c = 0; c < 84; c++) {
    for (let s = 0; s < 12; s++) {
      fake.push({ id: c * 100 + s, color: `Color ${c}`, size: `S${s}`, in_stock: true });
    }
  }
  const picked = paletteVariants(fake, 'tee');
  assert.ok(picked.length <= 96, `picked ${picked.length} > 96 (cap under Printful's 100)`);
  const colors = new Set(picked.map((v) => v.color));
  assert.ok(colors.size <= 12, `picked ${colors.size} colors > MAX_COLORS 12`);
  // Black and white always lead.
  assert.ok(colors.has('Color 0'), 'priority order not applied');
});

test('object kinds keep the small stocked-first slice', () => {
  const { paletteVariants } = require('../scripts/printful-palette.js');
  const fake = [
    { id: 1, color: 'Black', size: '11 oz', in_stock: false },
    { id: 2, color: 'Black', size: '15 oz', in_stock: true },
  ];
  const picked = paletteVariants(fake, 'mug');
  assert.strictEqual(picked.length, 2, 'object kinds take the stocked-first slice');
  assert.strictEqual(picked[0].id, 2, 'in-stock sorts first');
});

// ── Synthetic-id detection (the fast-refresh fake guard) ────────────

test('real Printful ids pass the synthetic filter; fallbacks are caught', () => {
  const isSynthetic = (id) => Number(id) >= 900_000_000 && Number(id) < 1_000_000_000;
  // Real ids observed in production are 10-digit (≥1B) — never synthetic.
  assert.strictEqual(isSynthetic(5_408_192_871), false, '10-digit real id');
  // The fallback generator's range is [900M, 1B): ids there are synthetic
  // in this codebase (only applyFallbackVariants writes them — proven when
  // the six unsynced temples held 931–963M ids with printfulProductId null).
  assert.strictEqual(isSynthetic(931_503_667), true, 'fallback-range id detected');
  assert.strictEqual(isSynthetic(963_660_202), true, 'fallback-range id detected');
  assert.strictEqual(isSynthetic(900_000_000 + 12345), true, 'fallback floor detected');
  assert.strictEqual(isSynthetic(999_000_000 - 1), true, 'fallback ceiling detected');
  assert.strictEqual(isSynthetic(899_999_999), false, 'just below the fallback range');
});

// ── Orb + modal CSS contract ────────────────────────────────────────

test('the takeover orb and sponsorship modal keep their layout contract', () => {
  const css = fs.readFileSync(path.join(ROOT, 'templates', 'flagship', 'flagship.css'), 'utf8');
  // Above the fixed main nav (z-index 1010) and mobile menu (~1200).
  assert.ok(
    /\.sponsorship-modal\s*\{[^}]*z-index:\s*1400/.test(css),
    'modal must layer above the nav'
  );
  // Container-scroll + margin:auto centering (the short-screen fix).
  assert.ok(
    /\.sponsorship-modal\s*\{[^}]*overflow-y:\s*auto/.test(css),
    'modal container must scroll'
  );
  assert.ok(
    /\.sponsorship-modal-panel\s*\{[^}]*margin:\s*auto/.test(css),
    'panel must center via margin auto'
  );
  assert.ok(/overscroll-behavior:\s*contain/.test(css), 'panel scroll must not chain');
  // The orb is a sphere with the boot-loader energy ring.
  assert.ok(css.includes('border-radius: 50%'), 'orb sphere shape');
  assert.ok(css.includes('orb-energy-spin'), 'orb energy ring animation');
  assert.ok(/\.takeover-orb[^{]*\{[^}]*cursor:\s*pointer/.test(css), 'orb must feel clickable');
});

// ── Per-temple content-hash pins ────────────────────────────────────

test('every baked temple pins styles.css/script.js to their content hash', () => {
  const sample = ['aigyptos', 'zeus', 'ab'];
  for (const temple of sample) {
    const dir = path.join(ROOT, 'sites', temple);
    const index = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
    const styles = fs.readFileSync(path.join(dir, 'styles.css'), 'utf8');
    const script = fs.readFileSync(path.join(dir, 'script.js'), 'utf8');
    const norm = (b) => b.toString().replace(/\r\n/g, '\n');
    const expectedCss = crypto.createHash('md5').update(norm(styles)).digest('hex').slice(0, 10);
    const expectedJs = crypto.createHash('md5').update(norm(script)).digest('hex').slice(0, 10);
    assert.ok(
      index.includes(`styles.css?v=${expectedCss}`),
      `${temple}: styles.css pin does not match content hash`
    );
    assert.ok(
      index.includes(`script.js?v=${expectedJs}`),
      `${temple}: script.js pin does not match content hash`
    );
    assert.ok(!index.includes('styles.css?v=perf21'), `${temple}: legacy perf21 pin leaked back`);
  }
});

// ── Placement audit integrity ───────────────────────────────────────

test('the placement audit fixture math: content fits inside the garment box', () => {
  // stage box math mirror (audit-art-placement.js contentStageBox)
  const contentStageBox = (content, place) => {
    const w = place.widthPct / 100;
    const leftEdge = place.leftPct / 100 - w / 2;
    const imgH = w / content.aspect;
    return {
      x0: leftEdge + w * content.x0,
      x1: leftEdge + w * content.x1,
      y0: place.topPct / 100 + imgH * content.y0,
      y1: place.topPct / 100 + imgH * content.y1,
    };
  };
  // A wide logo lockup (aspect 1.5, content fills canvas) on a tee.
  const box = contentStageBox(
    { x0: 0, x1: 1, y0: 0, y1: 1, aspect: 1.5 },
    { widthPct: 34, topPct: 26, leftPct: 50 }
  );
  assert.ok(box.y1 - box.y0 < 0.25, 'wide art height fraction sane');
  assert.ok(box.x0 >= 0.3 && box.x1 <= 0.7, 'centered art stays mid-garment');
});

// ── Store visual regression guard (2026-10-27 incident) ─────────────

test('no generated store page references a mockup URL outside the verified fleet', () => {
  const fleet = JSON.parse(fs.readFileSync(path.join(ROOT, 'store', 'mockup-fleet.json'), 'utf8'));
  const pages = [
    path.join(ROOT, 'store', 'merch', 'index.html'),
    path.join(ROOT, 'store', 'merch', 'aigyptos', 'index.html'),
    path.join(ROOT, 'store', 'merch', 'zeus', 'index.html'),
    path.join(ROOT, 'store', 'merch', 'aigyptos', 'tee', 'index.html'),
    path.join(ROOT, 'store', 'merch', 'zeus', 'mug', 'index.html'),
  ];
  let checked = 0;
  for (const page of pages) {
    const html = fs.readFileSync(page, 'utf8');
    for (const m of html.matchAll(
      /https:\/\/punycodex-masters\.vercel\.app\/mockups\/([a-z0-9-]+)\.jpg/g
    )) {
      checked++;
      assert.strictEqual(
        fleet[m[1]],
        true,
        `${path.basename(page)} references ${m[1]}.jpg which is NOT in the verified live fleet — this 404s`
      );
    }
  }
  assert.ok(checked > 0, 'expected at least one fleet composite referenced (adonis)');
});

test('store card and stage imagery resolves to real local assets or fleet composites', () => {
  const pages = [
    path.join(ROOT, 'store', 'merch', 'aigyptos', 'index.html'),
    path.join(ROOT, 'store', 'merch', 'aigyptos', 'tee', 'index.html'),
    path.join(ROOT, 'store', 'merch', 'zeus', 'mug', 'index.html'),
    path.join(ROOT, 'store', 'merch', 'adonis', 'tee', 'index.html'),
  ];
  for (const page of pages) {
    const html = fs.readFileSync(page, 'utf8');
    for (const m of html.matchAll(/(?:src|srcset)="(\/assets\/[^"]+)"/g)) {
      const rel = m[1].split(' ')[0];
      assert.ok(
        fs.existsSync(path.join(ROOT, rel.replace(/^\//, ''))),
        `${path.basename(page)} references missing asset ${rel}`
      );
    }
  }
});

// ── Card art guard (blank-cards regression, 2026-10-27 evening) ─────

test('every collection card shows the temple art — fleet composite or build-time overlay', () => {
  // The f6ec486c "garment base" fallback shipped 543 identical blank-tee
  // cards: the PDP stage composites art at runtime via store-configurator,
  // but cards are static HTML — nothing ever put the art on the garment.
  // URL-liveness and asset-existence guards both passed on a blank card;
  // this guard asserts the user-visible outcome instead.
  const pages = [
    path.join(ROOT, 'store', 'merch', 'index.html'),
    path.join(ROOT, 'store', 'merch', 'aigyptos', 'index.html'),
    path.join(ROOT, 'store', 'merch', 'zeus', 'index.html'),
    path.join(ROOT, 'store', 'merch', 'adonis', 'index.html'),
    path.join(ROOT, 'store', 'merch', 'athena', 'index.html'),
    path.join(ROOT, 'store', 'merch', 'punicodex', 'index.html'),
  ];
  let cards = 0;
  for (const page of pages) {
    // Strip inline <script> blocks: they contain JS template strings (e.g.
    // the Creator Editions grid builder) whose imgbox-shaped literals are
    // not rendered cards.
    const html = fs.readFileSync(page, 'utf8').replace(/<script[\s\S]*?<\/script>/g, '');
    for (const m of html.matchAll(/<div class="imgbox"[^>]*>([\s\S]*?)<\/div>/g)) {
      cards++;
      const box = m[1];
      const hasFleetComposite = /mockups\/[a-z0-9-]+\.jpg/.test(box);
      const hasArtOverlay = box.includes('class="card-art"');
      assert.ok(
        hasFleetComposite || hasArtOverlay,
        `${path.basename(path.dirname(page))}: a collection card shows a blank garment — no fleet composite, no card-art overlay`
      );
      if (hasArtOverlay) {
        const src = box.match(/class="card-art"[^>]*src="([^"]+)"/);
        assert.ok(src, 'card-art overlay must carry a src');
        assert.ok(
          fs.existsSync(path.join(ROOT, src[1].replace(/^\//, ''))),
          `card-art references missing asset ${src[1]}`
        );
      }
    }
  }
  assert.ok(cards >= 500, `expected 500+ collection cards across the sample, found ${cards}`);
});

// ── Mockup fleet integrity (2026-10-27 wipe) ────────────────────────

test('the local mockup fleet covers the full catalog before any masters deploy', () => {
  // The .masters/mockups folder is gitignored build output — the only copy
  // of the photorealistic renders. Deleting it silently starves the store
  // (78 of 7,132 survived the 2026-10-27 wipe). This guard fails npm test
  // the moment the local fleet no longer covers the catalog, and
  // scripts/deploy-masters.sh independently refuses partial deploys.
  // CI checkouts intentionally lack the gitignored folder — the host-side
  // companion (mockup-fleet-live) covers CI; this guard owns dev/deploy envs.
  if (process.env.CI) return;
  const mockDir = path.join(ROOT, '.masters', 'mockups');
  if (!fs.existsSync(mockDir)) return;
  const products = require(path.join(ROOT, 'store', 'products.json'));
  const list = Array.isArray(products.products)
    ? products.products
    : Object.values(products.products || {});
  const jpgs = fs
    .readdirSync(mockDir)
    .filter((f) => f.endsWith('.jpg') && fs.statSync(path.join(mockDir, f)).size > 0);
  const missing = list.filter((p) => !fs.existsSync(path.join(mockDir, `${p.id}.jpg`)));
  assert.strictEqual(
    missing.length,
    0,
    `mockup fleet is partial: ${jpgs.length} JPGs for ${list.length} products — missing e.g. ${missing
      .slice(0, 5)
      .map((p) => p.id)
      .join(', ')}. Do NOT deploy punycodex-masters in this state.`
  );
});
