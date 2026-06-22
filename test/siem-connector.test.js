/**
 * PÚNYCODEX — SIEM connector stub tests (Phase 19).
 */

const assert = require('node:assert');
const {
  splunkEvent,
  datadogEvent,
  elasticDoc,
  sendToSiem,
  listConnectors,
} = require('../platform/api/siem-connectors.js');

const sampleAlert = {
  input: 'аpple.com',
  punycode: 'xn--pple-wmc.com',
  verdict: 'homograph-spoof',
  severity: 'critical',
  confidence: 0.97,
  timestamp: '2026-06-22T00:00:00.000Z',
};

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

console.log('\n▸ SIEM Connector Tests\n');

test('lists supported connector platforms', () => {
  const connectors = listConnectors();
  assert.deepStrictEqual(new Set(connectors), new Set(['splunk', 'datadog', 'elastic']));
});

test('Splunk formatter produces a HEC request payload', () => {
  const request = splunkEvent(sampleAlert, { hecToken: 'test-token' });
  assert.strictEqual(request.method, 'POST');
  assert.ok(request.headers.Authorization.includes('test-token'));
  assert.strictEqual(request.body.source, 'punycodex-authenticity-shield');
  assert.strictEqual(request.body.event.verdict, 'homograph-spoof');
  assert.strictEqual(request.body.sourcetype, 'punycodex:authenticity');
});

test('Datadog formatter produces an event request payload', () => {
  const request = datadogEvent(sampleAlert, { apiKey: 'dd-test-key' });
  assert.strictEqual(request.method, 'POST');
  assert.strictEqual(request.headers['DD-API-KEY'], 'dd-test-key');
  assert.ok(request.body.title.includes('critical'));
  assert.strictEqual(request.body.alert_type, 'error');
  assert.ok(request.body.tags.some((t) => t === 'target:punycodex-authenticity-shield'));
  assert.ok(request.body.tags.some((t) => t === 'verdict:homograph-spoof'));
});

test('Elastic formatter produces an index document request', () => {
  const request = elasticDoc(sampleAlert, { index: 'punycodex-test', apiKey: 'es-test-key' });
  assert.strictEqual(request.method, 'PUT');
  assert.ok(request.url.includes('/punycodex-test/_doc/'));
  assert.strictEqual(request.body.verdict, 'homograph-spoof');
  assert.ok(request.headers.Authorization.includes('es-test-key'));
});

test('sendToSiem dispatches to the correct platform', () => {
  const splunk = sendToSiem('splunk', sampleAlert);
  assert.ok(splunk.body.event);

  const datadog = sendToSiem('datadog', sampleAlert);
  assert.ok(datadog.body.title);

  const elastic = sendToSiem('elastic', sampleAlert);
  assert.ok(elastic.url);
});

test('sendToSiem rejects unsupported platforms', () => {
  assert.throws(() => sendToSiem('unknown', sampleAlert), /Unsupported SIEM platform/);
});

console.log(`\nSIEM Connectors: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exit(1);
}
