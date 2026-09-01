/**
 * Hero Stats Tests
 *
 * The home page quotes fleet counts (temples, pantheons, domains, entries)
 * that were hand-maintained and went stale the moment a wave shipped
 * (the 2026-08 "271" hero with 282 flagships live). The sync script
 * (scripts/sync-hero-stats.js, part of npm run generate) stamps them from
 * canonical sources; this suite pins the contract.
 */

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const { stats, sync } = require('../scripts/sync-hero-stats.js');

const tests = [];
const test = (name, fn) => tests.push([name, fn]);

test('index.html hero stats match the canonical sources', () => {
  const { temples, pantheons, productTypes, entries } = stats();
  assert.ok(temples >= 200, 'temples sane');
  assert.ok(pantheons >= 20, 'pantheons sane');
  assert.ok(productTypes >= 1, 'product types sane');
  assert.ok(entries >= 800, 'entries sane');

  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  assert.ok(
    html.includes(`${temples} digital temples restored`),
    `hero must say ${temples} digital temples restored`
  );
  for (const [label, value] of [
    ['Digital Temples Restored', temples],
    ['Pantheons', pantheons],
    ['Scholarly Entries', entries],
    ['Product Types in the Reliquary', productTypes],
  ]) {
    const re = new RegExp(`data-count="${value}">0</span>\\s*<span class="stat-label">${label}`);
    assert.ok(re.test(html), `stat card ${label} must carry ${value}`);
  }
  assert.ok(!/\b271 digital temples\b/.test(html), 'no stale 271 hero');
});

test('sync() is idempotent and rewrites every known slot', () => {
  const current = stats();
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  assert.strictEqual(sync(html, current), html, 'already-current page must not change');

  const dirty = html
    .replace(/\d+ digital temples restored/g, '111 digital temples restored')
    .replace(/data-count="\d+"/g, 'data-count="111"');
  const fixed = sync(dirty, current);
  assert.ok(!fixed.includes('111 digital temples'), 'prose rewritten');
  assert.ok(!fixed.includes('data-count="111"'), 'cards rewritten');
  assert.ok(fixed.includes(`${current.temples}">0`), 'temples card stamped');
  assert.ok(fixed.includes(`${current.productTypes}">0`), 'product types card stamped');
});

test('the sync is registered in npm run generate', () => {
  const gen = fs.readFileSync(path.join(ROOT, 'scripts', 'generate.js'), 'utf8');
  assert.ok(gen.includes('sync-hero-stats.js'), 'sync-hero-stats not in generate chain');
});

async function run() {
  console.log('\n▸ Hero Stats Tests\n');
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
  console.log(`\nHero Stats: ${tests.length - failed} passed, ${failed} failed`);
  if (failed) process.exitCode = 1;
}

run();
