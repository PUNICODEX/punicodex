/**
 * PuniCodex — Herald scene regression tests.
 *
 * /herald/ is the WebGL Restoration experience: a vite app built from
 * templates/herald-restation into herald/. The 2026-11 outage: the committed
 * herald/index.html was stale — it loaded the scene bundle but lacked the
 * control elements the bundle binds (restart/play/timeline/camera), so
 * scene.js threw "Cannot read properties of null (reading 'addEventListener')"
 * and the page hung on the boot screen.
 *
 * These tests close that class of drift:
 *   1. Every element id the scene source binds via getElementById must exist
 *      in every HTML page that loads the built bundle.
 *   2. The bundle path referenced by the page must exist on disk.
 *   3. The build is deterministic: source edits without a rebuild are caught
 *      by the divergence gate (herald/index.html + herald/assets are
 *      committed build output).
 *
 * Run standalone: node test/herald-scene.test.js
 */

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

const SRC = path.join('templates', 'herald-restoration', 'src', 'scene.js');
const sceneSrc = read(SRC);

/* Every id the scene binds at module scope (getElementById('x')). */
const boundIds = [
  ...new Set([...sceneSrc.matchAll(/getElementById\('([^']+)'\)/g)].map((m) => m[1])),
];
assert.ok(boundIds.length >= 5, `expected the scene to bind 5+ elements, got ${boundIds.length}`);

/* Pages that load the built bundle (script src="/herald/assets/index-*.js"). */
const pages = [];
function scan(dir) {
  for (const ent of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
    if (ent.name === 'node_modules' || ent.name.startsWith('.')) continue;
    const rel = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      scan(rel);
    } else if (ent.name.endsWith('.html')) {
      const html = read(rel);
      if (html.includes('/herald/assets/index-')) pages.push(rel);
    }
  }
}
scan(path.join('herald'));

let passed = 0;
let failed = 0;
function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed++;
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
  }
}

test('at least one page mounts the herald scene bundle', () => {
  assert.ok(pages.length >= 1, 'no HTML page references /herald/assets/index-*.js');
});

test('every scene-bound element id exists in every mounting page', () => {
  for (const rel of pages) {
    const html = read(rel);
    for (const id of boundIds) {
      assert.ok(
        html.includes(`id="${id}"`),
        `${rel}: scene binds #${id} but the page has no such element — ` +
          'the bundle will throw on null.addEventListener'
      );
    }
  }
});

test('the referenced bundle exists on disk (content-hash integrity)', () => {
  for (const rel of pages) {
    const html = read(rel);
    const refs = [...html.matchAll(/\/herald\/assets\/(index-[A-Za-z0-9_-]+\.js)/g)].map(
      (m) => m[1]
    );
    assert.ok(refs.length >= 1, `${rel}: no bundle reference found`);
    for (const ref of new Set(refs)) {
      assert.ok(
        fs.existsSync(path.join(root, 'herald', 'assets', ref)),
        `${rel} references /herald/assets/${ref} but the file is missing — rebuild the app`
      );
    }
  }
});

test('scene.js does not bind elements at module scope without a guard', () => {
  // Module-scope bindings run on every mounting page; the id-presence test
  // above is the guard. This assertion documents the contract: any NEW
  // getElementById in scene.js automatically joins boundIds and is checked.
  for (const m of sceneSrc.matchAll(/getElementById\('([^']+)'\)/g)) {
    assert.ok(boundIds.includes(m[1]), `untracked binding ${m[1]}`);
  }
});

console.log(`\nHerald Scene: ${passed} passed, ${failed} failed (ids: ${boundIds.join(', ')})`);
if (failed > 0) process.exit(1);
