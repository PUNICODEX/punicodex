/**
 * PÚNYCODEX — SLO compliance tests (Phase 20).
 */

const { prepareTestDb } = require('./helpers/test-db.js');

prepareTestDb(__filename);

const assert = require('node:assert');
const {
  getSloCompliance,
  getSloDefinitions,
  checkAlertConditions,
} = require('../platform/observability/slo-metrics.js');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed += 1;
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
  }
}

async function asyncTest(name, fn) {
  try {
    await fn();
    passed += 1;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed += 1;
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
  }
}

console.log('\n▸ SLO Compliance Tests\n');

test('SLO definitions match the documented enterprise guarantees', () => {
  const slos = getSloDefinitions();
  assert.strictEqual(slos.availability.target, 0.99999);
  assert.strictEqual(slos.classificationP99LatencyMs.target, 5);
  assert.strictEqual(slos.threatFeedFreshnessMinutes.target, 5);
  assert.strictEqual(slos.falsePositiveRate.target, 0.00001);
  assert.strictEqual(slos.supportResponseCriticalMinutes.target, 15);
  assert.strictEqual(slos.supportResponseHighMinutes.target, 60);
});

asyncTest('getSloCompliance returns a compliance report', async () => {
  const result = await getSloCompliance({ hours: 24 });
  assert.ok(result.evaluatedAt);
  assert.strictEqual(typeof result.overallCompliant, 'boolean');
  assert.ok(result.slos.availability);
  assert.ok(result.slos.classificationP99LatencyMs);
  assert.ok(result.slos.threatFeedFreshnessMinutes);
  assert.ok(result.slos.falsePositiveRate);
});

test('checkAlertConditions surfaces non-compliant SLOs', () => {
  const compliance = {
    slos: {
      availability: { compliant: true, actual: 0.999995, target: 0.99999 },
      classificationP99LatencyMs: { compliant: false, actual: 12, target: 5 },
      threatFeedFreshnessMinutes: { compliant: true, actual: 2, target: 5 },
    },
  };

  const alerts = checkAlertConditions(compliance);
  assert.strictEqual(alerts.length, 1);
  assert.strictEqual(alerts[0].slo, 'classificationP99LatencyMs');
  assert.strictEqual(alerts[0].actual, 12);
});

test('checkAlertConditions returns empty when all SLOs are met', () => {
  const compliance = {
    slos: {
      availability: { compliant: true, actual: 0.999995, target: 0.99999 },
      classificationP99LatencyMs: { compliant: true, actual: 3, target: 5 },
    },
  };

  assert.deepStrictEqual(checkAlertConditions(compliance), []);
});

console.log(`\nSLO Compliance: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exit(1);
}
