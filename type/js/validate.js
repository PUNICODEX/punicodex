/**
 * PÚNYCODEX Type — Lexicon & Engine Validation Suite
 * Run: node type/js/validate.js
 * Exit code 0 = all passed, 1 = any failed
 */

const fs = require('node:fs');
const path = require('node:path');
const {
  getOriginalScript,
  getProvenance,
  containsGreekOrCjk,
  isPlaceholder,
} = require('./original-scripts.js');

// ── Load lexicon ──────────────────────────────────────────
const lexiconPath = path.join(__dirname, 'lexicon.js');
const lexiconCode = fs.readFileSync(lexiconPath, 'utf8').replace('const LEXICON', 'var LEXICON');
const lexiconFn = new Function(`${lexiconCode}; return LEXICON;`);
const LEXICON = lexiconFn();

// ── ANSI colors ───────────────────────────────────────────
const C = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
};

let pass = 0;
let fail = 0;
let warnCount = 0;

function assert(condition, message) {
  if (condition) {
    pass++;
  } else {
    fail++;
    console.log(`  ${C.red}✗${C.reset} ${message}`);
  }
}

function warn(message) {
  warnCount++;
  console.log(`  ${C.yellow}⚠${C.reset} ${message}`);
}

function section(name) {
  console.log(`\n${C.cyan}▸ ${name}${C.reset}`);
}

// ═══════════════════════════════════════════════════════════
// 1. SCHEMA VALIDATION
// ═══════════════════════════════════════════════════════════
section('Schema Validation');

const REQUIRED_FIELDS = [
  'id',
  'ascii',
  'unicode',
  'greek',
  'pantheon',
  'tier',
  'tierLabel',
  'domain',
  'meaning',
  'sources',
  'breakdown',
];
const ALLOWED_PANTHEONS = [
  'greek',
  'greek-location',
  'norse',
  'egyptian',
  'sanskrit',
  'celtic',
  'mesopotamian',
  'polynesian',
  'japanese',
  'nahuatl',
  'yoruba',
  'slavic',
  'zoroastrian',
  'incan',
  'chinese',
  'buddhist',
  'taoist',
  'korean',
  'phoenician',
  'hittite',
  'canaanite',
];
const ALLOWED_TIERS = ['dual', '1', '2'];
const ASCII_REGEX = /^[a-z]+$/;

