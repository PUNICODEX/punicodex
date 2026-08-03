/**
 * PuniCodex — Pronunciation Rules Engine
 *
 * Derives a pronunciation (IPA, syllables, stress, respelling, SSML) from the
 * restored orthography of a lexicon entry. The restorations already encode
 * stress (acute / circumflex) and vowel length (macrons); this engine decodes
 * them into sound.
 *
 * Rule-based, deterministic, no dependencies beyond Node builtins. This is a
 * canonical source: edit by hand, never generated.
 *
 * The engine also carries a MORA-BASED TIMING layer (see the Prosody section
 * below): per-syllable mora counts, stress-pitch contours, a beat string, a
 * doubled-letter rhythm notation, and millisecond duration estimates from a
 * per-language base mora duration. Fallback entries carry `timing: null`.
 *
 * Language coverage (selected by entry.pantheon):
 *   greek / greek-location → classical Greek rules (Attic-Ionic values)
 *   nahuatl                → classical Nahuatl
 *   norse                  → Old Norse
 *   sanskrit               → IAST / classical Sanskrit
 *   japanese               → standard (Tokyo) Japanese
 *   egyptian               → Egyptological conventional reading (conventional:
 *                            hieroglyphs write no vowels, so any vocalization
 *                            is a scholarly convention, flagged accordingly)
 *   everything else        → fallback orthographic passthrough (derived: false)
 *
 * Stress policy per language:
 *   greek    — the acute/circumflexed vowel's syllable; if the restored form
 *              carries no accent, the polytonic Greek original's accent is
 *              consulted (it is the source of the restoration); failing both,
 *              the classical recessive rule: stress the penult when heavy
 *              (long nucleus or closed), else the antepenult.
 *   sanskrit — classical weight rule (heavy penult, else antepenult).
 *   nahuatl  — penultimate.
 *   norse    — first syllable.
 *   japanese — no lexical stress (stressIndex null).
 *   egyptian — no recoverable stress (conventional).
 */

'use strict';

// ---------------------------------------------------------------------------
// Small utilities
// ---------------------------------------------------------------------------

const NFD = (s) => s.normalize('NFD');

// Combining marks that appear in the restored orthographies (all U+03xx).
const MARK = {
  GRAVE: '̀', // stress (rare)
  ACUTE: '́', // stress; also part of ś (IAST) and Norse long vowels
  CIRCUMFLEX: '̂', // stress + long in the Latin transliterations (â, ê, …)
  PERISPOMENI: '͂', // Greek circumflex = stress + long
  MACRON: '̄', // long
  CARON: '̌', // stress (atlas legacy style)
  DOT_BELOW: '̣', // IAST retroflex / vocalic / Semitic emphatic
  DOT_ABOVE: '̇', // IAST ṅ
  TILDE: '̃', // IAST ñ
  RING_BELOW: '̥', // IAST vocalic r (ṛ alternate encoding)
  OGONEK: '̨', // Norse ǫ
  BREVE_BELOW: '̮', // Egyptian ḫ
  MACRON_BELOW: '̱', // Egyptian ṯ / ḏ
  DIAERESIS: '̈', // hiatus marker, ignored for sound
};

function escapeXml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ---------------------------------------------------------------------------
// Tokenizer framework
//
// A form is scanned in NFD as graphemes: one base char plus its combining
// marks. Each language maps graphemes (and di-/trigraph sequences) to tokens:
// { p, vowel, long, stressed } where `p` is the IPA string.
// ---------------------------------------------------------------------------

function graphemes(form) {
  const nfd = NFD(form.toLowerCase());
  const out = [];
  for (const ch of nfd) {
    if (/[̀-ͯ]/.test(ch)) {
      if (out.length > 0) out[out.length - 1].marks.push(ch);
      continue;
    }
    out.push({ base: ch, marks: [] });
  }
  return out;
}

function marksOf(g) {
  let accent = null;
  if (g.marks.includes(MARK.CIRCUMFLEX) || g.marks.includes(MARK.PERISPOMENI)) {
    accent = 'circumflex';
  } else if (g.marks.includes(MARK.GRAVE)) {
    accent = 'grave';
  } else if (g.marks.includes(MARK.ACUTE) || g.marks.includes(MARK.CARON)) {
    accent = 'acute';
  }
  return {
    stress: accent !== null,
    long:
      g.marks.includes(MARK.MACRON) ||
      g.marks.includes(MARK.CIRCUMFLEX) ||
      g.marks.includes(MARK.PERISPOMENI),
    accent,
  };
}

const C = (p) => ({ p, vowel: false, long: false, stressed: false, accent: null });
const V = (p, long, stressed, accent = null) => ({
  p,
  vowel: true,
  long: !!long,
  stressed: !!stressed,
  accent,
});

// ---------------------------------------------------------------------------
// Greek
// ---------------------------------------------------------------------------

const GREEK_VOWELS = {
  a: ['a', 'aː'],
  e: ['e', 'ɛː'],
  i: ['i', 'iː'],
  o: ['o', 'ɔː'],
  u: ['u', 'uː'],
  y: ['y', 'yː'],
};

const GREEK_DIPHTHONGS = {
  ai: 'aj',
  ei: 'ej',
  oi: 'oj',
  au: 'au̯',
  eu: 'eu̯',
  ou: 'uː',
  ui: 'uj',
};

const GREEK_DIGRAPHS = {
  ph: 'pʰ',
  th: 'tʰ',
  kh: 'kʰ',
  ch: 'kʰ',
  ps: 'ps',
  gg: 'ŋg',
  nk: 'ŋk',
  ng: 'ŋg',
  rh: 'r',
};

// Stop + liquid clusters that may begin a Greek syllable.
const GREEK_ONSETS = new Set([
  'pr',
  'br',
  'tr',
  'dr',
  'kr',
  'gr',
  'pl',
  'bl',
  'kl',
  'gl',
  'pʰr',
  'tʰr',
  'kʰr',
  'pʰl',
  'kʰl',
]);

