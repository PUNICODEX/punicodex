/**
 * Homograph Defense Tests
 *
 * Validates the canonical trust model: only lexicon-verified transliterations
 * are trusted; confusable/homograph spoofs are flagged as suspicious.
 */

const assert = require('node:assert');
const { prepareTestDb } = require('./helpers/test-db.js');

prepareTestDb('homograph-defense.test.js');

const {
  classifyTerm,
  classifyDomain,
  classifyQueryAndDomain,
  TRUST_TIERS,
  hasMixedScripts,
} = require('../platform/api/homograph-service');
const { searchWeb } = require('../platform/api/crawler-db');
const Database = require('better-sqlite3');
const { getDbPath } = require('../platform/db/db.js');

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
  console.log(`\nHomograph Defense: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

// ── Canonical terms ──

test('ASCII canonical term returns ascii-fallback tier', () => {
  const r = classifyTerm('zeus');
  assert.strictEqual(r.tier, TRUST_TIERS.ASCII_FALLBACK);
  assert.strictEqual(r.canonicalMatch.id, 'zeus');
});

test('Unicode canonical restoration is canonical', () => {
  const r = classifyTerm('Zeús');
  assert.strictEqual(r.tier, TRUST_TIERS.CANONICAL);
  assert.strictEqual(r.canonicalMatch.id, 'zeus');
});

test('Canonical term with different accent convention is canonical', () => {
  const r = classifyTerm('áres');
  assert.strictEqual(r.tier, TRUST_TIERS.CANONICAL);
  assert.strictEqual(r.canonicalMatch.id, 'ares');
});

// ── Styled variants ──

test('Extra diacritics on canonical term maps back to canonical', () => {
  const r = classifyTerm('ápóllōn');
  assert.strictEqual(r.tier, TRUST_TIERS.CANONICAL);
  assert.strictEqual(r.canonicalMatch.id, 'apollon');
});

// ── Homograph / confusable attacks ──

test('Cyrillic "а" spoof of Ares is suspicious', () => {
  const r = classifyTerm('аres'); // U+0430 Cyrillic a + Latin res
  assert.strictEqual(r.tier, TRUST_TIERS.SUSPICIOUS);
  assert.ok(r.canonicalMatch);
  assert.strictEqual(r.canonicalMatch.id, 'ares');
});

test('Full Cyrillic lookalike without canonical collision is suspicious', () => {
  const r = classifyTerm('ареs'); // Cyrillic а р е + Latin s
  assert.strictEqual(r.tier, TRUST_TIERS.SUSPICIOUS);
});

test('Mixed-script detection finds Cyrillic + Latin', () => {
  assert.ok(hasMixedScripts('аres'));
  assert.ok(hasMixedScripts('ареs'));
  assert.ok(!hasMixedScripts('ares'));
  assert.ok(!hasMixedScripts('áres'));
});

test('Mixed-script detection finds unlisted scripts paired with Latin', () => {
  assert.ok(hasMixedScripts('zeusक')); // Latin + Devanagari
  assert.ok(hasMixedScripts('zeus東京')); // Latin + CJK
  assert.ok(!hasMixedScripts('東京')); // CJK only
  assert.ok(!hasMixedScripts('कृष्ण')); // Devanagari only
});

// ── Domain classification ──

test('Owned canonical domain is canonical', () => {
  const r = classifyDomain('apollōn.com');
  assert.strictEqual(r.tier, TRUST_TIERS.CANONICAL);
  assert.strictEqual(r.canonicalMatch.id, 'apollon');
});

test('Punycode canonical domain is canonical', () => {
  const r = classifyDomain('xn--apolln-fgb.com'); // apollōn
  assert.strictEqual(r.tier, TRUST_TIERS.CANONICAL);
  assert.strictEqual(r.canonicalMatch.id, 'apollon');
});

test('Cyrillic homograph domain is suspicious', () => {
  const r = classifyDomain('аres.com'); // Cyrillic a
  assert.strictEqual(r.tier, TRUST_TIERS.SUSPICIOUS);
  assert.strictEqual(r.canonicalMatch.id, 'ares');
});

test('Generic xn-- domain is not hard-blocked as unsafe', () => {
  const r = classifyDomain('xn--bcher-kva.example');
  assert.notStrictEqual(r.tier, TRUST_TIERS.UNSAFE);
});

// ── Unknown / unregistered Unicode ──

test('ASCII-only confusable styling matching a protected brand is suspicious', () => {
  const r = classifyTerm('g00gle');
  assert.strictEqual(r.tier, TRUST_TIERS.SUSPICIOUS);
  assert.strictEqual(r.canonicalMatch.type, 'brand');
});

test('Plain unknown ASCII term is unknown', () => {
  const r = classifyTerm('xyzabc123');
  assert.strictEqual(r.tier, TRUST_TIERS.UNKNOWN);
});

// ── Query + domain combined ──

test('Safe query + safe domain is ascii-fallback overall', () => {
  const r = classifyQueryAndDomain('zeus', 'zeus.com');
  assert.strictEqual(r.overall, TRUST_TIERS.ASCII_FALLBACK);
});

test('Suspicious domain overrides safe query', () => {
  const r = classifyQueryAndDomain('ares', 'аres.com');
  assert.strictEqual(r.overall, TRUST_TIERS.SUSPICIOUS);
});

// ── Database-driven unsafe patterns ──

test('Database unsafe pattern flags matching term as unsafe', () => {
  const db = new Database(getDbPath());
  db.exec(`
    CREATE TABLE IF NOT EXISTS unsafe_patterns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pattern TEXT NOT NULL UNIQUE,
      reason TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  const uniquePattern = `%unsafe-homograph-test-${Date.now()}%`;
  db.prepare('INSERT OR IGNORE INTO unsafe_patterns (pattern, reason) VALUES (?, ?)').run(
    uniquePattern,
    'test pattern'
  );

  const term = `prefix-${uniquePattern}-suffix`;
  const r = classifyTerm(term);
  assert.strictEqual(r.tier, TRUST_TIERS.UNSAFE);
  assert.strictEqual(r.reason, 'blocklist match');

  db.prepare('DELETE FROM unsafe_patterns WHERE pattern = ?').run(uniquePattern);
  db.close();
});

// ── Search result trust filtering ──

test('searchWeb defaults to safe trust tier', async () => {
  const r = await searchWeb('zeus', { limit: 5 });
  assert.ok(r.queryTrust);
  assert.strictEqual(r.queryTrust.tier, TRUST_TIERS.ASCII_FALLBACK);
  for (const result of r.results) {
    assert.notStrictEqual(result.trustTier, TRUST_TIERS.UNSAFE);
    assert.notStrictEqual(result.trustTier, TRUST_TIERS.SUSPICIOUS);
  }
});

test('searchWeb attaches trust tier to results', async () => {
  const r = await searchWeb('zeus', { limit: 5 });
  assert.ok(r.results.length > 0);
  for (const result of r.results) {
    assert.ok(
      ['canonical', 'ascii-fallback', 'styled', 'suspicious', 'unsafe', 'unknown'].includes(
        result.trustTier
      )
    );
    assert.ok(result.trustReason);
  }
});

run();
