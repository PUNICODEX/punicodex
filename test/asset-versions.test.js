/**
 * Asset Version Tests
 *
 * Cache-busting contract: /css, /js and /assets are immutable-cached for a
 * year, so a content change without a URL change serves stale files to every
 * returning visitor (the 2026-08 /pantheon incident — 271 of 282 archetypes
 * on repeat mobile visits). The stamp script (scripts/stamp-asset-versions.js,
 * part of npm run generate) content-addresses the ?v= pins of the
 * data-driven scripts. These tests pin that contract.
 */

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..');

const ASSETS = ['/js/archetypes-v2.js', '/js/original-script-lookup.js', '/js/owned-entries.js'];
const SKIP = /^(docs\/lighthouse\/|Marketing\/|New material)/;

function hashOf(rel) {
  return crypto
    .createHash('sha256')
    .update(fs.readFileSync(path.join(ROOT, rel)))
    .digest('hex')
    .slice(0, 10);
}

const tests = [];
const test = (name, fn) => tests.push([name, fn]);

test('every reference to a content-addressed asset carries its current hash pin', () => {
  const files = execFileSync('git', ['ls-files', '*.html'], { cwd: ROOT, encoding: 'utf8' })
    .split('\n')
    .filter(Boolean)
    .filter((f) => !SKIP.test(f));
  const stale = [];
  for (const file of files) {
    const text = fs.readFileSync(path.join(ROOT, file), 'utf8');
    for (const asset of ASSETS) {
      const want = `${asset}?v=${hashOf(asset)}`;
      const anyRef = new RegExp(`${asset.replace(/[./]/g, '\\$&')}(\\?v=([A-Za-z0-9_-]+))?`, 'g');
      for (const m of text.matchAll(anyRef)) {
        if (m[0] !== want) {
          stale.push(`${file}: ${m[0]} (want ?v=${hashOf(asset)})`);
        }
      }
    }
  }
  assert.deepStrictEqual(
    stale.slice(0, 10),
    [],
    `${stale.length} stale asset pin(s) — run scripts/stamp-asset-versions.js`
  );
});

test('the stamp script is part of npm run generate', () => {
  const gen = fs.readFileSync(path.join(ROOT, 'scripts', 'generate.js'), 'utf8');
  assert.ok(gen.includes('stamp-asset-versions.js'), 'stamper not registered in generate.js');
});

test('stamp is idempotent (second run writes zero files)', () => {
  const out = execFileSync(
    process.execPath,
    [path.join(ROOT, 'scripts', 'stamp-asset-versions.js')],
    {
      cwd: ROOT,
      encoding: 'utf8',
    }
  );
  assert.match(out, /0 file\(s\) stamped/, `stamper not idempotent: ${out.trim()}`);
});

async function run() {
  console.log('\n▸ Asset Version Tests\n');
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
  console.log(`\nAsset Versions: ${tests.length - failed} passed, ${failed} failed`);
  if (failed) process.exitCode = 1;
}

run();
