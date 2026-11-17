'use strict';
/**
 * ASCII-doctrine regression suite (2026-11 wave).
 *
 * A flagship whose canonical name (lexicon unicode) is pure ASCII has no
 * marks to restore. These tests pin the doctrine across the flagship
 * rebuild: no false mark/restoration claims, honest chrome/meta, provenance-
 * correct script-page labels, and doctrine-honest canonical blog JSONs.
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const { LEXICON } = require(path.join(ROOT, 'type', 'js', 'lexicon.js'));
const { ARCHETYPES } = require(path.join(ROOT, 'js', 'archetypes-v2.js'));

const BUILT = new Set(ARCHETYPES.filter((a) => a.built).map((a) => a.id));
const ASCII_IDS = LEXICON.filter(
  (e) => BUILT.has(e.id) && /^[\x00-\x7F]+$/.test(e.unicode)
).map((e) => e.id);
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

// Deterministic samples across pantheon families + the audit's worst cases.
const SAMPLE = ['loki', 'amaterasu', 'indra', 'aengus', 'altjira', 'osiris', 'hebe', 'arete', 'moirai', 'hananim', 'adad', 'venus', 'kanaloa', 'freyja', 'nut'].filter((id) =>
  fs.existsSync(path.join(ROOT, 'sites', id, 'index.html'))
);
const SAMPLE_SET = new Set(SAMPLE);

const FORBIDDEN = [
  /original diacritics/,
  /technological compromise/i,
  /the tier speaks/i,
  /is unregistrable/i,
  /full restoration/i,
  /the plain form conceals/i,
];

test('ASCII-canonical sample: no false mark/restoration claims on any page', () => {
  for (const id of SAMPLE) {
    const entry = LEXICON.find((e) => e.id === id);
    if (!entry || !/^[\x00-\x7F]+$/.test(entry.unicode)) continue;
    for (const page of ['index.html', 'lore/index.html', 'lore/extended/index.html']) {
      const file = path.join(ROOT, 'sites', id, page);
      if (!fs.existsSync(file)) continue;
      const html = read(`sites/${id}/${page}`);
      for (const re of FORBIDDEN) {
        assert.ok(!re.test(html), `${id}/${page}: forbidden claim ${re}`);
      }
    }
  }
});

test('ASCII-canonical footer: honest tagline, 983 count, no restoration framing', () => {
  for (const id of SAMPLE) {
    const entry = LEXICON.find((e) => e.id === id);
    if (!entry || !/^[\x00-\x7F]+$/.test(entry.unicode)) continue;
    const html = read(`sites/${id}/index.html`);
    assert.match(html, /recorded under its canonical spelling/, `${id}: footer tagline`);
    assert.match(html, /one of 983/, `${id}: lexicon count`);
  }
});

test('lore card: ASCII Form title on ASCII temples; ASCII Constraint only on marked', () => {
  assert.match(read('sites/loki/lore/index.html'), /ASCII Form/);
  assert.ok(!/ASCII Constraint/.test(read('sites/loki/lore/index.html')), 'loki must not carry ASCII Constraint title');
  assert.match(read('sites/zeus/lore/index.html'), /ASCII Constraint/);
});

test('script pages: reconstructed specimens labelled honestly, attested keepers unchanged', () => {
  assert.match(read('sites/loki/script/index.html'), /Reconstructed Specimen/);
  assert.ok(!/attested original script/.test(read('sites/loki/script/index.html')), 'loki script page must not claim attestation');
  assert.match(read('sites/amaterasu/script/index.html'), /attested original script/);
  assert.match(read('sites/osiris/script/index.html'), /attested original script/);
});

test('pronunciation pages: canonical-orthography pill on ASCII names, restored kept on marked', () => {
  assert.match(read('sites/loki/pronunciation/index.html'), /Derived from the canonical orthography/);
  assert.ok(!/restored orthography/.test(read('sites/loki/pronunciation/index.html')));
  assert.match(read('sites/zeus/pronunciation/index.html'), /restored orthography/);
});

test('main meta: canonical-name framing on ASCII temples', () => {
  for (const id of ['loki', 'amaterasu', 'indra', 'aengus']) {
    const html = read(`sites/${id}/index.html`);
    assert.match(html, new RegExp(`the canonical \\w+ name`), `${id}: meta uses 'canonical … name'`);
    assert.ok(!new RegExp(`the restored \\w+ name`).test(html), `${id}: meta must not say 'the restored … name'`);
  }
});

test('blog canonical JSONs: no attestation claims for reconstructed specimens', () => {
  for (const id of ['loki', 'freyja', 'baldr', 'ymir', 'sleipnir', 'wyrd', 'nut']) {
    const file = path.join(ROOT, 'platform', 'blog', 'series', 'canonical', `${id}.json`);
    if (!fs.existsSync(file)) continue;
    const body = read(`platform/blog/series/canonical/${id}.json`);
    assert.ok(!/The attested form is/.test(body), `${id}: reconstructed specimen must not claim attestation`);
  }
  // Attested keepers retain the claim.
  assert.match(read('platform/blog/series/canonical/osiris.json'), /The attested form is/);
});

test('blog restoration JSONs: ASCII posts carry no marks-heading', () => {
  for (const id of ['loki', 'aengus', 'inanna', 'osiris', 'hebe', 'amaterasu']) {
    const file = path.join(ROOT, 'platform', 'blog', 'series', 'restoration', `${id}.json`);
    if (!fs.existsSync(file)) continue;
    const body = read(`platform/blog/series/restoration/${id}.json`);
    assert.ok(!/The Name Before the Marks/.test(body), `${id}: ASCII post must not carry marks heading`);
  }
});

test('metztli lore meta: no doubled scholarly prefix', () => {
  const html = read('sites/metztli/lore/index.html');
  const desc = (html.match(/name="description" content="([^"]*)"/) || [])[1] || '';
  const hits = desc.match(/Scholarly (record|restoration) of/g) || [];
  assert.ok(hits.length <= 1, `metztli lore description doubled the prefix: ${desc.slice(0, 120)}`);
});