function tokenizeGreek(form) {
  const gs = graphemes(form);
  const tokens = [];
  let i = 0;
  while (i < gs.length) {
    const g = gs[i];
    const m = marksOf(g);
    const next = gs[i + 1];
    const pair = next ? g.base + next.base : '';
    // Diphthongs (vowel pairs) — checked before single vowels.
    if (GREEK_VOWELS[g.base] && next && GREEK_DIPHTHONGS[pair]) {
      const m2 = marksOf(next);
      tokens.push(V(GREEK_DIPHTHONGS[pair], true, m.stress || m2.stress, m.accent || m2.accent));
      i += 2;
      continue;
    }
    if (GREEK_VOWELS[g.base]) {
      const [short, long] = GREEK_VOWELS[g.base];
      tokens.push(V(m.long ? long : short, m.long, m.stress, m.accent));
      i += 1;
      continue;
    }
    if (next && GREEK_DIGRAPHS[pair]) {
      tokens.push(C(GREEK_DIGRAPHS[pair]));
      i += 2;
      continue;
    }
    if (g.base === 'z') {
      tokens.push(C('zd'));
      i += 1;
      continue;
    }
    if (g.base === 'x') {
      tokens.push(C('ks'));
      i += 1;
      continue;
    }
    // Geminates: identical adjacent consonants → two tokens (coda + onset).
    if (next && next.base === g.base && /[bcdfgklmnprst]/.test(g.base)) {
      tokens.push(C(g.base));
      tokens.push(C(g.base));
      i += 2;
      continue;
    }
    if (/[bcdfghjklmnpqrstvw]/.test(g.base)) {
      tokens.push(C(g.base));
      i += 1;
      continue;
    }
    // Anything else (stray marks, punctuation) is skipped.
    i += 1;
  }
  return tokens;
}

// Locate the accented nucleus (0-based) in a polytonic Greek original, e.g.
// "Λητώ" → 1. Returns null when no accent is present. Diphthongs count as one
// nucleus, matching the tokenizer above.
function greekOriginalStressIndex(greek) {
  if (!greek) return null;
  const BASE_VOWELS = new Set(['α', 'ε', 'η', 'ι', 'ο', 'υ', 'ω']);
  const DIPHTHONGS = new Set(['αι', 'ει', 'οι', 'υι', 'αυ', 'ευ', 'ου', 'ηυ', 'ωυ']);
  const gs = graphemes(greek);
  let nucleus = -1;
  let stressed = null;
  let i = 0;
  while (i < gs.length) {
    const g = gs[i];
    const lower = g.base.toLowerCase();
    if (!BASE_VOWELS.has(lower)) {
      i += 1;
      continue;
    }
    const next = gs[i + 1];
    const pair = next ? lower + next.base.toLowerCase() : '';
    const isDiphthong = next && DIPHTHONGS.has(pair) && !next.marks.includes(MARK.DIAERESIS);
    nucleus += 1;
    const accented =
      g.marks.includes(MARK.ACUTE) ||
      g.marks.includes(MARK.GRAVE) ||
      g.marks.includes(MARK.PERISPOMENI) ||
      (isDiphthong &&
        (next.marks.includes(MARK.ACUTE) ||
          next.marks.includes(MARK.GRAVE) ||
          next.marks.includes(MARK.PERISPOMENI)));
    if (accented && stressed === null) stressed = nucleus;
    i += isDiphthong ? 2 : 1;
  }
  return stressed;
}

// ---------------------------------------------------------------------------
// Nahuatl
// ---------------------------------------------------------------------------

const NAHUATL_VOWELS = { a: ['a', 'aː'], e: ['e', 'eː'], i: ['i', 'iː'], o: ['o', 'oː'] };

function tokenizeNahuatl(form) {
  const gs = graphemes(form);
  const tokens = [];
  let i = 0;
  while (i < gs.length) {
    const g = gs[i];
    const m = marksOf(g);
    const next = gs[i + 1];
    const pair = next ? g.base + next.base : '';
    const third = gs[i + 2];
    if (NAHUATL_VOWELS[g.base]) {
      const [short, long] = NAHUATL_VOWELS[g.base];
      tokens.push(V(m.long ? long : short, m.long, m.stress, m.accent));
      i += 1;
      continue;
    }
    if (pair === 'qu' && third && (third.base === 'e' || third.base === 'i')) {
      tokens.push(C('k')); // silent u; the following vowel is read next round
      i += 2;
      continue;
    }
    if (g.base === 'c' || g.base === 'q') {
      if (next && 'ei'.includes(next.base) && g.base === 'c') {
        tokens.push(C('s'));
      } else {
        tokens.push(C('k'));
      }
      i += 1;
      continue;
    }
    if (pair === 'ch') {
      tokens.push(C('t͡ʃ'));
      i += 2;
      continue;
    }
    if (pair === 'tz') {
      tokens.push(C('t͡s'));
      i += 2;
      continue;
    }
    if (pair === 'tl') {
      tokens.push(C('t͡ɬ'));
      i += 2;
      continue;
    }
    if (pair === 'hu' && third && NAHUATL_VOWELS[third.base]) {
      tokens.push(C('w')); // u absorbed into the labial glide
      i += 2;
      continue;
    }
    if (pair === 'll') {
      tokens.push(C('l'));
      tokens.push(C('l'));
      i += 2;
      continue;
    }
    if (g.base === 'x') {
      // Tuned to the atlas's systematic convention: it reads x as /ks/
      // (xipe → /ksipe/), not the classical /ʃ/.
      tokens.push(C('k'));
      tokens.push(C('s'));
      i += 1;
      continue;
    }
    if (g.base === 'z') {
      tokens.push(C('s'));
      i += 1;
      continue;
    }
    if (g.base === 'y') {
      tokens.push(C('j'));
      i += 1;
      continue;
    }
    if (/[bdfghjklmnp rstw]/.test(g.base)) {
      tokens.push(C(g.base));
      i += 1;
      continue;
    }
    i += 1;
  }
  return tokens;
}

// ---------------------------------------------------------------------------
// Norse
// ---------------------------------------------------------------------------

const NORSE_VOWELS = {
  a: ['a', 'aː'],
  e: ['e', 'eː'],
  i: ['i', 'iː'],
  o: ['o', 'oː'],
  u: ['u', 'uː'],
  y: ['y', 'yː'],
  ø: ['ø', 'øː'],
  œ: ['œ', 'œ'],
};

const NORSE_DIPHTHONGS = { au: 'au̯', ei: 'ej', ey: 'ey̯' };

