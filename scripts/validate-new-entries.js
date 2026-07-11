/**
 * Validate new lexicon entries before merging them into the canonical lexicon.
 */

'use strict';

const path = require('node:path');
const { NEW_ENTRIES } = require('./lexicon-expansion-entries.js');
const { SOURCE_CATALOG } = require(path.join(__dirname, '..', 'type', 'js', 'source-catalog.js'));
const {
  getOriginalScript,
  getProvenance,
  containsGreekOrCjk,
  isPlaceholder,
} = require(path.join(__dirname, '..', 'type', 'js', 'original-scripts.js'));

const ALLOWED_PANTHEONS = [
  'greek', 'greek-location', 'norse', 'egyptian', 'sanskrit', 'celtic',
  'mesopotamian', 'polynesian', 'japanese', 'nahuatl', 'yoruba', 'slavic',
  'zoroastrian', 'incan', 'chinese', 'buddhist', 'taoist', 'korean',
  'phoenician', 'hittite', 'canaanite',
];
const ALLOWED_TIERS = ['dual', '1', '2'];
const ASCII_REGEX = /^[a-z]+$/;
const ALLOWED_VARIANT_TYPES = ['ideal', 'owned', 'alt-stress', 'macron-only', 'ascii', 'alt'];
const ALLOWED_PROTO_LANGUAGES = [
  'proto-indo-european', 'proto-indo-iranian', 'proto-afro-asiatic', 'proto-semitic',
  'proto-polynesian', 'proto-uto-aztecan', 'proto-sino-tibetan', 'proto-mayan',
  'egyptian', 'sumerian', 'dravidian', 'isolate', 'unknown',
];
const ALLOWED_CERTAINTY = ['attested', 'speculative', 'disputed', 'unknown'];
const ALLOWED_COGNATE_RELATIONSHIPS = ['cognate', 'loan', 'derivative', 'variant', 'uncertain'];
const ALLOWED_SENSE_TYPES = ['primary', 'etymology', 'encyclopedic', 'mythological', 'scholarly'];

let pass = 0;
let fail = 0;
let warnCount = 0;

function assert(condition, message) {
  if (condition) {
    pass++;
  } else {
    fail++;
    console.log(`  ✗ ${message}`);
  }
}

function warn(message) {
  warnCount++;
  console.log(`  ⚠ ${message}`);
}

