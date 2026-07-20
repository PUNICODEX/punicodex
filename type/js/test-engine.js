/**
 * PuniCodex Type — Engine Unit Test Suite
 * Run: node type/js/test-engine.js
 * Exit code 0 = all passed, 1 = any failed
 */

const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert');

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
const failures = [];

function test(name, fn) {
  try {
    fn();
    pass++;
  } catch (err) {
    fail++;
    failures.push({ name, error: err.message });
    console.log(`  ${C.red}✗${C.reset} ${name}`);
    console.log(`     ${C.dim}${err.message}${C.reset}`);
    return;
  }
}

function section(name) {
  console.log(`\n${C.cyan}▸ ${name}${C.reset}`);
}

// ═══════════════════════════════════════════════════════════
// ENGINE (production code under test)
// ═══════════════════════════════════════════════════════════

const PUNICODEX_ENGINE = require('./engine');
const {
  buildTrie,
  getNodeForPrefix,
  getCompletions,
  getValidNextChars,
  findExactMatches,
  findExactMatch,
} = PUNICODEX_ENGINE;

const trie = buildTrie(LEXICON);

// ═══════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════

section('Trie Construction');

test('All entries are reachable in trie', () => {
  LEXICON.forEach((entry) => {
    const node = getNodeForPrefix(trie, entry.ascii);
    assert.ok(node, `${entry.id} not reachable`);
    assert.strictEqual(node.isEnd, true, `${entry.id} not marked as end`);
    assert.ok(
      node.entries.some((e) => e.id === entry.id),
      `${entry.id} not in node.entries`
    );
  });
});

test('Every prefix of every entry is reachable', () => {
  LEXICON.forEach((entry) => {
    for (let i = 1; i < entry.ascii.length; i++) {
      const prefix = entry.ascii.slice(0, i);
      const node = getNodeForPrefix(trie, prefix);
      assert.ok(node, `prefix "${prefix}" of ${entry.id} not reachable`);
    }
  });
});

test('Invalid prefix returns null', () => {
  assert.strictEqual(getNodeForPrefix(trie, 'xyz'), null);
  assert.strictEqual(getNodeForPrefix(trie, 'qqq'), null);
  assert.strictEqual(getNodeForPrefix(trie, 'zzz'), null);
});

test('Empty prefix returns root node', () => {
  const node = getNodeForPrefix(trie, '');
  assert.ok(node);
  assert.strictEqual(node.isEnd, false);
});

section('Exact Match');

test('Exact match finds primary entry', () => {
  const entry = findExactMatch(trie, 'apollon');
  assert.ok(entry);
  assert.strictEqual(entry.id, 'apollon');
  assert.strictEqual(entry.unicode, 'Apóllōn');
});

test('Exact match is case-insensitive', () => {
  const e1 = findExactMatch(trie, 'APOLLON');
  const e2 = findExactMatch(trie, 'Apollon');
  const e3 = findExactMatch(trie, 'aPoLlOn');
  assert.ok(e1);
  assert.ok(e2);
  assert.ok(e3);
  assert.strictEqual(e1.id, 'apollon');
  assert.strictEqual(e2.id, 'apollon');
  assert.strictEqual(e3.id, 'apollon');
});

test('Non-existent name returns null', () => {
  assert.strictEqual(findExactMatch(trie, 'xyz'), null);
  assert.strictEqual(findExactMatch(trie, 'qwerty'), null);
});

test('Prefix returns null (not exact)', () => {
  assert.strictEqual(findExactMatch(trie, 'apo'), null);
  assert.strictEqual(findExactMatch(trie, 'apoll'), null);
});

test('Exact match respects pantheon filter', () => {
  const e = findExactMatch(trie, 'apollon', { pantheonFilter: 'greek' });
  assert.ok(e);
  assert.strictEqual(e.id, 'apollon');
});

test('Exact match blocked by wrong pantheon filter', () => {
  const e = findExactMatch(trie, 'apollon', { pantheonFilter: 'norse' });
  assert.strictEqual(e, null);
});