function tokenizeNorse(form) {
  const gs = graphemes(form);
  const tokens = [];
  let i = 0;
  while (i < gs.length) {
    const g = gs[i];
    const m = marksOf(g);
    const next = gs[i + 1];
    const pair = next ? g.base + next.base : '';
    // ǫ = o + ogonek (short, unrounded to ɔ in the standard reconstruction).
    if (g.base === 'o' && g.marks.includes(MARK.OGONEK)) {
      tokens.push(V('ɔ', false, false));
      i += 1;
      continue;
    }
    if (g.base === 'æ') {
      tokens.push(V('ɛː', true, false));
      i += 1;
      continue;
    }
    if (next && NORSE_DIPHTHONGS[pair]) {
      tokens.push(V(NORSE_DIPHTHONGS[pair], true, m.stress || marksOf(next).stress, null));
      i += 2;
      continue;
    }
    if (NORSE_VOWELS[g.base]) {
      const [short, long] = NORSE_VOWELS[g.base];
      // The acute accent in Old Norse marks length, not stress.
      const isLong = m.long || m.stress;
      tokens.push(V(isLong ? long : short, isLong, false));
      i += 1;
      continue;
    }
    if (g.base === 'þ') {
      tokens.push(C('θ'));
      i += 1;
      continue;
    }
    if (g.base === 'ð') {
      tokens.push(C('ð'));
      i += 1;
      continue;
    }
    if (pair === 'ng') {
      tokens.push(C('ŋg'));
      i += 2;
      continue;
    }
    if (pair === 'hv') {
      tokens.push(C('k'));
      tokens.push(C('v'));
      i += 2;
      continue;
    }
    if (pair === 'll' || pair === 'rr' || pair === 'nn' || pair === 'mm') {
      const long = { l: 'lː', r: 'rː', n: 'nː', m: 'mː' }[g.base];
      tokens.push(C(long));
      i += 2;
      continue;
    }
    if (g.base === 'v' || g.base === 'j' || g.base === 'f') {
      tokens.push(C(g.base));
      i += 1;
      continue;
    }
    if (/[bcdfg hklmnpqrstw]/.test(g.base)) {
      tokens.push(C(g.base));
      i += 1;
      continue;
    }
    i += 1;
  }
  return tokens;
}

// ---------------------------------------------------------------------------
// Sanskrit (IAST)
// ---------------------------------------------------------------------------

const SANSKRIT_VOWELS = {
  a: ['a', 'aː'],
  i: ['i', 'iː'],
  u: ['u', 'uː'],
  e: ['eː', 'eː'], // e and o are inherently long in classical Sanskrit
  o: ['oː', 'oː'],
};

const SANSKRIT_RETROFLEX = { t: 'ʈ', d: 'ɖ', n: 'ɳ' };

function tokenizeSanskrit(form) {
  const gs = graphemes(form);
  const tokens = [];
  let i = 0;
  while (i < gs.length) {
    const g = gs[i];
    const m = marksOf(g);
    const next = gs[i + 1];
    // Diphthongs ai / au.
    if (g.base === 'a' && next && (next.base === 'i' || next.base === 'u') && !m.long) {
      tokens.push(
        V(next.base === 'i' ? 'aj' : 'au̯', true, m.stress || marksOf(next).stress, m.accent)
      );
      i += 2;
      continue;
    }
    if (SANSKRIT_VOWELS[g.base]) {
      const [short, long] = SANSKRIT_VOWELS[g.base];
      // e and o are phonemically long in Sanskrit — the token must carry the
      // length even without a macron, or the mora layer undercounts.
      const isLong = m.long || short === long;
      tokens.push(V(isLong ? long : short, isLong, m.stress, m.accent));
      i += 1;
      continue;
    }
    // Vocalic r: ṛ / r̥.
    if (g.base === 'r' && (g.marks.includes(MARK.DOT_BELOW) || g.marks.includes(MARK.RING_BELOW))) {
      const isLong = g.marks.includes(MARK.MACRON);
      tokens.push(V(isLong ? 'r̩ː' : 'r̩', isLong, m.stress, m.accent));
      i += 1;
      continue;
    }
    // Trigraph kṣ.
    if (g.base === 'k' && next && next.base === 's' && next.marks.includes(MARK.DOT_BELOW)) {
      tokens.push(C('k'));
      tokens.push(C('ʂ'));
      i += 2;
      continue;
    }
    // Aspirate digraphs (stop + h), incl. retroflex ṭh / ḍh.
    if (next && next.base === 'h' && next.marks.length === 0) {
      const retro = g.marks.includes(MARK.DOT_BELOW);
      const aspirates = {
        k: 'kʰ',
        g: 'ɡʱ',
        c: 't͡ɕʰ',
        j: 'd͡ʑʱ',
        t: retro ? 'ʈʰ' : 'tʰ',
        d: retro ? 'ɖʱ' : 'dʱ',
        p: 'pʰ',
        b: 'bʱ',
      };
      if (aspirates[g.base]) {
        tokens.push(C(aspirates[g.base]));
        i += 2;
        continue;
      }
    }
    // Single letters with diacritics.
    if (g.base === 's' && g.marks.includes(MARK.ACUTE)) {
      tokens.push(C('ɕ'));
      i += 1;
      continue;
    }
    if (g.base === 's' && g.marks.includes(MARK.DOT_BELOW)) {
      tokens.push(C('ʂ'));
      i += 1;
      continue;
    }
    if (SANSKRIT_RETROFLEX[g.base] && g.marks.includes(MARK.DOT_BELOW)) {
      tokens.push(C(SANSKRIT_RETROFLEX[g.base]));
      i += 1;
      continue;
    }
    if (g.base === 'n' && g.marks.includes(MARK.DOT_ABOVE)) {
      tokens.push(C('ŋ'));
      i += 1;
      continue;
    }
    if (g.base === 'n' && g.marks.includes(MARK.TILDE)) {
      tokens.push(C('ɲ'));
      i += 1;
      continue;
    }
    if (g.base === 'h' && g.marks.includes(MARK.DOT_BELOW)) {
      tokens.push(C('h')); // visarga
      i += 1;
      continue;
    }
    if (g.base === 'm' && (g.marks.includes(MARK.DOT_BELOW) || g.marks.includes(MARK.DOT_ABOVE))) {
      tokens.push(C('m')); // anusvāra
      i += 1;
      continue;
    }
    const plain = {
      k: 'k',
      g: 'ɡ',
      c: 't͡ɕ',
      j: 'd͡ʑ',
      t: 't',
      d: 'd',
      n: 'n',
      p: 'p',
      b: 'b',
      m: 'm',
      y: 'j',
      r: 'r',
      l: 'l',
      v: 'v',
      s: 's',
      h: 'h',
      q: 'k',
    };
    if (plain[g.base]) {
      tokens.push(C(plain[g.base]));
      i += 1;
      continue;
    }
    i += 1;
  }
  return tokens;
}

