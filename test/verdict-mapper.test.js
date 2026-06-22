/**
 * PÚNYCODEX — Verdict Mapper Tests
 */

const assert = require('node:assert');
const { mapVerdict } = require('../platform/api/verdict-mapper');
const { VERDICTS, SEVERITIES } = require('../platform/api/authenticity-verdicts');

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
  console.log(`\nVerdict Mapper: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

function baseFeatures(overrides = {}) {
  return {
    confusableCount: 0,
    confusableDensity: 0,
    mixedScriptFlag: false,
    invisibleCharFlag: false,
    bidiOverrideFlag: false,
    skeletonSimilarityMax: 0,
    identityPriority: 0,
    hasBlockedPatternMatch: false,
    hasCanonicalExact: false,
    variantRecognition: false,
    ...overrides,
  };
}

test('blocked pattern maps to lookalike-domain high', () => {
  const r = mapVerdict(0.5, baseFeatures({ hasBlockedPatternMatch: true }), null, {
    name: 'TestBrand',
  });
  assert.strictEqual(r.verdict, VERDICTS.LOOKALIKE_DOMAIN);
  assert.strictEqual(r.severity, SEVERITIES.HIGH);
});

test('canonical exact maps to canonical none', () => {
  const r = mapVerdict(0.02, baseFeatures({ hasCanonicalExact: true }), null, null);
  assert.strictEqual(r.verdict, VERDICTS.CANONICAL);
  assert.strictEqual(r.severity, SEVERITIES.NONE);
});

test('recognized variant maps to recognized-variant low', () => {
  const r = mapVerdict(0.04, baseFeatures({ variantRecognition: true }), null, {
    variantType: 'macron-only',
  });
  assert.strictEqual(r.verdict, VERDICTS.RECOGNIZED_VARIANT);
  assert.strictEqual(r.severity, SEVERITIES.LOW);
});

test('brand identity without deception maps to styled low', () => {
  const identityMatch = { type: 'brand', name: 'Apple' };
  const r = mapVerdict(0.02, baseFeatures(), identityMatch, null, { input: 'Apple' });
  assert.strictEqual(r.verdict, VERDICTS.STYLED);
  assert.strictEqual(r.severity, SEVERITIES.LOW);
});

test('lexicon identity without deception maps to recognized-variant low', () => {
  const identityMatch = { type: 'lexicon', name: 'Hermês' };
  const r = mapVerdict(0.02, baseFeatures(), identityMatch, null, { input: 'Hermês' });
  assert.strictEqual(r.verdict, VERDICTS.RECOGNIZED_VARIANT);
  assert.strictEqual(r.severity, SEVERITIES.LOW);
});

test('high confusable similarity with high priority maps to homograph-spoof critical', () => {
  const features = baseFeatures({
    confusableCount: 1,
    confusableDensity: 0.25,
    skeletonSimilarityMax: 1,
    identityPriority: 100,
  });
  const r = mapVerdict(0.97, features, null, null);
  assert.strictEqual(r.verdict, VERDICTS.HOMOGRAPH_SPOOF);
  assert.strictEqual(r.severity, SEVERITIES.CRITICAL);
});

test('high confusable similarity with low priority maps to homograph-spoof high', () => {
  const features = baseFeatures({
    confusableCount: 1,
    confusableDensity: 0.25,
    skeletonSimilarityMax: 1,
    identityPriority: 0,
  });
  const r = mapVerdict(0.97, features, null, null);
  assert.strictEqual(r.verdict, VERDICTS.HOMOGRAPH_SPOOF);
  assert.strictEqual(r.severity, SEVERITIES.HIGH);
});

test('mixed script with weak target maps to mixed-script-spoof high', () => {
  const features = baseFeatures({
    mixedScriptFlag: true,
    confusableCount: 3,
    confusableDensity: 0.75,
    skeletonSimilarityMax: 0.75,
  });
  const r = mapVerdict(0.94, features, null, null);
  assert.strictEqual(r.verdict, VERDICTS.MIXED_SCRIPT_SPOOF);
  assert.strictEqual(r.severity, SEVERITIES.HIGH);
});

test('probability >= 0.8 in domain mode maps to lookalike-domain high', () => {
  const features = baseFeatures({ confusableCount: 1, skeletonSimilarityMax: 0.9 });
  const r = mapVerdict(0.85, features, null, null, { isDomain: true, input: 'evil-apple.com' });
  assert.strictEqual(r.verdict, VERDICTS.LOOKALIKE_DOMAIN);
  assert.strictEqual(r.severity, SEVERITIES.HIGH);
});

test('probability >= 0.6 maps to transliteration-uncertain medium', () => {
  const r = mapVerdict(0.65, baseFeatures(), null, null);
  assert.strictEqual(r.verdict, VERDICTS.TRANSLITERATION_UNCERTAIN);
  assert.strictEqual(r.severity, SEVERITIES.MEDIUM);
});

test('non-ASCII styling with no target maps to styled low', () => {
  const r = mapVerdict(0.1, baseFeatures(), null, null, { input: '𝓏𝓮𝓊𝓈' });
  assert.strictEqual(r.verdict, VERDICTS.STYLED);
  assert.strictEqual(r.severity, SEVERITIES.LOW);
});

test('plain unknown ASCII maps to unknown none', () => {
  const r = mapVerdict(0.02, baseFeatures(), null, null, { input: 'qwertyuiop' });
  assert.strictEqual(r.verdict, VERDICTS.UNKNOWN);
  assert.strictEqual(r.severity, SEVERITIES.NONE);
});

run();
