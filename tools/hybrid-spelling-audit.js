#!/usr/bin/env node
/**
 * Hybrid-spelling audit (Greek entries).
 *
 * Detects restorations that mix Latinized spelling with Greek diacritics —
 * the "Oedípus" class of bug (Latin Oedipus + Greek acute; strict: Oidípous).
 * For every greek-pantheon lexicon entry, mechanically transliterates the
 * `greek` field and diffs it against the `unicode` restoration, classifying:
 *
 *   latin-oe   — "oe" where Greek has οι (strict: oi)
 *   latin-ae   — "ae" where Greek has αι (strict: ai)
 *   latin-c    — "c" where Greek has κ (strict: k)
 *   latin-us   — "-us"/"-um" where Greek has -ος/-ον (strict: -os/-on)
 *   accent     — accent sits on a different vowel than the Greek tonos
 *   other      — any remaining mismatch (variants, macron-only fallbacks…)
 *
 * Many mismatches are DELIBERATE (attested variants, macron-only LSJ
 * convention, recognizability exceptions like Phoenix). This is a review
 * report, not a gate — ACCURACY.md decides what gets fixed.
 *
 * Usage: node tools/hybrid-spelling-audit.js
 */

const path = require('node:path');
const { LEXICON } = require(path.join(__dirname, '..', 'type', 'js', 'lexicon.js'));

// Mechanical Classical-Greek → Latin transliteration (strict scholarly).
function transliterate(greek) {
  let s = greek.normalize('NFD');
  // Rough/smooth breathing: rough (dasia, U+0314) → leading h; smooth drops.
  const rough = /̀?́?ͅ?.*?̔/.test('') && false; // placeholder, handled below
  let out = '';
  let capitalizeNext = true;
  const base = greek.normalize('NFD');
  const chars = [...base];
  let pendingH = false;
  for (let i = 0; i < chars.length; i++) {
    const c = chars[i];
    if (c === 'ͅ') continue; // iota subscript: fold into nothing (transliteration drops it)
    if (c === '̔') {
      // rough breathing — h before the vowel
      pendingH = true;
      continue;
    }
    if (c === '̓' || c === '̀' || c === '́' || c === '͂' || c === '̈' || c === '̈́') continue; // marks handled via tonos logic below
    out += c;
  }
  // Rebuild from precomposed-ish letters with tonos info preserved.
  const TONOS = '́'; // combining acute
  const CIRC = '͂';
  const letters = [];
  let cur = null;
  for (const ch of greek.normalize('NFD')) {
    if (/^[\p{Lm}\p{L}]$/u.test(ch)) {
      if (cur) letters.push(cur);
      cur = { ch, accent: null, rough: false, diaeresis: false };
    } else if (cur) {
      if (ch === TONOS) cur.accent = 'acute';
      else if (ch === CIRC) cur.accent = 'circ';
      else if (ch === '̔') cur.rough = true;
      else if (ch === '̓') cur.rough = false;
      else if (ch === '̈') cur.diaeresis = true;
      else if (ch === 'ͅ') cur.iotaSub = true;
      else if (ch === '̀') cur.accent = 'grave';
    }
  }
  if (cur) letters.push(cur);

  const MAP = {
    α: 'a', β: 'b', γ: 'g', δ: 'd', ε: 'e', ζ: 'z', η: 'ē', θ: 'th', ι: 'i',
    κ: 'k', λ: 'l', μ: 'm', ν: 'n', ξ: 'x', ο: 'o', π: 'p', ρ: 'r', σ: 's',
    ς: 's', τ: 't', υ: 'y', φ: 'ph', χ: 'ch', ψ: 'ps', ω: 'ō',
  };
  const VOWELS = new Set(['α', 'ε', 'η', 'ι', 'ο', 'ω', 'υ']);
  const DIPTH = { αι: 'ai', ει: 'ei', οι: 'oi', υι: 'yi', αυ: 'au', ευ: 'eu', ου: 'u', ηυ: 'ēu', ωυ: 'ōu' };

  let res = '';
  for (let i = 0; i < letters.length; i++) {
    const l = letters[i];
    const lower = l.ch.toLowerCase();
    const next = letters[i + 1];
    const pair = next ? lower + next.ch.toLowerCase() : '';
    if (DIPTH[pair] && VOWELS.has(lower) && !l.diaeresis) {
      // Diphthong: accent/rough breathing attach to the SECOND vowel
      const tone = next.accent || l.accent;
      const roughH = next.rough || l.rough;
      let t = DIPTH[pair];
      res += (res === '' && roughH ? 'h' : '') + applyAccent(t, tone, next.ch === next.ch.toUpperCase() && l.ch === l.ch.toUpperCase());
      i++;
      continue;
    }
    if (!MAP[lower]) continue;
    let t = MAP[lower];
    const roughH = l.rough && res === '';
    res += (roughH ? 'h' : '') + applyAccent(t, l.accent, l.ch !== l.ch.toLowerCase());
  }
  return res;
}

