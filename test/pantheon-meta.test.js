/**
 * Pantheon-meta contract — one canonical pantheon registry, all consumers
 * derive from it. Guards against the drift class that bit this project
 * (duplicated pantheon maps going stale independently).
 */

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const {
  PANTHEON_META,
  pantheonLabel,
  pantheonEmoji,
  pantheonColor,
} = require('../type/js/pantheon-meta.js');
const { LEXICON } = require('../type/js/lexicon.js');

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

// Files that must NOT carry their own pantheon-id literal maps anymore.
const CONSUMERS = [
  'lexicon/js/lexicon-browse.js',
  'platform/api/names-service.js',
  'platform/api/similarity-service.js',
  'type/js/engine.js',
  'type/js/type.js',
  'js/connections.js',
  'scripts/generate-temples.js',
];

const PANTHEON_IDS = Object.keys(PANTHEON_META);

function run() {
  console.log('\n▸ Pantheon Meta Contract\n');

  test('every lexicon pantheon has complete meta (label, emoji, color)', () => {
    const used = new Set(LEXICON.map((e) => e.pantheon));
    const missing = [...used].filter((p) => {
      const m = PANTHEON_META[p];
      return !m?.label || !m.emoji || !m.color;
    });
    assert.deepStrictEqual(missing, [], 'pantheons without meta');
  });

  test('no meta entry is unused (registry matches the lexicon exactly)', () => {
    const used = new Set(LEXICON.map((e) => e.pantheon));
    const unused = PANTHEON_IDS.filter((id) => !used.has(id));
    assert.deepStrictEqual(unused, [], 'meta entries not present in the lexicon');
  });

  test('consumers do not re-declare pantheon maps', () => {
    const violations = [];
    for (const rel of CONSUMERS) {
      const text = fs.readFileSync(path.join(ROOT, rel), 'utf8');
      // A block of 3+ pantheon-id keys inside one object literal = a private map.
      const hits = PANTHEON_IDS.filter((id) => text.includes(`${id}:`)).length;
      const usesMeta = /pantheon-meta|pantheonMeta|PANTHEON_META/.test(text);
      if (hits >= 3 && !usesMeta) {
        violations.push(`${rel} (${hits} pantheon literals, no meta import)`);
      }
    }
    assert.deepStrictEqual(violations, [], 'consumers with private pantheon maps');
  });

  test('helpers agree with the meta map', () => {
    assert.strictEqual(pantheonLabel('greek'), 'Greek');
    assert.strictEqual(pantheonLabel('norse'), 'Norse');
    assert.strictEqual(pantheonEmoji('greek'), '⚡');
    assert.strictEqual(pantheonColor('greek'), '#D4AF37');
    assert.strictEqual(pantheonLabel('not-a-pantheon'), 'not-a-pantheon');
    assert.strictEqual(pantheonEmoji('not-a-pantheon'), '✦');
  });

  test('engine emoji resolves through the meta module', () => {
    const engine = require('../type/js/engine.js');
    assert.strictEqual(engine.getPantheonEmoji('norse'), PANTHEON_META.norse.emoji);
    assert.strictEqual(engine.getPantheonEmoji('aboriginal'), PANTHEON_META.aboriginal.emoji);
  });

  test('validator allowed set derives from the meta registry', () => {
    const src = fs.readFileSync(path.join(ROOT, 'type/js/validate.js'), 'utf8');
    assert.ok(
      src.includes("require('./pantheon-meta.js')"),
      'validate.js must import pantheon-meta'
    );
    assert.ok(
      src.includes('Object.keys(PANTHEON_META)'),
      'ALLOWED_PANTHEONS must derive from meta keys'
    );
  });

  test('synced shared copies are byte-identical to canonical', () => {
    const canonical = fs.readFileSync(path.join(ROOT, 'type/js/pantheon-meta.js'), 'utf8');
    for (const dest of ['extension/shared/pantheon-meta.js', 'mobile/shared/pantheon-meta.js']) {
      const copy = fs.readFileSync(path.join(ROOT, dest), 'utf8');
      assert.strictEqual(copy, canonical, `${dest} diverged from canonical`);
    }
  });

  console.log(`\nPantheon Meta: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