// ---------------------------------------------------------------------------
// Japanese
// ---------------------------------------------------------------------------

const JAPANESE_VOWELS = {
  a: ['a', 'aː'],
  i: ['i', 'iː'],
  u: ['u', 'uː'],
  e: ['e', 'eː'],
  o: ['o', 'oː'],
};

function tokenizeJapanese(form) {
  const gs = graphemes(form);
  const tokens = [];
  let i = 0;
  while (i < gs.length) {
    const g = gs[i];
    const m = marksOf(g);
    const next = gs[i + 1];
    const pair = next ? g.base + next.base : '';
    if (JAPANESE_VOWELS[g.base]) {
      const [short, long] = JAPANESE_VOWELS[g.base];
      tokens.push(V(m.long ? long : short, m.long, false));
      i += 1;
      continue;
    }
    const palatal = {
      ky: 'kʲ',
      ny: 'ɲ',
      ry: 'rʲ',
      my: 'mʲ',
      py: 'pʲ',
      by: 'bʲ',
      gy: 'ɡʲ',
      hy: 'hʲ',
    };
    if (palatal[pair]) {
      tokens.push(C(palatal[pair]));
      i += 2;
      continue;
    }
    if (pair === 'sh') {
      tokens.push(C('ɕ'));
      i += 2;
      continue;
    }
    if (pair === 'ch') {
      tokens.push(C('t͡ɕ'));
      i += 2;
      continue;
    }
    if (pair === 'ts') {
      tokens.push(C('t͡s'));
      i += 2;
      continue;
    }
    if (g.base === 'j') {
      tokens.push(C('d͡ʑ'));
      i += 1;
      continue;
    }
    if (g.base === 'y') {
      tokens.push(C('j'));
      i += 1;
      continue;
    }
    if (g.base === 'r') {
      tokens.push(C('ɾ'));
      i += 1;
      continue;
    }
    // Doubled obstruents: moraic sokuon → coda + onset.
    if (next && next.base === g.base && /[kptgs]/.test(g.base)) {
      tokens.push(C(g.base));
      tokens.push(C(g.base));
      i += 2;
      continue;
    }
    if (/[bcdfghkmnpqstvwz]/.test(g.base)) {
      tokens.push(C(g.base === 'f' ? 'ɸ' : g.base));
      i += 1;
      continue;
    }
    i += 1;
  }
  return tokens;
}

// ---------------------------------------------------------------------------
// Egyptian (conventional: hieroglyphs write no vowels)
// ---------------------------------------------------------------------------

function tokenizeEgyptian(form) {
  const gs = graphemes(form);
  const tokens = [];
  for (const g of gs) {
    const m = marksOf(g);
    // Vowels occasionally appear in modern spellings; keep them honest.
    if ('aeiou'.includes(g.base)) {
      tokens.push(V(m.long ? `${g.base}ː` : g.base, m.long, m.stress, m.accent));
      continue;
    }
    if (g.base === 'ꜣ') {
      tokens.push(C('ʔ'));
      continue;
    }
    if (g.base === 'ꜥ' || g.base === 'ȝ') {
      tokens.push(C('ʕ'));
      continue;
    }
    if (g.base === 'h' && g.marks.includes(MARK.DOT_BELOW)) {
      tokens.push(C('ħ')); // ḥ
      continue;
    }
    if (g.base === 'h' && g.marks.includes(MARK.BREVE_BELOW)) {
      tokens.push(C('x')); // ḫ
      continue;
    }
    if (g.base === 't' && g.marks.includes(MARK.MACRON_BELOW)) {
      tokens.push(C('t͡ʃ')); // ṯ
      continue;
    }
    if (g.base === 'd' && g.marks.includes(MARK.MACRON_BELOW)) {
      tokens.push(C('d͡ʒ')); // ḏ
      continue;
    }
    if (g.base === 'q') {
      tokens.push(C('q'));
      continue;
    }
    if (g.base === 'y') {
      tokens.push(C('j'));
      continue;
    }
    if (/[bdfghjklmnprstwz]/.test(g.base)) {
      tokens.push(C(g.base));
      continue;
    }
    // Separators and unknown signs are dropped.
  }
  return tokens;
}

// ---------------------------------------------------------------------------
// Fallback (no rule set): orthographic passthrough
// ---------------------------------------------------------------------------

function tokenizeFallback(form) {
  const gs = graphemes(form);
  const tokens = [];
  for (const g of gs) {
    const m = marksOf(g);
    if ('aeiou'.includes(g.base)) {
      tokens.push(V(m.long ? `${g.base}ː` : g.base, m.long, m.stress, m.accent));
    } else if (/[a-z]/.test(g.base)) {
      tokens.push(C(g.base));
    }
    // Non-Latin letters cannot be passed through.
  }
  return tokens;
}

// ---------------------------------------------------------------------------
// Syllabification
//
// Nuclei are vowel tokens (diphthongs are single tokens). Between two nuclei:
//   0 consonants → hiatus
//   1 consonant  → onset of the following syllable
//   2+           → the longest valid onset (stop+liquid set, or a single
//                  consonant) goes right; the rest closes the left syllable.
// ---------------------------------------------------------------------------

function isHeavy(syllable) {
  const nucleus = syllable.find((t) => t.vowel);
  if (nucleus?.long) return true;
  const last = syllable[syllable.length - 1];
  return !!last && !last.vowel;
}

function syllabify(tokens, onsetSet) {
  const nuclei = [];
  tokens.forEach((t, idx) => {
    if (t.vowel) nuclei.push(idx);
  });
  if (nuclei.length === 0) {
    return tokens.length > 0 ? [tokens.slice()] : [];
  }
  const syllables = [];
  let left = tokens.slice(0, nuclei[0] + 1);
  for (let n = 0; n < nuclei.length - 1; n++) {
    const a = nuclei[n];
    const b = nuclei[n + 1];
    const between = tokens.slice(a + 1, b);
    let onsetSize = 0;
    if (between.length === 1) {
      onsetSize = 1;
    } else if (between.length >= 2) {
      const lastTwo = between
        .slice(-2)
        .map((t) => t.p)
        .join('');
      // Affricate / cluster tokens (t͡s, ŋg, ps, ks, zd) behave as one onset.
      onsetSize = between[between.length - 1].p.length > 1 ? 1 : onsetSet.has(lastTwo) ? 2 : 1;
    }
    const coda = between.slice(0, between.length - onsetSize);
    syllables.push([...left, ...coda]);
    left = [...between.slice(between.length - onsetSize), tokens[b]];
  }
  syllables.push([...left, ...tokens.slice(nuclei[nuclei.length - 1] + 1)]);
  return syllables;
}

