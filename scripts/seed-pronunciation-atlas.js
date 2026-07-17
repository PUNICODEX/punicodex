#!/usr/bin/env node
/**
 * PuniCodex — Pronunciation Atlas Seeder
 *
 * Builds the canonical type/js/pronunciation-atlas.js.
 *
 * - Copies rich, hand-curated pronunciation from scripts/lore-catalog.json
 *   and marks it as confidence: 'canonical'.
 * - Reconstructs broad IPA for all other entries from the Unicode restoration
 *   (Latin-with-diacritics form) and marks it as confidence: 'reconstructed'
 *   for Greek traditions or 'generated' for others.
 *
 * The generated values are a starting point for model training; flagged
 * entries should be reviewed by a philologist before being promoted to
 * 'canonical'.
 *
 * Run: node scripts/seed-pronunciation-atlas.js
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');

function loadLexicon() {
  const lexiconPath = path.join(ROOT, 'type', 'js', 'lexicon.js');
  const code = fs.readFileSync(lexiconPath, 'utf8').replace('const LEXICON', 'var LEXICON');
  return new Function(`${code}; return LEXICON;`)();
}

function loadLoreCatalog() {
  const lorePath = path.join(ROOT, 'scripts', 'lore-catalog.json');
  return JSON.parse(fs.readFileSync(lorePath, 'utf8'));
}

const VOWEL_BASES = new Set(['a', 'e', 'i', 'o', 'u', 'y']);

const ACUTE_MARKS = new Set(['\u0301', '\u0302']);
const MACRON_MARK = '\u0304';

function isVowelBase(ch) {
  return VOWEL_BASES.has(ch.toLowerCase());
}

function ipaForVowel(base, stressed, long) {
  const lower = base.toLowerCase();
  let phoneme = '';
  switch (lower) {
    case 'a':
      phoneme = 'a';
      break;
    case 'e':
      phoneme = 'e';
      break;
    case 'i':
      phoneme = 'i';
      break;
    case 'o':
      phoneme = 'o';
      break;
    case 'u':
      phoneme = 'u';
      break;
    case 'y':
      phoneme = 'y';
      break;
    default:
      phoneme = lower;
  }
  if (long) phoneme += 'ː';
  return stressed ? `ˈ${phoneme}` : phoneme;
}

function ipaForConsonantPair(pair) {
  const map = {
    th: 'tʰ',
    ph: 'pʰ',
    ch: 'kʰ',
    ng: 'ŋg',
    nk: 'ŋk',
    nx: 'ŋks',
    nch: 'ŋkʰ',
    rh: 'rh',
    ae: 'ai',
    oe: 'oi',
  };
  return map[pair.toLowerCase()] || null;
}

function ipaForConsonant(ch) {
  const map = {
    b: 'b',
    c: 'k',
    d: 'd',
    f: 'f',
    g: 'g',
    h: 'h',
    j: 'j',
    k: 'k',
    l: 'l',
    m: 'm',
    n: 'n',
    p: 'p',
    q: 'k',
    r: 'r',
    s: 's',
    t: 't',
    v: 'v',
    w: 'w',
    x: 'ks',
    z: 'z',
  };
  return map[ch.toLowerCase()] || ch.toLowerCase();
}

function reconstructIpa(text) {
  if (!text) return null;
  const nfd = text.normalize('NFD');
  const phonemes = [];
  let stressedIndex = -1;

  for (let i = 0; i < nfd.length; ) {
    const base = nfd[i];

    // Pass through spaces and punctuation
    if (!/[a-zA-Z]/.test(base)) {
      i++;
      continue;
    }

    // Consonant digraphs
    const pair = nfd.slice(i, i + 2).replace(/[\u0300-\u036f]/g, '');
    const pairIpa = ipaForConsonantPair(pair);
    if (pairIpa && i + 1 < nfd.length) {
      phonemes.push(pairIpa);
      i += 2;
      continue;
    }

    if (isVowelBase(base)) {
      // Collect combining marks following this base
      let j = i + 1;
      const marks = [];
      while (j < nfd.length && /[\u0300-\u036f]/.test(nfd[j])) {
        marks.push(nfd[j]);
        j++;
      }
      const stressed = marks.some((m) => ACUTE_MARKS.has(m));
      const long = marks.includes(MACRON_MARK);
      if (stressed) stressedIndex = phonemes.length;
      phonemes.push(ipaForVowel(base, stressed, long));
      i = j;
      continue;
    }

    phonemes.push(ipaForConsonant(base));
    i++;
  }

  if (phonemes.length === 0) return null;

  // If no stress detected but there is a long vowel, stress the first long.
  if (stressedIndex === -1) {
    const firstLong = phonemes.findIndex((p) => p.includes('ː'));
    if (firstLong !== -1) {
      phonemes[firstLong] = `ˈ${phonemes[firstLong].replace(/^ˈ/, '')}`;
    }
  }

  return `/${phonemes.join('')}/`;
}

function labelForPantheon(pantheon) {
  if (pantheon === 'greek' || pantheon === 'greek-location') return 'Reconstructed Attic Greek';
  if (pantheon === 'norse') return 'Reconstructed Old Norse';
  if (pantheon === 'sanskrit' || pantheon === 'buddhist') return 'Reconstructed Sanskrit';
  if (pantheon === 'egyptian') return 'Egyptological reconstruction';
  if (pantheon === 'mesopotamian') return 'Assyriological reconstruction';
  if (pantheon === 'chinese' || pantheon === 'taoist') return 'Modern Standard Chinese reading';
  if (pantheon === 'japanese') return 'Modern Japanese reading';
  if (pantheon === 'korean') return 'Modern Korean reading';
  if (pantheon === 'zoroastrian') return 'Avestan reconstruction';
  return 'Reconstructed from Unicode restoration';
}

function confidenceForEntry(entry, hasLore) {
  if (hasLore) return 'canonical';
  if (entry.pantheon === 'greek' || entry.pantheon === 'greek-location') return 'reconstructed';
  return 'generated';
}

function seed() {
  const lexicon = loadLexicon();
  const lore = loadLoreCatalog();
  const atlas = {};

  for (const entry of lexicon) {
    const loreEntry = lore[entry.id];
    const lorePron = loreEntry?.pronunciation;

    if (lorePron && lorePron.ipa) {
      atlas[entry.id] = {
        ipa: lorePron.ipa,
        ipaLabel: lorePron.ipaLabel || labelForPantheon(entry.pantheon),
        phonemes: lorePron.phonemes || [],
        approximation: lorePron.approximation || null,
        dialect: lorePron.dialect || null,
        confidence: 'canonical',
        audioPath: lorePron.audioPath || null,
        note: lorePron.note || `Curated pronunciation from the PuniCodex scholarly edition for ${entry.unicode}.`,
      };
      continue;
    }

    const ipa = reconstructIpa(entry.unicode);
    const confidence = confidenceForEntry(entry, false);
    atlas[entry.id] = {
      ipa,
      ipaLabel: labelForPantheon(entry.pantheon),
      phonemes: [],
      approximation: null,
      dialect: null,
      confidence,
      audioPath: null,
      note:
        confidence === 'reconstructed'
          ? `Broad IPA reconstructed from the Latin-with-diacritics Unicode restoration ${entry.unicode}.`
          : `Broad IPA generated from the Unicode restoration ${entry.unicode}; review recommended before promotion to canonical.`,
    };
  }

  const outputPath = path.join(ROOT, 'type', 'js', 'pronunciation-atlas.js');
  const header = `/**
 * PuniCodex — Pronunciation Atlas
 *
 * Canonical pronunciation data for every lexicon entry, including IPA,
 * phoneme breakdowns, approximations, and confidence levels.
 *
 * Generated by scripts/seed-pronunciation-atlas.js from
 * scripts/lore-catalog.json (canonical entries) and the Unicode restoration
 * (reconstructed/generated entries).
 *
 * This is a canonical source. Promote confidence levels by hand after
 * philological review.
 */

'use strict';

const PRONUNCIATION_ATLAS = `;
  const footer = `;

function getPronunciation(id) {
  return PRONUNCIATION_ATLAS[id] || null;
}

function getAllPronunciationIds() {
  return Object.keys(PRONUNCIATION_ATLAS);
}

module.exports = {
  PRONUNCIATION_ATLAS,
  getPronunciation,
  getAllPronunciationIds,
};
`;

  fs.writeFileSync(outputPath, `${header}${JSON.stringify(atlas, null, 2)};${footer}`);
  const canonicalCount = Object.values(atlas).filter((p) => p.confidence === 'canonical').length;
  console.log(`✓ Wrote ${Object.keys(atlas).length} pronunciation entries to ${outputPath}`);
  console.log(`  - canonical: ${canonicalCount}`);
  console.log(`  - reconstructed/generated: ${Object.keys(atlas).length - canonicalCount}`);
}

seed();
