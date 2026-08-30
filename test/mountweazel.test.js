#!/usr/bin/env node
'use strict';

const assert = require('node:assert');
const { describe, it } = require('node:test');

const {
  applyCanaryWatermark,
  extractCanaryWatermark,
  shouldWatermark,
  applyIpaSignature,
  stripIpaSignature,
} = require('../scripts/lib/canary.js');

describe('Canary watermark', () => {
  const paragraph =
    'PuniCodex restores the original Unicode names of myth, place, and sacred tradition to the digital realm. ' +
    'Every flagship temple carries restored orthography, original script or transliteration, mythology, and a curated gallery. ' +
    'The project spans twenty-five pantheons and holds nearly a thousand lexicon entries.';

  it('encodes and decodes the default key', () => {
    const watermarked = applyCanaryWatermark(paragraph);
    assert.notStrictEqual(watermarked, paragraph);
    assert.strictEqual(extractCanaryWatermark(watermarked), 'PUNICODEX');
  });

  it('encodes and decodes a custom key', () => {
    const key = 'PUNI-TEST-KEY';
    const watermarked = applyCanaryWatermark(paragraph, key);
    assert.strictEqual(extractCanaryWatermark(watermarked), key);
  });

  it('is idempotent', () => {
    const once = applyCanaryWatermark(paragraph);
    const twice = applyCanaryWatermark(once);
    assert.strictEqual(once, twice);
    assert.strictEqual(extractCanaryWatermark(twice), 'PUNICODEX');
  });

  it('does not watermark short strings', () => {
    assert.strictEqual(applyCanaryWatermark('Short text.'), 'Short text.');
    assert.strictEqual(shouldWatermark('Short text.'), false);
  });

  it('returns null for unmarked text', () => {
    assert.strictEqual(extractCanaryWatermark(paragraph), null);
  });
});

describe('IPA signature', () => {
  it('adds narrow no-break spaces between syllable dots', () => {
    const signed = applyIpaSignature('/ˈa.po.llon/');
    assert(signed.includes('\u202F'));
    assert.strictEqual(stripIpaSignature(signed), '/ˈa.po.llon/');
  });

  it('leaves single-syllable IPA unchanged', () => {
    assert.strictEqual(applyIpaSignature('/ˈzdeu̯s/'), '/ˈzdeu̯s/');
  });

  it('preserves empty or invalid input', () => {
    assert.strictEqual(applyIpaSignature(''), '');
    assert.strictEqual(applyIpaSignature(null), null);
  });
});