// ---------------------------------------------------------------------------
// Stress
// ---------------------------------------------------------------------------

function explicitStress(syllables) {
  for (let s = 0; s < syllables.length; s++) {
    if (syllables[s].some((t) => t.vowel && t.stressed)) return s;
  }
  return null;
}

function weightRuleStress(syllables) {
  const n = syllables.length;
  if (n === 0) return null;
  if (n <= 2) return 0; // recessive accent can only reach the penult here
  return isHeavy(syllables[n - 2]) ? n - 2 : n - 3;
}

function assignStress(language, syllables, entry) {
  if (language === 'japanese' || language === 'egyptian' || language === 'fallback') return null;
  if (syllables.length === 0) return null;
  const explicit = explicitStress(syllables);
  if (explicit !== null) return explicit;
  if (language === 'norse') return 0;
  if (language === 'nahuatl') return syllables.length === 1 ? 0 : syllables.length - 2;
  if (language === 'greek') {
    // The restored form carries no accent; consult the polytonic original,
    // whose accent the restoration reproduces.
    const fromOriginal = greekOriginalStressIndex(entry.greek);
    if (fromOriginal !== null) return Math.min(fromOriginal, syllables.length - 1);
    return weightRuleStress(syllables);
  }
  if (language === 'sanskrit') return weightRuleStress(syllables);
  return null;
}

// ---------------------------------------------------------------------------
// Rendering: IPA, respelling, notes, SSML
// ---------------------------------------------------------------------------

function renderIpa(syllableTokens, stressIndex) {
  const parts = syllableTokens.map((syll) => syll.map((t) => t.p).join(''));
  const body = parts.map((p, i) => (i === stressIndex ? `ˈ${p}` : p)).join('.');
  return `/${body}/`;
}

// ---------------------------------------------------------------------------
// Prosody: mora-based timing
//
// The timing layer reads the SAME syllable token structures the phoneme
// layer produced (single source of truth — nothing is re-derived from the
// written form). Mora accounting per syllable:
//
//   short vowel nucleus          = 1 mora
//   long vowel / true diphthong  = 2 morae (the token's own `long` flag)
//   geminate consonant           = +1 (coda+onset pair across the syllable
//                                  boundary, or a long-consonant token lː/rː)
//   heavy coda consonant         = +0.5 each, rounded at syllable level
//
// Per-language prosody tunes which kinds count:
//   japanese — strict isochrony: every mora equal; the sokuon geminate and
//              the moraic nasal (coda n) each count a full mora; no 0.5
//              coda weight.
//   greek    — classical mora-timed: long = double; circumflex marks a
//              rise-fall pitch contour over the long syllable.
//   sanskrit — mātrā-counted: guru (long or closed) = 2, laghu = 1.
//   nahuatl  — weight-based; penultimate stress.
//   norse    — quantity-sensitive: long vowels and geminates add morae.
//   egyptian — conventional rhythm, flagged (hieroglyphs write no vowels;
//              a vowel-less skeleton gets one conventional beat per
//              consonant pair).
//
// Stress contours: 'rise' (acute), 'fall' (grave), 'rise-fall' (circumflex),
// 'heavy' (weight-rule stress without an accent mark), 'flat' (unstressed,
// and the Japanese/Egyptian no-lexical-stress default).
// ---------------------------------------------------------------------------

const PROSODY = {
  greek: {
    moraMs: 110,
    geminate: true,
    codaWeight: 0.5,
    codaNasalMora: false,
    conventional: false,
    model: 'classical mora-timed (long = 2 morae; closed syllables heavy; circumflex = rise-fall)',
  },
  nahuatl: {
    moraMs: 95,
    geminate: true,
    codaWeight: 0.5,
    codaNasalMora: false,
    conventional: false,
    model: 'weight-based (penultimate stress)',
  },
  norse: {
    moraMs: 105,
    geminate: true,
    codaWeight: 0.5,
    codaNasalMora: false,
    conventional: false,
    model: 'quantity-sensitive (long vowels and geminates add morae)',
  },
  sanskrit: {
    moraMs: 100,
    geminate: true,
    codaWeight: 0.5,
    codaNasalMora: false,
    conventional: false,
    model: 'mātrā-counted (guru = 2, laghu = 1)',
  },
  japanese: {
    moraMs: 80,
    geminate: true,
    codaWeight: 0,
    codaNasalMora: true,
    conventional: false,
    model: 'strict mora isochrony (sokuon geminate and moraic nasal count full morae)',
  },
  egyptian: {
    moraMs: 100,
    geminate: true,
    codaWeight: 0.5,
    codaNasalMora: false,
    conventional: true,
    model: 'conventional rhythm (hieroglyphs write no vowels)',
  },
};

function prosodyFor(language) {
  return PROSODY[language === 'greek-location' ? 'greek' : language];
}

function syllableContour(syllable, stressed) {
  if (!stressed) return 'flat';
  const nucleus = syllable.find((t) => t.vowel);
  if (nucleus?.accent === 'acute') return 'rise';
  if (nucleus?.accent === 'grave') return 'fall';
  if (nucleus?.accent === 'circumflex') return 'rise-fall';
  return 'heavy';
}

function syllableMorae(syllable, nextSyllable, prosody) {
  const nucleusIdx = syllable.findIndex((t) => t.vowel);
  if (nucleusIdx === -1) {
    // Vowel-less skeleton (Egyptian): one conventional beat per consonant pair.
    return Math.max(1, Math.round(syllable.length * 0.5));
  }
  const nucleus = syllable[nucleusIdx];
  const coda = syllable.slice(nucleusIdx + 1);
  let morae = nucleus.long ? 2 : 1;
  let codaConsonants = 0;
  // Geminate across the boundary: coda consonant identical to the next
  // syllable's onset (ll → l.l, kk → k.k) counts one full mora.
  let boundaryGeminate = false;
  if (
    prosody.geminate &&
    coda.length > 0 &&
    nextSyllable &&
    nextSyllable.length > 0 &&
    !nextSyllable[0].vowel &&
    coda[coda.length - 1].p === nextSyllable[0].p
  ) {
    boundaryGeminate = true;
    morae += 1;
  }
  coda.forEach((t, idx) => {
    if (boundaryGeminate && idx === coda.length - 1) return; // already counted
    if (prosody.geminate && t.p.length > 1 && t.p.endsWith('ː')) {
      morae += 1; // long-consonant token (Norse lː, rː, nː, mː)
      return;
    }
    if (prosody.codaNasalMora && t.p === 'n') {
      morae += 1; // Japanese moraic nasal
      return;
    }
    codaConsonants += 1;
  });
  return Math.max(1, Math.round(morae + codaConsonants * prosody.codaWeight));
}

