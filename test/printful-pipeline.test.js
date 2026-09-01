/**
 * PuniCodex — Printful mockup pipeline tests
 *
 * Guards the contracts that prevent store mockup reversion:
 *   - design asset URLs resolve to the deployed masters domain
 *   - missing local masters assets are auto-copied from sites/{id}/assets/
 *   - composite sync keeps .masters/ root in sync with the canonical source
 */

'use strict';

const assert = require('node:assert');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const {
  assetUrlFor,
  designFiles,
  ensureMastersAsset,
  KIND_PLACEMENTS,
} = require('../scripts/generate-printful-mockups.js');

function sampleProduct() {
  return {
    id: 'aengus-canvas',
    temple: 'aengus',
    printfulProductId: 123,
    assets: {
      compCanvas: '/sites/aengus/assets/aengus_comp-canvas.webp',
    },
    design: {
      placements: [{ area: 'front', asset: 'compCanvas' }],
    },
  };
}

test('assetUrlFor maps /sites/ webp paths to .masters root PNG URLs', () => {
  const p = sampleProduct();
  const url = assetUrlFor(p, 'compCanvas');
  assert.strictEqual(url, 'https://punycodex-masters.vercel.app/aengus_comp-canvas.png');
});

test('assetUrlFor returns null for missing assets', () => {
  assert.strictEqual(assetUrlFor(sampleProduct(), 'missingAsset'), null);
});

test('designFiles respects single-faced product placements', () => {
  const p = sampleProduct();
  const files = designFiles(p);
  assert.strictEqual(files.length, 1);
  assert.strictEqual(files[0].placement, 'default');
  assert.strictEqual(files[0].assetKey, 'compCanvas');
  assert.ok(files[0].url.includes('aengus_comp-canvas.png'));
});

test('designFiles skips back placement for single-faced products', () => {
  const p = {
    id: 'aengus-sticker',
    assets: { compSticker: '/sites/aengus/assets/aengus_comp-sticker.webp' },
    design: {
      placements: [
        { area: 'front', asset: 'compSticker' },
        { area: 'back', asset: 'compSticker' },
      ],
    },
  };
  const files = designFiles(p);
  assert.strictEqual(files.length, 1);
  assert.strictEqual(files[0].placement, 'default');
});

test('ensureMastersAsset copies missing /sites/ PNGs into .masters/ root', () => {
  const url = 'https://punycodex-masters.vercel.app/aengus_comp-canvas.png';
  const mastersFile = path.join(ROOT, '.masters', 'aengus_comp-canvas.png');

  // Ensure the local masters copy is present (it should be after sync).
  assert.ok(fs.existsSync(mastersFile), `.masters/aengus_comp-canvas.png exists`);

  // Rename it away temporarily, call ensureMastersAsset, verify it is restored.
  const backup = `${mastersFile}.testbak`;
  if (fs.existsSync(backup)) fs.unlinkSync(backup);
  fs.renameSync(mastersFile, backup);

  try {
    assert.strictEqual(ensureMastersAsset(url), true, 'ensureMastersAsset restores missing asset');
    assert.ok(fs.existsSync(mastersFile), 'missing asset was copied back to .masters/ root');
    assert.ok(fs.statSync(mastersFile).size > 0, 'restored asset is non-empty');
  } finally {
    if (fs.existsSync(backup)) {
      fs.unlinkSync(mastersFile);
      fs.renameSync(backup, mastersFile);
    }
  }
});

test('ensureMastersAsset returns false for assets that do not exist anywhere', () => {
  const url = 'https://punycodex-masters.vercel.app/definitely-missing_comp-canvas.png';
  assert.strictEqual(ensureMastersAsset(url), false);
});

test('sync-masters-composites keeps .masters/ root in sync with sites/', () => {
  // After the sync step, every composite in sites/{id}/assets/ must have a
  // matching file in .masters/ root (the Printful pipeline's public URL target).
  const sitesRoot = path.join(ROOT, 'sites');
  const mastersRoot = path.join(ROOT, '.masters');
  let checked = 0;
  for (const id of fs.readdirSync(sitesRoot)) {
    const assetsDir = path.join(sitesRoot, id, 'assets');
    if (!fs.existsSync(assetsDir)) continue;
    for (const name of fs.readdirSync(assetsDir)) {
      if (!/_comp-(canvas|mug|tote|sticker|notebook)\.png$/.test(name)) continue;
      assert.ok(
        fs.existsSync(path.join(mastersRoot, name)),
        `${id}: composite ${name} must be mirrored in .masters/ root`
      );
      checked++;
    }
  }
  assert.ok(checked >= 2710, `expected at least 2710 composites, found ${checked}`);
});

test('KIND_PLACEMENTS marks single-faced products with back: null', () => {
  const single = ['print', 'canvas', 'tumbler', 'sticker', 'pin', 'mug', 'phonecase', 'cap'];
  for (const kind of single) {
    assert.strictEqual(KIND_PLACEMENTS[kind].back, null, `${kind} is single-faced`);
  }
  assert.strictEqual(KIND_PLACEMENTS.tee.back, 'back');
  assert.strictEqual(KIND_PLACEMENTS.hoodie.back, 'back');
});

console.log('Printful pipeline test module loaded.');
