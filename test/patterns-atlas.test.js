/**
 * PuniCodex — Pattern Atlas tests.
 *
 * Guards the universal /patterns/ experience end to end:
 *   1. Canonical alias layer (type/js/industry-aliases.js) — every key a real
 *      industry, no cross-industry duplicate terms, >=6 lowercase aliases per
 *      industry, weights 1 or 2.
 *   2. Page generator idempotency — byte-identical output across runs.
 *   3. Generated graph JSON — carries the aliases index and meta.aliasCount.
 *   4. Alias matching service — the sponsor journeys (plumber, poet, church,
 *      entrepreneur) land on the right industry; gibberish matches nothing.
 *   5. Match endpoint — blank q yields an empty result set (200), success
 *      envelope shape, wrong method rejected.
 *   6. Generated pages — canonical chrome, marker blocks, Find Your Pattern
 *      input, safely embedded PATTERN_GRAPH, methodology sections.
 *
 * Run standalone: node test/patterns-atlas.test.js
 */

const assert = require('node:assert');
const crypto = require('node:crypto');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const root = path.join(__dirname, '..');

let passed = 0;
let failed = 0;
const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const GENERATOR = path.join(root, 'scripts', 'generate-patterns-page.js');
const STAMPER = path.join(root, 'scripts', 'stamp-asset-versions.js');
const ATLAS_PAGE = path.join(root, 'patterns', 'index.html');
const METHOD_PAGE = path.join(root, 'patterns', 'methodology', 'index.html');

// ---------------------------------------------------------------------------
// 1. Canonical alias layer schema
// ---------------------------------------------------------------------------

test('alias layer schema: real industries, no dup terms, >=6 lowercase aliases each', () => {
  const { INDUSTRY_GROUPS } = require(path.join(root, 'type', 'js', 'industry-patterns.js'));
  const { INDUSTRY_ALIASES } = require(path.join(root, 'type', 'js', 'industry-aliases.js'));
  const industryIds = new Set(INDUSTRY_GROUPS.map((g) => g.industry));

  const seen = new Map();
  let total = 0;
  for (const [industry, aliases] of Object.entries(INDUSTRY_ALIASES)) {
    assert.ok(industryIds.has(industry), `alias key "${industry}" is not a real industry`);
    assert.ok(aliases.length >= 6, `${industry} has only ${aliases.length} aliases`);
    for (const a of aliases) {
      total++;
      assert.strictEqual(a.term, a.term.toLowerCase(), `${industry}: non-lowercase "${a.term}"`);
      assert.ok(a.term.trim().length > 0, `${industry}: empty term`);
      assert.ok(a.weight === 1 || a.weight === 2, `${industry}: bad weight for "${a.term}"`);
      assert.ok(!seen.has(a.term), `term "${a.term}" in both ${seen.get(a.term)} and ${industry}`);
      seen.set(a.term, industry);
    }
  }
  assert.strictEqual(seen.size, total, 'duplicate terms inside one industry');
  for (const id of industryIds) {
    assert.ok(INDUSTRY_ALIASES[id], `industry ${id} has no aliases`);
  }
  assert.ok(total >= 600, `alias vocabulary too thin: ${total}`);
});

// ---------------------------------------------------------------------------
// 2. Page generator idempotency
// ---------------------------------------------------------------------------

test('page generator is idempotent (byte-identical output across runs)', () => {
  const hash = (p) => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
  const runStamper = () => execFileSync(process.execPath, [STAMPER], { cwd: root, stdio: 'pipe' });
  const committed = [hash(ATLAS_PAGE), hash(METHOD_PAGE)];
  execFileSync(process.execPath, [GENERATOR], { cwd: root, stdio: 'pipe' });
  runStamper();
  assert.deepStrictEqual(
    [hash(ATLAS_PAGE), hash(METHOD_PAGE)],
    committed,
    'first regeneration changed a page — rerun node scripts/generate-patterns-page.js then node scripts/stamp-asset-versions.js'
  );
  execFileSync(process.execPath, [GENERATOR], { cwd: root, stdio: 'pipe' });
  runStamper();
  assert.deepStrictEqual(
    [hash(ATLAS_PAGE), hash(METHOD_PAGE)],
    committed,
    'second regeneration changed a page'
  );
});

// ---------------------------------------------------------------------------
// 3. Generated graph JSON carries the alias index
// ---------------------------------------------------------------------------

test('generated industry-patterns JSON carries aliases and meta.aliasCount', () => {
  const api = JSON.parse(read('platform/api/industry-patterns.json'));
  assert.ok(api.aliases && typeof api.aliases === 'object', 'aliases index missing');
  assert.strictEqual(typeof api.meta.aliasCount, 'number', 'meta.aliasCount missing');
  assert.strictEqual(api.meta.aliasCount, Object.keys(api.aliases).length);
  assert.deepStrictEqual(api.aliases.plumber, [{ industry: 'water-utilities', weight: 2 }]);
  const renderer = JSON.parse(read('platform/browser/renderer/industry-patterns.json'));
  assert.strictEqual(renderer.meta.aliasCount, api.meta.aliasCount, 'renderer copy out of sync');
});