NEW_ENTRIES.forEach((entry) => {
  const label = entry.id || '?';
  console.log(`\nChecking ${label}…`);

  // Required fields
  ['id', 'ascii', 'unicode', 'greek', 'pantheon', 'tier', 'tierLabel', 'domain', 'meaning', 'sources', 'breakdown'].forEach((field) => {
    assert(entry[field] !== undefined && entry[field] !== null, `[${label}] missing ${field}`);
  });

  if (entry.ascii !== undefined) {
    assert(ASCII_REGEX.test(entry.ascii), `[${label}] ascii "${entry.ascii}" must be lowercase a-z only`);
  }

  if (entry.pantheon !== undefined) {
    assert(ALLOWED_PANTHEONS.includes(entry.pantheon), `[${label}] pantheon "${entry.pantheon}" not allowed`);
  }

  if (entry.tier !== undefined) {
    assert(ALLOWED_TIERS.includes(entry.tier), `[${label}] tier "${entry.tier}" not allowed`);
  }

  if (entry.tier === 'dual') assert(entry.tierLabel === 'Dual-Tier', `[${label}] dual-tier label wrong`);
  if (entry.tier === '1') assert(entry.tierLabel === 'Tier 1', `[${label}] tier-1 label wrong`);
  if (entry.tier === '2') assert(entry.tierLabel === 'Tier 2', `[${label}] tier-2 label wrong`);

  if (entry.unicode) {
    const nfc = entry.unicode.normalize('NFC');
    assert(entry.unicode === nfc, `[${label}] unicode "${entry.unicode}" not NFC`);
  }

  if (entry.greek && entry.greek !== '—') {
    const hasScript = /[\u0370-\u03FF\u1F00-\u1FFF]/.test(entry.greek) ||
      /[\u0900-\u097F]/.test(entry.greek) ||
      /[\u4E00-\u9FFF\u3040-\u309F\u30A0-\u30FF]/.test(entry.greek);
    assert(hasScript, `[${label}] greek "${entry.greek}" lacks recognized script`);
  }

  if (Array.isArray(entry.sources)) {
    assert(entry.sources.length > 0, `[${label}] sources empty`);
    entry.sources.forEach((src) => {
      assert(SOURCE_CATALOG[src], `[${label}] source "${src}" not in catalog`);
    });
  }

  if (Array.isArray(entry.breakdown)) {
    assert(entry.breakdown.length === entry.ascii.length, `[${label}] breakdown length mismatch`);
    entry.breakdown.forEach((step, j) => {
      assert(step.char !== undefined, `[${label}] breakdown[${j}] missing char`);
      assert(step.to !== undefined, `[${label}] breakdown[${j}] missing to`);
      assert(step.type !== undefined, `[${label}] breakdown[${j}] missing type`);
      assert(step.note !== undefined, `[${label}] breakdown[${j}] missing note`);
      assert(['stress', 'length', 'dual', 'special', 'drop', 'merge', 'same'].includes(step.type), `[${label}] breakdown[${j}] bad type`);
      assert(step.char.toLowerCase() === entry.ascii[j], `[${label}] breakdown[${j}] char mismatch`);
    });
  }

  if (entry.variants) {
    entry.variants.forEach((v, k) => {
      assert(typeof v.unicode === 'string' && v.unicode.length > 0, `[${label}] variant[${k}] missing unicode`);
      assert(v.unicode === v.unicode.normalize('NFC'), `[${label}] variant[${k}] not NFC`);
      assert(ALLOWED_VARIANT_TYPES.includes(v.type), `[${label}] variant[${k}] bad type`);
      assert(typeof v.note === 'string', `[${label}] variant[${k}] missing note`);
      if (v.type === 'alt-stress' || v.type === 'alt') {
        if (!v.sources || v.sources.length === 0) warn(`[${label}] variant[${k}] alt/alt-stress should cite sources`);
      }
      if (v.sources) {
        v.sources.forEach((src) => assert(SOURCE_CATALOG[src], `[${label}] variant source "${src}" not found`));
      }
    });
  }

  if (entry.etymology) {
    if (entry.etymology.protoLanguage) {
      assert(ALLOWED_PROTO_LANGUAGES.includes(entry.etymology.protoLanguage), `[${label}] bad protoLanguage`);
    }
    if (entry.etymology.certainty) {
      assert(ALLOWED_CERTAINTY.includes(entry.etymology.certainty), `[${label}] bad certainty`);
    }
    if (entry.etymology.cognates) {
      entry.etymology.cognates.forEach((c, k) => {
        assert(c.language && c.form && c.relationship, `[${label}] cognate[${k}] missing fields`);
        assert(ALLOWED_COGNATE_RELATIONSHIPS.includes(c.relationship), `[${label}] cognate[${k}] bad relationship`);
      });
    }
  }

  if (entry.senses) {
    entry.senses.forEach((s, k) => {
      assert(ALLOWED_SENSE_TYPES.includes(s.type), `[${label}] sense[${k}] bad type`);
      assert(typeof s.text === 'string' && s.text.length > 0, `[${label}] sense[${k}] missing text`);
    });
  }
});

console.log(`\n${'='.repeat(50)}`);
if (fail === 0) {
  console.log(`✓ All ${pass} assertions passed (${warnCount} warnings)`);
  process.exit(0);
} else {
  console.log(`✗ ${fail} failed, ${pass} passed`);
  process.exit(1);
}
