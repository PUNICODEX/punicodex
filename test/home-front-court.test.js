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
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
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
  ['reliquary', 'The Reliquary'],
  ['covenant', 'The Covenant'],
  ['pattern', 'The Pattern'],
  ['instruments', 'The Instruments'],
  ['commons', 'The Commons & Creatives'],
  ['herald-chronicle', 'The Herald'],
  ['academics', 'Academics'],
];

test('the hero and the Collection survive untouched', () => {
  assert.ok(html.includes('id="hero"'), 'hero missing');
  assert.ok(html.includes('id="pantheon"'), 'the Collection grid missing');
  // The grid is JS-populated (js/home.js builds "Reveal all {n} archetypes").
  assert.ok(html.includes('id="pantheon-grid"'), 'pantheon grid mount missing');
  assert.ok(/temples consecrated/.test(html), 'the consecration line missing');
  assert.ok(html.includes('Station I · The Collection'), 'Station I label missing');
  assert.ok(!html.includes('true Unicode orthography'), 'ASCII-only temples are overclaimed');
  assert.ok(html.includes('attested scholarly spelling where ASCII is already sufficient'));
});

test('the Collection has exactly one following divider', () => {
  const collection = html.slice(html.indexOf('id="pantheon"'), html.indexOf('id="wall"'));
  assert.strictEqual(
    (collection.match(/class="section-divider pc-divider-strip"/g) || []).length,
    1,
    'double divider beneath the Collection'
  );
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

test('the Reliquary shows real product mockups, not bare mascots', () => {
  const section = html.slice(html.indexOf('id="reliquary"'), html.indexOf('id="covenant"'));
  const prices = section.match(/\$\d+/g) || [];
  assert.ok(prices.length >= 4, `expected 4 priced plinths, found ${prices.length}`);
  const mockups = section.match(/punycodex-masters\.vercel\.app\/mockups\/[a-z-]+\.jpg/g) || [];
  assert.ok(mockups.length >= 4, `expected 4 fleet mockups, found ${mockups.length}`);
  assert.ok(
    !/\/sites\/[a-z-]+\/assets\/[a-z-]+_mascot\.webp/.test(section),
    'bare mascot still shown where a product mockup exists'
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

test('the Covenant shows real temple spaces, not an invented diagram', () => {
  const section = html.slice(html.indexOf('id="covenant"'), html.indexOf('id="pattern"'));
  assert.ok(/NO ADS\. EVER\./.test(section), 'the doctrine headline missing');
  assert.ok(section.includes('fc-temple-preview'), 'temple preview missing');
  assert.ok(section.includes('THE TEMPLE SPONSORSHIP FRAMES'), 'generic temple chrome missing');
  assert.ok(
    !section.includes('TEMPLE OF HERM'),
    'a specific temple name crept back into the chrome'
  );
  assert.ok(section.includes('fc-tp-space--banner'), 'the banner space missing');
  assert.ok(section.includes('fc-tp-space--box'), 'the box space missing');
  assert.ok(section.includes('is-reserved'), 'the reserved state missing');
  assert.ok(/patrons/i.test(section), 'the patrons niche missing');
  assert.ok(!section.includes('<svg'), 'invented SVG diagram still present');
  // The throne (full-temple takeover) sits at the BOTTOM, as on the real
  // temple pages — not on top.
  const throneIdx = section.indexOf('fc-tp-space--throne');
  const boxIdx = section.indexOf('fc-tp-space--box');
  assert.ok(
    throneIdx > boxIdx,
    'the throne must render below the banner/box row (as in real temples)'
  );
});

test('the Gallery references only canonical gallery-data URLs (no hand-typed hotlinks)', () => {
  const g = JSON.parse(read(path.join('scripts', 'gallery-data.json')));
  const canonical = new Set();
  for (const entry of Object.values(g)) {
    const imgs = Array.isArray(entry)
      ? entry
      : entry && Array.isArray(entry.images)
        ? entry.images
        : [];
    for (const im of imgs) if (im && im.src) canonical.add(im.src);
  }
  assert.ok(canonical.size > 1000, `canonical set suspiciously small (${canonical.size})`);
  const section = html.slice(html.indexOf('id="gallery"'), html.indexOf('id="breath"'));
  for (const m of section.matchAll(/src="(https:\/\/upload\.wikimedia\.org[^"]+)"/g)) {
    assert.ok(
      canonical.has(m[1]),
      `homepage gallery hotlinks a non-canonical URL (hand-typed URLs rot — use gallery-data): ${m[1].slice(0, 90)}`
    );
  }
});

test('the Gallery lightbox is wired and every work is viewable full-size', () => {
  const section = html.slice(html.indexOf('id="gallery"'), html.indexOf('id="breath"'));
  assert.ok(html.includes('id="fc-lightbox"'), 'lightbox container missing');
  assert.ok((section.match(/class="fc-art/g) || []).length >= 6, 'gallery works missing');
  assert.ok(section.includes('cursor: zoom-in') === false, 'zoom affordance belongs in CSS');
  const css = fs.readFileSync(path.join(root, 'css', 'home-critical.css'), 'utf8');
  assert.ok(
    css.includes('.fc-lightbox') && css.includes('cursor: zoom-in'),
    'lightbox CSS missing'
  );
  const js = fs.readFileSync(path.join(root, 'js', 'front-court.js'), 'utf8');
  assert.ok(js.includes('fc-lightbox') && js.includes('Escape'), 'lightbox JS missing');
});

test('the Commons window shows real studio works (not an empty state)', () => {
  const section = html.slice(html.indexOf('id="commons"'), html.indexOf('id="herald-chronicle"'));
  const imgs = section.match(/\/assets\/ai-commons\/[a-z-]+\.jpg/g) || [];
  assert.ok(imgs.length >= 8, `expected 8+ Commons works on display, found ${imgs.length}`);
  for (const src of new Set(imgs)) {
    const rel = src.replace(/^\//, '');
    assert.ok(fs.existsSync(path.join(root, rel)), `Commons work missing on disk: ${rel}`);
  }
  assert.ok(
    section.includes('AI-generated by the PuniCodex studio'),
    'the studio provenance line missing'
  );
  assert.ok(!section.includes('The first collection is being curated'), 'empty state still shown');
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
  assert.ok(/\/js\/front-court\.js\?v=\d+/.test(html), 'front-court.js not linked');
  const js = fs.readFileSync(path.join(root, 'js', 'front-court.js'), 'utf8');
  for (const marker of ['is-lit', 'fc-wall-grid', 'IntersectionObserver', "getContext('2d')"]) {
    assert.ok(js.includes(marker), `front-court.js missing ${marker}`);
  }
  const css = fs.readFileSync(path.join(root, 'css', 'home-critical.css'), 'utf8');
  for (const cls of ['.fc-wall-grid', '.fc-gallery-grid', '.fc-covenant-grid', '.fc-plinths']) {
    assert.ok(css.includes(cls), `home-critical.css missing ${cls}`);
  }
});

test('Reliquary swatches change the actual mockup and carry colour to checkout', () => {
  const js = fs.readFileSync(path.join(root, 'js', 'home.js'), 'utf8');
  assert.ok(js.includes('ensurePrint'), 'blank-garment artwork overlay missing');
  assert.ok(js.includes('/assets/store-base/'), 'real colour mockup paths missing');
  assert.ok(js.includes('color === product.composite'), 'baked composite colour is not isolated');
  assert.ok(
    js.includes("go.setAttribute('href', color ? base + '?color='"),
    'checkout colour is not preserved'
  );
  const css = fs.readFileSync(path.join(root, 'css', 'home-critical.css'), 'utf8');
  assert.ok(css.includes('.fc-plinth-img .fc-print'), 'print overlay styles missing');
});

console.log(`\nFront Court: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