LEXICON.forEach((entry, i) => {
  const label = `${entry.id || `#${i}`}`;

  REQUIRED_FIELDS.forEach((field) => {
    assert(
      entry[field] !== undefined && entry[field] !== null,
      `[${label}] missing required field: ${field}`
    );
  });

  if (entry.ascii !== undefined) {
    assert(
      ASCII_REGEX.test(entry.ascii),
      `[${label}] ascii "${entry.ascii}" must be lowercase a-z only`
    );
  }

  if (entry.pantheon !== undefined) {
    assert(
      ALLOWED_PANTHEONS.includes(entry.pantheon),
      `[${label}] pantheon "${entry.pantheon}" not in allowed set`
    );
  }

  if (entry.tier !== undefined) {
    assert(
      ALLOWED_TIERS.includes(entry.tier),
      `[${label}] tier "${entry.tier}" not in allowed set`
    );
  }

  // Tier label consistency
  if (entry.tier === 'dual') {
    assert(entry.tierLabel === 'Dual-Tier', `[${label}] dual-tier must have tierLabel "Dual-Tier"`);
  } else if (entry.tier === '1') {
    assert(entry.tierLabel === 'Tier 1', `[${label}] tier-1 must have tierLabel "Tier 1"`);
  } else if (entry.tier === '2') {
    assert(entry.tierLabel === 'Tier 2', `[${label}] tier-2 must have tierLabel "Tier 2"`);
  }

  // Unicode NFC normalization
  if (entry.unicode) {
    const nfc = entry.unicode.normalize('NFC');
    assert(entry.unicode === nfc, `[${label}] unicode "${entry.unicode}" is not NFC-normalized`);
  }

  // Greek field check
  if (entry.greek && entry.greek !== '—') {
    assert(
      /[\u0370-\u03FF\u1F00-\u1FFF]/.test(entry.greek) ||
        /[\u0900-\u097F]/.test(entry.greek) ||
        /[\u4E00-\u9FFF\u3040-\u309F\u30A0-\u30FF]/.test(entry.greek),
      `[${label}] greek/original script "${entry.greek}" doesn't contain Greek, Devanagari, or CJK blocks`
    );
  }

  // originalScript field check
  if (entry.originalScript !== undefined) {
    assert(typeof entry.originalScript === 'string', `[${label}] originalScript must be a string`);
  }

  const resolvedOriginal = getOriginalScript(entry);
  if (resolvedOriginal && !isPlaceholder(resolvedOriginal)) {
    const ORIGINAL_SCRIPT_REGEX = new RegExp(
      '[' +
        '\\u{0370}-\\u{03FF}' + // Greek
        '\\u{1F00}-\\u{1FFF}' + // Greek Extended
        '\\u{0900}-\\u{097F}' + // Devanagari
        '\\u{4E00}-\\u{9FFF}\\u{3040}-\\u{309F}\\u{30A0}-\\u{30FF}' + // CJK
        '\\u{12000}-\\u{123FF}\\u{12400}-\\u{1247F}' + // Cuneiform
        '\\u{13000}-\\u{1342F}' + // Egyptian hieroglyphs
        '\\u{10380}-\\u{1039F}' + // Ugaritic
        '\\u{10900}-\\u{1091F}' + // Phoenician
        '\\u{103A0}-\\u{103DF}' + // Old Persian
        '\\u{16A0}-\\u{16FF}' + // Runic
        '\\u{10B00}-\\u{10B3F}' + // Avestan
        '\\u{14400}-\\u{1467F}' + // Anatolian hieroglyphs
        ']',
      'u'
    );
    assert(
      ORIGINAL_SCRIPT_REGEX.test(resolvedOriginal),
      `[${label}] resolved original script "${resolvedOriginal}" is not in a recognized script block`
    );

    // Non-Greek/CJK original scripts that differ from the Unicode restoration
    // must carry provenance explaining the transition from original to transliteration.
    if (!containsGreekOrCjk(resolvedOriginal) && resolvedOriginal !== entry.unicode) {
      const provenance = getProvenance(entry);
      assert(
        provenance &&
          Array.isArray(provenance.steps) &&
          provenance.steps.length > 0 &&
          Array.isArray(provenance.sources) &&
          provenance.sources.length > 0,
        `[${label}] original script "${resolvedOriginal}" differs from unicode and must have provenance.steps + provenance.sources`
      );
    }
  }

  // Variants check (optional)
  const ALLOWED_VARIANT_TYPES = ['ideal', 'owned', 'alt-stress', 'macron-only', 'ascii', 'alt'];
  if (entry.variants !== undefined) {
    assert(Array.isArray(entry.variants), `[${label}] variants must be an array`);
    const variantUnicodes = new Set();
    entry.variants.forEach((v, k) => {
      assert(typeof v === 'object' && v !== null, `[${label}] variants[${k}] must be an object`);
      assert(
        typeof v.unicode === 'string' && v.unicode.length > 0,
        `[${label}] variants[${k}] missing unicode`
      );
      assert(
        v.unicode === v.unicode.normalize('NFC'),
        `[${label}] variants[${k}] unicode "${v.unicode}" is not NFC-normalized`
      );
      assert(typeof v.type === 'string', `[${label}] variants[${k}] missing type`);
      assert(
        ALLOWED_VARIANT_TYPES.includes(v.type),
        `[${label}] variants[${k}] type "${v.type}" not in allowed set: ${ALLOWED_VARIANT_TYPES.join(', ')}`
      );
      assert(typeof v.note === 'string', `[${label}] variants[${k}] missing note`);
      if (v.sources !== undefined) {
        assert(
          Array.isArray(v.sources) &&
            v.sources.length > 0 &&
            v.sources.every((s) => typeof s === 'string' && s.length > 0),
          `[${label}] variants[${k}] sources must be a non-empty array of non-empty strings`
        );
      }
      if (v.type === 'alt-stress' || v.type === 'alt') {
        if (!v.sources || v.sources.length === 0) {
          warn(
            `[${label}] variants[${k}] type "${v.type}" should cite sources to appear in the type tool`
          );
        }
      }
      assert(
        v.unicode !== entry.unicode,
        `[${label}] variants[${k}] unicode "${v.unicode}" duplicates parent unicode`
      );
      assert(
        !variantUnicodes.has(v.unicode),
        `[${label}] variants[${k}] unicode "${v.unicode}" is duplicated within variants`
      );
      variantUnicodes.add(v.unicode);
    });
  }

  // Dual-tier entries must have variants
  if (entry.tier === 'dual') {
    assert(
      entry.variants && entry.variants.length >= 2,
      `[${label}] dual-tier entry must have at least 2 variants, got ${entry.variants ? entry.variants.length : 0}`
    );
  }

  // Etymology check (optional)
  const ALLOWED_PROTO_LANGUAGES = [
    'proto-indo-european',
    'proto-afro-asiatic',
    'proto-polynesian',
    'proto-uto-aztecan',
    'proto-sino-tibetan',
    'proto-mayan',
    'isolate',
    'unknown',
  ];
  const ALLOWED_CERTAINTY = ['attested', 'speculative', 'disputed', 'unknown'];
  const ALLOWED_COGNATE_RELATIONSHIPS = ['cognate', 'loan', 'derivative', 'variant', 'uncertain'];
  if (entry.etymology !== undefined) {
    assert(
      typeof entry.etymology === 'object' && entry.etymology !== null,
      `[${label}] etymology must be an object`
    );
    const e = entry.etymology;
    if (e.protoForm !== undefined) {
      assert(typeof e.protoForm === 'string', `[${label}] etymology.protoForm must be a string`);
    }
    if (e.protoLanguage !== undefined) {
      assert(
        ALLOWED_PROTO_LANGUAGES.includes(e.protoLanguage),
        `[${label}] etymology.protoLanguage "${e.protoLanguage}" not in allowed set: ${ALLOWED_PROTO_LANGUAGES.join(', ')}`
      );
    }
    if (e.protoGloss !== undefined) {
      assert(typeof e.protoGloss === 'string', `[${label}] etymology.protoGloss must be a string`);
    }
    if (e.derivation !== undefined) {
      assert(typeof e.derivation === 'string', `[${label}] etymology.derivation must be a string`);
    }
    if (e.certainty !== undefined) {
      assert(
        ALLOWED_CERTAINTY.includes(e.certainty),
        `[${label}] etymology.certainty "${e.certainty}" not in allowed set: ${ALLOWED_CERTAINTY.join(', ')}`
      );
    }
    if (e.cognates !== undefined) {
      assert(Array.isArray(e.cognates), `[${label}] etymology.cognates must be an array`);
      e.cognates.forEach((c, k) => {
        assert(
          typeof c === 'object' && c !== null,
          `[${label}] etymology.cognates[${k}] must be an object`
        );
        assert(
          typeof c.language === 'string' && c.language.length > 0,
          `[${label}] etymology.cognates[${k}] missing language`
        );
        assert(
          typeof c.form === 'string' && c.form.length > 0,
          `[${label}] etymology.cognates[${k}] missing form`
        );
        assert(
          typeof c.relationship === 'string',
          `[${label}] etymology.cognates[${k}] missing relationship`
        );
        assert(
          ALLOWED_COGNATE_RELATIONSHIPS.includes(c.relationship),
          `[${label}] etymology.cognates[${k}] relationship "${c.relationship}" not in allowed set: ${ALLOWED_COGNATE_RELATIONSHIPS.join(', ')}`
        );
      });
    }
  }

  // Sources check
  if (Array.isArray(entry.sources)) {
    assert(entry.sources.length > 0, `[${label}] sources array must not be empty`);
    entry.sources.forEach((src, k) => {
      assert(
        typeof src === 'string' && src.length > 0,
        `[${label}] sources[${k}] must be a non-empty string`
      );
    });
  } else {
    assert(false, `[${label}] sources must be an array`);
  }

  // Breakdown integrity
  if (Array.isArray(entry.breakdown)) {
    assert(
      entry.breakdown.length === entry.ascii.length,
      `[${label}] breakdown length (${entry.breakdown.length}) != ascii length (${entry.ascii.length})`
    );

    entry.breakdown.forEach((step, j) => {
      assert(step.char !== undefined, `[${label}] breakdown[${j}] missing "char"`);
      assert(step.to !== undefined, `[${label}] breakdown[${j}] missing "to"`);
      assert(step.type !== undefined, `[${label}] breakdown[${j}] missing "type"`);
      assert(step.note !== undefined, `[${label}] breakdown[${j}] missing "note"`);
      assert(
        ['stress', 'length', 'dual', 'special', 'drop', 'merge', 'same'].includes(step.type),
        `[${label}] breakdown[${j}] unknown type "${step.type}"`
      );

      // Input char must match the corresponding ascii character (case-insensitive)
      const expectedChar = entry.ascii[j].toLowerCase();
      assert(
        step.char.toLowerCase() === expectedChar,
        `[${label}] breakdown[${j}] char "${step.char}" doesn't match ascii[${j}] "${entry.ascii[j]}"`
      );
    });
  }
});

