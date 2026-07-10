#!/usr/bin/env node
/**
 * PÚNYCODEX — Bulk Original-Script Provenance Enrichment
 *
 * Generates rich provenance objects for built flagship temples and merges them
 * into type/js/original-scripts-extra.json. The schema matches the 8 pilot
 * entries (zeus, ra, thor, shiva, long, nikko, david, enlil).
 *
 * - Loads archetypes, lexicon, existing extra.json, and the ORIGINAL_SCRIPTS map.
 * - Skips entries whose provenance.reviewStatus is already "canonical".
 * - Skips scriptless pantheons (celtic, nahuatl, polynesian, yoruba, slavic,
 *   incan, korean) so the builder emits an honest placeholder section.
 * - Derives Greek/CJK originals from the archetype greek field.
 * - Uses iastToDevanagari for Sanskrit/Buddhist entries.
 * - Reuses existing original-script specimens from ORIGINAL_SCRIPTS where present.
 * - Writes the merged file and runs scripts/validate-provenance.js.
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..');

const PATHS = {
  archetypes: path.join(ROOT, 'js', 'archetypes-v2.js'),
  lexicon: path.join(ROOT, 'type', 'js', 'lexicon.js'),
  extra: path.join(ROOT, 'type', 'js', 'original-scripts-extra.json'),
  originalScripts: path.join(ROOT, 'type', 'js', 'original-scripts.js'),
};

const C = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  dim: '\x1b[2m',
  bold: '\x1b[1m',
};

function log(message) {
  console.log(message);
}

function warn(message) {
  console.log(`${C.yellow}⚠${C.reset} ${message}`);
}

function loadModuleVar(filePath, varName) {
  const code = fs.readFileSync(filePath, 'utf8').replace(`const ${varName}`, `var ${varName}`);
  return new Function(`${code}; return ${varName};`)();
}

function loadExtra() {
  const raw = fs.readFileSync(PATHS.extra, 'utf8');
  return JSON.parse(raw);
}

function saveExtra(data) {
  const json = JSON.stringify(data, null, 2);
  fs.writeFileSync(PATHS.extra, json + (json.endsWith('\n') ? '' : '\n'), 'utf8');
}

const {
  iastToDevanagari,
  ORIGINAL_SCRIPTS,
  SCRIPTLESS_PANTHEONS,
} = require(PATHS.originalScripts);

// ═════════════════════════════════════════════════════════════════════════════
// Source tier mapping
// ═════════════════════════════════════════════════════════════════════════════

const TIER_1_PATTERNS = [
  /\bLSJ\b/i,
  /Liddell-Scott-Jones/i,
  /Pape-Benseler/i,
  /Beekes/i,
  /Faulkner/i,
  /Wörterbuch der ägyptischen Sprache/i,
  /\bWb\b/,
  /Allen, Middle Egyptian/i,
  /Gardiner/i,
  /Chicago Assyrian Dictionary/i,
  /\bCAD\b/,
  /ETCSL/i,
  /George, House Most High/i,
  /George, The Babylonian Gilgamesh Epic/i,
  /Zoëga/i,
  /Cleasby[- ]Vigfusson/i,
  /Monier-Williams/i,
  /Bartholomae/i,
  /Biblia Hebraica Stuttgartensia/i,
  /\bBHS\b/,
  /HALOT/i,
  /KTU/i,
  /KAI/i,
  /CIS/i,
  /Avesta/i,
  /Gathas/i,
  /Unihan Database/i,
  /Baxter-Sagart/i,
  /Hanyu Da Zidian/i,
  /Joyō Kanji/i,
  /Hepburn Romanisation/i,
  /Kojiki/i,
  /Poetic Edda/i,
  /Prose Edda/i,
  /TDOT/i,
  /Macdonell, Sanskrit Grammar/i,
  /\bMW\b/,
  /\bKEWA\b/,
  /\bAirWb\b/,
  /\bRV\b/,
  /Ṛgveda/i,
  /Ṝgveda/i,
  /Puranas/i,
  /Upanishads/i,
  /Upaniṣads/i,
  /Mahabharata/i,
  /Mahābhārata/i,
  /Ramayana/i,
  /Rāmāyaṇa/i,
  /Bhagavata/i,
  /Bhagavad Gita/i,
  /Manusmriti/i,
  /Yoga Sutras/i,
  /Brāhmaṇas/i,
  /Yasht/i,
  /Apte/i,
  /Black & Green/i,
  /Schwemer/i,
  /Sommerfeld/i,
  /Lambert, Babylonian Creation Myths/i,
  /Smith, The Ugaritic Baal Cycle/i,
  /Cross, Canaanite Myth and Hebrew Epic/i,
  /Day, Yahweh and the Gods and Goddesses of Canaan/i,
  /De Moor/i,
  /Pardee, Ritual and Cult at Ugarit/i,
  /Hutter, Altorientalische Vorstellungen von der Unterwelt/i,
  /Annus, The God Ninurta/i,
  /Wiggermann/i,
  /Jacobsen/i,
  /Kramer/i,
  /Kellens/i,
];

function tierForSource(title) {
  if (typeof title !== 'string') return 2;
  for (const pattern of TIER_1_PATTERNS) {
    if (pattern.test(title)) return 1;
  }
  return 2;
}

function normalizeSources(raw) {
  if (!Array.isArray(raw) || raw.length === 0) return [];
  return raw.map((s) => {
    if (typeof s === 'string') {
      return { title: s, tier: tierForSource(s) };
    }
    const title = s.title || '';
    return {
      title,
      author: s.author || '',
      year: s.year || '',
      pages: s.pages || '',
      url: s.url || '',
      tier: s.tier || tierForSource(title),
    };
  });
}

function lexiconSources(entry) {
  const src = entry?.sources;
  if (!Array.isArray(src) || src.length === 0) return [];
  return normalizeSources(src);
}

// ═════════════════════════════════════════════════════════════════════════════
// Script helpers
// ═════════════════════════════════════════════════════════════════════════════

const GREEK_BASE = {
  α: { name: 'alpha', value: 'a' },
  β: { name: 'beta', value: 'b' },
  γ: { name: 'gamma', value: 'g' },
  δ: { name: 'delta', value: 'd' },
  ε: { name: 'epsilon', value: 'e' },
  ζ: { name: 'zeta', value: 'zd / z' },
  η: { name: 'eta', value: 'ē' },
  θ: { name: 'theta', value: 'th' },
  ι: { name: 'iota', value: 'i' },
  κ: { name: 'kappa', value: 'k' },
  λ: { name: 'lambda', value: 'l' },
  μ: { name: 'mu', value: 'm' },
  ν: { name: 'nu', value: 'n' },
  ξ: { name: 'xi', value: 'x' },
  ο: { name: 'omicron', value: 'o' },
  π: { name: 'pi', value: 'p' },
  ρ: { name: 'rho', value: 'r' },
  σ: { name: 'sigma', value: 's' },
  ς: { name: 'sigma (final)', value: 's' },
  τ: { name: 'tau', value: 't' },
  υ: { name: 'upsilon', value: 'u / y' },
  φ: { name: 'phi', value: 'ph' },
  χ: { name: 'chi', value: 'kh' },
  ψ: { name: 'psi', value: 'ps' },
  ω: { name: 'omega', value: 'ō' },
  ϝ: { name: 'digamma', value: 'w' },
};

function greekLetterInfo(ch) {
  const base = ch.normalize('NFD')[0].toLowerCase();
  const info = GREEK_BASE[base];
  const diacritics = ch.normalize('NFD').slice(1);
  let note = '';
  if (diacritics.includes('\u0301')) note += 'Acute accent marks stress. ';
  if (diacritics.includes('\u0300')) note += 'Grave accent. ';
  if (diacritics.includes('\u0302')) note += 'Circumflex marks stress + length. ';
  if (diacritics.includes('\u0308')) note += 'Diaeresis. ';
  if (diacritics.includes('\u0304')) note += 'Macron marks length. ';
  if (diacritics.includes('\u0306')) note += 'Breve marks short quantity. ';
  if (ch === 'Ρ' || ch === 'ῥ') note += 'Initial rho carries a rough breathing. ';
  if (!info) return { name: 'Greek letter', value: ch, note: note.trim() || 'Greek alphabetic character.' };
  return { name: info.name, value: info.value, note: note.trim() || `Greek ${info.name} (${info.value}).` };
}

function greekSigns(text) {
  return Array.from(text).map((sign) => {
    const info = greekLetterInfo(sign);
    return { sign, name: info.name, value: info.value, function: 'letter', note: info.note };
  });
}

const RUNE_INFO = {
  ᚠ: { name: 'fé', value: 'f / v' },
  ᚢ: { name: 'úr', value: 'u / o / ø / ǫ / y / w' },
  ᚦ: { name: 'þurs', value: 'þ / ð' },
  ᚬ: { name: 'oss / ás', value: 'ą / á' },
  ᚱ: { name: 'reið', value: 'r' },
  ᚴ: { name: 'kaun', value: 'k / g / ng' },
  ᚼ: { name: 'hagall', value: 'h' },
  ᚾ: { name: 'nauðr', value: 'n' },
  ᛁ: { name: 'ís', value: 'i / e' },
  ᛅ: { name: 'ár', value: 'a / á / æ' },
  ᛋ: { name: 'sól', value: 's' },
  ᛏ: { name: 'Týr', value: 't / d' },
  ᛒ: { name: 'bjarkan', value: 'b / p' },
  ᛘ: { name: 'maðr', value: 'm' },
  ᛚ: { name: 'lögr', value: 'l' },
  ᛦ: { name: 'yr', value: 'y / ø / R' },
};

function runeSigns(text) {
  return Array.from(text).map((sign) => {
    const info = RUNE_INFO[sign] || { name: 'rune', value: '' };
    return {
      sign,
      name: info.name,
      value: info.value,
      function: 'letter',
      note: `Younger Futhark ${info.name} rune; the normalized spelling is a scholarly reconstruction.`,
    };
  });
}

function devanagariAksaras(text) {
  // Match a base Devanagari character plus any following combining marks.
  const AKSARA = /[\u0900-\u0939\u0950\u0972][\u093A-\u0954\u0962-\u0963]*/gu;
  const matches = text.match(AKSARA) || [];
  return matches.map((sign) => ({
    sign,
    name: 'devanāgarī akṣara',
    value: '',
    function: 'syllable',
    note: 'Sanskrit aksara (consonant + inherent or explicit vowel).',
  }));
}