// ---------------------------------------------------------------------------
// 4. Alias matching service — the sponsor journeys
// ---------------------------------------------------------------------------

test('matchIndustryAliases lands sponsors on the right industry', () => {
  const svc = require(path.join(root, 'platform', 'api', 'industry-pattern-service.js'));
  const top = (q) => {
    const m = svc.matchIndustryAliases(q);
    assert.ok(m.length > 0, `no match for "${q}"`);
    return m[0];
  };
  assert.strictEqual(top('plumber').industry, 'water-utilities');
  assert.strictEqual(top('poet').industry, 'publishing-media');
  assert.strictEqual(top('church').industry, 'faith');
  assert.strictEqual(top('entrepreneur').industry, 'startups-venture');
  assert.strictEqual(top('dentist').industry, 'healthcare-pharma');
  assert.strictEqual(top('winemaker').industry, 'wine-hospitality');
  assert.deepStrictEqual(svc.matchIndustryAliases('zqxy'), [], 'gibberish should match nothing');
  const hit = top('plumber');
  for (const key of [
    'industry',
    'name',
    'sector',
    'sectorName',
    'tagline',
    'matchedTerm',
    'score',
  ]) {
    assert.ok(key in hit, `match result missing ${key}`);
  }
  assert.ok(svc.matchIndustryAliases('a', 500).length <= 20, 'limit clamp broken');
});

// ---------------------------------------------------------------------------
// 5. Match endpoint — 400 on empty q, envelope shape
// ---------------------------------------------------------------------------

const handler = require(
  path.join(root, 'platform', 'api-handlers', 'v1', 'industry-patterns', 'match.js')
);
let ipCounter = 0;

function invoke(query, method = 'GET') {
  return new Promise((resolve, reject) => {
    const req = new http.IncomingMessage(null);
    req.method = method;
    req.url = '/api/v1/industry-patterns/match/';
    req.headers = { 'x-forwarded-for': `10.9.8.${++ipCounter}` };
    req.query = query;
    const res = new http.ServerResponse(req);
    let statusCode = 200;
    res.setHeader = () => {};
    res.status = (code) => {
      statusCode = code;
      return res;
    };
    res.json = (data) => resolve({ status: statusCode, body: data });
    res.end = () => resolve({ status: statusCode, body: null });
    handler(req, res).catch(reject);
  });
}

test('match endpoint returns the success envelope with ranked matches', async () => {
  const { status, body } = await invoke({ q: 'plumber' });
  assert.strictEqual(status, 200);
  assert.strictEqual(body.success, true);
  assert.ok(body.data && Array.isArray(body.data.matches), 'data.matches missing');
  assert.strictEqual(body.data.query, 'plumber');
  assert.strictEqual(body.data.matches[0].industry, 'water-utilities');
  assert.ok(body.meta?.requestId, 'meta.requestId missing');
  const capped = await invoke({ q: 'a', limit: 50 });
  assert.ok(capped.body.data.matches.length <= 20, 'limit not clamped to 20');
});

test('match endpoint answers a blank q with an empty result set', async () => {
  // The OpenAPI contract requires every documented GET to answer 2xx without
  // parameters, so a blank query is an empty result set, not a 400.
  for (const query of [{}, { q: '' }, { q: '   ' }]) {
    const { status, body } = await invoke(query);
    assert.strictEqual(status, 200, `expected 200 for ${JSON.stringify(query)}`);
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.count, 0);
    assert.deepStrictEqual(body.data.matches, []);
  }
  const wrongMethod = await invoke({ q: 'plumber' }, 'POST');
  assert.strictEqual(wrongMethod.status, 405);
});

// ---------------------------------------------------------------------------
// 6. Generated pages — chrome, embed safety, methodology sections
// ---------------------------------------------------------------------------

test('atlas page carries canonical chrome and all marker blocks', () => {
  const html = read('patterns/index.html');
  for (const marker of [
    'PUNICODEX-ANALYTICS-START',
    'PUNICODEX-HERALD-BEACON-START',
    'PUNICODEX-COOKIE-CONSENT-START',
    'punicodex-wordmark-ivory',
    'class="nav-cta"',
    'id="nav-toggle"',
    'id="mobile-menu"',
    '<footer',
    '/assets/brand/02-favicons/favicon.svg',
    '<link rel="canonical" href="https://punicodex.com/patterns/"',
    '/js/patterns-atlas.js',
    'role="combobox"',
    'id="pfp-input"',
    'data-q="plumber"',
    '/patterns/methodology/',
  ]) {
    assert.ok(html.includes(marker), `missing ${marker}`);
  }
  assert.strictEqual(html.indexOf('<footer'), html.lastIndexOf('<footer'), 'duplicate footers');
});

