/**
 * PuniCodex — Partner Onboarding Tests (Phase 19)
 */

const assert = require('node:assert');
const crypto = require('node:crypto');
const Database = require('better-sqlite3');
const { prepareTestDb, cleanupTestDb } = require('./helpers/test-db.js');

const testDbPath = prepareTestDb(__filename);
process.env.PUNICODEX_TEST_DB_PATH = testDbPath;

const db = new Database(testDbPath);
const partners = require('../platform/api/partners.js');

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

async function runSuite() {
  console.log('\n▸ Partner Onboarding Tests\n');
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
      console.error(`    ${err.message}`);
    }
  }
  console.log(`\nPartner Onboarding: ${passed} passed, ${failed} failed`);
  db.close();
  cleanupTestDb(__filename);
  process.exit(failed > 0 ? 1 : 0);
}

function unique(prefix) {
  return `${prefix}-${crypto.randomBytes(4).toString('hex')}`;
}

test('registerPartner creates a key and tiered record', () => {
  const result = partners.registerPartner({
    name: unique('Browser Vendor'),
    email: 'partner@example.com',
    tier: 'browser-vendor',
    scopes: ['read', 'threat_feed'],
    rateLimit: 100000,
  });
  assert.ok(result.id);
  assert.ok(result.apiKey.startsWith('pcd_'));

  const validated = partners.validatePartnerKey(result.apiKey);
  assert.ok(validated);
  assert.strictEqual(validated.tier, 'browser-vendor');
  assert.deepStrictEqual(validated.scopes, ['read', 'threat_feed']);
  assert.strictEqual(validated.rateLimit, 100000);
});

test('partner tiers are persisted distinctly', () => {
  const tiers = ['browser-vendor', 'registrar', 'isp', 'enterprise', 'ngo'];
  const ids = [];
  for (const tier of tiers) {
    const result = partners.registerPartner({
      name: unique(tier),
      tier,
      scopes: ['read'],
      rateLimit: 1000,
    });
    ids.push(result.id);
  }

  const list = partners.listPartners();
  for (const id of ids) {
    assert.ok(
      list.some((p) => p.id === id),
      `partner ${id} not listed`
    );
  }
});

test('inactive or invalid keys are rejected', () => {
  const result = partners.registerPartner({ name: unique('Short-lived') });
  assert.ok(partners.validatePartnerKey(result.apiKey));
  assert.strictEqual(partners.validatePartnerKey('pcd_invalid'), null);
});

test('partner can submit and query records', () => {
  const partner = partners.registerPartner({ name: unique('Feed Partner') });
  const validated = partners.validatePartnerKey(partner.apiKey);
  const record = {
    recordId: unique('spoof'),
    domain: 'xn--pple-wmc.com',
    verdict: 'homograph-spoof',
    severity: 'critical',
  };
  const submitted = partners.submitRecord(validated.id, record);
  assert.strictEqual(submitted.recordId, record.recordId);

  const queried = partners.queryRecords({ q: record.recordId });
  assert.ok(queried.records.some((r) => r.recordId === record.recordId));
});

runSuite();