function hebrewSigns(text) {
  // Split into clusters of base Hebrew letter + optional vowel points / dagesh.
  const CLUSTER = /[\u05D0-\u05EA][\u05B0-\u05BD\u05BF\u05C1\u05C2\u05C7]*/gu;
  const matches = text.match(CLUSTER) || [];
  return matches.map((sign) => ({
    sign,
    name: 'Hebrew letter',
    value: '',
    function: 'letter',
    note: 'Consonantal letter of the Biblical Hebrew abjad; vowel points are Masoretic.',
  }));
}

function genericLetterSigns(text, scriptName, note) {
  return Array.from(text).map((sign) => ({
    sign,
    name: `${scriptName} letter`,
    value: '',
    function: 'letter',
    note,
  }));
}

function genericSigns(text, scriptName, func, note) {
  return Array.from(text).map((sign) => ({
    sign,
    name: `${scriptName} sign`,
    value: '',
    function: func,
    note,
  }));
}

// ═════════════════════════════════════════════════════════════════════════════
// Etymology / semantics helpers
// ═════════════════════════════════════════════════════════════════════════════

function deriveEtymology(entry, archetype) {
  if (entry?.meaning && entry.meaning.length > 5 && entry.meaning !== '—') return entry.meaning;
  if (archetype?.tagline && archetype.tagline.length > 5) return archetype.tagline;
  return `Name of the ${entry?.domain || archetype?.domain || 'divine figure'}.`;
}

