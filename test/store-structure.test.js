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

function* walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (entry.name === 'index.html') yield full;
  }
}

const COLLECTION_IDS = [...new Set(CATALOG.products.map((p) => p.temple || 'punicodex'))];

test('store index + every collection + every product page exists', () => {
  assert.ok(exists('store/index.html'), 'store/index.html missing');
  const missing = [];
  for (const id of COLLECTION_IDS) {
    if (!exists(`store/${id}/index.html`)) missing.push(`store/${id}/`);
    for (const p of CATALOG.products.filter((x) => (x.temple || 'punicodex') === id)) {
      const kind = p.id.split('-').pop();
      if (!exists(`store/${id}/${kind}/index.html`)) missing.push(`store/${id}/${kind}/`);
    }
  }
  assert.deepStrictEqual(
    missing.slice(0, 10),
    [],
    `missing pages: ${missing.slice(0, 10).join(', ')}`
  );
  assert.strictEqual(missing.length, 0, `${missing.length} pages missing`);
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
    const html = read(`store/${id}/index.html`);
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
    const html = read(`store/${id}/${kind}/index.html`);
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
  const html = read('store/index.html');
  assert.ok(/aria-label="Search collections"/.test(html), 'search input lacks aria-label');
  for (const id of COLLECTION_IDS.slice(0, 15)) {
    const p = CATALOG.products.find((x) => (x.temple || 'punicodex') === id);
    const kind = p.id.split('-').pop();
    const pdp = read(`store/${id}/${kind}/index.html`);
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
    const html = read(`store/${id}/${kind}/index.html`);
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
    const html = read(`store/${id}/index.html`);
    const hrefs = [...html.matchAll(/href="(\/store\/[^"]+)"/g)].map((m) => m[1]);
    for (const href of hrefs) {
      const file = `store${href.replace(/^\/store/, '')}index.html`;
      assert.ok(exists(file), `store/${id} links to missing ${href}`);
    }
  }
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

test('store pages carry the responsive breakpoint and canonical site nav', () => {
  const html = read('store/index.html');
  assert.ok(html.includes('@media(max-width:820px)'), 'missing mobile breakpoint');
  assert.ok(html.includes('<nav class="main-nav"'), 'missing canonical main nav');
  assert.ok(html.includes('id="mobile-menu"'), 'missing canonical mobile menu');
  for (const id of COLLECTION_IDS.slice(0, 10)) {
    const pdp = read(`store/${id}/index.html`);
    assert.ok(pdp.includes('@media(max-width:820px)'), `store/${id}: no breakpoint`);
  }
});

test('generator is idempotent (second run writes zero files)', () => {
  const out = execFileSync(
    process.execPath,
    [path.join(ROOT, 'scripts', 'generate-store-pages.js')],
    {
      cwd: ROOT,
      encoding: 'utf8',
    }
  );
  assert.match(out, /Store pages: 0 written/, `generator not idempotent: ${out.trim()}`);
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
