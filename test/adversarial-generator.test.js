/**
 * PuniCodex — Adversarial Generator Tests
 */

const assert = require('node:assert');
const {
  generateAttacks,
  getBuiltInTargets,
  isDeceptiveVerdict,
  FAMILY_GENERATORS,
} = require('../scripts/adversarial-generator');

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
  console.log(`\nAdversarial Generator: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

const sampleTargets = [
  { id: 'apple', ascii: 'apple', unicode: 'Apple' },
  { id: 'zeus', ascii: 'zeus', unicode: 'Zeús' },
];

test('generateAttacks returns expected object shape', () => {
  const attacks = generateAttacks(sampleTargets, { perTarget: 5, seed: 1 });
  assert.ok(attacks.length > 0);
  for (const attack of attacks) {
    assert.strictEqual(typeof attack.input, 'string');
    assert.ok(['term', 'domain', 'url'].includes(attack.type));
    assert.ok(Object.keys(FAMILY_GENERATORS).includes(attack.family));
    assert.strictEqual(typeof attack.target, 'string');
    assert.ok(typeof attack.expectedVerdict === 'string');
  }
});

test('each configured family produces attacks', () => {
  const families = Object.keys(FAMILY_GENERATORS);
  for (const family of families) {
    const attacks = generateAttacks(sampleTargets, {
      perTarget: 5,
      seed: 1,
      families: [family],
    });
    assert.ok(attacks.length > 0, `family ${family} produced no attacks`);
  }
});

test('single-confusable family replaces exactly one character', () => {
  const attacks = generateAttacks([{ id: 'apple', ascii: 'apple' }], {
    perTarget: 10,
    seed: 1,
    families: ['single-confusable'],
  });
  assert.ok(attacks.length > 0);
  for (const attack of attacks) {
    assert.strictEqual([...attack.input].length, 5, `${attack.input} length should be 5`);
    assert.strictEqual(attack.family, 'single-confusable');
    assert.strictEqual(attack.expectedVerdict, 'homograph-spoof');
  }
});

test('multi-confusable family uses 2+ substitutions', () => {
  const attacks = generateAttacks([{ id: 'apple', ascii: 'apple' }], {
    perTarget: 20,
    seed: 1,
    families: ['multi-confusable'],
  });
  assert.ok(attacks.length >= 5);
  let foundMulti = false;
  for (const attack of attacks) {
    const base = 'apple';
    let diffs = 0;
    const aChars = [...attack.input];
    const bChars = [...base];
    for (let i = 0; i < bChars.length; i++) {
      if (aChars[i] !== bChars[i]) diffs++;
    }
    if (diffs >= 2) foundMulti = true;
  }
  assert.ok(foundMulti, 'expected at least one attack with 2+ substitutions');
});

test('invisible-injection family inserts invisible characters', () => {
  const attacks = generateAttacks([{ id: 'apple', ascii: 'apple' }], {
    perTarget: 10,
    seed: 1,
    families: ['invisible-injection'],
  });
  assert.ok(attacks.length > 0);
  for (const attack of attacks) {
    assert.ok(
      /\u200B|\u200C|\u200D|\uFE0F|\uFE0E|\u2060|\u00AD|\u180E|\u200F|\u200E|\u202D|\u202E|\uFFEF/.test(
        attack.input
      ),
      `expected invisible char in ${attack.input}`
    );
  }
});

test('normalization-attack family produces decomposed or fullwidth variants', () => {
  const attacks = generateAttacks([{ id: 'apple', ascii: 'apple' }], {
    perTarget: 10,
    seed: 1,
    families: ['normalization-attack'],
  });
  assert.ok(attacks.length > 0);
  for (const attack of attacks) {
    assert.notStrictEqual(attack.input, 'apple');
  }
});

test('etld-subdomain family places target in subdomain of evil domain', () => {
  const attacks = generateAttacks([{ id: 'apple', ascii: 'apple' }], {
    perTarget: 5,
    seed: 1,
    families: ['etld-subdomain'],
  });
  assert.ok(attacks.length > 0);
  for (const attack of attacks) {
    assert.ok(attack.input.includes('.'), `expected domain dots in ${attack.input}`);
    assert.strictEqual(attack.type, 'domain');
  }
});

test('path-query-homograph family builds URLs with target in path or query', () => {
  const attacks = generateAttacks([{ id: 'apple', ascii: 'apple' }], {
    perTarget: 5,
    seed: 1,
    families: ['path-query-homograph'],
  });
  assert.ok(attacks.length > 0);
  for (const attack of attacks) {
    assert.ok(attack.input.startsWith('https://'), `expected URL in ${attack.input}`);
    assert.strictEqual(attack.type, 'url');
  }
});

test('mixed-script-legitimate family is not marked deceptive', () => {
  const attacks = generateAttacks(sampleTargets, {
    perTarget: 20,
    seed: 1,
    families: ['mixed-script-legitimate'],
  });
  assert.ok(attacks.length > 0);
  for (const attack of attacks) {
    assert.ok(
      !isDeceptiveVerdict(attack.expectedVerdict),
      `${attack.input} should not be deceptive`
    );
  }
});

test('mixed-script-attack family produces mixed-script inputs', () => {
  const attacks = generateAttacks([{ id: 'apple', ascii: 'apple' }], {
    perTarget: 10,
    seed: 1,
    families: ['mixed-script-attack'],
  });
  assert.ok(attacks.length > 0);
  for (const attack of attacks) {
    assert.notStrictEqual(attack.input, 'apple');
    assert.strictEqual(attack.expectedVerdict, 'mixed-script-spoof');
  }
});

test('built-in targets include lexicon, brands, and person names', () => {
  const targets = getBuiltInTargets();
  assert.ok(targets.length > 900);
  const ids = new Set(targets.map((t) => t.id));
  assert.ok(ids.has('zeus'));
  assert.ok(ids.has('apple'));
  assert.ok(ids.has('john'));
});

test('generator produces at least 100,000 unique deceptive variants', () => {
  const attacks = generateAttacks([], { perTarget: 20, seed: 1, includeSafe: false });
  const unique = new Set(attacks.map((a) => a.input));
  assert.ok(unique.size >= 100_000, `expected ≥100k unique, got ${unique.size}`);
});

test('seed produces deterministic output', () => {
  const a = generateAttacks(sampleTargets, { perTarget: 10, seed: 7 });
  const b = generateAttacks(sampleTargets, { perTarget: 10, seed: 7 });
  assert.strictEqual(a.length, b.length);
  for (let i = 0; i < a.length; i++) {
    assert.strictEqual(a[i].input, b[i].input);
  }
});

run();
