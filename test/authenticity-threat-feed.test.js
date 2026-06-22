/**
 * Authenticity Threat Feed Tests
 *
 * Validates the persistent backend for spoof discovery, user reports, and
 * reviewer decisions.
 */

const assert = require('node:assert');
const { prepareTestDb } = require('./helpers/test-db.js');

prepareTestDb('authenticity-threat-feed.test.js');

const {
  migrateThreatFeed,
  recordDiscoveredSpoof,
  recordSpoofReport,
  recordAuthenticityLog,
  listUnreviewedSpoofs,
  reviewSpoof,
  getSpoofByInput,
} = require('../platform/api/authenticity-threat-feed.js');

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
  console.log(`\nAuthenticity Threat Feed: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

test('migrateThreatFeed is idempotent', () => {
  migrateThreatFeed();
  migrateThreatFeed();
  migrateThreatFeed();
});

test('recordDiscoveredSpoof inserts a new spoof', () => {
  const row = recordDiscoveredSpoof({
    input: 'pаypal.com',
    inputType: 'domain',
    punycode: 'xn--pypal-4ve.com',
    verdict: 'homograph-spoof',
    severity: 'high',
    canonicalEntryId: 'paypal',
    discoverySource: 'crawler',
    confidence: 0.92,
  });
  assert.strictEqual(row.input, 'pаypal.com');
  assert.strictEqual(row.input_type, 'domain');
  assert.strictEqual(row.verdict, 'homograph-spoof');
  assert.strictEqual(row.report_count, 0);
  assert.strictEqual(row.canonical_entry_id, 'paypal');
  assert.ok(row.id > 0);
});

test('recordDiscoveredSpoof upserts and increments report_count', () => {
  const first = recordDiscoveredSpoof({
    input: 'zeus-spoof',
    inputType: 'name',
    verdict: 'homograph-spoof',
    severity: 'high',
    canonicalEntryId: 'zeus',
    discoverySource: 'api',
    confidence: 0.8,
  });
  assert.strictEqual(first.report_count, 0);

  const second = recordDiscoveredSpoof({
    input: 'zeus-spoof',
    inputType: 'name',
    verdict: 'mixed-script-spoof',
    severity: 'high',
    canonicalEntryId: 'zeus',
    discoverySource: 'extension',
    confidence: 0.85,
  });
  assert.strictEqual(second.id, first.id);
  assert.strictEqual(second.report_count, 1);
  assert.strictEqual(second.verdict, 'mixed-script-spoof');
  assert.strictEqual(second.discovery_source, 'extension');
  assert.ok(new Date(second.last_seen) >= new Date(first.last_seen));
});

test('recordSpoofReport inserts a report and increments count', () => {
  const spoof = recordDiscoveredSpoof({
    input: 'reported-name',
    inputType: 'name',
    verdict: 'lookalike-domain',
    severity: 'medium',
    canonicalEntryId: 'ares',
    discoverySource: 'api',
    confidence: 0.7,
  });
  assert.strictEqual(spoof.report_count, 0);

  const updated = recordSpoofReport({
    discoveredSpoofId: spoof.id,
    reporterToken: 'user-123',
    notes: 'Looks like a spoof',
  });
  assert.strictEqual(updated.report_count, 1);
});

test('listUnreviewedSpoofs returns unreviewed rows ordered by confidence', () => {
  recordDiscoveredSpoof({
    input: 'low-confidence',
    inputType: 'name',
    verdict: 'homograph-spoof',
    severity: 'medium',
    canonicalEntryId: 'athena',
    discoverySource: 'crawler',
    confidence: 0.5,
  });
  recordDiscoveredSpoof({
    input: 'high-confidence',
    inputType: 'name',
    verdict: 'homograph-spoof',
    severity: 'high',
    canonicalEntryId: 'athena',
    discoverySource: 'crawler',
    confidence: 0.99,
  });

  const rows = listUnreviewedSpoofs({ limit: 100 });
  assert.ok(rows.length >= 2);
  const relevant = rows.filter((r) => ['high-confidence', 'low-confidence'].includes(r.input));
  assert.strictEqual(relevant.length, 2);
  assert.strictEqual(relevant[0].input, 'high-confidence');
  assert.strictEqual(relevant[1].input, 'low-confidence');
});

test('listUnreviewedSpoofs supports filters', () => {
  recordDiscoveredSpoof({
    input: 'filtered-domain',
    inputType: 'domain',
    verdict: 'mixed-script-spoof',
    severity: 'high',
    canonicalEntryId: 'hermes',
    discoverySource: 'manual',
    confidence: 0.88,
  });

  const byVerdict = listUnreviewedSpoofs({ verdict: 'mixed-script-spoof', limit: 10 });
  assert.ok(byVerdict.some((r) => r.input === 'filtered-domain'));

  const bySeverity = listUnreviewedSpoofs({ severity: 'high', limit: 10 });
  assert.ok(bySeverity.some((r) => r.input === 'filtered-domain'));

  const bySource = listUnreviewedSpoofs({ source: 'manual', limit: 10 });
  assert.ok(bySource.some((r) => r.input === 'filtered-domain'));

  const noMatch = listUnreviewedSpoofs({ source: 'nonexistent', limit: 10 });
  assert.strictEqual(noMatch.length, 0);
});

test('reviewSpoof sets reviewer decision and reviewed_at', () => {
  const spoof = recordDiscoveredSpoof({
    input: 'review-candidate',
    inputType: 'url',
    verdict: 'lookalike-domain',
    severity: 'high',
    canonicalEntryId: 'hades',
    discoverySource: 'api',
    confidence: 0.9,
  });
  assert.strictEqual(spoof.reviewer_decision, null);

  const reviewed = reviewSpoof(spoof.id, 'confirmed', 'reviewer-1');
  assert.strictEqual(reviewed.reviewer_decision, 'confirmed');
  assert.ok(reviewed.reviewed_at);
});

test('recordAuthenticityLog inserts a log row', () => {
  const row = recordAuthenticityLog({
    input: 'log-input',
    inputType: 'name',
    verdict: 'canonical',
    severity: 'none',
    canonicalEntryId: 'zeus',
    clientHash: 'abc123',
  });
  assert.strictEqual(row.input, 'log-input');
  assert.strictEqual(row.input_type, 'name');
  assert.strictEqual(row.verdict, 'canonical');
  assert.strictEqual(row.client_hash, 'abc123');
  assert.ok(row.id > 0);
});

test('getSpoofByInput returns matching row or null', () => {
  recordDiscoveredSpoof({
    input: 'find-me',
    inputType: 'name',
    verdict: 'homograph-spoof',
    severity: 'high',
    canonicalEntryId: 'zeus',
    discoverySource: 'api',
    confidence: 0.75,
  });

  const found = getSpoofByInput('find-me', 'name');
  assert.ok(found);
  assert.strictEqual(found.input, 'find-me');

  const notFound = getSpoofByInput('missing', 'name');
  assert.strictEqual(notFound, null);
});

run();
