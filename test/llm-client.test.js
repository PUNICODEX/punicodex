/**
 * LLM Client Tests (platform/api/llm.js)
 *
 * The shared OpenAI-compatible client: provider base URLs, request shape,
 * timeout, the exactly-once retry on 429/5xx, and null-on-failure semantics
 * so callers (Oracle polish today, the self-hosted student later) degrade
 * gracefully. All network is stubbed.
 */

const assert = require('node:assert');

const { chat, chatDetailed } = require('../platform/api/llm.js');

const tests = [];
const test = (name, fn) => tests.push([name, fn]);

function stubFetch(impl) {
  global.fetch = impl;
}
function restoreFetch(original) {
  global.fetch = original;
}

test('unconfigured calls return null without network', async () => {
  const original = global.fetch;
  let calls = 0;
  stubFetch(() => {
    calls++;
    throw new Error('must not be called');
  });
  const res = await chat({ apiKey: '', model: '', messages: [] });
  restoreFetch(original);
  assert.strictEqual(res, null);
  assert.strictEqual(calls, 0);
});

test('posts to the caller-provided base URL with the right payload', async () => {
  const original = global.fetch;
  let seen = null;
  stubFetch(async (url, opts) => {
    seen = { url, opts };
    return {
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'hello' } }] }),
    };
  });
  const res = await chat({
    apiKey: 'k',
    model: 'm',
    baseUrl: 'https://openrouter.ai/api/v1/',
    messages: [{ role: 'user', content: 'hi' }],
    temperature: 0.1,
    maxTokens: 42,
  });
  restoreFetch(original);
  assert.strictEqual(res, 'hello');
  assert.strictEqual(seen.url, 'https://openrouter.ai/api/v1/chat/completions');
  const body = JSON.parse(seen.opts.body);
  assert.strictEqual(body.model, 'm');
  assert.strictEqual(body.max_tokens, 42);
  assert.strictEqual(seen.opts.headers.Authorization, 'Bearer k');
});

test('429 gets exactly one retry; 4xx does not', async () => {
  const original = global.fetch;
  let calls = 0;
  stubFetch(async () => {
    calls++;
    return { ok: false, status: 429, json: async () => ({}) };
  });
  let res = await chat({ apiKey: 'k', model: 'm', messages: [], timeoutMs: 50 });
  assert.strictEqual(res, null);
  assert.strictEqual(calls, 2, 'one retry on 429');

  calls = 0;
  stubFetch(async () => {
    calls++;
    return { ok: false, status: 401, json: async () => ({}) };
  });
  res = await chat({ apiKey: 'k', model: 'm', messages: [], timeoutMs: 50 });
  restoreFetch(original);
  assert.strictEqual(res, null);
  assert.strictEqual(calls, 1, 'no retry on 401');
});

test('network errors and malformed payloads resolve to null', async () => {
  const original = global.fetch;
  stubFetch(async () => {
    throw new Error('ECONNRESET');
  });
  let res = await chat({ apiKey: 'k', model: 'm', messages: [], timeoutMs: 50 });
  assert.strictEqual(res, null);

  stubFetch(async () => ({ ok: true, json: async () => ({ choices: [] }) }));
  res = await chat({ apiKey: 'k', model: 'm', messages: [], timeoutMs: 50 });
  restoreFetch(original);
  assert.strictEqual(res, null, 'empty choices → null');
});

test('empty content is treated as failure', async () => {
  const original = global.fetch;
  stubFetch(async () => ({
    ok: true,
    json: async () => ({ choices: [{ message: { content: '   ' } }] }),
  }));
  const res = await chat({ apiKey: 'k', model: 'm', messages: [], timeoutMs: 50 });
  restoreFetch(original);
  assert.strictEqual(res, null);
});

test('chatDetailed reports failure classes', async () => {
  const original = global.fetch;
  stubFetch(async () => ({ ok: false, status: 401, json: async () => ({}) }));
  let res = await chatDetailed({ apiKey: 'k', model: 'm', messages: [], timeoutMs: 50 });
  assert.deepStrictEqual(res, { content: null, error: 'http_401' });

  stubFetch(async () => ({ ok: true, json: async () => ({ choices: [] }) }));
  res = await chatDetailed({ apiKey: 'k', model: 'm', messages: [], timeoutMs: 50 });
  assert.deepStrictEqual(res, { content: null, error: 'empty' });

  res = await chatDetailed({ apiKey: '', model: '', messages: [] });
  restoreFetch(original);
  assert.deepStrictEqual(res, { content: null, error: 'unconfigured' });
});

test('chatDetailed honors Retry-After on 429 and eventually succeeds', async () => {
  const original = global.fetch;
  let calls = 0;
  const retryAfterSeconds = 0.05;
  stubFetch(async () => {
    calls++;
    if (calls < 3) {
      return {
        ok: false,
        status: 429,
        headers: { get: (h) => (h === 'retry-after' ? String(retryAfterSeconds) : null) },
        json: async () => ({}),
      };
    }
    return { ok: true, json: async () => ({ choices: [{ message: { content: 'recovered' } }] }) };
  });
  const started = Date.now();
  const res = await chatDetailed({ apiKey: 'k', model: 'm', messages: [], timeoutMs: 2000 });
  restoreFetch(original);
  assert.strictEqual(calls, 3, 'two 429s then success');
  assert.deepStrictEqual(res, { content: 'recovered', error: null });
  assert.ok(Date.now() - started >= 90, 'waited between retries');
});

test('chatDetailed exhausts attempts and reports http_429', async () => {
  const original = global.fetch;
  let calls = 0;
  stubFetch(async () => {
    calls++;
    return { ok: false, status: 429, json: async () => ({}) };
  });
  const res = await chatDetailed({
    apiKey: 'k',
    model: 'm',
    messages: [],
    timeoutMs: 50,
    maxAttempts: 2,
  });
  restoreFetch(original);
  assert.strictEqual(calls, 2);
  assert.deepStrictEqual(res, { content: null, error: 'http_429' });
});

async function run() {
  console.log('\n▸ LLM Client Tests\n');
  let failed = 0;
  for (const [name, fn] of tests) {
    try {
      await fn();
      console.log(`  ✓ ${name}`);
    } catch (err) {
      failed++;
      console.error(`  ✗ ${name}`);
      console.error(`    ${err.message}`);
    }
  }
  console.log(`\nLLM Client: ${tests.length - failed} passed, ${failed} failed`);
  if (failed) process.exitCode = 1;
}

run();
