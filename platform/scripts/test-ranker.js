const assert = require('node:assert');
const {
  computeScore,
  rankResults,
  normalizeBm25,
  keywordMatchScore,
  tenantQualityScore,
} = require('../api/ranker');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed++;
    console.error(`  ✗ ${name}: ${err.message}`);
  }
}

test('normalizeBm25 inverts magnitude', () => {
  assert.ok(normalizeBm25(-5.0) > normalizeBm25(-10.0));
  assert.ok(normalizeBm25(0) === 1);
});

test('keywordMatchScore detects query tokens', () => {
  const row = { title: 'Zeus Thunder Greek God', domain: 'xn--zes-9na.com' };
  assert.ok(keywordMatchScore(row, ['zeus', 'thunder']) > 0.9);
  assert.ok(keywordMatchScore(row, ['norse']) === 0);
});

test('tenantQualityScore rewards tenant + quality', () => {
  const withTenant = {
    tenant: { name: 'Acme', frontUrl: 'https://acme.com' },
    quality_score: 80,
    authority_score: 60,
  };
  const without = { tenant: null, quality_score: 10, authority_score: 0 };
  assert.ok(tenantQualityScore(withTenant) > tenantQualityScore(without));
});

test('computeScore returns score and breakdown', () => {
  const row = {
    title: 'Zeús.com',
    tier: '1',
    is_flagship: true,
    isFlagship: true,
    bm25_score: -2.5,
    quality_score: 80,
    authority_score: 60,
    punycode: 'xn--zes-9na.com',
    isPunycode: true,
    tenant: { name: 'Temple', frontUrl: 'https://zeus.com' },
  };
  const result = computeScore(row, 'zeus', { variant: 'default' });
  assert.ok(typeof result.score === 'number');
  assert.ok(result.score > 0);
  assert.ok(result.breakdown.bm25 > 0);
  assert.ok(result.breakdown.flagshipBonus > 0);
  assert.strictEqual(result.variant, 'default');
});

test('rankResults sorts descending by score', () => {
  const rows = [
    { title: 'Low', tier: '2', is_flagship: false, bm25_score: -10 },
    { title: 'High', tier: 'dual', is_flagship: true, bm25_score: -1 },
    { title: 'Mid', tier: '1', is_flagship: false, bm25_score: -5 },
  ];
  const ranked = rankResults(rows, 'zeus');
  assert.strictEqual(ranked[0].title, 'High');
  assert.ok(ranked[0].rankScore > ranked[1].rankScore);
  assert.ok(ranked[1].rankScore > ranked[2].rankScore);
});

test('variants produce different scores', () => {
  const row = {
    title: 'Zeús',
    tier: '1',
    is_flagship: true,
    bm25_score: -2,
    quality_score: 90,
    authority_score: 80,
    tenant: { name: 'X' },
  };
  const a = computeScore(row, 'zeus', { variant: 'authority' }).score;
  const b = computeScore(row, 'zeus', { variant: 'commercial' }).score;
  // Not guaranteed, but extremely likely with this fixture.
  assert.notStrictEqual(a, b);
});

console.log(`\nRanker tests: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
