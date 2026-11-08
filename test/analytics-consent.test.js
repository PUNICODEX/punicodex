const assert = require('node:assert');
const fs = require('node:fs');
const vm = require('node:vm');
const { test } = require('node:test');

const SOURCE = fs.readFileSync(require.resolve('../js/analytics-beacon.js'), 'utf8');

function storage() {
  const values = new Map();
  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
    removeItem(key) {
      values.delete(key);
    },
  };
}

function runBeacon({ consent = null, doNotTrack = '0', path = '/pantheon/' } = {}) {
  const calls = [];
  const local = storage();
  const session = storage();
  if (consent) local.setItem('punicodex.cookie-consent', JSON.stringify({ choice: consent }));
  const document = {
    visibilityState: 'visible',
    documentElement: { scrollHeight: 2400 },
    addEventListener() {},
  };
  const window = {
    innerHeight: 800,
    scrollY: 0,
    px: {},
    addEventListener() {},
  };
  const navigator = {
    doNotTrack,
    userAgent: 'consent-test',
    sendBeacon(url, blob) {
      calls.push({ url, body: blob.parts.join('') });
      return true;
    },
  };
  const location = { pathname: path };
  const sandbox = {
    window,
    document,
    navigator,
    location,
    localStorage: local,
    sessionStorage: session,
    crypto: { getRandomValues: (bytes) => bytes.fill(7) },
    Blob: class Blob {
      constructor(parts) {
        this.parts = parts;
      }
    },
    fetch: async () => ({ ok: true }),
    setTimeout: () => 1,
    clearTimeout() {},
    console,
  };
  vm.runInNewContext(SOURCE, sandbox, { filename: 'analytics-beacon.js' });
  if (window.px && typeof window.px.track === 'function') {
    for (let i = 0; i < 10; i++) window.px.track('identity_login', { properties: { index: i } });
  }
  return { calls, window };
}

test('unset consent emits no visitor analytics', () => {
  const { calls } = runBeacon();
  assert.strictEqual(calls.length, 0);
});

test('accepted consent emits normalized page events', () => {
  const { calls } = runBeacon({ consent: 'accepted' });
  assert.ok(calls.length > 0);
  const events = JSON.parse(calls[0].body);
  assert.ok(events.some((event) => event.event_name === 'page_view'));
  assert.ok(events.every((event) => event.session_hash));
});

test('declined consent emits no visitor analytics', () => {
  const { calls } = runBeacon({ consent: 'declined' });
  assert.strictEqual(calls.length, 0);
});

test('Do Not Track emits no visitor analytics', () => {
  const { calls } = runBeacon({ consent: 'accepted', doNotTrack: '1' });
  assert.strictEqual(calls.length, 0);
});

test('account surfaces remain silent even after consent', () => {
  const { calls } = runBeacon({ consent: 'accepted', path: '/account/login/' });
  assert.strictEqual(calls.length, 0);
});

test('privacy policy describes opt-in analytics and essential account events accurately', () => {
  const html = fs.readFileSync(require.resolve('../privacy/index.html'), 'utf8');
  assert.ok(html.includes('Until you explicitly accept analytics'));
  assert.ok(!html.includes('The static website does not set cookies'));
  assert.ok(
    !html.includes(
      'does not contain analytics scripts, tracking pixels, or third-party cookies. We do not use Google Analytics, Plausible, or any other visitor analytics'
    )
  );
  assert.ok(html.includes('Separate from the visitor beacon, essential account operations'));
});
