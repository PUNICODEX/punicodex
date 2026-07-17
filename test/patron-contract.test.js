'use strict';

/**
 * PÚNYCODEX — Patron frontend ↔ backend contract tests
 *
 * Guards the contract between the flagship patron frontends
 * (templates/flagship/patron/patron.js, templates/flagship/flagship.js) and
 * the patrons serverless API (api/patrons/[[...slug]].js +
 * platform/api/patron-service.js + platform/api/stripe.js) against drift:
 *
 *   - the /api/patrons/... fetch URL literals used by the frontends
 *   - vercel.json rewrite coverage, including the trailing-slash checkout
 *   - the public wall response keys patron.js consumes
 *   - the checkout payload keys patron.js sends vs. what the stack accepts
 *   - the checkout response sessionUrl the frontend redirects to
 *   - the social platform vocabularies on both sides
 *
 * All checks are static — no network, database, or Stripe required.
 *
 * Run: node --test test/patron-contract.test.js
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const PATRON_JS = path.join(ROOT, 'templates', 'flagship', 'patron', 'patron.js');
const FLAGSHIP_JS = path.join(ROOT, 'templates', 'flagship', 'flagship.js');
const HANDLER_PATH = path.join(ROOT, 'api', 'patrons', '[[...slug]].js');
const SERVICE_PATH = path.join(ROOT, 'platform', 'api', 'patron-service.js');
const STRIPE_PATH = path.join(ROOT, 'platform', 'api', 'stripe.js');
const VERCEL_PATH = path.join(ROOT, 'vercel.json');

// Inner text of the fetch template literals (extraction strips the backticks).
// biome-ignore lint/suspicious/noTemplateCurlyInString: intentional literal matching frontend source
const WALL_URL_LITERAL = '${API_BASE}/api/patrons/${encodeURIComponent(templeId)}';
// biome-ignore lint/suspicious/noTemplateCurlyInString: intentional literal matching frontend source
const CHECKOUT_URL_LITERAL = '${API_BASE}/api/patrons/checkout/';

const WALL_RESPONSE_KEYS = ['patrons', 'limit', 'activeCount', 'remaining', 'isFull'];
const CHECKOUT_PAYLOAD_KEYS = [
  'templeId',
  'email',
  'displayName',
  'title',
  'message',
  'amountCents',
  'socialPlatform',
  'socialUrl',
];

function read(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

/** Extract the template-literal URL of every fetch(`...`) call in a source file. */
function extractFetchUrls(source) {
  return [...source.matchAll(/fetch\(\s*`([^`]+)`/g)].map((m) => m[1]);
}

/** Extract identifier keys from an object literal / destructuring block. */
function extractKeys(block) {
  const keys = new Set();
  for (const m of block.matchAll(/^\s*([A-Za-z_$][\w$]*)\s*[:,=}]/gm)) {
    keys.add(m[1]);
  }
  return keys;
}

/**
 * Compile the subset of Vercel source syntax used in vercel.json
 * (literal segments, `:name`, `:name*` catch-all, trailing slash) to a RegExp.
 */
function vercelSourceToRegex(source) {
  const trailingSlash = source.endsWith('/');
  const trimmed = trailingSlash ? source.slice(0, -1) : source;
  let pattern = '^';
  for (const segment of trimmed.split('/').filter(Boolean)) {
    const m = segment.match(/^:[A-Za-z]+(\*)?$/);
    if (m?.[1]) pattern += '(?:/[^/]+)*';
    else if (m) pattern += '/[^/]+';
    else pattern += `/${segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`;
  }
  if (trailingSlash) pattern += '/';
  return new RegExp(`${pattern}$`);
}

function sliceBetween(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  assert.notEqual(start, -1, `marker not found: ${startMarker}`);
  const end = endMarker ? source.indexOf(endMarker, start) : source.length;
  assert.notEqual(end, -1, `marker not found: ${endMarker}`);
  return source.slice(start, end);
}

test('frontend files use the expected patron API fetch URLs', () => {
  for (const filePath of [PATRON_JS, FLAGSHIP_JS]) {
    const rel = path.relative(ROOT, filePath);
    const urls = extractFetchUrls(read(filePath));
    const patronUrls = urls.filter((u) => u.includes('/api/patrons/'));
    assert.ok(patronUrls.length > 0, `${rel} performs no /api/patrons/ fetches`);
    assert.ok(
      patronUrls.includes(CHECKOUT_URL_LITERAL),
      `${rel} must POST to ${CHECKOUT_URL_LITERAL} (trailing slash), found: ${patronUrls.join(', ')}`
    );
    assert.ok(
      patronUrls.includes(WALL_URL_LITERAL),
      `${rel} must GET ${WALL_URL_LITERAL}, found: ${patronUrls.join(', ')}`
    );
  }
});

test('vercel.json rewrites cover every frontend patron URL, including trailing-slash checkout', () => {
  const vercel = JSON.parse(read(VERCEL_PATH));
  assert.ok(Array.isArray(vercel.rewrites), 'vercel.json missing rewrites array');

  const patronRewrites = vercel.rewrites.filter(
    (r) => r.destination === '/api/patrons/[[...slug]]'
  );
  const sources = patronRewrites.map((r) => r.source).sort();
  assert.ok(
    sources.includes('/api/patrons/:slug*'),
    'missing rewrite /api/patrons/:slug* -> /api/patrons/[[...slug]]'
  );
  assert.ok(
    sources.includes('/api/patrons/:slug*/'),
    'missing trailing-slash rewrite /api/patrons/:slug*/ -> /api/patrons/[[...slug]]'
  );

  const matchers = patronRewrites.map((r) => vercelSourceToRegex(r.source));
  const covered = (urlPath) => matchers.some((re) => re.test(urlPath));

  // The exact URL shapes the frontends produce (sample temple id for the wall).
  assert.ok(covered('/api/patrons/checkout/'), 'trailing-slash checkout URL is not rewritten');
  assert.ok(covered('/api/patrons/checkout'), 'bare checkout URL is not rewritten');
  assert.ok(covered('/api/patrons/apollon'), 'temple wall URL is not rewritten');
});

test('patrons catch-all handler exists', () => {
  assert.ok(fs.existsSync(HANDLER_PATH), `expected ${HANDLER_PATH} to exist`);
});

test('public wall response produces every key patron.js consumes', () => {
  const handler = read(HANDLER_PATH);
  const wallBranch = sliceBetween(
    handler,
    'GET /api/patrons/:templeId — public patron wall',
    'return res.status(405)'
  );
  const jsonMatch = wallBranch.match(/res\.json\(\{([\s\S]*?)\}\)/);
  assert.ok(jsonMatch, 'wall branch does not respond with a res.json object');
  const produced = extractKeys(jsonMatch[1]);
  for (const key of WALL_RESPONSE_KEYS) {
    assert.ok(produced.has(key), `wall response does not produce key "${key}"`);
  }

  // patron.js reads patrons/limit/activeCount/isFull from the response and
  // recomputes `remaining` locally; the handler still emits it for consumers.
  const patronJs = read(PATRON_JS);
  for (const key of ['patrons', 'limit', 'activeCount', 'isFull']) {
    assert.ok(patronJs.includes(`data.${key}`), `patron.js no longer reads data.${key}`);
  }
});

test('checkout payload keys sent by the frontend are accepted end-to-end', () => {
  // What patron.js sends.
  const patronJs = read(PATRON_JS);
  const payloadMatch = patronJs.match(/const payload = \{([\s\S]*?)\};/);
  assert.ok(payloadMatch, 'could not locate the checkout payload object in patron.js');
  const sent = extractKeys(payloadMatch[1]);
  for (const key of CHECKOUT_PAYLOAD_KEYS) {
    assert.ok(sent.has(key), `patron.js checkout payload no longer sends "${key}"`);
  }

  // What the handler accepts (destructures from the request body).
  const handler = read(HANDLER_PATH);
  const checkoutBranch = sliceBetween(
    handler,
    "slugParts[0] === 'checkout' && req.method === 'POST'",
    'GET /api/patrons — admin list'
  );
  const bodyMatch = checkoutBranch.match(/const\s*\{([\s\S]*?)\}\s*=\s*body/);
  assert.ok(bodyMatch, 'checkout branch does not destructure the request body');
  const accepted = extractKeys(bodyMatch[1]);
  for (const key of sent) {
    assert.ok(accepted.has(key), `handler checkout branch drops payload key "${key}"`);
  }

  // What the Stripe adapter and the service layer accept.
  for (const [filePath, fnName] of [
    [STRIPE_PATH, 'createPatronCheckoutSession'],
    [SERVICE_PATH, 'createPatronCheckoutRecord'],
  ]) {
    const source = read(filePath);
    const fnMatch = source.match(new RegExp(`${fnName}\\(\\{([\\s\\S]*?)\\}\\)`));
    assert.ok(fnMatch, `could not locate ${fnName} in ${path.relative(ROOT, filePath)}`);
    const params = extractKeys(fnMatch[1]);
    for (const key of sent) {
      assert.ok(params.has(key), `${fnName} does not accept payload key "${key}"`);
    }
  }

  // flagship.js sends a subset (no social fields) — every key must be accepted.
  // Scope to the patrons checkout fetch first; the file has several other
  // JSON.stringify bodies for unrelated forms.
  const flagship = read(FLAGSHIP_JS);
  const checkoutCall = sliceBetween(flagship, CHECKOUT_URL_LITERAL, null);
  const flagshipMatch = checkoutCall.match(/body: JSON\.stringify\(\{([\s\S]*?)\}\)/);
  assert.ok(flagshipMatch, 'could not locate the checkout payload in flagship.js');
  for (const key of extractKeys(flagshipMatch[1])) {
    assert.ok(accepted.has(key), `handler rejects flagship.js payload key "${key}"`);
  }
});

test('checkout response exposes the sessionUrl the frontend redirects to', () => {
  const stripe = read(STRIPE_PATH);
  const returnMatch = stripe.match(/return \{ sessionUrl: session\.url,[\s\S]*?\};/);
  assert.ok(returnMatch, 'createPatronCheckoutSession no longer returns sessionUrl');

  for (const filePath of [PATRON_JS, FLAGSHIP_JS]) {
    const rel = path.relative(ROOT, filePath);
    assert.ok(read(filePath).includes('data.sessionUrl'), `${rel} no longer reads sessionUrl`);
  }
});

test('social platform vocabularies align between frontend and backend', () => {
  const configMatch = read(PATRON_JS).match(/const SOCIAL_CONFIG = \{([\s\S]*?)\n {2}\};/);
  assert.ok(configMatch, 'could not locate SOCIAL_CONFIG in patron.js');
  const frontendPlatforms = [...configMatch[1].matchAll(/^\s{4}(\w+): \{/gm)]
    .map((m) => m[1])
    .sort();

  const serviceMatch = read(SERVICE_PATH).match(/const SOCIAL_PLATFORMS = \{([\s\S]*?)\};/);
  assert.ok(serviceMatch, 'could not locate SOCIAL_PLATFORMS in patron-service.js');
  const backendPlatforms = extractKeys(serviceMatch[1]);

  assert.ok(frontendPlatforms.length > 0, 'no frontend social platforms found');
  for (const platform of frontendPlatforms) {
    assert.ok(
      backendPlatforms.has(platform),
      `frontend socialPlatform "${platform}" is rejected by the backend sanitizer`
    );
  }
});
