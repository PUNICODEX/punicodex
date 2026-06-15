/**
 * PÚNYCODEX — Original script resolution and provenance
 *
 * The legacy lexicon stores the "original script" in a field named `greek`.
 * That works for Greek, Chinese, Japanese and Taoist entries, but for other
 * traditions it is either empty ("—") or a Greek transliteration. This module
 * introduces a clean `originalScript` concept, keeps the Greek/CJK fallback for
 * backward compatibility, and supplies curated original scripts plus
 * step-by-step provenance for non-Greek traditions.
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

// ═════════════════════════════════════════════════════════════════════════════
// Script display names by pantheon
// ═════════════════════════════════════════════════════════════════════════════

const SCRIPT_NAMES = {
  greek: 'Greek',
  'greek-location': 'Greek',
  egyptian: 'Hieroglyphs',
  mesopotamian: 'Cuneiform',
  canaanite: 'Ugaritic / Phoenician',
  phoenician: 'Phoenician',
  hittite: 'Cuneiform / Luwian hieroglyphs',
  norse: 'Runes',
  sanskrit: 'Devanagari',
  buddhist: 'Source-language script',
  chinese: 'Chinese characters',
  japanese: 'Japanese characters',
  taoist: 'Chinese characters',
  korean: 'Korean script',
  celtic: 'Celtic transcription',
  nahuatl: 'Nahuatl transcription',
  polynesian: 'Polynesian transcription',
  yoruba: 'Yoruba transcription',
  slavic: 'Slavic transcription',
  zoroastrian: 'Avestan / Old Persian',
  incan: 'Incan transcription',
};

// Pantheons for which no indigenous per-name script is attested. The page will
// label the Latin-with-diacritics form honestly as a scholarly transliteration.
const SCRIPTLESS_PANTHEONS = new Set([
  'celtic',
  'nahuatl',
  'polynesian',
  'yoruba',
  'slavic',
  'incan',
  'korean',
]);

// ═════════════════════════════════════════════════════════════════════════════
// Curated original-script data
// ═════════════════════════════════════════════════════════════════════════════

const ORIGINAL_SCRIPTS = {
  apsu: {
    originalScript: '𒀊𒍪',
    scriptName: 'Cuneiform',
    provenance: {
      original: '𒀊𒍪',
      transliteration: 'Apsû',
      steps: [
        'Sumerogram AB.ZU (𒀊𒍪), read in Akkadian as apsû',
        'Akkadian /apsû/ denotes the subterranean freshwater abyss',
        'The circumflex in Apsû marks vowel-contraction length, not Greek-style stress',
      ],
      sources: [
        'Chicago Assyrian Dictionary (CAD), apsû',
        'Black & Green, Gods, Demons and Symbols of Ancient Mesopotamia',
        'Enuma Elish (Tablet I)',
      ],
    },
  },
};

// ═════════════════════════════════════════════════════════════════════════════
// Helpers
// ═════════════════════════════════════════════════════════════════════════════

function isPlaceholder(value) {
  return !value || value === '—' || value.trim() === '';
}

function containsGreekOrCjk(value) {
  if (!value) return false;
  return (
    /[\u0370-\u03FF\u1F00-\u1FFF]/.test(value) || // Greek
    /[\u0900-\u097F]/.test(value) || // Devanagari
    /[\u4E00-\u9FFF\u3040-\u309F\u30A0-\u30FF]/.test(value) // CJK
  );
}

function getMapped(entry) {
  if (!entry?.id) return undefined;
  return ORIGINAL_SCRIPTS[entry.id];
}

function getOriginalScript(entry) {
  if (!entry) return null;

  // 1. Explicit field on the lexicon entry
  if (!isPlaceholder(entry.originalScript)) {
    return entry.originalScript;
  }

  // 2. Curated mapping
  const mapped = getMapped(entry);
  if (mapped && !isPlaceholder(mapped.originalScript)) {
    return mapped.originalScript;
  }

  // 3. Backward-compatible Greek/CJK fallback. We only fall back to the
  //    legacy `greek` field when it actually contains Greek, Devanagari or CJK
  //    characters — never a Greek transliteration of a Semitic name.
  if (!isPlaceholder(entry.greek) && containsGreekOrCjk(entry.greek)) {
    return entry.greek;
  }

  return null;
}

function getScriptName(entry) {
  if (!entry) return 'Original';
  const mapped = getMapped(entry);
  if (mapped?.scriptName) return mapped.scriptName;
  return SCRIPT_NAMES[entry.pantheon] || 'Original Script';
}

function hasOriginalScript(entry) {
  return getOriginalScript(entry) !== null;
}

function getOriginalScriptLabel(entry) {
  if (hasOriginalScript(entry)) return 'Original Script';
  if (entry?.pantheon && SCRIPTLESS_PANTHEONS.has(entry.pantheon)) {
    return 'Scholarly Transliteration';
  }
  return 'Scholarly Transliteration';
}

function getProvenance(entry) {
  if (!entry) return null;
  const mapped = getMapped(entry);
  if (mapped?.provenance) return mapped.provenance;
  return null;
}

function getNoScriptNote(entry) {
  if (!entry) return '';
  const pantheon = entry.pantheon || 'this tradition';
  if (entry.pantheon && SCRIPTLESS_PANTHEONS.has(entry.pantheon)) {
    return `No indigenous writing system is securely attested for individual ${pantheon} names. The form shown is a modern scholarly transliteration.`;
  }
  return `The original script for this ${pantheon} name has not yet been added to PUNYCODEX. The form shown is a scholarly transliteration.`;
}

// ═════════════════════════════════════════════════════════════════════════════
// Sanskrit / Buddhist IAST → Devanagari converter
// ═════════════════════════════════════════════════════════════════════════════

const IAST_VOWELS = {
  a: 'अ',
  ā: 'आ',
  i: 'इ',
  ī: 'ई',
  u: 'उ',
  ū: 'ऊ',
  ṛ: 'ऋ',
  ṝ: 'ॄ',
  ḷ: 'ऌ',
  ḹ: 'ॡ',
  e: 'ए',
  ai: 'ऐ',
  o: 'ओ',
  au: 'औ',
  ṃ: 'ं',
  ḥ: 'ः',
};

const IAST_CONSONANTS = {
  k: 'क',
  kh: 'ख',
  g: 'ग',
  gh: 'घ',
  ṅ: 'ङ',
  c: 'च',
  ch: 'छ',
  j: 'ज',
  jh: 'झ',
  ñ: 'ञ',
  ṭ: 'ट',
  ṭh: 'ठ',
  ḍ: 'ड',
  ḍh: 'ढ',
  ṇ: 'ण',
  t: 'त',
  th: 'थ',
  d: 'द',
  dh: 'ध',
  n: 'न',
  p: 'प',
  ph: 'फ',
  b: 'ब',
  bh: 'भ',
  m: 'म',
  y: 'य',
  r: 'र',
  l: 'ल',
  v: 'व',
  ś: 'श',
  ṣ: 'ष',
  s: 'स',
  h: 'ह',
};

const IAST_VOWEL_SIGNS = {
  a: '',
  ā: 'ा',
  i: 'ि',
  ī: 'ी',
  u: 'ु',
  ū: 'ू',
  ṛ: 'ृ',
  ṝ: 'ॄ',
  ḷ: 'ॢ',
  ḹ: 'ॣ',
  e: 'े',
  ai: 'ै',
  o: 'ो',
  au: 'ौ',
};

const IAST_TOKENS = Object.keys(IAST_VOWELS)
  .concat(Object.keys(IAST_CONSONANTS))
  .sort((a, b) => b.length - a.length);

function iastTokenize(text) {
  const tokens = [];
  let i = 0;
  const normalized = text.toLowerCase().normalize('NFC');
  while (i < normalized.length) {
    let matched = false;
    for (const token of IAST_TOKENS) {
      if (normalized.startsWith(token, i)) {
        tokens.push(token);
        i += token.length;
        matched = true;
        break;
      }
    }
    if (!matched) {
      // Pass through unknown characters (spaces, punctuation, hyphens)
      tokens.push(normalized[i]);
      i += 1;
    }
  }
  return tokens;
}

function iastToDevanagari(text) {
  const tokens = iastTokenize(text);
  let output = '';
  let pendingConsonant = false;

  for (let idx = 0; idx < tokens.length; idx++) {
    const token = tokens[idx];
    const nextToken = tokens[idx + 1];

    if (IAST_VOWELS[token]) {
      if (token === 'ṃ' || token === 'ḥ') {
        output += IAST_VOWELS[token];
        pendingConsonant = false;
        continue;
      }
      if (pendingConsonant) {
        output += IAST_VOWEL_SIGNS[token] || '';
        pendingConsonant = false;
      } else {
        output += IAST_VOWELS[token];
      }
      continue;
    }

    if (IAST_CONSONANTS[token]) {
      if (pendingConsonant) {
        output += '्';
      }
      output += IAST_CONSONANTS[token];
      pendingConsonant = true;
      continue;
    }

    // Unknown / punctuation
    if (pendingConsonant) {
      output += '्';
      pendingConsonant = false;
    }
    output += token;
  }

  if (pendingConsonant) {
    output += '्';
  }

  return output;
}

function buildSanskritProvenance(entry, devanagari) {
  return {
    original: devanagari,
    transliteration: entry.unicode,
    steps: [
      `Sanskrit ${entry.unicode} is written in Devanagari as ${devanagari}`,
      'IAST transliteration maps each Devanagari vowel and consonant to a Latin equivalent',
      'Macrons mark long vowels (ā, ī, ū); dots beneath consonants mark retroflex articulation (ṭ, ḍ, ṇ, ṣ)',
    ],
    sources: ['Monier-Williams Sanskrit-English Dictionary', 'Macdonell, Sanskrit Grammar for Students'],
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// Merge curated extra data (non-Sanskritic scripts)
// ═════════════════════════════════════════════════════════════════════════════

const extraPath = path.join(__dirname, 'original-scripts-extra.json');
try {
  const extra = JSON.parse(fs.readFileSync(extraPath, 'utf8'));
  for (const [id, data] of Object.entries(extra)) {
    if (id.startsWith('_')) continue;
    if (!ORIGINAL_SCRIPTS[id]) {
      ORIGINAL_SCRIPTS[id] = data;
    }
  }
} catch (err) {
  // Extra file is optional during development
}

// ═════════════════════════════════════════════════════════════════════════════
// Optional: populate missing Sanskrit / Buddhist Devanagari at runtime
// ═════════════════════════════════════════════════════════════════════════════

function populateFromLexicon(lexiconPath) {
  const fullPath = path.resolve(lexiconPath || path.join(__dirname, 'lexicon.js'));
  const code = fs.readFileSync(fullPath, 'utf8').replace('const LEXICON', 'var LEXICON');
  const lexicon = new Function(`${code}; return LEXICON;`)();

  for (const entry of lexicon) {
    if (entry.id in ORIGINAL_SCRIPTS) continue;

    if (entry.pantheon === 'sanskrit' || entry.pantheon === 'buddhist') {
      const devanagari = iastToDevanagari(entry.unicode);
      if (devanagari && devanagari !== entry.unicode) {
        ORIGINAL_SCRIPTS[entry.id] = {
          originalScript: devanagari,
          scriptName: 'Devanagari',
          provenance: buildSanskritProvenance(entry, devanagari),
        };
      }
    }
  }
}

// Populate Sanskrit/Buddhist mappings automatically so the site does not claim
// a Latin transliteration is the original script for those traditions.
populateFromLexicon();

// ═════════════════════════════════════════════════════════════════════════════
// Exports
// ═════════════════════════════════════════════════════════════════════════════

module.exports = {
  ORIGINAL_SCRIPTS,
  SCRIPT_NAMES,
  SCRIPTLESS_PANTHEONS,
  iastToDevanagari,
  isPlaceholder,
  containsGreekOrCjk,
  getOriginalScript,
  getScriptName,
  hasOriginalScript,
  getOriginalScriptLabel,
  getProvenance,
  getNoScriptNote,
  populateFromLexicon,
};