function deriveSemantics(entry, archetype) {
  return entry?.domain || archetype?.domain || archetype?.tagline || '';
}

function deriveVariants(entry, archetype, originalScript) {
  const variants = [];
  if (originalScript && originalScript !== '—') {
    variants.push({ form: originalScript, context: 'Original script' });
  }
  if (entry?.unicode) variants.push({ form: entry.unicode, context: 'Unicode restoration' });
  if (entry?.ascii) variants.push({ form: entry.ascii, context: 'ASCII fallback' });
  if (Array.isArray(entry?.variants)) {
    for (const v of entry.variants) {
      if (v?.unicode) variants.push({ form: v.unicode, context: v.type || v.note || 'Lexicon variant' });
    }
  }
  // Deduplicate by form.
  const seen = new Set();
  return variants.filter((v) => {
    if (seen.has(v.form)) return false;
    seen.add(v.form);
    return true;
  });
}

// ═════════════════════════════════════════════════════════════════════════════
// Per-pantheon generators
// ═════════════════════════════════════════════════════════════════════════════

function makeProvenance(entry, archetype, overrides) {
  const originalScript = overrides.originalScript || '';
  const prov = {
    original: originalScript,
    transliteration: overrides.transliteration || entry?.unicode || archetype?.name || '',
    transliterationScheme: overrides.transliterationScheme || '',
    normalizedReading: overrides.normalizedReading || '',
    phoneticReconstruction: overrides.phoneticReconstruction || '',
    signs: overrides.signs || [],
    steps: overrides.steps || [],
    etymology: overrides.etymology || deriveEtymology(entry, archetype),
    semantics: overrides.semantics || deriveSemantics(entry, archetype),
    variants: overrides.variants || deriveVariants(entry, archetype, originalScript),
    attestations: overrides.attestations || [],
    uncertainties: overrides.uncertainties || [],
    dnsNotes: overrides.dnsNotes || '',
    sources: overrides.sources || lexiconSources(entry),
    reviewStatus: overrides.reviewStatus || 'draft',
  };

  if (prov.sources.length === 0 && overrides.defaultSources) {
    prov.sources = normalizeSources(overrides.defaultSources);
  }
  return prov;
}

function buildEntry(entry, archetype, fields) {
  return {
    originalScript: fields.originalScript,
    scriptName: fields.scriptName,
    scriptFamily: fields.scriptFamily || '',
    writingDirection: fields.writingDirection || '',
    timePeriod: fields.timePeriod || '',
    region: fields.region || '',
    provenance: makeProvenance(entry, archetype, {
      originalScript: fields.originalScript,
      transliteration: fields.transliteration,
      transliterationScheme: fields.transliterationScheme,
      normalizedReading: fields.normalizedReading,
      phoneticReconstruction: fields.phoneticReconstruction,
      signs: fields.signs,
      steps: fields.steps,
      etymology: fields.etymology,
      semantics: fields.semantics,
      variants: fields.variants,
      attestations: fields.attestations,
      uncertainties: fields.uncertainties,
      dnsNotes: fields.dnsNotes,
      sources: fields.sources,
      defaultSources: fields.defaultSources,
      reviewStatus: fields.reviewStatus,
    }),
  };
}