// ═══════════════════════════════════════════════════════════
// 2. UNIQUENESS
// ═══════════════════════════════════════════════════════════
section('Uniqueness Checks');

const ids = new Set();
const asciis = new Set();
const unicodes = new Set();

LEXICON.forEach((entry) => {
  assert(!ids.has(entry.id), `duplicate id: ${entry.id}`);
  ids.add(entry.id);

  // NOTE: Duplicate ASCII is allowed for spelling variants (same ASCII, different Unicode)
  asciis.add(entry.ascii);

  assert(!unicodes.has(entry.unicode), `duplicate unicode: ${entry.unicode} (${entry.id})`);
  unicodes.add(entry.unicode);
});

// ═══════════════════════════════════════════════════════════
// 3. TRIE INTEGRITY
// ═══════════════════════════════════════════════════════════
section('Trie Integrity');

class TrieNode {
  constructor() {
    this.children = {};
    this.isEnd = false;
    this.entries = [];
  }
}

function buildTrie(lexicon) {
  const root = new TrieNode();
  lexicon.forEach((entry) => {
    const ascii = entry.ascii.toLowerCase();
    let node = root;
    for (const char of ascii) {
      if (!node.children[char]) node.children[char] = new TrieNode();
      node = node.children[char];
    }
    node.isEnd = true;
    node.entries.push(entry);
  });
  return root;
}

