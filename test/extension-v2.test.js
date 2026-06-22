/**
 * PÚNYCODEX Authenticity Extension v2 — Tests
 */

const assert = require('node:assert');

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

function createMockChrome() {
  const storage = {};
  const updates = [];
  const sent = [];

  const event = () => ({
    _listeners: [],
    addListener(fn) {
      this._listeners.push(fn);
    },
    trigger(...args) {
      for (const fn of this._listeners) {
        try {
          fn(...args);
        } catch {
          // ignore
        }
      }
    },
  });

  return {
    storage: {
      sync: {
        get: async (keys) => {
          if (keys == null) return { ...storage };
          const keyArray = Array.isArray(keys) ? keys : [keys];
          const result = {};
          for (const key of keyArray) {
            if (Object.hasOwn(storage, key)) {
              result[key] = storage[key];
            }
          }
          return result;
        },
        set: async (obj) => {
          Object.assign(storage, obj);
        },
      },
    },
    tabs: {
      onUpdated: event(),
      update: async (tabId, options) => {
        updates.push({ tabId, options });
      },
      sendMessage: async (tabId, message) => {
        sent.push({ tabId, message });
      },
      query: async () => [{ id: 7, url: 'https://fake-paypal.example/login' }],
      _updates: updates,
      _sent: sent,
    },
    runtime: {
      onMessage: event(),
      getURL: (path) => `chrome-extension://test-id${path}`,
    },
  };
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

  restoreFetch();
  console.log(`\nExtension v2: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

// Storage wrapper tests

test('storage wrapper returns defaults for missing keys', async () => {
  globalThis.chrome = createMockChrome();
  const { getAll, DEFAULTS } = await import('../extension-v2/shared/storage.js');
  const settings = await getAll();
  assert.strictEqual(settings.enabled, DEFAULTS.enabled);
  assert.strictEqual(settings.apiEndpoint, DEFAULTS.apiEndpoint);
});

test('storage wrapper persists and reads values', async () => {
  globalThis.chrome = createMockChrome();
  const { get, set } = await import('../extension-v2/shared/storage.js');
  await set('apiEndpoint', 'https://custom.example/api/v2');
  const value = await get('apiEndpoint');
  assert.strictEqual(value, 'https://custom.example/api/v2');
});

// Background helper tests

test('isCheckableUrl accepts https and rejects chrome/about', async () => {
  globalThis.chrome = createMockChrome();
  mockFetch(() => ({ body: { data: { verdict: 'unknown', severity: 'none' } } }));
  const { isCheckableUrl } = await import('../extension-v2/background/background.js');
  assert.strictEqual(isCheckableUrl('https://example.com'), true);
  assert.strictEqual(isCheckableUrl('chrome://extensions/'), false);
  assert.strictEqual(isCheckableUrl('about:blank'), false);
  restoreFetch();
});

test('getApiUrl uses configured endpoint', async () => {
  globalThis.chrome = createMockChrome();
  mockFetch(() => ({ body: { data: { verdict: 'unknown', severity: 'none' } } }));
  const { getApiUrl } = await import('../extension-v2/background/background.js');
  const url = getApiUrl({ apiEndpoint: 'https://custom.example/api/v2' }, 'https://evil.com');
  assert.ok(url.startsWith('https://custom.example/api/v2/authenticity/check'));
  assert.ok(url.includes('input=https%3A%2F%2Fevil.com'));
  restoreFetch();
});

test('buildInterstitialUrl encodes verdict and alternatives', async () => {
  globalThis.chrome = createMockChrome();
  mockFetch(() => ({ body: { data: { verdict: 'unknown', severity: 'none' } } }));
  const { buildInterstitialUrl } = await import('../extension-v2/background/background.js');
  const url = buildInterstitialUrl(
    'https://evil.com',
    {
      verdict: 'homograph-spoof',
      severity: 'high',
      reason: 'Looks like Apple',
      targetIdentity: { name: 'Apple' },
      safeAlternatives: ['https://www.apple.com'],
    },
    { interstitialUrl: 'https://punycodex.com/interstitial.html', locale: 'en' }
  );
  assert.ok(url.includes('verdict=homograph-spoof'));
  assert.ok(url.includes('severity=high'));
  assert.ok(url.includes('target=Apple'));
  assert.ok(url.includes('alternatives='));
  assert.ok(url.includes('locale=en'));
  restoreFetch();
});

test('decideActionFromSettings returns block for critical by default', async () => {
  globalThis.chrome = createMockChrome();
  mockFetch(() => ({ body: { data: { verdict: 'unknown', severity: 'none' } } }));
  const { decideActionFromSettings } = await import('../extension-v2/background/background.js');
  const evaluation = decideActionFromSettings(
    {},
    { severity: 'critical', input: 'https://evil.example' }
  );
  assert.strictEqual(evaluation.action, 'block');
  assert.strictEqual(evaluation.reason, 'severity');
  assert.strictEqual(evaluation.uiTheme, 'inline');
  restoreFetch();
});

// Background runtime behavior tests

test('checkUrl fetches API and caches results', async () => {
  globalThis.chrome = createMockChrome();
  let calls = 0;
  mockFetch(() => {
    calls++;
    return { body: { data: { verdict: 'lookalike-domain', severity: 'high' } } };
  });
  const { checkUrl } = await import('../extension-v2/background/background.js');
  const first = await checkUrl('https://cache-test.example');
  const second = await checkUrl('https://cache-test.example');
  assert.strictEqual(first.verdict, 'lookalike-domain');
  assert.strictEqual(second.verdict, 'lookalike-domain');
  assert.strictEqual(calls, 1);
  restoreFetch();
});

test('handleTabUpdate redirects to interstitial on critical+block', async () => {
  const chromeMock = createMockChrome();
  globalThis.chrome = chromeMock;
  mockFetch(() => ({ body: { data: { verdict: 'unsafe', severity: 'critical' } } }));
  const mod = await import('../extension-v2/background/background.js');
  mod.handleTabUpdate(42, { status: 'complete' }, { url: 'https://critical.example', id: 42 });
  await new Promise((r) => setTimeout(r, 20));
  assert.strictEqual(chromeMock.tabs._updates.length, 1);
  assert.ok(chromeMock.tabs._updates[0].options.url.includes('interstitial.html'));
  restoreFetch();
});

test('handleTabUpdate sends banner message on high+warn', async () => {
  const chromeMock = createMockChrome();
  globalThis.chrome = chromeMock;
  mockFetch(() => ({ body: { data: { verdict: 'homograph-spoof', severity: 'high' } } }));
  const mod = await import('../extension-v2/background/background.js');
  mod.handleTabUpdate(43, { status: 'complete' }, { url: 'https://high.example', id: 43 });
  await new Promise((r) => setTimeout(r, 20));
  assert.strictEqual(chromeMock.tabs._sent.length, 1);
  assert.strictEqual(chromeMock.tabs._sent[0].message.action, 'showBanner');
  restoreFetch();
});

test('handleMessage checkLink returns verdict', async () => {
  const chromeMock = createMockChrome();
  globalThis.chrome = chromeMock;
  mockFetch(() => ({ body: { data: { verdict: 'lookalike-domain', severity: 'high' } } }));
  const mod = await import('../extension-v2/background/background.js');
  let response = null;
  const keepChannelOpen = mod.handleMessage(
    { action: 'checkLink', url: 'https://link.example' },
    {},
    (res) => {
      response = res;
    }
  );
  assert.strictEqual(keepChannelOpen, true);
  await new Promise((r) => setTimeout(r, 20));
  assert.ok(response);
  assert.strictEqual(response.success, true);
  assert.strictEqual(response.verdict.verdict, 'lookalike-domain');
  restoreFetch();
});

run();
