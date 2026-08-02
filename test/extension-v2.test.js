/**
 * PuniCodex Authenticity Extension v2 — Tests
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
    { interstitialUrl: 'https://punicodex.com/interstitial.html', locale: 'en' }
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
  mod.handleTabUpdate(42, { status: 'loading' }, { url: 'https://critical.example', id: 42 });
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
  mod.handleTabUpdate(43, { status: 'loading' }, { url: 'https://high.example', id: 43 });
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

// API-down / offline behavior (fail-open contract)

test('getApiBase strips trailing slashes and defaults to the v1 API', async () => {
  globalThis.chrome = createMockChrome();
  const { getApiBase } = await import('../extension-v2/background/background.js');
  const { DEFAULTS } = await import('../extension-v2/shared/storage.js');
  assert.strictEqual(
    getApiBase({ apiEndpoint: 'https://x.example/api/' }),
    'https://x.example/api'
  );
  assert.strictEqual(
    getApiBase({ apiEndpoint: 'https://x.example/api///' }),
    'https://x.example/api'
  );
  assert.ok(DEFAULTS.apiEndpoint.includes('/api/v1'));
  assert.ok(!DEFAULTS.apiEndpoint.endsWith('/'));
});

test('checkUrl sends an AbortSignal so a hung API times out', async () => {
  globalThis.chrome = createMockChrome();
  let seenSignal = null;
  mockFetch((_url, options) => {
    seenSignal = options?.signal;
    return { body: { data: { verdict: 'unknown', severity: 'none' } } };
  });
  const { checkUrl } = await import('../extension-v2/background/background.js');
  await checkUrl('https://signal-test.example');
  assert.ok(seenSignal instanceof AbortSignal);
  restoreFetch();
});

test('checkUrl rejects on API 500 so callers can fail open', async () => {
  globalThis.chrome = createMockChrome();
  mockFetch(() => ({ ok: false, status: 500, text: 'server error' }));
  const { checkUrl } = await import('../extension-v2/background/background.js');
  await assert.rejects(() => checkUrl('https://api-500.example'), /API error 500/);
  restoreFetch();
});

test('handleTabUpdate fails open when the API is unreachable', async () => {
  const chromeMock = createMockChrome();
  globalThis.chrome = chromeMock;
  mockFetch(() => {
    throw new TypeError('fetch failed');
  });
  const mod = await import('../extension-v2/background/background.js');
  mod.handleTabUpdate(44, { status: 'loading' }, { url: 'https://offline.example', id: 44 });
  await new Promise((r) => setTimeout(r, 20));
  // No redirect to the interstitial and no banner: navigation proceeds untouched.
  assert.strictEqual(chromeMock.tabs._updates.length, 0);
  assert.strictEqual(chromeMock.tabs._sent.length, 0);
  restoreFetch();
});

test('handleTabUpdate fails open on API 500', async () => {
  const chromeMock = createMockChrome();
  globalThis.chrome = chromeMock;
  mockFetch(() => ({ ok: false, status: 500, text: 'server error' }));
  const mod = await import('../extension-v2/background/background.js');
  mod.handleTabUpdate(45, { status: 'loading' }, { url: 'https://api-down.example', id: 45 });
  await new Promise((r) => setTimeout(r, 20));
  assert.strictEqual(chromeMock.tabs._updates.length, 0);
  assert.strictEqual(chromeMock.tabs._sent.length, 0);
  restoreFetch();
});

test('handleMessage checkLink reports failure when the API is down', async () => {
  const chromeMock = createMockChrome();
  globalThis.chrome = chromeMock;
  mockFetch(() => {
    throw new TypeError('fetch failed');
  });
  const mod = await import('../extension-v2/background/background.js');
  let response = null;
  mod.handleMessage({ action: 'checkLink', url: 'https://down-link.example' }, {}, (res) => {
    response = res;
  });
  await new Promise((r) => setTimeout(r, 20));
  assert.ok(response);
  assert.strictEqual(response.success, false);
  assert.ok(response.error);
  restoreFetch();
});

run();
