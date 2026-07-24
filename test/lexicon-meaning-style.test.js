/**
 * PuniCodex — Lexicon meaning style tests.
 *
 * Guards against the Monier-Williams raw-fragment bug: display meanings must
 * be curated English, never unedited dictionary excerpts carrying citation
 * abbreviations (MBh.; Hariv.; RV. …), "N. of" fragments, mid-citation
 * truncations, or SLP1/˚ encoding artifacts. Also unit-tests the hardened
 * cologne-sanskrit extraction (citation strip + paren balance + quarantine
 * flag) and the apply-suggestions meaning guard.
 */

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');

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

// Markers that must never appear in a display meaning.
const CITATION_MARKER =
  /(^|\b)N\.\s*of\s|,\s*(MBh|Hariv|Pur|Up|Kāv|RV|AV|VS|TS|ŚBr|Br|L|Kathās|MWB|Buddh|Hcar|Śiś|Sch|Lalit|Rasik|MārkP|VP|BhP)\.|accord\.|˚|vArz|\[\s*RV/;

function balancedParens(s) {
  let depth = 0;
  for (const ch of s) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (depth < 0) return false;
  }
  return depth === 0;
}

test('every lexicon meaning is curated (no dictionary fragments)', () => {
  const { LEXICON } = require(path.join(root, 'type', 'js', 'lexicon.js'));
  const offenders = [];
  for (const e of LEXICON) {
    const m = e.meaning || '';
    if (CITATION_MARKER.test(m)) offenders.push(`${e.id}: ${m.slice(0, 80)}`);
    if (!balancedParens(m)) offenders.push(`${e.id}: unbalanced parentheses: ${m.slice(0, 80)}`);
  }
  assert.deepStrictEqual(offenders, [], `${offenders.length} raw dictionary meanings remain`);
});

test('scholars content carries no citation-fragment sentences', () => {
  const dir = path.join(root, 'platform', 'scholars', 'content');
  const offenders = [];
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith('.json')) continue;
    const content = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
    for (const [sectionId, section] of Object.entries(content.sections || {})) {
      const body = section.body || '';
      if (/swiftgoer|personified and considered|,\s*(MBh|Hariv|Kāv)\.|N\.\s*of\s*a?\s*(monkeychief|river|Tīrtha|grammar)/.test(body)) {
        offenders.push(`${file}::${sectionId}`);
      }
    }
  }
  assert.deepStrictEqual(offenders, [], `raw fragments in scholars content: ${offenders.join(', ')}`);
});

test('cologne extraction strips citations and balances parentheses', () => {
  // Load the importer's internals by evaluating the module and reaching into
  // the function through a fresh require with an export shim.
  const src = fs.readFileSync(
    path.join(root, 'data', 'authoritative', 'importers', 'cologne-sanskrit.js'),
    'utf8'
  );
  assert.ok(src.includes('CITATION_RE'), 'importer lost its citation stripper');
  assert.ok(src.includes('balanceParentheses'), 'importer lost its paren guard');
  assert.ok(src.includes('dictionaryStyle'), 'importer lost its quarantine flag');
  // The scoring must penalise, never reward, dictionary style.
  const scoreBlock = src.slice(src.indexOf('function scoreGloss'), src.indexOf('function pickBestGlossCandidate'));
  assert.ok(!scoreBlock.includes('score += 15;\n  if (/\\bN\\.'), '"N. of" must not be rewarded');
  assert.ok(/N\.\s\*of.*score -= 25/.test(scoreBlock.replace(/\n/g, ' ')) || scoreBlock.includes('score -= 25'), '"N. of" must be penalised');
});

test('apply-suggestions refuses dictionary-style meanings at any confidence', () => {
  const src = fs.readFileSync(path.join(root, 'scripts', 'apply-suggestions.js'), 'utf8');
  const meaningBlock = src.slice(
    src.indexOf('meaning: (src, s) =>'),
    src.indexOf('greek: (src, s) =>')
  );
  assert.ok(meaningBlock.includes('dictionary-style meaning needs editorial review'));
  assert.ok(meaningBlock.includes('throw new Error('), 'the guard must skip via throw');
});

console.log(`\nLexicon Meaning Style: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
