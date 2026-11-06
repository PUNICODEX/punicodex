/**
 * PuniCodex — The Front Court (homepage) tests.
 *
 * Guards the 2026-11 homepage restructure ("The Front Court"): the hero and
 * the Collection stay as-is; everything between them and the footer is a
 * numbered sequence of stations (II–X) mixing functional destinations
 * (gallery, reliquary, instruments, herald) with breaker sections (the wall,
 * the first breath, the covenant, the pattern). Cuts must stay cut, the
 * running order is asserted, and the sections must carry REAL data (live
 * products with prices, credited gallery art, the 13 covenant frames).
 *
 * Run standalone: node test/home-front-court.test.js
 */

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

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

const STATIONS = [
  ['wall', 'The Consecrated Wall'],
  ['gallery', 'The Gallery'],
  ['breath', 'The First Breath'],
  ['commons', 'The Commons & Creatives'],
  ['covenant', 'The Covenant'],
  ['pattern', 'The Pattern'],
  ['academics', 'Academics'],
  ['reliquary', 'The Reliquary'],
  ['instruments', 'The Instruments'],
  ['herald-chronicle', 'The Herald'],
];

test('the hero and the Collection survive untouched', () => {
  assert.ok(html.includes('id="hero"'), 'hero missing');
  assert.ok(html.includes('id="pantheon"'), 'the Collection grid missing');
  // The grid is JS-populated (js/home.js builds "Reveal all {n} archetypes").
  assert.ok(html.includes('id="pantheon-grid"'), 'pantheon grid mount missing');
  assert.ok(/temples consecrated/.test(html), 'the consecration line missing');
});

test('all ten stations exist, in the approved running order', () => {
  let last = -1;
  for (const [id, label] of STATIONS) {
    const needle = `id="${id}"`;
    const idx = html.indexOf(needle);
    assert.ok(idx !== -1, `${label} (#${id}) missing`);
    assert.ok(idx > last, `${label} (#${id}) out of order`);
    last = idx;
  }
});

test('cut sections stay cut', () => {
  for (const id of ['codex', 'developers', 'archive', 'development', 'foundation', 'origin']) {
    assert.ok(!html.includes(`id="${id}"`), `retired section #${id} resurrected`);
  }
});

test('the kept tail survives: keyband, newsletter, collaborators, footer', () => {
  const tail = html.slice(html.indexOf('<!-- --- FOOTER --- -->'));
  assert.ok(tail.includes('data-newsletter="home"'), 'newsletter mount missing');
  assert.ok(tail.includes('UNIVERSITY-COLLABORATORS-BODY-START'), 'collaborators strip missing');
  assert.ok(tail.includes('class="site-footer"'), 'footer missing');
});

test('the Reliquary shows real products with real prices', () => {
  const section = html.slice(html.indexOf('id="reliquary"'), html.indexOf('id="instruments"'));
  const prices = section.match(/\$\d+/g) || [];
  assert.ok(prices.length >= 4, `expected 4 priced plinths, found ${prices.length}`);
  assert.ok(
    (section.match(/\/sites\/[a-z-]+\/assets\/[a-z-]+_mascot\.webp/g) || []).length >= 4,
    'plinth images missing'
  );
  assert.ok(section.includes('Enter the Reliquary'), 'reliquary CTA missing');
});

test('the Gallery carries credited, licensed art', () => {
  const section = html.slice(html.indexOf('id="gallery"'), html.indexOf('id="breath"'));
  const imgs = section.match(/upload\.wikimedia\.org/g) || [];
  assert.ok(imgs.length >= 6, `expected 6 gallery works, found ${imgs.length}`);
  assert.ok(/Public domain/.test(section) && /CC BY-SA/.test(section), 'license credits missing');
  for (const m of section.matchAll(/src="(https?:\/\/[^"]+)"/g)) {
    assert.ok(
      m[1].startsWith('https://upload.wikimedia.org/'),
      `gallery hotlinks a non-Wikimedia source: ${m[1]}`
    );
  }
});

test('the Covenant draws exactly thirteen frames', () => {
  const section = html.slice(html.indexOf('id="covenant"'), html.indexOf('id="pattern"'));
  const frames = section.slice(section.indexOf('fc-frames'), section.indexOf('</g>'));
  const rects = frames.match(/<rect/g) || [];
  assert.strictEqual(rects.length, 13, `expected 13 covenant frames, drew ${rects.length}`);
  assert.ok(/NO ADS\. EVER\./.test(section), 'the doctrine headline missing');
  assert.ok(/TAKEOVER/.test(section), 'the takeover note missing');
  assert.ok(/PATRONS/.test(section), 'the patrons niche missing');
});

test('every station CTA routes somewhere real', () => {
  const hrefs = [...html.matchAll(/<a href="(\/[^"]*)" class="fc-link/g)].map((m) => m[1]);
  assert.ok(hrefs.length >= 12, `expected 12+ station CTAs, found ${hrefs.length}`);
  for (const h of new Set(hrefs)) {
    const clean = h.replace(/^\//, '');
    const asPage = path.join(root, clean, 'index.html');
    const asTemple = path.join(root, 'sites', clean, 'index.html');
    assert.ok(
      fs.existsSync(asPage) || fs.existsSync(asTemple),
      `station CTA ${h} has no page on disk`
    );
  }
});

test('the interaction layer is wired', () => {
  assert.ok(html.includes('/js/front-court.js?v=1'), 'front-court.js not linked');
  const js = fs.readFileSync(path.join(root, 'js', 'front-court.js'), 'utf8');
  for (const marker of ['is-lit', 'fc-wall-grid', 'IntersectionObserver', "getContext('2d')"]) {
    assert.ok(js.includes(marker), `front-court.js missing ${marker}`);
  }
  const css = fs.readFileSync(path.join(root, 'css', 'home-critical.css'), 'utf8');
  for (const cls of ['.fc-wall-grid', '.fc-gallery-grid', '.fc-covenant-grid', '.fc-plinths']) {
    assert.ok(css.includes(cls), `home-critical.css missing ${cls}`);
  }
});

console.log(`\nFront Court: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