const ACUTE = { a: 'á', e: 'é', ē: 'ḗ', i: 'í', o: 'ó', ō: 'ṓ', y: 'ý', u: 'ú', ai: 'aí', ei: 'eí', oi: 'oí', yi: 'yí', au: 'aú', eu: 'eú', ēu: 'ēú', ōu: 'ṓu' };
const CIRCUMFLEX = { a: 'â', e: 'ê', ē: 'ê', i: 'î', o: 'ô', ō: 'ô', y: 'û', u: 'û', ai: 'aî', ei: 'eî', oi: 'oî', au: 'aû', eu: 'eû' };
function applyAccent(s, tone, _cap) {
  if (tone === 'acute' && ACUTE[s]) return ACUTE[s];
  if (tone === 'circ' && CIRCUMFLEX[s]) return CIRCUMFLEX[s];
  return s;
}

function stripAccents(s) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function classify(greek, unicode, strict) {
  const flags = [];
  const u = unicode.toLowerCase();
  const su = strict.toLowerCase();
  if (/\boi/.test(su) && /\boe|oe/i.test(u) && !/oi/i.test(u)) flags.push('latin-oe');
  if (/ae/.test(u) && /ai/.test(su)) flags.push('latin-ae');
  if (/c/.test(u) && /k/.test(su) && !/c/.test(su)) flags.push('latin-c');
  if (/us$|um$/.test(u) && /os$|on$/.test(su)) flags.push('latin-us');
  // accent-position: which vowel carries the mark in each
  const accU = [...u.normalize('NFD')].findIndex((c) => /[́͂]/.test(c));
  const accS = [...su.normalize('NFD')].findIndex((c) => /[́͂]/.test(c));
  if (accU >= 0 && accS >= 0) {
    const baseU = u.normalize('NFD')[accU - 1];
    const baseS = su.normalize('NFD')[accS - 1];
    const strip = (c) => c && c.normalize('NFD').replace(/[̀-ͯ]/g, '');
    const bU = strip(u.normalize('NFD').slice(accU - 1, accU));
    const bS = strip(su.normalize('NFD').slice(accS - 1, accS));
    // Compare by base vowel identity after folding ē→e, ō→o
    const fold = (c) => (c || '').replace('ē', 'e').replace('ō', 'o');
    if (fold(bU) !== fold(bS)) flags.push('accent');
  } else if (accU >= 0 && accS < 0) {
    flags.push('accent'); // accented where strict has none (or vice versa below)
  }
  if (stripAccents(u) !== stripAccents(su)) flags.push('other');
  return [...new Set(flags)];
}

const rows = [];
for (const e of LEXICON) {
  if (e.pantheon !== 'greek' && e.pantheon !== 'greek-location') continue;
  if (!e.greek || e.greek === '—') continue;
  const strict = transliterate(e.greek);
  const got = e.unicode.toLowerCase();
  const flags = classify(e.greek, got, strict.toLowerCase());
  if (flags.length) rows.push({ id: e.id, unicode: e.unicode, greek: e.greek, strict: strict, flags });
}

console.log(`Hybrid-spelling audit: ${rows.length} Greek entries differ from strict transliteration\n`);
for (const r of rows) {
  console.log(`${r.id.padEnd(16)} ${r.unicode.padEnd(16)} strict: ${r.strict.padEnd(16)} [${r.flags.join(', ')}]  ${r.greek}`);
}
