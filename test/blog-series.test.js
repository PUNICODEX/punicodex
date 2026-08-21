/**
 * The Restoration Files + SEO refinement tests
 *
 * Every flagship temple has a second, individually addressable blog post in
 * The Restoration Files: canonical content JSON, a rendered series page with
 * correct canonical/OG/Article schema, a cross-link from the founding post,
 * a merged blog index, sitemap coverage, generator registration, and the
 * FAQ structured data on the rulebook and pattern atlas.
 */

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..');
const SERIES_DIR = path.join(ROOT, 'platform', 'blog', 'series', 'restoration');

const archetypeSrc = fs.readFileSync(path.join(ROOT, 'js', 'archetypes-v2.js'), 'utf8');
const ARCHETYPES = vm.runInNewContext(`(function(){\n${archetypeSrc}\nreturn ARCHETYPES;\n})()`);
const BUILT_IDS = ARCHETYPES.filter((a) => a.built)
  .map((a) => a.id)
  .sort();

const { LEXICON } = require(path.join(ROOT, 'type', 'js', 'lexicon.js'));
const LEXICON_BY_ID = new Map(LEXICON.map((e) => [e.id, e]));

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

test('every built flagship has a series post with a unique title and description', () => {
  const titles = new Set();
  const descriptions = new Set();
  for (const id of BUILT_IDS) {
    const p = path.join(SERIES_DIR, `${id}.json`);
    assert.ok(fs.existsSync(p), `missing series JSON for ${id}`);
    const post = JSON.parse(fs.readFileSync(p, 'utf8'));
    assert.strictEqual(post.entryId, id);
    assert.strictEqual(post.series, 'restoration');
    assert.ok(post.title.length > 20, `${id}: title too thin`);
    assert.ok(
      post.description.length > 80 && post.description.length < 220,
      `${id}: description length ${post.description.length}`
    );
    assert.ok(post.body.split(/\s+/).length >= 450, `${id}: body under 450 words`);
    assert.ok(post.keywords.includes('The Restoration Files'), `${id}: series keyword missing`);
    assert.ok(
      post.seriesNo >= 1 && post.seriesNo <= BUILT_IDS.length,
      `${id}: series number out of range`
    );
    titles.add(post.title);
    descriptions.add(post.description);
  }
  assert.strictEqual(
    titles.size,
    BUILT_IDS.length,
    'series titles must be unique across the fleet'
  );
  assert.strictEqual(
    descriptions.size,
    BUILT_IDS.length,
    'series descriptions must be unique across the fleet'
  );
});

test('series pages render with correct canonical, OG, Article schema, and no placeholders', () => {
  for (const id of BUILT_IDS) {
    const p = path.join(ROOT, 'sites', id, 'blog', 'restoration', 'index.html');
    assert.ok(fs.existsSync(p), `missing series page for ${id}`);
    const html = fs.readFileSync(p, 'utf8');
    assert.ok(!html.includes('{{'), `${id}: leftover template placeholder`);
    assert.ok(
      html.includes(`rel="canonical" href="https://punicodex.com/${id}/blog/restoration/"`),
      `${id}: wrong canonical`
    );
    assert.ok(
      html.includes(`"url": "https://punicodex.com/${id}/blog/restoration/"`),
      `${id}: Article schema url wrong`
    );
    assert.ok(html.includes('"@type": "BlogPosting"'), `${id}: BlogPosting schema missing`);
    assert.ok(html.includes('The Restoration Files'), `${id}: series masthead missing`);
    assert.ok(html.includes('blog-series-nav'), `${id}: series navigation missing`);
    // Relative assets must climb two levels from /sites/{id}/blog/restoration/.
    assert.ok(html.includes('href="../../styles.css'), `${id}: relative stylesheet path wrong`);
  }
});

