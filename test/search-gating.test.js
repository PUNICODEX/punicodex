/**
 * Search keyword-gating and unicodeOnly tests.
 *
 * Gating: platform/api/search.js#search() must not dump the whole entries
 * table for a bare request (empty q, no browse-intent filters) — while
 * filter-driven browsing and the v1 names listing (browseAll) keep working.
 *
 * unicodeOnly: platform/api/crawler-db.js#searchWeb must restrict results to
 * real punycode (xn--) domains when the option is set.
 */

const assert = require('node:assert');
const Database = require('better-sqlite3');
const { prepareTestDb } = require('./helpers/test-db.js');

const suiteName = 'search-gating.test.js';
const testDbPath = prepareTestDb(suiteName);

// Fixture for the unicodeOnly tests: one punycode site + one ASCII site, both
// matching the same unique keyword. Inserted before crawler-db opens its
// connection (the FTS triggers index them automatically).
const FIXTURE_KEYWORD = 'zqxwtest';
{
  const db = new Database(testDbPath);
  const insert = db.prepare(`
    INSERT INTO indexed_sites (domain, punycode, title, description, status, is_flagship)
    VALUES (?, ?, ?, ?, 'active', 1)
  `);
  insert.run(
    'zqxwtest-unicode.example',
    'xn--zqxwtest-unicode.example',
    'Zqxwtest Unicode Domain Site',
    'fixture site on a real punycode domain'
  );
  insert.run(
    'zqxwtest-ascii.example',
    'zqxwtest-ascii.example',
    'Zqxwtest Ascii Domain Site',
    'fixture site on a plain ascii domain'
  );
  db.close();
}

const searchService = require('../platform/api/search.js');
const { searchWeb } = require('../platform/api/crawler-db.js');

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed++;
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
  }
}

async function run() {
  console.log('\n▸ Search Gating Tests\n');

  await test('empty q with no filters returns an empty result set', () => {
    for (const args of [
      {},
      { q: '' },
      { q: '   ' },
      // Exactly what the /api/search/ handler passes for a bare request.
      { type: 'all', sort: 'relevance', limit: 20, offset: 0, trust: 'safe' },
    ]) {
      const result = searchService.search(args);
      assert.deepStrictEqual(result.entries, [], JSON.stringify(args));
      assert.strictEqual(result.total, 0, JSON.stringify(args));
      assert.strictEqual(result.queryTrust, null, JSON.stringify(args));
      assert.strictEqual(result.limit, args.limit ?? 20);
      assert.strictEqual(result.offset, args.offset ?? 0);
    }
  });

  await test('empty q with type=gods still browses', () => {
    const result = searchService.search({ type: 'gods', limit: 50 });
    assert.ok(result.total > 0, 'type=gods must keep browse behavior');
    assert.ok(result.entries.length > 0);
    assert.ok(result.entries.every((e) => e.pantheon !== 'greek-location'));
  });

  await test('empty q with other browse-intent filters still browses', () => {
    assert.ok(searchService.search({ pantheon: 'greek', limit: 5 }).total > 0, 'pantheon');
    assert.ok(searchService.search({ tier: 'dual', limit: 5 }).total > 0, 'tier');
    assert.ok(searchService.search({ hasSite: false, limit: 5 }).total > 0, 'hasSite');
    assert.ok(searchService.search({ trust: 'all', limit: 5 }).total > 0, 'trust=all');
  });

  await test('browseAll opts out of gating (v1 names listing contract)', () => {
    const result = searchService.search({ browseAll: true, limit: 5 });
    assert.ok(result.total > 0);
    assert.strictEqual(result.entries.length, 5);
  });

  await test('names-service listNames keeps its full-listing contract', () => {
    const { listNames } = require('../platform/api/names-service.js');
    const result = listNames({ limit: 5 });
    assert.ok(result.total > 0, 'filterless /api/v1/names must still list the lexicon');
    assert.strictEqual(result.items.length, 5);
  });

  await test('keyword search is unaffected by gating', () => {
    const result = searchService.search({ q: 'zeus', limit: 5 });
    assert.ok(result.total > 0);
    assert.ok(result.entries.some((e) => e.id === 'zeus'));
  });

  await test('searchWeb with unicodeOnly returns only xn-- punycodes', async () => {
    const all = await searchWeb(FIXTURE_KEYWORD, { limit: 10 });
    const fixtureHits = all.results.filter((r) => r.domain?.includes(FIXTURE_KEYWORD));
    assert.strictEqual(fixtureHits.length, 2, 'fixture should match both sites without the filter');

    const filtered = await searchWeb(FIXTURE_KEYWORD, { limit: 10, unicodeOnly: true });
    assert.strictEqual(filtered.unicodeOnly, true, 'response must echo unicodeOnly');
    const filteredFixture = filtered.results.filter((r) => r.domain?.includes(FIXTURE_KEYWORD));
    assert.strictEqual(filteredFixture.length, 1, 'ASCII fixture site must be filtered out');
    assert.ok(
      filtered.results.every((r) => r.punycode?.startsWith('xn--')),
      'every result must be a real punycode domain'
    );
    assert.strictEqual(filteredFixture[0].punycode, 'xn--zqxwtest-unicode.example');
  });

  console.log(`\nSearch Gating: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
