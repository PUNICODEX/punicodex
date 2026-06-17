/**
 * PÚNYCODEX — Autonomous Agents tests
 */

const assert = require('node:assert');
const crypto = require('node:crypto');
const { discoverCandidates, scoreCandidate } = require('../platform/agents/scout');
const { findGaps, suggestSources } = require('../platform/agents/lore-curator');
const {
  createReport,
  completeReport,
  getReports,
} = require('../platform/agents/research-assistant');

function unique(prefix) {
  return `${prefix}-${crypto.randomBytes(4).toString('hex')}`;
}

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(err.message);
    process.exitCode = 1;
  }
}

console.log('Agents Tests');

test('scout scores and queues xn-- domains', () => {
  const suffix = crypto.randomBytes(4).toString('hex');
  const domains = [`xn--scouta-${suffix}.com`, `xn--scoutb-${suffix}.net`, 'example.com'];
  const result = discoverCandidates(domains);
  assert.ok(result.discovered >= 2);
  assert.ok(result.queued >= 2);
  assert.ok(scoreCandidate('xn--abc.com') >= 3);
});

test('lore curator finds gaps and suggests sources', () => {
  const gaps = findGaps();
  assert.ok(Array.isArray(gaps));
  if (gaps.length > 0) {
    const suggestions = suggestSources(gaps[0]);
    assert.ok(suggestions.length > 0);
  }
});

test('research assistant generates report', () => {
  const token = unique('session-a1');
  const report = createReport(token, 'Zeus');
  assert.ok(report.id);
  const completed = completeReport(report.id);
  assert.strictEqual(completed.status, 'completed');
  assert.ok(completed.findings.length > 0);
  assert.ok(getReports(token).some((r) => r.id === report.id));
});

if (!process.exitCode) {
  console.log('\n✓ All Agents tests passed');
} else {
  console.log('\n✗ Some Agents tests failed');
  process.exit(1);
}