const BEAT_SYMBOLS = { 1: '˘', 2: '¯', 3: '¯˘', 4: '¯¯' };

function beatSymbol(morae) {
  return BEAT_SYMBOLS[morae] || `×${morae}`;
}

// Rhythm notation for voiceover readers: quasi-spelling with CAPS on the
// stressed syllable and doubled letters for long nuclei ('a-POL-LOON').
// Rendered from the same syllable tokens — long vowels double their base
// letter, long consonants double (lː → ll).
const RHYTHM_VOWEL = {
  a: 'a',
  e: 'e',
  i: 'i',
  o: 'o',
  u: 'u',
  y: 'y',
  ɛ: 'e',
  ɔ: 'o',
  ɐ: 'a',
  ɑ: 'a',
  ə: 'e',
  ʊ: 'u',
  ɪ: 'i',
  ɯ: 'u',
  ø: 'o',
  œ: 'e',
  æ: 'e',
  ʉ: 'u',
  r̩: 'r',
  aj: 'ai',
  ej: 'ei',
  oj: 'oi',
  uj: 'ui',
  au̯: 'au',
  eu̯: 'eu',
  ey̯: 'ey',
};

const RHYTHM_CONS = {
  p: 'p',
  b: 'b',
  t: 't',
  d: 'd',
  k: 'k',
  ɡ: 'g',
  g: 'g',
  m: 'm',
  n: 'n',
  l: 'l',
  r: 'r',
  s: 's',
  z: 'z',
  h: 'h',
  f: 'f',
  v: 'v',
  w: 'w',
  j: 'y',
  ŋ: 'ng',
  ɲ: 'ny',
  ɳ: 'n',
  q: 'k',
  pʰ: 'p',
  tʰ: 't',
  kʰ: 'k',
  bʱ: 'b',
  dʱ: 'd',
  ɡʱ: 'g',
  ʈʰ: 't',
  ɖʱ: 'd',
  ʃ: 'sh',
  ɕ: 'sh',
  ʂ: 'sh',
  x: 'kh',
  χ: 'kh',
  ħ: 'h',
  θ: 'th',
  ð: 'th',
  ɬ: 'l',
  ɾ: 'r',
  ʈ: 't',
  ɖ: 'd',
  ʋ: 'v',
  ɸ: 'f',
  ʔ: '',
  ʕ: '',
  t͡s: 'ts',
  t͡ɬ: 'tl',
  t͡ʃ: 'ch',
  d͡ʒ: 'j',
  t͡ɕ: 'ch',
  d͡ʑ: 'j',
  t͡ɕʰ: 'ch',
  d͡ʑʱ: 'j',
  ps: 'ps',
  ks: 'ks',
  zd: 'zd',
  ŋg: 'ng',
  ŋk: 'nk',
  lː: 'll',
  rː: 'rr',
  nː: 'nn',
  mː: 'mm',
  kʲ: 'ky',
  nʲ: 'ny',
  rʲ: 'ry',
  mʲ: 'my',
  pʲ: 'py',
  bʲ: 'by',
  ɡʲ: 'gy',
  hʲ: 'hy',
};

function rhythmSyllable(syllable) {
  return syllable
    .map((t) => {
      if (t.vowel) {
        const key = t.p.replace(/ː/g, '');
        const base = RHYTHM_VOWEL[key] || '';
        // Diphthongs are inherently bimoraic — only plain vowels double.
        const isDiphthong = key.length > 1 && 'aeiouy'.includes(key[0]);
        return t.long && !isDiphthong ? base + base : base;
      }
      return RHYTHM_CONS[t.p] ?? '';
    })
    .join('');
}

/**
 * Compute the mora-based timing for an entry from its syllable tokens.
 * Returns null when the language has no prosody model (fallback entries).
 */
function computeTiming(language, syllableTokens, stressIndex) {
  const prosody = prosodyFor(language);
  if (!prosody) return null;
  const morae = syllableTokens.map((syll, i) =>
    syllableMorae(syll, syllableTokens[i + 1], prosody)
  );
  const totalMorae = morae.reduce((a, b) => a + b, 0);
  const perSyllable = syllableTokens.map((syll, i) => {
    const stressed = i === stressIndex;
    return {
      syllable: syll.map((t) => t.p).join(''),
      morae: morae[i],
      stressed,
      contour: syllableContour(syll, stressed),
      ms: Math.round(morae[i] * prosody.moraMs),
    };
  });
  const stressed = perSyllable.find((s) => s.stressed);
  return {
    morae,
    totalMorae,
    contour: stressed ? stressed.contour : 'flat',
    beats: morae.map(beatSymbol).join(' '),
    rhythm: perSyllable
      .map((s, i) => {
        const r = rhythmSyllable(syllableTokens[i]);
        return s.stressed ? r.toUpperCase() : r;
      })
      .join('-'),
    moraMs: prosody.moraMs,
    durationMs: Math.round(totalMorae * prosody.moraMs),
    perSyllable,
    model: prosody.model,
    conventional: prosody.conventional,
  };
}

