/**
 * Foundation tests for the shared test harness.
 */

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { prepareTestDb, getTestDbPath } = require('./helpers/test-db.js');
const { invoke, authHeader, adminHeader, jsonBody } = require('./helpers/http.js');
const {
  assertV1Envelope,
  assertV2Envelope,
  assertPagination,
  assertError,
} = require('./helpers/contract.js');
const {
  makePartner,
  makeApiKey,
  makeIndexedSite,
  makeTenantAd,
} = require('./helpers/factories.js');

const suiteName = 'foundations.test.js';

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

async function testAsync(name, fn) {
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

function run() {
  console.log('\n▸ Foundation Tests\n');

  test('prepareTestDb creates an isolated temp DB', () => {
    const dbPath = prepareTestDb(suiteName);
    assert.ok(fs.existsSync(dbPath));
    assert.strictEqual(process.env.PUNYCODEX_TEST_DB_PATH, dbPath);
    assert.notStrictEqual(dbPath, path.join(__dirname, '..', 'platform', 'db', 'punycodex.db'));
  });

  test('temp DB is writable without touching golden DB', () => {
    const dbPath = getTestDbPath(suiteName);
    const Database = require('better-sqlite3');
    const db = new Database(dbPath);
    db.prepare(
      "INSERT INTO search_queries (query, result_count) VALUES ('foundation-test', 42)"
    ).run();
    const row = db
      .prepare("SELECT result_count FROM search_queries WHERE query = 'foundation-test'")
      .get();
    assert.strictEqual(row.result_count, 42);
    db.close();
  });

  test('invoke helper returns status and body', async () => {
    const handler = (_req, res) => res.status(201).json({ ok: true });
    const result = await invoke(handler, 'POST', '/api/v2/test', jsonBody({ foo: 'bar' }));
    assert.strictEqual(result.status, 201);
    assert.strictEqual(result.body.ok, true);
  });

  test('authHeader builds Bearer header', () => {
    const h = authHeader('pk_test');
    assert.strictEqual(h.authorization, 'Bearer pk_test');
  });

  test('adminHeader builds x-admin-token header', () => {
    const h = adminHeader('tok');
    assert.strictEqual(h['x-admin-token'], 'tok');
  });

  test('assertV2Envelope validates v2 success envelope', () => {
    assertV2Envelope({
      success: true,
      data: {},
      meta: { requestId: 'r1', version: 'v2', timestamp: new Date().toISOString() },
    });
  });

  test('assertV1Envelope validates v1 success envelope', () => {
    assertV1Envelope({
      success: true,
      data: {},
      meta: { requestId: 'r1', version: 'v1', timestamp: new Date().toISOString() },
    });
  });

  test('assertPagination validates pagination fields', () => {
    assertPagination({
      success: true,
      data: [],
      meta: {
        requestId: 'r1',
        version: 'v2',
        timestamp: new Date().toISOString(),
        pagination: { total: 5, limit: 10, offset: 0 },
      },
      links: { self: '/api/v2/test' },
    });
  });

  test('assertError validates error envelope', () => {
    assertError(
      {
        success: false,
        error: { code: 'TEST_ERROR', message: 'bad' },
        meta: { requestId: 'r1', version: 'v2', timestamp: new Date().toISOString() },
      },
      'TEST_ERROR'
    );
  });

  testAsync('makePartner creates a usable partner key', async () => {
    const partner = makePartner({ name: 'Foundation Partner' });
    assert.ok(partner.id);
    assert.ok(partner.apiKey.startsWith('pcd_'));
    const partners = require('../platform/api/partners.js');
    const validated = partners.validatePartnerKey(partner.apiKey);
    assert.ok(validated);
    assert.strictEqual(validated.name, 'Foundation Partner');
    partner.cleanup();
  });

  testAsync('makeApiKey creates a usable API key', async () => {
    const key = await makeApiKey({ name: 'Foundation Key', scopes: ['names:read'] });
    assert.ok(key.id);
    assert.ok(key.plaintext.startsWith('pk_punycodex_'));
    const Database = require('better-sqlite3');
    const db = new Database(getTestDbPath(suiteName));
    const row = db.prepare('SELECT tier, scopes FROM api_keys WHERE id = ?').get(key.id);
    assert.ok(row);
    assert.strictEqual(row.tier, 'free');
    assert.strictEqual(row.scopes, JSON.stringify(['names:read']));
    db.close();
    key.cleanup();
  });

  test('makeIndexedSite creates an active site', () => {
    const site = makeIndexedSite({ title: 'Foundation Site', status: 'active' });
    assert.ok(site.id);
    assert.strictEqual(site.title, 'Foundation Site');
    site.cleanup();
  });

  test('makeTenantAd creates an ad for zeus', () => {
    const ad = makeTenantAd({ companyName: 'Foundation Ads', entryId: 'zeus' });
    assert.ok(ad.id);
    assert.strictEqual(ad.entryId, 'zeus');
    assert.strictEqual(ad.companyName, 'Foundation Ads');
    ad.cleanup();
  });

  console.log(`\nFoundations: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

run();
