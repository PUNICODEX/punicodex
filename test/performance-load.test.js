/**
 * PÚNYCODEX — Performance & load tests for the Authenticity Shield.
 *
 * Micro-benchmarks the core classification path locally. Full k6/Artillery
 * load tests live in test/load/k6-authenticity.js.
 */

const assert = require('node:assert');
const { classifyTerm, classifyDomain } = require('../platform/api/authenticity-service.js');

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
  console.log(`\nPerformance Load: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

function percentile(sorted, p) {
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

function benchmark(fn, inputs) {
  const times = [];
  for (const input of inputs) {
    const start = process.hrtime.bigint();
    fn(input);
    const end = process.hrtime.bigint();
    times.push(Number(end - start) / 1e6); // ms
  }
  times.sort((a, b) => a - b);
  return {
    count: times.length,
    p50: percentile(times, 50),
    p95: percentile(times, 95),
    p99: percentile(times, 99),
    max: times[times.length - 1],
  };
}

function warmUp(fn, inputs) {
  for (let i = 0; i < 3; i++) {
    for (const input of inputs) fn(input);
  }
}

test('term classification p99 is under the 5 ms SLO', () => {
  const inputs = Array.from({ length: 1000 }, (_, i) => (i % 2 === 0 ? 'zeus' : 'ареs.com'));
  warmUp(classifyTerm, inputs);
  const stats = benchmark(classifyTerm, inputs);
  console.log(
    `    term p50=${stats.p50.toFixed(3)}ms p99=${stats.p99.toFixed(3)}ms max=${stats.max.toFixed(3)}ms`
  );
  assert.ok(stats.p99 < 5, `expected p99 < 5 ms, got ${stats.p99.toFixed(3)} ms`);
});

test('domain classification p99 is under the 10 ms SLO', () => {
  const inputs = Array.from({ length: 500 }, (_, i) =>
    i % 3 === 0 ? 'apollon.com' : i % 3 === 1 ? 'ароllоn.com' : 'example.com'
  );
  warmUp(classifyDomain, inputs);
  const stats = benchmark(classifyDomain, inputs);
  console.log(
    `    domain p50=${stats.p50.toFixed(3)}ms p99=${stats.p99.toFixed(3)}ms max=${stats.max.toFixed(3)}ms`
  );
  assert.ok(stats.p99 < 10, `expected p99 < 10 ms, got ${stats.p99.toFixed(3)} ms`);
});

test('sustained throughput is at least 1000 classifications per second', () => {
  const inputs = Array.from({ length: 2000 }, (_, i) => (i % 2 === 0 ? 'Athēnā' : 'páypal.com'));
  warmUp(classifyTerm, inputs);
  const start = process.hrtime.bigint();
  for (const input of inputs) {
    classifyTerm(input);
  }
  const elapsedMs = Number(process.hrtime.bigint() - start) / 1e6;
  const throughputPerSecond = (inputs.length / elapsedMs) * 1000;
  console.log(
    `    ${inputs.length} classifications in ${elapsedMs.toFixed(1)} ms (${throughputPerSecond.toFixed(0)} / s)`
  );
  assert.ok(
    throughputPerSecond >= 1000,
    `expected >= 1000 classifications/s, got ${throughputPerSecond.toFixed(0)}`
  );
});

run();