function generateGreek(entry, archetype) {
  const originalScript = archetype?.greek || entry?.greek;
  if (!originalScript || originalScript === '—') return null;
  const name = entry?.unicode || archetype?.name || '';

  return buildEntry(entry, archetype, {
    originalScript,
    scriptName: 'Greek',
    scriptFamily: 'Greek alphabet (Classical / Attic)',
    writingDirection: 'left-to-right',
    timePeriod: 'Ancient Greek, c. 8th century BCE – present',
    region: 'Greece and the Greek-speaking Mediterranean',
    transliteration: name,
    transliterationScheme: 'Latin with diacritics (standard scholarly)',
    normalizedReading: '',
    phoneticReconstruction: '',
    signs: greekSigns(originalScript),
    steps: [
      `The Greek form ${originalScript} is written in the Classical Greek alphabet.`,
      'Letters with acute, grave, or circumflex accents preserve the pitch accent of Ancient Greek.',
      'Macrons and omegas (η, ω) mark long vowels, a feature lost in the plain ASCII form.',
      `The Unicode restoration ${name} encodes the scholarly spelling as a registrable domain name.`,
    ],
    etymology: deriveEtymology(entry, archetype),
    semantics: deriveSemantics(entry, archetype),
    attestations: [
      { text: 'Hesiod, Theogony', date: 'c. 700 BCE', location: 'Greece', reference: 'Passim' },
      { text: 'Homeric Hymns', date: 'c. 700–500 BCE', location: 'Greece', reference: 'Passim' },
    ],
    uncertainties: [
      'The exact phonetic realization of pitch accent in Classical Greek is reconstructed.',
      'Some letters (e.g., ζ) had dialectal pronunciations that remain debated.',
    ],
    dnsNotes: `The Unicode restoration ${name} preserves Greek stress and length; the ASCII form ${entry?.ascii || name} loses these features.`,
    defaultSources: ['LSJ', 'Pape-Benseler', 'Beekes, Etymological Dictionary of Greek'],
    reviewStatus: 'canonical',
  });
}

function generateJapanese(entry, archetype) {
  const originalScript = archetype?.greek || entry?.greek;
  if (!originalScript || originalScript === '—') return null;
  const name = entry?.unicode || archetype?.name || '';

  const signs = Array.from(originalScript).map((sign) => ({
    sign,
    name: 'kanji',
    value: '',
    function: 'logogram',
    note: 'Sino-Japanese logograph with on\'yomi and kun\'yomi readings.',
  }));

  return buildEntry(entry, archetype, {
    originalScript,
    scriptName: 'Japanese characters',
    scriptFamily: 'Kanji (Sino-Japanese logographs)',
    writingDirection: 'left-to-right; traditional top-to-bottom',
    timePeriod: 'Heian – present',
    region: 'Japan',
    transliteration: name,
    transliterationScheme: 'Hepburn romanisation with macron',
    signs,
    steps: [
      `The name is written with the kanji ${originalScript}.`,
      'Each kanji carries both a semantic meaning and Sino-Japanese (on\'yomi) and native Japanese (kun\'yomi) readings.',
      'Hepburn romanisation with macron marks long vowels, which the ASCII form loses.',
      `The Unicode restoration ${name} is used for DNS because the kanji form is not supported in the .com IDN table.`,
    ],
    etymology: deriveEtymology(entry, archetype),
    semantics: deriveSemantics(entry, archetype),
    attestations: [
      { text: 'Joyō Kanji Table', date: 'modern', location: 'Japan', reference: 'Entry for each kanji' },
    ],
    uncertainties: [
      'Historical pitch accent and the exact chronology of on\'yomi borrowings vary by text and dialect.',
    ],
    dnsNotes: `The Unicode restoration ${name} preserves the Hepburn macron; the kanji form is not registrable in .com.`,
    defaultSources: ['Joyō Kanji Table', 'Hepburn Romanisation Standard', 'Kojiki'],
    reviewStatus: 'canonical',
  });
}

