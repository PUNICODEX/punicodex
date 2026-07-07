/**
 * Search service unit tests (platform/api/search.js).
 */

const assert = require('node:assert');
const { prepareTestDb } = require('./helpers/test-db.js');

const suiteName = 'search.test.js';
prepareTestDb(suiteName);

const searchService = require('../platform/api/search.js');

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

function run() {
  console.log('\n▸ Search Service Tests\n');

  test('search returns zeus for exact query', () => {
    const result = searchService.search({ q: 'zeus', limit: 5 });
    assert.ok(result.entries.length > 0);
    assert.ok(result.entries.some((e) => e.id === 'zeus'));
    assert.ok(result.total > 0);
  });

  test('search filters by pantheon', () => {
    const result = searchService.search({ q: 'thor', pantheon: 'norse', limit: 10 });
    assert.ok(result.entries.every((e) => e.pantheon === 'norse'));
  });

  test('search filters by tier', () => {
    const result = searchService.search({ tier: 'dual', limit: 10 });
    assert.ok(result.entries.every((e) => e.tier === 'dual'));
  });

  test('search hasSite=true only returns entries with active sites', () => {
    const result = searchService.search({ hasSite: true, limit: 50 });
    assert.ok(result.entries.every((e) => e.site !== null));
  });

  test('search hasSite=false only returns entries without active sites', () => {
    const result = searchService.search({ hasSite: false, limit: 50 });
    assert.ok(result.entries.every((e) => e.site === null));
  });

  test('search type=gods excludes greek-location', () => {
    const result = searchService.search({ type: 'gods', limit: 50 });
    assert.ok(result.entries.every((e) => e.pantheon !== 'greek-location'));
  });

  test('search type=locations returns only greek-location', () => {
    const result = searchService.search({ type: 'locations', limit: 50 });
    assert.ok(result.entries.every((e) => e.pantheon === 'greek-location'));
  });

  test('search type=realms returns known realms', () => {
    const result = searchService.search({ q: 'heim', type: 'realms', limit: 20 });
    assert.ok(result.entries.some((e) => e.id === 'helheimr'));
  });

  test('search supports alphabetical sort', () => {
    const result = searchService.search({ pantheon: 'greek', sort: 'alphabetical', limit: 5 });
    const unicode = result.entries.map((e) => e.unicode);
    const sorted = [...unicode].sort((a, b) => (a > b ? 1 : a < b ? -1 : 0));
    assert.deepStrictEqual(unicode, sorted);
  });

  test('search supports tier sort', () => {
    const result = searchService.search({ sort: 'tier', limit: 20 });
    const order = { dual: 0, 1: 1, 2: 2 };
    const ranks = result.entries.map((e) => order[e.tier] ?? 3);
    for (let i = 1; i < ranks.length; i++) {
      assert.ok(ranks[i] >= ranks[i - 1], 'tier sort should be non-decreasing');
    }
  });

  test('search trust=canonical returns only canonical results', () => {
    const result = searchService.search({ q: 'zeus', trust: 'canonical', limit: 10 });
    assert.ok(result.entries.every((e) => e.site?.trustTier === 'canonical' || !e.site));
  });

  test('search trust=safe excludes unsafe and suspicious', () => {
    const result = searchService.search({ q: 'zeus', trust: 'safe', limit: 10 });
    assert.ok(result.entries.every((e) => !['unsafe', 'suspicious'].includes(e.site?.trustTier)));
  });

  test('getEntry returns full record for zeus', () => {
    const entry = searchService.getEntry('zeus');
    assert.ok(entry);
    assert.strictEqual(entry.id, 'zeus');
    assert.ok(Array.isArray(entry.breakdown));
    assert.ok(entry.punycode);
  });

  test('getEntry returns null for unknown id', () => {
    assert.strictEqual(searchService.getEntry('not-an-id-xyz'), null);
  });

  test('getEntry survives malformed registrar_links JSON', () => {
    const Database = require('better-sqlite3');
    const { getDbPath } = require('../platform/db/db.js');
    const db = new Database(getDbPath());
    db.prepare("DELETE FROM availability WHERE entry_id = 'zeus'").run();
    db.prepare(
      "INSERT INTO availability (entry_id, domain, punycode, status, registrar_links) VALUES ('zeus', 'zeus.com', 'zeus.com', 'available', 'not-json')"
    ).run();
    db.close();
    const entry = searchService.getEntry('zeus');
    assert.ok(entry);
    assert.ok(entry.availability);
    assert.deepStrictEqual(entry.availability.registrar_links, {});
  });

  test('getStats available count only counts available status', () => {
    const Database = require('better-sqlite3');
    const { getDbPath } = require('../platform/db/db.js');
    const db = new Database(getDbPath());
    const before = db
      .prepare("SELECT COUNT(*) as c FROM availability WHERE status = 'available'")
      .get().c;
    db.prepare("DELETE FROM availability WHERE entry_id = 'hades'").run();
    db.prepare(
      "INSERT INTO availability (entry_id, domain, punycode, status, registrar_links) VALUES ('hades', 'hades.com', 'hades.com', 'available', '{}')"
    ).run();
    db.close();
    const stats = searchService.getStats();
    assert.strictEqual(stats.sites.available, before + 1);
  });

  test('getVariants includes punycode field', () => {
    const variants = searchService.getVariants('zeus');
    assert.ok(Array.isArray(variants));
    if (variants.length > 0) {
      assert.ok(variants.every((v) => Object.hasOwn(v, 'punycode')));
    }
  });

  test('getVariantsByAscii includes punycode field', () => {
    const byAscii = searchService.getVariantsByAscii('zeus') || [];
    assert.ok(byAscii.length > 0);
    assert.ok(byAscii.every((v) => Object.hasOwn(v, 'punycode')));
  });

  test('search handles FTS special characters without crashing', () => {
    assert.doesNotThrow(() => searchService.search({ q: '"near*"', limit: 5 }));
  });

  test('search pagination offset works', () => {
    const page1 = searchService.search({
      pantheon: 'greek',
      sort: 'alphabetical',
      limit: 5,
      offset: 0,
    });
    const page2 = searchService.search({
      pantheon: 'greek',
      sort: 'alphabetical',
      limit: 5,
      offset: 5,
    });
    assert.strictEqual(page1.entries.length, 5);
    assert.strictEqual(page2.entries.length, 5);
    assert.ok(!page1.entries.some((e) => page2.entries.some((e2) => e2.id === e.id)));
  });

  test('search queryTrust is returned for queries', () => {
    const result = searchService.search({ q: 'zeus', limit: 1 });
    assert.ok(result.queryTrust);
    assert.ok(
      ['canonical', 'ascii-fallback', 'styled', 'unknown'].includes(result.queryTrust.tier)
    );
    assert.ok(result.queryTrust.verdict);
    assert.ok(result.queryTrust.severity);
  });

  test('search queryTrust flags homograph queries', () => {
    const result = searchService.search({ q: '\u0430res', limit: 1 });
    assert.ok(result.queryTrust);
    assert.strictEqual(result.queryTrust.verdict, 'homograph-spoof');
    assert.strictEqual(result.queryTrust.severity, 'high');
  });

  test('getPantheons returns distinct pantheons', () => {
    const pantheons = searchService.getPantheons();
    assert.ok(pantheons.includes('greek'));
    assert.ok(pantheons.includes('norse'));
    assert.strictEqual(pantheons.length, new Set(pantheons).size);
  });

  test('getByPantheon returns only entries in pantheon', () => {
    const rows = searchService.getByPantheon('norse');
    assert.ok(rows.every((r) => r.pantheon === 'norse'));
  });

  console.log(`\nSearch Service: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

run();