test('founding posts cross-link their series file; series posts link back', () => {
  for (const id of BUILT_IDS.slice(0, 25)) {
    const founding = fs.readFileSync(path.join(ROOT, 'sites', id, 'blog', 'index.html'), 'utf8');
    assert.ok(
      founding.includes('blog-series-nav'),
      `${id}: founding post missing series cross-link`
    );
    assert.ok(founding.includes('href="./restoration/"'), `${id}: founding cross-link href wrong`);
    const series = fs.readFileSync(
      path.join(ROOT, 'sites', id, 'blog', 'restoration', 'index.html'),
      'utf8'
    );
    assert.ok(series.includes('The founding dispatch'), `${id}: series page missing backlink`);
  }
  // Series prev/next chain is complete and correctly ordered (three levels
  // up from /sites/{id}/blog/restoration/ to reach the sibling temple).
  for (let i = 1; i < BUILT_IDS.length - 1; i++) {
    const html = fs.readFileSync(
      path.join(ROOT, 'sites', BUILT_IDS[i], 'blog', 'restoration', 'index.html'),
      'utf8'
    );
    assert.ok(
      html.includes(`../../../${BUILT_IDS[i - 1]}/blog/restoration/`),
      `${BUILT_IDS[i]}: prev link missing`
    );
    assert.ok(
      html.includes(`../../../${BUILT_IDS[i + 1]}/blog/restoration/`),
      `${BUILT_IDS[i]}: next link missing`
    );
  }
});

test('blog index merges founding + series dispatches with no id collisions', () => {
  const html = fs.readFileSync(path.join(ROOT, 'blog', 'index.html'), 'utf8');
  const cards = html.match(/class="blogi-card[" ]/g) || [];
  assert.ok(cards.length >= BUILT_IDS.length * 2, 'index must carry founding + series cards');
  assert.ok(html.includes('blogi-card-series'), 'series card styling class missing');
  assert.ok(html.includes('Restoration Files'), 'series badge missing');
  assert.ok(
    !/data-id="([a-z0-9-]+)"[\s\S]{0,400}?data-id="\1"/.test(html),
    'duplicate data-id in cards'
  );
});

test('sitemap covers the series; generators are registered in the flywheel', () => {
  const sitemap = fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8');
  for (const id of BUILT_IDS.slice(0, 40)) {
    assert.ok(sitemap.includes(`/${id}/blog/restoration/`), `sitemap missing ${id} series URL`);
  }
  const gen = fs.readFileSync(path.join(ROOT, 'scripts', 'generate.js'), 'utf8');
  assert.ok(
    gen.includes('generate-blog-series-restoration.js'),
    'series content generator not registered'
  );
  assert.ok(gen.includes('generate-blog-series-pages.js'), 'series page generator not registered');
  const seriesIdx = gen.indexOf('generate-blog-series-restoration.js');
  const pagesIdx = gen.indexOf('generate-blog-series-pages.js');
  const indexIdx = gen.indexOf('generate-blog-index.js');
  assert.ok(
    seriesIdx < pagesIdx && pagesIdx < indexIdx,
    'generator order: content → pages → index'
  );
});

test('every built flagship has a resonance post connecting myths to industries', () => {
  const RES_DIR = path.join(ROOT, 'platform', 'blog', 'series', 'resonance');
  const titles = new Set();
  const descriptions = new Set();
  const PATTERNS = require(path.join(ROOT, 'platform', 'api', 'industry-patterns.json'));
  for (const id of BUILT_IDS) {
    const p = path.join(RES_DIR, `${id}.json`);
    assert.ok(fs.existsSync(p), `missing resonance JSON for ${id}`);
    const post = JSON.parse(fs.readFileSync(p, 'utf8'));
    assert.strictEqual(post.entryId, id);
    assert.strictEqual(post.series, 'resonance');
    assert.ok(post.title.length > 20, `${id}: title too thin`);
    assert.ok(post.body.split(/\s+/).length >= 500, `${id}: body under 500 words`);
    assert.ok(post.keywords.includes('The Resonance Files'), `${id}: series keyword missing`);
    // Temples with pattern seats must name at least one seat's industry.
    const seats = PATTERNS.byEntry[id] || [];
    if (seats.length > 0) {
      const topSeat = seats.slice().sort((a, b) => b.weight - a.weight)[0];
      assert.ok(
        post.body.includes(topSeat.name),
        `${id}: top seat ${topSeat.name} absent from body`
      );
      assert.ok(post.body.includes('/patterns/'), `${id}: atlas link missing`);
    }
    titles.add(post.title);
    descriptions.add(post.description);
  }
  assert.strictEqual(titles.size, BUILT_IDS.length, 'resonance titles must be unique');
  assert.strictEqual(descriptions.size, BUILT_IDS.length, 'resonance descriptions must be unique');
});