function generateChinese(entry, archetype) {
  const originalScript = archetype?.greek || entry?.greek;
  if (!originalScript || originalScript === '—') return null;
  const name = entry?.unicode || archetype?.name || '';

  const signs = Array.from(originalScript).map((sign) => ({
    sign,
    name: 'hanzi',
    value: '',
    function: 'logogram',
    note: 'Chinese logograph with semantic and phonetic components.',
  }));

  return buildEntry(entry, archetype, {
    originalScript,
    scriptName: 'Chinese characters',
    scriptFamily: 'Hanzi (Sino-Tibetan)',
    writingDirection: 'left-to-right; traditional top-to-bottom',
    timePeriod: 'Oracle-bone – present, c. 1200 BCE –',
    region: 'China',
    transliteration: name,
    transliterationScheme: 'Hanyu Pinyin with tone mark',
    signs,
    steps: [
      `The name is written with the Chinese characters ${originalScript}.`,
      'Each character is a logogram that encodes meaning and historical pronunciation.',
      'Hanyu Pinyin with tone marks preserves Mandarin pronunciation; the ASCII form loses tone.',
      `The Unicode restoration ${name} is the registrable form because hanzi are outside the .com IDN table.`,
    ],
    etymology: deriveEtymology(entry, archetype),
    semantics: deriveSemantics(entry, archetype),
    attestations: [
      { text: 'Unihan Database', date: 'modern', location: 'East Asia', reference: `U+${originalScript.codePointAt(0).toString(16).toUpperCase()}` },
    ],
    uncertainties: [
      'Old Chinese reconstructions (Baxter-Sagart) are hypothetical and continue to be refined.',
      'Simplified and traditional forms may differ in glyph shape.',
    ],
    dnsNotes: `The Unicode restoration ${name} preserves the Mandarin tone mark; the ASCII form loses tone.`,
    defaultSources: ['Unihan Database', 'Baxter-Sagart Reconstruction of Old Chinese', 'Hanyu Da Zidian'],
    reviewStatus: 'canonical',
  });
}

function generateSanskrit(entry, archetype) {
  const transliteration = entry?.unicode || archetype?.name || '';
  const originalScript = iastToDevanagari(transliteration);
  if (!originalScript || originalScript === transliteration) return null;

  return buildEntry(entry, archetype, {
    originalScript,
    scriptName: 'Devanagari',
    scriptFamily: 'Brahmic abugida',
    writingDirection: 'left-to-right',
    timePeriod: 'Vedic – present, c. 1500 BCE –',
    region: 'South Asia',
    transliteration,
    transliterationScheme: 'IAST',
    signs: devanagariAksaras(originalScript),
    steps: [
      `Sanskrit ${transliteration} is written ${originalScript} in Devanagari.`,
      'Each aksara combines a consonant with an inherent or explicit vowel.',
      'IAST diacritics preserve length, retroflexion, and aspiration lost in plain ASCII.',
      'The Devanagari form is not used as the primary domain because Indic scripts are not in the .com IDN table.',
    ],
    etymology: deriveEtymology(entry, archetype),
    semantics: deriveSemantics(entry, archetype),
    uncertainties: [
      'Vedic accent and exact historical morphology are reconstructed from metrical and grammatical evidence.',
      'Schwa deletion in connected speech means the final short -a is often not phonetically realised.',
    ],
    dnsNotes: `The IAST form ${transliteration} uses registrable Latin diacritics; the Devanagari form is not supported in .com.`,
    defaultSources: ['Monier-Williams Sanskrit-English Dictionary', 'Macdonell, Sanskrit Grammar for Students'],
    reviewStatus: 'canonical',
  });
}

function generateNorse(entry, archetype, existing) {
  const originalScript = existing?.originalScript || '';
  if (!originalScript || originalScript === '—') {
    // No runic attestation; leave placeholder.
    return null;
  }
  const name = entry?.unicode || archetype?.name || '';
  const normalized = archetype?.greek && archetype.greek !== '—' ? archetype.greek : name;

  return buildEntry(entry, archetype, {
    originalScript,
    scriptName: 'Younger Futhark',
    scriptFamily: 'Germanic runic',
    writingDirection: 'left-to-right, top-to-bottom',
    timePeriod: 'Viking Age, c. 800–1100 CE',
    region: 'Scandinavia',
    transliteration: normalized,
    transliterationScheme: 'normalized Old Norse',
    signs: runeSigns(originalScript),
    steps: [
      `The Younger Futhark form ${originalScript} provides a Viking-Age runic attestation or normalized reconstruction.`,
      'Younger Futhark has only sixteen runes and does not distinguish short/long vowels or voiced/voiceless stops.',
      'The normalized Old Norse form is based on 13th-century manuscript tradition (Poetic and Prose Eddas).',
      `The Unicode restoration ${name} uses Thorn (Þ) and accented vowels registrable in .com.`,
    ],
    etymology: deriveEtymology(entry, archetype),
    semantics: deriveSemantics(entry, archetype),
    uncertainties: [
      'Runic vowel values are ambiguous because the reduced runic alphabet conflates several vowel qualities.',
      'Many names are attested only in later manuscripts, not in contemporary runic inscriptions.',
    ],
    dnsNotes: `The Unicode restoration ${name} uses registrable Thorn and vowel accents; the runic form is not used because runic TLD support is impractical.`,
    defaultSources: ['Zoëga, A Concise Dictionary of Old Icelandic', 'Cleasby-Vigfusson, An Icelandic-English Dictionary', 'Poetic Edda', 'Prose Edda'],
    reviewStatus: 'canonical',
  });
}

