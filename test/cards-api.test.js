/**
 * PuniCodex — Cards API tests
 *
 * Tests /api/v1/cards and /api/v1/cards/:id through the real Vercel handler
 * functions, plus the cards service layer directly.
 */

'use strict';

const assert = require('node:assert');
const test = require('node:test');
const http = require('node:http');
const { URL } = require('node:url');
const path = require('node:path');

const { resetLimiters } = require('../platform/api/api-rate-limiter.js');
resetLimiters();

const cardsService = require('../platform/api/cards-service.js');
const listHandler = require('../platform/api-handlers/v1/cards/index.js');
const detailHandler = require('../platform/api-handlers/v1/cards/[id]/index.js');

const ARCHETYPES_MODULE = require(path.join(__dirname, '..', 'js', 'archetypes-v2.js'));
const ARCHETYPES = Array.isArray(ARCHETYPES_MODULE)
  ? ARCHETYPES_MODULE
  : ARCHETYPES_MODULE.ARCHETYPES || ARCHETYPES_MODULE.archetypes;

function invoke(handler, method, url, options = {}) {
  return new Promise((resolve) => {
    const parsed = new URL(url, 'http://localhost');
    const req = new http.IncomingMessage(null);
    req.method = method;
    req.url = url;
    req.headers = options.headers || {};
    req.query = Object.fromEntries(parsed.searchParams);
    req.params = options.params || {};

    const res = new http.ServerResponse(req);
    let statusCode = 200;
    let responseBody = null;
    let ended = false;

    res.setHeader = () => {};
    res.status = (code) => {
      statusCode = code;
      return res;
    };
    res.json = (data) => {
      responseBody = data;
      if (!ended) {
        ended = true;
        resolve({ status: statusCode, body: responseBody });
      }
    };
    res.send = (data) => {
      responseBody = data;
      if (!ended) {
        ended = true;
        resolve({ status: statusCode, body: responseBody });
      }
    };
    res.end = () => {
      if (!ended) {
        ended = true;
        resolve({ status: statusCode, body: responseBody });
      }
    };

    handler(req, res);
  });
}

test('service: listCards returns paginated results with defaults', () => {
  const result = cardsService.listCards({});
  assert.ok(!result.errors);
  assert.strictEqual(result.limit, 50);
  assert.strictEqual(result.offset, 0);
  assert.strictEqual(result.items.length, 50);
  assert.ok(result.total > 900, 'full set listed');
});

test('service: rarity filter and validation', () => {
  const legendary = cardsService.listCards({ rarity: 'legendary', limit: 200 });
  assert.ok(!legendary.errors);
  assert.strictEqual(legendary.total, ARCHETYPES.length);
  assert.ok(legendary.items.every((c) => c.rarity === 'legendary'));

  const bad = cardsService.listCards({ rarity: 'mythical' });
  assert.ok(bad.errors && bad.errors.length > 0);
});

test('service: variant, pantheon, flagship, q filters', () => {
  const foils = cardsService.listCards({ variant: 'original-script', limit: 200 });
  assert.ok(foils.items.every((c) => c.variant === 'original-script'));
  assert.ok(foils.items.every((c) => c.rarity === 'mythic'));

  const greek = cardsService.listCards({ pantheon: 'greek', limit: 200 });
  assert.ok(greek.items.every((c) => c.pantheon === 'greek'));

  const flags = cardsService.listCards({ flagship: 'true', variant: 'standard', limit: 200 });
  assert.strictEqual(flags.total, ARCHETYPES.length);
  const allFlags = cardsService.listCards({ flagship: 'true', limit: 200 });
  assert.ok(allFlags.total >= ARCHETYPES.length, 'flagship foils included');

  const search = cardsService.listCards({ q: 'thunder', limit: 50 });
  assert.ok(search.total > 0);

  const badFlag = cardsService.listCards({ flagship: 'yes' });
  assert.ok(badFlag.errors);
});

