/**
 * Reliquary store structure tests
 *
 * Customer-readiness contract for the generated store:
 * every collection + product page exists, carries sound SEO, valid JSON-LD,
 * accessible markup, resolvable links and imagery, and a checkout payload
 * that maps to a real Printful sync variant. The generator must be idempotent.
 */

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..');
const CATALOG = require('../store/products.json');

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

function read(file) {
  return fs.readFileSync(path.join(ROOT, file), 'utf8');
}
function exists(file) {
  return fs.existsSync(path.join(ROOT, file));
}

function mockupsDir() {
  return path.join(ROOT, '.masters', 'mockups');
}

function listMockupFiles() {
  const dir = mockupsDir();
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.jpg'))
    .map((f) => f.replace(/\.jpg$/, ''));
}

function* walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (entry.name === 'index.html') yield full;
  }
}

const COLLECTION_IDS = [...new Set(CATALOG.products.map((p) => p.temple || 'punicodex'))];

test('store entrance + art department + every collection + every product page exists', () => {
  assert.ok(exists('store/index.html'), 'store/index.html missing');
  assert.ok(exists('store/art/index.html'), 'store/art/index.html missing');
  assert.ok(exists('store/merch/index.html'), 'store/merch/index.html missing');
  const missing = [];
  for (const id of COLLECTION_IDS) {
    if (!exists(`store/merch/${id}/index.html`)) missing.push(`store/merch/${id}/`);
    for (const p of CATALOG.products.filter((x) => (x.temple || 'punicodex') === id)) {
      const kind = p.id.split('-').pop();
      if (!exists(`store/merch/${id}/${kind}/index.html`))
        missing.push(`store/merch/${id}/${kind}/`);
    }
  }
  assert.deepStrictEqual(
    missing.slice(0, 10),
    [],
    `missing pages: ${missing.slice(0, 10).join(', ')}`
  );
  assert.strictEqual(missing.length, 0, `${missing.length} pages missing`);
});

test('the store entrance presents the Merch and Art departments', () => {
  const html = read('store/index.html');
  assert.ok(html.includes('href="/store/merch/"'), 'entrance: no Merch department link');
  assert.ok(html.includes('href="/store/art/"'), 'entrance: no Art department link');
  // The merch tree must not be rooted at /store/ anymore.
  assert.ok(!html.includes('id="grid"'), 'entrance must not carry the collections grid');
});

test('the art department links only live destinations and never dead hrefs', () => {
  const html = read('store/art/index.html');
  assert.ok(html.includes('href="/creatives/"'), 'art: no creatives link');
  assert.ok(html.includes('href="/ink/"'), 'art: no ink link');
  // Gallery and Commons ship as honest "opening soon" cards — spans, not hrefs.
  assert.ok(!/href="\/store\/art\/(gallery|commons)\/"/.test(html), 'art: dead department hrefs');
});

test('every store page has title, meta description, and a matching canonical', () => {
  const bad = [];
  for (const file of walk(path.join(ROOT, 'store'))) {
    const rel = path.relative(ROOT, file).split(path.sep).join('/');
    const html = read(rel);
    const urlPath = `/${rel.replace(/index\.html$/, '')}`;
    if (!/<title>[^<]{5,}<\/title>/.test(html)) bad.push(`${rel}: title`);
    if (!/name="description" content="[^"]{20,}"/.test(html)) bad.push(`${rel}: description`);
    if (!html.includes(`href="https://punicodex.com${urlPath}"`))
      bad.push(`${rel}: canonical ${urlPath}`);
  }
  assert.deepStrictEqual(bad.slice(0, 10), [], bad.slice(0, 10).join('\n'));
  assert.strictEqual(bad.length, 0, `${bad.length} SEO failures`);
});

