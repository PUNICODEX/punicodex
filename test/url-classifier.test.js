/**
 * PÚNYCODEX — URL Classifier Tests
 */

const assert = require('node:assert');
const { prepareTestDb } = require('./helpers/test-db.js');

prepareTestDb('url-classifier.test.js');

const { VERDICTS, SEVERITIES, classifyTerm } = require('../platform/api/authenticity-service');
const { classifyUrlParts } = require('../platform/api/url-classifier');

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
  console.log(`\nURL Classifier: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

test('Cyrillic apple login is homograph spoof critical', () => {
  const r = classifyUrlParts('https://аpple.com/login', { classifyTerm });
  assert.strictEqual(r.overallVerdict, VERDICTS.HOMOGRAPH_SPOOF);
  assert.strictEqual(r.overallSeverity, SEVERITIES.HIGH);
  assert.ok(r.risks.some((risk) => risk.includes('suspicious path segment')));
});

test('redirect to suspicious URL is high severity', () => {
  const r = classifyUrlParts('https://example.com/redirect?next=https://аpple.com', {
    classifyTerm,
  });
  assert.ok(
    r.overallSeverity === SEVERITIES.HIGH || r.overallSeverity === SEVERITIES.CRITICAL,
    `expected high/critical, got ${r.overallSeverity}`
  );
  assert.ok(r.risks.some((risk) => risk.includes('redirect parameter')));
});

test('apple.com/iphone is canonical substring', () => {
  const r = classifyUrlParts('https://apple.com/iphone', { classifyTerm });
  assert.strictEqual(r.overallSeverity, SEVERITIES.LOW);
  assert.ok(r.parts.some((p) => p.part === 'hostname-label' && p.verdict === VERDICTS.STYLED));
});

test('example.com/login is unknown on safe domain', () => {
  const r = classifyUrlParts('https://example.com/login', { classifyTerm });
  assert.strictEqual(r.overallVerdict, VERDICTS.UNKNOWN);
  assert.strictEqual(r.overallSeverity, SEVERITIES.NONE);
});

test('path escalates on suspicious domain', () => {
  const r = classifyUrlParts('https://xn--pple-43d.com/login', { classifyTerm });
  const loginPart = r.parts.find((p) => p.part === 'path-segment' && p.raw === 'login');
  assert.ok(loginPart);
  assert.strictEqual(loginPart.verdict, VERDICTS.HOMOGRAPH_SPOOF);
  assert.strictEqual(loginPart.severity, SEVERITIES.HIGH);
});

test('http protocol is escalated to medium', () => {
  const r = classifyUrlParts('http://example.com', { classifyTerm });
  assert.ok(r.parts.some((p) => p.part === 'protocol' && p.severity === SEVERITIES.MEDIUM));
});

test('userinfo credentials are critical', () => {
  const r = classifyUrlParts('https://user:pass@example.com', { classifyTerm });
  assert.strictEqual(r.overallSeverity, SEVERITIES.CRITICAL);
  assert.ok(r.parts.some((p) => p.part === 'userinfo'));
});

test('query keys are classified independently', () => {
  const r = classifyUrlParts('https://example.com/?zeus=ares', { classifyTerm });
  const keyPart = r.parts.find((p) => p.part === 'query-key');
  const valuePart = r.parts.find((p) => p.part === 'query-value');
  assert.ok(keyPart);
  assert.ok(valuePart);
});

test('hostname labels return ascii-fallback for ASCII canonical names', () => {
  const r = classifyUrlParts('https://zeus.com/', { classifyTerm });
  const label = r.parts.find((p) => p.part === 'hostname-label' && p.raw === 'zeus');
  assert.ok(label);
  assert.strictEqual(label.verdict, VERDICTS.ASCII_FALLBACK);
});

test('punycode homograph is detected in hostname labels', () => {
  const r = classifyUrlParts('https://xn--pple-43d.com', { classifyTerm });
  const label = r.parts.find((p) => p.part === 'hostname-label' && p.raw === 'xn--pple-43d');
  assert.ok(label);
  assert.strictEqual(label.verdict, VERDICTS.HOMOGRAPH_SPOOF);
});

test('worstPart identifies the highest severity component', () => {
  const r = classifyUrlParts('https://аpple.com/login', { classifyTerm });
  const highParts = r.parts.filter((p) => p.severity === SEVERITIES.HIGH);
  assert.ok(highParts.length > 0);
  assert.ok(highParts.some((p) => p.part === r.worstPart));
});

test('risks includes hostname risk for punycode', () => {
  const r = classifyUrlParts('https://xn--pple-43d.com', { classifyTerm });
  assert.ok(r.risks.some((risk) => risk.includes('hostname')));
});

test('non-redirect query values do not escalate', () => {
  const r = classifyUrlParts('https://example.com/?q=ares', { classifyTerm });
  assert.ok(r.overallSeverity !== SEVERITIES.HIGH);
});

test('empty redirect value does not escalate', () => {
  const r = classifyUrlParts('https://example.com/?next=', { classifyTerm });
  assert.strictEqual(r.overallSeverity, SEVERITIES.NONE);
});

test('invalid URL returns unknown result', () => {
  const r = classifyUrlParts('not a url', { classifyTerm });
  assert.strictEqual(r.overallVerdict, VERDICTS.UNKNOWN);
  assert.strictEqual(r.overallSeverity, SEVERITIES.NONE);
});

run();
