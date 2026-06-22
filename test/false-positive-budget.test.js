/**
 * PÚNYCODEX — False Positive Budget Test
 *
 * Runs a small legitimate input set through the Authenticity Shield and asserts
 * that the false-positive rate is within the SLA budget (≤ 0.001%).
 */

const assert = require('node:assert');
const { prepareTestDb } = require('./helpers/test-db.js');

prepareTestDb('false-positive-budget.test.js');

const { classifyTerm, classifyDomain, VERDICTS } = require('../platform/api/authenticity-service');
const { buildLegitimateSet } = require('../scripts/build-authenticity-benchmarks');

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
  console.log(`\nFalse Positive Budget: ${passed} passed, ${failed} failed`);
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

function buildLegitimateInputs() {
  const rows = [];

  const lexiconAscii = ['zeus', 'ares', 'athena', 'hades', 'nike', 'apollo', 'hermes'];
  for (const name of lexiconAscii) {
    rows.push({ input: name, type: 'term' });
  }

  const lexiconUnicode = ['Zeús', 'Árēs', 'Athēnā', 'Apollōn', 'Hēra', 'Tōkyō', 'Óðinn'];
  for (const name of lexiconUnicode) {
    rows.push({ input: name, type: 'term' });
  }

  const brands = ['Apple', 'Google', 'Microsoft', 'Amazon', 'PayPal', 'Netflix'];
  for (const brand of brands) {
    rows.push({ input: brand, type: 'term' });
    rows.push({ input: `${brand.toLowerCase()}.com`, type: 'domain' });
  }

  const names = ['john', 'jane', 'mary', 'james', 'robert', 'patricia'];
  for (const name of names) {
    rows.push({ input: name, type: 'term' });
    rows.push({ input: `${name}.com`, type: 'domain' });
  }

  const asciiDomains = ['example.com', 'test.org', 'hello.net', 'foo.io', 'bar.app'];
  for (const domain of asciiDomains) {
    rows.push({ input: domain, type: 'domain' });
  }

  const legitimateMixed = ['Beyoncé', 'Zoë', 'José', 'Naïve', 'résumé', 'L’Oréal', 'Škoda'];
  for (const name of legitimateMixed) {
    rows.push({ input: name, type: 'term' });
  }

  return rows;
}

function runSet(rows) {
  let fp = 0;
  let tn = 0;
  for (const row of rows) {
    const result = row.type === 'domain' ? classifyDomain(row.input) : classifyTerm(row.input);
    if (isDeceptive(result)) {
      fp++;
    } else {
      tn++;
    }
  }
  return { fp, tn, fpr: fp / rows.length };
}

test('builds a non-empty legitimate input set', () => {
  const rows = buildLegitimateInputs();
  assert.ok(rows.length >= 40, `expected ≥40 rows, got ${rows.length}`);
});

test('lexicon ASCII names are not flagged as deceptive', () => {
  const rows = buildLegitimateInputs().filter((r) =>
    ['zeus', 'ares', 'athena', 'hades', 'nike', 'apollo', 'hermes'].includes(r.input)
  );
  const { fpr } = runSet(rows);
  assert.strictEqual(fpr, 0, `expected 0 FPR for lexicon ASCII, got ${fpr}`);
});

test('ASCII domains are not flagged as deceptive', () => {
  const rows = buildLegitimateInputs().filter((r) => r.type === 'domain');
  const { fpr } = runSet(rows);
  assert.strictEqual(fpr, 0, `expected 0 FPR for ASCII domains, got ${fpr}`);
});

test('legitimate mixed-script names are not flagged as deceptive', () => {
  const rows = buildLegitimateInputs().filter((r) =>
    ['Beyoncé', 'Zoë', 'José', 'Naïve', 'résumé', 'L’Oréal', 'Škoda'].includes(r.input)
  );
  const { fpr } = runSet(rows);
  assert.strictEqual(fpr, 0, `expected 0 FPR for mixed-script names, got ${fpr}`);
});

test('overall legitimate set FPR is within budget', () => {
  const rows = buildLegitimateInputs();
  const { fpr, fp, tn } = runSet(rows);
  console.log(`    FPR=${(fpr * 100).toFixed(4)}% (${fp} FP / ${fp + tn} total)`);
  assert.ok(fpr <= 0.00001, `FPR ${fpr} exceeds budget 0.00001`);
});

test('FPR budget holds when sample is repeated', () => {
  const rows = buildLegitimateInputs();
  const repeated = [...rows, ...rows, ...rows];
  const { fpr } = runSet(repeated);
  assert.ok(fpr <= 0.00001, `FPR ${fpr} exceeds budget on repeated sample`);
});

test('full legitimate benchmark FPR is within 0.001% budget', () => {
  const sampleSize = parseInt(process.env.PUNYCODEX_FPR_SAMPLE_SIZE || '20000', 10);
  const rows = buildLegitimateSet(sampleSize).map((row) => ({ input: row.input, type: row.type }));
  assert.ok(
    rows.length >= sampleSize,
    `expected ≥${sampleSize} legitimate rows, got ${rows.length}`
  );
  const { fpr, fp, tn } = runSet(rows);
  console.log(`    Full benchmark FPR=${(fpr * 100).toFixed(4)}% (${fp} FP / ${fp + tn} total)`);
  assert.ok(
    fpr <= 0.00001,
    `FPR ${fpr} exceeds budget 0.00001 on ${rows.length} legitimate inputs`
  );
});

run();