test('Exact match with greek-all includes greek-location', () => {
  const e = findExactMatch(trie, 'athenai', { pantheonFilter: 'greek-all' });
  assert.ok(e);
  assert.strictEqual(e.pantheon, 'greek-location');
});

test('Exact match with greek-all includes greek gods', () => {
  const e = findExactMatch(trie, 'zeus', { pantheonFilter: 'greek-all' });
  assert.ok(e);
  assert.strictEqual(e.pantheon, 'greek');
});

section('Variant Matching');

test('findExactMatches returns primary entry for shared ASCII', () => {
  const matches = findExactMatches(trie, 'apollon');
  assert.ok(matches.length >= 1, `Expected >=1 match, got ${matches.length}`);
  const ids = matches.map((m) => m.id);
  assert.ok(ids.includes('apollon'), 'Primary apollon missing');
});

test('Primary entries carry variants array', () => {
  const matches = findExactMatches(trie, 'apollon');
  const primary = matches.find((m) => m.id === 'apollon');
  assert.ok(primary, 'Primary apollon missing');
  assert.ok(
    primary.variants && primary.variants.length >= 1,
    'Expected >=1 scholarly variant on primary entry'
  );
});

test('findExactMatches respects pantheon filter', () => {
  const matches = findExactMatches(trie, 'apollon', { pantheonFilter: 'greek' });
  assert.ok(matches.length >= 1);
  matches.forEach((m) => assert.strictEqual(m.pantheon, 'greek'));
});

test('Hades primary entry has variants', () => {
  const matches = findExactMatches(trie, 'hades');
  const primary = matches.find((m) => m.id === 'hades');
  assert.ok(primary, 'Primary hades missing');
  assert.ok(
    primary.variants && primary.variants.length >= 1,
    'Expected >=1 scholarly variant on primary entry'
  );
});

section('Completions');

test('Empty prefix returns all entries', () => {
  const all = getCompletions(trie, '', { limit: Infinity });
  assert.strictEqual(all.length, LEXICON.length);
});

test('Prefix "a" returns completions', () => {
  const completions = getCompletions(trie, 'a');
  assert.ok(completions.length > 0);
  completions.forEach((c) => {
    assert.ok(c.ascii.toLowerCase().startsWith('a'), `${c.id} does not start with 'a'`);
  });
});

test('Prefix "apo" returns apollon primary', () => {
  const completions = getCompletions(trie, 'apo');
  const ids = completions.map((c) => c.id);
  assert.ok(ids.includes('apollon'), `Expected apollon in [${ids.join(', ')}]`);
});

test('Invalid prefix returns empty', () => {
  const completions = getCompletions(trie, 'xyz');
  assert.strictEqual(completions.length, 0);
});

test('Completions are sorted by length then alphabetically', () => {
  const completions = getCompletions(trie, '', { limit: 10 });
  for (let i = 1; i < completions.length; i++) {
    const prev = completions[i - 1];
    const curr = completions[i];
    const lenOk = prev.ascii.length <= curr.ascii.length;
    const alphaOk =
      prev.ascii.length !== curr.ascii.length || prev.ascii.localeCompare(curr.ascii) <= 0;
    assert.ok(
      lenOk,
      `Length sort violated: ${prev.ascii} (${prev.ascii.length}) > ${curr.ascii} (${curr.ascii.length})`
    );
    assert.ok(alphaOk, `Alpha sort violated: ${prev.ascii} > ${curr.ascii}`);
  }
});

test('Limit parameter works', () => {
  const all = getCompletions(trie, '', { limit: 5 });
  assert.strictEqual(all.length, 5);
  const more = getCompletions(trie, '', { limit: 50 });
  assert.strictEqual(more.length, 50);
});

test('Pantheon filter reduces results', () => {
  const all = getCompletions(trie, '', { limit: Infinity });
  const greek = getCompletions(trie, '', { pantheonFilter: 'greek', limit: Infinity });
  const norse = getCompletions(trie, '', { pantheonFilter: 'norse' });
  assert.ok(greek.length < all.length);
  assert.ok(norse.length < all.length);
  greek.forEach((e) => assert.strictEqual(e.pantheon, 'greek'));
  norse.forEach((e) => assert.strictEqual(e.pantheon, 'norse'));
});

