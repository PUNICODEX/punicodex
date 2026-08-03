#!/usr/bin/env node
/**
 * PuniCodex — Pronunciation Rules Coverage Validator
 *
 * Measurement tool, not a gate (always exits 0). For every entry in the
 * curated pronunciation atlas, derives a pronunciation with
 * type/js/pronunciation-rules.js and compares it against the atlas IPA.
 *
 * NORMALIZATION CHOICES (review these before reading the numbers)
 *
 * The atlas mixes two transcription styles: hand-curated IPA (acute-accented
 * vowels, ɛː/ɔː, ɡ, tie bars) and a generated reconstruction style
 * (pre-syllable ˈ, eː/oː, plain ASCII). Both sides are normalized with the
 * same deterministic pipeline before comparison:
 *
 *   1.  Strip IPA delimiters (/ /, [ ]) and whitespace.
 *   2.  NFD decomposition; ASCII ':' and 'ˑ' → 'ː'.
 *   3.  Tie bars removed (t͡s → ts): presence of the tie bar is notational.
 *   4.  ɡ (U+0261) → g.
 *   5.  ʲ → j, ʷ → w: palatalization/labialization written two ways.
 *   6.  Non-syllabic mark U+032F dropped: the atlas writes eu ~ eu̯ freely.
 *   7.  ɾ → r: the atlas writes the Japanese tap as plain r.
 *   8.  ꜣ → ʔ, ꜥ → ʕ: atlas Egyptian IPA sometimes keeps transliteration
 *       letters instead of IPA values.
 *   9.  Secondary stress ˌ dropped (never contrastive in this data).
 *   10. All vowel stress marks unified to U+0301: acute, grave, circumflex
 *       and caron (the curated atlas uses á, and also ě / ɛ̌ː) all mean
 *       "stressed" here.
 *   11. Pre-syllable ˈ is moved onto the syllable's first vowel (vowel set
 *       includes syllabic r̩), so both stress notations compare equal.
 *   12. Syllable dots, hyphens and parentheses dropped (parenthesised
 *       segments are kept, e.g. (w) → w).
 *   13. Stress acute is ordered after a following length mark (aː́), so
 *       vowel+ː+acute and vowel+acute+ː compare equal.
 *   14. Post-vocalic j → i: the atlas writes diphthongs ai ~ aj, oi ~ oj
 *       inconsistently; the glide is the same segment.
 *   15. Post-vocalic y → i, and y directly before a vowel → j: consonantal
 *       y (IAST-style surya, tsukuyomi) and the glide j/i are the same
 *       segment; the atlas mixes the spellings. The Greek/Norse vowel /y/
 *       (tyr, Týchē) is never followed by a vowel in this data and is
 *       therefore preserved.
 *   16. ɬ → l: the Nahuatl lateral affricate is written t͡ɬ in curated
 *       entries and tl in generated ones; unified to the plain spelling.
 *   17. sh → ɕ: the atlas writes the Japanese palatal fricative both ways.
 *   18. ɸ → f: the atlas writes the Japanese bilabial fricative as plain f.
 *   19. þ → θ: the atlas sometimes keeps the letter þ inside IPA; unified
 *       to its value.
 *   20. Consonant ː after l/r/m/n → doubled letter (lː ~ ll): geminates are
 *       written both ways in the atlas.
 *
 * Rules 14–20 unify NOTATIONAL variants of the same phoneme (the atlas
 * itself uses both spellings). They never unify different phonemes: vowel
 * qualities (ɛ/e, ɔ/o, ɐ/a), retroflex vs plain (s/ʂ), and the presence
 * of length or stress remain real, scored differences.
 *
 * Deliberately NOT normalized (kept as real differences): vowel quality
 * (ɛ vs e, ɔ vs o, ɐ vs a), length presence, consonant values (ʃ vs s,
 * θ vs þ), and stress position. A stylistic vowel-quality or length
 * difference costs exactly 1 Levenshtein edit, so "near" (≤ 2 edits)
 * captures transcriptions that agree phonemically but differ in style.
 *
 * Usage: node scripts/validate-pronunciation-rules.js
 *
 * Output sections: phoneme coverage (above), then a TIMING section that
 * checks mora consistency — every ː-marked nucleus in the atlas IPA must
 * map to a derived syllable of >= 2 morae — reported across all entries
 * and across the built flagship set (js/archetypes-v2.js built:true),
 * plus a 15-entry sample rhythm table.
 */

