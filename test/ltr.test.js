/**
 * Learning-to-Rank (LTR) Tests
 */

const assert = require('node:assert');
const Database = require('better-sqlite3');
const { getDbPath } = require('../platform/db/db');
const { toSearchKey } = require('../platform/api/query-normalize');
const {
  recordClick,
  getLtrBoosts,
  getSiteQualityScore,
  MIN_IMPRESSIONS,
} = require('../platform/api/ltr-service');

const tests = [];

function test(name, fn) {
  tests.push({ name, fn });
}

function run() {
  let passed = 0;
  let failed = 0;

  for (const t of tests) {
    try {
      t.fn();
      passed++;
      console.log(`  ✓ ${t.name}`);
    } catch (e) {
      failed++;
      console.error(`  ✗ ${t.name}`);
      console.error(`    ${e.message}`);
    }
  }

  console.log(`\nLTR: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

const db = new Database(getDbPath());
const testQuery = `ltr-test-query-${Date.now()}`;
let testSiteId;

test('finds a test site', () => {
  const row = db.prepare('SELECT id FROM indexed_sites LIMIT 1').get();
  assert.ok(row, 'no indexed_sites rows found');
  testSiteId = row.id;
});

test('records clicks and computes LTR boost', () => {
  assert.ok(testSiteId, 'test site not initialized');

  for (let i = 0; i < MIN_IMPRESSIONS; i++) {
    recordClick({ query: testQuery, siteId: testSiteId, position: i, source: 'test' });
  }

  const boosts = getLtrBoosts(testQuery, [testSiteId]);
  assert.ok(boosts.has(testSiteId), 'boost map should include test site');
  const boost = boosts.get(testSiteId);
  assert.ok(boost > 0, `expected positive boost, got ${boost}`);
  assert.ok(boost <= 0.5, `boost should not exceed 0.5, got ${boost}`);
});

test('returns zero boost for unknown query', () => {
  const boosts = getLtrBoosts('this-query-should-not-exist-xyz', [testSiteId]);
  assert.strictEqual(boosts.get(testSiteId), undefined);
});

test('computes site quality score', () => {
  const score = getSiteQualityScore(testSiteId);
  assert.ok(typeof score === 'number');
  assert.ok(score >= 0 && score <= 0.3, `quality score out of range: ${score}`);
});

test('deduplicates clicks by session token', () => {
  assert.ok(testSiteId, 'test site not initialized');
  const dedupeQuery = `ltr-dedupe-${Date.now()}`;
  for (let i = 0; i < MIN_IMPRESSIONS + 2; i++) {
    recordClick({
      query: dedupeQuery,
      siteId: testSiteId,
      position: i,
      source: 'test',
      sessionToken: 'same-session',
    });
  }
  const boosts = getLtrBoosts(dedupeQuery, [testSiteId]);
  assert.strictEqual(
    boosts.get(testSiteId),
    undefined,
    'single-session clicks should not produce boost'
  );
  db.prepare('DELETE FROM search_result_clicks WHERE query = ?').run(toSearchKey(dedupeQuery));
});

test('normalizes query across accent variants', () => {
  assert.ok(testSiteId, 'test site not initialized');
  const variantQuery = `ltr-variant-${Date.now()}`;
  for (let i = 0; i < MIN_IMPRESSIONS; i++) {
    recordClick({
      query: i % 2 === 0 ? variantQuery : `${variantQuery}s`,
      siteId: testSiteId,
      position: i,
      source: 'test',
      sessionToken: `variant-session-${i}`,
    });
  }
  const boostFromAccent = getLtrBoosts(`${variantQuery}s`, [testSiteId]);
  const boostFromPlain = getLtrBoosts(variantQuery, [testSiteId]);
  assert.strictEqual(boostFromAccent.get(testSiteId), boostFromPlain.get(testSiteId));
  db.prepare('DELETE FROM search_result_clicks WHERE query = ?').run(toSearchKey(variantQuery));
});

test('cleans up test clicks', () => {
  const result = db
    .prepare('DELETE FROM search_result_clicks WHERE query = ?')
    .run(toSearchKey(testQuery));
  assert.ok(result.changes >= MIN_IMPRESSIONS);
});

run();
