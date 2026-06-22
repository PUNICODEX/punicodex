/**
 * PÚNYCODEX — Authenticity Service Tests
 *
 * Tests the new verdict-oriented API introduced by the Name Authenticity
 * Checker. The legacy homograph-defense tests continue to cover the old
 * trust-tier wrappers.
 */

const assert = require('node:assert');
const { prepareTestDb } = require('./helpers/test-db.js');

prepareTestDb('authenticity-service.test.js');

const {
  VERDICTS,
  SEVERITIES,
  classifyAuthenticity,
  classifyTerm,
  classifyDomain,
  classifyQueryAndDomain,
  resetCache,
} = require('../platform/api/authenticity-service');

const tests = [];

function test(name, fn) {
  tests.push({ name, fn });
}

async function run() {
  let passed = 0;
  let failed = 0;
  for (const t of tests) {
    try {
      await t.fn();
      passed++;
      console.log(`  ✓ ${t.name}`);
    } catch (e) {
      failed++;
      console.error(`  ✗ ${t.name}`);
      console.error(`    ${e.message}`);
    }
  }
  console.log(`\nAuthenticity Service: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

// ── Verdict constants ──

test('verdict constants are defined', () => {
  assert.ok(VERDICTS.CANONICAL);
  assert.ok(VERDICTS.RECOGNIZED_VARIANT);
  assert.ok(VERDICTS.HOMOGRAPH_SPOOF);
  assert.ok(VERDICTS.MIXED_SCRIPT_SPOOF);
  assert.ok(VERDICTS.UNSAFE);
  assert.ok(VERDICTS.UNKNOWN);
});

// ── Canonical inputs ──

test('ASCII canonical name returns canonical verdict', () => {
  const r = classifyAuthenticity('zeus');
  assert.strictEqual(r.verdict, VERDICTS.CANONICAL);
  assert.strictEqual(r.severity, SEVERITIES.NONE);
  assert.strictEqual(r.canonicalMatch.id, 'zeus');
});

test('Unicode canonical restoration returns canonical verdict', () => {
  const r = classifyAuthenticity('Zeús');
  assert.strictEqual(r.verdict, VERDICTS.CANONICAL);
  assert.strictEqual(r.canonicalMatch.id, 'zeus');
});

// ── Recognized variants ──

test('macron-only variant is recognized', () => {
  const r = classifyAuthenticity('Apollōn');
  assert.strictEqual(r.verdict, VERDICTS.RECOGNIZED_VARIANT);
  assert.strictEqual(r.canonicalMatch.id, 'apollon');
  assert.strictEqual(r.canonicalMatch.variantType, 'macron-only');
});

test('owned variant is canonical', () => {
  const r = classifyAuthenticity('Apóllōn');
  assert.strictEqual(r.verdict, VERDICTS.CANONICAL);
});

// ── Spoof detection ──

test('Cyrillic homograph spoof is detected', () => {
  const r = classifyAuthenticity('аres'); // Cyrillic a
  assert.strictEqual(r.verdict, VERDICTS.HOMOGRAPH_SPOOF);
  assert.strictEqual(r.severity, SEVERITIES.HIGH);
  assert.strictEqual(r.canonicalMatch.id, 'ares');
});

test('mixed-script input with no canonical target is suspicious', () => {
  const r = classifyAuthenticity('ареs');
  assert.strictEqual(r.verdict, VERDICTS.MIXED_SCRIPT_SPOOF);
  assert.strictEqual(r.severity, SEVERITIES.HIGH);
});

// ── Styled / unknown ──

test('pure ASCII confusable without canonical target is unknown', () => {
  const r = classifyAuthenticity('g00gle');
  assert.strictEqual(r.verdict, VERDICTS.UNKNOWN);
});

test('plain unknown ASCII is unknown', () => {
  const r = classifyAuthenticity('xyzabc123');
  assert.strictEqual(r.verdict, VERDICTS.UNKNOWN);
});

// ── Analysis evidence ──

test('analysis exposes scripts and confusables', () => {
  const r = classifyAuthenticity('аres');
  assert.ok(r.analysis.mixedScripts);
  assert.ok(r.analysis.confusables.length > 0);
  assert.ok(r.analysis.visualDeviation > 0);
});

test('visual deviation is zero for pure ASCII canonical', () => {
  const r = classifyAuthenticity('zeus');
  assert.strictEqual(r.analysis.visualDeviation, 0);
});

// ── Domain classification ──

test('Cyrillic homograph domain is detected', () => {
  const r = classifyDomain('аres.com');
  assert.strictEqual(r.tier, 'suspicious');
  assert.strictEqual(r.canonicalMatch.id, 'ares');
});

test('canonical punycode domain is canonical', () => {
  const r = classifyDomain('xn--apolln-fgb.com'); // apollōn
  assert.strictEqual(r.tier, 'canonical');
  assert.strictEqual(r.canonicalMatch.id, 'apollon');
});

// ── Query + domain combined ──

test('safe query + canonical domain is canonical overall', () => {
  const r = classifyQueryAndDomain('zeus', 'zeus.com');
  assert.strictEqual(r.overall, VERDICTS.CANONICAL);
});

test('suspicious domain overrides safe query', () => {
  const r = classifyQueryAndDomain('ares', 'аres.com');
  assert.strictEqual(r.overall, VERDICTS.HOMOGRAPH_SPOOF);
});

// ── Backward compatibility ──

test('classifyTerm still exposes legacy tier field', () => {
  const r = classifyTerm('zeus');
  assert.strictEqual(r.tier, 'canonical');
  assert.ok(r.canonicalMatch);
});

resetCache();
run();