// English-analogy respelling, longest IPA keys first. Deliberately lossy:
// this is a voiceover aid, not a transcription.
const RESPELL = {
  au̯: 'ow',
  eu̯: 'ew',
  ey̯: 'ay',
  aj: 'eye',
  ej: 'ay',
  oj: 'oy',
  uj: 'ooey',
  t͡ɬ: 'tl',
  t͡s: 'ts',
  t͡ʃ: 'ch',
  d͡ʒ: 'j',
  t͡ɕ: 'ch',
  d͡ʑ: 'j',
  t͡ɕʰ: 'ch',
  d͡ʑʱ: 'j',
  aː: 'ah',
  ɛː: 'ay',
  eː: 'ay',
  iː: 'ee',
  ɔː: 'aw',
  oː: 'oh',
  uː: 'oo',
  yː: 'ee',
  øː: 'ur',
  r̩ː: 'ree',
  pʰ: 'p',
  tʰ: 't',
  kʰ: 'k',
  bʱ: 'b',
  dʱ: 'd',
  ɡʱ: 'g',
  ʈʰ: 't',
  ɖʱ: 'd',
  lː: 'l',
  rː: 'r',
  nː: 'n',
  mː: 'm',
  ɛ: 'eh',
  ɔ: 'aw',
  ɐ: 'uh',
  ɑ: 'ah',
  ə: 'uh',
  ɯ: 'oo',
  ʊ: 'oo',
  ɪ: 'i',
  ø: 'ur',
  œ: 'oy',
  æ: 'a',
  ʉ: 'oo',
  ʃ: 'sh',
  ʂ: 'sh',
  ɕ: 'sh',
  ʒ: 'zh',
  x: 'kh',
  χ: 'kh',
  ħ: 'h',
  h: 'h',
  θ: 'th',
  ð: 'th',
  ɬ: 'tl',
  ɾ: 'r',
  r̩: 'ri',
  ɲ: 'ny',
  ŋ: 'ng',
  ɳ: 'n',
  ʈ: 't',
  ɖ: 'd',
  ʋ: 'v',
  ɸ: 'f',
  ʕ: '(throat catch)',
  ʔ: "'",
  q: 'k',
  j: 'y',
  w: 'w',
  y: 'ee',
  ŋg: 'ng-g',
  ŋk: 'nk',
  ps: 'ps',
  ks: 'ks',
  zd: 'zd',
  kʲ: 'ky',
  nʲ: 'ny',
  rʲ: 'ry',
  mʲ: 'my',
  pʲ: 'py',
  bʲ: 'by',
  ɡʲ: 'gy',
  hʲ: 'hy',
  a: 'ah',
  e: 'eh',
  i: 'ee',
  o: 'oh',
  u: 'oo',
  p: 'p',
  b: 'b',
  t: 't',
  d: 'd',
  k: 'k',
  ɡ: 'g',
  g: 'g',
  m: 'm',
  n: 'n',
  l: 'l',
  r: 'r',
  s: 's',
  z: 'z',
  f: 'f',
  v: 'v',
  c: 'k',
};

const RESPELL_KEYS = Object.keys(RESPELL).sort((a, b) => b.length - a.length);

// Length-marking overrides for the timed respelling mode. Choice (documented
// in deriveRespelling): long nuclei are marked by selecting the naturally
// LONG English analogy ('ah' vs short 'a', 'ee' vs 'i', 'oo' vs 'u',
// 'aw'/'oh' vs 'o', 'ay' vs 'e') — never by blind letter doubling, which
// produces non-words like 'naaay'.
const TIMED_RESPELL = {
  aː: 'ah',
  a: 'a',
  eː: 'ay',
  e: 'e',
  ɛː: 'ay',
  ɛ: 'e',
  iː: 'ee',
  i: 'i',
  ɪ: 'i',
  oː: 'oh',
  o: 'o',
  ɔː: 'aw',
  ɔ: 'o',
  uː: 'oo',
  u: 'u',
  ʊ: 'u',
  ɯ: 'u',
  yː: 'ee',
  y: 'i',
  øː: 'ur',
  ø: 'ur',
  œ: 'oy',
  æ: 'a',
  ɐ: 'u',
  ɑ: 'ah',
  ə: 'uh',
  ʉ: 'u',
};

function respellSyllable(ipaSyllable, timed) {
  let s = ipaSyllable.replace(/^ˈ/, '');
  let out = '';
  while (s.length > 0) {
    let matched = false;
    for (const key of RESPELL_KEYS) {
      if (s.startsWith(key)) {
        out += timed && TIMED_RESPELL[key] ? TIMED_RESPELL[key] : RESPELL[key];
        s = s.slice(key.length);
        matched = true;
        break;
      }
    }
    if (!matched) {
      // Unknown symbol: skip the code point (its hint lives in `notes`).
      s = [...s].slice(1).join('');
    }
  }
  return out;
}

/**
 * Voiceover-style respelling of an array of IPA syllable strings; the
 * stressed syllable (stressIdx) is upper-cased. e.g. ['a','rɔːk','nɛː'], 1
 * → 'ah-RAWK-nay'.
 *
 * Optional third argument `timing` (the object returned in
 * derivePronunciation().timing, or any truthy value to request the mode):
 * switches vowels to length-marking analogies — short 'a/i/u/o/e' vs long
 * 'ah/ee/oo/aw/ay' — so long nuclei read long naturally in English
 * ('a-POL-loon' reads as 'a-POHL-lawn'; 'ah-RAWK-naaay' stays wrong and is
 * never produced). Blind doubling is avoided on purpose: the default
 * analogies already imply length, and the doubled-letter rhythm notation
 * lives separately in timing.rhythm.
 */
function deriveRespelling(phonemes, stressIdx, timing) {
  const timed = !!timing;
  return phonemes
    .map((syll, i) => {
      const r = respellSyllable(syll, timed);
      return i === stressIdx ? r.toUpperCase() : r;
    })
    .join('-');
}

/** Wrap an IPA transcription in an SSML phoneme element. */
function buildSsml(ipa, text) {
  const ph = escapeXml(String(ipa).replace(/^\/|\/$/g, ''));
  return `<speak><phoneme alphabet="ipa" ph="${ph}">${escapeXml(text)}</phoneme></speak>`;
}

