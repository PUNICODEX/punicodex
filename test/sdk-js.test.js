/**
 * PuniCodex Authenticity SDK — JavaScript tests
 */

const assert = require('node:assert');
const { AuthenticitySDK } = require('../sdk/js/src/index.js');
const { classifyTermOffline } = require('../sdk/js/src/offline-classifier.js');

const tests = [];
let originalFetch = null;

function test(name, fn) {
  tests.push({ name, fn });
}

function mockFetch(responseFactory) {
  originalFetch = globalThis.fetch;
  globalThis.fetch = async (...args) => {
    const result = await responseFactory(...args);
    return {
      ok: result.ok ?? true,
      status: result.status ?? 200,
      text: async () => result.text ?? JSON.stringify(result.body ?? {}),
      json: async () => JSON.parse(result.text ?? JSON.stringify(result.body ?? {})),
    };
  };
}

function restoreFetch() {
  if (originalFetch) {
    globalThis.fetch = originalFetch;
    originalFetch = null;
  }
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
  console.log(`\nSDK JS: ${passed} passed, ${failed} failed`);
  restoreFetch();
  if (failed > 0) process.exit(1);
}

// Offline classifier tests

test('classifyTermOffline flags Cyrillic аpple as homograph-spoof', () => {
  const result = classifyTermOffline('аpple'); // U+0430 Cyrillic a
  assert.strictEqual(result.verdict, 'homograph-spoof');
  assert.strictEqual(result.severity, 'high');
  assert.ok(result.targetIdentity);
  assert.strictEqual(result.targetIdentity.name, 'Apple');
});

test('classifyTermOffline treats plain Apple as styled brand mention', () => {
  const result = classifyTermOffline('Apple');
  assert.strictEqual(result.verdict, 'styled');
  assert.strictEqual(result.severity, 'low');
  assert.strictEqual(result.targetIdentity.name, 'Apple');
});

test('classifyTermOffline treats Hermès as styled', () => {
  const result = classifyTermOffline('Hermès');
  assert.strictEqual(result.verdict, 'styled');
  assert.strictEqual(result.targetIdentity.name, 'Hermès');
});

test('classifyTermOffline flags blocked pattern as unsafe', () => {
  const result = classifyTermOffline('fake-hermes.com');
  assert.strictEqual(result.verdict, 'unsafe');
  assert.strictEqual(result.severity, 'critical');
  assert.strictEqual(result.targetIdentity.name, 'Hermès');
});

test('classifyTermOffline flags mixed-script input', () => {
  const result = classifyTermOffline('helloα'); // Latin + Greek alpha
  assert.strictEqual(result.verdict, 'mixed-script-spoof');
  assert.strictEqual(result.severity, 'high');
});

test('classifyTermOffline returns unknown for random safe term', () => {
  const result = classifyTermOffline('xyzbrand');
  assert.strictEqual(result.verdict, 'unknown');
  assert.strictEqual(result.severity, 'none');
});

// SDK policy tests

test('decideAction maps severity to configured actions', () => {
  const sdk = new AuthenticitySDK();
  assert.deepStrictEqual(sdk.decideAction({ verdict: 'canonical', severity: 'none' }), {
    action: 'allow',
    reason: 'severity',
    uiTheme: 'inline',
  });
  assert.deepStrictEqual(sdk.decideAction({ verdict: 'homograph-spoof', severity: 'high' }), {
    action: 'warn',
    reason: 'severity',
    uiTheme: 'inline',
  });
  assert.deepStrictEqual(sdk.decideAction({ verdict: 'unsafe', severity: 'critical' }), {
    action: 'block',
    reason: 'severity',
    uiTheme: 'inline',
  });
});

test('decideAction respects allowlist and blocklist', () => {
  const sdk = new AuthenticitySDK({
    policy: {
      allowlist: ['safe-apple.com'],
      blocklist: ['evil-apple.com'],
      severityActions: { high: 'warn' },
    },
  });
  assert.deepStrictEqual(sdk.decideAction({ input: 'safe-apple.com', severity: 'high' }), {
    action: 'allow',
    reason: 'allowlist',
    uiTheme: 'inline',
  });
  assert.deepStrictEqual(sdk.decideAction({ input: 'evil-apple.com', severity: 'low' }), {
    action: 'block',
    reason: 'blocklist',
    uiTheme: 'inline',
  });
});

// SDK API tests

test('check uses offline classifier when offlineFirst is true', async () => {
  const sdk = new AuthenticitySDK({ offlineFirst: true });
  let fetchCalled = false;
  mockFetch(() => {
    fetchCalled = true;
    return { body: { data: { verdict: 'unknown', severity: 'none' } } };
  });
  const result = await sdk.check('аpple', 'term');
  assert.strictEqual(result.verdict, 'homograph-spoof');
  assert.strictEqual(fetchCalled, false);
  restoreFetch();
});

test('check calls API when offlineFirst is false', async () => {
  const sdk = new AuthenticitySDK({
    apiBaseUrl: 'https://punicodex.com/api/v2',
    apiKey: 'key-123',
  });
  let requestUrl = null;
  let authHeader = null;
  mockFetch((url, options) => {
    requestUrl = url;
    authHeader = options.headers.Authorization;
    return { body: { data: { verdict: 'homograph-spoof', severity: 'high' } } };
  });
  const result = await sdk.check('аpple', 'term');
  assert.strictEqual(result.verdict, 'homograph-spoof');
  assert.ok(requestUrl.toString().includes('/authenticity/check'));
  assert.ok(requestUrl.toString().includes('input=%D0%B0pple'));
  assert.strictEqual(authHeader, 'Bearer key-123');
  restoreFetch();
});

test('checkUrl calls URL endpoint', async () => {
  const sdk = new AuthenticitySDK({ apiBaseUrl: 'https://punicodex.com/api/v2' });
  let requestUrl = null;
  mockFetch((url) => {
    requestUrl = url;
    return { body: { data: { verdict: 'lookalike-domain', severity: 'high' } } };
  });
  await sdk.checkUrl('https://evil-apple.com');
  assert.ok(requestUrl.toString().includes('type=url'));
  assert.ok(requestUrl.toString().includes('input=https%3A%2F%2Fevil-apple.com'));
  restoreFetch();
});

test('report sends POST with body', async () => {
  const sdk = new AuthenticitySDK({
    apiBaseUrl: 'https://punicodex.com/api/v2',
    apiKey: 'key-123',
  });
  let requestInit = null;
  mockFetch((_url, init) => {
    requestInit = init;
    return { body: { data: { reported: true } } };
  });
  const result = await sdk.report('аpple.com', 'url', 'looks suspicious');
  assert.strictEqual(result.reported, true);
  assert.strictEqual(requestInit.method, 'POST');
  assert.strictEqual(requestInit.headers.Authorization, 'Bearer key-123');
  const body = JSON.parse(requestInit.body);
  assert.strictEqual(body.input, 'аpple.com');
  assert.strictEqual(body.type, 'url');
  assert.strictEqual(body.comment, 'looks suspicious');
  restoreFetch();
});

run();
