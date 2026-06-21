/**
 * Names Service Unit Tests
 */

const assert = require('node:assert');
const { convert, convertBatch, computePunycode } = require('../platform/api/names-service.js');

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
  console.log(`\nNames Service: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

test('convert finds exact ASCII match', () => {
  const result = convert({ q: 'zeus' });
  assert.strictEqual(result.matches.length, 1);
  assert.strictEqual(result.matches[0].id, 'zeus');
  assert.strictEqual(result.matches[0].confidence, 'exact');
  assert.ok(result.queryTrust);
});

test('convert finds exact Unicode match', () => {
  const result = convert({ q: 'Zeús' });
  assert.ok(result.matches.length > 0);
  assert.ok(result.matches.some((m) => m.id === 'zeus'));
});

test('convert handles missing or empty query gracefully', () => {
  assert.doesNotThrow(() => convert({ q: '' }));
  assert.doesNotThrow(() => convert({ q: '   ' }));
  assert.doesNotThrow(() => convert({}));
});

test('convert generates punycode for arbitrary Unicode input', () => {
  const result = convert({ q: 'münchen' });
  assert.ok(result.generated);
  assert.ok(result.generated.punycode);
  assert.strictEqual(result.generated.punycode.startsWith('xn--'), true);
});

test('convert flags Cyrillic homograph as suspicious', () => {
  const result = convert({ q: 'аres' }); // Cyrillic а
  assert.strictEqual(result.queryTrust.tier, 'suspicious');
  assert.strictEqual(result.queryTrust.canonicalMatch.id, 'ares');
});

test('convertBatch returns one result per query', () => {
  const result = convertBatch({ queries: ['zeus', 'thor', 'not-in-lexicon-xyz'] });
  assert.strictEqual(result.count, 3);
  assert.strictEqual(result.items.length, 3);
  assert.ok(result.items[0].matches.length > 0);
  assert.ok(result.items[2].generated);
});

test('computePunycode returns null for ASCII input', () => {
  assert.strictEqual(computePunycode('zeus'), null);
});

test('computePunycode returns xn-- for Unicode input', () => {
  const pc = computePunycode('apollōn');
  assert.ok(pc);
  assert.ok(pc.startsWith('xn--'));
});

run();