// One-line reading hints for phones with no plain English equivalent.
const NOTES = {
  y: "y — French 'u' / German 'ü': say 'ee' with tightly rounded lips",
  yː: "yː — long French 'u' / German 'ü'",
  ɛː: "ɛː — long open 'eh', as in 'bed' held long",
  ɔː: "ɔː — long open 'aw', as in 'law'",
  ɔ: "ɔ — open 'o', as in British 'hot'",
  ø: "ø — French 'eu' in 'peu': 'eh' with rounded lips",
  œ: "œ — French 'eu' in 'sœur': open 'eh' with rounded lips",
  øː: "øː — long French 'eu' in 'peu'",
  x: "x — 'ch' of Scottish 'loch' or German 'Bach'",
  ħ: "ħ — breathy 'h' scraped deep in the throat (Arabic ح)",
  θ: "θ — 'th' as in 'thin'",
  ð: "ð — 'th' as in 'this'",
  ɬ: "ɬ — whispered 'l': tongue in 'l' position, hiss air around it",
  t͡ɬ: "t͡ɬ — 'tl' as one sound: 't' released sideways into a whispered 'l'",
  t͡s: "t͡s — 'ts' as in 'cats', pronounced as one sound",
  ʕ: 'ʕ — voiced pharyngeal: a creaky squeeze deep in the throat',
  ʔ: "ʔ — glottal stop: the catch in the middle of 'uh-oh'",
  q: "q — 'k' made at the very back of the throat",
  ɾ: "ɾ — tapped 'r', as in Spanish 'pero'",
  ɕ: "ɕ — soft 'sh', as in Japanese 'shio'",
  ʂ: "ʂ — retroflex 'sh', tongue tip curled back",
  ʈ: "ʈ — retroflex 't', tongue tip curled back",
  ɖ: "ɖ — retroflex 'd', tongue tip curled back",
  ɳ: "ɳ — retroflex 'n', tongue tip curled back",
  r̩: "r̩ — syllabic 'r': an 'r' acting as the vowel",
  ɲ: "ɲ — 'ny' as in 'canyon'",
  ŋ: "ŋ — 'ng' as in 'sing', even before a vowel",
  ŋg: "ŋg — 'ng' in 'finger'",
  ŋk: "ŋk — 'nk' in 'ink'",
  ɡʱ: "ɡʱ — breathy 'g', followed by a puff of voiced breath",
  dʱ: "dʱ — breathy 'd', followed by a puff of voiced breath",
  bʱ: "bʱ — breathy 'b', followed by a puff of voiced breath",
  ɖʱ: "ɖʱ — breathy retroflex 'd'",
  d͡ʑʱ: "d͡ʑʱ — breathy 'j'",
  zd: "zd — 'zd' as in 'wisdom', the classical value of zeta",
  au̯: "au̯ — 'ow' as in 'cow', one smooth glide",
  eu̯: "eu̯ — 'eh-oo' glided together, like Welsh 'ew'",
  ey̯: "ey̯ — 'ay' gliding upward, as in 'grey'",
  ɯ: "ɯ — unrounded 'oo': lips spread as for 'ee', tongue back as for 'oo'",
  ɸ: "ɸ — 'f' blown through both lips, no teeth",
  ʋ: "ʋ — a soft 'v' closer to 'w'",
};

function collectNotes(tokens, extra) {
  const seen = new Set();
  const notes = [];
  for (const t of tokens) {
    const key = t.p.replace(/^ˈ/, '');
    if (NOTES[key] && !seen.has(key)) {
      seen.add(key);
      notes.push(NOTES[key]);
    }
  }
  for (const n of extra || []) notes.push(n);
  return notes;
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

const GREEK_SPEC = {
  tokenize: tokenizeGreek,
  onsets: GREEK_ONSETS,
  label: 'Derived from restored orthography (classical Attic values)',
};

const LANGUAGES = {
  greek: GREEK_SPEC,
  'greek-location': GREEK_SPEC,
  nahuatl: {
    tokenize: tokenizeNahuatl,
    onsets: new Set(['kw', 'kj', 'tj']),
    label: 'Derived from restored orthography (classical Nahuatl)',
  },
  norse: {
    tokenize: tokenizeNorse,
    onsets: new Set(['pr', 'br', 'tr', 'dr', 'kr', 'ɡr', 'fr', 'pl', 'bl', 'kl', 'ɡl', 'fl', 'kv']),
    label: 'Derived from restored orthography (Old Norse)',
  },
  sanskrit: {
    tokenize: tokenizeSanskrit,
    onsets: new Set([
      'pr',
      'br',
      'tr',
      'dr',
      'kr',
      'ɡr',
      'pl',
      'kl',
      'ɡl',
      'kʰr',
      'ɡʱr',
      'tʰr',
      'dʱr',
      'pʰr',
      'bʱr',
    ]),
    label: 'Derived from restored orthography (classical Sanskrit / IAST)',
  },
  japanese: {
    tokenize: tokenizeJapanese,
    onsets: new Set(),
    label: 'Derived from restored orthography (standard Japanese)',
  },
  egyptian: {
    tokenize: tokenizeEgyptian,
    onsets: new Set(),
    label: 'Conventional Egyptological reading — hieroglyphs write no vowels',
  },
};

const FALLBACK_LABEL = 'Orthographic passthrough — no pronunciation rule set for this tradition';

function derivePronunciation(entry) {
  const language = LANGUAGES[entry.pantheon] ? entry.pantheon : 'fallback';
  const spec = LANGUAGES[language];
  const form = String(entry.unicode || entry.ascii || entry.id || '');
  const tokens = spec ? spec.tokenize(form) : tokenizeFallback(form);
  const syllableTokens = syllabify(tokens, spec ? spec.onsets : new Set());
  const stressIndex = spec ? assignStress(language, syllableTokens, entry) : null;
  const syllables = syllableTokens.map((syll) => syll.map((t) => t.p).join(''));
  const ipa = renderIpa(syllableTokens, stressIndex);
  const respelling = syllables.length > 0 ? deriveRespelling(syllables, stressIndex) : '';
  // The mora timing layer reads the same token/syllable structures; fallback
  // entries honestly carry no timing.
  const timing = spec ? computeTiming(language, syllableTokens, stressIndex) : null;
  const conventional = language === 'egyptian';
  const extra = [];
  if (conventional) {
    extra.push(
      'Egyptian hieroglyphs record consonants only — any vocalization is a scholarly convention'
    );
  }
  if (language === 'fallback') {
    extra.push('No pronunciation rule set for this tradition — showing the written form');
  }
  return {
    ipa,
    ipaLabel: spec ? spec.label : FALLBACK_LABEL,
    syllables,
    stressIndex,
    respelling,
    ssml: buildSsml(ipa, entry.unicode || entry.ascii || ''),
    notes: collectNotes(tokens, extra),
    timing,
    derived: language !== 'fallback',
    conventional,
  };
}

module.exports = {
  derivePronunciation,
  deriveRespelling,
  buildSsml,
  // Exported for tests and tuning tools.
  _internals: {
    graphemes,
    syllabify,
    greekOriginalStressIndex,
    computeTiming,
    LANGUAGES,
  },
};
