/**
 * Audit Greek canonical forms for missing acute accents.
 *
 * We add the acute to the Latin transliteration by aligning Greek vowel nuclei
 * to Latin vowels. For diphthongs whose second element is upsilon (ευ, αυ,
 * ηυ, ωυ), the acute is placed on the second Latin vowel — matching existing
 * project forms such as Zeús, Promētheús, and the user's correction Thēseús.
 * Other diphthongs (αι, ει, οι, υι) are flagged for manual review because the
 * project's convention varies (compare Áias vs. Aígyptos).
 */

const fs = require('fs');
const path = require('path');
const { _internals } = require('../type/js/pronunciation-rules.js');

const lexPath = path.resolve(__dirname, '../type/js/lexicon.js');
const lexJs = fs.readFileSync(lexPath, 'utf8');
const start = lexJs.indexOf('[');
const end = lexJs.lastIndexOf(']');
const lex = eval(lexJs.slice(start, end + 1));

const GREEK_VOWELS = new Set(['α', 'ε', 'η', 'ι', 'ο', 'υ', 'ω']);
const GREEK_DIPHTHONGS = new Set(['αι', 'ει', 'οι', 'υι', 'αυ', 'ευ', 'ου', 'ηυ', 'ωυ']);
const SECOND_ACUTE_DIPHTHONGS = new Set(['αι', 'ει', 'οι', 'υι', 'αυ', 'ευ', 'ηυ', 'ωυ']); // Greek acute is on the second vowel of the diphthong

function getLatinVowels(str) {
  const out = [];
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    const nfd = ch.normalize('NFD');
    const base = nfd[0].toLowerCase();
    if (/[aeiouy]/.test(base)) {
      const long = nfd.includes('\u0304');
      const circum = nfd.includes('\u0302');
      out.push({ idx: i, ch, base, long: long || circum });
    }
  }
  return out;
}

function greekNuclei(greek) {
  const gs = _internals.graphemes(greek);
  const out = [];
  let i = 0;
  while (i < gs.length) {
    const g = gs[i];
    const lower = g.base.toLowerCase();
    if (!GREEK_VOWELS.has(lower)) {
      i += 1;
      continue;
    }
    const next = gs[i + 1];
    const pair = next ? lower + next.base.toLowerCase() : '';
    const isDiphthong = next && GREEK_DIPHTHONGS.has(pair) && !next.marks.includes('\u0308');
    const acuteOnFirst = g.marks.includes('\u0301') || g.marks.includes('\u0300') || g.marks.includes('\u0342');
    const acuteOnSecond = isDiphthong && (next.marks.includes('\u0301') || next.marks.includes('\u0300') || next.marks.includes('\u0342'));
    if (isDiphthong) {
      out.push({
        type: 'diphthong',
        pair,
        acuteOnFirst,
        acuteOnSecond,
        stressed: acuteOnFirst || acuteOnSecond,
      });
      i += 2;
    } else {
      out.push({ type: 'vowel', vowel: lower, stressed: acuteOnFirst });
      i += 1;
    }
  }
  return out;
}

function greekHasAcute(g) {
  if (!g) return false;
  const nfd = g.normalize('NFD');
  return nfd.includes('\u0301') || /[άέήίόύώ]/.test(g);
}

function greekHasCircum(g) {
  if (!g) return false;
  const nfd = g.normalize('NFD');
  return nfd.includes('\u0302') || nfd.includes('\u0342') || /[âêîôûῆῶᾶῖῦ]/.test(g);
}

function addAcuteToChar(ch) {
  const nfd = ch.normalize('NFD');
  const base = nfd[0];
  const marks = nfd.slice(1);
  return (base + '\u0301' + marks).normalize('NFC');
}

function addAcuteAndMacronToChar(ch) {
  const nfd = ch.normalize('NFD');
  const base = nfd[0];
  const marks = nfd.slice(1).replace(/\u0304/g, '');
  return (base + '\u0304' + '\u0301' + marks).normalize('NFC');
}

const groupA = [];
const groupB = [];
const review = [];

for (const e of lex.filter((x) => x.pantheon === 'greek')) {
  if (!e.greek) continue;
  const u = e.unicode;
  const latinVowels = getLatinVowels(u);
  if (latinVowels.length === 0) continue;

  const hasAnyAcute = latinVowels.some((v) => /[áéíóúýÁÉÍÓÚÝ]/.test(v.ch) || v.ch.normalize('NFD').includes('\u0301'));
  if (hasAnyAcute) continue;

  const greekAcute = greekHasAcute(e.greek);
  const greekCircum = greekHasCircum(e.greek);
  if (!greekAcute || greekCircum) continue;

  const nuclei = greekNuclei(e.greek);
  const stressedIdx = nuclei.findIndex((n) => n.stressed);
  if (stressedIdx === -1) continue;

  let latinPos = 0;
  for (let i = 0; i < stressedIdx; i++) {
    const n = nuclei[i];
    latinPos += n.type === 'diphthong' ? 2 : 1;
  }

  const stressed = nuclei[stressedIdx];
  const stressedLatin = latinVowels[Math.min(latinPos, latinVowels.length - 1)];
  if (!stressedLatin) continue;

  if (stressed.type === 'diphthong') {
    if (SECOND_ACUTE_DIPHTHONGS.has(stressed.pair)) {
      // Greek acute is on the second vowel of the diphthong; place it on the
      // corresponding second Latin vowel (e.g. Thēseús, Aías, Daidálos).
      const secondLatin = latinVowels[Math.min(latinPos + 1, latinVowels.length - 1)];
      if (!secondLatin) continue;
      const chars = u.split('');
      chars[secondLatin.idx] = addAcuteToChar(chars[secondLatin.idx]);
      groupA.push({ id: e.id, unicode: u, greek: e.greek, corrected: chars.join('') });
    } else {
      review.push({ id: e.id, unicode: u, greek: e.greek, diphthong: stressed.pair });
    }
    continue;
  }

  // Greek η and ω are always long; α/ι/υ length is inherited from the Latin macron.
  const greekLong = stressed.type === 'vowel' && (stressed.vowel === 'η' || stressed.vowel === 'ω');
  if (stressedLatin.long || greekLong) {
    const chars = u.split('');
    chars[stressedLatin.idx] = addAcuteAndMacronToChar(chars[stressedLatin.idx]);
    groupB.push({ id: e.id, unicode: u, greek: e.greek, ideal: chars.join('') });
  } else {
    const chars = u.split('');
    chars[stressedLatin.idx] = addAcuteToChar(chars[stressedLatin.idx]);
    groupA.push({ id: e.id, unicode: u, greek: e.greek, corrected: chars.join('') });
  }
}

console.log('Group A (acute on short vowel):', groupA.length);
console.log('Group B (acute on long vowel, ideal variant):', groupB.length);
console.log('Review (ambiguous diphthong):', review.length);

const outPath = path.resolve(__dirname, '../.superpowers/greek-acute-audit.json');
fs.writeFileSync(outPath, JSON.stringify({ groupA, groupB, review }, null, 2));
console.log('Wrote audit to', outPath);

for (const n of groupA) console.log(' [A]', n.unicode, '->', n.corrected, `(${n.id})`);
for (const n of groupB) console.log(' [B]', n.unicode, '-> ideal:', n.ideal, `(${n.id})`);
for (const n of review) console.log(' [?]', n.unicode, `(${n.id})`, 'diphthong:', n.diphthong, 'greek:', n.greek);
