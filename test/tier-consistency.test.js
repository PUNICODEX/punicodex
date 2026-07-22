/**
 * Tier consistency — no canonical content may self-classify an entry against
 * the lexicon's canonical tier. Covers blog posts, scholars content, and the
 * lore catalog. System descriptions of the tier system (e.g. "separates
 * Tier 1 restorations from Tier 2") are allowed; only self-referential
 * classification claims are checked.
 *
 * Born from the 2026-07 reclassification drift: fill-only-missing generators
 * froze pre-reclassification tier prose while badges regenerated from canon.
 */

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const { LEXICON } = require('../type/js/lexicon.js');

const tierOf = {};
for (const e of LEXICON) tierOf[e.id] = e.tier;

// Self-classification patterns (must name THIS entry's tier).
const SELF_PATTERNS = [
  /\*\*Classification:\*\* Tier[- ]([12])/,
  /classified as \*\*Tier ([12])\*\*/,
  /places the name in Tier ([12])/,
  /places this name in Tier ([12])/,
  /a Tier ([12]) restoration/,
  /belongs (?:in|to) Tier ([12])/,
  /assigned (?:to )?Tier ([12])/,
];

function* walkStrings(obj) {
  if (typeof obj === 'string') {
    yield obj;
  } else if (Array.isArray(obj)) {
    for (const v of obj) yield* walkStrings(v);
  } else if (obj && typeof obj === 'object') {
    for (const k of Object.keys(obj)) yield* walkStrings(obj[k]);
  }
}

function contradictions(file, getEntryObj) {
  const j = JSON.parse(fs.readFileSync(file, 'utf8'));
  const out = [];
  for (const id of Object.keys(tierOf)) {
    const obj = getEntryObj(j, id);
    if (!obj) continue;
    const canon = tierOf[id];
    if (canon === 'dual') continue; // dual-tier entries legitimately mention both
    for (const str of walkStrings(obj)) {
      for (const re of SELF_PATTERNS) {
        const m = str.match(re);
        if (m && m[1] !== canon) {
          out.push(`${id}: claims Tier ${m[1]}, canon Tier ${canon} — ${str.slice(0, 90)}`);
          break;
        }
      }
    }
  }
  return out;
}

// Per-file check: only the file's OWN entry id is evaluated, so related-names
// prose mentioning other entries' tiers cannot false-positive.
function fileContradictions(file, id) {
  const canon = tierOf[id];
  if (!canon || canon === 'dual') return [];
  const j = JSON.parse(fs.readFileSync(file, 'utf8'));
  const out = [];
  for (const str of walkStrings(j)) {
    for (const re of SELF_PATTERNS) {
      const m = str.match(re);
      if (m && m[1] !== canon) {
        out.push(`${id}: claims Tier ${m[1]}, canon Tier ${canon} — ${str.slice(0, 90)}`);
        break;
      }
    }
  }
  return out;
}

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
    console.error(`    ${err.message.split('\n').slice(0, 10).join('\n    ')}`);
  }
}

function run() {
  console.log('\n▸ Tier Consistency\n');

  test('blog content never contradicts the canonical tier', () => {
    const dir = path.join(ROOT, 'platform', 'blog', 'content');
    const bad = [];
    for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.json'))) {
      const id = f.replace('.json', '');
      bad.push(...fileContradictions(path.join(dir, f), id).map((s) => `${f}: ${s}`));
    }
    assert.deepStrictEqual(bad.slice(0, 8), [], `${bad.length} blog tier contradictions`);
  });

  test('scholars content never contradicts the canonical tier', () => {
    const dir = path.join(ROOT, 'platform', 'scholars', 'content');
    const bad = [];
    for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.json'))) {
      const id = f.replace('.json', '');
      bad.push(...fileContradictions(path.join(dir, f), id).map((s) => `${f}: ${s}`));
    }
    assert.deepStrictEqual(bad.slice(0, 8), [], `${bad.length} scholars tier contradictions`);
  });

  test('lore catalog never contradicts the canonical tier', () => {
    const file = path.join(ROOT, 'scripts', 'lore-catalog.json');
    const bad = contradictions(file, (j, id) => j[id]);
    assert.deepStrictEqual(bad.slice(0, 8), [], `${bad.length} lore tier contradictions`);
  });

  test('generated temple classification sections match canon (spot audit)', () => {
    // The classification section is baked from the lexicon tier at generate
    // time; verify the three historically re-tiered entries render canon.
    const cheerio = require('cheerio');
    const bad = [];
    for (const id of ['atlas', 'rhea', 'kanaloa', 'asia']) {
      const file = path.join(ROOT, 'sites', id, 'index.html');
      if (!fs.existsSync(file)) continue;
      const html = fs.readFileSync(file, 'utf8');
      const canon = tierOf[id];
      const wrongTier = canon === '1' ? '2' : '1';
      const $ = cheerio.load(html);
      const badge = $(`.meta-badge, [class*="tier"]`).first().text();
      if (badge && badge.includes(`Tier ${wrongTier}`) && !badge.includes(`Tier ${canon}`)) {
        bad.push(`${id}: badge shows Tier ${wrongTier}, canon Tier ${canon}`);
      }
      // Footer classification.
      const footer = $('footer').text();
      if (footer.includes(`Tier ${wrongTier}`) && !footer.includes(`Tier ${canon}`)) {
        bad.push(`${id}: footer shows Tier ${wrongTier}, canon Tier ${canon}`);
      }
    }
    assert.deepStrictEqual(bad, [], 'temple classification drift');
  });

  console.log(`\nTier Consistency: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
