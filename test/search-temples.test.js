/**
 * Temple-content search tests.
 *
 * Covers the corpus migration + seed (platform/db/migrate-temple-content.js,
 * seed-temple-content.js) and the GET /api/search/temples/ endpoint. Runs
 * against a 3-temple fixture seeded into an isolated copy of the database;
 * the full 271-temple seed is exercised by npm run db-init, not here.
 */

const assert = require('node:assert');
const http = require('node:http');
const Database = require('better-sqlite3');
const { prepareTestDb } = require('./helpers/test-db.js');

const suiteName = 'search-temples.test.js';
const testDbPath = prepareTestDb(suiteName);

const { migrate } = require('../platform/db/migrate-temple-content.js');
const { seedTempleContent } = require('../platform/db/seed-temple-content.js');

const FIXTURE_TEMPLES = ['athena', 'zeus', 'thor'];

// Migrate + seed the fixture before the handler opens its shared connection.
const setupDb = new Database(testDbPath);
migrate(setupDb);
const seeded = seedTempleContent({ db: setupDb, temples: FIXTURE_TEMPLES });
setupDb.close();

const handler = require('../api/search/temples/index.js');

let passed = 0;
let failed = 0;
let ipCounter = 0;

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

function invoke(query) {
  return new Promise((resolve, reject) => {
    const req = new http.IncomingMessage(null);
    req.method = 'GET';
    req.url = '/api/search/temples/';
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

const SECTION_LABELS = {
  blog: 'Temple Blog',
  lore: 'Temple Lore',
  patterns: 'Industry Patterns',
};

async function run() {
  console.log('\n▸ Temple Content Search Tests\n');

  await test('migration creates the corpus tables', () => {
    const db = new Database(testDbPath, { readonly: true });
    const names = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE name IN ('temple_content', 'temple_content_fts')"
      )
      .all()
      .map((r) => r.name);
    db.close();
    assert.ok(names.includes('temple_content'), 'temple_content missing');
    assert.ok(names.includes('temple_content_fts'), 'temple_content_fts missing');
  });

  await test('seed indexes lore, blog, and patterns rows per fixture temple', () => {
    assert.ok(seeded.rows > 0, 'seed produced no rows');
    const db = new Database(testDbPath, { readonly: true });
    for (const templeId of FIXTURE_TEMPLES) {
      const sections = {};
      for (const r of db
        .prepare(
          'SELECT section, COUNT(*) AS c FROM temple_content WHERE temple_id = ? GROUP BY section'
        )
        .all(templeId)) {
        sections[r.section] = r.c;
      }
      assert.ok(sections.lore > 0, `${templeId}: no lore rows`);
      assert.strictEqual(sections.blog, 1, `${templeId}: expected exactly 1 blog row`);
      assert.strictEqual(sections.patterns, 1, `${templeId}: expected exactly 1 patterns row`);
      const urls = db
        .prepare('SELECT DISTINCT url FROM temple_content WHERE temple_id = ?')
        .all(templeId)
        .map((r) => r.url);
      assert.ok(urls.includes(`/sites/${templeId}/lore/`), `${templeId}: lore url wrong`);
      assert.ok(urls.includes(`/sites/${templeId}/blog/`), `${templeId}: blog url wrong`);
      assert.ok(urls.includes(`/sites/${templeId}/patterns/`), `${templeId}: patterns url wrong`);
    }
    // FTS index is in sync via triggers.
    const content = db.prepare('SELECT COUNT(*) AS c FROM temple_content').get().c;
    const fts = db.prepare('SELECT COUNT(*) AS c FROM temple_content_fts').get().c;
    db.close();
    assert.strictEqual(fts, content, 'FTS index out of sync with corpus');
  });

  await test('re-seed is idempotent (same row count, no duplicates)', () => {
    const db = new Database(testDbPath);
    const before = db.prepare('SELECT COUNT(*) AS c FROM temple_content').get().c;
    const again = seedTempleContent({ db, temples: FIXTURE_TEMPLES });
    const after = db.prepare('SELECT COUNT(*) AS c FROM temple_content').get().c;
    const fts = db.prepare('SELECT COUNT(*) AS c FROM temple_content_fts').get().c;
    db.close();
    assert.strictEqual(again.rows, seeded.rows);
    assert.strictEqual(after, before, 're-seed duplicated rows');
    assert.strictEqual(fts, after, 'FTS index out of sync after re-seed');
  });

  await test('endpoint rejects empty/whitespace queries with 400', async () => {
    for (const query of [{}, { q: '' }, { q: '   ' }]) {
      const res = await invoke(query);
      assert.strictEqual(res.status, 400, JSON.stringify(query));
      assert.strictEqual(res.body.success, false);
    }
  });

  await test('endpoint rejects queries over 200 characters with 400', async () => {
    const res = await invoke({ q: 'a'.repeat(201) });
    assert.strictEqual(res.status, 400);
  });

  await test('phrase query returns fixture hits with <mark> snippets and correct urls', async () => {
    const res = await invoke({ q: 'wisdom' });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.query, 'wisdom');
    assert.ok(res.body.total > 0, 'expected at least one hit');
    assert.ok(res.body.results.length > 0);
    assert.ok(
      res.body.results.some((r) => r.templeId === 'athena'),
      'expected an athena hit for "wisdom"'
    );
    assert.ok(
      res.body.results.some((r) => r.snippet.includes('<mark>')),
      'expected a <mark> highlight in at least one snippet'
    );
    for (const r of res.body.results) {
      assert.ok(
        FIXTURE_TEMPLES.includes(r.templeId),
        `unexpected temple ${r.templeId} (fixture leak)`
      );
      assert.match(r.url, new RegExp(`^/sites/${r.templeId}/(lore|blog|patterns)/$`));
      assert.strictEqual(
        r.sectionLabel,
        SECTION_LABELS[r.section],
        `sectionLabel for ${r.section}`
      );
      assert.ok(r.unicode, 'unicode missing');
      assert.ok(r.pantheon, 'pantheon missing');
    }
    // total is the full grouped count, independent of limit.
    assert.ok(res.body.total >= res.body.results.length);
  });

  await test('results group to the best hit per (temple, section)', async () => {
    const res = await invoke({ q: 'wisdom', limit: 20 });
    assert.strictEqual(res.status, 200);
    const seen = new Set();
    for (const r of res.body.results) {
      const key = `${r.templeId}:${r.section}`;
      assert.ok(!seen.has(key), `duplicate hit for ${key}`);
      seen.add(key);
    }
  });

  await test('limit clamps to 1..20 with default 8', async () => {
    const one = await invoke({ q: 'the', limit: 1 });
    assert.strictEqual(one.body.results.length, 1);
    assert.ok(one.body.total >= 1);
    const capped = await invoke({ q: 'the', limit: 99 });
    assert.ok(capped.body.results.length <= 20, 'limit must clamp to 20');
  });

  await test('queryTrust is present for a confusable (Greek-lookalike) query', async () => {
    const res = await invoke({ q: 'аres' }); // Cyrillic а + latin "res"
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.queryTrust, 'queryTrust missing');
    assert.strictEqual(res.body.queryTrust.verdict, 'homograph-spoof');
    assert.strictEqual(res.body.queryTrust.severity, 'high');
    assert.ok(res.body.queryTrust.label);
  });

  console.log(`\nTemple Content Search: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
