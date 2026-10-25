#!/usr/bin/env node
/**
 * PuniCodex — licensed creative artworks (P4) contract tests.
 *
 * Covers the fulfillment print-file resolution for artwork keys (brand arts
 * and `creative:<id>` temple creatives) and the schema of the committed
 * creative-artworks index produced by scripts/sync-store-creatives.js.
 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const INDEX_FILE = path.join(ROOT, 'store', 'creative-artworks.json');

const { artworkFileFor } = require('../platform/api/store-orders');

// The committed index (absent until the first licensed creative syncs).
let index = {};
try {
  index = JSON.parse(fs.readFileSync(INDEX_FILE, 'utf8'));
} catch {
  index = {};
}

test('brand artwork keys resolve to a public print file', () => {
  const productId = 'aigyptos-tee';
  const file = artworkFileFor(productId, 'mascot');
  assert.ok(file, 'mascot should resolve');
  assert.match(file.url, /^https:\/\//);
  assert.match(file.url, /\.png$/);
  assert.strictEqual(file.type, 'default');
});

test('cap artwork uses the embroidery file type', () => {
  const file = artworkFileFor('aigyptos-cap', 'logomark');
  assert.ok(file);
  assert.strictEqual(file.type, 'embroidery_front');
});

test('absent or unknown keys resolve to null (default print file)', () => {
  assert.strictEqual(artworkFileFor('aigyptos-tee', null), null);
  assert.strictEqual(artworkFileFor('aigyptos-tee', ''), null);
  assert.strictEqual(artworkFileFor('aigyptos-tee', 'no-such-art'), null);
  assert.strictEqual(artworkFileFor('aigyptos-tee', 42), null);
});

test('creative:<id> keys resolve only from the licensed index', () => {
  const temples = Object.keys(index);
  if (!temples.length) {
    // No licensed creatives yet — the gate must still fail closed.
    assert.strictEqual(artworkFileFor('aigyptos-tee', 'creative:1'), null);
    return;
  }
  const temple = temples[0];
  const creative = index[temple][0];
  const productId = `${temple}-tee`;
  const file = artworkFileFor(productId, `creative:${creative.id}`);
  assert.ok(file, `creative:${creative.id} should resolve for ${productId}`);
  assert.strictEqual(file.url, creative.printUrl);
  // A creative must never fulfil on another temple's product.
  const otherTemple = temples.length > 1 ? temples[1] : 'zzzz-not-a-temple';
  assert.strictEqual(
    artworkFileFor(`${otherTemple}-tee`, `creative:${creative.id}`),
    null,
  );
});

test('the committed index schema is well-formed', () => {
  for (const [temple, list] of Object.entries(index)) {
    assert.ok(/^[a-z0-9-]+$/i.test(temple), `temple id "${temple}" looks wrong`);
    assert.ok(Array.isArray(list));
    assert.ok(list.length <= 6, 'max 6 licensed creatives per temple');
    for (const c of list) {
      assert.ok(Number.isInteger(c.id), 'creative id must be an integer');
      assert.ok(typeof c.title === 'string' && c.title.length > 0, 'title required');
      assert.match(c.src, /^\/assets\/store-creatives\/\d+\.webp$/);
      assert.match(c.printUrl, /^https:\/\/punicodex\.com\/assets\/store-creatives\/\d+\.png$/);
      const local = path.join(ROOT, c.src.replace(/^\//, ''));
      assert.ok(fs.existsSync(local), `${c.src} must exist on disk`);
    }
  }
});
