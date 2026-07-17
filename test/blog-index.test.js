'use strict';

/**
 * PÚNYCODEX — Blog index tests
 *
 * Validates the generated root blog index (blog/index.html, produced by
 * scripts/generate-blog-index.js): SEO head, analytics markers, JSON-LD
 * CollectionPage + ItemList, the 196 statically baked cards, the embedded
 * JSON payload, sitemap coverage, and generator idempotency.
 *
 * Run: node --test test/blog-index.test.js
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..');
const INDEX_PATH = path.join(ROOT, 'blog', 'index.html');
const SITES_DIR = path.join(ROOT, 'sites');
const BLOG_DIR = path.join(ROOT, 'platform', 'blog', 'content');
const GENERATOR_PATH = path.join(ROOT, 'scripts', 'generate-blog-index.js');

const { LEXICON } = require(path.join(ROOT, 'type', 'js', 'lexicon.js'));
const LEXICON_BY_ID = new Map(LEXICON.map((e) => [e.id, e]));
const LEXICON_PANTHEONS = new Set(LEXICON.map((e) => e.pantheon));

const archetypeSrc = fs.readFileSync(path.join(ROOT, 'js', 'archetypes-v2.js'), 'utf8');
const ARCHETYPES = vm.runInNewContext(`(function(){\n${archetypeSrc}\nreturn ARCHETYPES;\n})()`);
// Array.from materializes a local-realm array: values pulled from the vm
// context carry the vm realm's Array prototype, which strict deepEqual rejects.
const BUILT_IDS = Array.from(
  ARCHETYPES.filter((a) => a.built),
  (a) => a.id
).sort();
const BUILT_SET = new Set(BUILT_IDS);

function readIndex() {
  return fs.readFileSync(INDEX_PATH, 'utf8');
}

function extractJsonLd(html) {
  const m = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  if (!m) return null;
  try {
    return JSON.parse(m[1].trim());
  } catch {
    return null;
  }
}

function extractPayload(html) {
  // The baked payload lives on a single line: `var POSTS = [...];`
  const m = html.match(/^\s*var POSTS = (\[.*\]);\s*$/m);
  if (!m) return null;
  try {
    return JSON.parse(m[1]);
  } catch {
    return null;
  }
}

function readMinutes(readingTime) {
  const m = String(readingTime || '').match(/(\d+)/);
  return m ? Number.parseInt(m[1], 10) : 0;
}

test('blog/index.html exists with a complete SEO head', () => {
  assert.ok(fs.existsSync(INDEX_PATH), 'expected blog/index.html to exist');
  const html = readIndex();

  assert.match(html, /<title>Blog — 196 Unicode Restoration Essays \| PUNYCODEX<\/title>/);
  assert.match(html, /<meta name="description" content="[^"]+">/, 'missing meta description');
  assert.match(
    html,
    /<link rel="canonical" href="https:\/\/punycodex\.com\/blog\/">/,
    'canonical must be exactly https://punycodex.com/blog/'
  );
  assert.match(html, /<meta property="og:title"[^>]*>/, 'missing og:title');
  assert.match(html, /<meta property="og:description"[^>]*>/, 'missing og:description');
  assert.match(
    html,
    /<meta property="og:url" content="https:\/\/punycodex\.com\/blog\/">/,
    'missing og:url for /blog/'
  );
  assert.match(html, /<meta property="og:type" content="website"/, 'missing og:type website');
  assert.match(html, /<meta property="og:site_name" content="PUNYCODEX"/, 'missing og:site_name');
  assert.match(html, /<meta name="twitter:card"/, 'missing twitter:card');
});

test('analytics markers are present', () => {
  const html = readIndex();
  assert.match(html, /<!-- PUNYCODEX-ANALYTICS-START -->/, 'missing analytics start marker');
  assert.match(html, /<!-- PUNYCODEX-ANALYTICS-END -->/, 'missing analytics end marker');
  assert.match(
    html,
    /<script src="\/js\/analytics-beacon\.js" defer><\/script>/,
    'missing beacon script'
  );
});

test('JSON-LD is a CollectionPage with an ItemList of exactly 196 items', () => {
  assert.equal(BUILT_IDS.length, 196, 'expected exactly 196 built flagship archetypes');
  const ld = extractJsonLd(readIndex());
  assert.ok(ld, 'JSON-LD is missing or invalid');
  assert.equal(ld['@type'], 'CollectionPage');
  assert.equal(ld.url, 'https://punycodex.com/blog/');

  const list = ld.mainEntity;
  assert.ok(list, 'JSON-LD missing mainEntity');
  assert.equal(list['@type'], 'ItemList');
  assert.equal(list.numberOfItems, 196);
  assert.ok(Array.isArray(list.itemListElement), 'ItemList missing itemListElement');
  assert.equal(list.itemListElement.length, 196);

  const seen = new Set();
  for (const [i, item] of list.itemListElement.entries()) {
    assert.equal(item['@type'], 'ListItem');
    assert.equal(item.position, i + 1, 'ListItem positions must be 1-based and sequential');
    assert.ok(typeof item.name === 'string' && item.name.length > 0, 'ListItem missing name');
    const m = String(item.url).match(/^https:\/\/punycodex\.com\/sites\/([^/]+)\/blog\/$/);
    assert.ok(m, `ListItem url has unexpected shape: ${item.url}`);
    assert.ok(BUILT_SET.has(m[1]), `ListItem url points at non-built id: ${m[1]}`);
    seen.add(m[1]);
  }
  assert.deepEqual([...seen].sort(), BUILT_IDS, 'ItemList must cover every built flagship');
});

test('all 196 card hrefs resolve to built archetype blog pages on disk', () => {
  const html = readIndex();
  const hrefs = [...html.matchAll(/href="\/sites\/([^/]+)\/blog\/"/g)].map((m) => m[1]);
  assert.equal(hrefs.length, 196, `expected 196 blog card hrefs, got ${hrefs.length}`);

  const ids = [...new Set(hrefs)].sort();
  assert.deepEqual(ids, BUILT_IDS, 'card href ids must match the built archetype ids exactly');

  for (const id of ids) {
    const pagePath = path.join(SITES_DIR, id, 'blog', 'index.html');
    assert.ok(fs.existsSync(pagePath), `card target ${pagePath} does not exist`);
  }
});

test('embedded JSON payload covers all 196 posts with canonical field fidelity', () => {
  const payload = extractPayload(readIndex());
  assert.ok(payload, 'embedded POSTS payload is missing or invalid');
  assert.equal(payload.length, 196, `expected 196 payload entries, got ${payload.length}`);

  const payloadIds = payload.map((p) => p.id).sort();
  assert.deepEqual(payloadIds, BUILT_IDS, 'payload ids must match the built archetype ids');

  // The payload uses compact keys: id, u (unicode), p (pantheon), t (tier),
  // r (read minutes), s (lowercased search string carrying title + description).
  for (const entry of payload) {
    for (const key of ['id', 'u', 'p', 't', 'r', 's']) {
      assert.ok(Object.hasOwn(entry, key), `payload entry ${entry.id} missing key "${key}"`);
    }

    const lexiconEntry = LEXICON_BY_ID.get(entry.id);
    assert.ok(lexiconEntry, `payload id ${entry.id} not present in the lexicon`);
    const post = JSON.parse(fs.readFileSync(path.join(BLOG_DIR, `${entry.id}.json`), 'utf8'));

    assert.ok(post.title, `canonical post ${entry.id} missing title`);
    assert.ok(post.description, `canonical post ${entry.id} missing description`);
    assert.ok(post.readingTime, `canonical post ${entry.id} missing readingTime`);

    assert.equal(entry.u, lexiconEntry.unicode, `payload unicode mismatch for ${entry.id}`);
    assert.equal(entry.p, lexiconEntry.pantheon || '', `payload pantheon mismatch for ${entry.id}`);
    assert.equal(entry.t, lexiconEntry.tier || '2', `payload tier mismatch for ${entry.id}`);
    assert.equal(
      entry.r,
      readMinutes(post.readingTime),
      `payload reading-time minutes mismatch for ${entry.id}`
    );
    assert.ok(
      entry.s.includes(post.title.toLowerCase()),
      `payload search string for ${entry.id} does not carry the post title`
    );
    assert.ok(
      entry.s.includes(post.description.toLowerCase()),
      `payload search string for ${entry.id} does not carry the post description`
    );
  }
});

test('every pantheon in the payload is a real lexicon pantheon', () => {
  const payload = extractPayload(readIndex());
  assert.ok(payload, 'embedded POSTS payload is missing or invalid');
  for (const entry of payload) {
    assert.ok(
      LEXICON_PANTHEONS.has(entry.p),
      `payload pantheon "${entry.p}" (${entry.id}) is not a lexicon pantheon`
    );
  }
});

test('sitemap.xml contains /blog/', () => {
  const sitemap = fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8');
  assert.match(
    sitemap,
    /<loc>https:\/\/punycodex\.com\/blog\/<\/loc>/,
    'sitemap.xml is missing the /blog/ entry'
  );
});

test('generator is idempotent (byte-identical output across runs)', () => {
  const hashFile = () =>
    crypto.createHash('sha256').update(fs.readFileSync(INDEX_PATH)).digest('hex');
  const runGenerator = () =>
    execFileSync(process.execPath, [GENERATOR_PATH], { cwd: ROOT, stdio: 'pipe' });

  const committed = hashFile();
  runGenerator();
  const first = hashFile();
  runGenerator();
  const second = hashFile();

  assert.equal(
    first,
    committed,
    'committed blog/index.html is stale — rerun node scripts/generate-blog-index.js'
  );
  assert.equal(second, first, 'generator output differs between consecutive runs');
});
