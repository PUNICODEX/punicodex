/**
 * Pronunciation Engine + Endpoint + Temple Panel Tests
 *
 * Covers the three surfaces of the pronunciation rules engine:
 *   1. Engine: derivePronunciation output shape, syllables, stress, contour,
 *      and the mora timing model for representative entries.
 *   2. Route resolution: /api/v1/names/pronunciation resolves STATICALLY
 *      (beating names/[id]), /api/v1/names/apollon stays dynamic, unknown
 *      paths get the router's 404 envelope.
 *   3. Endpoint: the handler returns the full payload including timing;
 *      unknown ids 404, missing id 400, non-GET 405.
 *   4. Temple panel: the regenerated flagship home pages carry the
 *      "Say it right" panel (or omit it honestly for fallback pantheons).
 */

const assert = require('node:assert');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { URL } = require('node:url');
const test = require('node:test');

const { prepareTestDb } = require('./helpers/test-db.js');
prepareTestDb(__filename);

const ROOT = path.join(__dirname, '..');
const { derivePronunciation } = require('../type/js/pronunciation-rules.js');
const { LEXICON } = require('../type/js/lexicon.js');

const byId = new Map(LEXICON.map((e) => [e.id, e]));

// ---------------------------------------------------------------------------
// Handler invocation helper (same stub shape as test/api-v1.test.js)
// ---------------------------------------------------------------------------