test('resonance pages render with correct canonical and series chain', () => {
  for (const id of BUILT_IDS.slice(0, 30)) {
    const p = path.join(ROOT, 'sites', id, 'blog', 'resonance', 'index.html');
    assert.ok(fs.existsSync(p), `missing resonance page for ${id}`);
    const html = fs.readFileSync(p, 'utf8');
    assert.ok(!html.includes('{{'), `${id}: leftover template placeholder`);
    assert.ok(
      html.includes(`rel="canonical" href="https://punicodex.com/${id}/blog/resonance/"`),
      `${id}: wrong canonical`
    );
    assert.ok(html.includes('"@type": "BlogPosting"'), `${id}: BlogPosting schema missing`);
    assert.ok(html.includes('The Resonance Files'), `${id}: masthead missing`);
    assert.ok(html.includes('for this temple'), `${id}: cross-series link missing`);
  }
  for (let i = 1; i < BUILT_IDS.length - 1; i += 17) {
    const html = fs.readFileSync(
      path.join(ROOT, 'sites', BUILT_IDS[i], 'blog', 'resonance', 'index.html'),
      'utf8'
    );
    assert.ok(
      html.includes(`../../../${BUILT_IDS[i - 1]}/blog/resonance/`),
      `${BUILT_IDS[i]}: prev link missing`
    );
    assert.ok(
      html.includes(`../../../${BUILT_IDS[i + 1]}/blog/resonance/`),
      `${BUILT_IDS[i]}: next link missing`
    );
  }
});

test('every built flagship has a canonical register entry with truthful ASCII status', () => {
  const CAN_DIR = path.join(ROOT, 'platform', 'blog', 'series', 'canonical');
  const REGISTER = require(path.join(ROOT, 'platform', 'api', 'canonical-register.json'));
  const titles = new Set();
  const descriptions = new Set();
  for (const id of BUILT_IDS) {
    const p = path.join(CAN_DIR, `${id}.json`);
    assert.ok(fs.existsSync(p), `missing canonical JSON for ${id}`);
    const post = JSON.parse(fs.readFileSync(p, 'utf8'));
    assert.strictEqual(post.entryId, id);
    assert.strictEqual(post.series, 'canonical');
    assert.ok(post.body.split(/\s+/).length >= 450, `${id}: body under 450 words`);
    // The ASCII-status truth is mandatory in every architecture (its heading
    // varies: ruling section, dossier exhibit, trial witness, letter prose).
    assert.ok(
      /flattened form|fallback|acceptable everywhere/i.test(post.body),
      `${id}: ASCII status content missing`
    );
    assert.ok(post.body.includes('IDNA 2008'), `${id}: IDNA section missing`);
    titles.add(post.title);
    descriptions.add(post.description);
    // The machine-readable register agrees with the lexicon.
    const rec = REGISTER.entries[id];
    assert.ok(rec, `register missing ${id}`);
    assert.ok(
      rec.asciiStatus === 'canonical' || rec.asciiStatus === 'fallback',
      `${id}: bad asciiStatus`
    );
    const entry = LEXICON_BY_ID.get(id);
    assert.strictEqual(rec.canonical, entry.unicode, `${id}: canonical mismatch`);
    // ASCII status must be truthful: canonical only when forms coincide but for case.
    const caseOnly = entry.unicode.toLowerCase() === entry.ascii.toLowerCase();
    assert.strictEqual(rec.asciiStatus === 'canonical', caseOnly, `${id}: asciiStatus untruthful`);
    // The register never lists the plain ASCII form as a false form.
    for (const f of rec.falseForms) {
      assert.ok(
        f.form !== entry.ascii,
        `${id}: ASCII listed as false — that is a lie the register must never tell`
      );
      assert.ok(f.origin && f.violation, `${id}: false form missing origin/violation`);
    }
  }
  assert.strictEqual(titles.size, BUILT_IDS.length, 'canonical titles must be unique');
  assert.strictEqual(descriptions.size, BUILT_IDS.length, 'canonical descriptions must be unique');
});