test('PATTERN_GRAPH is embedded complete, slimmed, and cannot break the script tag', () => {
  const html = read('patterns/index.html');
  const m = html.match(
    /window\.PATTERN_GRAPH = (\{[\s\S]*?\});\nwindow\.PATTERN_TEMPLES = (\{[\s\S]*?\});\n/
  );
  assert.ok(m, 'PATTERN_GRAPH / PATTERN_TEMPLES embed not found');
  assert.ok(!m[1].includes('</') && !m[2].includes('</'), 'raw "</" inside the embedded JSON');
  const graph = JSON.parse(m[1].replace(/<\\\//g, '</'));
  const temples = JSON.parse(m[2].replace(/<\\\//g, '</'));
  // Counts must mirror the canonical graph exactly — never hardcode them.
  const canonical = require(path.join(root, 'type', 'js', 'industry-patterns.js'));
  assert.strictEqual(graph.industries.length, canonical.INDUSTRY_GROUPS.length);
  assert.strictEqual(graph.sectors.length, canonical.INDUSTRY_SECTORS.length);
  assert.ok(Object.keys(graph.aliases).length >= 600, 'alias index not embedded');
  assert.ok(!graph.byEntry, 'byEntry should be stripped from the embed');
  assert.ok(
    graph.industries.every((g) => g.members.every((mm) => !('ascii' in mm))),
    'member ascii fields should be stripped from the embed'
  );
  const { ARCHETYPES } = require(path.join(root, 'js', 'archetypes-v2.js'));
  const built = ARCHETYPES.filter((a) => a.built);
  assert.strictEqual(Object.keys(temples).length, built.length);
  let mascots = 0;
  for (const a of built) {
    const t = temples[a.id];
    assert.ok(t?.unicode && t.pantheon, `temple registry incomplete for ${a.id}`);
    if (t.mascot) {
      assert.ok(
        fs.existsSync(path.join(root, t.mascot.replace(/^\//, ''))),
        `mascot missing on disk: ${t.mascot}`
      );
      mascots++;
    }
  }
  assert.ok(mascots > built.length * 0.9, `too few mascots verified (${mascots}/${built.length})`);
});

test('atlas page renders all seven sector columns and every industry toggle', () => {
  const html = read('patterns/index.html');
  const { INDUSTRY_SECTORS, INDUSTRY_GROUPS } = require(
    path.join(root, 'type', 'js', 'industry-patterns.js')
  );
  for (const s of INDUSTRY_SECTORS) {
    assert.ok(html.includes(s.name), `sector ${s.name} missing from atlas`);
    assert.ok(html.includes(s.color), `sector color ${s.color} missing`);
  }
  for (const g of INDUSTRY_GROUPS) {
    assert.ok(
      html.includes(`id="pa-panel-${g.industry}"`),
      `industry toggle ${g.industry} missing`
    );
  }
});

test('client engine is wired to the match API with a silent local fallback', () => {
  const js = read('js/patterns-atlas.js');
  for (const marker of [
    '/api/v1/industry-patterns/match/?q=',
    'window.PATTERN_GRAPH',
    'window.PATTERN_TEMPLES',
    'localMatch',
    'aria-activedescendant',
    'prefers-reduced-motion',
  ]) {
    assert.ok(js.includes(marker), `engine missing ${marker}`);
  }
});

test('methodology page exists with the five sections and real data quotes', () => {
  const html = read('patterns/methodology/index.html');
  for (const marker of [
    '<link rel="canonical" href="https://punicodex.com/patterns/methodology/"',
    'codex-article-category',
    'codex-article-date',
    'codex-article-readtime',
    'The Discipline',
    'The Alias Layer',
    'The Editorial Rules',
    'Data &amp; API',
    'Corrections',
    '/contact/',
    '/api/v1/industry-patterns',
    '/api/v1/docs/',
    'PUNICODEX-ANALYTICS-START',
    'PUNICODEX-COOKIE-CONSENT-START',
  ]) {
    assert.ok(html.includes(marker), `missing ${marker}`);
  }
  // Real why-lines quoted from the canonical data, with temple names.
  const graph = JSON.parse(read('platform/api/industry-patterns.json'));
  const whyOf = (industryId, memberId) =>
    graph.industries.find((g) => g.industry === industryId).members.find((mm) => mm.id === memberId)
      .why;
  for (const [industryId, memberId] of [
    ['solar-energy', 'helios'],
    ['water-utilities', 'ganga'],
    ['faith', 'mazu'],
    ['faith', 'moses'],
  ]) {
    assert.ok(
      html.includes(whyOf(industryId, memberId)),
      `missing quote ${industryId}/${memberId}`
    );
    assert.ok(html.includes(`/${memberId}/`), `missing temple link ${memberId}`);
  }
});

// ---------------------------------------------------------------------------

async function runAll() {
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
  console.log(`\nPattern Atlas: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

runAll();