test('greek-all filter includes both greek and greek-location', () => {
  const results = getCompletions(trie, '', { pantheonFilter: 'greek-all' });
  assert.ok(results.length > 0);
  results.forEach((e) => {
    assert.ok(
      e.pantheon === 'greek' || e.pantheon === 'greek-location',
      `${e.id} has pantheon ${e.pantheon}, expected greek or greek-location`
    );
  });
});

test('All 20 pantheon filters return non-empty results', () => {
  const pantheons = [
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
  pantheons.forEach((p) => {
    const results = getCompletions(trie, '', { pantheonFilter: p });
    assert.ok(results.length > 0, `Pantheon "${p}" returned empty results`);
  });
});

section('Valid Next Characters');

test('Empty input returns all first characters', () => {
  const chars = getValidNextChars(trie, '');
  const firstChars = new Set(LEXICON.map((e) => e.ascii[0].toLowerCase()));
  assert.deepStrictEqual(chars, Array.from(firstChars).sort());
});

test('"a" returns valid next chars', () => {
  const chars = getValidNextChars(trie, 'a');
  assert.ok(chars.length > 0);
  chars.forEach((c) => {
    const completions = getCompletions(trie, `a${c}`);
    assert.ok(completions.length > 0, `No completions for "a${c}"`);
  });
});

test('Complete word returns empty next chars', () => {
  const chars = getValidNextChars(trie, 'apollon');
  assert.deepStrictEqual(chars, []);
});

test('Invalid prefix returns empty next chars', () => {
  const chars = getValidNextChars(trie, 'xyz');
  assert.deepStrictEqual(chars, []);
});

test('Next chars respect pantheon filter', () => {
  const allChars = getValidNextChars(trie, '');
  const greekChars = getValidNextChars(trie, '', { pantheonFilter: 'greek' });
  assert.ok(greekChars.length <= allChars.length);
  greekChars.forEach((c) => {
    const completions = getCompletions(trie, c, { pantheonFilter: 'greek' });
    assert.ok(completions.length > 0);
  });
});

section('Pantheon Distribution');

test('Correct pantheon counts', () => {
  const counts = {};
  LEXICON.forEach((e) => {
    counts[e.pantheon] = (counts[e.pantheon] || 0) + 1;
  });
  assert.strictEqual(counts.greek, 268, 'Greek count');
  assert.strictEqual(counts['greek-location'], 24, 'Greek-location count');
  assert.strictEqual(counts.norse, 86, 'Norse count');
  assert.strictEqual(counts.egyptian, 67, 'Egyptian count');
  assert.strictEqual(counts.sanskrit, 92, 'Sanskrit count');
  assert.strictEqual(counts.celtic, 47, 'Celtic count');
  assert.strictEqual(counts.mesopotamian, 30, 'Mesopotamian count');
  assert.strictEqual(counts.polynesian, 23, 'Polynesian count');
  assert.strictEqual(counts.japanese, 45, 'Japanese count');
  assert.strictEqual(counts.nahuatl, 30, 'Nahuatl count');
  assert.strictEqual(counts.yoruba, 32, 'Yoruba count');
  assert.strictEqual(counts.slavic, 21, 'Slavic count');
  assert.strictEqual(counts.zoroastrian, 19, 'Zoroastrian count');
  assert.strictEqual(counts.incan, 12, 'Incan count');
  assert.strictEqual(counts.chinese, 47, 'Chinese count');
  assert.strictEqual(counts.buddhist, 21, 'Buddhist count');
  assert.strictEqual(counts.taoist, 12, 'Taoist count');
  assert.strictEqual(counts.korean, 12, 'Korean count');
  assert.strictEqual(counts.phoenician, 8, 'Phoenician count');
  assert.strictEqual(counts.hittite, 8, 'Hittite count');
  assert.strictEqual(counts.canaanite, 12, 'Canaanite count');
  assert.strictEqual(counts.baltic, 1, 'Baltic count');
  assert.strictEqual(counts.roman, 8, 'Roman count');
});

section('Unicode & Normalization');

test('All unicode strings are NFC-normalized', () => {
  LEXICON.forEach((entry) => {
    const nfc = entry.unicode.normalize('NFC');
    assert.strictEqual(entry.unicode, nfc, `${entry.id} is not NFC`);
  });
});

test('No replacement characters in unicode', () => {
  LEXICON.forEach((entry) => {
    const codePoints = [...entry.unicode];
    codePoints.forEach((cp) => {
      const code = cp.codePointAt(0);
      assert.notStrictEqual(code, 0xfffd, `${entry.id} contains replacement char`);
    });
  });
});

test('All ascii fields are lowercase a-z only', () => {
  LEXICON.forEach((entry) => {
    assert.ok(/^[a-z]+$/.test(entry.ascii), `${entry.id} ascii "${entry.ascii}" invalid`);
  });
});

section('Breakdown Integrity');

test('Breakdown length equals ascii length for all entries', () => {
  LEXICON.forEach((entry) => {
    assert.strictEqual(
      entry.breakdown.length,
      entry.ascii.length,
      `${entry.id}: breakdown ${entry.breakdown.length} != ascii ${entry.ascii.length}`
    );
  });
});

test('Each breakdown char matches corresponding ascii char', () => {
  LEXICON.forEach((entry) => {
    entry.breakdown.forEach((step, j) => {
      const expected = entry.ascii[j].toLowerCase();
      assert.strictEqual(
        step.char.toLowerCase(),
        expected,
        `${entry.id}[${j}]: "${step.char}" != "${entry.ascii[j]}"`
      );
    });
  });
});

test('All breakdown types are valid', () => {
  const validTypes = ['stress', 'length', 'dual', 'special', 'drop', 'merge', 'same'];
  LEXICON.forEach((entry) => {
    entry.breakdown.forEach((step, j) => {
      assert.ok(validTypes.includes(step.type), `${entry.id}[${j}]: invalid type "${step.type}"`);
    });
  });
});

section('Sources');

test('All entries have sources array', () => {
  LEXICON.forEach((entry) => {
    assert.ok(Array.isArray(entry.sources), `${entry.id}: sources not an array`);
    assert.ok(entry.sources.length > 0, `${entry.id}: sources empty`);
  });
});

test('All sources are non-empty strings', () => {
  LEXICON.forEach((entry) => {
    entry.sources.forEach((src, i) => {
      assert.ok(
        typeof src === 'string' && src.length > 0,
        `${entry.id}.sources[${i}]: invalid source`
      );
    });
  });
});

test('Greek entries cite at least one major scholarly source', () => {
  const validGreekSources = new Set([
    'LSJ',
    'Beekes',
    'Pape-Benseler',
    'Homer',
    'Hesiod',
    'Orphic',
    'West',
    'Cicero',
    'Lewis-Short',
  ]);
  LEXICON.filter((e) => e.pantheon === 'greek').forEach((entry) => {
    const hasSource = entry.sources.some((s) => validGreekSources.has(s));
    assert.ok(
      hasSource,
      `${entry.id} missing recognized Greek source (has: ${entry.sources.join(', ')})`
    );
  });
});

test('Egyptian entries cite Faulkner', () => {
  LEXICON.filter((e) => e.pantheon === 'egyptian').forEach((entry) => {
    assert.ok(entry.sources.includes('Faulkner'), `${entry.id} missing Faulkner`);
  });
});

section('Uniqueness');

test('All ids are unique', () => {
  const ids = new Set();
  LEXICON.forEach((entry) => {
    assert.ok(!ids.has(entry.id), `duplicate id: ${entry.id}`);
    ids.add(entry.id);
  });
});

test('All unicode values are unique', () => {
  const unicodes = new Set();
  LEXICON.forEach((entry) => {
    assert.ok(!unicodes.has(entry.unicode), `duplicate unicode: ${entry.unicode} (${entry.id})`);
    unicodes.add(entry.unicode);
  });
});

section('Stacked-Diacritic Derivation');

const { deriveStackedForm } = PUNICODEX_ENGINE;
const entryById = (id) => LEXICON.find((e) => e.id === id);

test('Athena derives Athḗnā from Ἀθήνᾶ (acute on long eta)', () => {
  assert.strictEqual(deriveStackedForm(entryById('athena')), 'Athḗnā');
});

test('Hera derives Hḗra from Ἥρα (stress restored onto the long eta)', () => {
  assert.strictEqual(deriveStackedForm(entryById('hera')), 'Hḗra');
});

test('Leto derives Lētṓ from Λητώ (acute on long omega)', () => {
  assert.strictEqual(deriveStackedForm(entryById('leto')), 'Lētṓ');
});

test('Epeiros derives Ḗpeiros (precomposed capital stack)', () => {
  assert.strictEqual(deriveStackedForm(entryById('epeiros')), 'Ḗpeiros');
});

test('Derived stacks are single precomposed NFC codepoints', () => {
  const athena = deriveStackedForm(entryById('athena'));
  assert.strictEqual(athena, athena.normalize('NFC'));
  assert.ok(athena.includes('ḗ'), `expected precomposed ḗ U+1E17 in ${athena}`);
  assert.ok(!athena.includes('̄'), `loose combining macron in ${athena}`);
  const leto = deriveStackedForm(entryById('leto'));
  assert.strictEqual(leto, leto.normalize('NFC'));
  assert.ok(leto.includes('ṓ'), `expected precomposed ṓ U+1E53 in ${leto}`);
});

test('Apollo derives nothing — stress on short omicron, length on unstressed omega', () => {
  assert.strictEqual(deriveStackedForm(entryById('apollon')), null);
});

test('Zeus derives nothing — the ευ diphthong is never macron-marked', () => {
  assert.strictEqual(deriveStackedForm(entryById('zeus')), null);
});

test('Persephone derives nothing — stress and length on different syllables', () => {
  assert.strictEqual(deriveStackedForm(entryById('persephone')), null);
});

test('Nike and Hekate derive nothing — acute on ι/α, length not orthographically marked', () => {
  assert.strictEqual(deriveStackedForm(entryById('nike')), null);
  assert.strictEqual(deriveStackedForm(entryById('hekate')), null);
});

test('Hermes and Poseidon derive nothing — circumflex already fuses length + stress', () => {
  assert.strictEqual(deriveStackedForm(entryById('hermes')), null);
  assert.strictEqual(deriveStackedForm(entryById('poseidon')), null);
});

test('Psyche derives nothing — the primary already carries the stack', () => {
  assert.strictEqual(deriveStackedForm(entryById('psyche')), null);
});

test('Non-Greek entries derive nothing (no Greek accent logic on other scripts)', () => {
  ['odinn', 'isis', 'ra', 'thor'].forEach((id) => {
    const entry = entryById(id);
    if (entry) assert.strictEqual(deriveStackedForm(entry), null, `${id} should not stack`);
  });
});

test('Malformed entries derive nothing', () => {
  assert.strictEqual(deriveStackedForm(null), null);
  assert.strictEqual(deriveStackedForm({}), null);
  assert.strictEqual(deriveStackedForm({ greek: '—', unicode: 'X' }), null);
  assert.strictEqual(deriveStackedForm({ greek: 'Ἥρα' }), null);
});

test('Derived forms never duplicate the primary or an existing variant (whole lexicon)', () => {
  LEXICON.forEach((entry) => {
    const form = deriveStackedForm(entry);
    if (!form) return;
    const taken = new Set(
      [entry.unicode, ...(entry.variants || []).map((v) => v.unicode)].map((s) =>
        s.normalize('NFC')
      )
    );
    assert.ok(!taken.has(form), `${entry.id}: stacked form ${form} duplicates an existing form`);
  });
});

test('Every derived form is NFC and contains a stacked vowel (whole lexicon)', () => {
  let count = 0;
  LEXICON.forEach((entry) => {
    const form = deriveStackedForm(entry);
    if (!form) return;
    count++;
    assert.strictEqual(form, form.normalize('NFC'), `${entry.id}: ${form} is not NFC`);
    assert.notStrictEqual(form, entry.unicode, `${entry.id}: stacked form equals primary`);
    let run = 0;
    let hasStack = false;
    for (const char of form.normalize('NFD')) {
      const cp = char.codePointAt(0);
      if (cp >= 0x0300 && cp <= 0x036f) {
        run++;
        if (run >= 2) hasStack = true;
      } else {
        run = 0;
      }
    }
    assert.ok(hasStack, `${entry.id}: no stacked vowel in ${form}`);
  });
  assert.ok(count >= 20, `expected at least 20 derivable stacked forms, got ${count}`);
});

test('Type tool wires stacked chips into the copyable variant list (source-level)', () => {
  const typeJs = fs.readFileSync(path.join(__dirname, 'type.js'), 'utf8');
  assert.ok(typeJs.includes('deriveStackedForm'), 'type.js does not call deriveStackedForm');
  assert.ok(typeJs.includes("type: 'stacked'"), 'type.js does not build the stacked chip');
  assert.ok(
    typeJs.includes("querySelectorAll('.variation-chip')") &&
      typeJs.includes('btn.dataset.unicode'),
    'generic variation-chip copy handler missing'
  );
  const typeCss = fs.readFileSync(path.join(__dirname, '..', 'css', 'type.css'), 'utf8');
  assert.ok(typeCss.includes('.variation-stacked'), 'type.css lacks .variation-stacked styling');
});

section('Regression Tests');

test('IME composition does not break trie (simulated)', () => {
  const node = getNodeForPrefix(trie, 'tokyo');
  assert.ok(node);
  assert.ok(node.isEnd);
  assert.strictEqual(node.entries[0].unicode, 'Tōkyō');
});

test('Preview overlap fix: exact match returns locked preview', () => {
  const entry = findExactMatch(trie, 'tokyo');
  assert.ok(entry);
  assert.strictEqual(entry.unicode, 'Tōkyō');
});

test('Sanskrit filter option exists and returns results', () => {
  const results = getCompletions(trie, '', { pantheonFilter: 'sanskrit' });
  assert.ok(results.length > 0);
  results.forEach((e) => assert.strictEqual(e.pantheon, 'sanskrit'));
});

test('Japanese entries with long vowels are reachable', () => {
  const tokyo = findExactMatch(trie, 'tokyo');
  assert.ok(tokyo);
  assert.strictEqual(tokyo.unicode, 'Tōkyō');
  const osaka = findExactMatch(trie, 'osaka');
  assert.ok(osaka);
  assert.strictEqual(osaka.unicode, 'Ōsaka');
});

test('Yoruba underdot entries are reachable', () => {
  const shango = findExactMatch(trie, 'shango');
  assert.ok(shango);
  assert.strictEqual(shango.unicode, 'Ṣàngó');
});

test('Nahuatl macron entries are reachable', () => {
  const quetzal = findExactMatch(trie, 'quetzalcoatl');
  assert.ok(quetzal);
  assert.strictEqual(quetzal.unicode, 'Quetzalcōātl');
});

// ═══════════════════════════════════════════════════════════
// SUMMARY
// ═══════════════════════════════════════════════════════════
console.log(`\n${'='.repeat(50)}`);
console.log(`  ${C.dim}Total entries in lexicon:${C.reset} ${LEXICON.length}`);
console.log(`  ${C.green}✓ Passed:${C.reset} ${pass}`);
if (fail > 0) {
  console.log(`  ${C.red}✗ Failed:${C.reset} ${fail}`);
  console.log(`\n${C.red}Failed tests:${C.reset}`);
  failures.forEach((f) => console.log(`  • ${f.name}`));
  process.exit(1);
} else {
  console.log(`  ${C.green}✓ All ${pass} tests passed${C.reset}`);
  process.exit(0);
}