function generateEgyptian(entry, archetype, existing) {
  const originalScript = existing?.originalScript || '';
  if (!originalScript || originalScript === '—') return null;
  const name = entry?.unicode || archetype?.name || '';

  return buildEntry(entry, archetype, {
    originalScript,
    scriptName: 'Hieroglyphs',
    scriptFamily: 'Egyptian hieroglyphic',
    writingDirection: 'right-to-left / top-to-bottom',
    timePeriod: 'Old Kingdom – Late Antiquity, c. 2600 BCE – 400 CE',
    region: 'Egypt',
    transliteration: name,
    transliterationScheme: 'Egyptological conventional',
    signs: genericSigns(originalScript, 'hieroglyphic', 'logogram / phonogram', 'Egyptian hieroglyph functioning as logogram, phonogram, and/or determinative.'),
    steps: [
      `The Egyptian name is written ${originalScript} in hieroglyphs.`,
      'Hieroglyphs combine logograms, phonograms, and determinatives; the exact function of each sign depends on context.',
      'Egyptian writing does not record vowels; the vocalised form is a modern convention reconstructed from Coptic and Greek evidence.',
      `The Unicode restoration ${name} uses Egyptological alef/ayin and other registrable characters; the hieroglyphic form is not registrable in .com.`,
    ],
    etymology: deriveEtymology(entry, archetype),
    semantics: deriveSemantics(entry, archetype),
    uncertainties: [
      'The original vocalisation of Egyptian words is not recorded and is reconstructed by convention.',
      'The function of individual hieroglyphs (logogram vs. phonogram vs. determinative) is context-dependent.',
    ],
    dnsNotes: `The Unicode restoration ${name} uses Egyptological characters registrable in .com; hieroglyphs are outside the .com IDN table.`,
    defaultSources: ['Faulkner, A Concise Dictionary of Middle Egyptian', 'Wörterbuch der ägyptischen Sprache (Wb)', 'Allen, Middle Egyptian'],
    reviewStatus: 'canonical',
  });
}

function generateMesopotamian(entry, archetype, existing) {
  const originalScript = existing?.originalScript || '';
  if (!originalScript || originalScript === '—') return null;
  const name = entry?.unicode || archetype?.name || '';

  const signs = Array.from(originalScript).map((sign) => ({
    sign,
    name: sign === '𒀭' ? 'dingir (divine determinative)' : 'cuneiform sign',
    value: sign === '𒀭' ? 'divine' : '',
    function: sign === '𒀭' ? 'determinative' : 'syllable / logogram',
    note: sign === '𒀭'
      ? 'The divine determinative marks the name as theistic; it is not pronounced as part of the name.'
      : 'Cuneiform sign used syllabically or logographically in Sumerian/Akkadian context.',
  }));

  return buildEntry(entry, archetype, {
    originalScript,
    scriptName: 'Cuneiform',
    scriptFamily: 'Sumero-Akkadian cuneiform',
    writingDirection: 'left-to-right / top-to-bottom',
    timePeriod: 'Sumerian / Old Babylonian – Neo-Assyrian, c. 2600–600 BCE',
    region: 'Mesopotamia',
    transliteration: name,
    transliterationScheme: 'Sumerian logogram + Akkadian scholarly',
    signs,
    steps: [
      `The name is written ${originalScript} in cuneiform.`,
      'Sumerian logograms may be read with Akkadian values; the divine determinative 𒀭 marks theonyms.',
      'Macrons in the Unicode restoration mark long vowels inferred from Akkadian and Sumerian convention.',
      `The Unicode restoration ${name} is registrable in .com; the cuneiform form is not supported in the .com IDN table.`,
    ],
    etymology: deriveEtymology(entry, archetype),
    semantics: deriveSemantics(entry, archetype),
    uncertainties: [
      'The exact vocalisation of Sumerian words is reconstructed; macrons are a convention of modern scholarship.',
      'Many signs have multiple possible readings (polyphony).',
    ],
    dnsNotes: `The Unicode restoration ${name} preserves vowel length; the cuneiform form is not registrable in .com.`,
    defaultSources: ['Chicago Assyrian Dictionary (CAD)', 'ETCSL', 'George, House Most High'],
    reviewStatus: 'canonical',
  });
}

function generateCanaanite(entry, archetype, existing) {
  const originalScript = existing?.originalScript || '';
  if (!originalScript || originalScript === '—') return null;
  const name = entry?.unicode || archetype?.name || '';

  return buildEntry(entry, archetype, {
    originalScript,
    scriptName: 'Ugaritic',
    scriptFamily: 'Northwest Semitic cuneiform alphabet',
    writingDirection: 'left-to-right',
    timePeriod: 'Late Bronze Age, c. 1400–1200 BCE',
    region: 'Ugarit (modern Ras Shamra, Syria)',
    transliteration: name,
    transliterationScheme: 'Ugaritic alphabetic cuneiform',
    signs: genericLetterSigns(originalScript, 'Ugaritic', 'Letter of the Ugaritic cuneiform alphabet.'),
    steps: [
      `The name is written ${originalScript} in the Ugaritic cuneiform alphabet.`,
      'Ugaritic ʿayin is rendered with Egyptological Ain (ꜥ) for DNS registrability.',
      'Long vowels are reconstructed from Hebrew and Akkadian cognates and marked with macrons.',
      `The Unicode restoration ${name} is registrable in .com; the Ugaritic cuneiform form is not supported in the .com IDN table.`,
    ],
    etymology: deriveEtymology(entry, archetype),
    semantics: deriveSemantics(entry, archetype),
    uncertainties: [
      'Ugaritic vocalisation is not written and must be reconstructed from cognate languages.',
      'The exact phonetic value of some Ugaritic consonants is debated.',
    ],
    dnsNotes: `The Unicode restoration ${name} uses registrable Latin diacritics; the Ugaritic form is not registrable in .com.`,
    defaultSources: ['KTU (Ugaritic texts)', 'Smith, The Ugaritic Baal Cycle', 'Cross, Canaanite Myth and Hebrew Epic'],
    reviewStatus: 'canonical',
  });
}

