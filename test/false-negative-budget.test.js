/**
 * PÚNYCODEX — False Negative Budget Test
 *
 * Runs a small deceptive input set through the Authenticity Shield and asserts
 * that the true-positive rate is within the SLA budget (≥ 99.99%).
 */

const assert = require('node:assert');
const { prepareTestDb } = require('./helpers/test-db.js');

prepareTestDb('false-negative-budget.test.js');

const {
  classifyTerm,
  classifyDomain,
  classifyUrl,
  VERDICTS,
} = require('../platform/api/authenticity-service');

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
  console.log(`\nFalse Negative Budget: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

const DECEPTIVE_VERDICTS = new Set([
  VERDICTS.HOMOGRAPH_SPOOF,
  VERDICTS.MIXED_SCRIPT_SPOOF,
  VERDICTS.LOOKALIKE_DOMAIN,
  VERDICTS.UNSAFE,
]);

function isDeceptive(result) {
  return DECEPTIVE_VERDICTS.has(result.verdict);
}

function buildDeceptiveInputs() {
  const rows = [];

  // Cyrillic homographs.
  const cyrillicHomographs = ['аpple', 'gооgle', 'аres', 'pаypal', 'micr0soft', 'go0gle'];
  for (const input of cyrillicHomographs) {
    rows.push({ input, type: 'term' });
  }

  // Punycode homograph domains.
  const punyDomains = [
    'xn--pple-43d.com', // аpple.com
    'xn--ares-53d.com', // аres.com
    'xn--gogle-wmc.com', // gооgle.com
  ];
  for (const input of punyDomains) {
    rows.push({ input, type: 'domain' });
  }

  // ASCII confusable digit/symbol spoofs.
  const asciiSpoofs = ['g00gle', 'paypa1', 'micr0soft'];
  for (const input of asciiSpoofs) {
    rows.push({ input, type: 'term' });
  }

  return rows;
}

function runSet(rows) {
  let tp = 0;
  let fn = 0;
  for (const row of rows) {
    let result;
    if (row.type === 'domain') result = classifyDomain(row.input);
    else if (row.type === 'url') result = classifyUrl(row.input);
    else result = classifyTerm(row.input);

    if (isDeceptive(result)) {
      tp++;
    } else {
      fn++;
    }
  }
  return { tp, fn, tpr: tp / rows.length };
}

test('builds a non-empty deceptive input set', () => {
  const rows = buildDeceptiveInputs();
  assert.ok(rows.length >= 10, `expected ≥10 rows, got ${rows.length}`);
});

test('Cyrillic homographs are detected as deceptive', () => {
  const rows = buildDeceptiveInputs().filter((r) =>
    ['аpple', 'gооgle', 'аres', 'pаypal', 'micr0soft', 'go0gle'].includes(r.input)
  );
  const { tpr } = runSet(rows);
  assert.strictEqual(tpr, 1, `expected TPR 1 for Cyrillic homographs, got ${tpr}`);
});

test('punycode homograph domains are detected as deceptive', () => {
  const rows = buildDeceptiveInputs().filter((r) => r.type === 'domain');
  const { tpr } = runSet(rows);
  assert.strictEqual(tpr, 1, `expected TPR 1 for punycode domains, got ${tpr}`);
});

test('overall deceptive set TPR is within budget', () => {
  const rows = buildDeceptiveInputs();
  const { tpr, tp, fn } = runSet(rows);
  console.log(`    TPR=${(tpr * 100).toFixed(4)}% (${tp} TP / ${tp + fn} total)`);
  assert.ok(tpr >= 0.9999, `TPR ${tpr} below budget 0.9999`);
});

test('TPR budget holds when sample is repeated', () => {
  const rows = buildDeceptiveInputs();
  const repeated = [...rows, ...rows, ...rows];
  const { tpr } = runSet(repeated);
  assert.ok(tpr >= 0.9999, `TPR ${tpr} below budget on repeated sample`);
});

test('mixed-script homographs are detected as deceptive', () => {
  const rows = buildDeceptiveInputs().filter((r) =>
    ['аpple', 'gооgle', 'pаypal'].includes(r.input)
  );
  const { tpr } = runSet(rows);
  assert.ok(tpr >= 0.9999, `mixed-script TPR ${tpr} below budget`);
});

run();