test('service: sorting and pagination are consistent', () => {
  const page1 = cardsService.listCards({ sort: 'name', limit: 25, offset: 0 });
  const page2 = cardsService.listCards({ sort: 'name', limit: 25, offset: 25 });
  assert.strictEqual(page1.items.length, 25);
  assert.strictEqual(page2.items.length, 25);
  assert.notStrictEqual(page1.items[0].id, page2.items[0].id);
  const names = page1.items.map((c) => c.name);
  const sorted = [...names].sort((a, b) => a.localeCompare(b));
  assert.deepStrictEqual(names, sorted);
});

test('service: getCardsForEntry returns all variants', () => {
  const zeus = cardsService.getCardsForEntry('zeus');
  assert.ok(zeus);
  assert.strictEqual(zeus.entryId, 'zeus');
  assert.ok(zeus.variants.length >= 1);
  const standard = zeus.variants.find((v) => v.variant === 'standard');
  assert.ok(standard);
  assert.strictEqual(standard.rarity, 'legendary');
  assert.ok(standard.links.temple === '/sites/zeus/');

  assert.strictEqual(cardsService.getCardsForEntry('definitely-not-an-entry'), null);
});

test('service: getSetInfo reports counts', () => {
  const info = cardsService.getSetInfo();
  assert.ok(info);
  assert.ok(info.totalCards > 900);
  assert.ok(info.flagshipCards >= ARCHETYPES.length, 'flagship standard + foils counted');
  assert.ok(info.counts.byRarity.legendary === ARCHETYPES.length);
  assert.ok(info.counts.byVariant.standard > 0);
});

test('GET /api/v1/cards returns the success envelope with pagination meta', async () => {
  const { status, body } = await invoke(listHandler, 'GET', '/api/v1/cards?limit=5');
  assert.strictEqual(status, 200);
  assert.strictEqual(body.success, true);
  assert.strictEqual(body.data.length, 5);
  assert.strictEqual(body.meta.pagination.limit, 5);
  assert.strictEqual(body.meta.pagination.total > 900, true);
  assert.ok(body.meta.pagination.next.includes('offset=5'));
});

test('GET /api/v1/cards validates query parameters', async () => {
  const { status, body } = await invoke(listHandler, 'GET', '/api/v1/cards?limit=5000');
  assert.strictEqual(status, 400);
  assert.strictEqual(body.success, false);
  assert.strictEqual(body.error.code, 'VALIDATION_ERROR');
});

test('GET /api/v1/cards rejects non-GET methods', async () => {
  const { status, body } = await invoke(listHandler, 'POST', '/api/v1/cards');
  assert.strictEqual(status, 405);
  assert.strictEqual(body.error.code, 'METHOD_NOT_ALLOWED');
});

test('GET /api/v1/cards/:id returns every variant for an entry', async () => {
  const { status, body } = await invoke(listHandler, 'GET', '/api/v1/cards?variant=standard');
  assert.strictEqual(status, 200);

  const detail = await invoke(detailHandler, 'GET', '/api/v1/cards/zeus?id=zeus');
  assert.strictEqual(detail.status, 200);
  assert.strictEqual(detail.body.success, true);
  assert.strictEqual(detail.body.data.entryId, 'zeus');
  assert.ok(detail.body.data.variants.length >= 1);
  assert.ok(detail.body.links.self === '/api/v1/cards/zeus');
});

test('GET /api/v1/cards/:id returns 404 for unknown entries', async () => {
  const { status, body } = await invoke(detailHandler, 'GET', '/api/v1/cards/nope?id=nope');
  assert.strictEqual(status, 404);
  assert.strictEqual(body.error.code, 'NOT_FOUND');
});

test('every flagship entry resolves through the API detail route', async () => {
  for (const arch of ARCHETYPES) {
    resetLimiters(); // stay under the per-window rate limit for the loop
    const { status, body } = await invoke(
      detailHandler,
      'GET',
      `/api/v1/cards/${arch.id}?id=${arch.id}`
    );
    assert.strictEqual(status, 200, `${arch.id} resolves`);
    const standard = body.data.variants.find((v) => v.variant === 'standard');
    assert.ok(standard, `${arch.id} has standard variant`);
    assert.strictEqual(standard.rarity, 'legendary', `${arch.id} legendary via API`);
  }
});

console.log('Cards API test module loaded.');