test('collection pages embed valid CollectionPage JSON-LD; product pages embed Product JSON-LD', () => {
  for (const id of COLLECTION_IDS.slice(0, 25)) {
    const html = read(`store/merch/${id}/index.html`);
    const m = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    assert.ok(m, `store/${id}: missing JSON-LD`);
    const doc = JSON.parse(m[1]);
    assert.strictEqual(doc['@type'], 'CollectionPage');
    assert.ok(Array.isArray(doc.hasPart) && doc.hasPart.length > 0, `store/${id}: empty hasPart`);
    for (const part of doc.hasPart) {
      assert.strictEqual(part['@type'], 'Product');
      assert.ok(part.offers && Number(part.offers.price) > 0, `store/${id}: bad offer price`);
    }
  }
  for (const id of COLLECTION_IDS.slice(0, 10)) {
    const p = CATALOG.products.find((x) => (x.temple || 'punicodex') === id);
    const kind = p.id.split('-').pop();
    const html = read(`store/merch/${id}/${kind}/index.html`);
    const m = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    assert.ok(m, `store/${id}/${kind}: missing JSON-LD`);
    const doc = JSON.parse(m[1]);
    assert.strictEqual(doc['@type'], 'Product');
    assert.strictEqual(doc.offers.price, p.price.toFixed(2));
    assert.strictEqual(doc.offers.availability, 'https://schema.org/InStock');
  }
});

test('every store page has exactly one h1 and every image has alt', () => {
  const bad = [];
  for (const file of walk(path.join(ROOT, 'store'))) {
    const rel = path.relative(ROOT, file).split(path.sep).join('/');
    const html = read(rel);
    const h1s = html.match(/<h1[\s>]/g) || [];
    if (h1s.length !== 1) bad.push(`${rel}: ${h1s.length} h1`);
    const imgs = html.match(/<img\b[^>]*>/g) || [];
    for (const img of imgs) {
      if (!/alt="[^"]*"/.test(img)) bad.push(`${rel}: img without alt`);
    }
  }
  assert.deepStrictEqual(bad.slice(0, 10), [], bad.slice(0, 10).join('\n'));
  assert.strictEqual(bad.length, 0, `${bad.length} a11y failures`);
});

test('interactive elements carry accessible names', () => {
  const html = read('store/merch/index.html');
  assert.ok(/aria-label="Search collections"/.test(html), 'search input lacks aria-label');
  for (const id of COLLECTION_IDS.slice(0, 15)) {
    const p = CATALOG.products.find((x) => (x.temple || 'punicodex') === id);
    const kind = p.id.split('-').pop();
    const pdp = read(`store/merch/${id}/${kind}/index.html`);
    for (const btn of pdp.match(/<button\b[^>]*>([^<]*)/g) || []) {
      const text = btn.replace(/<button\b[^>]*>/, '').trim();
      if (!/aria-label/.test(btn) && !text) assert.fail(`${id}/${kind}: unnamed button ${btn}`);
    }
    assert.ok(/aria-label="Decrease quantity"/.test(pdp), `${id}/${kind}: qty-down aria`);
    assert.ok(/aria-label="Increase quantity"/.test(pdp), `${id}/${kind}: qty-up aria`);
  }
});

test('product pages embed a checkout contract that maps to a real sync variant', () => {
  for (const p of CATALOG.products) {
    const id = p.temple || 'punicodex';
    const kind = p.id.split('-').pop();
    const html = read(`store/merch/${id}/${kind}/index.html`);
    assert.ok(
      html.includes(`productId: ${JSON.stringify(p.id)}`),
      `${p.id}: wrong productId in buy flow`
    );
    // Every parsed option label must be a real variant key.
    const labels = Object.keys(p.printfulVariants || {});
    assert.ok(labels.length > 0, `${p.id}: no printfulVariants`);
    for (const label of labels) {
      assert.ok(
        Number.isInteger(p.printfulVariants[label]),
        `${p.id}: variant "${label}" has no sync id`
      );
    }
  }
});

test('collection pages link only to product pages that exist on disk', () => {
  for (const id of COLLECTION_IDS) {
    const html = read(`store/merch/${id}/index.html`);
    const hrefs = [...html.matchAll(/href="(\/store\/[^"]+)"/g)].map((m) => m[1]);
    for (const href of hrefs) {
      const file = `store${href.replace(/^\/store/, '')}index.html`;
      assert.ok(exists(file), `store/${id} links to missing ${href}`);
    }
  }
});