const trie = buildTrie(LEXICON);

function getNodeForPrefix(prefix) {
  let node = trie;
  for (const char of prefix.toLowerCase()) {
    if (!node.children[char]) return null;
    node = node.children[char];
  }
  return node;
}

// Every entry must be reachable
LEXICON.forEach((entry) => {
  const node = getNodeForPrefix(entry.ascii);
  assert(node !== null, `[${entry.id}] not reachable in trie`);
  assert(node.isEnd === true, `[${entry.id}] trie node not marked as end`);
  assert(
    node.entries.some((e) => e.id === entry.id),
    `[${entry.id}] trie node missing entry`
  );
});

// Prefix reachability: every prefix of every entry must be reachable
LEXICON.forEach((entry) => {
  for (let i = 1; i < entry.ascii.length; i++) {
    const prefix = entry.ascii.slice(0, i);
    const node = getNodeForPrefix(prefix);
    assert(node !== null, `[${entry.id}] prefix "${prefix}" not reachable`);
  }
});

// ═══════════════════════════════════════════════════════════
// 4. COMPLETION CORRECTNESS
// ═══════════════════════════════════════════════════════════
section('Completion Correctness');

function getCompletions(prefix, limit = Infinity) {
  const node = getNodeForPrefix(prefix);
  if (!node) return [];
  const entries = new Set();
  function collect(n) {
    for (const e of n.entries) entries.add(e);
    for (const child of Object.values(n.children)) collect(child);
  }
  collect(node);
  return Array.from(entries).slice(0, limit);
}

// Every entry must be findable as a completion of its own full ascii
LEXICON.forEach((entry) => {
  const completions = getCompletions(entry.ascii);
  const found = completions.some((c) => c.id === entry.id);
  assert(found, `[${entry.id}] not found in completions of its own ascii`);
});

// Empty prefix should return all entries
const allCompletions = getCompletions('');
assert(
  allCompletions.length === LEXICON.length,
  `empty prefix returned ${allCompletions.length} entries, expected ${LEXICON.length}`
);

// Invalid prefix should return empty
const noCompletions = getCompletions('xyz');
assert(
  noCompletions.length === 0,
  `invalid prefix "xyz" returned ${noCompletions.length} entries, expected 0`
);

// ═══════════════════════════════════════════════════════════
// 5. UNICODE RENDERABILITY
// ═══════════════════════════════════════════════════════════
section('Unicode Renderability');

LEXICON.forEach((entry) => {
  const codePoints = [...entry.unicode];
  codePoints.forEach((cp, i) => {
    const code = cp.codePointAt(0);
    // Check for replacement character (indicates encoding issue)
    assert(
      code !== 0xfffd,
      `[${entry.id}] unicode char at pos ${i} is replacement char (encoding corruption)`
    );
    // Check for control characters
    assert(
      !(code >= 0x00 && code <= 0x1f) && !(code >= 0x7f && code <= 0x9f),
      `[${entry.id}] unicode char at pos ${i} is a control character`
    );
  });
});

// ═══════════════════════════════════════════════════════════
// 6. COUNTS
// ═══════════════════════════════════════════════════════════
section('Counts');

const counts = {};
LEXICON.forEach((e) => {
  counts[e.pantheon] = (counts[e.pantheon] || 0) + 1;
});

console.log(`  ${C.dim}Total entries: ${LEXICON.length}${C.reset}`);
Object.entries(counts).forEach(([p, c]) => {
  console.log(`  ${C.dim}${p}: ${C.reset}${c}`);
});

// ═══════════════════════════════════════════════════════════
// SUMMARY
// ═══════════════════════════════════════════════════════════
console.log(`\n${'='.repeat(50)}`);
if (fail === 0) {
  const warnMsg = warnCount > 0 ? ` (${warnCount} warning${warnCount === 1 ? '' : 's'})` : '';
  console.log(`${C.green}✓ All ${pass} assertions passed${C.reset}${warnMsg}`);
  process.exit(0);
} else {
  console.log(`${C.red}✗ ${fail} failed, ${pass} passed${C.reset}`);
  process.exit(1);
}
