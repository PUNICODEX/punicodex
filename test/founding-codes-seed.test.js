/**
 * Founding Codes Seed Tests — platform/db/seed-founding-codes.js.
 *
 * The founding discount codes ride in every CI-prebuilt deployment seed DB
 * and every ephemeral Vercel cold start, so the seed must be idempotent
 * (insert-or-ignore by code) and must never drift from the canonical lexicon:
 * a lexicon id rename that stranded a founding code on a dead temple slug
 * would silently break the pitch pipeline.
 *
 * Covers: first seed adds every code, second seed adds nothing, exactly one
 * row per code after both runs, the row matches the seed spec field for
 * field, and every FOUNDING_CODES[].applies_to resolves against
 * type/js/lexicon.js.
 */

const assert = require('node:assert');
const Database = require('better-sqlite3');

const { migrate } = require('../platform/db/migrate-discount-codes.js');
const { seed, FOUNDING_CODES } = require('../platform/db/seed-founding-codes.js');
const { LEXICON } = require('../type/js/lexicon.js');

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

function freshMigratedDb() {
  const db = new Database(':memory:');
  migrate(db);
  return db;
}

test('seeding a fresh migrated DB adds every founding code exactly once', () => {
  const db = freshMigratedDb();
  try {
    const first = seed(db);
    assert.strictEqual(first.added, FOUNDING_CODES.length, 'first seed adds all codes');
    assert.strictEqual(first.total, FOUNDING_CODES.length);

    const second = seed(db);
    assert.deepStrictEqual(
      second,
      { added: 0, total: FOUNDING_CODES.length },
      'second seed is a no-op'
    );

    for (const spec of FOUNDING_CODES) {
      const rows = db.prepare('SELECT * FROM discount_codes WHERE code = ?').all(spec.code);
      assert.strictEqual(rows.length, 1, `exactly one ${spec.code} row after two seeds`);
    }
  } finally {
    db.close();
  }
});

test('the seeded FATHERFEATHER row matches the seed spec field for field', () => {
  const db = freshMigratedDb();
  try {
    seed(db);
    const row = db.prepare('SELECT * FROM discount_codes WHERE code = ?').get('FATHERFEATHER');
    assert.ok(row, 'FATHERFEATHER row exists');
    const spec = FOUNDING_CODES.find((c) => c.code === 'FATHERFEATHER');
    assert.ok(spec, 'FATHERFEATHER is registered in FOUNDING_CODES');
    assert.strictEqual(row.kind, spec.kind);
    assert.strictEqual(row.percent, spec.percent);
    assert.strictEqual(row.applies_to, spec.applies_to);
    assert.strictEqual(row.max_uses, spec.max_uses);
    assert.strictEqual(row.note, spec.note);
    assert.strictEqual(row.active, 1, 'seeded code is active');
    assert.strictEqual(row.used_count, 0, 'seeded code starts unredeemed');
    assert.strictEqual(row.created_by, 'founder');
    assert.strictEqual(row.expires_at, null, 'founding codes do not expire');
  } finally {
    db.close();
  }
});

test('every FOUNDING_CODES applies_to resolves against the canonical lexicon', () => {
  // Guards a lexicon id rename: a founding code pointing at a slug that no
  // longer exists would pitch a temple the site cannot serve.
  assert.ok(FOUNDING_CODES.length > 0, 'at least one founding code is registered');
  const ids = new Set(LEXICON.map((e) => e.id));
  for (const spec of FOUNDING_CODES) {
    assert.ok(
      ids.has(spec.applies_to),
      `founding code ${spec.code} targets unknown lexicon id: ${spec.applies_to}`
    );
  }
});

async function run() {
  let passed = 0;
  let failed = 0;
  for (const t of tests) {
    try {
      await t.fn();
      passed++;
      console.log(`  ✓ ${t.name}`);
    } catch (err) {
      failed++;
      console.error(`  ✗ ${t.name}`);
      console.error(`    ${err.message}`);
    }
  }
  console.log(`\nFounding Codes Seed: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
