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
 *   chinese / taoist       → Modern Standard Mandarin (tone-marked pinyin;
 *                            the restoration's tone marks become Chao tone
 *                            letters on each syllable's nucleus)
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
 *   chinese/taoist — no lexical stress (tone language; stressIndex null).
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
// Chinese (Modern Standard Mandarin, tone-marked pinyin)
//
// The restorations are standard pinyin with tone marks (Chángé, SūnWùkōng).
// Tone lives on the nucleus vowel's combining mark: macron = T1, acute = T2,
// caron = T3, grave = T4, no mark = neutral. The tone is rendered as Chao
// tone letters appended to the nucleus token's `p` (so renderIpa carries it)
// and mirrored into the token's `accent` field for the contour layer.
// ---------------------------------------------------------------------------

const CHINESE_INITIALS = {
  b: 'p',
  p: 'pʰ',
  m: 'm',
  f: 'f',
  d: 't',
  t: 'tʰ',
  n: 'n',
  l: 'l',
  g: 'k',
  k: 'kʰ',
  h: 'x',
  j: 'tɕ',
  q: 'tɕʰ',
  x: 'ɕ',
  zh: 'ʈʂ',
  ch: 'ʈʂʰ',
  sh: 'ʂ',
  r: 'ɻ',
  z: 'ts',
  c: 'tsʰ',
  s: 's',
};

// Written final → [nucleus IPA, coda]. The coda nasals are separate tokens so
// the mora layer counts them through the standard coda-weight mechanism. The
// standalone null-initial spellings (yi, wa, yu, …) are tabled as aliases of
// their canonical finals — pinyin writes the i/u/ü glide as y/w word-initially,
// and contracts iu/ui/un to you/wei/wen in the same position.
const CHINESE_FINALS = {
  a: ['a', null],
  o: ['wo', null],
  e: ['ɤ', null],
  er: ['ɚ', null],
  ai: ['ai̯', null],
  ei: ['ei̯', null],
  ao: ['au̯', null],
  ou: ['ou̯', null],
  an: ['a', 'n'],
  en: ['ə', 'n'],
  ang: ['a', 'ŋ'],
  eng: ['ə', 'ŋ'],
  ong: ['ʊ', 'ŋ'],
  i: ['i', null],
  ia: ['ia', null],
  ie: ['iɛ', null],
  iao: ['iau̯', null],
  iu: ['iou̯', null],
  ian: ['iɛ', 'n'],
  in: ['i', 'n'],
  iang: ['ia', 'ŋ'],
  ing: ['i', 'ŋ'],
  iong: ['iʊ', 'ŋ'],
  u: ['u', null],
  ua: ['ua', null],
  uo: ['uo', null],
  uai: ['uai̯', null],
  ui: ['uei̯', null],
  uan: ['ua', 'n'],
  un: ['uə', 'n'],
  uang: ['ua', 'ŋ'],
  ueng: ['uə', 'ŋ'],
  ü: ['y', null],
  üe: ['yɛ', null],
  üan: ['yɛ', 'n'],
  ün: ['y', 'n'],
  // Null-initial standalone spellings (y/w forms, incl. the contractions).
  yi: ['i', null],
  ya: ['ia', null],
  ye: ['iɛ', null],
  yao: ['iau̯', null],
  you: ['iou̯', null],
  yan: ['iɛ', 'n'],
  yin: ['i', 'n'],
  yang: ['ia', 'ŋ'],
  ying: ['i', 'ŋ'],
  yong: ['iʊ', 'ŋ'],
  yu: ['y', null],
  yue: ['yɛ', null],
  yuan: ['yɛ', 'n'],
  yun: ['y', 'n'],
  wu: ['u', null],
  wa: ['ua', null],
  wo: ['uo', null],
  wai: ['uai̯', null],
  wei: ['uei̯', null],
  wan: ['ua', 'n'],
  wen: ['uə', 'n'],
  wang: ['ua', 'ŋ'],
  weng: ['uə', 'ŋ'],
};

const CHINESE_FINAL_KEYS = Object.keys(CHINESE_FINALS).sort((a, b) => b.length - a.length);

// Combining mark → [Chao tone letters, accent for the contour layer].
const CHINESE_TONES = [
  { mark: MARK.MACRON, sup: '˥', accent: 'macron' },
  { mark: MARK.ACUTE, sup: '˧˥', accent: 'acute' },
  { mark: MARK.CARON, sup: '˨˩˦', accent: 'caron' },
  { mark: MARK.GRAVE, sup: '˥˩', accent: 'grave' },
];

// Base vowel symbols used in the finals table (glide w and the non-syllabic
// mark excluded) — a nucleus with 2+ of these is bimoraic.
const CHINESE_VOWEL_CHARS = new Set([
  'a',
  'e',
  'i',
  'o',
  'u',
  'y',
  'ɤ',
  'ə',
  'ʊ',
  'ɛ',
  'ɚ',
  'ʅ',
  'ɿ',
]);

function chineseIsLong(vowelIpa) {
  let n = 0;
  for (const ch of vowelIpa) {
    if (CHINESE_VOWEL_CHARS.has(ch)) n += 1;
  }
  return n >= 2;
}

// Split a display form into pinyin chunks on the explicit syllable marks the
// restorations carry: apostrophes (Chángé) and camelCase (SūnWùkōng).
function chineseChunks(form) {
  const s = String(form).normalize('NFC');
  const chunks = [];
  let current = '';
  let prevLower = false;
  for (const ch of s) {
    if ("'’- ".includes(ch)) {
      if (current) chunks.push(current);
      current = '';
      prevLower = false;
      continue;
    }
    const isLetter = /[a-zü]/i.test(ch);
    const isUpper = isLetter && ch === ch.toUpperCase() && ch !== ch.toLowerCase();
    if (isUpper && prevLower && current) {
      chunks.push(current);
      current = '';
    }
    current += ch;
    prevLower = isLetter && ch === ch.toLowerCase();
  }
  if (current) chunks.push(current);
  return chunks;
}

// Longest written-final match at position j, or null.
function matchChineseFinal(letters, j) {
  for (const key of CHINESE_FINAL_KEYS) {
    let ok = true;
    for (let k = 0; k < key.length; k++) {
      if (letters[j + k] !== key[k]) {
        ok = false;
        break;
      }
    }
    if (ok) return { key, len: key.length };
  }
  return null;
}

function tokenizeChineseChunk(chunk, tokens) {
  const gs = graphemes(chunk);
  if (gs.length === 0) return;
  // ü is written u + diaeresis in NFD; give it its own letter for matching.
  const letters = gs.map((g) =>
    g.base === 'u' && g.marks.includes(MARK.DIAERESIS) ? 'ü' : g.base
  );
  let i = 0;
  while (i < letters.length) {
    const two = letters[i] + (letters[i + 1] || '');
    let initial = null;
    let j = i;
    if ((two === 'zh' || two === 'ch' || two === 'sh') && matchChineseFinal(letters, i + 2)) {
      initial = CHINESE_INITIALS[two];
      j = i + 2;
    } else if (CHINESE_INITIALS[letters[i]] && matchChineseFinal(letters, i + 1)) {
      initial = CHINESE_INITIALS[letters[i]];
      j = i + 1;
    }
    // After j/q/x the written u is always ü (qu → [tɕʰy], jue → [tɕyɛ]).
    if ((initial === 'tɕ' || initial === 'tɕʰ' || initial === 'ɕ') && letters[j] === 'u') {
      letters[j] = 'ü';
    }
    const match = matchChineseFinal(letters, j);
    if (!match) {
      // Stray letter (e.g. the unmarked romanization "Bodhidharma"): keep the
      // plain consonant value so the letter is not silently dropped.
      if (CHINESE_INITIALS[letters[i]]) tokens.push(C(CHINESE_INITIALS[letters[i]]));
      i += 1;
      continue;
    }
    let [vowelIpa, coda] = CHINESE_FINALS[match.key];
    // Apical vowels: -i after zh/ch/sh/r is [ʅ], after z/c/s it is [ɿ].
    if (match.key === 'i' && initial) {
      if (initial === 'ʈʂ' || initial === 'ʈʂʰ' || initial === 'ʂ' || initial === 'ɻ') {
        vowelIpa = 'ʅ';
      } else if (initial === 'ts' || initial === 'tsʰ' || initial === 's') {
        vowelIpa = 'ɿ';
      }
    }
    let tone = null;
    for (let g = i; g < j + match.len && !tone; g++) {
      for (const t of CHINESE_TONES) {
        if (gs[g].marks.includes(t.mark)) {
          tone = t;
          break;
        }
      }
    }
    if (initial) tokens.push(C(initial));
    tokens.push(
      V(
        vowelIpa + (tone ? tone.sup : ''),
        chineseIsLong(vowelIpa),
        false,
        tone ? tone.accent : null
      )
    );
    if (coda) tokens.push(C(coda));
    i = j + match.len;
  }
}

function tokenizeChinese(form) {
  const tokens = [];
  for (const chunk of chineseChunks(form)) {
    tokenizeChineseChunk(chunk, tokens);
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

function syllabify(tokens, onsetSet, codaOnly) {
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
      // A language may declare coda-only consonants (pinyin n / ŋ): a lone
      // intervocalic one closes the left syllable instead of migrating right.
      onsetSize = codaOnly?.has(between[0].p) ? 0 : 1;
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
  if (
    language === 'japanese' ||
    language === 'egyptian' ||
    language === 'chinese' ||
    language === 'taoist' ||
    language === 'fallback'
  ) {
    return null;
  }
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
  // PuniCodex house IPA signature: narrow no-break space after syllable dots
  // in multi-syllable forms. This is a subtle, technically valid convention
  // that identifies copy-pasted engine output.
  const signedBody = body.includes('.') ? body.replace(/\./g, `.\u202F`) : body;
  return `/${signedBody}/`;
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
  chinese: {
    moraMs: 250,
    geminate: false,
    codaWeight: 0.5,
    codaNasalMora: false,
    conventional: false,
    model: 'syllable-timed (one beat per syllable; lexical tone contour per syllable)',
  },
};

function prosodyFor(language) {
  if (language === 'greek-location') return PROSODY.greek;
  if (language === 'taoist') return PROSODY.chinese;
  return PROSODY[language];
}

function syllableContour(syllable, stressed, language) {
  if (language === 'chinese' || language === 'taoist') {
    // Lexical tone, not stress: every syllable carries its own contour.
    const nucleus = syllable.find((t) => t.vowel);
    if (nucleus?.accent === 'macron') return 'level';
    if (nucleus?.accent === 'acute') return 'rise';
    if (nucleus?.accent === 'caron') return 'fall-rise';
    if (nucleus?.accent === 'grave') return 'fall';
    return 'neutral';
  }
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
  ai̯: 'ai',
  ei̯: 'ei',
  ou̯: 'ou',
  iau̯: 'yao',
  iou̯: 'you',
  uai̯: 'wai',
  uei̯: 'wei',
  wo: 'wo',
  ia: 'ya',
  iɛ: 'ye',
  ua: 'wa',
  uo: 'wo',
  uə: 'we',
  yɛ: 'ywe',
  iʊ: 'yu',
  ɤ: 'uh',
  ɚ: 'er',
  ʅ: 'ir',
  ɿ: 'i',
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
  ʈʂ: 'j',
  ʈʂʰ: 'ch',
  tɕ: 'j',
  tɕʰ: 'ch',
  ɻ: 'r',
  ts: 'ts',
  tsʰ: 'ts',
};

function rhythmSyllable(syllable) {
  return syllable
    .map((t) => {
      if (t.vowel) {
        const key = t.p.replace(/ː/g, '').replace(/[˥˦˧˨˩]/g, '');
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
      contour: syllableContour(syll, stressed, language),
      ms: Math.round(morae[i] * prosody.moraMs),
    };
  });
  const stressed = perSyllable.find((s) => s.stressed);
  const tonal = language === 'chinese' || language === 'taoist';
  return {
    morae,
    totalMorae,
    contour: stressed
      ? stressed.contour
      : tonal
        ? perSyllable.map((s) => s.contour).join(' ')
        : 'flat',
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
  iau̯: 'yow',
  iou̯: 'yoh',
  uai̯: 'why',
  uei̯: 'way',
  au̯: 'ow',
  eu̯: 'ew',
  ey̯: 'ay',
  ai̯: 'eye',
  ei̯: 'ay',
  ou̯: 'oh',
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
  ʈʂʰ: 'chr',
  ʈʂ: 'j',
  tɕʰ: 'ch',
  tɕ: 'j',
  tsʰ: 'ts',
  ts: 'ts',
  iɛ: 'yeh',
  yɛ: 'yweh',
  iʊ: 'yoo',
  ia: 'yah',
  ua: 'wah',
  uo: 'waw',
  wo: 'waw',
  uə: 'wuh',
  ɤ: 'uh',
  ɚ: 'ur',
  ʅ: 'ir',
  ɿ: 'ih',
  ɻ: 'r',
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

function respellSyllable(ipaSyllable, timed, overrides) {
  let s = ipaSyllable.replace(/^ˈ/, '');
  let out = '';
  while (s.length > 0) {
    let matched = false;
    for (const key of RESPELL_KEYS) {
      if (s.startsWith(key)) {
        out += overrides?.[key] || (timed && TIMED_RESPELL[key]) || RESPELL[key];
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
 * Optional fourth argument `overrides` (a map of IPA key → analogy) lets a
 * language module re-voice a global analogy that collides with another
 * tradition's reading (Mandarin ü [y] is 'ew', not the Greek/Norse 'ee';
 * Mandarin sh [ʂ] is 'shr', not the Sanskrit 'sh').
 */
function deriveRespelling(phonemes, stressIdx, timing, overrides) {
  const timed = !!timing;
  return phonemes
    .map((syll, i) => {
      const r = respellSyllable(syll, timed, overrides);
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
  ɕ: "ɕ — soft 'sh' (Japanese 'sh', pinyin 'x'): tongue flat behind the lower teeth",
  ʂ: "ʂ — retroflex 'sh', tongue tip curled back",
  ʈʂ: "ʈʂ — pinyin 'zh': like 'j' in 'jump', tongue tip curled back",
  ʈʂʰ: "ʈʂʰ — pinyin 'ch': like 'ch' in 'church', tongue tip curled back",
  tɕ: "tɕ — pinyin 'j': like 'j' in 'jeep', tongue flat behind the lower teeth",
  tɕʰ: "tɕʰ — pinyin 'q': like 'ch' in 'cheese', tongue flat behind the lower teeth",
  ɻ: "ɻ — pinyin 'r': a curled-back 'r', between English 'r' and the 's' in 'measure'",
  ts: "ts — pinyin 'z': 'ds' as in 'beds', one sound, no puff of air",
  tsʰ: "tsʰ — pinyin 'c': 'ts' as in 'cats', one sound with a strong puff of air",
  ɤ: "ɤ — pinyin 'e': a back, unrounded 'uh' — like 'err' without the 'r'",
  ɚ: "ɚ — pinyin 'er': like 'err' in 'error', tongue curled back",
  ʅ: "ʅ — pinyin '-i' after zh/ch/sh/r: keep the curled tongue of the initial and buzz",
  ɿ: "ɿ — pinyin '-i' after z/c/s: keep the tongue of the 's' and buzz",
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
    // Strip the stress mark and any Chao tone letters (Mandarin nuclei carry
    // their tone contour in `p`); notes key on the bare phone.
    const key = t.p.replace(/^ˈ/, '').replace(/[˥˦˧˨˩]/g, '');
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

const CHINESE_SPEC = {
  tokenize: tokenizeChinese,
  onsets: new Set(),
  // A lone intervocalic n / ŋ is a coda of the left syllable, never an onset.
  codaOnly: new Set(['n', 'ŋ']),
  // ü [y] reads 'ew' (rounded), not the Greek/Norse 'ee'; sh [ʂ] is 'shr'.
  respell: { y: 'ew', ʂ: 'shr' },
  label: 'Derived from restored orthography (Modern Standard Mandarin, pinyin tone values)',
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
  chinese: CHINESE_SPEC,
  taoist: CHINESE_SPEC,
};

const FALLBACK_LABEL = 'Orthographic passthrough — no pronunciation rule set for this tradition';

function derivePronunciation(entry) {
  const language = LANGUAGES[entry.pantheon] ? entry.pantheon : 'fallback';
  const spec = LANGUAGES[language];
  const form = String(entry.unicode || entry.ascii || entry.id || '');
  const tokens = spec ? spec.tokenize(form) : tokenizeFallback(form);
  const syllableTokens = syllabify(
    tokens,
    spec ? spec.onsets : new Set(),
    spec ? spec.codaOnly : null
  );
  const stressIndex = spec ? assignStress(language, syllableTokens, entry) : null;
  const syllables = syllableTokens.map((syll) => syll.map((t) => t.p).join(''));
  const ipa = renderIpa(syllableTokens, stressIndex);
  const respelling =
    syllables.length > 0 ? deriveRespelling(syllables, stressIndex, null, spec?.respell) : '';
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
