/**
 * One-off codemod: strip the retired tier system from canonical prose.
 * Targets: platform/blog/content/*.json, platform/scholars/content/*.json,
 *          scripts/lore-catalog.json (and its type/js copy)
 *
 * Handles canary watermarks: zero-width chars (U+200B–U+200D) may be
 * interleaved inside words, so literal patterns are matched flexibly.
 * Phrasing uses the archived tier snapshot (per-id) plus the computed
 * preservation label from the canonical engine.
 */
const fs = require('fs');
const path = require('path');
const { LEXICON } = require('../type/js/lexicon.js');
const { preservedFeatures } = require('../type/js/engine.js');

const ZW = '[\\u200b\\u200c\\u200d]?';
const flex = (s) =>
  s
    .split('')
    .map((c) => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join(ZW);
const flexRe = (s, flags = 'g') => new RegExp(flex(s), flags);

const SNAP = require('../archive/tier-system/lexicon-snapshot/tier-fields.json');
const TIER_BY_ID = new Map(SNAP.map((e) => [e.id, e.tier]));
const LEX_BY_ID = new Map(LEXICON.map((e) => [e.id, e]));

function labelFor(id) {
  const e = LEX_BY_ID.get(id);
  return e ? preservedFeatures(e.unicode).label : '';
}
function phraseFor(id) {
  const t = TIER_BY_ID.get(id);
  if (t === 'dual') return 'dual restoration';
  if (t === '1') return 'full restoration';
  return 'single-mark restoration';
}

// Ordered replacement builders; each returns { re, fn } applied on raw text.
function buildRules(id) {
  const label = labelFor(id);
  const phrase = phraseFor(id);
  const rules = [
    // At-a-glance / classification rows
    { re: flexRe('- **Classification:** Tier 1'), to: `- **Restoration:** ${label}` },
    { re: flexRe('- **Classification:** Tier 2'), to: `- **Restoration:** ${label}` },
    { re: flexRe('- **Classification:** Dual-Tier'), to: `- **Restoration:** ${label}` },
    { re: flexRe('- **Classification:** Tier-1'), to: `- **Restoration:** ${label}` },
    { re: flexRe('- **Classification:** Tier-2'), to: `- **Restoration:** ${label}` },
    // "is classified as **Tier 1**:" → restoration phrase
    {
      re: flexRe('is classified as **Tier 1**:'),
      to: `is a **${TIER_BY_ID.get(id) === 'dual' ? 'dual restoration' : 'full restoration'}**:`,
    },
    {
      re: flexRe('is classified as **Tier 2**:'),
      to: 'is a **single-mark restoration**:',
    },
    {
      re: flexRe('is classified as **Dual-Tier**:'),
      to: 'is a **dual restoration**:',
    },
    {
      re: flexRe('is classified as **Tier-1**:'),
      to: `is a **${phrase}**:`,
    },
    {
      re: flexRe('is classified as **Tier-2**:'),
      to: 'is a **single-mark restoration**:',
    },
    // ", which places the name in Tier 1." → drop the class clause
    { re: flexRe(', which places the name in Tier 1.'), to: '.' },
    { re: flexRe(', which places the name in Tier 2.'), to: '.' },
    { re: flexRe(', which places it in Tier 1.'), to: '.' },
    { re: flexRe(', which places it in Tier 2.'), to: '.' },
    { re: flexRe(' which places the name in Tier 1.'), to: '.' },
    { re: flexRe(' which places the name in Tier 2.'), to: '.' },
    // FAQ headers
    { re: flexRe('**Why is '), noop: true }, // handled by generic below
    // "X is Tier 1 because" → "X preserves both features because"
    { re: flexRe(' is Tier 1 because'), to: ' preserves both features because' },
    { re: flexRe(' is Tier 2 because'), to: ' is a simpler restoration because' },
    { re: flexRe(' is Tier-1 because'), to: ' preserves both features because' },
    { re: flexRe(' is Tier-2 because'), to: ' is a simpler restoration because' },
    { re: flexRe(' is Dual-Tier because'), to: ' is a dual restoration because' },
    // nav prose
    { re: flexRe('by tradition, tier, or script'), to: 'by tradition or script' },
    { re: flexRe('the classification logic that separates Tier 1 restorations from Tier 2'), to: 'the mechanical logic of what each restored mark preserves' },
    // remaining standalone mentions of the classes
    { re: flexRe('classified as **Tier 1**'), to: `a **${phrase}**` },
    { re: flexRe('classified as **Tier 2**'), to: 'a **single-mark restoration**' },
    { re: /\*\*Why is ([^*]+?) classified as Tier [12]\?\*\*/g, to: '**What does the restoration of $1 preserve?**' },
    { re: /classified (?:as )?(?:\*\*)?Tier-?([12])(?:\*\*)?/g, to: (m, n) => (n === '1' ? `classified as a **${phraseFor(id)}**` : 'classified as a **single-mark restoration**') },
    // ── round-3 generic families ──
    { re: flexRe('## Why Tier 1?'), to: '## Why This Form?' },
    { re: flexRe('## Why Tier 2?'), to: '## Why This Form?' },
    { re: flexRe(' is Tier 1:'), to: ' preserves both features:' },
    { re: flexRe(' is Tier 2:'), to: ' keeps its restoration plain:' },
    { re: flexRe(' is a Tier-1 restoration'), to: ' is a full restoration' },
    { re: flexRe(' is a Tier 1 restoration'), to: ' is a full restoration' },
    { re: flexRe(' is a Tier-2 restoration'), to: ' is a plain restoration' },
    { re: flexRe(' is a Tier 2 restoration'), to: ' is a plain restoration' },
    { re: flexRe('as a Tier-2 reconstruction'), to: 'as a plain reconstruction' },
    { re: flexRe('a Tier-1 restoration'), to: 'a full restoration' },
    { re: flexRe('a Tier 1 restoration'), to: 'a full restoration' },
    { re: flexRe('a Tier-2 restoration'), to: 'a plain restoration' },
    { re: flexRe('a Tier 2 restoration'), to: 'a plain restoration' },
    { re: flexRe('the Tier-1 Unicode form'), to: 'the fully restored Unicode form' },
    { re: flexRe('classified Tier 1.'), to: 'a full restoration.' },
    { re: flexRe('classified Tier 2.'), to: 'a plain restoration.' },
    { re: flexRe('classified Tier 1'), to: 'a full restoration' },
    { re: flexRe('classified Tier 2'), to: 'a plain restoration' },
    { re: flexRe('Tier 1 names are'), to: 'Fully restored names are' },
    { re: flexRe('Tier 2 names are'), to: 'Plain-form names are' },
    { re: flexRe('making it a Tier 1 restoration'), to: 'making it a full restoration' },
    { re: flexRe('making it a Tier 2'), to: 'making it a plain form' },
    { re: flexRe('places the restoration in Tier 1'), to: 'makes this a full restoration' },
    { re: flexRe('places the restoration in Tier 2'), to: 'makes this a plain restoration' },
    { re: flexRe('places it in Tier 2:'), to: 'leaves it a plain form:' },
    { re: flexRe('In the PuniCodex tier system'), to: 'In the PuniCodex restoration record' },
    { re: flexRe('in the PuniCodex tier system'), to: 'in the PuniCodex restoration record' },
    { re: flexRe('the mechanical rule therefore places it in Tier 2:'), to: 'the mechanical rule therefore leaves it plain:' },
    { re: flexRe('the name is placed in Tier 2'), to: 'the name is treated as a plain form' },
    { re: flexRe('is placed in Tier 1'), to: 'is a full restoration' },
    { re: flexRe('is placed in Tier 2'), to: 'is a plain restoration' },
    { re: flexRe('it a Tier 1 restoration'), to: 'it a full restoration' },
    { re: flexRe('as a Tier-1 name'), to: 'as a fully restored name' },
    { re: flexRe('as a Tier-2 name'), to: 'as a plain-form name' },
    { re: flexRe('as a Tier 2 name'), to: 'as a plain-form name' },
    { re: flexRe('entry in **Tier 1**'), to: 'entry a **full restoration**' },
    { re: flexRe('entry in **Tier 2**'), to: 'entry a **plain restoration**' },
    { re: flexRe(' is therefore classified Tier 1'), to: ' is therefore a full restoration' },
    { re: flexRe(' is therefore classified Tier 2'), to: ' is therefore a plain restoration' },
    // ── round-4: lore-note / pronunciation families ──
    { re: flexRe('is a Tier-1 name:'), to: 'is a fully restored name:' },
    { re: flexRe('is a Tier-1 name '), to: 'is a fully restored name ' },
    { re: flexRe('a Tier-1 name'), to: 'a fully restored name' },
    { re: flexRe('is Tier 1 in the PUNICODEX system because'), to: 'is fully restored in the PUNICODEX record because' },
    { re: flexRe('makes the name Tier 1.'), to: 'makes the name a full restoration.' },
    { re: flexRe('makes the name Tier 1"'), to: 'makes the name a full restoration"' },
    { re: flexRe('what Tier 2 is designed to record'), to: 'what a plain restoration records' },
    { re: flexRe('As a Tier-1 name it preserves'), to: 'It preserves' },
    { re: flexRe('is Tier 2 by tradition rather than by restored marks'), to: 'is a plain form by tradition rather than by restored marks' },
    { re: flexRe('is catalogued at Tier 1 as a reviewed edge case'), to: 'is catalogued as a full restoration, a reviewed edge case' },
    { re: flexRe('its Tier-1 status'), to: 'its fully restored status' },
    { re: flexRe('The Tier-1 Unicode form'), to: 'The fully restored Unicode form' },
    { re: flexRe('The Tier-1 form preserves'), to: 'The restored form preserves' },
    { re: flexRe('is a Tier-1 Greek restoration:'), to: 'is a fully restored Greek form:' },
    { re: flexRe('is a full Tier-1 Greek restoration'), to: 'is a full Greek restoration' },
    { re: flexRe("is a Tier-1 restoration in the project's classification"), to: "is fully restored in the project's classification" },
    { re: flexRe('is a Tier-2 name'), to: 'is a plain-form name' },
    { re: flexRe('as a Tier-1'), to: 'as a fully restored' },
    { re: flexRe('the Tier-1 class'), to: 'the fully restored class' },
    { re: flexRe('a Tier 1 name'), to: 'a fully restored name' },
    // ── round-5: scholars-section doctrine sentences ──
    { re: flexRe('the exemplary single-tier plain-form name'), to: 'the exemplary plain-form name' },
    { re: flexRe('is single-tier a full restoration'), to: 'is a full restoration' },
    { re: flexRe(', single-tier.'), to: '.' },
    { re: flexRe('single-tier,'), to: '' },
    { re: flexRe('the tier rule is a report on orthography'), to: 'the restoration rule is a report on orthography' },
    { re: flexRe('The tier is a report on orthography'), to: 'The restoration is a report on orthography' },
    { re: flexRe("the tier is a report on the name's orthography"), to: "the restoration is a report on the name's orthography" },
    { re: flexRe('the tier is a report on orthography'), to: 'the restoration is a report on orthography' },
    { re: flexRe('the mechanical tier rule'), to: 'the mechanical restoration rule' },
    { re: flexRe('the tier rule'), to: 'the restoration rule' },
    { re: flexRe('the tiering here turns on'), to: 'the distinction here turns on' },
    { re: flexRe('the tier classification'), to: 'the classification' },
    { re: flexRe('is classified as Tier 2:'), to: 'is a plain restoration:' },
    { re: flexRe('classifies the name Tier 2'), to: 'leaves the name a plain restoration' },
    { re: flexRe('classifies the name a plain restoration'), noop: true },
    { re: flexRe('classifies the name Tier 1'), to: 'makes the name a full restoration' },
    { re: flexRe("on the project's classification the name is Tier 1"), to: "the name is fully restored" },
    { re: flexRe('is Tier 1, single-tier'), to: 'is fully restored' },
    { re: flexRe('is Tier 1'), to: 'is fully restored' },
    { re: flexRe('is Tier 2'), to: 'is a plain restoration' },
    { re: flexRe('is classified Tier 1'), to: 'is a full restoration' },
    { re: flexRe('is classified Tier 2'), to: 'is a plain restoration' },
    { re: flexRe('Tier 1;'), to: 'a full restoration;' },
    { re: flexRe('Tier 2;'), to: 'a plain restoration;' },
    { re: flexRe('Tier 1:'), to: 'A full restoration:' },
    { re: flexRe('Tier 2:'), to: 'A plain restoration:' },
    { re: flexRe('Tier 1,'), to: 'a full restoration,' },
    { re: flexRe('Tier 2,'), to: 'a plain restoration,' },
    { re: flexRe('Tier 1.'), to: 'a full restoration.' },
    { re: flexRe('Tier 2.'), to: 'a plain restoration.' },
    { re: flexRe('single-tier '), to: '' },
    // final catch-alls (position-safe residuals)
    { re: /\bTier-1\b/g, to: 'fully restored' },
    { re: /\bTier-2\b/g, to: 'plain-form' },
    { re: /\bTier 1\b/g, to: 'a full restoration' },
    { re: /\bTier 2\b/g, to: 'a plain restoration' },
    { re: /\bDual-Tier\b/g, to: 'dual restoration' },
    { re: /\bdual-tier\b/g, to: 'dual restoration' },
  ];
  return rules.filter((r) => !r.noop);
}

const TIER_TAG = flexRe('^Tier[- ]?[12]$|^Dual-Tier$');

function fixString(id, text) {
  const rules = buildRules(id);
  let out = text;
  let changed = true;
  // two passes so later generic rules can catch what earlier ones reshape
  for (let pass = 0; pass < 2 && changed; pass++) {
    changed = false;
    for (const r of rules) {
      const next = out.replace(r.re, r.to);
      if (next !== out) changed = true;
      out = next;
    }
  }
  return out;
}

function fixFile(file, idGetter, bodyGetter, writers) {
  const raw = fs.readFileSync(file, 'utf8');
  const j = JSON.parse(raw);
  const id = idGetter(j, file);
  let touched = false;

  const walk = (obj) => {
    if (typeof obj === 'string') return obj;
    if (Array.isArray(obj)) return obj.map(walk);
    if (obj && typeof obj === 'object') {
      for (const k of Object.keys(obj)) {
        if (k === 'tags' && Array.isArray(obj[k])) {
          const filtered = obj[k].filter((t) => !TIER_TAG.test(String(t)));
          if (filtered.length !== obj[k].length) {
            obj[k] = filtered;
            touched = true;
          }
          continue;
        }
        if (typeof obj[k] === 'string') {
          const fixed = fixString(id, obj[k]);
          if (fixed !== obj[k]) {
            obj[k] = fixed;
            touched = true;
          }
        } else {
          walk(obj[k]);
        }
      }
    }
    return obj;
  };
  walk(j);
  if (touched) {
    writers(file, j);
    return 1;
  }
  return 0;
}

function main() {
let changedFiles = 0;
let remaining = 0;

// blog + scholars content
for (const dir of ['platform/blog/content', 'platform/scholars/content']) {
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.json'))) {
    const p = path.join(dir, f);
    changedFiles += fixFile(
      p,
      (j) => j.entryId || f.replace(/\.json$/, ''),
      null,
      (file, j) => fs.writeFileSync(file, JSON.stringify(j, null, 2) + '\n', 'utf8'),
    );
  }
}

// lore-catalog.json (canonical + type/js copy)
for (const p of ['scripts/lore-catalog.json', 'type/js/lore-catalog.json']) {
  const raw = JSON.parse(fs.readFileSync(p, 'utf8'));
  let touched = false;
  const walk = (obj, keyHint) => {
    if (typeof obj === 'string') return obj;
    if (Array.isArray(obj)) return obj.map((x) => walk(x, keyHint));
    if (obj && typeof obj === 'object') {
      for (const k of Object.keys(obj)) {
        if (typeof obj[k] === 'string') {
          const id = TIER_BY_ID.has(k) ? k : keyHint;
          const fixed = fixString(id, obj[k]);
          if (fixed !== obj[k]) {
            obj[k] = fixed;
            touched = true;
          }
        } else walk(obj[k], TIER_BY_ID.has(k) ? k : keyHint);
      }
    }
    return obj;
  };
  walk(raw, null);
  if (touched) {
    fs.writeFileSync(p, JSON.stringify(raw, null, 2) + '\n', 'utf8');
    changedFiles++;
  }
}

// scan leftover tier mentions
const scan = (dir) => {
  let n = 0;
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.json'))) {
    const s = fs.readFileSync(path.join(dir, f), 'utf8');
    const m = s.match(/[Tt]ier|Dual-Tier|dual-tier/g);
    if (m) n += m.length;
  }
  return n;
};
remaining += scan('platform/blog/content');
remaining += scan('platform/scholars/content');
const loreLeft = (fs.readFileSync('scripts/lore-catalog.json', 'utf8').match(/[Tt]ier|Dual-Tier|dual-tier/g) || []).length;

console.log(`changed files: ${changedFiles}`);
console.log(`leftover tier mentions — blog+scholars: ${remaining}, lore-catalog: ${loreLeft}`);
}

if (require.main === module) main();
module.exports = { fixString, buildRules };
