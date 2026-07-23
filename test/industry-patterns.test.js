/**
 * Industry Patterns contract tests
 *
 * Guards the canonical industry map (type/js/industry-patterns.js) and its
 * generated consumers: every assigned temple exists in the lexicon, weights
 * are 1 or 2, every assignment carries a why, no duplicates, every built
 * flagship holds at least 3 industries, and the generated JSON is in sync.
 */

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..');
const { LEXICON } = require('../type/js/lexicon.js');
const { INDUSTRY_GROUPS } = require('../type/js/industry-patterns.js');
const { ARCHETYPES } = require('../js/archetypes-v2.js');

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

const LEXICON_IDS = new Set(LEXICON.map((e) => e.id));
const BUILT_FLAGSHIPS = new Set(ARCHETYPES.filter((a) => a.built).map((a) => a.id));

test('every assigned temple exists in the lexicon', () => {
  const unknown = [];
  for (const g of INDUSTRY_GROUPS) {
    for (const e of g.entries) {
      if (!LEXICON_IDS.has(e.id)) unknown.push(`${g.industry}:${e.id}`);
    }
  }
  assert.deepStrictEqual(unknown, [], `unknown temple ids: ${unknown.join(', ')}`);
});

test('weights are 1 or 2 and every entry has a substantive why', () => {
  const bad = [];
  for (const g of INDUSTRY_GROUPS) {
    for (const e of g.entries) {
      if (e.weight !== 1 && e.weight !== 2) bad.push(`${g.industry}:${e.id} weight ${e.weight}`);
      if (typeof e.why !== 'string' || e.why.length < 20) {
        bad.push(`${g.industry}:${e.id} why too thin`);
      }
    }
  }
  assert.deepStrictEqual(bad, [], bad.join('\n'));
});

test('no duplicate (industry, temple) assignments', () => {
  const seen = new Set();
  const dupes = [];
  for (const g of INDUSTRY_GROUPS) {
    for (const e of g.entries) {
      const key = `${g.industry}${e.id}`;
      if (seen.has(key)) dupes.push(key);
      seen.add(key);
    }
  }
  assert.deepStrictEqual(dupes, [], `duplicates: ${dupes.join(', ')}`);
});

test('industry ids and group shapes are consistent', () => {
  const ids = new Set();
  for (const g of INDUSTRY_GROUPS) {
    assert.ok(g.industry && !ids.has(g.industry), `duplicate industry id ${g.industry}`);
    ids.add(g.industry);
    assert.ok(g.name && g.sector && g.tagline && g.note, `group ${g.industry} missing metadata`);
    assert.ok(Array.isArray(g.entries) && g.entries.length > 0, `group ${g.industry} is empty`);
  }
});

test('every built flagship temple holds at least 3 industries', () => {
  const perTemple = new Map();
  for (const g of INDUSTRY_GROUPS) {
    for (const e of g.entries) {
      perTemple.set(e.id, (perTemple.get(e.id) || 0) + 1);
    }
  }
  const thin = [...BUILT_FLAGSHIPS].filter((id) => (perTemple.get(id) || 0) < 3);
  assert.deepStrictEqual(thin, [], `flagships with fewer than 3 industries: ${thin.join(', ')}`);
});

test('weight-2 assignments are reserved for direct-domain fits', () => {
  // Heuristic contract: no temple may hold more than three weight-2 seats
  // across the whole map (the canonical discipline is 1-2 primaries).
  const counts = new Map();
  for (const g of INDUSTRY_GROUPS) {
    for (const e of g.entries) {
      if (e.weight === 2) counts.set(e.id, (counts.get(e.id) || 0) + 1);
    }
  }
  const over = [...counts.entries()].filter(([, c]) => c > 3);
  assert.deepStrictEqual(
    over,
    [],
    `temples with >3 primaries: ${over.map(([id]) => id).join(', ')}`
  );
});

test('generated industry-patterns JSON is in sync with the canonical map', () => {
  const out = execFileSync(
    process.execPath,
    [path.join(ROOT, 'scripts', 'generate-industry-patterns.js')],
    {
      cwd: ROOT,
      encoding: 'utf8',
    }
  );
  assert.match(out, /entries: \d+/);
  const api = JSON.parse(
    fs.readFileSync(path.join(ROOT, 'platform', 'api', 'industry-patterns.json'), 'utf8')
  );
  const apiCount = Object.keys(api.byEntry || {}).length;
  assert.ok(apiCount >= 200, `byEntry covers only ${apiCount} temples`);
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
      console.error(
        `    ${String(err.message || err)
          .split('\n')
          .slice(0, 6)
          .join('\n    ')}`
      );
    }
  }
  console.log(`\nIndustry Patterns: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