'use strict';

const { PRONUNCIATION_ATLAS } = require('../type/js/pronunciation-atlas.js');
const { LEXICON } = require('../type/js/lexicon.js');
const { ARCHETYPES } = require('../js/archetypes-v2.js');
const { derivePronunciation } = require('../type/js/pronunciation-rules.js');

// The 271 built flagship temples — the headline set for the timing check.
const FLAGSHIP_IDS = new Set(ARCHETYPES.filter((a) => a.built).map((a) => a.id));

// ---------------------------------------------------------------------------
// Normalization
// ---------------------------------------------------------------------------

const VOWELS = new Set([
  'a',
  'e',
  'i',
  'o',
  'u',
  'y',
  'ɛ',
  'ɔ',
  'æ',
  'ø',
  'œ',
  'ɐ',
  'ɑ',
  'ɯ',
  'ʊ',
  'ɪ',
  'ə',
  'ʉ',
]);

function normalize(ipa) {
  let s = String(ipa)
    .replace(/[/[\]⟨⟩]/g, ' ')
    .normalize('NFD');
  s = s.replace(/:/g, 'ː').replace(/ˑ/g, 'ː');
  s = s.replace(/[͜͡]/g, ''); // tie bars
  s = s.replace(/ɡ/g, 'g');
  s = s.replace(/ʲ/g, 'j').replace(/ʷ/g, 'w');
  s = s.replace(/̯/g, ''); // non-syllabic mark
  s = s.replace(/ɾ/g, 'r');
  s = s.replace(/ꜣ/g, 'ʔ').replace(/ꜥ/g, 'ʕ');
  s = s.replace(/ˌ/g, ''); // secondary stress
  s = s.replace(/[̀̂̌]/g, '́'); // all stress marks → acute
  // Move pre-syllable ˈ onto the syllable's first vowel.
  let out = '';
  let pending = false;
  const chars = [...s];
  for (let idx = 0; idx < chars.length; idx++) {
    const ch = chars[idx];
    if (ch === 'ˈ') {
      pending = true;
      continue;
    }
    out += ch;
    if (pending) {
      const isSyllabicR = ch === 'r' && chars[idx + 1] === '̩';
      if (VOWELS.has(ch) || isSyllabicR) {
        out += '́';
        pending = false;
      }
    }
  }
  s = out;
  s = s.replace(/[.\-–—()\s]/g, '');
  s = s.replace(/́(ː+)/g, '$1́'); // acute follows the length mark
  s = s.replace(/([aeiouyɛɔæøœɐɑɯʊɪəʉ])[jy]/g, '$1i'); // glide notations
  s = s.replace(/y(?=[aeiouɛɔæøœɐɑɯʊɪəʉ])/g, 'j'); // consonantal y (surya)
  s = s.replace(/ɬ/g, 'l'); // tl ~ t͡ɬ
  s = s.replace(/sh/g, 'ɕ'); // Japanese sh ~ ɕ
  s = s.replace(/ɸ/g, 'f');
  s = s.replace(/þ/g, 'θ');
  s = s.replace(/([lrmn])ː/g, '$1$1'); // geminate notation: lː ~ ll
  return s;
}

// ---------------------------------------------------------------------------
// Levenshtein on code points
// ---------------------------------------------------------------------------

function levenshtein(a, b) {
  const x = [...a];
  const y = [...b];
  const prev = new Array(y.length + 1);
  const curr = new Array(y.length + 1);
  for (let j = 0; j <= y.length; j++) prev[j] = j;
  for (let i = 1; i <= x.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= y.length; j++) {
      const cost = x[i - 1] === y[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= y.length; j++) prev[j] = curr[j];
  }
  return prev[y.length];
}

// ---------------------------------------------------------------------------
// Timing validation (mora prosody layer)
// ---------------------------------------------------------------------------

// Scan an IPA string into vowel nuclei, marking which carry an explicit
// length mark (ː). A vowel followed by U+032F is a glide of the current
// nucleus, not a new one; r + U+0329 is a syllabic-r nucleus. This runs on
// the RAW atlas/derived IPA (not the coverage normalization) so syllable
// and length structure is preserved.
// Diacritics that may sit between a nucleus vowel and its length mark.
const NUCLEUS_MARKS = new Set(['ː', '́', '̀', '̂', '̌', '̩']);

