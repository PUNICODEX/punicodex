/**
 * PÚNYCODEX — STIX 2.1 Export Tests (Phase 18)
 */

const assert = require('node:assert');
const Database = require('better-sqlite3');
const { prepareTestDb, cleanupTestDb } = require('./helpers/test-db.js');

const testDbPath = prepareTestDb(__filename);
process.env.PUNYCODEX_TEST_DB_PATH = testDbPath;

const db = new Database(testDbPath);
db.pragma('foreign_keys = OFF');

const stixExport = require('../platform/api/stix-export.js');

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

async function runSuite() {
  console.log('\n▸ STIX Export Tests\n');
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
  console.log(`\nSTIX Export: ${passed} passed, ${failed} failed`);
  db.close();
  cleanupTestDb(__filename);
  process.exit(failed > 0 ? 1 : 0);
}

function seedSpoof(input, overrides = {}) {
  db.prepare(
    `INSERT OR REPLACE INTO discovered_spoofs
     (input, input_type, punycode, verdict, severity, discovery_source, confidence, first_seen, last_seen, report_count)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    input,
    overrides.inputType || 'domain',
    overrides.punycode || null,
    overrides.verdict || 'homograph-spoof',
    overrides.severity || 'critical',
    overrides.source || 'test',
    overrides.confidence ?? 0.95,
    overrides.firstSeen || new Date().toISOString(),
    overrides.lastSeen || new Date().toISOString(),
    overrides.reportCount ?? 1
  );
}

function seedBlocked(input, overrides = {}) {
  db.prepare(
    `INSERT OR REPLACE INTO blocked_inputs (input, type, blocked_at, reason)
     VALUES (?, ?, ?, ?)`
  ).run(
    input,
    overrides.type || 'domain',
    overrides.blockedAt || new Date().toISOString(),
    overrides.reason || 'homograph'
  );
}

function seedRelationship(input, overrides = {}) {
  db.prepare(
    `INSERT INTO spoof_relationships (input, type, target_identity_id, discovered_at, source, reputation_score, status)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(
    input,
    overrides.type || 'domain',
    overrides.targetIdentityId || 'apple-brand',
    overrides.discoveredAt || new Date().toISOString(),
    overrides.source || 'test',
    overrides.reputationScore ?? 0.9,
    overrides.status || 'open'
  );
}

test('exportThreatFeed returns a valid STIX 2.1 bundle', () => {
  db.prepare('DELETE FROM discovered_spoofs').run();
  seedSpoof('аpple.com', { punycode: 'xn--pple-wmc.com' });
  const bundle = stixExport.exportThreatFeed({ db });
  assert.strictEqual(bundle.type, 'bundle');
  assert.strictEqual(bundle.spec_version, '2.1');
  assert.ok(bundle.objects.length > 0);
  const indicators = bundle.objects.filter((o) => o.type === 'indicator');
  assert.strictEqual(indicators.length, 1);
  assert.ok(indicators[0].pattern.includes('xn--pple-wmc.com'));
});

test('indicator carries verdict labels and confidence', () => {
  db.prepare('DELETE FROM discovered_spoofs').run();
  seedSpoof('paypa1.com', { verdict: 'lookalike-domain', severity: 'high', confidence: 0.88 });
  const bundle = stixExport.exportThreatFeed({ db });
  const indicator = bundle.objects.find((o) => o.type === 'indicator');
  assert.ok(indicator.labels.includes('lookalike-domain'));
  assert.ok(indicator.labels.includes('high'));
  assert.strictEqual(indicator.confidence, 80);
});

test('exportBlockedInputs returns blocked-input indicators', () => {
  db.prepare('DELETE FROM blocked_inputs').run();
  seedBlocked('evil-bank.example', { reason: 'confirmed-phish' });
  const bundle = stixExport.exportBlockedInputs({ db });
  const indicator = bundle.objects.find((o) => o.type === 'indicator');
  assert.ok(indicator);
  assert.ok(indicator.description.includes('confirmed-phish'));
});

test('exportRelationships includes target identity and relationship objects', () => {
  db.prepare('DELETE FROM spoof_relationships').run();
  seedRelationship('xn--pple-wmc.com', { targetIdentityId: 'apple-brand' });
  const bundle = stixExport.exportRelationships({ db });
  const indicator = bundle.objects.find((o) => o.type === 'indicator');
  const relationship = bundle.objects.find((o) => o.type === 'relationship');
  assert.ok(indicator);
  assert.ok(relationship);
  assert.strictEqual(relationship.relationship_type, 'targets');
});

test('exportAll deduplicates identity object', () => {
  db.prepare('DELETE FROM discovered_spoofs').run();
  db.prepare('DELETE FROM blocked_inputs').run();
  db.prepare('DELETE FROM spoof_relationships').run();
  seedSpoof('аpple.com');
  seedBlocked('аpple.com');
  seedRelationship('xn--pple-wmc.com');
  const bundle = stixExport.exportAll({ db });
  const identities = bundle.objects.filter((o) => o.type === 'identity');
  // DEFAULT_IDENTITY is deduplicated; the target identity from relationships remains.
  assert.strictEqual(identities.length, 2);
  assert.ok(bundle.objects.some((o) => o.type === 'indicator'));
});

test('empty feed still returns a bundle with producer identity', () => {
  db.prepare('DELETE FROM discovered_spoofs').run();
  const bundle = stixExport.exportThreatFeed({ db });
  assert.strictEqual(bundle.type, 'bundle');
  assert.ok(bundle.objects.some((o) => o.type === 'identity'));
});

runSuite();