test('collection pages separate the Foundation Collection from Creator Editions', () => {
  for (const id of COLLECTION_IDS.slice(0, 25)) {
    const html = read(`store/merch/${id}/index.html`);
    assert.ok(html.includes('The Foundation Collection'), `store/${id}: no foundation header`);
    assert.ok(html.includes('Creator Editions'), `store/${id}: no creator editions band`);
    assert.ok(html.includes('id="ce-grid"'), `store/${id}: no hydration container`);
    assert.ok(html.includes('/api/store/products'), `store/${id}: no hydration source`);
    assert.ok(html.includes('grid--group'), `store/${id}: no product grid`);
    assert.ok(html.includes('ce-empty'), `store/${id}: no honest empty state`);
  }
});

test('collection product grids are strictly alphabetical A–Z', () => {
  for (const id of COLLECTION_IDS.slice(0, 25)) {
    const html = read(`store/merch/${id}/index.html`);
    const kinds = [...html.matchAll(/href="\/store\/merch\/[^/]+\/([a-z]+)\//g)].map((m) => m[1]);
    const grid = kinds.slice(0, 13); // the 13 foundation kinds, in page order
    const sorted = [...grid].sort((a, b) => a.localeCompare(b));
    assert.deepStrictEqual(grid, sorted, `store/${id}: not alphabetical (${grid.join(',')})`);
  }
});

test('the merch hall lists temple collections strictly A–Z', () => {
  const html = read('store/merch/index.html');
  // Filter to real collections — the page also links the shipping/returns
  // policy pages, which are not part of the A–Z temple grid.
  const ids = [...html.matchAll(/href="\/store\/merch\/([a-z0-9-]+)\/"/g)]
    .map((m) => m[1])
    .filter((id) => COLLECTION_IDS.includes(id));
  assert.ok(ids.length >= 500, `expected 500+ collections, got ${ids.length}`);
  const sorted = [...ids].sort((a, b) => a.localeCompare(b));
  assert.deepStrictEqual(
    ids,
    sorted,
    `store index out of order near: ${ids.slice(0, 8).join(',')}…`
  );
});

test('card imagery is either a mockup on the masters host or a deployed local asset', () => {
  for (const p of CATALOG.products) {
    if (p.mockupImage) {
      assert.ok(
        p.mockupImage.startsWith('https://punycodex-masters.vercel.app/mockups/'),
        `${p.id}: mockup not on masters host`
      );
    } else if (p.image.startsWith('/')) {
      assert.ok(
        exists(p.image.replace(/^\//, '').replace(/\.webp$/, '.png')) ||
          exists(p.image.replace(/^\//, '')),
        `${p.id}: image missing on disk: ${p.image}`
      );
    }
  }
});

test('mockup files are bidirectionally consistent with products', () => {
  if (!fs.existsSync(mockupsDir())) return;
  const mockupIds = new Set(listMockupFiles());
  const productIds = new Set(CATALOG.products.map((p) => p.id));
  const withMockup = CATALOG.products.filter((p) => p.mockupImage);

  // Completeness only holds on a machine holding the FULL rendered set
  // (the mockup pipeline's home). A machine that rendered a rescue batch
  // holds a partial set — there the orphan direction still applies, but
  // missing files for other products are expected.
  const fullSet = mockupIds.size >= withMockup.length;
  if (fullSet) {
    for (const p of withMockup) {
      assert.ok(
        mockupIds.has(p.id),
        `${p.id}: mockupImage in catalog but no .masters/mockups/${p.id}.jpg`
      );
    }
  }

  for (const id of mockupIds) {
    assert.ok(productIds.has(id), `${id}.jpg: orphan mockup file (no matching product id)`);
    const p = CATALOG.products.find((x) => x.id === id);
    assert.ok(p?.mockupImage, `${id}.jpg: mockup file exists but product has no mockupImage`);
  }
});

test('every mockupImage URL is on the masters mockups host', () => {
  for (const p of CATALOG.products) {
    if (!p.mockupImage) continue;
    assert.ok(
      p.mockupImage.startsWith('https://punycodex-masters.vercel.app/mockups/'),
      `${p.id}: mockupImage not on masters mockups host: ${p.mockupImage}`
    );
  }
});

test('no orphan mockup files exist outside the product catalog', () => {
  if (!fs.existsSync(mockupsDir())) return;
  const productIds = new Set(CATALOG.products.map((p) => p.id));
  const orphans = listMockupFiles().filter((id) => !productIds.has(id));
  assert.deepStrictEqual(
    orphans.slice(0, 20),
    [],
    `${orphans.length} orphan mockup file(s): ${orphans.slice(0, 20).join(', ')}`
  );
});

test('POD product generator preserves mockupImage and variantPricing', () => {
  const before = new Map(
    CATALOG.products.map((p) => [
      p.id,
      { mockupImage: p.mockupImage || null, variantPricing: p.variantPricing || null },
    ])
  );

  execFileSync(process.execPath, [path.join(ROOT, 'scripts', 'generate-pod-products.js')], {
    cwd: ROOT,
    encoding: 'utf8',
  });

  const after = require('../store/products.json');
  const dropped = [];
  for (const p of after.products) {
    const prev = before.get(p.id);
    if (!prev) continue;
    if (prev.mockupImage && !p.mockupImage) {
      dropped.push(`${p.id}: mockupImage dropped`);
    }
    if (prev.variantPricing && !p.variantPricing) {
      dropped.push(`${p.id}: variantPricing dropped`);
    }
  }
  assert.deepStrictEqual(dropped.slice(0, 20), [], dropped.join('\n'));
  assert.strictEqual(dropped.length, 0, `${dropped.length} field(s) dropped`);
});

test('store pages carry the responsive breakpoint and canonical site nav', () => {
  for (const page of ['store/index.html', 'store/merch/index.html', 'store/art/index.html']) {
    const html = read(page);
    assert.ok(html.includes('@media(max-width:820px)'), `${page}: missing mobile breakpoint`);
    assert.ok(html.includes('<nav class="main-nav"'), `${page}: missing canonical main nav`);
    assert.ok(html.includes('id="mobile-menu"'), `${page}: missing canonical mobile menu`);
  }
  for (const id of COLLECTION_IDS.slice(0, 10)) {
    const pdp = read(`store/merch/${id}/index.html`);
    assert.ok(pdp.includes('@media(max-width:820px)'), `store/${id}: no breakpoint`);
  }
});

// ── Google Merchant Center feed ──
// The feed is the growth surface for the Reliquary; these tests pin the
// contract that keeps Merchant from disapproving items: price must match the
// PDP's displayed price, links must resolve to real product pages, and the
// POD disclosure (identifier_exists=no) must be present on every item.

function parseFeedItems() {
  const xml = read('store/merchant-feed.xml');
  const blocks = xml
    .split('<item>')
    .slice(1)
    .map((b) => b.split('</item>')[0]);
  const field = (block, tag) => {
    const m = block.match(new RegExp(`<g:${tag}>([^<]*)</g:${tag}>`));
    if (!m) return null;
    return m[1]
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'");
  };
  return blocks.map((b) => ({
    id: field(b, 'id'),
    title: field(b, 'title'),
    link: field(b, 'link'),
    image: field(b, 'image_link'),
    price: field(b, 'price'),
    brand: field(b, 'brand'),
    condition: field(b, 'condition'),
    availability: field(b, 'availability'),
    identifierExists: field(b, 'identifier_exists'),
    productType: field(b, 'product_type'),
    category: field(b, 'google_product_category'),
  }));
}

// Mirror of scripts/generate-merchant-feed.js#feedPriceCents — the PDP logic.
function expectedFeedPriceCents(p) {
  const pricing = p.variantPricing || null;
  const labels = p.printfulVariants ? Object.keys(p.printfulVariants) : [];
  const priced = pricing ? labels.filter((l) => Number.isInteger(pricing[l])) : [];
  if (priced.length) {
    const cents = priced.map((l) => pricing[l]);
    if (Math.max(...cents) > Math.min(...cents)) return Math.min(...cents);
  }
  return Math.round(Number(p.price || 0) * 100);
}

test('merchant feed exists with one item per catalog product', () => {
  assert.ok(exists('store/merchant-feed.xml'), 'store/merchant-feed.xml missing');
  const items = parseFeedItems();
  assert.strictEqual(items.length, CATALOG.products.length);
  const feedIds = new Set(items.map((i) => i.id));
  for (const p of CATALOG.products) {
    assert.ok(feedIds.has(p.id), `${p.id}: missing from feed`);
  }
});

test('every feed link resolves to a real product page on disk', () => {
  for (const item of parseFeedItems()) {
    assert.ok(item.link.startsWith('https://punicodex.com/store/merch/'), `${item.id}: bad link`);
    assert.ok(!item.link.includes('/store/merch/null/'), `${item.id}: null temple link`);
    const rel = item.link.replace('https://punicodex.com/store/merch/', '').replace(/\/$/, '');
    const file = `store/merch/${rel}/index.html`;
    assert.ok(exists(file), `${item.id}: link target missing: ${file}`);
  }
});

test('feed prices match the PDP price logic exactly', () => {
  const byId = new Map(parseFeedItems().map((i) => [i.id, i]));
  for (const p of CATALOG.products.slice(0, 150)) {
    const item = byId.get(p.id);
    const expected = (expectedFeedPriceCents(p) / 100).toFixed(2);
    assert.strictEqual(item.price, `${expected} USD`, `${p.id}: feed/PDP price mismatch`);
  }
});

test('feed items carry the Merchant-required POD attributes', () => {
  for (const item of parseFeedItems()) {
    assert.strictEqual(item.condition, 'new', `${item.id}: condition`);
    assert.strictEqual(item.availability, 'in stock', `${item.id}: availability`);
    assert.strictEqual(item.brand, 'PUNICODEX', `${item.id}: brand`);
    assert.strictEqual(item.identifierExists, 'no', `${item.id}: identifier_exists`);
    assert.ok(item.title && item.title.length <= 150, `${item.id}: title length`);
    assert.ok(/^https:\/\//.test(item.image || ''), `${item.id}: image_link not https`);
    assert.ok(
      item.productType && item.productType.startsWith('Reliquary >'),
      `${item.id}: product_type`
    );
    assert.ok(item.category && /^\d+$/.test(item.category), `${item.id}: google_product_category`);
  }
});

test('merchant feed generator is idempotent', () => {
  const before = read('store/merchant-feed.xml');
  execFileSync(process.execPath, [path.join(ROOT, 'scripts', 'generate-merchant-feed.js')], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  assert.strictEqual(read('store/merchant-feed.xml'), before, 'feed not byte-stable');
});

test('shipping + returns policy pages exist with canonical chrome and contact route', () => {
  for (const dir of ['shipping', 'returns']) {
    const html = read(`store/${dir}/index.html`);
    assert.ok(html.includes(`href="https://punicodex.com/store/${dir}/"`), `${dir}: canonical`);
    assert.strictEqual((html.match(/<h1[\s>]/g) || []).length, 1, `${dir}: exactly one h1`);
    assert.ok(html.includes('href="/contact/"'), `${dir}: support route must be /contact/`);
    assert.ok(!html.includes('mailto:'), `${dir}: no raw mailto`);
  }
});

test('the store entrance and merch hall link the policy pages', () => {
  for (const page of ['store/index.html', 'store/merch/index.html']) {
    const html = read(page);
    assert.ok(html.includes('href="/store/shipping/"'), `${page}: no shipping link`);
    assert.ok(html.includes('href="/store/returns/"'), `${page}: no returns link`);
  }
});

test('generator + stamper are idempotent (second run writes zero files)', () => {
  const runGenerator = () =>
    execFileSync(process.execPath, [path.join(ROOT, 'scripts', 'generate-store-pages.js')], {
      cwd: ROOT,
      encoding: 'utf8',
    });
  const runStamper = () =>
    execFileSync(process.execPath, [path.join(ROOT, 'scripts', 'stamp-asset-versions.js')], {
      cwd: ROOT,
      encoding: 'utf8',
    });
  runGenerator();
  runStamper();
  const first = runGenerator();
  assert.match(
    first,
    /Store pages: 0 written/,
    'first generator pass wrote pages after stamper — committed store pages may be stale'
  );
  runStamper();
  const second = runGenerator();
  assert.match(second, /Store pages: 0 written/, 'generator not idempotent after stamper');
});

async function run() {
  let passed = 0;
  let failed = 0;
  for (const t of tests) {
    try {
      await t.fn();
      passed++;
      console.log(`  ✓ ${t.name}`);
    } catch (err) {
      failed++;
      console.error(`  ✗ ${t.name}`);
      console.error(
        `    ${String(err.message || err)
          .split('\n')
          .slice(0, 6)
          .join('\n    ')}`
      );
    }
  }
  console.log(`\nStore Structure: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