function scanNuclei(ipa) {
  const chars = [...String(ipa).normalize('NFD')];
  const nuclei = [];
  const isVowelChar = (i) => VOWELS.has(chars[i]) || (chars[i] === 'r' && chars[i + 1] === '̩');
  for (let i = 0; i < chars.length; i++) {
    if (!isVowelChar(i)) continue;
    if (chars[i + 1] === '̯') {
      // Offglide: a stray ː after the glide still belongs to this nucleus.
      if (chars[i + 2] === 'ː' && nuclei.length > 0) nuclei[nuclei.length - 1].long = true;
      continue;
    }
    const nucleus = { long: false };
    for (let j = i + 1; j < chars.length && NUCLEUS_MARKS.has(chars[j]); j++) {
      if (chars[j] === 'ː') nucleus.long = true;
    }
    nuclei.push(nucleus);
  }
  return nuclei;
}

// Map each derived nucleus (same scanner over the derived syllable strings)
// to the index of its syllable, so an atlas nucleus can be aligned by
// position. Nucleus-free syllables (Egyptian skeletons) still get a slot.
function derivedNucleusSyllables(derived) {
  const map = [];
  derived.syllables.forEach((syllable, sIdx) => {
    const count = Math.max(1, scanNuclei(syllable).length);
    for (let k = 0; k < count; k++) map.push(sIdx);
  });
  return map;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const byId = new Map(LEXICON.map((e) => [e.id, e]));
  const perPantheon = new Map();
  const mismatches = [];
  const skipped = [];
  const timingStats = { anchors: 0, aligned: 0, agree: 0, fAnchors: 0, fAligned: 0, fAgree: 0 };
  const flagshipSamples = [];
  let total = 0;
  let exact = 0;
  let near = 0;
  let passthrough = 0;

  for (const [id, atlas] of Object.entries(PRONUNCIATION_ATLAS)) {
    const entry = byId.get(id);
    if (!entry) {
      skipped.push(id);
      continue;
    }
    const derived = derivePronunciation(entry);
    const a = normalize(atlas.ipa);
    const d = normalize(derived.ipa);
    const dist = levenshtein(a, d);
    total += 1;
    if (!derived.derived) passthrough += 1;
    if (dist === 0) exact += 1;
    else if (dist <= 2) near += 1;
    const bucket = perPantheon.get(entry.pantheon) || { n: 0, exact: 0, near: 0, distSum: 0 };
    bucket.n += 1;
    bucket.distSum += dist;
    if (dist === 0) bucket.exact += 1;
    else if (dist <= 2) bucket.near += 1;
    perPantheon.set(entry.pantheon, bucket);
    if (dist > 0) {
      mismatches.push({
        id,
        pantheon: entry.pantheon,
        dist,
        atlas: atlas.ipa,
        derived: derived.ipa,
      });
    }
    // Timing: align each ː-marked atlas nucleus by position and require the
    // derived syllable to carry >= 2 morae.
    if (derived.timing) {
      const nucleusMap = derivedNucleusSyllables(derived);
      const flagship = FLAGSHIP_IDS.has(id);
      scanNuclei(atlas.ipa).forEach((nucleus, k) => {
        if (!nucleus.long) return;
        timingStats.anchors += 1;
        if (flagship) timingStats.fAnchors += 1;
        if (k >= nucleusMap.length) return;
        timingStats.aligned += 1;
        if (flagship) timingStats.fAligned += 1;
        if (derived.timing.morae[nucleusMap[k]] >= 2) {
          timingStats.agree += 1;
          if (flagship) timingStats.fAgree += 1;
        }
      });
      if (flagship) flagshipSamples.push({ id, pantheon: entry.pantheon, derived });
    }
  }

  const pct = (part, whole) => (whole === 0 ? '0.0' : ((100 * part) / whole).toFixed(1));

  console.log('='.repeat(78));
  console.log('PRONUNCIATION RULES — COVERAGE AGAINST THE CURATED ATLAS');
  console.log('='.repeat(78));
  console.log(`Atlas entries compared:   ${total} (${skipped.length} skipped: no lexicon entry)`);
  console.log(`  of which fallback passthrough (derived:false): ${passthrough}`);
  console.log(`Exact (normalized identical): ${exact}  (${pct(exact, total)}%)`);
  console.log(`Near  (Levenshtein <= 2):     ${near}  (${pct(near, total)}%)`);
  console.log(`Exact + near:                 ${exact + near}  (${pct(exact + near, total)}%)`);
  console.log(
    `Miss  (Levenshtein > 2):      ${total - exact - near}  (${pct(total - exact - near, total)}%)`
  );

  console.log('');
  console.log('PER-PANTHEON COVERAGE');
  console.log('-'.repeat(78));
  console.log(
    'pantheon'.padEnd(18) +
      'n'.padStart(4) +
      'exact'.padStart(7) +
      'near'.padStart(7) +
      'ex+near'.padStart(9) +
      '%'.padStart(8) +
      'meanDist'.padStart(10)
  );
  const rows = [...perPantheon.entries()].sort((a, b) => b[1].n - a[1].n);
  for (const [pan, b] of rows) {
    const covered = b.exact + b.near;
    console.log(
      pan.padEnd(18) +
        String(b.n).padStart(4) +
        String(b.exact).padStart(7) +
        String(b.near).padStart(7) +
        String(covered).padStart(9) +
        pct(covered, b.n).padStart(8) +
        (b.distSum / b.n).toFixed(2).padStart(10)
    );
  }

  console.log('');
  console.log('25 WORST MISMATCHES (by normalized Levenshtein distance)');
  console.log('-'.repeat(78));
  mismatches.sort((a, b) => b.dist - a.dist || a.id.localeCompare(b.id));
  for (const m of mismatches.slice(0, 25)) {
    console.log(`${m.id} (${m.pantheon}) — dist ${m.dist}`);
    console.log(`  atlas:   ${m.atlas}`);
    console.log(`  derived: ${m.derived}`);
  }

  console.log('');
  console.log('TIMING — MORA CONSISTENCY (ː-marked atlas nuclei vs derived morae)');
  console.log('-'.repeat(78));
  console.log(
    `ː-marked atlas nuclei:  ${timingStats.anchors} ` +
      `(aligned to a derived nucleus: ${timingStats.aligned}, ` +
      `unaligned: ${timingStats.anchors - timingStats.aligned})`
  );
  console.log(
    `All entries:       ${timingStats.agree}/${timingStats.aligned} agree ` +
      `(derived morae >= 2) = ${pct(timingStats.agree, timingStats.aligned)}%`
  );
  console.log(
    `Flagship headlines (${FLAGSHIP_IDS.size} built ids):  ` +
      `${timingStats.fAgree}/${timingStats.fAligned} = ` +
      `${pct(timingStats.fAgree, timingStats.fAligned)}%   <== headline`
  );

  console.log('');
  console.log('15 SAMPLE FLAGSHIP RHYTHMS');
  console.log('-'.repeat(78));
  console.log(
    'id'.padEnd(18) +
      'ipa'.padEnd(26) +
      'beats'.padEnd(13) +
      'morae'.padEnd(11) +
      'contour'.padEnd(11) +
      'durationMs'
  );
  flagshipSamples.sort((a, b) => a.pantheon.localeCompare(b.pantheon) || a.id.localeCompare(b.id));
  const stride = Math.max(1, Math.floor(flagshipSamples.length / 15));
  const picked = [];
  for (let i = 0; i < flagshipSamples.length && picked.length < 15; i += stride) {
    picked.push(flagshipSamples[i]);
  }
  for (const s of picked) {
    const t = s.derived.timing;
    console.log(
      s.id.padEnd(18) +
        s.derived.ipa.padEnd(26) +
        t.beats.padEnd(13) +
        `[${t.morae.join(',')}]`.padEnd(11) +
        t.contour.padEnd(11) +
        String(t.durationMs)
    );
  }

  if (skipped.length > 0) {
    console.log('');
    console.log(`Atlas ids without a lexicon entry (skipped): ${skipped.join(', ')}`);
  }
  console.log('');
  console.log('Measurement only — no threshold enforced.');
}

if (require.main === module) {
  main();
  process.exit(0);
}

module.exports = { normalize, levenshtein };
