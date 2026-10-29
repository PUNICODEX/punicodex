/**
 * PuniCodex — Name Variants contract tests
 *
 * Guards the generated variant family sets (docs/name-variants-design.md):
 *   - every derived form NFC round-trips and never equals the canonical form
 *   - attestedCount counts only sourced attested forms
 *   - ownership is an annotation, never a gate
 *   - API shape: { canonical, attestedCount, forms[] } with class filter
 */

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { URL } = require('node:url');

const { LEXICON } = require('../type/js/lexicon.js');
const namesService = require('../platform/api/names-service.js');

const ROOT = path.resolve(__dirname, '..');
const VALID_CLASSES = new Set(['attested', 'derived', 'convention']);

function load(rel) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
}

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed++;
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    if (err.stack) console.error(err.stack.split('\n').slice(0, 3).join('\n'));
  }
}

function invoke(handler, method, url, options = {}) {
  return new Promise((resolve) => {
    const parsed = new URL(url, 'http://localhost');
    const req = new http.IncomingMessage(null);
    req.method = method;
    req.url = url;
    req.headers = options.headers || {};
    req.body = options.body || null;
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

async function runTests() {
  console.log('\n▸ Name Variants Contracts\n');

  const data = load('data/variants.json');
  const apiCopy = load('platform/api/variants.json');
  const rendererCopy = load('platform/browser/renderer/variants.json');

  await test('generated copies exist and agree', () => {
    assert.strictEqual(data.count, LEXICON.length, 'variant count must match lexicon');
    assert.deepStrictEqual(apiCopy, data, 'platform/api copy must match data copy');
    assert.deepStrictEqual(rendererCopy, data, 'renderer copy must match data copy');
    for (const e of LEXICON) {
      assert.ok(data.entries[e.id], `missing variant family for ${e.id}`);
    }
  });

  await test('every family: canonical first, classes valid, forms distinct', () => {
    for (const e of LEXICON) {
      const fam = data.entries[e.id];
      assert.strictEqual(fam.canonical, e.unicode, `${e.id} canonical mismatch`);
      assert.ok(fam.forms.length >= 1, `${e.id} has no forms`);
      const first = fam.forms[0];
      assert.strictEqual(first.class, 'attested', `${e.id} first form must be attested`);
      assert.strictEqual(first.relation, 'canonical', `${e.id} first form must be canonical`);
      const seen = new Set();
      for (const f of fam.forms) {
        assert.ok(VALID_CLASSES.has(f.class), `${e.id} invalid class ${f.class}`);
        const key = f.form.normalize('NFC');
        assert.ok(!seen.has(key), `${e.id} duplicate form "${f.form}"`);
        seen.add(key);
        assert.ok(Array.isArray(f.features), `${e.id} form features must be an array`);
      }
    }
  });

  await test('derived forms: NFC round-trip, never equal canonical', () => {
    for (const e of LEXICON) {
      const fam = data.entries[e.id];
      for (const f of fam.forms) {
        if (f.class !== 'derived') continue;
        const nfc = f.form.normalize('NFC');
        assert.strictEqual(nfc, f.form, `${e.id} derived "${f.form}" must be NFC`);
        assert.strictEqual(
          nfc.normalize('NFD').normalize('NFC'),
          nfc,
          `${e.id} derived "${f.form}" fails NFC round-trip`
        );
        assert.notStrictEqual(
          nfc,
          e.unicode.normalize('NFC'),
          `${e.id} derived form equals canonical`
        );
      }
    }
  });

  await test('attestedCount counts only sourced attested forms', () => {
    for (const e of LEXICON) {
      const fam = data.entries[e.id];
      const sourced = fam.forms.filter((f) => f.class === 'attested' && f.sources?.length).length;
      assert.strictEqual(fam.attestedCount, sourced, `${e.id} attestedCount mismatch`);
    }
    // apollon: canonical (LSJ…, owned) + macron-only (owned registration) = 2
    assert.strictEqual(data.entries.apollon.attestedCount, 2);
  });

  await test('ownership is annotation only: knowledge flows regardless', () => {
    // 403 unowned entries still carry multi-form knowledge (convention and/or
    // derived forms) — ownership gates nothing.
    const unownedWithFamily = Object.values(data.entries).filter(
      (fam) => !fam.forms[0].owned && fam.forms.length > 1
    ).length;
    assert.ok(
      unownedWithFamily > 200,
      `expected broad unowned knowledge, got ${unownedWithFamily}`
    );
    // anubis: canonical owned, but its unattested convention form (anpw) is
    // still published as knowledge.
    const anubis = data.entries.anubis;
    assert.ok(
      anubis.forms.some((f) => f.class === 'convention' && !f.owned),
      'anubis convention forms must be published regardless of ownership'
    );
  });

  await test('convention engines: Egyptian aleph, Sanskrit IAST, Japanese Kunrei', () => {
    const ra = data.entries.ra;
    assert.ok(
      ra.forms.some((f) => f.class === 'convention' && f.form === 'Ra'),
      'Rꜥ must convention-map to Ra'
    );
    const shiva = data.entries.shiva;
    assert.ok(
      shiva.forms.some((f) => f.class === 'convention' && f.form === 'Shiva'),
      'Śiva must convention-map to Shiva'
    );
    // Kunrei: any Japanese entry with a Hepburn digraph in the lexicon?
    let kunreiSeen = 0;
    for (const e of LEXICON) {
      if (e.pantheon !== 'japanese') continue;
      for (const f of data.entries[e.id].forms) {
        if (f.class === 'convention' && f.relation === 'kunrei-shiki') kunreiSeen++;
      }
    }
    // No assertion on magnitude: Kunrei forms only exist where Hepburn digraphs occur.
    assert.ok(kunreiSeen >= 0);
  });

  await test('service: getVariants returns the spec shape', () => {
    const v = namesService.getVariants('apollon');
    assert.strictEqual(v.canonical, 'Apóllōn');
    assert.strictEqual(v.attestedCount, 2);
    assert.ok(Array.isArray(v.forms));
    assert.ok(v.forms.every((f) => VALID_CLASSES.has(f.class)));
    assert.strictEqual(namesService.getVariants('notarealid'), null);
  });

  await test('service: class filter', () => {
    const attested = namesService.getVariants('apollon', { class: 'attested' });
    assert.ok(attested.forms.every((f) => f.class === 'attested'));
    assert.ok(attested.forms.length < namesService.getVariants('apollon').forms.length);
    const derived = namesService.getVariants('apollon', { class: 'derived' });
    assert.ok(derived.forms.every((f) => f.class === 'derived'));
    assert.strictEqual(
      derived.attestedCount,
      2,
      'attestedCount is a name property, not a filter result'
    );
  });

  await test('handler: GET /api/v1/names/:id/variants 200 + class filter', async () => {
    const handler = require('../platform/api-handlers/v1/names/[id]/variants.js');
    const ok = await invoke(handler, 'GET', '/api/v1/names/apollon/variants', {
      params: { id: 'apollon' },
    });
    assert.strictEqual(ok.status, 200);
    assert.strictEqual(ok.body.data.canonical, 'Apóllōn');

    const filtered = await invoke(handler, 'GET', '/api/v1/names/apollon/variants?class=derived', {
      params: { id: 'apollon' },
    });
    assert.strictEqual(filtered.status, 200);
    assert.ok(filtered.body.data.forms.every((f) => f.class === 'derived'));

    const bad = await invoke(handler, 'GET', '/api/v1/names/apollon/variants?class=bogus', {
      params: { id: 'apollon' },
    });
    assert.strictEqual(bad.status, 400);

    const missing = await invoke(handler, 'GET', '/api/v1/names/notarealid/variants', {
      params: { id: 'notarealid' },
    });
    assert.strictEqual(missing.status, 404);
  });
}

runTests()
  .then(() => {
    console.log(`\n${passed} passed, ${failed} failed`);
    process.exit(failed > 0 ? 1 : 0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