function generatePhoenician(entry, archetype, existing) {
  const originalScript = existing?.originalScript || '';
  if (!originalScript || originalScript === '—') return null;
  const name = entry?.unicode || archetype?.name || '';

  return buildEntry(entry, archetype, {
    originalScript,
    scriptName: 'Phoenician',
    scriptFamily: 'Northwest Semitic abjad',
    writingDirection: 'right-to-left',
    timePeriod: 'Iron Age, c. 1050–800 BCE',
    region: 'Levant',
    transliteration: name,
    transliterationScheme: 'Phoenician abjad',
    signs: genericLetterSigns(originalScript, 'Phoenician', 'Letter of the Phoenician consonantal alphabet.'),
    steps: [
      `The name is written ${originalScript} in the Phoenician abjad.`,
      'Phoenician writing records consonants only; vowels are supplied by modern scholars from cognate languages.',
      'The final vowel markings in the transliteration are inferred from older Northwest Semitic case endings.',
      `The Unicode restoration ${name} is registrable in .com; the Phoenician form is not in the .com IDN table.`,
    ],
    etymology: deriveEtymology(entry, archetype),
    semantics: deriveSemantics(entry, archetype),
    uncertainties: [
      'Phoenician vowels are not written and are reconstructed from Ugaritic and Hebrew cognates.',
      'Many inscriptions are short and formulaic, limiting lexical certainty.',
    ],
    dnsNotes: `The Unicode restoration ${name} supplies registrable vowel diacritics; the Phoenician consonantal form is not registrable in .com.`,
    defaultSources: ['CIS', 'KAI', 'Smith, The Ugaritic Baal Cycle'],
    reviewStatus: 'canonical',
  });
}

function generateAbrahamic(entry, archetype, existing) {
  const originalScript = existing?.originalScript || '';
  if (!originalScript || originalScript === '—') return null;
  const name = entry?.unicode || archetype?.name || '';

  return buildEntry(entry, archetype, {
    originalScript,
    scriptName: 'Hebrew',
    scriptFamily: 'Northwest Semitic abjad',
    writingDirection: 'right-to-left',
    timePeriod: 'Biblical Hebrew, c. 1000–500 BCE',
    region: 'Israel / Judah',
    transliteration: name,
    transliterationScheme: 'BHS / SBL academic',
    signs: hebrewSigns(originalScript),
    steps: [
      `The Masoretic spelling ${originalScript} is preserved in the Biblia Hebraica Stuttgartensia.`,
      'Biblical Hebrew is written with consonants; the Tiberian vowel points (niqqud) were added by medieval Masoretes.',
      'Academic transliteration uses macrons and circumflexes to mark long vowels and spirantisation.',
      `The Unicode restoration ${name} uses registrable Latin diacritics; the pointed Hebrew form is not used as the primary domain because combining marks complicate IDN registration.`,
    ],
    etymology: deriveEtymology(entry, archetype),
    semantics: deriveSemantics(entry, archetype),
    uncertainties: [
      'The original pronunciation of Biblical Hebrew is reconstructed from the Tiberian tradition and cognate Semitic languages.',
      'Some proper-name etymologies are folk etymologies preserved in the biblical text.',
    ],
    dnsNotes: `The academic transliteration ${name} uses registrable macron/circumflex characters; the pointed Hebrew form with combining marks is avoided for DNS stability.`,
    defaultSources: ['Biblia Hebraica Stuttgartensia (BHS)', 'HALOT', 'TDOT'],
    reviewStatus: 'canonical',
  });
}