function invoke(handler, method, url, options = {}) {
  return new Promise((resolve) => {
    const parsed = new URL(url, 'http://localhost');
    const req = new http.IncomingMessage(null);
    req.method = method;
    req.url = url;
    req.headers = options.headers || {};
    req.body = options.body || null;
    req.query = Object.fromEntries(parsed.searchParams);
    if (options.query) Object.assign(req.query, options.query);
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

// ---------------------------------------------------------------------------
// 1. Engine
// ---------------------------------------------------------------------------

test('engine: ares derives classical syllables, stress, contour, timing', () => {
  const d = derivePronunciation(byId.get('ares'));
  assert.deepStrictEqual(d.syllables, ['a', 'rɛːs']);
  assert.strictEqual(d.stressIndex, 0);
  assert.strictEqual(d.derived, true);
  assert.strictEqual(d.conventional, false);
  assert.deepStrictEqual(d.timing.morae, [1, 3]);
  assert.strictEqual(d.timing.totalMorae, 4);
  assert.strictEqual(d.timing.beats, '˘ ¯˘');
  assert.strictEqual(d.timing.contour, 'rise'); // acute on Á
  assert.strictEqual(d.timing.moraMs, 110);
  assert.strictEqual(d.timing.durationMs, 440);
  assert.strictEqual(d.timing.perSyllable.length, 2);
  assert.strictEqual(d.timing.perSyllable[0].stressed, true);
  assert.strictEqual(d.timing.perSyllable[0].contour, 'rise');
  assert.strictEqual(d.timing.perSyllable[1].contour, 'flat');
  assert.strictEqual(d.respelling, 'AH-rays');
  assert.ok(d.ssml.includes('<phoneme alphabet="ipa"'));
});

test('engine: zeus derives zd + diphthong with acute rise contour', () => {
  const d = derivePronunciation(byId.get('zeus'));
  assert.deepStrictEqual(d.syllables, ['zdeu̯s']);
  assert.strictEqual(d.stressIndex, 0);
  assert.deepStrictEqual(d.timing.morae, [3]); // diphthong (2) + closed coda (+0.5 → 3)
  assert.strictEqual(d.timing.totalMorae, 3);
  assert.strictEqual(d.timing.contour, 'rise');
  assert.strictEqual(d.timing.durationMs, 330);
});

test('engine: quetzalcoatl derives nahuatl clusters and penult weight stress', () => {
  const d = derivePronunciation(byId.get('quetzalcoatl'));
  assert.deepStrictEqual(d.syllables, ['ke', 't͡sal', 'koː', 'aːt͡ɬ']);
  assert.strictEqual(d.stressIndex, 2); // penultimate
  assert.deepStrictEqual(d.timing.morae, [1, 2, 2, 3]);
  assert.strictEqual(d.timing.totalMorae, 8);
  assert.strictEqual(d.timing.beats, '˘ ¯ ¯ ¯˘');
  assert.strictEqual(d.timing.contour, 'heavy'); // no accent mark in the restoration
  assert.strictEqual(d.timing.moraMs, 95);
  assert.strictEqual(d.timing.durationMs, 760);
  assert.ok(
    d.notes.some((n) => n.includes('whispered')),
    'tl note present'
  );
});

test('engine: odinn derives norse quantity with first-syllable stress', () => {
  const d = derivePronunciation(byId.get('odinn'));
  assert.deepStrictEqual(d.syllables, ['oː', 'ðinː']);
  assert.strictEqual(d.stressIndex, 0);
  assert.deepStrictEqual(d.timing.morae, [2, 2]); // long vowel; geminate nn
  assert.strictEqual(d.timing.totalMorae, 4);
  assert.strictEqual(d.timing.contour, 'heavy'); // lexical first-syllable stress
  assert.strictEqual(d.timing.moraMs, 105);
  assert.strictEqual(d.timing.durationMs, 420);
});

test('engine: egyptian is conventional, japanese has flat contour', () => {
  const ra = derivePronunciation(byId.get('ra'));
  assert.strictEqual(ra.derived, true);
  assert.strictEqual(ra.conventional, true);
  assert.strictEqual(ra.timing.conventional, true);
  assert.ok(ra.notes.some((n) => n.includes('convention')));
  const tokyo = derivePronunciation(byId.get('tokyo'));
  assert.strictEqual(tokyo.stressIndex, null);
  assert.strictEqual(tokyo.timing.contour, 'flat');
  assert.deepStrictEqual(tokyo.timing.morae, [2, 2]); // toː.kjoː = 4 morae
  assert.strictEqual(tokyo.timing.moraMs, 80);
});

test('engine: fallback pantheon returns derived:false and timing:null', () => {
  const d = derivePronunciation(byId.get('gilgamesh')); // mesopotamian
  assert.strictEqual(d.derived, false);
  assert.strictEqual(d.timing, null);
  assert.strictEqual(d.conventional, false);
  assert.ok(d.notes.some((n) => n.includes('No pronunciation rule set')));
});

test('engine: deriveRespelling timed mode marks length naturally', () => {
  const { deriveRespelling } = require('../type/js/pronunciation-rules.js');
  assert.strictEqual(deriveRespelling(['a', 'rɔːk', 'nɛː'], 1), 'ah-RAWK-nay');
  assert.strictEqual(deriveRespelling(['a', 'rɔːk', 'nɛː'], 1, true), 'a-RAWK-nay');
  assert.ok(!deriveRespelling(['a', 'rɔːk', 'nɛː'], 1, true).includes('naaay'));
});

// ---------------------------------------------------------------------------
// 2. Route resolution (drives the real v1 catch-all router)
// ---------------------------------------------------------------------------

const v1Router = require('../api/v1/[[...slug]].js');

test('route: /api/v1/names/pronunciation resolves statically, not as names/[id]', async () => {
  // If the dynamic names/[id] route won, id would be "pronunciation" and the
  // names/[id] handler would 404 — a 200 pronunciation payload proves the
  // static route matched.
  const { status, body } = await invoke(v1Router, 'GET', '/api/v1/[[...slug]]', {
    query: { slug: 'names/pronunciation', id: 'ares' },
  });
  assert.strictEqual(status, 200);
  assert.strictEqual(body.success, true);
  assert.strictEqual(body.data.id, 'ares');
  assert.ok(body.data.timing, 'engine timing payload present');
});

test('route: /api/v1/names/apollon still resolves dynamically', async () => {
  const { status, body } = await invoke(v1Router, 'GET', '/api/v1/[[...slug]]', {
    query: { slug: 'names/apollon' },
  });
  assert.strictEqual(status, 200);
  assert.strictEqual(body.success, true);
  assert.strictEqual(body.data.id, 'apollon');
});

test('route: /api/v1/names/apollon/pronunciation resolves the 3-segment route', async () => {
  const { status, body } = await invoke(v1Router, 'GET', '/api/v1/[[...slug]]', {
    query: { slug: 'names/apollon/pronunciation' },
  });
  assert.strictEqual(status, 200);
  assert.strictEqual(body.data.id, 'apollon');
  assert.ok(body.data.timing);
});

test('route: unknown path under names gets the 404 envelope', async () => {
  const { status, body } = await invoke(v1Router, 'GET', '/api/v1/[[...slug]]', {
    query: { slug: 'names/doesnotexist/pronunciation' },
  });
  assert.strictEqual(status, 404);
  assert.strictEqual(body.success, false);
  assert.strictEqual(body.error.code, 'NOT_FOUND');
});

// ---------------------------------------------------------------------------
// 3. Endpoint handler
// ---------------------------------------------------------------------------

const handler = require('../platform/api-handlers/v1/names/pronunciation/index.js');

test('endpoint: GET with query id returns the full payload incl. timing', async () => {
  const { status, body } = await invoke(handler, 'GET', '/api/v1/names/pronunciation?id=ares');
  assert.strictEqual(status, 200);
  assert.strictEqual(body.success, true);
  const d = body.data;
  assert.strictEqual(d.id, 'ares');
  for (const field of [
    'ipa',
    'ipaLabel',
    'syllables',
    'stressIndex',
    'respelling',
    'ssml',
    'notes',
    'timing',
    'derived',
    'conventional',
  ]) {
    assert.ok(field in d, `payload has ${field}`);
  }
  for (const field of [
    'morae',
    'totalMorae',
    'contour',
    'beats',
    'moraMs',
    'durationMs',
    'perSyllable',
  ]) {
    assert.ok(field in d.timing, `timing has ${field}`);
  }
  assert.deepStrictEqual(d.timing.morae, [1, 3]);
  assert.strictEqual(d.timing.beats, '˘ ¯˘');
  assert.strictEqual(body.meta.version, 'v1');
});

test('endpoint: GET via dynamic params id (3-segment route shape)', async () => {
  const { status, body } = await invoke(handler, 'GET', '/api/v1/names/zeus/pronunciation', {
    params: { id: 'zeus' },
  });
  assert.strictEqual(status, 200);
  assert.strictEqual(body.data.id, 'zeus');
});

test('endpoint: unknown id returns 404', async () => {
  const { status, body } = await invoke(handler, 'GET', '/api/v1/names/pronunciation?id=nope');
  assert.strictEqual(status, 404);
  assert.strictEqual(body.success, false);
  assert.strictEqual(body.error.code, 'NOT_FOUND');
});

test('endpoint: missing id returns 400, non-GET returns 405', async () => {
  const missing = await invoke(handler, 'GET', '/api/v1/names/pronunciation');
  assert.strictEqual(missing.status, 400);
  assert.strictEqual(missing.body.error.code, 'VALIDATION_ERROR');
  const posted = await invoke(handler, 'POST', '/api/v1/names/pronunciation?id=ares');
  assert.strictEqual(posted.status, 405);
  assert.strictEqual(posted.body.error.code, 'METHOD_NOT_ALLOWED');
});

// ---------------------------------------------------------------------------
// 4. Temple panel
// ---------------------------------------------------------------------------

test('panel: sites/ares carries respelling, beats, chips and no placeholders', () => {
  const html = fs.readFileSync(path.join(ROOT, 'sites', 'ares', 'index.html'), 'utf8');
  assert.ok(html.includes('id="say-it-right"'), 'panel section present');
  assert.ok(html.includes('pronunciation-respelling'), 'respelling element present');
  assert.ok(html.includes('AH-rays'), 'ares respelling rendered');
  assert.ok(html.includes('˘ ¯˘'), 'beat string rendered');
  assert.ok(html.includes('pronunciation-chip'), 'mora chips rendered');
  assert.ok(!/\{\{[^}]+\}\}/.test(html), 'no raw placeholders left');
});

test('panel: quetzalcoatl and odinn carry derived panels', () => {
  const q = fs.readFileSync(path.join(ROOT, 'sites', 'quetzalcoatl', 'index.html'), 'utf8');
  assert.ok(q.includes('keh-tsahl-KOH-ahtl'), 'quetzalcoatl respelling rendered');
  assert.ok(q.includes('˘ ¯ ¯ ¯˘'), 'quetzalcoatl beats rendered');
  const o = fs.readFileSync(path.join(ROOT, 'sites', 'odinn', 'index.html'), 'utf8');
  assert.ok(o.includes('OH-theen'), 'odinn respelling rendered');
  assert.ok(!/\{\{[^}]+\}\}/.test(o), 'odinn has no raw placeholders');
});

test('panel: egyptian flagship is labelled Conventional reading', () => {
  const html = fs.readFileSync(path.join(ROOT, 'sites', 'ra', 'index.html'), 'utf8');
  assert.ok(html.includes('id="say-it-right"'), 'egyptian panel present');
  assert.ok(html.includes('Conventional reading'), 'conventional badge present');
});

test('panel: fallback pantheon flagship omits the panel', () => {
  const html = fs.readFileSync(path.join(ROOT, 'sites', 'ishtar', 'index.html'), 'utf8');
  assert.ok(!html.includes('id="say-it-right"'), 'panel omitted for mesopotamian (fallback)');
  assert.ok(!/\{\{[^}]+\}\}/.test(html), 'no raw placeholders left');
});