test('canonical pages render with correct canonical URL and series chain; API endpoint exists', () => {
  for (const id of BUILT_IDS.slice(0, 30)) {
    const p = path.join(ROOT, 'sites', id, 'blog', 'canonical', 'index.html');
    assert.ok(fs.existsSync(p), `missing canonical page for ${id}`);
    const html = fs.readFileSync(p, 'utf8');
    assert.ok(!html.includes('{{'), `${id}: leftover placeholder`);
    assert.ok(
      html.includes(`rel="canonical" href="https://punicodex.com/${id}/blog/canonical/"`),
      `${id}: wrong canonical URL`
    );
    assert.ok(html.includes('"@type": "BlogPosting"'), `${id}: BlogPosting schema missing`);
    assert.ok(html.includes('The Canonical Register'), `${id}: masthead missing`);
  }
  for (let i = 1; i < BUILT_IDS.length - 1; i += 19) {
    const html = fs.readFileSync(
      path.join(ROOT, 'sites', BUILT_IDS[i], 'blog', 'canonical', 'index.html'),
      'utf8'
    );
    assert.ok(
      html.includes(`../../../${BUILT_IDS[i - 1]}/blog/canonical/`),
      `${BUILT_IDS[i]}: prev link missing`
    );
    assert.ok(
      html.includes(`../../../${BUILT_IDS[i + 1]}/blog/canonical/`),
      `${BUILT_IDS[i]}: next link missing`
    );
  }
  const endpoint = fs.readFileSync(
    path.join(ROOT, 'platform', 'api-handlers', 'v1', 'canonical-register', 'index.js'),
    'utf8'
  );
  assert.ok(endpoint.includes('canonical-register.json'), 'endpoint does not serve the register');
  const gen = fs.readFileSync(path.join(ROOT, 'scripts', 'generate.js'), 'utf8');
  assert.ok(
    gen.includes('generate-blog-series-canonical.js'),
    'canonical generator not registered in flywheel'
  );
  const sitemap = fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8');
  for (const id of BUILT_IDS.slice(0, 40)) {
    assert.ok(sitemap.includes(`/${id}/blog/canonical/`), `sitemap missing ${id} canonical URL`);
  }
});

test('blog index merges all four dispatches; no id collisions', () => {
  const html = fs.readFileSync(path.join(ROOT, 'blog', 'index.html'), 'utf8');
  const cards = html.match(/class="blogi-card[" ]/g) || [];
  assert.strictEqual(
    cards.length,
    BUILT_IDS.length * 4,
    'index must carry founding + three series'
  );
  assert.ok(html.includes('Canonical Register'), 'canonical badge missing');
  assert.ok(
    !/data-id="([a-z0-9-]+)"[\s\S]{0,400}?data-id="\1"/.test(html),
    'duplicate data-id in cards'
  );
});

test('FAQ structured data is present and valid on rulebook and pattern atlas', () => {
  for (const page of ['rulebook/index.html', 'patterns/index.html']) {
    const html = fs.readFileSync(path.join(ROOT, page), 'utf8');
    const m = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    assert.ok(m, `${page}: no JSON-LD block`);
    const ld = JSON.parse(m[1].replace(/\\u003c/g, '<'));
    assert.strictEqual(ld['@type'], 'FAQPage', `${page}: not an FAQPage`);
    assert.ok(ld.mainEntity.length >= 5, `${page}: fewer than 5 Q&A pairs`);
    for (const q of ld.mainEntity) {
      assert.ok(q.name.endsWith('?'), `${page}: question must be a question`);
      assert.ok(q.acceptedAnswer.text.length > 100, `${page}: answer too thin`);
    }
  }
});

(async () => {
  let failures = 0;
  for (const { name, fn } of tests) {
    try {
      await fn();
      console.log(`  ✓ ${name}`);
    } catch (err) {
      failures++;
      console.error(`  ✗ ${name}`);
      console.error(`    ${err.message}`);
    }
  }
  if (failures) {
    console.error(`\n${failures} test(s) failed`);
    process.exit(1);
  }
  console.log(`\nAll ${tests.length} blog-series tests passed`);
})();