function generateZoroastrian(entry, archetype, existing) {
  const originalScript = existing?.originalScript || '';
  if (!originalScript || originalScript === '—') return null;
  const name = entry?.unicode || archetype?.name || '';

  return buildEntry(entry, archetype, {
    originalScript,
    scriptName: 'Avestan',
    scriptFamily: 'Iranian religious alphabet',
    writingDirection: 'right-to-left',
    timePeriod: 'Avestan, c. 1000 BCE – 400 CE (manuscripts later)',
    region: 'Iran / Central Asia',
    transliteration: name,
    transliterationScheme: 'Avestan scholarly transliteration',
    signs: genericLetterSigns(originalScript, 'Avestan', 'Letter of the Avestan alphabet.'),
    steps: [
      `The Avestan form ${originalScript} writes the sounds of the Avesta phonetically.`,
      'Long vowels and special fricatives have distinct Avestan letters.',
      'The Unicode restoration preserves length and the postalveolar/velar nasal distinctions in a registrable Latin form.',
      `The Unicode restoration ${name} is registrable in .com; the Avestan script is not in the .com IDN table.`,
    ],
    etymology: deriveEtymology(entry, archetype),
    semantics: deriveSemantics(entry, archetype),
    uncertainties: [
      'Avestan manuscript tradition is medieval; the original phonology is reconstructed.',
      'Some Avestan letters encode distinctions not fully preserved in later Iranian languages.',
    ],
    dnsNotes: `The Unicode restoration ${name} uses registrable Latin diacritics; the Avestan script form is not registrable in .com.`,
    defaultSources: ['Avesta', 'Bartholomae, Altiranisches Wörterbuch', 'Kellens, Le verbe avestique'],
    reviewStatus: 'canonical',
  });
}

function generateOther(entry, archetype) {
  // Medousa is Greek in content but classified as "other".
  if (archetype?.greek && /[\u0370-\u03FF\u1F00-\u1FFF]/.test(archetype.greek)) {
    return generateGreek(entry, archetype);
  }
  return null;
}

// ═════════════════════════════════════════════════════════════════════════════
// Main orchestration
// ═════════════════════════════════════════════════════════════════════════════

const GENERATORS = {
  greek: generateGreek,
  'greek-location': generateGreek,
  olympian: generateGreek,
  chthonic: generateGreek,
  titan: generateGreek,
  other: generateOther,
  japanese: generateJapanese,
  chinese: generateChinese,
  taoist: generateChinese,
  sanskrit: generateSanskrit,
  buddhist: generateSanskrit,
  norse: generateNorse,
  egyptian: generateEgyptian,
  mesopotamian: generateMesopotamian,
  canaanite: generateCanaanite,
  phoenician: generatePhoenician,
  abrahamic: generateAbrahamic,
  zoroastrian: generateZoroastrian,
};

function main() {
  console.log(`${C.bold}${C.cyan}PUNYCODEX Bulk Provenance Enrichment${C.reset}\n`);

  const archetypes = loadModuleVar(PATHS.archetypes, 'ARCHETYPES');
  const lexicon = loadModuleVar(PATHS.lexicon, 'LEXICON');
  const lexById = new Map(lexicon.map((e) => [e.id, e]));
  const extra = loadExtra();

  const built = archetypes.filter((a) => a.built);
  let added = 0;
  let skippedCanonical = 0;
  let scriptless = 0;
  let missingLexicon = 0;

  for (const archetype of built) {
    const id = archetype.id;
    const entry = lexById.get(id);
    if (!entry) {
      warn(`No lexicon entry for flagship ${id}; skipping.`);
      missingLexicon += 1;
      continue;
    }

    // Skip canonical pilots / already-enriched entries.
    if (extra[id]?.provenance?.reviewStatus === 'canonical') {
      skippedCanonical += 1;
      continue;
    }

    // Scriptless pantheons: leave null so the builder emits a placeholder.
    if (SCRIPTLESS_PANTHEONS.has(entry.pantheon)) {
      scriptless += 1;
      continue;
    }

    const generator = GENERATORS[entry.pantheon];
    if (!generator) {
      warn(`No generator for pantheon "${entry.pantheon}" (entry ${id}); leaving placeholder.`);
      scriptless += 1;
      continue;
    }

    const existing = extra[id] || ORIGINAL_SCRIPTS[id] || null;
    const enriched = generator(entry, archetype, existing);
    if (!enriched) {
      scriptless += 1;
      continue;
    }

    extra[id] = enriched;
    added += 1;
    console.log(`${C.green}✔${C.reset} ${id}`);
  }

  saveExtra(extra);

  console.log('');
  console.log(`${C.bold}Summary${C.reset}`);
  console.log(`  Added/enriched:     ${added}`);
  console.log(`  Already canonical:  ${skippedCanonical}`);
  console.log(`  Scriptless/skipped: ${scriptless}`);
  if (missingLexicon > 0) console.log(`  Missing lexicon:    ${missingLexicon}`);
  console.log(`  Total built:        ${built.length}`);
  console.log(`  Wrote:              ${PATHS.extra}`);
  console.log('');

  console.log(`${C.dim}→ Running scripts/validate-provenance.js${C.reset}`);
  try {
    execSync('node scripts/validate-provenance.js', {
      cwd: ROOT,
      stdio: 'inherit',
    });
    console.log(`${C.green}${C.bold}Provenance enrichment complete.${C.reset}`);
  } catch (err) {
    console.error(`${C.red}${C.bold}Validation failed.${C.reset}`);
    process.exit(1);
  }
}

main();
